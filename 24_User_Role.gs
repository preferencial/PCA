/**
 * @file 24_User_Role.gs
 * @description Gerenciamento de níveis de acesso (Admin/User).
 * @author Antigravity (ag-kit)
 * @date 2026-04-28
 */

/**
 * Retorna o papel (role) de um usuário dado seu e-mail.
 *
 * Usa {@link getDb} e {@link getConfig} para garantir que a consulta ocorre
 * na planilha e aba corretas, evitando referências a `getActiveSpreadsheet()`
 * ou nomes de aba hardcoded que divergem da configuração central.
 *
 * Esta função é chamada por {@link checkPermission} apenas quando a sessão
 * em cache não contém o papel (ex: tokens emitidos por versões anteriores).
 * No fluxo normal, o papel é lido da sessão JSON gravada em {@link authLogin}.
 *
 * @param {string} email E-mail do usuário a consultar.
 * @returns {'admin'|'user'|'none'} Papel do usuário, ou 'none' se não encontrado.
 */
function getUserRole(email) {
  try {
    const config = getConfig();
    const db     = getDb();
    if (!db) return 'none';

    const sheet = db.getSheetByName(config.SHEET_USER);
    if (!sheet) return 'none';

    const data     = sheet.getDataRange().getValues();
    const headers  = data[0];
    const idxEmail = headers.indexOf('Email');
    const idxRole  = headers.indexOf('Role');

    for (let i = 1; i < data.length; i++) {
      if (data[i][idxEmail] === email) {
        const role = String(data[i][idxRole] || '').toLowerCase().trim();
        return (role === 'admin' || role === 'user') ? role : 'user';
      }
    }
    return 'none';
  } catch (error) {
    Logger.log("Erro em getUserRole: " + error.message);
    throw error;
  }
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
