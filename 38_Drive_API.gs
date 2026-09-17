/**
 * @file 38_Drive_API.gs
 * @description Integração avançada com Google Drive / Docs API.
 *   Responsável por ler um template de memória de gestão,
 *   injetar dados via substituição de tags {{TAG}} e gerar uma cópia
 *   final versionada na pasta institucional do Drive.
 *
 *   Dependências (mesmo namespace GAS):
 *     - 03_Auth_Check.gs  → checkPermission()
 *     - 04_Env_Config.gs  → getConfig(), getDb()
 *     - 25_Log_Action.gs  → logAction()
 *     - 26_Log_Error.gs   → logError()
 *     - 37_Report_Export.gs → _getOrCreateFolder()   ← não redefinida aqui
 *
 * @author Antigravity (ag-kit)
 * @date 2026-04-28
 */

// ─────────────────────────────────────────────────────────────────────────────
// Chaves de Script Properties
// ─────────────────────────────────────────────────────────────────────────────

/** @const {Object} Nomes das Script Properties usadas por este módulo. */
const DRIVE_CFG = {
  TEMPLATE_DOC_ID:  'TEMPLATE_PCA_DOC_ID',  // ID do Google Doc template
  OUTPUT_FOLDER_ID: 'OUTPUT_FOLDER_ID',      // ID da pasta de saída no Drive
  VERSIONS_SHEET:   'Versoes_PCA',           // Aba de índice de versões
};

// ─────────────────────────────────────────────────────────────────────────────
// Endpoints públicos (expostos via google.script.run)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configura o ID do template e da pasta de saída nas Script Properties.
 * Execute uma única vez pelo administrador no editor do GAS.
 * Requer papel 'admin'.
 *
 * @param {string} templateDocId  ID do Google Doc que serve de template.
 * @param {string} outputFolderId ID da pasta do Drive para saída dos documentos.
 * @returns {{ success: boolean, message: string }}
 */
function setupDriveConfig(templateDocId, outputFolderId) {
  try {
    checkPermission('admin');

    if (!templateDocId || !outputFolderId) {
      return { success: false, message: 'templateDocId e outputFolderId são obrigatórios.' };
    }

    const props = PropertiesService.getScriptProperties();
    props.setProperty(DRIVE_CFG.TEMPLATE_DOC_ID,  templateDocId);
    props.setProperty(DRIVE_CFG.OUTPUT_FOLDER_ID, outputFolderId);
    return { success: true, message: 'Configurações do Drive salvas com sucesso.' };
  } catch (error) {
    Logger.log("Erro em setupDriveConfig: " + error.message);
    throw error;
  }
}

/**
 * Gera a memória consolidada de gestão a partir do template base.
 *
 * Pipeline:
 *   1. Lê todos os itens do PCA da planilha.
 *   2. Calcula métricas resumidas (totais, valores, contagens por status).
 *   3. Constrói o mapa de substituição {{ TAG }} → valor.
 *   4. Copia o template Google Doc e aplica as substituições em corpo,
 *      cabeçalho e rodapé.
 *   5. Move a cópia para a pasta institucional de saída.
 *   6. Registra a versão no índice (aba Versoes_PCA).
 *
 * Tags suportadas no template (ver _buildTagMap para lista completa):
 *   {{PCA_ANO}}, {{PCA_DATA_GERACAO}}, {{PCA_TOTAL_ITENS}},
 *   {{PCA_VALOR_TOTAL}}, {{PCA_STATUS_EM_ELABORACAO}},
 *   {{PCA_STATUS_APROVADO}}, {{PCA_STATUS_PUBLICADO}},
 *   {{PCA_STATUS_CANCELADO}}, {{PCA_RESPONSAVEL_EMAIL}},
 *   {{PCA_VERSAO}}, {{PCA_TABELA_ITENS}}
 *
 * Requer papel 'admin'.
 *
 * @returns {{ success: boolean, message: string, url?: string, fileId?: string }}
 */
function generatePCAFormalizationDocument() {
  try {
    const principal = checkPermission('admin');

    try {
      const props          = PropertiesService.getScriptProperties();
      const templateDocId  = props.getProperty(DRIVE_CFG.TEMPLATE_DOC_ID);
      const outputFolderId = props.getProperty(DRIVE_CFG.OUTPUT_FOLDER_ID);

      if (!templateDocId) {
        return {
          success: false,
          message: 'Template não configurado. Execute setupDriveConfig() primeiro.',
        };
      }

      // 1 + 2 — Dados e métricas
      const items   = _readAllPCAItems();
      const metrics = _computeSummaryMetrics(items);

      // 3 — Mapa de tags (version calculada aqui para evitar dupla consulta)
      const version = _getNextVersion();
      const tagMap  = _buildTagMap(items, metrics, principal, version);

      // 4 — Cópia do template com substituição
      const docTitle = 'Memoria_Gestao_Escola_Classe_' + metrics.ano + '_v' + _padVersion(version);
      const copyFile = _copyAndReplaceTags(templateDocId, tagMap, docTitle);

      // 5 — Move para a pasta de saída
      const outputFolder = outputFolderId
        ? DriveApp.getFolderById(outputFolderId)
        : _getConfiguredOutputFolder_('Metateca_PCA_Documentos');

      copyFile.moveTo(outputFolder);

      // 6 — Índice de versões
      _registerVersion(version, docTitle, copyFile.getId(), principal.email, metrics);

      logAction(
        principal.email,
        'PCA_DOC_GENERATED',
        'Versão ' + _padVersion(version) + ': ' + copyFile.getUrl()
      );

      return {
        success: true,
        message: 'Documento gerado com sucesso (versão ' + _padVersion(version) + ').',
        url:     copyFile.getUrl(),
        fileId:  copyFile.getId(),
      };

    } catch (e) {
      logError('generatePCAFormalizationDocument', e.message, e.stack);
      return { success: false, message: 'Erro ao gerar documento. Consulte os logs do sistema.' };
    }
  } catch (error) {
    Logger.log("Erro em generatePCAFormalizationDocument: " + error.message);
    throw error;
  }
}

/**
 * Retorna o histórico de versões da memória de gestão,
 * ordenado da mais recente para a mais antiga.
 * Requer papel 'user'.
 *
 * @returns {Array<Object>}
 */
function getPCADocumentVersions() {
  try {
    try {
      checkPermission('user');

      const db = getDb();
      if (!db) return [];

      const sheet = db.getSheetByName(DRIVE_CFG.VERSIONS_SHEET);
      if (!sheet || sheet.getLastRow() <= 1) return [];

      const data    = sheet.getDataRange().getValues();
      const headers = data[0];

      return data.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, j) => { obj[h] = row[j]; });
        return obj;
      }).reverse();
    } catch (error) {
      Logger.log("Erro em getPCADocumentVersions: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em getPCADocumentVersions: " + error.message);
    throw error;
  }
}

/**
 * Gera um link de visualização pública para um arquivo do Drive.
 * @param {string} fileId ID do arquivo no Google Drive.
 * @returns {string} URL de visualização pública.
 */
function getPublicFileLink(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (error) {
    Logger.log("Erro em getPublicFileLink: " + error.message);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Funções privadas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @private Lê todos os itens do PCA da planilha como array de objetos.
 * @returns {Array<Object>}
 */
function _readAllPCAItems() {
  try {
    const config = getConfig();
    const db     = getDb();
    if (!db) return [];

    const sheet = db.getSheetByName(config.SHEET_PCA);
    if (!sheet) return [];

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];

    const headers = data[0];
    return data.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, j) => { obj[h] = row[j]; });
      return obj;
    });
  } catch (error) {
    Logger.log("Erro em _readAllPCAItems: " + error.message);
    throw error;
  }
}

/**
 * @private Calcula métricas resumidas a partir dos itens do PCA.
 * @param {Array<Object>} items
 * @returns {{ ano: number, totalItens: number, valorTotal: number,
 *             emElaboracao: number, aprovados: number,
 *             publicados: number, cancelados: number }}
 */
function _computeSummaryMetrics(items) {
  try {
    const ano         = new Date().getFullYear();
    let   valorTotal  = 0;
    const statusCount = {};

    items.forEach(function(item) {
      const v = PCA_parseFiniteNumber_(item.ValorEstimado);
      if (v !== null && v >= 0) valorTotal += v;
      const s = String(item.Status || 'N/A');
      statusCount[s] = (statusCount[s] || 0) + 1;
    });

    return {
      ano,
      totalItens:   items.length,
      valorTotal,
      emElaboracao: (statusCount['Em Análise'] || 0) + (statusCount['Em Elaboração'] || 0),
      aprovados:    (statusCount['Priorizada'] || 0) + (statusCount['Aprovado'] || 0),
      publicados:   (statusCount['Encaminhada à CRE-PP'] || 0) + (statusCount['Publicado'] || 0),
      cancelados:   (statusCount['Arquivada'] || 0) + (statusCount['Cancelado'] || 0),
    };
  } catch (error) {
    Logger.log("Erro em _computeSummaryMetrics: " + error.message);
    throw error;
  }
}

/**
 * @private Constrói o mapa de substituição `{ '{{TAG}}': 'valor' }`.
 * Todas as tags seguem a convenção {{NOME_EM_MAIÚSCULAS}}.
 *
 * @param {Array<Object>} items
 * @param {Object}        metrics   Saída de _computeSummaryMetrics().
 * @param {Object}        principal { email: string, role: string }
 * @param {number}        version   Número de versão já calculado.
 * @returns {Object}
 */
function _buildTagMap(items, metrics, principal, version) {
  const config  = getConfig();
  const now     = new Date();

  const fmtDate = function(d) {
    try {
      return Utilities.formatDate(d, config.TIMEZONE, 'dd/MM/yyyy HH:mm');
    } catch (error) {
      Logger.log("Erro em fmtDate: " + error.message);
      throw error;
    }
  };
  const fmtBRL = function(v) {
    try {
      return 'R$\u00a0' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    } catch (error) {
      Logger.log("Erro em fmtBRL: " + error.message);
      throw error;
    }
  };

  return {
    '{{PCA_ANO}}':                   String(metrics.ano),
    '{{PCA_ORGAO}}':                 'Escola Classe vinculada à Coordenação Regional de Ensino do Plano Piloto (CRE-PP) · SEEDF',
    '{{PCA_DATA_GERACAO}}':          fmtDate(now),
    '{{PCA_RESPONSAVEL_EMAIL}}':     principal.email,
    '{{PCA_VERSAO}}':                'v' + _padVersion(version),
    '{{PCA_TOTAL_ITENS}}':           String(metrics.totalItens),
    '{{PCA_VALOR_TOTAL}}':           fmtBRL(metrics.valorTotal),
    '{{PCA_STATUS_EM_ELABORACAO}}':  String(metrics.emElaboracao),
    '{{PCA_STATUS_APROVADO}}':       String(metrics.aprovados),
    '{{PCA_STATUS_PUBLICADO}}':      String(metrics.publicados),
    '{{PCA_STATUS_CANCELADO}}':      String(metrics.cancelados),
    '{{PCA_TABELA_ITENS}}':          _renderItemsAsText(items),
  };
}

/**
 * @private Renderiza os itens do PCA como bloco de texto estruturado.
 * Substitui o placeholder {{PCA_TABELA_ITENS}} no template.
 *
 * Cada item é exibido em duas linhas:
 *   001. [ID_PCA] Descrição
 *        Tipo: X | Valor: R$ X | Prazo: DD/MM/AAAA → DD/MM/AAAA | Status: X
 *
 * @param {Array<Object>} items
 * @returns {string}
 */
function _renderItemsAsText(items) {
  if (!items.length) return '(nenhum item cadastrado)';

  const config  = getConfig();
  const fmtDate = function(v) {
    try {
      if (!v) return 'N/D';
      const d = new Date(v);
      return isNaN(d) ? String(v) : Utilities.formatDate(d, config.TIMEZONE, 'dd/MM/yyyy');
    } catch (error) {
      Logger.log("Erro em fmtDate: " + error.message);
      throw error;
    }
  };
  const fmtBRL = function(v) {
    try {
      const n = parseFloat(v);
      return isNaN(n) ? 'N/D' : 'R$\u00a0' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    } catch (error) {
      Logger.log("Erro em fmtBRL: " + error.message);
      throw error;
    }
  };

  return items.map(function(item, idx) {
    const num    = String(idx + 1).padStart(3, '0');
    const id     = item.ID_PCA    || '—';
    const desc   = item.Descricao || '—';
    const tipo   = item.Tipo      || '—';
    const valor  = fmtBRL(item.ValorEstimado);
    const inicio = fmtDate(item.PrazoInicio);
    const fim    = fmtDate(item.PrazoFim);
    const status = item.Status    || '—';
    return (
      num + '. [' + id + '] ' + desc + '\n' +
      '     Tipo: ' + tipo +
      ' | Valor: ' + valor +
      ' | Prazo: ' + inicio + ' → ' + fim +
      ' | Status: ' + status
    );
  }).join('\n\n');
}

/**
 * @private Cria uma cópia do Google Doc template, aplica todas as substituições
 * de tags em corpo, cabeçalho e rodapé, e retorna o DriveApp.File resultante.
 *
 * Observação: replaceText() aceita expressões regulares como primeiro argumento.
 * As chaves {{ }} são escapadas para evitar conflitos com regex.
 *
 * @param {string} templateDocId ID do Google Doc template.
 * @param {Object} tagMap        Mapa { '{{TAG}}': 'valor' }.
 * @param {string} copyName      Título do documento a ser criado.
 * @returns {GoogleAppsScript.Drive.File}
 */
function _copyAndReplaceTags(templateDocId, tagMap, copyName) {
  try {
    const templateFile = DriveApp.getFileById(templateDocId);
    const copyFile     = templateFile.makeCopy(copyName);
    const doc          = DocumentApp.openById(copyFile.getId());

    // Seções onde as tags podem aparecer
    const sections = [
      doc.getBody(),
      doc.getHeader(),
      doc.getFooter(),
    ].filter(Boolean); // header/footer retornam null se não existirem no template

    // Escapa as chaves {{ }} para uso seguro no regex de replaceText
    const escapeRegex = function(s) {
      return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    Object.keys(tagMap).forEach(function(tag) {
      try {
        const value   = tagMap[tag];
        const pattern = escapeRegex(tag);
        sections.forEach(function(section) {
          section.replaceText(pattern, value);
        });
      } catch (error) {
        Logger.log("Erro em escapeRegex: " + error.message);
        throw error;
      }
    });

    doc.saveAndClose();
    return copyFile;
  } catch (error) {
    Logger.log("Erro em _copyAndReplaceTags: " + error.message);
    throw error;
  }
}

/**
 * @private Retorna o próximo número de versão sequencial consultando o índice.
 * Se a aba não existir ou estiver vazia, retorna 1.
 * @returns {number}
 */
function _getNextVersion() {
  try {
    try {
      const db = getDb();
      if (!db) return 1;

      const sheet = db.getSheetByName(DRIVE_CFG.VERSIONS_SHEET);
      if (!sheet || sheet.getLastRow() <= 1) return 1;

      // Linha 1 = cabeçalho; cada linha adicional corresponde a uma versão.
      return sheet.getLastRow(); // não -1 porque queremos o *próximo* número
    } catch (error) {
      Logger.log("Erro em _getNextVersion: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em _getNextVersion: " + error.message);
    throw error;
  }
}

/**
 * @private Formata um número de versão com zero-padding de 3 dígitos.
 * @param {number} n
 * @returns {string}  Ex: 1 → "001", 12 → "012"
 */
function _padVersion(n) {
  return String(n).padStart(3, '0');
}

/**
 * @private Registra metadados da versão gerada na aba de índice.
 * Cria a aba com cabeçalhos caso ainda não exista.
 *
 * @param {number} version   Número sequencial da versão.
 * @param {string} title     Nome do documento gerado.
 * @param {string} fileId    ID do arquivo no Drive.
 * @param {string} email     E-mail do usuário que gerou o documento.
 * @param {Object} metrics   Saída de _computeSummaryMetrics().
 */
function _registerVersion(version, title, fileId, email, metrics) {
  try {
    const db = getDb();
    if (!db) return;

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) throw new Error('Nao foi possivel obter lock para registrar versao PCA.');
    try {
      let sheet = db.getSheetByName(DRIVE_CFG.VERSIONS_SHEET);
      if (!sheet) {
        sheet = db.insertSheet(DRIVE_CFG.VERSIONS_SHEET);
        const headers = [
          'Versao', 'Titulo', 'FileId', 'URL',
          'Gerado_Por', 'Gerado_Em', 'Total_Itens', 'Valor_Total',
        ];
        sheet.getRange(1, 1, 1, headers.length)
             .setValues([headers])
             .setFontWeight('bold')
             .setBackground('#f3f3f3');
        sheet.setFrozenRows(1);
      }

      const fmtBRL = function(v) {
        try {
          return 'R$\u00a0' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        } catch (error) {
          Logger.log("Erro em fmtBRL: " + error.message);
          throw error; // Re-lança para tratamento superior
        }
      };

      const row = [
        _padVersion(version),
        title,
        fileId,
        'https://docs.google.com/document/d/' + fileId + '/edit',
        email,
        new Date(),
        metrics.totalItens,
        fmtBRL(metrics.valorTotal),
      ];

      sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    Logger.log("Erro em _registerVersion: " + error.message);
    throw error;
  }
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
