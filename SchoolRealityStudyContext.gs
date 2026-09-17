/**
 * codex-study-context-refinement
 * Contexto extraido de estudos, artigos, relatorios e notebooks associados ao webapp.
 */
var SCHOOL_REALITY_STUDY_CONTEXT = {
  projectName: "Preferencial - PCA",
  category: "decisao",
  focus: "decisao pedagogica, priorizacao e acompanhamento de criterios",
  summary: "criterios, comparacoes, planos e evidencias para apoiar decisoes educacionais",
  primarySource: "webapp\\Artigo.md",
  secondarySource: "estudos associados e planilhas operacionais",
  studySourceCount: 4,
  studySources: ["webapp\\Artigo.md", "webapp\\notebook.py", "webapp\\README.md", "webapp\\Relatorio.md"],
  analysisOneLabel: "Cobertura de criterios e decisoes registradas",
  analysisOneDimension: "decisao pedagogica",
  analysisTwoAttentionLabel: "Criterios ou planos que pedem revisao",
  analysisTwoPerformanceLabel: "Media de consistencia das evidencias",
  analysisTwoAttentionDimension: "priorizacao",
  analysisTwoPerformanceDimension: "consistencia"
};
/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
