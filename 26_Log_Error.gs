/**
 * @file 26_Log_Error.gs
 * @description Captura e armazena erros de execução do sistema.
 * @author Antigravity (ag-kit)
 * @date 2026-04-28
 */

/**
 * Registra um erro de sistema na aba de logs.
 *
 * Usa `getDb()` + `config.SHEET_LOG` para consistência com os demais módulos.
 * Em caso de falha da própria gravação, recorre a `Logger.log` para não mascarar
 * o erro original — `logError` nunca deve lançar exceções.
 *
 * Formato da linha inserida (compatível com SHEET_LOG):
 *   [Timestamp, 'ERROR', context, message + '\n' + stack, 'N/A']
 *
 * @param {string}  context Contexto do erro (ex: nome da função).
 * @param {string}  message Mensagem do erro.
 * @param {string}  [stack] Stacktrace ou detalhes adicionais.
 * @returns {void}
 */
function logError(context, message, stack) {
  try {
    const config = getConfig();
    const db     = getDb();
    if (!db) {
      LoggerService.error('[logError] DB indisponível. Contexto: ' + context + ' | ' + message);
      return;
    }

    const sheet = db.getSheetByName(config.SHEET_LOG);
    if (!sheet) {
      LoggerService.error('[logError] Aba de log não encontrada. Contexto: ' + context + ' | ' + message);
      return;
    }

    try {
      const row    = [new Date(), 'ERROR', context, message + (stack ? '\n' + stack : ''), 'N/A'];
      const target = sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length);
      target.setValues([row]);
    } catch (e) {
      // logError cannot call itself recursively. lint-disable: L007
      LoggerService.error('[logError] Falha ao gravar erro. Original: ' + context + ' | ' + message);
      LoggerService.error('[logError] Falha de gravação: ' + e.message);
    }
  } catch (error) {
    Logger.log("Erro em logError: " + error.message);
    throw error;
  }
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
