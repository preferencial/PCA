/**
 * @file 10_PCA_List.gs
 * @description Lista todos os itens do PCA com paginação.
 * @author Manus AI
 * @description Lista os registros de demandas e decisões da unidade escolar.
 * @author Antigravity (ag-kit)
 * @date 2026-04-28
 */

/**
 * Retorna a lista completa de itens do PCA.
 * Requer sessão válida com papel 'user' ou superior.
 * @returns {Array<Object>}
 */
function getPCAList() {
  try {
    // Requer autenticação para listar itens
    checkPermission('user');
    
    var config = getConfig();
    var db = getDb();
    if (!db) return [];
  
    var sheet = db.getSheetByName(config.SHEET_PCA);
    if (!sheet) return [];
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
    Logger.log("Erro em getPCAList: " + error.message);
    throw error;
  }
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
