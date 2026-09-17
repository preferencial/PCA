/**
 * @file 32_Trigger_Edit.gs
 * @description Gatilho de edição da planilha. Carimba AtualizadoEm na linha
 *   editada da aba do PCA e audita a alteração. Funciona como trigger simples
 *   (onEdit) e pode ser promovido a instalável via installEditTrigger() para
 *   ter acesso pleno a serviços autorizados.
 *
 *   Dependências (mesmo namespace GAS):
 *     - 04_Env_Config.gs  → getConfig()
 *     - 25_Log_Action.gs  → logAction()
 *     - 26_Log_Error.gs   → logError()
 *
 * @author Antigravity (ag-kit)
 * @date 2026-05-31
 */

/**
 * Instala um gatilho de edição instalável (recomendado quando o handler
 * precisa de serviços que exigem autorização). Remove duplicados antes.
 * Execute manualmente uma única vez.
 *
 * @returns {{ success: boolean, message: string }}
 */
function installEditTrigger() {
  try {
    const ss = getBoundSpreadsheet_();
    ScriptApp.getProjectTriggers().forEach(function(t) {
      if (t.getHandlerFunction() === 'onEdit') ScriptApp.deleteTrigger(t);
    });
    ScriptApp.newTrigger('onEdit').forSpreadsheet(ss).onEdit().create();
    return { success: true, message: 'Gatilho de edição instalado.' };
  } catch (e) {
    logError('installEditTrigger', e.message, e.stack);
    return { success: false, message: 'Falha ao instalar o gatilho. Consulte os logs.' };
  }
}

/**
 * Handler de edição. Para edições de dados (não-cabeçalho) na aba do PCA,
 * atualiza a coluna AtualizadoEm da linha e registra a ação na auditoria.
 * Edições em outras abas são apenas auditadas. Nunca lança exceção.
 *
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e Evento de edição.
 */
function onEdit(e) {
  try {
    if (!e || !e.range) return;

    try {
      const config = getConfig();
      const range  = e.range;
      const sheet  = range.getSheet();
      const name   = sheet.getName();
      const row    = range.getRow();
      const user   = (e.user && e.user.getEmail && e.user.getEmail()) ||
                     Session.getActiveUser().getEmail() || 'desconhecido';

      // Ignora edições no cabeçalho (linha 1).
      if (row <= 1) return;

      // Carimba AtualizadoEm apenas para a aba do PCA.
      if (name === config.SHEET_PCA) {
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const colAtu  = headers.indexOf('AtualizadoEm') + 1; // indexOf -1 → 0 (sem coluna)

        // Evita laço infinito: não recarimbar quando a própria coluna foi editada.
        if (colAtu > 0 && range.getColumn() !== colAtu) {
          sheet.getRange(row, colAtu).setValue(new Date());
        }
      }

      logAction(user, 'SHEET_EDIT', 'Aba: ' + name + ' | Célula: ' + range.getA1Notation());
    } catch (err) {
      logError('onEdit', err.message, err.stack);
    }
  } catch (error) {
    Logger.log("Erro em onEdit: " + error.message);
    throw error;
  }
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
