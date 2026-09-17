/**
 * @file 25_Log_Action.gs
 * @description Registra atividades dos usuários para auditoria.
 * @author Antigravity (ag-kit)
 * @date 2026-04-28
 */

/**
 * Registra uma ação de usuário para auditoria.
 * A gravação ocorre em lote (setValues) em vez de appendRow.
 *
 * @param {string} userId  ID do usuário que executou a ação.
 * @param {string} action  Código da ação auditada (ex: 'PCA_CREATED').
 * @param {string} [details] Detalhes adicionais sobre a ação.
 * @returns {void}
 */
function logAction(userId, action, details) {
  try {
    const config = getConfig();
    const db     = getDb();
    if (!db) return;

    const sheet = db.getSheetByName(config.SHEET_LOG);
    if (!sheet) return;

    const now = new Date();
    const row = [now, userId, action, details || '', 'N/A'];

    try {
      const lock = LockService.getScriptLock();
      if (!lock.tryLock(10000)) throw new Error('Nao foi possivel obter lock para logAction.');
      try {
        sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
      } finally {
        lock.releaseLock();
      }
    } catch (e) {
      logError('logAction', e.message, e.stack);
    }
  } catch (error) {
    Logger.log("Erro em logAction: " + error.message);
    throw error;
  }
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
