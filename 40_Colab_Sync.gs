/**
 * @file 40_Colab_Sync.gs
 * @description Consolidação interna e exportação analítica protegida.
 * @author Antigravity (ag-kit)
 * @date 2026-04-28
 */

/**
 * Serve uma visão minimizada dos registros para integração analítica autorizada.
 *
 * Não é um ponto de entrada HTTP por si só: é despachada pelo doGet único em
 * 27_UI_Main.gs quando a requisição traz `?mode=colab` ou `?format=json`.
 * A integração fica desativada até que a Script Property
 * `ANALYTICS_ACCESS_TOKEN` seja configurada. O consumidor deve enviar a mesma
 * chave no parâmetro `token`. Identificadores de usuário, observações e vínculos
 * documentais não são expostos.
 *
 * @param {GoogleAppsScript.Events.DoGet} e Parâmetros da requisição GET.
 * @returns {GoogleAppsScript.Content.TextOutput} JSON dos dados do PCA.
 */
function serveColabData(e) {
  try {
    try {
      const expectedToken = PropertiesService.getScriptProperties()
        .getProperty('ANALYTICS_ACCESS_TOKEN');
      const suppliedToken = e && e.parameter ? String(e.parameter.token || '') : '';
      if (!expectedToken || suppliedToken !== expectedToken) {
        return ContentService
          .createTextOutput(JSON.stringify({ error: 'Integration disabled or unauthorized.' }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      const config = getConfig();
      const db     = getDb();
      if (!db) {
        return ContentService
          .createTextOutput(JSON.stringify({ error: 'Database unavailable.' }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      const sheet = db.getSheetByName(config.SHEET_PCA);
      if (!sheet) {
        return ContentService
          .createTextOutput(JSON.stringify({ error: 'Sheet not found.' }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) {
        return ContentService
          .createTextOutput(JSON.stringify([]))
          .setMimeType(ContentService.MimeType.JSON);
      }

      const headers = data[0];
      const allowedFields = [
        'ID_PCA', 'Descricao', 'Tipo', 'CategoriaAlimenticia',
        'ModalidadeAtendimento', 'PublicoEstimado', 'ValorEstimado',
        'PrazoInicio', 'PrazoFim', 'Status', 'UnidadeGestora',
        'CriadoEm', 'AtualizadoEm'
      ];
      const records = data.slice(1).map(function(row) {
        const record = {};
        allowedFields.forEach(function(field) {
          const index = headers.indexOf(field);
          if (index !== -1) record[field] = row[index];
        });
        return record;
      });
      return ContentService
        .createTextOutput(JSON.stringify(records))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
      Logger.log("Erro em serveColabData: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em serveColabData: " + error.message);
    throw error;
  }
}

/**
 * Retorna um instantâneo interno para a memória de gestão. Requer papel 'user'.
 *
 * @returns {{ success: boolean, count: number, syncedAt: string, message: string }}
 */
function getManagementSnapshot() {
  try {
    checkPermission('user');

    try {
      const config = getConfig();
      const db     = getDb();
      if (!db) {
        return { success: false, count: 0, syncedAt: '', message: 'Banco de dados indisponível.' };
      }

      const sheet = db.getSheetByName(config.SHEET_PCA);
      const count = (sheet && sheet.getLastRow() > 1) ? sheet.getLastRow() - 1 : 0;
      const syncedAt = Utilities.formatDate(new Date(), config.TIMEZONE, 'dd/MM/yyyy HH:mm');

      logAction(Session.getActiveUser().getEmail(), 'MANAGEMENT_SNAPSHOT', count + ' registros consolidados.');
      return {
        success:  true,
        count:    count,
        syncedAt: syncedAt,
        message:  count + ' registros disponíveis na memória de gestão.',
      };
    } catch (e) {
      logError('syncData', e.message, e.stack);
      return { success: false, count: 0, syncedAt: '', message: 'Erro ao consolidar os registros. Consulte os logs.' };
    }
  } catch (error) {
    Logger.log("Erro em getManagementSnapshot: " + error.message);
    throw error;
  }
}

/** Alias temporário para clientes da versão anterior. */
function syncData() {
  return getManagementSnapshot();
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
