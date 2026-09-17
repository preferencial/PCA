/**
 * @file 20_User_Read.gs
 * @description Visualização de dados de perfil de usuário.
 * @author Antigravity (ag-kit)
 * @date 2026-04-28
 */

/**
 * Lê dados de perfil de um usuário pelo UUID.
 * O campo `Password` é excluído do objeto retornado.
 * @param {string} id UUID do usuário (campo ID).
 * @returns {Object|null} Objeto do usuário sem senha, ou null se não encontrado.
 */
function userRead(id) {
  try {
    const config  = getConfig();
    const db      = getDb();
    if (!db) return null;

    const sheet = db.getSheetByName(config.SHEET_USER);
    if (!sheet) return null;

    const data    = sheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0] || '').trim() === String(id || '').trim()) {
        const obj = {};
        headers.forEach((h, j) => { if (h !== 'Password') obj[h] = data[i][j]; });
        return obj;
      }
    }
    return null;
  } catch (error) {
    Logger.log("Erro em userRead: " + error.message);
    throw error;
  }
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
