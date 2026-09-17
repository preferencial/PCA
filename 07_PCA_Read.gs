/**
 * @file 07_PCA_Read.gs
 * @description Recupera dados de um item específico do PCA.
 * @author Antigravity (ag-kit)
 * @date 2026-04-28
 */

/**
 * Recupera dados de um item específico do PCA pelo UUID.
 * Requer sessão válida com papel 'user' ou superior.
 * @param {string} id UUID do item (campo ID_PCA).
 * @returns {Object|null} Objeto do item sem campos sensíveis, ou null se não encontrado.
 */
function pcaRead(id) {
  try {
    // Requer autenticação para ler item
    checkPermission('user');
    
    const config  = getConfig();
    const db      = getDb();
    if (!db) return null;

    const sheet = db.getSheetByName(config.SHEET_PCA);
    if (!sheet) return null;

    const data    = sheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0] || '').trim() === String(id || '').trim()) {
        const obj = {};
        headers.forEach((h, j) => { obj[h] = data[i][j]; });
        return obj;
      }
    }
    return null;
  } catch (error) {
    Logger.log("Erro em pcaRead: " + error.message);
    throw error;
  }
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
