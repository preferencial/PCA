/**
 * @file 06_PCA_Create.gs
 * @description Registra novas demandas e decisões da gestão escolar.
 * @author Antigravity (ag-kit)
 * @date 2026-04-28
 */

/**
 * @typedef {Object} PCACreateResult
 * @property {boolean}  success  Indica se a operação foi concluída com êxito.
 * @property {string}   message  Mensagem legível pelo cliente.
 * @property {string}   [id]     UUID do item criado (presente apenas em caso de sucesso).
 * @property {string[]} [errors] Lista de erros de validação (presente apenas em caso de falha).
 */

/**
 * Monta o array de linha para inserção na aba PCA_Itens.
 * Função pura — sem efeitos colaterais e sem chamadas à API do Sheets.
 *
 * Esquema da aba (ordem das colunas):
 * ID_PCA | Descricao | Tipo | CategoriaAlimenticia | ModalidadeAtendimento |
 * PublicoEstimado | ValorEstimado | PrazoInicio | PrazoFim | Status |
 * UnidadeGestora | Responsavel_ID | Obs | Legal_IDs | CriadoEm | AtualizadoEm
 *
 * @param {string} id   UUID gerado para o novo item.
 * @param {Object} data Dados já validados do formulário.
 * @param {Date}   now  Timestamp usado em CriadoEm e AtualizadoEm.
 * @returns {Array} Linha com 16 células ordenada conforme o esquema acima.
 */
function _buildPCARow(id, data, now) {
  try {
    return [
      id,
      data.Descricao,
      data.Tipo,
      data.CategoriaAlimenticia,
      data.ModalidadeAtendimento,
      PCA_parseFiniteNumber_(data.PublicoEstimado),
      data.ValorEstimado === '' || data.ValorEstimado === null || typeof data.ValorEstimado === 'undefined'
        ? 0
        : PCA_parseFiniteNumber_(data.ValorEstimado),
      data.PrazoInicio,
      data.PrazoFim,
      'Em Análise',
      data.UnidadeGestora,
      data.Responsavel_ID || 'N/A',
      data.Obs            || '',
      data.Legal_IDs      || '',
      now,
      now,
    ];
  } catch (error) {
    Logger.log("Erro em _buildPCARow: " + error.message);
    throw error;
  }
}

/**
 * Cria um novo registro de gestão da unidade escolar.
 *
 * Fluxo: valida → obtém planilha → grava em lote via setValues → audita.
 * Todos os erros de infraestrutura são delegados ao handler {@link logError}.
 * A mensagem devolvida ao cliente nunca expõe detalhes internos do sistema.
 *
 * @param {Object}        data                  Dados do formulário enviado pelo cliente.
 * @param {string}        data.Descricao        Descrição do item (mínimo 10 caracteres).
 * @param {string}        data.Tipo             Natureza da demanda de aquisição.
 * @param {string}        data.CategoriaAlimenticia Competência predominante para a providência.
 * @param {string}        data.ModalidadeAtendimento Grupo principalmente impactado.
 * @param {number|string} data.PublicoEstimado  Quantidade estimada de pessoas impactadas.
 * @param {number|string} data.ValorEstimado    Custo estimado, quando houver (deve ser >= 0).
 * @param {string}        data.PrazoInicio      Data de início (ISO 8601 ou Date serializável).
 * @param {string}        data.PrazoFim         Data de término, obrigatoriamente posterior a PrazoInicio.
 * @param {string}        data.UnidadeGestora   Escola Classe e vinculação à CRE-PP.
 * @param {string}        [data.Responsavel_ID] ID do responsável pelo item; padrão 'N/A'.
 * @param {string}        [data.Obs]            Observações adicionais.
 * @param {string}        [data.Legal_IDs]      IDs das referências legais vinculadas.
 * @returns {PCACreateResult}
 */
function savePCAItem(data) {
  try {
    const principal = checkPermission('user');

    const validation = validatePCAData(data);
    if (!validation.valid) {
      return { success: false, message: 'Falha na validação.', errors: validation.errors };
    }

    const config = getConfig();
    const db     = getDb();
    if (!db) {
      logError('savePCAItem', 'getDb() retornou null – banco de dados inacessível.');
      return { success: false, message: 'Erro ao conectar ao banco de dados.' };
    }

    const sheet = db.getSheetByName(config.SHEET_PCA);
    if (!sheet) {
      logError('savePCAItem', 'Aba não encontrada: ' + config.SHEET_PCA);
      return { success: false, message: 'Configuração do banco de dados inválida.' };
    }

    const id  = generateUUID();
    const now = new Date();
    const row = _buildPCARow(id, data, now);

    try {
      // Operação em lote: uma única chamada setValues em vez de appendRow,
      // evitando a varredura interna da planilha que appendRow realiza.
      const targetRange = sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length);
      targetRange.setValues([row]);
      logAction(data.Responsavel_ID || 'SYSTEM', 'PCA_CREATED', 'Item criado: ' + id);
      return { success: true, id: id, message: 'Demanda registrada para análise da direção.' };
    } catch (e) {
      logError('savePCAItem', e.message, e.stack);
      return { success: false, message: 'Erro ao salvar o item. Consulte os logs do sistema.' };
    }
  } catch (error) {
    Logger.log("Erro em savePCAItem: " + error.message);
    throw error;
  }
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
