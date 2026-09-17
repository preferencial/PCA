/**
 * @file 29_UI_Sidebar.gs
 * @description Controla a renderização da barra lateral.
 * @author Manus AI
 * @date 2026-04-22
 */

/**
 * Gera o HTML da sidebar com base no perfil do usuário.
 * Pode ser expandido para menus dinâmicos por permissão.
 */
function renderSidebar(userRole) {
  try {
    var items = [
      { name: 'Dashboard', icon: '🏠', link: '#dashboard' },
      { name: 'Demandas e Decisões', icon: '📋', link: '#pca' },
      { name: 'Usuários', icon: '👤', link: '#usuarios' },
      { name: 'Legais', icon: '⚖️', link: '#legais' }
    ];
    if (userRole === 'admin') {
      items.push({ name: 'Configurações', icon: '⚙️', link: '#config' });
    }
    var html = '<ul class="sidebar-list">';
    items.forEach(function(item) {
      html += '<li><a href="' + item.link + '">' + item.icon + ' ' + item.name + '</a></li>';
    });
    html += '</ul>';
    return html;
  } catch (error) {
    Logger.log("Erro em renderSidebar: " + error.message);
    throw error;
  }
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
