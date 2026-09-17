/**
 * @file 09_PCA_Delete.gs
 * @description Remove itens do PCA. Requer papel 'admin'.
 * @author Antigravity (ag-kit)
 * @date 2026-04-28
 */

/**
 * Remove permanentemente um item do PCA pelo seu UUID.
 *
 * Requer papel 'admin'. A chamada a {@link checkPermission} é a primeira
 * instrução e lança Error imediatamente se não autorizado, impedindo qualquer
 * acesso aos dados antes da verificação.
 *
 * @param {string} id UUID do item a remover (campo ID_PCA).
 * @returns {{ success: boolean, message: string }}
 */
function pcaDelete(id) {
  try {
    const principal = checkPermission('admin');

    const config = getConfig();
    const db     = getDb();
    if (!db) {
      logError('pcaDelete', 'getDb() retornou null.');
      return { success: false, message: 'Banco de dados indisponível.' };
    }

    const sheet = db.getSheetByName(config.SHEET_PCA);
    if (!sheet) {
      logError('pcaDelete', 'Aba não encontrada: ' + config.SHEET_PCA);
      return { success: false, message: 'Configuração inválida.' };
    }

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0] || '').trim() === String(id || '').trim()) {
        sheet.deleteRow(i + 1);
        logAction(principal.email, 'PCA_DELETED', 'Item removido: ' + id);
        return { success: true, message: 'Item removido com sucesso.' };
      }
    }
    return { success: false, message: 'Item não encontrado.' };
  } catch (error) {
    Logger.log("Erro em pcaDelete: " + error.message);
    throw error; // Re-lança para tratamento superior
  }
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
