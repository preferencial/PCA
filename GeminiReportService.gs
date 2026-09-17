/**
 * COMPONENTE: GeminiReportService.gs
 * PAPEL: Relatório pedagógico generativo via Google Gemini.
 *
 * Contrato de uso (frontend, google.script.run):
 *   - generateAiReport()        → relatório do panorama atual (tela inicial).
 *   - generateAiReport(payload) → relatório aprofundado; payload pode trazer
 *                                  { summary, foco, turma, groupSize, periodo } vindos do clique.
 *
 * FONTE DE DADOS: getSchoolRealityAnalyticsSummary() (componente compartilhado
 * SchoolRealityAnalyticsService.gs, presente em toda a frota).
 *
 * RESILIÊNCIA (padrão da frota): retry + backoff exponencial em falhas
 * transitórias (HTTP 429/500/503 e exceções de rede). Sem GEMINI_API_KEY,
 * ou em erro permanente da API, degrada para um relatório local estruturado.
 *
 * AMBIENTE: propriedade de script GEMINI_API_KEY.
 */

var GeminiReportService = (function () {
  // FROTA-07: modelo lido da property do script, nunca hardcoded; cai no padrão local.
  function model_() {
    try {
      return PropertiesService.getScriptProperties().getProperty('GEMINI_MODEL') || 'gemini-2.0-flash';
    } catch (e) {
      return 'gemini-2.0-flash';
    }
  }
  var BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';
  var PROJECT = 'Preferencial - PCA';
  var DOMAIN = 'memória de gestão das demandas e decisões da direção escolar';
  var INSTRUCTION = 'Resuma o histórico, proponha critérios transparentes de agrupamento e priorização e preserve os limites de competência institucional. Este backend organiza registros administrativos; não executa PCA nem descobre fatores latentes.';
  var ANALYTICS_BOUNDARY = 'Use apenas descrições de dados observados e agrupamentos administrativos. IMPORTANTE SOBRE COMPONENTES PCA: Se houver componentes principais (PC1, PC2, etc.), NUNCA os nomeie ou rotule diretamente. Em vez disso, liste as 3-5 variáveis com maiores cargas absolutas em cada componente e proponha que "o Conselho Escolar debata e nomeie este eixo após analisar as variáveis que o compõem". Nomes como "fator de infraestrutura" ou "dimensão socioemocional" são interpretações humanas, não descobertas objetivas do algoritmo. Não trate projeções, agrupamentos ou combinações lineares como fatores latentes automaticamente descobertos e não infira causalidade a partir de padrões ou relações estruturais.';

  function apiKey_() {
    try { return PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY'); }
    catch (e) { return null; }
  }

  function isConfigured() { return !!apiKey_(); }

  function gatherSummary_() {
    try {
      if (typeof getSchoolRealityAnalyticsSummary === 'function') {
        return getSchoolRealityAnalyticsSummary({ record: false });
      }
    } catch (e) {}
    return { projectName: PROJECT, focus: DOMAIN, analyses: [] };
  }

  function analysesText_(summary) {
    var rows = (summary && summary.analyses) || [];
    if (!rows.length) return '(sem leituras registradas ainda)';
    return rows.map(function (a) {
      var val = (a.value === undefined || a.value === '') ? '—' : a.value;
      var unit = a.unit ? (' ' + a.unit) : '';
      var dim = a.dimension ? (' [' + a.dimension + ']') : '';
      var narr = a.narrative ? (' — ' + a.narrative) : '';
      return '- ' + (a.label || a.key) + ': ' + val + unit + dim + narr;
    }).join('\n');
  }

  function buildPrompt_(summary, payload) {
    try {
      if (payload && payload.turma) {
        PromptContextBuilder.assertMinimumGroup(payload.groupSize, 'report.analytics');
      }
      // FROTA-02: monta contexto com lista positiva — sem nomes, e-mails ou IDs pessoais.
      var built = PromptContextBuilder.build('report.analytics', {
        projectName: PROJECT,
        focus:   (payload && payload.foco) || (summary && summary.focus) || DOMAIN,
        escopo:  (payload && payload.turma) ? ('Turma/recorte: ' + payload.turma + '.') : 'Recorte: visão geral da escola.',
        groupSize: payload && payload.groupSize,
        analyses: (summary && summary.analyses) || []
      });
      PromptContextBuilder.logAudit('report.analytics', built.droppedKeys);
      var ctx = built.context;

      return [
        'Você é um analista pedagógico da Escola Classe 115 Norte (SEEDF, Brasília-DF).',
        'Projeto: ' + PROJECT + '. Domínio: ' + DOMAIN + '.',
        ctx.escopo,
        'Foco da análise: ' + (ctx.focus || DOMAIN) + '.',
        '',
        'Leituras (indicadores de realidade escolar):',
        analysesText_({ analyses: ctx.analyses }),
        '',
        INSTRUCTION,
        ANALYTICS_BOUNDARY,
        '',
        'Produza um relatório em português do Brasil, objetivo e acionável, com as seções:',
        '1. Panorama (2–3 frases).',
        '2. Destaques positivos.',
        '3. Pontos de atenção.',
        '4. Recomendações práticas para o professor/gestor (até 5 itens).',
        'Não invente números; use apenas os dados fornecidos.'
      ].join('\n');
    } catch (error) {
      Logger.log("Erro em buildPrompt_: " + error.message);
      throw error;
    }
  }

  function fetchGeminiReport_(url, options) {
    var opts = {};
    for (var k in options) { if (Object.prototype.hasOwnProperty.call(options, k)) opts[k] = options[k]; }
    opts.muteHttpExceptions = true;

    var MAX = 3;
    var waitMs = 700;
    for (var attempt = 1; attempt <= MAX; attempt++) {
      var resp;
      try {
        resp = UrlFetchApp.fetch(url, opts);
      } catch (e) {
        if (attempt >= MAX) throw e;
        Utilities.sleep(waitMs); waitMs *= 2; continue;
      }
      var code = resp.getResponseCode();
      var transient = (code === 429 || code === 500 || code === 503);
      if (transient && attempt < MAX) { Utilities.sleep(waitMs); waitMs *= 2; continue; }
      if (code >= 400) throw new Error('Gemini HTTP ' + code + ': ' + resp.getContentText().slice(0, 300));
      return resp;
    }
  }

  function callGemini_(prompt) {
    try {
    // FROTA-05: rate limit, dedup e quota antes de chamar o provedor
    var _rl05 = AiRateLimitService.check('pcaReport', prompt);
    if (_rl05.dedupHit) return _rl05.cached;
      var key = apiKey_();
      var url = BASE_URL + model_() + ':generateContent?key=' + encodeURIComponent(key);
      var options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(PromptContextBuilder.buildGeminiPayload(prompt, {
          temperature: 0.4,
          maxOutputTokens: 1200
        }))
      };
      var resp = fetchGeminiReport_(url, options);
      var data = JSON.parse(resp.getContentText());
      var text = data && data.candidates && data.candidates[0] &&
        data.candidates[0].content && data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
      if (!text) throw new Error('Resposta vazia do Gemini.');
      return String(text).trim();
    } catch (error) {
      Logger.log("Erro em callGemini_: " + error.message);
      throw error;
    }
  }

  function fallback_(summary) {
    var head = 'Relatório local (' + PROJECT + ') — IA indisponível (configure GEMINI_API_KEY para a versão completa).';
    return head + '\n\nPanorama — foco: ' + DOMAIN + '.\n\nLeituras:\n' + analysesText_(summary) +
      '\n\nRecomendações gerais:\n' +
      '- Revisar os indicadores em destaque com a turma.\n' +
      '- Priorizar os pontos de atenção com maior impacto no engajamento.\n' +
      '- Registrar novas observações para enriquecer a próxima análise.';
  }

  function demandValue_(row, keys) {
    for (var i = 0; i < keys.length; i++) {
      if (row && row[keys[i]] !== undefined && row[keys[i]] !== '') return row[keys[i]];
    }
    return '';
  }

  function gatherDemands_() {
    try {
      var result = typeof getPCAList === 'function' ? getPCAList() : [];
      var rows = Array.isArray(result) ? result : (result && result.data) || [];
      return rows.slice(0, 120).map(function (row) {
        return {
          id: demandValue_(row, ['ID', 'Id', 'id']),
          descricao: demandValue_(row, ['Descricao', 'Descrição', 'descricao', 'Titulo']),
          tipo: demandValue_(row, ['Tipo', 'tipo', 'Natureza']),
          status: demandValue_(row, ['Status', 'status']),
          valorEstimado: Number(demandValue_(row, ['ValorEstimado', 'valorEstimado', 'Valor'])) || 0,
          unidadeGestora: demandValue_(row, ['UnidadeGestora', 'unidadeGestora']),
          observacoes: String(demandValue_(row, ['Observacoes', 'Observações', 'observacoes']) || '').slice(0, 500),
          criadoEm: demandValue_(row, ['CreatedAt', 'DataCriacao', 'Data'])
        };
      });
    } catch (error) {
      Logger.log("Erro em gatherDemands_: " + error.message);
      throw error;
    }
  }

  function managementPrompt_(demands, payload) {
    try {
      try {
        // FROTA-02: sanitiza cada demanda antes de compor o prompt.
        var safeDemands = demands.map(function (d) {
          return PromptContextBuilder.sanitizeDemand(d);
        });
        PromptContextBuilder.logAudit('report.management', []);

        return [
          'Você apoia a direção de uma Escola Classe vinculada à CRE-PP/SEEDF.',
          'Sua função é organizar memória de gestão, não tomar decisões administrativas.',
          'Demandas registradas: ' + JSON.stringify(safeDemands),
          payload && payload.foco ? ('Foco solicitado: ' + PromptContextBuilder.stripPii(String(payload.foco).slice(0, 300))) : '',
          '',
          'Responda SOMENTE com JSON válido, sem markdown, no formato:',
          '{"historicoResumo":"texto","grupos":[{"nome":"texto","justificativa":"texto","quantidade":0}],',
          '"criteriosPriorizacao":[{"criterio":"texto","comoAplicar":"texto","ressalva":"texto"}],',
          '"direcaoPodeDeliberar":["item"],"exigeColegiado":["item"],',
          '"dependeCrePpOuSedf":["item"],"lacunasDeRegistro":["item"],',
          '"proximosPassos":["item"],"aviso":"texto"}',
          '',
          'Regras: não invente fatos, prazos, normas ou competências. Não atribua pontuação',
          'definitiva e não escolha demandas vencedoras. Diferencie: discricionariedade',
          'responsável da direção; matérias sujeitas a Conselho Escolar ou outro colegiado;',
          'e providências que dependem de autorização, recurso ou manifestação da CRE-PP,',
          'SEEDF ou outra instância externa. Quando não for possível classificar, marque',
          'como lacuna a validar. Critérios sugeridos podem considerar urgência, impacto',
          'sobre estudantes, risco, obrigação normativa, continuidade do serviço,',
          'viabilidade, custo e equidade, mas precisam de validação humana.'
        ].join('\n');
      } catch (error) {
        Logger.log("Erro em managementPrompt_: " + error.message);
        throw error;
      }
    } catch (error) {
      Logger.log("Erro em managementPrompt_: " + error.message);
      throw error;
    }
  }

  function parseJson_(text) {
    try {
      try {
        return JSON.parse(String(text || '').trim()
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/, ''));
      } catch (error) {
        Logger.log("Erro em parseJson_: " + error.message);
        throw error;
      }
    } catch (error) {
      Logger.log("Erro em parseJson_: " + error.message);
      throw error;
    }
  }

  function normalizeMemory_(data, demands, source) {
    try {
      data = data && typeof data === 'object' ? data : {};
      return {
        success: true,
        source: source,
        generatedAt: new Date(),
        demandCount: demands.length,
        historicoResumo: String(data.historicoResumo || 'Há ' + demands.length + ' demanda(s) registrada(s) para revisão da direção.'),
        grupos: Array.isArray(data.grupos) ? data.grupos.slice(0, 8) : [],
        criteriosPriorizacao: Array.isArray(data.criteriosPriorizacao) ? data.criteriosPriorizacao.slice(0, 8) : [],
        direcaoPodeDeliberar: Array.isArray(data.direcaoPodeDeliberar) ? data.direcaoPodeDeliberar.slice(0, 8) : [],
        exigeColegiado: Array.isArray(data.exigeColegiado) ? data.exigeColegiado.slice(0, 8) : [],
        dependeCrePpOuSedf: Array.isArray(data.dependeCrePpOuSedf) ? data.dependeCrePpOuSedf.slice(0, 8) : [],
        lacunasDeRegistro: Array.isArray(data.lacunasDeRegistro) ? data.lacunasDeRegistro.slice(0, 8) : [],
        proximosPassos: Array.isArray(data.proximosPassos) ? data.proximosPassos.slice(0, 8) : [],
        aviso: 'A IA organiza registros e sugere critérios. A decisão permanece com a direção, o colegiado ou a instância competente.'
      };
    } catch (error) {
      Logger.log("Erro em normalizeMemory_: " + error.message);
      throw error;
    }
  }

  function localMemory_(demands) {
    try {
      var statusCounts = {};
      demands.forEach(function (item) {
        var status = item.status || 'Sem status';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      var groups = Object.keys(statusCounts).map(function (status) {
        return { nome: status, justificativa: 'Agrupamento pelo estado atual do registro.', quantidade: statusCounts[status] };
      });
      return normalizeMemory_({
        historicoResumo: 'A memória local consolidou ' + demands.length + ' demanda(s) pelos estados registrados.',
        grupos: groups,
        criteriosPriorizacao: [
          { criterio: 'Urgência e risco', comoAplicar: 'Registrar consequência e prazo verificável.', ressalva: 'Não substitui avaliação técnica.' },
          { criterio: 'Impacto e equidade', comoAplicar: 'Identificar estudantes e serviços afetados.', ressalva: 'Evitar priorização apenas por pressão pontual.' },
          { criterio: 'Competência e viabilidade', comoAplicar: 'Separar ação interna, colegiada e externa.', ressalva: 'Confirmar atribuições antes de encaminhar.' }
        ],
        lacunasDeRegistro: ['Revisar demandas sem motivação, evidência, responsável ou prazo.'],
        proximosPassos: ['Validar os agrupamentos em reunião de gestão.', 'Registrar a instância competente para cada demanda.']
      }, demands, 'fallback');
    } catch (error) {
      Logger.log("Erro em localMemory_: " + error.message);
      throw error;
    }
  }

  function generateManagementMemory(payload) {
    try {
      if (typeof checkPermission === 'function') checkPermission('admin');
      var demands = gatherDemands_();
      if (!isConfigured()) return localMemory_(demands);
      try {
        return normalizeMemory_(parseJson_(callGemini_(managementPrompt_(demands, payload || {}))), demands, 'gemini');
      } catch (e) {
        var fallback = localMemory_(demands);
        fallback.error = String((e && e.message) || e);
        return fallback;
      }
    } catch (error) {
      Logger.log("Erro em generateManagementMemory: " + error.message);
      throw error;
    }
  }

  // ─── Proposta #50 — Minuta de despacho fundamentada nos registros ──────────

  /**
   * Monta o prompt de minuta de despacho + relatório de acompanhamento.
   */
  function dispatchPrompt_(demands, payload) {
    try {
      try {
        // FROTA-02: sanitiza campos do payload e cada demanda antes de compor o prompt.
        var assunto     = PromptContextBuilder.stripPii(payload && payload.assunto
          ? String(payload.assunto).slice(0, 400)
          : '(não especificado — analise o conjunto das demandas)');
        var contexto    = PromptContextBuilder.stripPii(payload && payload.contexto
          ? String(payload.contexto).slice(0, 400)
          : 'Escola Classe 115 Norte vinculada à CRE-PP/SEEDF, Brasília-DF.');
        var responsavel = PromptContextBuilder.stripPii(payload && payload.responsavel
          ? String(payload.responsavel).slice(0, 200)
          : '(não informado)');
        var data        = payload && payload.data ? String(payload.data) : new Date().toLocaleDateString('pt-BR');
        var safeDemands = demands.map(function (d) {
          return PromptContextBuilder.sanitizeDemand(d);
        });
        PromptContextBuilder.logAudit('report.dispatch', []);

        return [
          'Você apoia a direção de uma Escola Classe vinculada à CRE-PP/SEEDF.',
          'Seu papel é redigir minutas de despacho e relatórios de acompanhamento fundamentados nos registros.',
          'Você NÃO delibera, NÃO encaminha e NÃO decide: produz texto para revisão e assinatura da autoridade competente.',
          '',
          'Contexto institucional: ' + contexto,
          'Responsável / Autoridade: ' + responsavel + '. Data de referência: ' + data + '.',
          'Assunto do despacho: ' + assunto,
          '',
          'Demandas registradas (PCA): ' + JSON.stringify(safeDemands),
          '',
          'Responda SOMENTE com JSON válido, sem markdown, no seguinte formato:',
          '{',
          '  "minutaDespacho": "texto",',
          '  "relatorioAcompanhamento": [{"demandaId":"","descricao":"","status":"","providenciaSugerida":"","instanciaCompetente":"","observacao":""}],',
          '  "premissas": ["item"],',
          '  "aviso": "texto"',
          '}',
          '',
          'Regras de redação:',
          '- minutaDespacho: texto formal de despacho (máx. 300 palavras), com cabeçalho (Data, Para/Destinatário, Assunto), corpo fundamentado',
          '  exclusivamente nos registros fornecidos, e rodapé com espaço para assinatura. Use linguagem da SEEDF.',
          '  Não invente normas, prazos ou fatos além dos dados. Deixe lacunas explícitas onde faltam informações.',
          '- relatorioAcompanhamento: uma linha por demanda registrada; instanciaCompetente deve distinguir:',
          '  "Direção" (discricionariedade interna), "Conselho Escolar" (deliberação colegiada),',
          '  "CRE-PP" (autorização ou encaminhamento externo), "SEEDF" ou "Outro".',
          '  providenciaSugerida é sugestão; a decisão é humana.',
          '- premissas: liste as premissas assumidas na elaboração da minuta.',
          '- aviso: reforce que esta é minuta para revisão, que a recomendação da IA não equivale a deliberação,',
          '  e que encaminhamentos a órgãos superiores seguem competência própria.'
        ].join('\n');
      } catch (error) {
        Logger.log("Erro em dispatchPrompt_: " + error.message);
        throw error;
      }
    } catch (error) {
      Logger.log("Erro em dispatchPrompt_: " + error.message);
      throw error;
    }
  }

  /**
   * Fallback local de minuta de despacho (sem Gemini).
   */
  function localDispatch_(demands, payload) {
    try {
      var responsavel = (payload && payload.responsavel) || '___________________';
      var assunto = (payload && payload.assunto) || 'Análise das demandas registradas no PCA';
      var data = (payload && payload.data) || new Date().toLocaleDateString('pt-BR');

      var linhas = demands.slice(0, 20).map(function (d) {
        return {
          demandaId: d.id || '—',
          descricao: d.descricao || '(sem descrição)',
          status: d.status || '—',
          providenciaSugerida: 'Verificar e classificar a instância competente.',
          instanciaCompetente: 'A definir',
          observacao: 'Texto gerado localmente; IA indisponível.'
        };
      });

      return {
        success: true,
        source: 'fallback',
        generatedAt: new Date().toISOString(),
        demandCount: demands.length,
        minutaDespacho:
          'ESCOLA CLASSE 115 NORTE — CRE-PP / SEEDF\n' +
          'MINUTA DE DESPACHO (LOCAL — CONFIGURE GEMINI_API_KEY PARA VERSÃO COMPLETA)\n\n' +
          'Data: ' + data + '\n' +
          'Assunto: ' + assunto + '\n\n' +
          'Prezada direção,\n\n' +
          'Esta minuta foi gerada localmente, sem consulta à IA. Há ' + demands.length + ' demanda(s) registrada(s).\n' +
          'Revise cada item no relatório de acompanhamento abaixo antes de formalizar qualquer encaminhamento.\n\n' +
          '____________________________________________\n' +
          responsavel + ' — ' + data,
        relatorioAcompanhamento: linhas,
        premissas: [
          'Dados extraídos dos registros do PCA.',
          'Texto gerado localmente sem IA; validação humana obrigatória.',
          'Instâncias competentes não foram classificadas automaticamente.'
        ],
        aviso: 'Esta é uma minuta para revisão. A recomendação da IA não equivale a deliberação; encaminhamentos a órgãos superiores seguem competência própria.'
      };
    } catch (error) {
      Logger.log("Erro em localDispatch_: " + error.message);
      throw error;
    }
  }

  /**
   * Proposta #50 — Minuta de despacho + relatório de acompanhamento de providências.
   * Fundamentados nos registros do PCA. Documenta sem decidir; a autoridade competente
   * revisa, assina e encaminha. IA não equivale a deliberação.
   *
   * @param {Object} payload { assunto?, contexto?, responsavel?, data? }
   * @return {{success, source, generatedAt, demandCount, minutaDespacho, relatorioAcompanhamento[], premissas[], aviso}}
   */
  function generateDispatchDraft(payload) {
    if (typeof checkPermission === 'function') checkPermission('admin');
    payload = payload || {};
    var demands = gatherDemands_();
    if (!isConfigured()) return localDispatch_(demands, payload);
    try {
      var raw = callGemini_(dispatchPrompt_(demands, payload));
      var data = parseJson_(raw);
      data = data && typeof data === 'object' ? data : {};
      return {
        success: true,
        source: 'gemini',
        generatedAt: new Date().toISOString(),
        demandCount: demands.length,
        minutaDespacho: String(data.minutaDespacho || '(sem conteúdo)'),
        relatorioAcompanhamento: Array.isArray(data.relatorioAcompanhamento)
          ? data.relatorioAcompanhamento.slice(0, 60) : [],
        premissas: Array.isArray(data.premissas) ? data.premissas.slice(0, 10) : [],
        aviso: String(data.aviso || 'Esta é uma minuta para revisão. A decisão permanece com a autoridade competente.')
      };
    } catch (e) {
      var fb = localDispatch_(demands, payload);
      fb.error = String((e && e.message) || e);
      return fb;
    }
  }

  function generate(payload) {
    try {
      payload = payload || {};
      var summary = payload.summary || gatherSummary_();
      var base = { success: true, project: PROJECT, generatedAt: new Date(), summary: summary };
      if (!isConfigured()) {
        base.source = 'fallback'; base.report = fallback_(summary); return base;
      }
      try {
        base.source = 'gemini'; base.report = callGemini_(buildPrompt_(summary, payload)); return HumanReviewService.decorateResult('ai.report', base, base.report);
      } catch (e) {
        base.source = 'fallback'; base.report = fallback_(summary);
        base.error = String((e && e.message) || e); return base;
      }
    } catch (error) {
      Logger.log("Erro em generate: " + error.message);
      throw error;
    }
  }

  return { isConfigured: isConfigured, generate: generate, generateManagementMemory: generateManagementMemory, generateDispatchDraft: generateDispatchDraft };
})();

/**
 * Ponto de entrada para o frontend (google.script.run.generateAiReport).
 * @param {Object=} payload { summary?, foco?, turma?, groupSize?, periodo? }
 * @return {{success:boolean, source:string, project:string, report:string, summary:Object}}
 */
function generateAiReport(payload) {
  return GeminiReportService.generate(payload || {});
}

function generateManagementMemory(payload) {
  return GeminiReportService.generateManagementMemory(payload || {});
}

/**
 * Proposta #50 — Ponto de entrada público: minuta de despacho + acompanhamento.
 * Chamado via google.script.run.generateDispatchDraft(payload).
 *
 * @param {Object} payload { assunto?, contexto?, responsavel?, data? }
 * @return {{success, source, generatedAt, demandCount, minutaDespacho, relatorioAcompanhamento[], premissas[], aviso}}
 */
function generateDispatchDraft(payload) {
  return GeminiReportService.generateDispatchDraft(payload || {});
}


/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
