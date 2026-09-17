/* Catalogo semantico de fixtures analiticos. Gerado a partir do schema real do projeto. */
var AI_FIXTURE_CATALOG = [];
var AI_FIXTURE_CATALOG_VERSION = '1.0.0';

/** Registra fixture analítico sem duplicar identificadores. */
function registerAiFixture_(fixture) {
  if (!fixture || !fixture.id || !fixture.entity) throw new Error('Fixture analítico inválido.');
  if (AI_FIXTURE_CATALOG.some(function(item) { return item.id === fixture.id; })) return false;
  AI_FIXTURE_CATALOG.push({ id: String(fixture.id), entity: String(fixture.entity), data: fixture.data || {} });
  return true;
}

/** Devolve uma cópia do catálogo para testes e ferramentas de diagnóstico. */
function listAiFixtures_() {
  return AI_FIXTURE_CATALOG.map(function(item) {
    return { id: item.id, entity: item.entity, data: Object.assign({}, item.data) };
  });
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
