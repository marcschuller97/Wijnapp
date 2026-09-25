import { cardHTML } from './card.js';
import { colorFilterRowHTML, grapeFilterHTML, matchesFilters } from './colorFilter.js';
import { sortByPrice } from './voorraad.js';

export function renderByPrice(state, colorFilter, grapeFilter, priceDir) {
  const back = `<button class="back-btn" data-action="set-tab" data-tab="stock">&lsaquo; Back</button>`;
  const asc = priceDir === 'asc';
  const heading = `
    <div class="domain-header">
      <div class="domain-name">All wines · by price</div>
      <button class="sort-chip active" data-action="toggle-price-dir" title="Tap to flip">${asc ? 'Low &rarr; high &uarr;' : 'High &rarr; low &darr;'}</button>
    </div>`;
  const filterRow = colorFilterRowHTML(state.inventory, colorFilter) + grapeFilterHTML(state.inventory, grapeFilter, colorFilter);

  const items = sortByPrice(
    state.inventory.filter((w) => matchesFilters(w, colorFilter, grapeFilter)),
    priceDir
  );

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
