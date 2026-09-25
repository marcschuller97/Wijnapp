import { cardHTML } from './card.js';

export function renderRecentlyAdded(state) {
  const items = [...state.inventory]
    .filter((w) => !!w.addedAt)
    .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
  if (items.length === 0) {
    return `<div class="empty-state"><div class="glyph">&#127863;</div><p>No recently added wines yet.</p></div>`;
  }
  return items.map((w) => cardHTML(w, true)).join('');
}
