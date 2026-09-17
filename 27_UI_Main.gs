/**
 * @file 27_UI_Main.gs
 * @description Ponto de entrada doGet ÚNICO do web app. Faz dispatch entre a
 *   interface web HTML e o endpoint JSON de integração analítica protegida.
 *
 *   Apps Script só permite um doGet por projeto (namespace global compartilhado),
 *   por isso este é o único roteador. A lógica analítica vive em
 *   40_Colab_Sync.gs → serveColabData(e), invocada a partir daqui.
 *
 * @author Antigravity (ag-kit)
 * @date 2026-05-31
 */

/**
 * Ponto de entrada único do web app (HTTP GET).
 *
 * Dispatch por query string:
 *   - ?mode=analytics ou ?format=json → JSON minimizado, mediante token.
 *   - qualquer outra requisição       → interface web HTML.
 *
 * @param {GoogleAppsScript.Events.DoGet} e Parâmetros da requisição GET.
 * @returns {GoogleAppsScript.HTML.HtmlOutput|GoogleAppsScript.Content.TextOutput}
 */
function doGet(e) {
  // FLEET_FRAGMENT_BOOTSTRAP: o token fica no fragmento (#tok=), que não é
  // enviado ao servidor. O shell valida o token antes de chamar qualquer API.
  var fleetBootstrapPage = e && e.parameter && String(e.parameter.page || '') === 'app';
  var fleetBootstrapToken = e && e.parameter && e.parameter.tok;
  if (fleetBootstrapPage && !fleetBootstrapToken) {
    var fleetTemplates = ['Index', 'index', 'Dashboard'];
    for (var fleetI = 0; fleetI < fleetTemplates.length; fleetI++) {
      try {
        var fleetTemplate = HtmlService.createTemplateFromFile(fleetTemplates[fleetI]);
        fleetTemplate.authToken = '';
        fleetTemplate.tok = '';
        fleetTemplate.sessionUser = {};
        fleetTemplate.data = { scriptUrl: ScriptApp.getService().getUrl() };
        return fleetTemplate.evaluate()
          .setTitle('Preferencial - PCA')
          .addMetaTag('viewport', 'width=device-width, initial-scale=1');
      } catch (fleetTemplateError) {}
    }
    return HtmlService.createHtmlOutput('Aplicação indisponível.');
  }
  try {
    var params = e && e.parameter ? e.parameter : {};
    var tok = params.tok || '';

    if (params.mode === 'analytics' || params.mode === 'colab' || params.format === 'json') {
      return serveColabData(e);
    }

    if (params.page === 'login' || !isAuthenticatedByToken(tok)) {
      return HtmlService.createTemplateFromFile('Login').evaluate()
        .setTitle('Painel da Direção | Login')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    getDb();
    var template = HtmlService.createTemplateFromFile('Index');
    template.authToken = tok;
    template.sessionUser = getSessionUser(tok) || {};
    return template.evaluate()
      .setTitle('Painel da Direção | Escola Classe · CRE-PP')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  } catch (error) {
    Logger.log("Erro em doGet: " + error.message);
    throw error;
  }
}


// include() vive em 28_UI_Include.gs (definição única no projeto).

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
