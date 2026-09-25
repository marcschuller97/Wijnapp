import { escapeHtml } from '../utils.js';

const COLOR_OPTIONS = ['White', 'Rosé', 'Red'];

const CLASSIFICATION_OPTIONS = [
  'Q.b.A. trocken',
  'Qualitätswein trocken',
  'VDP.Gutswein',
  'VDP.Ortswein',
  'VDP.Grosse Lage',
  'Großes Gewächs',
  'Blanc de Noir',
  'not stated on receipt',
];

function photoPreviewStripHTML(previews) {
  if (!previews || previews.length === 0) return '';
  return `
    <div class="batch-photo-caption">Recognized from these photos:</div>
    <div class="photo-preview-strip">${previews.map((url) => `<img class="photo-preview-thumb" src="${url}" alt="">`).join('')}</div>`;
}

export function batchModalHTML(ui) {
  if (!ui.batchModalOpen) return '';
  const rows = ui.batchItems
    .map((b, i) => {
      const classificationOptions = [...CLASSIFICATION_OPTIONS];
      if (b.classification && !classificationOptions.includes(b.classification)) classificationOptions.push(b.classification);
      return `
      <div class="batch-row">
        <div class="batch-row-top">
          <span class="batch-row-status">&#10003; recognized</span>
          <button class="batch-row-remove" data-action="remove-batch-item" data-index="${i}">&#10005;</button>
        </div>
        <div class="batch-mini-row">
          <div class="batch-mini-field"><label>Country</label><input data-batch-field="country" data-index="${i}" value="${escapeHtml(b.country)}"></div>
          <div class="batch-mini-field"><label>Region</label><input data-batch-field="region" data-index="${i}" value="${escapeHtml(b.region)}"></div>
        </div>
        <div class="batch-mini-field"><label>Estate</label><input data-batch-field="estate" data-index="${i}" value="${escapeHtml(b.estate)}"></div>
        <div class="batch-mini-field"><label>Name</label><input data-batch-field="name" data-index="${i}" value="${escapeHtml(b.name)}"></div>
        <div class="batch-mini-row">
          <div class="batch-mini-field"><label>Vintage</label><input type="number" data-batch-field="vintage" data-index="${i}" value="${escapeHtml(b.vintage)}"></div>
          <div class="batch-mini-field"><label>Quantity</label><input type="number" min="1" data-batch-field="quantity" data-index="${i}" value="${escapeHtml(b.quantity)}"></div>
        </div>
        <div class="batch-mini-row">
          <div class="batch-mini-field"><label>Grape</label><input data-batch-field="grapeVariety" data-index="${i}" value="${escapeHtml(b.grapeVariety)}"></div>
          <div class="batch-mini-field"><label>Price &euro;</label><input type="number" step="0.01" data-batch-field="price" data-index="${i}" value="${escapeHtml(b.price)}"></div>
        </div>
        <div class="batch-mini-row">
          <div class="batch-mini-field">
            <label>Color</label>
            <select data-batch-field="color" data-index="${i}">
              ${COLOR_OPTIONS.map((k) => `<option ${b.color === k ? 'selected' : ''}>${escapeHtml(k)}</option>`).join('')}
            </select>
          </div>
          <div class="batch-mini-field">
            <label>&nbsp;</label>
            <label class="checkbox-label" style="padding:7px 9px;height:auto;">
              <input type="checkbox" data-batch-checkbox="sparkling" data-index="${i}" ${b.sparkling ? 'checked' : ''}>
              Sparkling
            </label>
          </div>
        </div>
        <div class="batch-mini-field">
          <label>Classification</label>
          <select data-batch-field="classification" data-index="${i}">
            ${classificationOptions.map((k) => `<option ${b.classification === k ? 'selected' : ''}>${escapeHtml(k)}</option>`).join('')}
          </select>
        </div>
        <div class="batch-mini-field">
          <label>Notes (optional)</label>
          <input data-batch-field="notes" data-index="${i}" placeholder="e.g. gift from John" value="${escapeHtml(b.notes || '')}">
        </div>
      </div>`;
    })
    .join('');

  return `
    <div class="modal-backdrop" data-action="backdrop-close-batch">
      <div class="modal">
        <h3>Review wines (${ui.batchItems.length})</h3>
        ${photoPreviewStripHTML(ui.photoPreviews)}
        ${rows}
        <div class="modal-actions">
          <button class="btn-secondary" data-action="close-batch">Cancel</button>
          <button class="btn-primary" data-action="submit-batch" ${ui.batchItems.length === 0 ? 'disabled' : ''}>Add all</button>
        </div>
      </div>
    </div>`;
}
