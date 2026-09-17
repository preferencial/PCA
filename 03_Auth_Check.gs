/**
 * @file 03_Auth_Check.gs
 * @description Verificação de sessão e controle de autorização server-side.
 * @author Antigravity (ag-kit)
 * @date 2026-04-28
 */

/**
 * Hierarquia de papéis: maior valor = mais privilégio.
 * Adicionar novos papéis aqui centraliza toda lógica de escalonamento.
 *
 * @const {Object.<string, number>}
 */
const ROLE_HIERARCHY = { admin: 2, user: 1 };

/**
 * Lê e deserializa a sessão ativa do UserCache.
 * Retorna null em qualquer falha (cache miss ou JSON inválido) sem lançar exceção.
 *
 * @returns {{ email: string, role: string }|null}
 */
function _getSession() {
  try {
    const raw = CacheService.getUserCache().get(SESSION_CACHE_KEY);
    if (!raw) return null;
    try {
      const session = JSON.parse(raw);
      if (!session || typeof session !== 'object' || !String(session.email || '').trim()) return null;
      return session;
    }
    // Logger.log is used intentionally: logError() calls getDb() which could
    // cascade if the cache is corrupt during startup.
    catch (_) { LoggerService.info('[_getSession] Cache entry is not valid JSON; treating as no session.'); return null; } // lint-disable: L007
  } catch (error) {
    Logger.log("Erro em _getSession: " + error.message);
    throw error;
  }
}

/**
 * Verifica se existe uma sessão ativa para o usuário corrente.
 *
 * @returns {{ logged: boolean, email: string|null }}
 */
function authCheck() {
  const session = _getSession();
  return { logged: !!session, email: session ? session.email : null };
}

/**
 * Retorna o perfil completo do usuário autenticado a partir da sessão em cache.
 *
 * Permite ao cliente restaurar o estado de login após um reload da página, sem
 * exigir novo login enquanto a sessão (TTL definido em authLogin) for válida.
 * O campo `Password` nunca é incluído no objeto retornado.
 *
 * @returns {Object|null} Usuário sem senha, ou null se não houver sessão válida.
 */
function getCurrentUser() {
  try {
    const session = _getSession();
    if (!session || !session.email) return null;

    const config = getConfig();
    const db     = getDb();
    if (!db) return null;

    const sheet = db.getSheetByName(config.SHEET_USER);
    if (!sheet) return null;

    const data     = sheet.getDataRange().getValues();
    const headers  = data[0];
    const idxEmail = headers.indexOf('Email');
    const idxStatus = headers.indexOf('Status');
    if (idxEmail === -1) return null;

    for (let i = 1; i < data.length; i++) {
      const rowEmail = String(data[i][idxEmail] || '').trim().toLowerCase();
      if (rowEmail === String(session.email).trim().toLowerCase()) {
        if (idxStatus >= 0 && ['inativo', 'inactive', 'arquivado'].indexOf(String(data[i][idxStatus] || '').trim().toLowerCase()) >= 0) {
          return null;
        }
        const user = {};
        headers.forEach((h, j) => { if (h !== 'Password') user[h] = data[i][j]; });
        return user;
      }
    }
    return null;
  } catch (error) {
    Logger.log("Erro em getCurrentUser: " + error.message);
    throw error;
  }
}

/**
 * Aplica controle de autorização server-side obrigatório.
 *
 * Deve ser chamada como **primeira instrução** em toda função sensível
 * exposta ao cliente via `google.script.run`. Em caso de falha, lança Error
 * imediatamente — nunca retorna silenciosamente com acesso concedido.
 *
 * O papel do chamador é lido da sessão serializada no cache (gravada em
 * authLogin), evitando uma consulta extra ao banco em cada request.
 *
 * @example
 * function pcaDelete(id) {
 *   const principal = checkPermission('admin'); // lança se não autorizado
 *   // ... lógica segura abaixo
 * }
 *
 * @param {string} [requiredRole='user'] Papel mínimo exigido: 'admin' ou 'user'.
 * @throws {Error} Se a sessão for inválida/expirada ou o papel for insuficiente.
 * @returns {{ email: string, role: string }} Principal autenticado.
 */
function checkPermission(requiredRole) {
  const minRole  = String(requiredRole || 'user').trim().toLowerCase();
  const session  = _getSession();

  if (!Object.prototype.hasOwnProperty.call(ROLE_HIERARCHY, minRole)) {
    throw new Error('Papel de acesso inválido.');
  }

  if (!session || !session.email) {
    logError('checkPermission', 'Acesso negado: sessão ausente ou expirada.');
    throw new Error('Não autorizado: sessão inválida ou expirada.');
  }

  const callerLevel   = ROLE_HIERARCHY[String(session.role || '').trim().toLowerCase()] || 0;
  const requiredLevel = ROLE_HIERARCHY[minRole]       || 1;

  if (callerLevel < requiredLevel) {
    logError(
      'checkPermission',
      'Tentativa de escalonamento de privilégios bloqueada. ' +
        'Role atual: ' + session.role + ' | Requerido: ' + minRole
    );
    throw new Error('Não autorizado: permissão insuficiente.');
  }

  return { email: session.email, role: session.role };
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
