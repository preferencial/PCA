/**
 * @file 08_PCA_Update.gs
 * @description Atualiza informações de itens existentes no PCA.
 * @author Antigravity (ag-kit)
 * @date 2026-04-28
 */

/**
 * Atualiza um item existente no PCA pelo seu UUID.
 *
 * Requer papel 'user'. Os campos `ID_PCA` e `CriadoEm` são protegidos contra
 * sobrescrita. `AtualizadoEm` é sempre atualizado para o timestamp atual.
 * A gravação ocorre em lote (uma única chamada setValues) em vez de N chamadas
 * setValue individuais.
 *
 * @param {string} id      UUID do item a atualizar (campo ID_PCA).
 * @param {Object} updates Mapa de campos e novos valores.
 * @returns {{ success: boolean, message: string }}
 */
function pcaUpdate(id, updates) {
  try {
    try {
      try {
        const principal = checkPermission('user');
        const editableFields = [
          'Descricao', 'Tipo', 'CategoriaAlimenticia', 'ModalidadeAtendimento',
          'PublicoEstimado', 'ValorEstimado', 'PrazoInicio', 'PrazoFim',
          'Status', 'UnidadeGestora', 'Obs'
        ];
        const validStatuses = [
          'Em Análise', 'Priorizada', 'Encaminhada à CRE-PP',
          'Em Execução', 'Concluída', 'Arquivada'
        ];
        const safeUpdates = {};

        Object.keys(updates || {}).forEach(function(field) {
          if (editableFields.indexOf(field) !== -1) safeUpdates[field] = updates[field];
        });
        if (safeUpdates.Status && validStatuses.indexOf(safeUpdates.Status) === -1) {
          return { success: false, message: 'Situação de encaminhamento inválida.' };
        }

        const config = getConfig();
        const db     = getDb();
        if (!db) {
          logError('pcaUpdate', 'getDb() retornou null.');
          return { success: false, message: 'Banco de dados indisponível.' };
        }

        const sheet = db.getSheetByName(config.SHEET_PCA);
        if (!sheet) {
          logError('pcaUpdate', 'Aba não encontrada: ' + config.SHEET_PCA);
          return { success: false, message: 'Configuração inválida.' };
        }

        const data    = sheet.getDataRange().getValues();
        const headers = data[0];

        for (let i = 1; i < data.length; i++) {
          if (String(data[i][0] || '').trim() !== String(id || '').trim()) continue;

          const currentItem = {};
          headers.forEach((header, index) => {
            currentItem[header] = data[i][index];
          });

          const candidate = Object.assign({}, currentItem, safeUpdates);
          const validation = validatePCAData(candidate);
          if (!validation.valid) {
            return { success: false, message: 'Falha na validação do item.', errors: validation.errors };
          }

          // Monta linha atualizada em memória — uma única chamada setValues ao final.
          const updatedRow = data[i].map((cell, j) => {
            const field = headers[j];
            if (field === 'ID_PCA'    || field === 'CriadoEm') return cell;  // imutáveis
            if (field === 'AtualizadoEm') return new Date();
            return safeUpdates.hasOwnProperty(field) ? safeUpdates[field] : cell;
          });

          sheet.getRange(i + 1, 1, 1, updatedRow.length).setValues([updatedRow]);
          logAction(principal.email, 'PCA_UPDATED', 'Item atualizado: ' + id);
          return { success: true, message: 'Registro de gestão atualizado com sucesso.' };
        }
        return { success: false, message: 'Registro não encontrado.' };
      } catch (error) {
        Logger.log("Erro em pcaUpdate: " + error.message);
        throw error; // Re-lança para tratamento superior
      }
    } catch (error) {
      Logger.log("Erro em pcaUpdate: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em pcaUpdate: " + error.message);
    throw error;
  }
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
