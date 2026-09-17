/**
 * @file 21_User_Update.gs
 * @description Edição de dados e alteração de senhas de usuários.
 * @author Antigravity (ag-kit)
 * @date 2026-04-28
 */

/**
 * Atualiza dados de um usuário pelo UUID. Requer papel 'admin'.
 *
 * Se `updates.Password` estiver presente, é gravada em TEXTO PLANO
 * (quiosque escolar — sem hash).
 * Os campos `ID` e `CriadoEm` são protegidos contra sobrescrita.
 * A gravação ocorre em lote (uma única chamada setValues).
 *
 * @param {string} id      UUID do usuário a atualizar.
 * @param {Object} updates Mapa de campos e novos valores.
 * @returns {{ success: boolean, message: string }}
 */
function userUpdate(id, updates) {
  try {
    const principal = checkPermission('admin');

    const config = getConfig();
    const db     = getDb();
    if (!db) {
      logError('userUpdate', 'getDb() retornou null.');
      return { success: false, message: 'Banco de dados indisponível.' };
    }

    const sheet = db.getSheetByName(config.SHEET_USER);
    if (!sheet) {
      logError('userUpdate', 'Aba não encontrada: ' + config.SHEET_USER);
      return { success: false, message: 'Configuração inválida.' };
    }

    // Nova senha gravada em texto plano (quiosque escolar) — sem hash.
    const safeUpdates = Object.assign({}, updates);

    const data    = sheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0] || '').trim() !== String(id || '').trim()) continue;

      const updatedRow = data[i].map((cell, j) => {
        const field = headers[j];
        if (field === 'ID' || field === 'CriadoEm') return cell;  // imutáveis
        return safeUpdates.hasOwnProperty(field) ? safeUpdates[field] : cell;
      });

      try {
        sheet.getRange(i + 1, 1, 1, updatedRow.length).setValues([updatedRow]);
        logAction(principal.email, 'USER_UPDATED', 'Usuário atualizado: ' + id);
        return { success: true, message: 'Usuário atualizado com sucesso.' };
      } catch (e) {
        logError('userUpdate', e.message, e.stack);
        return { success: false, message: 'Erro ao atualizar usuário. Consulte os logs.' };
      }
    }
    return { success: false, message: 'Usuário não encontrado.' };
  } catch (error) {
    Logger.log("Erro em userUpdate: " + error.message);
    throw error;
  }
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
