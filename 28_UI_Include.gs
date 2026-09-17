/**
 * @file 28_UI_Include.gs
 * @description Inclusão de sub-componentes HTML em templates server-side.
 *   Definição ÚNICA de include() no projeto — não redefinir em 27_UI_Main.gs
 *   (Apps Script compartilha um namespace global; duplicar geraria colisão).
 *
 *   Dependências (mesmo namespace GAS):
 *     - 26_Log_Error.gs → logError()
 *
 * @author Antigravity (ag-kit)
 * @date 2026-05-31
 */

/**
 * Inclui um sub-componente HTML dentro de um template scriptlet.
 *
 * Uso no template: `<?!= include('Navbar') ?>`
 *
 * Em caso de arquivo inexistente, registra o erro e retorna um comentário HTML
 * inerte em vez de derrubar a renderização da página inteira — uma falha de um
 * parcial não deve quebrar toda a interface.
 *
 * @param {string} filename Nome do arquivo HTML (sem extensão) a incluir.
 * @returns {string} Conteúdo HTML do arquivo, ou comentário de fallback.
 */
function include(filename) {
  filename = String(filename || '').trim();
  if (!filename) return '<!-- include: nome de arquivo ausente -->';
  if (!/^[A-Za-z0-9_-]+$/.test(filename)) {
    logError('include', 'Nome de parcial inválido: ' + filename);
    return '<!-- include: nome inválido -->';
  }

  try {
    // Avalia como template (nao createHtmlOutputFromFile) para que includes
    // aninhados — ex.: Login_Page -> <?!= include('Login_Form') ?> — sejam
    // resolvidos em vez de aparecerem como texto literal.
    var template = HtmlService.createTemplateFromFile(filename);
    return template.evaluate().getContent();
  } catch (e) {
    logError('include', 'Falha ao incluir parcial "' + filename + '": ' + e.message, e.stack);
    return '<!-- include: parcial "' + filename + '" indisponível -->';
  }
}

/**
 * Compacta dados estáticos para uso em data URLs (como logos base64)
 * Remove todos os espaços em branco para otimizar o tamanho
 */
function includeInlineData(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent().replace(/\s+/g, '');
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
