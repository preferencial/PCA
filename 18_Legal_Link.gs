/**
 * @file 18_Legal_Link.gs
 * @description Vincula itens do PCA às suas bases legais correspondentes.
 * @author Antigravity (ag-kit)
 * @date 2026-04-28
 */

/**
 * Vincula um item do PCA a uma referência legal. Requer papel 'user'.
 *
 * @param {string} pcaId   UUID do item do PCA.
 * @param {string} legalId UUID da referência legal.
 * @returns {{ success: boolean, message: string }}
 */
function legalLink(pcaId, legalId) {
  try {
    try {
      const principal = checkPermission('user');

      const normalizedPcaId = String(pcaId == null ? '' : pcaId).trim();
      const normalizedLegalId = String(legalId == null ? '' : legalId).trim();
      if (!normalizedPcaId || !normalizedLegalId) {
        return { success: false, message: 'Informe o item PCA e a referência legal.' };
      }

      const config = getConfig();
      const db     = getDb();
      if (!db) {
        logError('legalLink', 'getDb() retornou null.');
        return { success: false, message: 'Banco de dados indisponível.' };
      }

      const sheet = db.getSheetByName(config.SHEET_PCA);
      if (!sheet) {
        logError('legalLink', 'Aba não encontrada: ' + config.SHEET_PCA);
        return { success: false, message: 'Configuração inválida.' };
      }

      const data     = sheet.getDataRange().getValues();
      const headers  = data[0];
      const idxLegal = headers.indexOf('Legal_IDs') >= 0
        ? headers.indexOf('Legal_IDs')
        : headers.indexOf('LegalID');
      if (idxLegal < 0) return { success: false, message: 'Coluna de referências legais não encontrada.' };

      const legalSheet = db.getSheetByName(config.SHEET_LEGAL);
      if (!legalSheet) return { success: false, message: 'Aba de referências legais não encontrada.' };
      const legalData = legalSheet.getDataRange().getValues();
      const legalIdExists = legalData.slice(1).some(function(row) {
        return String(row[0] == null ? '' : row[0]).trim() === normalizedLegalId;
      });
      if (!legalIdExists) return { success: false, message: 'Referência legal não encontrada.' };

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0] || '').trim() === normalizedPcaId) {
          var linkedIds = String(data[i][idxLegal] == null ? '' : data[i][idxLegal])
            .split(',')
            .map(function(value) { return value.trim(); })
            .filter(Boolean);
          if (linkedIds.indexOf(normalizedLegalId) < 0) linkedIds.push(normalizedLegalId);
          sheet.getRange(i + 1, idxLegal + 1).setValue(linkedIds.join(', '));
          logAction(principal.email, 'LEGAL_LINKED', normalizedPcaId + ' → ' + normalizedLegalId);
          return { success: true, message: 'Vínculo realizado com sucesso.' };
        }
      }
      return { success: false, message: 'Item PCA não encontrado.' };
    } catch (error) {
      Logger.log("Erro em legalLink: " + error.message);
      throw error; // Re-lança para tratamento superior
    }
  } catch (error) {
    Logger.log("Erro em legalLink: " + error.message);
    throw error;
  }
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
