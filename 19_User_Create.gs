/**
 * @file 19_User_Create.gs
 * @description Cadastro de novos usuários pelo administrador.
 * @author Antigravity (ag-kit)
 * @date 2026-04-28
 */

/**
 * @typedef {Object} UserCreateInput
 * @property {string}  Username     Login do usuário.
 * @property {string}  Password     Senha em texto claro (hasheada antes de gravar).
 * @property {string}  [Role]       Papel atribuído; padrão 'user'.
 * @property {string}  Nome         Nome completo.
 * @property {string}  Email        E-mail institucional.
 */

/**
 * Cria um novo usuário no sistema. Requer papel 'admin'.
 *
 * A senha é gravada em TEXTO PLANO (quiosque escolar — sem hash).
 * O UUID e o timestamp `CriadoEm` são gerados server-side.
 *
 * @param {UserCreateInput} user Dados do novo usuário.
 * @returns {{ success: boolean, message: string, id?: string }}
 */
function userCreate(user) {
  try {
    try {
      const principal = checkPermission('admin');

      const config = getConfig();
      const db     = getDb();
      if (!db) {
        logError('userCreate', 'getDb() retornou null.');
        return { success: false, message: 'Banco de dados indisponível.' };
      }

      const sheet = db.getSheetByName(config.SHEET_USER);
      if (!sheet) {
        logError('userCreate', 'Aba não encontrada: ' + config.SHEET_USER);
        return { success: false, message: 'Configuração inválida.' };
      }

      // Senha gravada em texto plano (quiosque escolar) — sem hash.
      const safeUser = Object.assign({}, user);

      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const id      = generateUUID();
      const now     = new Date();

      const row = headers.map(h => {
        if (h === 'ID')        return id;
        if (h === 'CriadoEm') return now;
        if (h === 'Role')      return safeUser[h] || 'user';
        return safeUser[h] !== undefined ? safeUser[h] : '';
      });

      try {
        sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
        logAction(principal.email, 'USER_CREATED', 'Novo usuário: ' + (safeUser.Email || id));
        return { success: true, id: id, message: 'Usuário criado com sucesso.' };
      } catch (e) {
        logError('userCreate', e.message, e.stack);
        return { success: false, message: 'Erro ao criar usuário. Consulte os logs.' };
      }
    } catch (error) {
      Logger.log("Erro em userCreate: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em userCreate: " + error.message);
    throw error;
  }
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
