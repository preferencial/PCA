/**
 * PromptContextBuilder.gs — Montador de contexto com privacidade por construção.
 *
 * FROTA-02: Privacidade por construção e minimização do prompt.
 *
 * CASOS DE USO declarados neste projeto (Preferencial - PCA):
 *   - 'report.analytics'    → indicadores agregados, foco, turma (sem nomes)
 *   - 'report.management'   → demandas: id, tipo, status, valor, unidade gestora
 *                             observações truncadas; sem nomes nominais
 *   - 'report.dispatch'     → assunto, contexto institucional, demandas anonimizadas
 *
 * CAMPOS PERMITIDOS POR CASO DE USO refletem o contrato explícito de dados.
 * Observações livres de demandas passam mas são sanitizadas (stripPii).
 *
 * IDENTIFICADORES PROIBIDOS (nunca chegam ao Gemini):
 *   email, nome, cpf, ra, matricula, id_externo, telefone, endereco,
 *   responsavel, turma_nominal, nota_livre, observacao_pessoal
 */

var PromptContextBuilder = (function () {
  var MIN_GROUP_SIZE = 5;

  var ALLOWED_FIELDS = {
    'report.analytics': ['projectName', 'focus', 'escopo', 'groupSize', 'analyses'],
    'report.management': [
      'id', 'descricao', 'tipo', 'status', 'valorEstimado',
      'unidadeGestora', 'observacoes', 'criadoEm'
    ],
    'report.dispatch': ['assunto', 'contexto', 'responsavel', 'data', 'demands'],
    'themeDigest':     ['theme', 'query', 'audience', 'headlines']
  };

  var PII_PATTERNS = [
    /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
    /\b\d{3}\.?\d{3}\.?\d{3}\-?\d{2}\b/g,
    /\b\d{7,12}\b/g,
    /\b[0-9]{10,11}\b/g,
    /\b(aluno|estudante|professor|responsavel)\s+[A-ZÀ-Ú][a-zà-ú]+/gi
  ];

  var BLOCKED_KEYS = [
    'email', 'nome', 'cpf', 'ra', 'matricula', 'id_externo', 'telefone',
    'endereco', 'responsavel_nome', 'turma_nominal', 'nota_livre',
    'observacao_pessoal', 'name', 'student_name', 'teacher_name'
  ];

  function stripPii(text) {
    try {
      if (typeof text !== 'string') return text;
      var result = text;
      for (var i = 0; i < PII_PATTERNS.length; i++) {
        result = result.replace(PII_PATTERNS[i], '[OMITIDO]');
      }
      return result;
    } catch (error) {
      Logger.log("Erro em stripPii: " + error.message);
      throw error;
    }
  }

  function containsPii(text) {
    if (typeof text !== 'string') return false;
    for (var i = 0; i < PII_PATTERNS.length; i++) {
      PII_PATTERNS[i].lastIndex = 0;
      if (PII_PATTERNS[i].test(text)) return true;
    }
    return false;
  }

  function sanitizeValue(value, maxLen) {
    try {
      maxLen = maxLen || 500;
      if (typeof value === 'string') return stripPii(value).slice(0, maxLen);
      if (typeof value === 'number' || typeof value === 'boolean') return value;
      return null;
    } catch (error) {
      Logger.log("Erro em sanitizeValue: " + error.message);
      throw error;
    }
  }

  /**
   * Sanitiza uma linha de demanda do PCA — aplica stripPii em campos textuais
   * e mantém apenas os campos da lista positiva de 'report.management'.
   */
  function sanitizeDemand(row) {
    try {
      var allowed = ALLOWED_FIELDS['report.management'];
      var out = {};
      allowed.forEach(function (key) {
        var val = row[key];
        if (val === undefined || val === null) return;
        if (typeof val === 'string') out[key] = stripPii(val).slice(0, 500);
        else if (typeof val === 'number' || typeof val === 'boolean') out[key] = val;
      });
      return out;
    } catch (error) {
      Logger.log("Erro em sanitizeDemand: " + error.message);
      throw error;
    }
  }

  function build(useCase, rawData) {
    try {
      var allowed = ALLOWED_FIELDS[useCase];
      if (!allowed) throw new Error('PromptContextBuilder: caso de uso desconhecido "' + useCase + '".');

      rawData = rawData || {};
      var context = {};
      var droppedKeys = [];

      Object.keys(rawData).forEach(function (key) {
        var keyLower = key.toLowerCase();
        if (BLOCKED_KEYS.indexOf(keyLower) !== -1) { droppedKeys.push(key); return; }
        if (allowed.indexOf(key) === -1) { droppedKeys.push(key); return; }

        if (key === 'demands' && Array.isArray(rawData[key])) {
          context[key] = rawData[key].map(sanitizeDemand);
          return;
        }
        if (key === 'analyses' && Array.isArray(rawData[key])) {
          context[key] = rawData[key].map(function (a) {
            return {
              key:       sanitizeValue(a.key,   100),
              label:     sanitizeValue(a.label,  200),
              value:     (typeof a.value === 'number') ? a.value : sanitizeValue(a.value, 200),
              unit:      sanitizeValue(a.unit,   100),
              dimension: sanitizeValue(a.dimension, 200),
              narrative: sanitizeValue(a.narrative, 400)
            };
          });
          return;
        }
        if (key === 'headlines' && Array.isArray(rawData[key])) {
          context[key] = rawData[key].map(function (item) {
            return { title: sanitizeValue(item.title, 300), source: sanitizeValue(item.source, 100) };
          });
          return;
        }
        context[key] = sanitizeValue(rawData[key]);
      });

      return { context: context, droppedKeys: droppedKeys };
    } catch (error) {
      Logger.log("Erro em build: " + error.message);
      throw error;
    }
  }

  function assertMinimumGroup(groupSize, useCase) {
    try {
      var size = Number(groupSize);
      if (!isFinite(size) || size < MIN_GROUP_SIZE) {
        throw new Error('PromptContextBuilder [' + useCase + ']: grupo abaixo do limiar mínimo de ' +
          MIN_GROUP_SIZE + '.');
      }
      return size;
    } catch (error) {
      Logger.log("Erro em assertMinimumGroup: " + error.message);
      throw error;
    }
  }

  function buildGeminiPayload(prompt, generationConfig) {
    try {
      var safePrompt = stripPii(String(prompt == null ? '' : prompt));
      if (containsPii(safePrompt)) {
        throw new Error('PromptContextBuilder: identificador detectado no payload final.');
      }
      return {
        contents: [{ role: 'user', parts: [{ text: safePrompt }] }],
        generationConfig: generationConfig || {}
      };
    } catch (error) {
      Logger.log("Erro em buildGeminiPayload: " + error.message);
      throw error;
    }
  }

  function logAudit(useCase, droppedKeys) {
    try {
      if (droppedKeys.length === 0) return;
      Logger.log('PromptContextBuilder [' + useCase + ']: ' +
        droppedKeys.length + ' campo(s) omitido(s) — chaves: ' +
        droppedKeys.join(', ') + ' (valores não registrados).');
    } catch (error) {
      Logger.log("Erro em logAudit: " + error.message);
      throw error;
    }
  }

  return {
    build:          build,
    stripPii:       stripPii,
    containsPii:    containsPii,
    sanitizeDemand: sanitizeDemand,
    assertMinimumGroup: assertMinimumGroup,
    buildGeminiPayload: buildGeminiPayload,
    logAudit:       logAudit
  };
})();

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
