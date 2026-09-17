/**
 * @file 12_PCA_Validate.gs
 * @description Motor de regras e validação para itens do PCA.
 * @author Antigravity (ag-kit)
 * @date 2026-04-28
 */

/**
 * Valida os dados de um item do PCA antes de salvar.
 * @param {Object} data Dados do item.
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validatePCAData(data) {
  try {
    data = data || {};
    var errors = [];
    var descricao = String(data.Descricao == null ? '' : data.Descricao).trim();
    var unidadeGestora = String(data.UnidadeGestora == null ? '' : data.UnidadeGestora).trim();
  
    if (descricao.length < 10) {
      errors.push('A descrição deve ter pelo menos 10 caracteres.');
    } else if (descricao.length < 15) {
      errors.push('A descrição deve ter pelo menos 15 caracteres e detalhar a necessidade escolar.');
    }
  
    if (!data.Tipo) {
      errors.push('A área de gestão é obrigatória.');
    }

    if (!data.CategoriaAlimenticia) {
      errors.push('A competência para encaminhamento é obrigatória.');
    }

    if (!data.ModalidadeAtendimento) {
      errors.push('O grupo impactado é obrigatório.');
    }

    var publicoEstimado = PCA_parseFiniteNumber_(data.PublicoEstimado);
    if (publicoEstimado === null || publicoEstimado <= 0 || Math.floor(publicoEstimado) !== publicoEstimado) {
      errors.push('O público estimado deve ser um número inteiro positivo.');
    }
  
    var valor = data.ValorEstimado === '' || data.ValorEstimado === null || typeof data.ValorEstimado === 'undefined'
      ? 0
      : PCA_parseFiniteNumber_(data.ValorEstimado);
    if (valor === null || valor < 0) {
      errors.push('O custo estimado não pode ser negativo.');
    }
  
    var inicio = PCA_parseDate_(data.PrazoInicio);
    var fim = PCA_parseDate_(data.PrazoFim);
    if (!inicio || !fim) {
      errors.push('Prazos de início e fim devem ser datas válidas e são obrigatórios.');
    } else if (fim.getTime() <= inicio.getTime()) {
      errors.push('A data de fim deve ser posterior à data de início.');
    }

    if (unidadeGestora.length < 3) {
      errors.push('Informe a Escola Classe e a vinculação à CRE-PP.');
    }
  
    return {
      valid: errors.length === 0,
      errors: errors
    };
  } catch (error) {
    Logger.log("Erro em validatePCAData: " + error.message);
    throw error;
  }
}

/** Converte somente números completos e finitos, aceitando a vírgula decimal. */
function PCA_parseFiniteNumber_(value) {
  if (value === null || typeof value === 'undefined') return null;
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  var normalized = typeof value === 'string' ? value.trim().replace(',', '.') : value;
  var number = Number(normalized);
  return isFinite(number) ? number : null;
}

/** Retorna uma data válida ou null para entradas ausentes/inválidas. */
function PCA_parseDate_(value) {
  if (value === null || typeof value === 'undefined' || String(value).trim() === '') return null;
  var date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
