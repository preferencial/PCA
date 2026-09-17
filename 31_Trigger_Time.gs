/**
 * @file 31_Trigger_Time.gs
 * @description Gatilho temporal de automação: monitora prazos do PCA.
 *   Pensado para ser executado diariamente por um time-driven trigger.
 *   Para instalar o gatilho, execute installTimeTrigger() uma vez.
 *
 *   Dependências (mesmo namespace GAS):
 *     - 04_Env_Config.gs  → getConfig(), getDb()
 *     - 25_Log_Action.gs  → logAction()
 *     - 26_Log_Error.gs   → logError()
 *
 * @author Antigravity (ag-kit)
 * @date 2026-05-31
 */

/** @const {number} Janela (em dias) para alertar sobre prazos próximos do fim. */
const DEADLINE_WARNING_DAYS = 7;

/**
 * Cria (ou recria) o gatilho temporal diário para onTimeTrigger.
 * Remove gatilhos duplicados da mesma função antes de criar um novo,
 * evitando execuções múltiplas. Execute manualmente uma única vez.
 *
 * @returns {{ success: boolean, message: string }}
 */
function installTimeTrigger() {
  try {
    ScriptApp.getProjectTriggers().forEach(function(t) {
      if (t.getHandlerFunction() === 'onTimeTrigger') {
        ScriptApp.deleteTrigger(t);
      }
    });

    ScriptApp.newTrigger('onTimeTrigger')
      .timeBased()
      .everyDays(1)
      .atHour(7)
      .create();

    return { success: true, message: 'Gatilho diário instalado (07h).' };
  } catch (e) {
    logError('installTimeTrigger', e.message, e.stack);
    return { success: false, message: 'Falha ao instalar o gatilho. Consulte os logs.' };
  }
}

/**
 * Rotina diária: varre os itens do PCA e contabiliza prazos vencidos e prazos
 * que vencem nos próximos DEADLINE_WARNING_DAYS dias, registrando um resumo
 * no log do sistema. Roda como trigger (sem usuário interativo), portanto não
 * chama checkPermission — a autorização é a do próprio projeto.
 *
 * @returns {{ vencidos: number, proximos: number }} Contagens apuradas.
 */
function onTimeTrigger() {
  try {
    try {
      try {
        const config = getConfig();
        const db     = getDb();
        if (!db) { logError('onTimeTrigger', 'Banco de dados indisponível.'); return { vencidos: 0, proximos: 0 }; }

        const sheet = db.getSheetByName(config.SHEET_PCA);
        if (!sheet || sheet.getLastRow() <= 1) {
          logAction('system', 'TRIGGER_TIME', 'Sem itens de PCA para avaliar.');
          return { vencidos: 0, proximos: 0 };
        }

        const data    = sheet.getDataRange().getValues();
        const headers = data[0];
        const idxFim  = headers.indexOf('PrazoFim');
        const idxStat = headers.indexOf('Status');
        if (idxFim === -1) {
          logError('onTimeTrigger', 'Coluna PrazoFim não encontrada em ' + config.SHEET_PCA);
          return { vencidos: 0, proximos: 0 };
        }

        const hoje      = _startOfDay(new Date());
        const limite    = new Date(hoje.getTime() + DEADLINE_WARNING_DAYS * 86400000);
        let   vencidos  = 0;
        let   proximos  = 0;

        data.slice(1).forEach(function(row) {
          const status = idxStat !== -1 ? String(row[idxStat] || '') : '';
          // Itens já concluídos não geram alerta de prazo.
          if (/conclu|arquiv|public|cancel/i.test(status)) return;

          const raw = row[idxFim];
          if (!raw) return;
          const fim = _startOfDay(new Date(raw));
          if (isNaN(fim.getTime())) return;

          if (fim < hoje)            vencidos++;
          else if (fim <= limite)    proximos++;
        });

        logAction(
          'system',
          'TRIGGER_TIME',
          'Prazos de gestão - vencidos: ' + vencidos + ' | a vencer (' + DEADLINE_WARNING_DAYS + 'd): ' + proximos
        );
        return { vencidos: vencidos, proximos: proximos };
      } catch (e) {
        logError('onTimeTrigger', e.message, e.stack);
        return { vencidos: 0, proximos: 0 };
      }
    } catch (error) {
      Logger.log("Erro em onTimeTrigger: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em onTimeTrigger: " + error.message);
    throw error;
  }
}

/**
 * @private Normaliza uma data para 00:00:00, permitindo comparação por dia.
 * @param {Date} d
 * @returns {Date}
 */
function _startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
