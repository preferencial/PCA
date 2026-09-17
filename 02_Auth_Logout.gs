/**
 * @file 02_Auth_Logout.gs
 * @description Gerencia o encerramento da sessão do usuário.
 * @author Antigravity (ag-kit)
 * @date 2026-04-28
 */

/**
 * Encerra a sessão do usuário corrente removendo o token do UserCache.
 * A chave removida deve corresponder exatamente à constante SESSION_CACHE_KEY
 * definida em 01_Auth_Login.gs para garantir invalidação completa.
 *
 * @returns {true} Sempre retorna true (idempotente — seguro chamar múltiplas vezes).
 */
function authLogout() {
  try {
    var cache = CacheService.getUserCache();
    var cacheKey = String(SESSION_CACHE_KEY || '').trim();
    if (!cacheKey) throw new Error('Chave de sessão não configurada.');
    cache.remove(cacheKey);
    Logger.log('Sessão invalidada para o usuário corrente.');
    return true;
  } catch (error) {
    Logger.log("Erro em authLogout: " + error.message);
    throw error;
  }
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
