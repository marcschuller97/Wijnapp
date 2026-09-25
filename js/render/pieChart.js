import { escapeHtml } from '../utils.js';
import { donutSVG } from './donut.js';

// A single gold/claret tone family instead of a generic rainbow.
const PALETTE = ['#c3a56b', '#6f1f2c', '#b3576a', '#8a6f45', '#6f7d71', '#5b6360'];
const OTHER_COLOR = '#454e4c';
const TOP_N = 6;

function countryCounts(inventory) {
  const counts = {};
  inventory.forEach((w) => {
    counts[w.country] = (counts[w.country] || 0) + w.quantity;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

// Countries outside the top 6 (by bottle count), for the "Other" drill-down.
export function otherCountries(inventory) {
  return countryCounts(inventory)
    .slice(TOP_N)
    .map(([country]) => country);
}

// Returns just the inner content (donut + legend), without a wrapping
// card — the caller combines this with other dashboard parts in one
// shared .pie-section.
export function countryDonutInnerHTML(inventory) {
  const entries = countryCounts(inventory);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  if (total === 0) return '';

  const top = entries.slice(0, TOP_N);
  const rest = entries.slice(TOP_N);
  const restTotal = rest.reduce((sum, [, count]) => sum + count, 0);

  const segments = top.map(([name, count], i) => ({ name, count, color: PALETTE[i % PALETTE.length] }));
  if (restTotal > 0) {
    segments.push({ name: 'Other', count: restTotal, color: OTHER_COLOR, other: true });
  }

  const legend = segments
    .map((s) => {
      const pct = Math.round((s.count / total) * 100);
      const inner = `
        <span class="legend-dot" style="background:${s.color}"></span>
        <span class="legend-name">${escapeHtml(s.name)}</span>
        <span class="legend-val">${s.count} · ${pct}%</span>`;
      if (s.other) {
        return `<button class="legend-row legend-row-clickable" data-action="nav" data-level="other">${inner}<span class="chevron">&rsaquo;</span></button>`;
      }
      return `<div class="legend-row">${inner}</div>`;
    })
    .join('');

  return `
    <div class="pie-row">
      <div class="donut-wrap">
        ${donutSVG(segments)}
        <div class="donut-center"><div class="n">${total}</div><div class="l">bottles</div></div>
      </div>
      <div class="legend">${legend}</div>
    </div>`;
}
