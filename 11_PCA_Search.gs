/**
 * @file 11_PCA_Search.gs
 * @description Lógica de busca e filtragem avançada no PCA.
 * @author Antigravity (ag-kit)
 * @date 2026-04-28
 */

/**
 * Busca e filtra itens do PCA por múltiplos critérios (busca case-insensitive por subcadeia).
 * Requer sessão válida com papel 'user' ou superior.
 * @param {Object.<string, string>} filtros Mapa de campo→valor a filtrar. Ex: { Status: 'Ativo' }
 * @returns {Array<Object>} Itens que satisfazem todos os critérios fornecidos.
 */
function pcaSearch(filtros) {
  try {
    // Requer autenticação para buscar itens
    checkPermission('user');
    
    const config  = getConfig();
    const db      = getDb();
    if (!db) return [];

    const sheet = db.getSheetByName(config.SHEET_PCA);
    if (!sheet) return [];

    const data    = sheet.getDataRange().getValues();
    const headers = data[0];
    const results = [];
    const filters = filtros || {};

    for (let i = 1; i < data.length; i++) {
      const obj = {};
      headers.forEach((h, j) => { obj[h] = data[i][j]; });

      const match = Object.keys(filters).every(key => {
        const filterValue = filters[key];
        if (filterValue === null || filterValue === undefined || String(filterValue).trim() === '') return true;
        const actualValue = String(obj[key] == null ? '' : obj[key]).trim().toLowerCase();
        const normalizedFilter = String(filterValue).trim().toLowerCase();
        if (key === 'PublicoEstimado' || key === 'ValorEstimado') {
          return actualValue === normalizedFilter;
        }
        return actualValue.includes(normalizedFilter);
      });

      if (match) results.push(obj);
    }
    return results;
  } catch (error) {
    Logger.log("Erro em pcaSearch: " + error.message);
    throw error;
  }
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
