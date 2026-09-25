import { escapeHtml, formatEuro } from '../utils.js';
import { ripeningInfo } from '../model.js';

function gaugeHTML(wine) {
  const r = ripeningInfo(wine);
  const pct = Math.round(r.progress * 100);
  return `
    <div class="gauge-wrap">
      <div class="gauge-label-row">
        <span class="gauge-status" style="color:${r.color}">${escapeHtml(r.status)}</span>
        <span>drink by ~${r.drinkByYear}</span>
      </div>
      <div class="gauge" style="color:${r.color}">
        <div class="gauge-fill" style="width:${pct}%"></div>
        <div class="gauge-glow" style="left:${pct}%"></div>
      </div>
    </div>`;
}

function hasClassification(classification) {
  return !!classification && !/not stated/i.test(classification);
}

function sealBadgeHTML(classification) {
  if (!hasClassification(classification)) return '';
  // Split long, space-free prefixes (VDP.Ortswein) so the label wraps
  // neatly across two lines instead of breaking mid-word.
  const label = classification
    .split(',')[0]
    .trim()
    .replace(/^VDP\.?\s*/i, 'VDP ');
  return `<div class="seal-badge"><span>${escapeHtml(label)}</span></div>`;
}

function noteHTML(notes) {
  if (!notes) return '';
  return `<div class="wine-note">&#128221; ${escapeHtml(notes)}</div>`;
}

export function cardHTML(wine, showEstate) {
  const id = escapeHtml(wine.id);
  return `
    <div class="card card-clickable" data-action="open-detail" data-id="${id}">
      <div class="card-top">
        <div>
          <div class="wine-name">${escapeHtml(wine.name)}</div>
          <div class="wine-meta">${wine.vintage} · ${escapeHtml(wine.grapeVariety)} · ${formatEuro(wine.price)}</div>
          ${showEstate ? `<div class="wine-meta-domein">${escapeHtml(wine.estate)} · ${escapeHtml(wine.region)}, ${escapeHtml(wine.country)}</div>` : ''}
          ${noteHTML(wine.notes)}
        </div>
        <div class="card-top-right">
          <button class="edit-btn" data-action="open-edit" data-id="${id}" title="Edit">&#9998;</button>
          ${sealBadgeHTML(wine.classification)}
        </div>
      </div>
      ${gaugeHTML(wine)}
      <div class="card-footer">
        <div class="stepper">
          <button data-action="adjust" data-id="${id}" data-delta="-1">&ndash;</button>
          <span class="stepper-count">${wine.quantity}</span>
          <button data-action="adjust" data-id="${id}" data-delta="1">+</button>
        </div>
        <button class="drink-btn" data-action="drink" data-id="${id}" ${wine.quantity <= 0 ? 'disabled' : ''}>Consumed</button>
      </div>
    </div>`;
}
