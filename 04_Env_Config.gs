/**
 * @file 04_Env_Config.gs
 * @description Configurações globais, IDs de planilhas e auto-setup do banco de dados.
 * @author Antigravity (ag-kit)
 * @date 2026-04-28
 */

/**
 * Retorna configurações globais do sistema.
 * @returns {Object}
 */
function getConfig() {
  return {
    DATABASE_NAME: 'Painel_Direcao_Escola_Classe_CRE_PP',
    SHEET_PCA: 'PCA_Itens',
    SHEET_LEGAL: 'Referencias_Legais',
    SHEET_USER: 'Usuarios',
    SHEET_LOG: 'Logs_Sistema',
    TIMEZONE: Session.getScriptTimeZone(),
    VERSION: '2.0.0'
  };
}

/**
 * Inicializa o banco de dados no Google Sheets se não existir.
 * Cria abas e cabeçalhos necessários.
 */
function setupDatabase() {
  try {
    try {
      try {
        var config = getConfig();
        var ss;
  
        // Tenta encontrar a planilha pelo nome no Drive
        var files = DriveApp.getFilesByName(config.DATABASE_NAME);
        if (files.hasNext()) {
          ss = SpreadsheetApp.open(files.next());
        } else {
          ss = SpreadsheetApp.create(config.DATABASE_NAME);
          LoggerService.info('Planilha criada: ' + ss.getUrl());
        }
  
        // Salva o ID na propriedade do script para acesso rápido
        PropertiesService.getScriptProperties().setProperty('DATABASE_ID', ss.getId());
  
        var sheetsToCreate = [
          { name: config.SHEET_USER, headers: ['ID', 'Username', 'Password', 'Role', 'Nome', 'Email', 'CriadoEm'] },
          { name: config.SHEET_PCA, headers: ['ID_PCA', 'Descricao', 'Tipo', 'CategoriaAlimenticia', 'ModalidadeAtendimento', 'PublicoEstimado', 'ValorEstimado', 'PrazoInicio', 'PrazoFim', 'Status', 'UnidadeGestora', 'Responsavel_ID', 'Obs', 'Legal_IDs', 'CriadoEm', 'AtualizadoEm'] },
          { name: config.SHEET_LEGAL, headers: ['ID_Ref', 'Titulo', 'Tipo', 'Numero', 'Ano', 'Link', 'Descricao', 'CriadoEm'] },
          { name: config.SHEET_LOG, headers: ['Timestamp', 'Usuario_ID', 'Acao', 'Detalhes', 'IP'] }
        ];
  
        sheetsToCreate.forEach(function(s) {
          var sheet = ss.getSheetByName(s.name);
          if (!sheet) {
            sheet = ss.insertSheet(s.name);
            sheet.getRange(1, 1, 1, s.headers.length).setValues([s.headers])
                 .setFontWeight('bold')
                 .setBackground('#f3f3f3');
            sheet.setFrozenRows(1);
          }
        });
  
        return { success: true, url: ss.getUrl(), id: ss.getId() };
      } catch (error) {
        Logger.log("Erro em setupDatabase: " + error.message);
        throw error; // Re-lança para tratamento superior
      }
    } catch (error) {
      Logger.log("Erro em setupDatabase: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em setupDatabase: " + error.message);
    throw error;
  }
}

/**
 * Atalho para obter a planilha ativa do banco de dados.
 */
function getDb() {
  try {
    try {
      var id = PropertiesService.getScriptProperties().getProperty('DATABASE_ID');
      if (id) {
        try {
          return SpreadsheetApp.openById(id);
        } catch (e) {
          // Logger.log is used intentionally: logError() calls getDb(), so calling it
          // here would create infinite recursion. Run setupDatabase() as fallback.
          LoggerService.error('[getDb] openById falhou: ' + e.message + '. Executando setupDatabase().');
          const result = setupDatabase();
          const newId  = PropertiesService.getScriptProperties().getProperty('DATABASE_ID');
          return newId ? SpreadsheetApp.openById(newId) : null;
        }
      }
      const result = setupDatabase();
      const newId  = PropertiesService.getScriptProperties().getProperty('DATABASE_ID');
      return newId ? SpreadsheetApp.openById(newId) : null;
    } catch (error) {
      Logger.log("Erro em getDb: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em getDb: " + error.message);
    throw error;
  }
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
