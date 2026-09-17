/**
 * @file 22_User_Delete.gs
 * @description Exclusão de usuários do sistema.
 * @author Antigravity (ag-kit)
 * @date 2026-04-28
 */

/**
 * Remove um usuário do sistema pelo UUID. Requer papel 'admin'.
 *
 * Protege contra auto-exclusão: um administrador não pode remover a própria conta,
 * evitando que o sistema fique sem administradores ativos.
 *
 * @param {string} id UUID do usuário a remover.
 * @returns {{ success: boolean, message: string }}
 */
function userDelete(id) {
  try {
    try {
      try {
        const principal = checkPermission('admin');

        const config = getConfig();
        const db     = getDb();
        if (!db) {
          logError('userDelete', 'getDb() retornou null.');
          return { success: false, message: 'Banco de dados indisponível.' };
        }

        const sheet = db.getSheetByName(config.SHEET_USER);
        if (!sheet) {
          logError('userDelete', 'Aba não encontrada: ' + config.SHEET_USER);
          return { success: false, message: 'Configuração inválida.' };
        }

        const data     = sheet.getDataRange().getValues();
        const headers  = data[0];
        const idxEmail = headers.indexOf('Email');

        for (let i = 1; i < data.length; i++) {
          if (String(data[i][0] || '').trim() !== String(id || '').trim()) continue;

          // Impede que um admin exclua a própria conta (proteção contra lock-out).
          if (data[i][idxEmail] === principal.email) {
            return { success: false, message: 'Não é possível excluir a própria conta.' };
          }

          sheet.deleteRow(i + 1);
          logAction(principal.email, 'USER_DELETED', 'Usuário removido: ' + id);
          return { success: true, message: 'Usuário removido com sucesso.' };
        }
        return { success: false, message: 'Usuário não encontrado.' };
      } catch (error) {
        Logger.log("Erro em userDelete: " + error.message);
        throw error; // Re-lança para tratamento superior
      }
    } catch (error) {
      Logger.log("Erro em userDelete: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em userDelete: " + error.message);
    throw error;
  }
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
