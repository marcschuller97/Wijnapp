const COLOR_KEYS = ['White', 'Rosé', 'Red'];
const BUBBLES_ICON =
  '<svg class="chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="9" cy="14" r="4.5"/><circle cx="16" cy="8" r="3"/><circle cx="17" cy="16" r="1.6"/></svg>';

function countsFor(inventory) {
  const counts = { All: 0, White: 0, Rosé: 0, Red: 0, Sparkling: 0 };
  inventory.forEach((w) => {
    counts.All += w.quantity;
    if (COLOR_KEYS.includes(w.color)) counts[w.color] += w.quantity;
    if (w.sparkling) counts.Sparkling += w.quantity;
  });
  return counts;
}

export function matchesFilter(wine, filter) {
  if (!filter || filter === 'All') return true;
  if (filter === 'Sparkling') return !!wine.sparkling;
  return wine.color === filter;
}

export function colorFilterRowHTML(inventory, activeFilter) {
  const counts = countsFor(inventory);
  const filter = activeFilter || 'All';

  const chips = [
    { key: 'All', label: 'All' },
    { key: 'White', label: 'White', dot: '#efe6d3' },
    { key: 'Rosé', label: 'Rosé', dot: '#c98a93' },
    { key: 'Red', label: 'Red', dot: '#6f1f2c' },
    { key: 'Sparkling', label: 'Sparkling', icon: BUBBLES_ICON },
  ]
    .map((c) => {
      const active = c.key === filter;
      const mark = c.dot
        ? `<span class="color-chip-dot" style="background:${c.dot}"></span>`
        : c.icon || '';
      return `<button class="color-chip ${active ? 'active' : ''}" data-action="set-color-filter" data-color="${c.key}">${mark}${c.label} <span class="color-chip-count">${counts[c.key]}</span></button>`;
    })
    .join('');

  return `<div class="color-filter-row">${chips}</div>`;
}
