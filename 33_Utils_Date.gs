/**
 * @file 33_Utils_Date.gs
 * @description Utilitários para formatação de datas (PT-BR).
 * @author Manus AI
 * @date 2026-04-22
 */

/**
 * Formata uma data para o padrão dd/MM/yyyy HH:mm.
 * @param {Date} date Objeto Date.
 * @returns {string} Data formatada.
 */
function formatDateBR(date) {
  if (!date) return '';
  var d = new Date(date);
  var pad = function(n) { return n < 10 ? '0' + n : n; };
  return pad(d.getDate()) + '/' + pad(d.getMonth()+1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

/** Retorna true apenas para datas que podem ser serializadas sem ambiguidade. */
function isValidDate_(date) {
  return date !== null && date !== undefined && !isNaN(new Date(date).getTime());
}

/** Formata a data em ISO para contratos de API e logs. */
function formatDateISO(date) {
  return isValidDate_(date) ? new Date(date).toISOString() : '';
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
