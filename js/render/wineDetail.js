import { escapeHtml, formatEuro } from '../utils.js';
import { ripeningInfo } from '../model.js';

function hasClassification(classification) {
  return !!classification && !/not stated/i.test(classification);
}

function flavorChipsHTML(flavorProfile) {
  return `<div class="smaak-chips">${flavorProfile.map((s) => `<span class="smaak-chip">${escapeHtml(s)}</span>`).join('')}</div>`;
}

function infoRow(label, value) {
  if (!value) return '';
  return `<div class="info-row"><div class="info-row-label">${escapeHtml(label)}</div><div class="info-row-value">${escapeHtml(value)}</div></div>`;
}

export function renderWineDetail(wine) {
  if (!wine) return '';
  const r = ripeningInfo(wine);
  const hasNotes = !!(wine.description || (wine.flavorProfile && wine.flavorProfile.length));

  return `
    <button class="back-btn" data-action="close-detail">&lsaquo; Back</button>

    <div class="detail-hero">
      <p class="eyebrow">${escapeHtml(wine.region)}, ${escapeHtml(wine.country)}</p>
      <div class="detail-hero-top">
        <div class="detail-hero-title">
          <div class="wine-name">${escapeHtml(wine.name)}</div>
          <div class="wine-meta-domein" style="margin-top:5px;">${escapeHtml(wine.estate)}</div>
        </div>
        ${hasClassification(wine.classification) ? `<div class="detail-seal"><span>${escapeHtml(wine.classification.split(',')[0].trim().replace(/^VDP\.?\s*/i, 'VDP '))}</span></div>` : ''}
      </div>
      <div class="detail-hero-stats">
        <div class="detail-hero-stat"><div class="n">${wine.vintage}</div><div class="l">Vintage</div></div>
        <div class="detail-hero-stat"><div class="n">${formatEuro(wine.price)}</div><div class="l">Per bottle</div></div>
        <div class="detail-hero-stat"><div class="n">${wine.quantity}</div><div class="l">In stock</div></div>
      </div>
      <div class="gauge-wrap" style="margin-top:14px;">
        <div class="gauge-label-row">
          <span class="gauge-status" style="color:${r.color}">${escapeHtml(r.status)}</span>
          <span>drink by ~${r.drinkByYear}</span>
        </div>
        <div class="gauge" style="color:${r.color}">
          <div class="gauge-fill" style="width:${Math.round(r.progress * 100)}%"></div>
          <div class="gauge-glow" style="left:${Math.round(r.progress * 100)}%"></div>
        </div>
      </div>
    </div>

    <div class="detail-label" style="margin-top:22px;">General information</div>
    <div class="info-grid">
      ${infoRow('Producer', wine.estate)}
      ${infoRow('Grape variety', wine.grapeVariety)}
      ${infoRow('Region', `${wine.region}, ${wine.country}`)}
      ${infoRow('Classification', hasClassification(wine.classification) ? wine.classification : '')}
      ${infoRow('Notes', wine.notes)}
    </div>
    ${wine.description ? `<p class="detail-text" style="margin-top:12px;">${escapeHtml(wine.description)}</p>` : ''}

    <div class="detail-label" style="margin-top:24px;">Taste &amp; aroma</div>
    ${
      wine.flavorProfile && wine.flavorProfile.length
        ? flavorChipsHTML(wine.flavorProfile)
        : `<div class="detail-empty">No flavor profile found for this wine yet.</div>`
    }

    ${!hasNotes ? `<div class="detail-empty" style="margin-top:8px;">No additional information about this wine has been found online yet.</div>` : ''}

    <button class="btn-secondary" style="width:100%; margin-top:22px;" data-action="open-edit" data-id="${escapeHtml(wine.id)}">Edit wine</button>
  `;
}
