/**
 * @file 14_Legal_Read.gs
 * @description Lê detalhes de uma referência legal específica.
 * @author Antigravity (ag-kit)
 * @date 2026-04-28
 */

/**
 * Lê detalhes de uma referência legal pelo UUID.
 * @param {string} id UUID da referência (campo ID_Ref).
 * @returns {Object|null} Objeto da referência legal, ou null se não encontrada.
 */
function legalRead(id) {
  try {
    const config  = getConfig();
    const db      = getDb();
    if (!db) return null;

    const sheet = db.getSheetByName(config.SHEET_LEGAL);
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
    Logger.log("Erro em legalRead: " + error.message);
    throw error;
  }
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
