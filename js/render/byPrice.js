import { cardHTML } from './card.js';
import { colorFilterRowHTML, matchesFilter } from './colorFilter.js';

export function renderByPrice(state, colorFilter) {
  const back = `<button class="back-btn" data-action="set-tab" data-tab="stock">&lsaquo; Back</button>`;
  const heading = `
    <div class="domain-header">
      <div class="domain-name">All wines · price high to low</div>
    </div>`;
  const filterRow = colorFilterRowHTML(state.inventory, colorFilter);

  const items = state.inventory
    .filter((w) => matchesFilter(w, colorFilter))
    .slice()
    .sort((a, b) => Number(b.price || 0) - Number(a.price || 0));

  if (items.length === 0) {
    return (
      back +
      heading +
      filterRow +
      `<div class="empty-state"><div class="glyph">&#127863;</div><p>No wines found for this filter.</p></div>`
    );
  }

  return back + heading + filterRow + items.map((w) => cardHTML(w, true)).join('');
}
