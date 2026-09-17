/**
 * @file 37_Report_Export.gs
 * @description Motor de exportação em PDF para relatórios oficiais da SEEDF.
 *   Gera PDFs via endpoint interno do Google Workspace (Sheets export URL)
 *   com cabeçalho/rodapé institucional, metadados, formatação numérica
 *   e orientação automática (Paisagem ≥ 8 colunas, Retrato < 8).
 *
 *   Dependências (mesmo namespace GAS):
 *     03_Auth_Check.gs → checkPermission()
 *     04_Env_Config.gs → getConfig(), getDb()
 *     25_Log_Action.gs → logAction()
 *     26_Log_Error.gs  → logError()
 *
 * @author Antigravity (ag-kit)
 * @date 2026-04-28
 */

// ─────────────────────────────────────────────────────────────────────────────
// Configurações do módulo
// ─────────────────────────────────────────────────────────────────────────────

/** Número de colunas a partir do qual o layout Paisagem é aplicado. */
const PDF_LANDSCAPE_THRESHOLD = 7;

/** Textos institucionais fixos para o cabeçalho de todos os PDFs. */
const PDF_ORG_NAME     = 'Secretaria de Estado de Educação do Distrito Federal';
const PDF_ORG_SUBTITLE = 'Escola Classe · Coordenação Regional de Ensino do Plano Piloto (CRE-PP)';

// ─────────────────────────────────────────────────────────────────────────────
// Endpoints públicos (expostos via google.script.run)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gera PDF da tabela de itens do PCA com layout institucional.
 * Orientação: Paisagem (12 colunas). Requer papel 'admin'.
 * @returns {{ success: boolean, message: string, url?: string }}
 */
function exportPCAToPDF() {
  try {
    const principal = checkPermission('admin');
    const config    = getConfig();
    const year      = new Date().getFullYear();
    const stamp     = Utilities.formatDate(new Date(), config.TIMEZONE, 'yyyyMMdd');
    return _generateReport(
      {
        sheetName:   config.SHEET_PCA,
        reportTitle: 'Relatório de Demandas e Decisões da Unidade Escolar – ' + year,
        fileName:    'Direcao_Escola_Classe_' + year + '_' + stamp + '.pdf',
        logAction:   'PCA_PDF_EXPORTED',
      },
      principal
    );
  } catch (error) {
    Logger.log("Erro em exportPCAToPDF: " + error.message);
    throw error;
  }
}

/**
 * Gera PDF da tabela de Referências Legais com layout institucional.
 * Orientação: Paisagem (8 colunas). Requer papel 'admin'.
 * @returns {{ success: boolean, message: string, url?: string }}
 */
function exportLegalToPDF() {
  try {
    const principal = checkPermission('admin');
    const config    = getConfig();
    const year      = new Date().getFullYear();
    const stamp     = Utilities.formatDate(new Date(), config.TIMEZONE, 'yyyyMMdd');
    return _generateReport(
      {
        sheetName:   config.SHEET_LEGAL,
        reportTitle: 'Referências Legais Cadastradas – ' + year,
        fileName:    'Legal_Relatorio_' + year + '_' + stamp + '.pdf',
        logAction:   'LEGAL_PDF_EXPORTED',
      },
      principal
    );
  } catch (error) {
    Logger.log("Erro em exportLegalToPDF: " + error.message);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline principal de geração
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @private Orquestra a criação, formatação e exportação do PDF.
 * @param {{ sheetName: string, reportTitle: string, fileName: string, logAction: string }} opts
 * @param {{ email: string, role: string }} principal
 * @returns {{ success: boolean, message: string, url?: string }}
 */
function _generateReport(opts, principal) {
  try {
    try {
      const db = getDb();
      if (!db) return { success: false, message: 'Erro ao conectar ao banco de dados.' };

      const srcSheet = db.getSheetByName(opts.sheetName);
      if (!srcSheet) return { success: false, message: 'Aba "' + opts.sheetName + '" não encontrada.' };

      const data = srcSheet.getDataRange().getValues();
      if (data.length <= 1) return { success: false, message: 'Não há dados para exportar.' };

      const cfg     = getConfig();
      const context = {
        generatedBy: principal.email,
        generatedAt: Utilities.formatDate(new Date(), cfg.TIMEZONE, 'dd/MM/yyyy HH:mm'),
        totalRows:   data.length - 1,
      };

      let tempSS;
      try {
        const built       = _buildTempSheet(opts.reportTitle, data, context);
        tempSS            = built.ss;
        const isLandscape = _detectOrientation(data[0].length);
        const pdfBlob     = _exportSheetToPdf(tempSS.getId(), built.gid, isLandscape, opts.fileName);
        const file        = _savePdfToDrive(pdfBlob);
        logAction(principal.email, opts.logAction, opts.fileName + ' | ' + file.getUrl());
        return { success: true, url: file.getUrl(), message: 'PDF gerado com sucesso. Clique no link para abrir.' };
      } catch (e) {
        logError('_generateReport[' + opts.sheetName + ']', e.message, e.stack);
        return { success: false, message: 'Erro ao gerar PDF. Consulte os logs do sistema.' };
      } finally {
        if (tempSS) {
          try { DriveApp.getFileById(tempSS.getId()).setTrashed(true); } catch (_) {} // lint-disable: L007
        }
      }
    } catch (error) {
      Logger.log("Erro em _generateReport: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em _generateReport: " + error.message);
    throw error;
  }
}

/**
 * @private Cria a planilha temporária com cabeçalho institucional e dados.
 * @param {string}       reportTitle Título do relatório.
 * @param {Array<Array>} data        Dados brutos (linha 0 = cabeçalhos das colunas).
 * @param {{ generatedBy: string, generatedAt: string, totalRows: number }} context
 * @returns {{ ss: GoogleAppsScript.Spreadsheet.Spreadsheet, gid: number }}
 */
function _buildTempSheet(reportTitle, data, context) {
  try {
    try {
      const ss = SpreadsheetApp.create('_tmp_metateca_' + new Date().getTime());
      ss.setSpreadsheetLocale('pt_BR');
      const sheet = ss.getSheets()[0];
      sheet.setName('Relatório');

      const colCount   = data[0].length;
      const headerRows = _addInstitutionalHeader(sheet, reportTitle, context, colCount);
      const dataHdrRow = headerRows + 1;

      sheet.getRange(dataHdrRow, 1, 1, colCount).setValues([data[0]]);
      _styleDataHeader(sheet, dataHdrRow, colCount);

      const dataStartRow = dataHdrRow + 1;
      if (data.length > 1) {
        sheet.getRange(dataStartRow, 1, data.length - 1, colCount).setValues(data.slice(1));
        _applyColumnFormats(sheet, data[0], dataStartRow, data.length - 1);
      }

      _addFooterNote(sheet, dataStartRow + data.length - 1, colCount);
      sheet.setFrozenRows(dataHdrRow);
      sheet.autoResizeColumns(1, colCount);
      SpreadsheetApp.flush();
      return { ss: ss, gid: sheet.getSheetId() };
    } catch (error) {
      Logger.log("Erro em _buildTempSheet: " + error.message);
      throw error; // Re-lança para tratamento superior
    }
  } catch (error) {
    Logger.log("Erro em _buildTempSheet: " + error.message);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatação do layout institucional
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @private Insere 4 linhas de cabeçalho institucional no topo da planilha.
 *   Linha 1 — Nome da instituição (fundo navy, texto branco).
 *   Linha 2 — Sistema/subtítulo (fundo navy, texto azul claro).
 *   Linha 3 — Título do relatório (fundo verde federal).
 *   Linha 4 — Metadados: data, responsável, total de registros.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string} reportTitle  Título específico do relatório.
 * @param {{ generatedBy: string, generatedAt: string, totalRows: number }} context
 * @param {number} colCount
 * @returns {number} Número de linhas adicionadas (sempre 4).
 */
function _addInstitutionalHeader(sheet, reportTitle, context, colCount) {
  try {
    try {
      const NAVY  = '#1B3A6B';
      const GREEN = '#0E7F52';
      const LIGHT = '#E8EDF5';

      sheet.getRange(1, 1, 1, colCount).merge().setValue(PDF_ORG_NAME)
           .setBackground(NAVY).setFontColor('#FFFFFF')
           .setFontWeight('bold').setFontSize(13).setHorizontalAlignment('center');
      sheet.setRowHeight(1, 32);

      sheet.getRange(2, 1, 1, colCount).merge().setValue(PDF_ORG_SUBTITLE)
           .setBackground(NAVY).setFontColor('#C8D5E8')
           .setFontSize(10).setHorizontalAlignment('center');
      sheet.setRowHeight(2, 22);

      sheet.getRange(3, 1, 1, colCount).merge().setValue(reportTitle)
           .setBackground(GREEN).setFontColor('#FFFFFF')
           .setFontWeight('bold').setFontSize(11).setHorizontalAlignment('center');
      sheet.setRowHeight(3, 26);

      const meta = 'Gerado em: ' + context.generatedAt +
                   '   |   Responsável: ' + context.generatedBy +
                   '   |   Total de registros: ' + context.totalRows;
      sheet.getRange(4, 1, 1, colCount).merge().setValue(meta)
           .setBackground(LIGHT).setFontColor('#555555')
           .setFontSize(8).setHorizontalAlignment('center').setFontStyle('italic');
      sheet.setRowHeight(4, 18);
      return 4;
    } catch (error) {
      Logger.log("Erro em _addInstitutionalHeader: " + error.message);
      throw error; // Re-lança para tratamento superior
    }
  } catch (error) {
    Logger.log("Erro em _addInstitutionalHeader: " + error.message);
    throw error;
  }
}

/**
 * @private Aplica estilo de cabeçalho de tabela à linha de títulos de colunas.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {number} rowIndex  Número da linha (1-based).
 * @param {number} colCount
 */
function _styleDataHeader(sheet, rowIndex, colCount) {
  try {
    try {
      sheet.getRange(rowIndex, 1, 1, colCount)
           .setBackground('#2C4E80').setFontColor('#FFFFFF')
           .setFontWeight('bold').setFontSize(9)
           .setHorizontalAlignment('center').setWrap(false);
      sheet.setRowHeight(rowIndex, 22);
    } catch (error) {
      Logger.log("Erro em _styleDataHeader: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em _styleDataHeader: " + error.message);
    throw error;
  }
}

/**
 * @private Detecta colunas de data e moeda e aplica formatação numérica.
 * Datas: 'dd/MM/yyyy'. Moeda: 'R$ #,##0.00' em locale pt_BR.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {Array<string>} headers       Nomes das colunas.
 * @param {number}        dataStartRow  Primeira linha de dados (1-based).
 * @param {number}        rowCount      Número de linhas de dados.
 */
function _applyColumnFormats(sheet, headers, dataStartRow, rowCount) {
  try {
    const dateKeys = ['prazo', 'data', 'criadoem', 'atualizadoem', 'inicio', 'fim'];
    const currKeys = ['valor', 'preco', 'custo'];
    headers.forEach(function(header, idx) {
      const h   = String(header).toLowerCase().replace(/[^a-z]/g, '');
      const col = idx + 1;
      if (dateKeys.some(function(k) { return h.includes(k); })) {
        sheet.getRange(dataStartRow, col, rowCount, 1).setNumberFormat('dd/MM/yyyy');
      } else if (currKeys.some(function(k) { return h.includes(k); })) {
        sheet.getRange(dataStartRow, col, rowCount, 1).setNumberFormat('"R$ "#,##0.00');
      }
    });
  } catch (error) {
    Logger.log("Erro em _applyColumnFormats: " + error.message);
    throw error;
  }
}

/**
 * @private Insere uma linha de rodapé com nota institucional após os dados.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {number} rowIndex  Linha imediatamente após os dados (1-based).
 * @param {number} colCount
 */
function _addFooterNote(sheet, rowIndex, colCount) {
  try {
    try {
      try {
        const text = PDF_ORG_NAME +
                     ' — Documento de trabalho da unidade escolar. Não substitui processo, autorização ou manifestação da CRE-PP/SEEDF.';
        sheet.getRange(rowIndex, 1, 1, colCount).merge().setValue(text)
             .setBackground('#E8EDF5').setFontColor('#888888')
             .setFontSize(7).setHorizontalAlignment('center').setFontStyle('italic');
        sheet.setRowHeight(rowIndex, 16);
      } catch (error) {
        Logger.log("Erro em _addFooterNote: " + error.message);
        throw error; // Re-lança para tratamento superior
      }
    } catch (error) {
      Logger.log("Erro em _addFooterNote: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em _addFooterNote: " + error.message);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exportação via endpoint do Google Workspace
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @private Exporta uma aba como PDF usando o endpoint nativo do Google Sheets.
 *   Autentica com OAuth2 (ScriptApp.getOAuthToken) — sem exposição de credenciais.
 * @param {string}  ssId        ID da planilha temporária.
 * @param {number}  gid         ID numérico da aba (sheet.getSheetId()).
 * @param {boolean} isLandscape true = Paisagem, false = Retrato.
 * @param {string}  fileName    Nome do arquivo PDF resultante.
 * @returns {GoogleAppsScript.Base.Blob}
 * @throws {Error} Se o endpoint retornar status HTTP diferente de 200.
 */
function _exportSheetToPdf(ssId, gid, isLandscape, fileName) {
  try {
    try {
      const url      = _buildExportUrl(ssId, gid, isLandscape);
      const token    = ScriptApp.getOAuthToken();
      const response = UrlFetchApp.fetch(url, {
        headers: { Authorization: 'Bearer ' + token },
        muteHttpExceptions: true,
      });
      if (response.getResponseCode() !== 200) {
        throw new Error('Falha na exportação PDF via API do Google Sheets.');
      }
      return response.getBlob().setName(fileName);
    } catch (error) {
      Logger.log("Erro em _exportSheetToPdf: " + error.message);
      throw error; // Re-lança para tratamento superior
    }
  } catch (error) {
    Logger.log("Erro em _exportSheetToPdf: " + error.message);
    throw error;
  }
}

/**
 * @private Constrói a URL do endpoint de exportação do Google Sheets.
 *   Parâmetros controlam: tamanho A4, orientação, margens, grade, paginação.
 * @param {string}  ssId        ID da planilha.
 * @param {number}  gid         ID numérico da aba.
 * @param {boolean} isLandscape Orientação do PDF.
 * @returns {string} URL completa para UrlFetchApp.
 */
function _buildExportUrl(ssId, gid, isLandscape) {
  try {
    const params = [
      'exportFormat=pdf', 'format=pdf',
      'size=A4',
      'portrait='         + (isLandscape ? 'false' : 'true'),
      'fitw=true',        'fith=false',
      'top_margin=0.50',  'bottom_margin=0.50',
      'left_margin=0.70', 'right_margin=0.70',
      'gridlines=false',
      'printtitle=false', 'sheetnames=false',
      'pagenum=RIGHT',
      'attachment=true',
      'gid=' + gid,
    ].join('&');
    return 'https://docs.google.com/spreadsheets/d/' + ssId + '/export?' + params;
  } catch (error) {
    Logger.log("Erro em _buildExportUrl: " + error.message);
    throw error;
  }
}

/**
 * @private Salva o blob PDF na pasta institucional de exportações no Drive.
 *   Compartilhamento restrito ao domínio Google Workspace da instituição.
 * @param {GoogleAppsScript.Base.Blob} blob
 * @returns {GoogleAppsScript.Drive.File}
 */
function _savePdfToDrive(blob) {
  const folder = _getConfiguredOutputFolder_('Metateca_Exports');
  const file   = folder.createFile(blob);
  file.setSharing(DriveApp.Access.DOMAIN, DriveApp.Permission.VIEW);
  return file;
}

/**
 * @private Retorna true se o número de colunas exige layout Paisagem.
 * @param {number} colCount Número de colunas dos dados.
 * @returns {boolean} true = Paisagem, false = Retrato.
 */
function _detectOrientation(colCount) {
  return colCount > PDF_LANDSCAPE_THRESHOLD;
}

/**
 * @private Obtém ou cria uma pasta no Drive pelo nome.
 *   Usada também por 38_Drive_API.gs (mesmo namespace GAS).
 * @param {string} folderName
 * @returns {GoogleAppsScript.Drive.Folder}
 */
function _getOrCreateFolder(folderName) {
  try {
    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) return folders.next();
    return DriveApp.createFolder(folderName);
  } catch (error) {
    Logger.log("Erro em _getOrCreateFolder: " + error.message);
    throw error;
  }
}

function _getConfiguredOutputFolder_(fallbackName) {
  if (typeof getConfiguredOutputFolder === 'function') {
    try {
      return getConfiguredOutputFolder();
    } catch (_) {}
  }
  const props = PropertiesService.getScriptProperties();
  const outputId = props.getProperty('OUTPUT_FOLDER_ID') || props.getProperty('DRIVE_OUTPUT_FOLDER_ID');
  if (outputId) return DriveApp.getFolderById(outputId);
  return _getOrCreateFolder(fallbackName);
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
