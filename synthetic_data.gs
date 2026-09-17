/**
 * Dados sintéticos — Preferencial - PCA
 * Gerado em 2026-06-21 01:10:44 por generate_synthetic_data_all_projects.py
 *
 * Execute populateSyntheticData() PELO EDITOR do Apps Script para popular
 * as abas de domínio com ~30 registros cada (valida os gráficos do notebook).
 * Idempotente: limpa as linhas de dados antes de reinserir.
 *
 * NÃO define onOpen() — para não colidir com o menu real do projeto.
 */

function populateSyntheticData() {
  try {
    try {
      try {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var results = [];

        // PCA
        try {
          var sheet_PCA = ss.getSheetByName('PCA') || ss.insertSheet('PCA');
          if (sheet_PCA.getLastRow() > 1) {
            sheet_PCA.deleteRows(2, sheet_PCA.getLastRow() - 1);
          }
          var h_sheet_PCA = ["ID", "Descricao", "Competencia", "Impacto", "Custo", "DataInicio", "Status", "Prioridade"];
          sheet_PCA.getRange(1, 1, 1, h_sheet_PCA.length).setValues([h_sheet_PCA]);
          var d_sheet_PCA = [
            ["PCA-0001", "Dados coletados durante atividade", "alta", "baixa", 631, "2026-06-17 01:10:44", "ativo", 15],
            ["PCA-0002", "Observação inicial do processo", "alta", "alta", 794, "2026-04-27 01:10:44", "ativo", 16],
            ["PCA-0003", "Observação inicial do processo", "média", "alta", 475, "2026-06-01 01:10:44", "ativo", 12],
            ["PCA-0004", "Dados coletados durante atividade", "alta", "média", 600, "2026-05-29 01:10:44", "ativo", 9],
            ["PCA-0005", "Observação inicial do processo", "alta", "baixa", 800, "2026-05-23 01:10:44", "ativo", 15],
            ["PCA-0006", "Registro de sessão experimental", "média", "baixa", 956, "2026-06-13 01:10:44", "ativo", 15],
            ["PCA-0007", "Observação inicial do processo", "média", "média", 420, "2026-05-26 01:10:44", "ativo", 15],
            ["PCA-0008", "Registro de sessão experimental", "baixa", "baixa", 984, "2026-06-01 01:10:44", "ativo", 9],
            ["PCA-0009", "Acompanhamento de evolução", "baixa", "média", 279, "2026-04-26 01:10:44", "ativo", 8],
            ["PCA-0010", "Dados coletados durante atividade", "baixa", "baixa", 18, "2026-06-12 01:10:44", "ativo", 12],
            ["PCA-0011", "Acompanhamento de evolução", "alta", "baixa", 418, "2026-04-28 01:10:44", "ativo", 11],
            ["PCA-0012", "Acompanhamento de evolução", "média", "baixa", 105, "2026-05-30 01:10:44", "inativo", 15],
            ["PCA-0013", "Acompanhamento de evolução", "alta", "alta", 194, "2026-05-06 01:10:44", "ativo", 14],
            ["PCA-0014", "Acompanhamento de evolução", "alta", "média", 346, "2026-06-17 01:10:44", "ativo", 13],
            ["PCA-0015", "Acompanhamento de evolução", "alta", "baixa", 769, "2026-05-22 01:10:44", "ativo", 12],
            ["PCA-0016", "Acompanhamento de evolução", "alta", "baixa", 169, "2026-04-22 01:10:44", "inativo", 10],
            ["PCA-0017", "Dados coletados durante atividade", "média", "baixa", 42, "2026-05-14 01:10:44", "inativo", 8],
            ["PCA-0018", "Registro de sessão experimental", "média", "média", 228, "2026-06-18 01:10:44", "ativo", 8],
            ["PCA-0019", "Acompanhamento de evolução", "média", "média", 660, "2026-06-10 01:10:44", "ativo", 10],
            ["PCA-0020", "Observação inicial do processo", "média", "média", 93, "2026-06-02 01:10:44", "inativo", 14],
            ["PCA-0021", "Dados coletados durante atividade", "baixa", "média", 198, "2026-04-29 01:10:44", "ativo", 9],
            ["PCA-0022", "Acompanhamento de evolução", "média", "média", 178, "2026-06-09 01:10:44", "ativo", 14],
            ["PCA-0023", "Acompanhamento de evolução", "média", "baixa", 715, "2026-05-02 01:10:44", "ativo", 14],
            ["PCA-0024", "Registro de sessão experimental", "baixa", "baixa", 408, "2026-04-30 01:10:44", "ativo", 16],
            ["PCA-0025", "Dados coletados durante atividade", "alta", "baixa", 693, "2026-05-15 01:10:44", "ativo", 13],
            ["PCA-0026", "Registro de sessão experimental", "alta", "alta", 928, "2026-05-23 01:10:44", "ativo", 15],
            ["PCA-0027", "Registro de sessão experimental", "alta", "baixa", 426, "2026-06-05 01:10:44", "ativo", 15],
            ["PCA-0028", "Dados coletados durante atividade", "baixa", "média", 664, "2026-05-15 01:10:44", "ativo", 8],
            ["PCA-0029", "Dados coletados durante atividade", "baixa", "alta", 440, "2026-05-08 01:10:44", "ativo", 14],
            ["PCA-0030", "Dados coletados durante atividade", "média", "alta", 985, "2026-06-09 01:10:44", "ativo", 13]
          ];
          sheet_PCA.getRange(2, 1, d_sheet_PCA.length, h_sheet_PCA.length).setValues(d_sheet_PCA);
          results.push('OK PCA: ' + d_sheet_PCA.length + ' registros');
        } catch (e) {
          results.push('ERRO PCA: ' + e.message);
        }

        // Alternativas
        try {
          var sheet_Alternativas = ss.getSheetByName('Alternativas') || ss.insertSheet('Alternativas');
          if (sheet_Alternativas.getLastRow() > 1) {
            sheet_Alternativas.deleteRows(2, sheet_Alternativas.getLastRow() - 1);
          }
          var h_sheet_Alternativas = ["ID", "Nome", "Criterio", "Peso", "Pontuacao", "Ranking", "Status"];
          sheet_Alternativas.getRange(1, 1, 1, h_sheet_Alternativas.length).setValues([h_sheet_Alternativas]);
          var d_sheet_Alternativas = [
            ["ALT-0001", "Felipe Costa", 3, 6.5, 6.5, "A", "inativo"],
            ["ALT-0002", "Henrique Alves", 9, 7.1, 6.8, "D", "ativo"],
            ["ALT-0003", "Bruno Santos", 5, 7.3, 6.9, "B", "inativo"],
            ["ALT-0004", "Gabriela Rocha", 7, 9.2, 8.4, "D", "ativo"],
            ["ALT-0005", "Bruno Santos", 4, 9.0, 5.5, "A", "inativo"],
            ["ALT-0006", "Bruno Santos", 10, 8.7, 8.1, "A", "inativo"],
            ["ALT-0007", "Ana Silva", 7, 9.3, 6.1, "D", "inativo"],
            ["ALT-0008", "Bruno Santos", 6, 9.3, 9.8, "C", "inativo"],
            ["ALT-0009", "Gabriela Rocha", 9, 5.0, 6.9, "B", "ativo"],
            ["ALT-0010", "Eduarda Lima", 7, 6.5, 9.5, "D", "ativo"],
            ["ALT-0011", "Ana Silva", 9, 5.2, 5.1, "C", "ativo"],
            ["ALT-0012", "Felipe Costa", 5, 9.8, 10.0, "B", "inativo"],
            ["ALT-0013", "Diego Souza", 12, 8.2, 9.1, "D", "ativo"],
            ["ALT-0014", "Gabriela Rocha", 5, 7.0, 6.6, "B", "inativo"],
            ["ALT-0015", "Diego Souza", 4, 8.6, 5.6, "A", "inativo"],
            ["ALT-0016", "Eduarda Lima", 11, 5.8, 6.6, "A", "ativo"],
            ["ALT-0017", "Ana Silva", 9, 5.1, 8.9, "B", "ativo"],
            ["ALT-0018", "Bruno Santos", 12, 6.9, 8.7, "B", "inativo"],
            ["ALT-0019", "Felipe Costa", 5, 6.2, 9.5, "C", "ativo"],
            ["ALT-0020", "Diego Souza", 9, 8.9, 8.3, "C", "ativo"],
            ["ALT-0021", "Carla Oliveira", 3, 8.2, 7.9, "A", "ativo"],
            ["ALT-0022", "Henrique Alves", 12, 5.6, 5.7, "C", "ativo"],
            ["ALT-0023", "Bruno Santos", 4, 7.5, 6.8, "B", "inativo"],
            ["ALT-0024", "Bruno Santos", 10, 9.0, 7.1, "D", "ativo"],
            ["ALT-0025", "Diego Souza", 9, 6.9, 6.6, "D", "ativo"],
            ["ALT-0026", "Carla Oliveira", 7, 5.1, 5.9, "A", "ativo"],
            ["ALT-0027", "Felipe Costa", 8, 7.4, 8.1, "A", "ativo"],
            ["ALT-0028", "Eduarda Lima", 4, 6.0, 5.1, "A", "ativo"],
            ["ALT-0029", "Diego Souza", 8, 5.6, 6.1, "C", "ativo"],
            ["ALT-0030", "Diego Souza", 4, 8.6, 9.7, "C", "ativo"]
          ];
          sheet_Alternativas.getRange(2, 1, d_sheet_Alternativas.length, h_sheet_Alternativas.length).setValues(d_sheet_Alternativas);
          results.push('OK Alternativas: ' + d_sheet_Alternativas.length + ' registros');
        } catch (e) {
          results.push('ERRO Alternativas: ' + e.message);
        }

        // Legal
        try {
          var sheet_Legal = ss.getSheetByName('Legal') || ss.insertSheet('Legal');
          if (sheet_Legal.getLastRow() > 1) {
            sheet_Legal.deleteRows(2, sheet_Legal.getLastRow() - 1);
          }
          var h_sheet_Legal = ["ID", "TituloNorma", "Tipo", "Descricao", "DataPublicacao", "Status"];
          sheet_Legal.getRange(1, 1, 1, h_sheet_Legal.length).setValues([h_sheet_Legal]);
          var d_sheet_Legal = [
            ["LEG-0001", "Avaliação", "tipo_a", "Observação inicial do processo", "2026-05-30 01:10:44", "ativo"],
            ["LEG-0002", "Avaliação", "tipo_c", "Acompanhamento de evolução", "2026-05-25 01:10:44", "inativo"],
            ["LEG-0003", "Conceitos", "tipo_b", "Dados coletados durante atividade", "2026-06-09 01:10:44", "ativo"],
            ["LEG-0004", "Avaliação", "tipo_a", "Registro de sessão experimental", "2026-06-11 01:10:44", "ativo"],
            ["LEG-0005", "Avaliação", "tipo_b", "Acompanhamento de evolução", "2026-05-25 01:10:44", "ativo"],
            ["LEG-0006", "Prática", "tipo_c", "Observação inicial do processo", "2026-05-14 01:10:44", "inativo"],
            ["LEG-0007", "Avaliação", "tipo_a", "Registro de sessão experimental", "2026-05-29 01:10:44", "ativo"],
            ["LEG-0008", "Avaliação", "tipo_a", "Observação inicial do processo", "2026-05-20 01:10:44", "ativo"],
            ["LEG-0009", "Revisão", "tipo_b", "Registro de sessão experimental", "2026-05-14 01:10:44", "ativo"],
            ["LEG-0010", "Avaliação", "tipo_a", "Observação inicial do processo", "2026-06-10 01:10:44", "ativo"],
            ["LEG-0011", "Avaliação", "tipo_a", "Registro de sessão experimental", "2026-06-06 01:10:44", "ativo"],
            ["LEG-0012", "Conceitos", "tipo_c", "Registro de sessão experimental", "2026-05-29 01:10:44", "ativo"],
            ["LEG-0013", "Prática", "tipo_a", "Observação inicial do processo", "2026-06-01 01:10:44", "ativo"],
            ["LEG-0014", "Prática", "tipo_a", "Acompanhamento de evolução", "2026-05-16 01:10:44", "ativo"],
            ["LEG-0015", "Conceitos", "tipo_c", "Observação inicial do processo", "2026-05-28 01:10:44", "ativo"],
            ["LEG-0016", "Revisão", "tipo_a", "Dados coletados durante atividade", "2026-06-15 01:10:44", "ativo"],
            ["LEG-0017", "Revisão", "tipo_c", "Observação inicial do processo", "2026-05-16 01:10:44", "inativo"],
            ["LEG-0018", "Avaliação", "tipo_b", "Registro de sessão experimental", "2026-06-09 01:10:44", "ativo"],
            ["LEG-0019", "Introdução", "tipo_b", "Acompanhamento de evolução", "2026-06-19 01:10:44", "ativo"],
            ["LEG-0020", "Avaliação", "tipo_a", "Observação inicial do processo", "2026-05-24 01:10:44", "ativo"],
            ["LEG-0021", "Revisão", "tipo_b", "Acompanhamento de evolução", "2026-06-06 01:10:44", "ativo"],
            ["LEG-0022", "Prática", "tipo_a", "Observação inicial do processo", "2026-04-24 01:10:44", "inativo"],
            ["LEG-0023", "Prática", "tipo_a", "Acompanhamento de evolução", "2026-06-19 01:10:44", "ativo"],
            ["LEG-0024", "Prática", "tipo_c", "Observação inicial do processo", "2026-06-17 01:10:44", "inativo"],
            ["LEG-0025", "Introdução", "tipo_b", "Registro de sessão experimental", "2026-06-04 01:10:44", "ativo"],
            ["LEG-0026", "Prática", "tipo_b", "Observação inicial do processo", "2026-05-17 01:10:44", "ativo"],
            ["LEG-0027", "Avaliação", "tipo_c", "Observação inicial do processo", "2026-05-27 01:10:44", "ativo"],
            ["LEG-0028", "Avaliação", "tipo_b", "Observação inicial do processo", "2026-04-29 01:10:44", "ativo"],
            ["LEG-0029", "Revisão", "tipo_a", "Observação inicial do processo", "2026-06-07 01:10:44", "ativo"],
            ["LEG-0030", "Introdução", "tipo_a", "Observação inicial do processo", "2026-06-01 01:10:44", "inativo"]
          ];
          sheet_Legal.getRange(2, 1, d_sheet_Legal.length, h_sheet_Legal.length).setValues(d_sheet_Legal);
          results.push('OK Legal: ' + d_sheet_Legal.length + ' registros');
        } catch (e) {
          results.push('ERRO Legal: ' + e.message);
        }

        Logger.log(results.join('\n'));
        return results;
      } catch (error) {
        Logger.log("Erro em populateSyntheticData: " + error.message);
        throw error; // Re-lança para tratamento superior
      }
    } catch (error) {
      Logger.log("Erro em populateSyntheticData: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em populateSyntheticData: " + error.message);
    throw error;
  }
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
