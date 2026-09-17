/**
 * @file 23_User_List.gs
 * @description Listagem de todos os usuários do sistema.
 * @author Antigravity (ag-kit)
 * @date 2026-04-28
 */

/**
 * Lista todos os usuários do sistema. Requer papel 'admin'.
 * O campo `Password` é excluído de todos os objetos retornados.
 * @returns {Array<Object>} Array de perfis de usuário sem senha.
 */
function userList() {
  try {
    checkPermission('admin');

    const config  = getConfig();
    const db      = getDb();
    if (!db) return [];

    const sheet = db.getSheetByName(config.SHEET_USER);
    if (!sheet) return [];

    const data    = sheet.getDataRange().getValues();
    const headers = data[0];

    return data.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, j) => { if (h !== 'Password') obj[h] = row[j]; });
      return obj;
    });
  } catch (error) {
    Logger.log("Erro em userList: " + error.message);
    throw error;
  }
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
