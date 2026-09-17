/**
 * @file 16_Legal_Delete.gs
 * @description Remove referências legais obsoletas. Requer papel 'admin'.
 * @author Antigravity (ag-kit)
 * @date 2026-04-28
 */

/**
 * Remove permanentemente uma referência legal pelo UUID. Requer papel 'admin'.
 *
 * @param {string} id UUID da referência legal a remover (campo ID_Ref).
 * @returns {{ success: boolean, message: string }}
 */
function legalDelete(id) {
  try {
    const principal = checkPermission('admin');

    const config = getConfig();
    const db     = getDb();
    if (!db) {
      logError('legalDelete', 'getDb() retornou null.');
      return { success: false, message: 'Banco de dados indisponível.' };
    }

    const sheet = db.getSheetByName(config.SHEET_LEGAL);
    if (!sheet) {
      logError('legalDelete', 'Aba não encontrada: ' + config.SHEET_LEGAL);
      return { success: false, message: 'Configuração inválida.' };
    }

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0] || '').trim() === String(id || '').trim()) {
        sheet.deleteRow(i + 1);
        logAction(principal.email, 'LEGAL_DELETED', 'Referência removida: ' + id);
        return { success: true, message: 'Referência removida com sucesso.' };
      }
    }
    return { success: false, message: 'Referência não encontrada.' };
  } catch (error) {
    Logger.log("Erro em legalDelete: " + error.message);
    throw error; // Re-lança para tratamento superior
  }
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
