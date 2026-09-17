/**
 * @file 17_Legal_List.gs
 * @description Lista as referências legais cadastradas.
 * @author Antigravity (ag-kit)
 * @date 2026-04-28
 */

/**
 * Retorna a lista de referências legais.
 * @returns {Array<Object>}
 */
function getLegalList() {
  try {
    var config = getConfig();
    var db = getDb();
    if (!db) return [];
  
    var sheet = db.getSheetByName(config.SHEET_LEGAL);
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
  
    var headers = data[0];
    var result = [];
  
    for (var i = 1; i < data.length; i++) {
      var item = {};
      headers.forEach(function(h, j) {
        item[h] = data[i][j];
      });
      result.push(item);
    }
  
    return result;
  } catch (error) {
    Logger.log("Erro em getLegalList: " + error.message);
    throw error;
  }
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
