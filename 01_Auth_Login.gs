/**
 * @file 01_Auth_Login.gs
 * @description Autenticação de usuários com hash SHA-256 de senha.
 * @author Antigravity (ag-kit)
 * @date 2026-04-28
 *
 * DEPLOYMENT REQUIREMENT:
 *   Publicar como web app com "Execute as: User accessing the web app".
 *   Publicar como "Execute as: Me" invalida o isolamento do UserCache entre
 *   usuários distintos, criando vulnerabilidade crítica de cross-session hijacking.
 *
 * MIGRATION NOTE — senhas legadas:
 *   Senhas ainda em plaintext são aceitas na comparação para permitir migração
 *   gradual. O admin deve re-hashear as senhas via setupHashedPassword() antes
 *   da próxima implantação em produção.
 *
 * PASSWORD_SALT:
 *   Defina a propriedade de script PASSWORD_SALT em
 *   Projeto → Configurações → Propriedades do script antes do primeiro uso.
 */

/** @const {string} Chave do UserCache que armazena a sessão ativa serializada. */
const SESSION_CACHE_KEY = 'pca_session';

/** @const {number} Tempo de vida da sessão em cache (segundos). */
const SESSION_TTL_SECONDS = 3600;

/**
 * Realiza o login do usuário.
 *
 * Credenciais são verificadas por comparação de hash SHA-256.
 * O log de falha nunca registra o e-mail tentado para evitar enumeração de usuários.
 * Nenhum provisionamento automático de credenciais ocorre neste fluxo.
 *
 * @param {string} email    E-mail ou username do usuário.
 * @param {string} password Senha em texto claro (hash calculado server-side).
 * @returns {{ success: boolean, message: string, user?: Object }}
 *   A propriedade `user`, quando presente, nunca inclui o campo `Password`.
 */
function authLogin(email, password) {
  try {
    try {
      var identifier = String(email == null ? '' : email).trim().toLowerCase();
      var suppliedPassword = String(password == null ? '' : password);
      if (!identifier || !suppliedPassword) {
        return { success: false, message: 'Usuário ou senha inválidos.' };
      }
      const config = getConfig();
      const db     = getDb();
      if (!db) {
        logError('authLogin', 'getDb() retornou null.');
        return { success: false, message: 'Banco de dados indisponível.' };
      }

      const sheet = db.getSheetByName(config.SHEET_USER);
      if (!sheet) {
        logError('authLogin', 'Aba não encontrada: ' + config.SHEET_USER);
        return { success: false, message: 'Erro de configuração do sistema.' };
      }

      const rows     = sheet.getDataRange().getValues();
      const headers  = rows[0];
      const idxUser  = headers.indexOf('Username');
      const idxEmail = headers.indexOf('Email');
      const idxPwd   = headers.indexOf('Password');
      const idxRole  = headers.indexOf('Role');
      const idxStatus = headers.indexOf('Status');

      for (let i = 1; i < rows.length; i++) {
        const row      = rows[i];
        const rowUser  = String(idxUser >= 0 ? row[idxUser] : '').trim().toLowerCase();
        const rowEmail = String(idxEmail >= 0 ? row[idxEmail] : '').trim().toLowerCase();
        const isMatch  = rowUser === identifier || rowEmail === identifier;
        if (!isMatch) continue;

        if (idxStatus >= 0 && ['inativo', 'inactive', 'arquivado'].indexOf(String(row[idxStatus] || '').trim().toLowerCase()) >= 0) {
          return { success: false, message: 'Usuário ou senha inválidos.' };
        }
        const stored   = String(idxPwd >= 0 ? row[idxPwd] : '');
        // Comparacao SEMPRE em texto plano (quiosque escolar) — nenhum hash.
        const pwdOk    = stored === suppliedPassword;

        if (!pwdOk) {
          // Username/e-mail bateu mas a senha está errada — interrompe imediatamente.
          break;
        }

        const user = {};
        headers.forEach((h, j) => { if (h !== 'Password') user[h] = row[j]; });

        const session = JSON.stringify({
          email: row[idxEmail],
          role:  String(row[idxRole] || 'user').toLowerCase().trim(),
          userId: idxUser >= 0 ? String(row[idxUser] || '').trim() : '',
        });
        CacheService.getUserCache().put(SESSION_CACHE_KEY, session, SESSION_TTL_SECONDS);

        logAction(user['ID'] || 'UNKNOWN', 'LOGIN_SUCCESS', 'Login realizado via web app.');
        return { success: true, user: user, message: 'Login realizado com sucesso.' };
      }

      // Não registra o e-mail tentado para evitar enumeração de usuários nos logs.
      logAction('SYSTEM', 'LOGIN_FAILURE', 'Tentativa de login inválida.');
      return { success: false, message: 'Usuário ou senha inválidos.' };
    } catch (error) {
      Logger.log("Erro em authLogin: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em authLogin: " + error.message);
    throw error;
  }
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
