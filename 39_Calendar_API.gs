/**
 * @file 39_Calendar_API.gs
 * @description Sincronização de prazos com o Google Agenda.
 * @author Antigravity (ag-kit)
 * @date 2026-04-28
 */

/**
 * Cria um evento no Google Agenda do usuário. Requer papel 'user'.
 *
 * @param {string}  titulo     Título do evento.
 * @param {Date}    inicio     Data/hora de início.
 * @param {Date}    fim        Data/hora de término.
 * @param {string}  [descricao] Descrição do evento.
 * @returns {string} ID do evento criado no Google Agenda.
 */
function calendarCreateEvent(titulo, inicio, fim, descricao) {
  try {
    checkPermission('user');
    const calendar = CalendarApp.getDefaultCalendar();
    const event    = calendar.createEvent(titulo, inicio, fim, { description: descricao || '' });
    return event.getId();
  } catch (error) {
    Logger.log("Erro em calendarCreateEvent: " + error.message);
    throw error;
  }
}

/** Lista compromissos do período, mantendo a mesma guarda de autorização. */
function calendarListEvents(inicio, fim) {
  checkPermission('user');
  if (!isValidDate_(inicio) || !isValidDate_(fim) || new Date(fim) <= new Date(inicio)) {
    throw new Error('Período de calendário inválido.');
  }
  return CalendarApp.getDefaultCalendar().getEvents(new Date(inicio), new Date(fim))
    .map(function(event) {
      return { id: event.getId(), title: event.getTitle(), start: event.getStartTime().toISOString(), end: event.getEndTime().toISOString() };
    });
}

/** Sanitização XSS e escape seguro para saída HTML */
function _escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>'"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
