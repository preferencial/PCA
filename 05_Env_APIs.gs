/**
 * @file 05_Env_APIs.gs
 * @description Configuração de chaves e endpoints de APIs externas.
 *   Os valores NÃO são armazenados em código-fonte: ficam em Script Properties,
 *   acessíveis apenas pelo projeto Apps Script. Isso evita vazar credenciais
 *   em commits/clasp e permite alterá-las sem novo deploy.
 *
 *   Dependências (mesmo namespace GAS):
 *     - 03_Auth_Check.gs  → checkPermission()
 *     - 25_Log_Action.gs  → logAction()
 *     - 26_Log_Error.gs   → logError()
 *
 * @author Antigravity (ag-kit)
 * @date 2026-05-31
 */

// ─────────────────────────────────────────────────────────────────────────────
// Chaves de Script Properties consumidas por este módulo
// ─────────────────────────────────────────────────────────────────────────────

/** @const {Object.<string,string>} Nomes das Script Properties de integração. */
const API_PROP_KEYS = {
  GOOGLE_DRIVE_FOLDER_ID: 'API_GOOGLE_DRIVE_FOLDER_ID',
  GOOGLE_CALENDAR_ID:     'API_GOOGLE_CALENDAR_ID',
  API_KEY:                'API_EXTERNAL_KEY',
  ENDPOINT_EXTERNO:       'API_EXTERNAL_ENDPOINT',
};

/**
 * Retorna as configurações de APIs externas lidas das Script Properties.
 *
 * Campos não configurados retornam string vazia, de modo que o chamador possa
 * checar com `if (!cfg.GOOGLE_CALENDAR_ID) { ... }` sem risco de `undefined`.
 *
 * @returns {{ GOOGLE_DRIVE_FOLDER_ID: string, GOOGLE_CALENDAR_ID: string,
 *             API_KEY: string, ENDPOINT_EXTERNO: string }}
 */
function getAPIsConfig() {
  try {
    const props = PropertiesService.getScriptProperties();
    const read  = function(key) { return props.getProperty(key) || ''; };

    return {
      GOOGLE_DRIVE_FOLDER_ID: read(API_PROP_KEYS.GOOGLE_DRIVE_FOLDER_ID),
      GOOGLE_CALENDAR_ID:     read(API_PROP_KEYS.GOOGLE_CALENDAR_ID),
      API_KEY:                read(API_PROP_KEYS.API_KEY),
      ENDPOINT_EXTERNO:       read(API_PROP_KEYS.ENDPOINT_EXTERNO),
    };
  } catch (error) {
    Logger.log("Erro em getAPIsConfig: " + error.message);
    throw error;
  }
}

/**
 * Persiste configurações de APIs externas nas Script Properties.
 * Apenas as chaves presentes em `values` são alteradas (merge parcial);
 * passar string vazia limpa explicitamente o valor. Requer papel 'admin'.
 *
 * @param {Object} values Objeto com qualquer subconjunto de:
 *   GOOGLE_DRIVE_FOLDER_ID, GOOGLE_CALENDAR_ID, API_KEY, ENDPOINT_EXTERNO.
 * @returns {{ success: boolean, message: string }}
 */
function setAPIsConfig(values) {
  try {
    checkPermission('admin');

    if (!values || typeof values !== 'object') {
      return { success: false, message: 'Parâmetro inválido: objeto de configurações esperado.' };
    }

    try {
      const props   = PropertiesService.getScriptProperties();
      const applied = [];

      Object.keys(API_PROP_KEYS).forEach(function(field) {
        if (Object.prototype.hasOwnProperty.call(values, field)) {
          props.setProperty(API_PROP_KEYS[field], String(values[field] || ''));
          applied.push(field);
        }
      });

      if (!applied.length) {
        return { success: false, message: 'Nenhuma chave reconhecida foi informada.' };
      }

      logAction(Session.getActiveUser().getEmail(), 'API_CONFIG_UPDATED', applied.join(', '));
      return { success: true, message: 'Configurações salvas: ' + applied.join(', ') + '.' };
    } catch (e) {
      logError('setAPIsConfig', e.message, e.stack);
      return { success: false, message: 'Erro ao salvar configurações. Consulte os logs.' };
    }
  } catch (error) {
    Logger.log("Erro em setAPIsConfig: " + error.message);
    throw error;
  }
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
