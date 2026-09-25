import { cardHTML } from './card.js';
import { ripeningInfo } from '../model.js';

function sectionHTML(title, wines) {
  if (wines.length === 0) return '';
  return `
    <div class="domain-header">
      <div class="domain-name">${title}</div>
      <div class="domain-count">${wines.length} ${wines.length === 1 ? 'wine' : 'wines'}</div>
    </div>
    ${wines.map((w) => cardHTML(w, true)).join('')}`;
}

// Most urgent first. "Needs attention" is the same rule as the header stat:
// anything whose status isn't "Can still wait" (i.e. "Soon" or "Drink now").
export function renderDrinkSoon(state) {
  const items = [...state.inventory].sort((a, b) => ripeningInfo(b).progress - ripeningInfo(a).progress);
  if (items.length === 0) {
    return `<div class="empty-state"><div class="glyph">&#127863;</div><p>No wines left in stock.</p></div>`;
  }
  const attention = items.filter((w) => ripeningInfo(w).status !== 'Can still wait');
  const rest = items.filter((w) => ripeningInfo(w).status === 'Can still wait');
  const none = attention.length === 0
    ? `<div class="detail-empty" style="margin-bottom:16px;">Nothing needs attention right now — every wine can still wait.</div>`
    : '';
  return none + sectionHTML('Needs attention', attention) + sectionHTML('Can still wait', rest);
}
