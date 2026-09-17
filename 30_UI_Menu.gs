/**
 * @file 30_UI_Menu.gs
 * @description Menu customizado na barra do Google Sheets (trigger onOpen).
 *
 *   Dependências (mesmo namespace GAS):
 *     - 04_Env_Config.gs  → setupDatabase()
 *     - 38_Drive_API.gs   → generatePCAFormalizationDocument()
 *     - 26_Log_Error.gs   → logError()
 *
 * @author Antigravity (ag-kit)
 * @date 2026-05-31
 */

/**
 * Trigger simples disparado ao abrir a planilha. Monta o menu da direção.
 */
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('Painel da Direção')
      .addItem('Abrir Dashboard', 'abrirDashboard')
      .addSeparator()
      .addItem('Inicializar / Reparar Banco', 'menuSetupDatabase')
      .addItem('Gerar Memória de Gestão', 'menuGerarDocumento')
      .addToUi();
  } catch (error) {
    Logger.log("Erro em onOpen: " + error.message);
    throw error;
  }
}

/**
 * Abre o dashboard da aplicação em um diálogo modal.
 */
function abrirDashboard() {
  try {
    const html = HtmlService.createTemplateFromFile('Index').evaluate()
      .setWidth(1200)
      .setHeight(700);
    SpreadsheetApp.getUi().showModalDialog(html, 'Painel da Direção · Escola Classe');
  } catch (error) {
    Logger.log("Erro em abrirDashboard: " + error.message);
    throw error;
  }
}

/**
 * Item de menu: cria/repara as abas do banco de dados e reporta o resultado.
 */
function menuSetupDatabase() {
  try {
    const ui = SpreadsheetApp.getUi();
    try {
      const result = setupDatabase();
      ui.alert('Banco de dados pronto', 'Planilha: ' + result.url, ui.ButtonSet.OK);
    } catch (e) {
      logError('menuSetupDatabase', e.message, e.stack);
      ui.alert('Erro', 'Não foi possível inicializar o banco. Consulte os logs.', ui.ButtonSet.OK);
    }
  } catch (error) {
    Logger.log("Erro em menuSetupDatabase: " + error.message);
    throw error;
  }
}

/**
 * Item de menu: gera a memória consolidada de gestão e mostra o link.
 */
function menuGerarDocumento() {
  const ui = SpreadsheetApp.getUi();
  try {
    const result = generatePCAFormalizationDocument();
    if (result && result.success) {
      ui.alert('Documento gerado', result.message + '\n\n' + (result.url || ''), ui.ButtonSet.OK);
    } else {
      ui.alert('Atenção', (result && result.message) || 'Falha desconhecida.', ui.ButtonSet.OK);
    }
  } catch (e) {
    logError('menuGerarDocumento', e.message, e.stack);
    ui.alert('Erro', 'Falha ao gerar o documento. Consulte os logs.', ui.ButtonSet.OK);
  }
}

/**
 * Item técnico: informa a URL-base da integração analítica protegida.
 * A chave nunca é exibida na interface.
 */
function menuMostrarEndpointColab() {
  const ui  = SpreadsheetApp.getUi();
  const url = ScriptApp.getService().getUrl();
  if (url) {
    ui.alert('Integração analítica', 'URL-base protegida:\n\n' + url + '?mode=analytics&token=CHAVE_CONFIGURADA', ui.ButtonSet.OK);
  } else {
    ui.alert('Integração analítica',
      'O web app ainda não foi publicado. Faça o deploy em Implantar → Nova implantação.',
      ui.ButtonSet.OK);
  }
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
