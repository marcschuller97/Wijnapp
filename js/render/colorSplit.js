import { escapeHtml } from '../utils.js';
import { donutSVG } from './donut.js';

const COLOR_COLORS = { White: '#efe6d3', Rosé: '#c98a93', Red: '#6f1f2c' };
const COLOR_ORDER = ['White', 'Rosé', 'Red'];

// Returns just the inner content (mini-donut + legend), without a wrapping
// card — meant to be combined with the countries donut. Sparkling has its
// own filter chip (see colorFilter.js) instead of a separate text line here.
export function colorSplitInnerHTML(inventory) {
  const counts = { White: 0, Rosé: 0, Red: 0 };

  inventory.forEach((w) => {
    const color = COLOR_ORDER.includes(w.color) ? w.color : 'Red';
    counts[color] += w.quantity;
  });

  const total = counts.White + counts.Rosé + counts.Red;
  if (total === 0) return '';

  const segments = COLOR_ORDER.filter((k) => counts[k] > 0).map((k) => ({ name: k, count: counts[k], color: COLOR_COLORS[k] }));

  const legend = segments
    .map((s) => {
      const pct = Math.round((s.count / total) * 100);
      return `<div class="legend-row">
        <span class="legend-dot" style="background:${s.color}"></span>
        <span class="legend-name">${escapeHtml(s.name)}</span>
        <span class="legend-val">${s.count} · ${pct}%</span>
      </div>`;
    })
    .join('');

  return `
    <div class="pie-row">
      <div class="donut-wrap small">${donutSVG(segments, { size: 64, strokeWidth: 8 })}</div>
      <div class="legend">${legend}</div>
    </div>`;
}
