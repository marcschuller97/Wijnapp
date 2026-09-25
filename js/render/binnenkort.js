import { cardHTML } from './card.js';
import { ripeningInfo } from '../model.js';

export function renderDrinkSoon(state) {
  const items = [...state.inventory].sort((a, b) => ripeningInfo(b).progress - ripeningInfo(a).progress);
  if (items.length === 0) {
    return `<div class="empty-state"><div class="glyph">&#127863;</div><p>No wines left in stock.</p></div>`;
  }
  return items.map((w) => cardHTML(w, true)).join('');
}
