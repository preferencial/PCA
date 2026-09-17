/**
 * @file 35_Utils_ID.gs
 * @description Gerador de identificadores únicos (UUID).
 * @author Manus AI
 * @date 2026-04-22
 */

/**
 * Gera um identificador único com a primitiva nativa do Apps Script.
 * @returns {string}
 */
function generateUUID() {
  return Utilities.getUuid();
}

/** Gera um identificador de domínio legível, mantendo a unicidade do UUID. */
function generateEntityId_(prefix) {
  var normalized = String(prefix || 'entity').replace(/[^A-Za-z0-9_-]/g, '_');
  return normalized + '_' + generateUUID();
}

/** Valida o formato UUID aceito pelos registros do painel. */
function isValidUUID_(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

/** Normaliza identificadores vindos de formulários antes de persistir. */
function normalizeEntityId_(value) {
  var text = String(value || '').trim();
  return isValidUUID_(text) ? text.toLowerCase() : '';
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
