/**
 * @file 15_Legal_Update.gs
 * @description Atualiza textos e links de referências legais.
 * @author Antigravity (ag-kit)
 * @date 2026-04-28
 */

/**
 * Atualiza uma referência legal pelo UUID. Requer papel 'admin'.
 *
 * O campo `ID_Ref` e `CriadoEm` são protegidos contra sobrescrita.
 * A gravação ocorre em lote (uma única chamada setValues).
 *
 * @param {string} id      UUID da referência a atualizar (campo ID_Ref).
 * @param {Object} updates Mapa de campos e novos valores.
 * @returns {{ success: boolean, message: string }}
 */
function legalUpdate(id, updates) {
  try {
    const principal = checkPermission('admin');

    const config = getConfig();
    const db     = getDb();
    if (!db) {
      logError('legalUpdate', 'getDb() retornou null.');
      return { success: false, message: 'Banco de dados indisponível.' };
    }

    const sheet = db.getSheetByName(config.SHEET_LEGAL);
    if (!sheet) {
      logError('legalUpdate', 'Aba não encontrada: ' + config.SHEET_LEGAL);
      return { success: false, message: 'Configuração inválida.' };
    }

    const data    = sheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0] || '').trim() !== String(id || '').trim()) continue;

      const updatedRow = data[i].map((cell, j) => {
        const field = headers[j];
        if (field === 'ID_Ref' || field === 'CriadoEm') return cell;  // imutáveis
        return updates.hasOwnProperty(field) ? updates[field] : cell;
      });

      try {
        sheet.getRange(i + 1, 1, 1, updatedRow.length).setValues([updatedRow]);
        logAction(principal.email, 'LEGAL_UPDATED', 'Referência atualizada: ' + id);
        return { success: true, message: 'Referência atualizada com sucesso.' };
      } catch (e) {
        logError('legalUpdate', e.message, e.stack);
        return { success: false, message: 'Erro ao atualizar. Consulte os logs.' };
      }
    }
    return { success: false, message: 'Referência não encontrada.' };
  } catch (error) {
    Logger.log("Erro em legalUpdate: " + error.message);
    throw error;
  }
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
