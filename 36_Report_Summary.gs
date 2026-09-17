/**
 * @file 36_Report_Summary.gs
 * @description Consolida métricas para o dashboard executivo.
 * @author Antigravity (ag-kit)
 * @date 2026-04-28
 */

/**
 * Calcula métricas do PCA para exibição no dashboard.
 * @returns {Object|null}
 */
function getDashboardMetrics() {
  try {
    var config = getConfig();
    var db = getDb();
    if (!db) return null;

    var sheet = db.getSheetByName(config.SHEET_PCA);
    if (!sheet) return null;

    var data = sheet.getDataRange().getValues();
    var total = data.length - 1; // exclui linha de cabeçalho
    var statusCol = data[0].indexOf('Status');
    var valorCol  = data[0].indexOf('ValorEstimado');
    var statusCount = {};
    var valorTotal  = 0;

    for (var i = 1; i < data.length; i++) {
      var status = statusCol >= 0 ? data[i][statusCol] : 'N/A';
      statusCount[status] = (statusCount[status] || 0) + 1;

      if (valorCol >= 0) {
        var v = PCA_parseFiniteNumber_(data[i][valorCol]);
        if (v !== null && v >= 0) valorTotal += v;
      }
    }

    return {
      total:        total,
      totalCount:   total,
      statusCount:  statusCount,
      valorTotal:   valorTotal,
      totalValue:   valorTotal,  // alias consumido pelo Dashboard_Main (stat-total-value)
      draftCount:   (statusCount['Em Análise'] || 0) + (statusCount['Em Elaboração'] || 0),
      approvedCount: (statusCount['Priorizada'] || 0) + (statusCount['Aprovado'] || 0),
      publishedCount: (statusCount['Encaminhada à CRE-PP'] || 0) + (statusCount['Publicado'] || 0),
    };
  } catch (error) {
    Logger.log("Erro em getDashboardMetrics: " + error.message);
    throw error;
  }
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
