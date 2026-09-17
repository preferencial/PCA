/**
 * @file 34_Utils_String.gs
 * @description Manipulação e limpeza de strings.
 * @author Manus AI
 * @date 2026-04-22
 */

/**
 * Remove acentos e caracteres especiais de uma string.
 * @param {string} str
 * @returns {string}
 */
function cleanString(str) {
  try {
    if (!str) return '';
    return str.normalize('NFD').replace(/[^\w\s]/gi, '').replace(/[\u0300-\u036f]/g, '');
  } catch (error) {
    Logger.log("Erro em cleanString: " + error.message);
    throw error;
  }
}

/**
 * Capitaliza a primeira letra de cada palavra.
 * @param {string} str
 * @returns {string}
 */
function capitalizeWords(str) {
  try {
    if (!str) return '';
    return str.replace(/\b\w/g, function(l) { return l.toUpperCase(); });
  } catch (error) {
    Logger.log("Erro em capitalizeWords: " + error.message);
    throw error;
  }
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
