import { escapeHtml } from '../utils.js';

export function renderHistory(state) {
  if (state.history.length === 0) {
    return `<div class="empty-state"><div class="glyph">&#128214;</div><p>No wines marked as consumed yet.</p></div>`;
  }
  const byDate = {};
  state.history.forEach((h) => {
    (byDate[h.date] = byDate[h.date] || []).push(h);
  });
  return Object.keys(byDate)
    .map(
      (date) => `
      <div class="history-group">
        <div class="history-date">${escapeHtml(date)}</div>
        ${byDate[date]
          .map(
            (h) => `
          <div class="history-item">
            <span class="hi-name">${escapeHtml(h.name)}</span>
            <span class="hi-meta">${escapeHtml(h.estate)} · ${escapeHtml(h.vintage)}</span>
          </div>
        `
          )
          .join('')}
      </div>
    `
    )
    .join('');
}
