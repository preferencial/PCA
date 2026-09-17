/**
 * @file 13_Legal_Create.gs
 * @description Salva novas referências legais no sistema. Requer papel 'admin'.
 * @author Antigravity (ag-kit)
 * @date 2026-04-28
 */

/**
 * Cria uma nova referência legal.
 *
 * Requer papel 'admin'. Usa setValues em lote em vez de appendRow.
 *
 * @param {Object} data           Dados da lei/normativa.
 * @param {string} data.Titulo    Título da norma.
 * @param {string} data.Descricao Descrição resumida.
 * @param {string} [data.Link]    URL do texto oficial.
 * @param {string} data.Tipo      Categoria (Lei, Decreto, Portaria, etc.).
 * @returns {{ success: boolean, message: string, id?: string }}
 */
function saveLegalReference(data) {
  try {
    const principal = checkPermission('admin');

    const config = getConfig();
    const db     = getDb();
    if (!db) {
      logError('saveLegalReference', 'getDb() retornou null.');
      return { success: false, message: 'Erro ao conectar ao banco de dados.' };
    }

    const sheet = db.getSheetByName(config.SHEET_LEGAL);
    if (!sheet) {
      logError('saveLegalReference', 'Aba não encontrada: ' + config.SHEET_LEGAL);
      return { success: false, message: 'Configuração do banco de dados inválida.' };
    }

    const id  = generateUUID();
    const now = new Date();

    // Ordem das colunas: ID_Ref, Titulo, Descricao, Link, Tipo, CriadoEm
    const row = [id, data.Titulo, data.Descricao, data.Link || '', data.Tipo, now];

    try {
      const targetRange = sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length);
      targetRange.setValues([row]);
      logAction(principal.email, 'LEGAL_CREATED', 'Referência criada: ' + data.Titulo);
      return { success: true, id: id, message: 'Referência legal salva com sucesso.' };
    } catch (e) {
      logError('saveLegalReference', e.message, e.stack);
      return { success: false, message: 'Erro ao salvar a referência. Consulte os logs do sistema.' };
    }
  } catch (error) {
    Logger.log("Erro em saveLegalReference: " + error.message);
    throw error;
  }
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
