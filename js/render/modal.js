import { escapeHtml } from '../utils.js';

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

export const COLOR_OPTIONS = ['White', 'Rosé', 'Red'];

function classificationSelectHTML(current) {
  const options = [...CLASSIFICATION_OPTIONS];
  if (current && !options.includes(current)) options.push(current);
  return options.map((k) => `<option ${current === k ? 'selected' : ''}>${escapeHtml(k)}</option>`).join('');
}

function colorSelectHTML(current) {
  return COLOR_OPTIONS.map((k) => `<option ${current === k ? 'selected' : ''}>${escapeHtml(k)}</option>`).join('');
}

function photoPreviewStripHTML(previews) {
  if (!previews || previews.length === 0) return '';
  return `<div class="photo-preview-strip">${previews.map((url) => `<img class="photo-preview-thumb" src="${url}" alt="">`).join('')}</div>`;
}

function photoUploadHTML(ui) {
  const status = ui.photoStatus;
  const statusHTML = status ? `<div class="import-status ${status.state}">${escapeHtml(status.message)}</div>` : '';
  const busy = !!(status && status.state === 'busy');
  return `
    <div class="photo-upload-box">
      <div class="photo-upload-row">
        <label class="photo-upload-btn ${busy ? 'disabled' : ''}">
          &#128247; Photo(s) of bottle(s)
          <input type="file" accept="image/*" multiple data-photo-mode="label" ${busy ? 'disabled' : ''}>
        </label>
        <label class="photo-upload-btn ${busy ? 'disabled' : ''}">
          &#129534; Photo of receipt
          <input type="file" accept="image/*" multiple data-photo-mode="receipt" ${busy ? 'disabled' : ''}>
        </label>
      </div>
      <p class="photo-upload-hint">Choose one or more photos — Claude recognizes the wine(s) automatically.</p>
      ${photoPreviewStripHTML(ui.photoPreviews)}
      ${statusHTML}
    </div>
    <div class="divider-or">or fill in manually</div>`;
}

export function modalHTML(ui, state) {
  if (!ui.modalOpen) return '';
  const isEdit = ui.modalMode === 'edit';
  const item = isEdit ? state.inventory.find((x) => x.id === ui.editingId) : null;
  if (isEdit && !item) return '';

  const f = ui.formDraft || {};
  const val = (key, fallback) => escapeHtml(isEdit ? item[key] : f[key] !== undefined ? f[key] : fallback);

  return `
    <div class="modal-backdrop" data-action="backdrop-close">
      <div class="modal">
        <h3>${isEdit ? 'Edit wine' : 'Add new wine'}</h3>

        ${!isEdit ? photoUploadHTML(ui) : ''}

        <div class="field-row">
          <div class="field">
            <label>Country</label>
            <input id="f-country" value="${val('country', 'Germany')}">
          </div>
          <div class="field">
            <label>Region</label>
            <input id="f-region" value="${val('region', 'Ahr')}">
          </div>
        </div>
        <div class="field">
          <label>Estate</label>
          <input id="f-estate" placeholder="e.g. Meyer-Näkel" value="${val('estate', '')}">
        </div>
        <div class="field">
          <label>Wine name</label>
          <input id="f-name" placeholder="e.g. Spätburgunder" value="${val('name', '')}">
        </div>
        <div class="field-row">
          <div class="field">
            <label>Vintage</label>
            <input id="f-vintage" type="number" placeholder="2024" value="${val('vintage', '')}">
          </div>
          <div class="field">
            <label>Quantity</label>
            <input id="f-quantity" type="number" value="${val('quantity', 1)}" min="0">
          </div>
        </div>
        <div class="field">
          <label>Grape variety</label>
          <input id="f-grape" placeholder="e.g. Spätburgunder" value="${val('grapeVariety', 'Spätburgunder')}">
        </div>
        <div class="field-row">
          <div class="field">
            <label>Color</label>
            <select id="f-color">
              ${colorSelectHTML(isEdit ? item.color : f.color || 'Red')}
            </select>
          </div>
          <div class="field checkbox-field">
            <label>&nbsp;</label>
            <label class="checkbox-label">
              <input type="checkbox" id="f-sparkling" ${(isEdit ? item.sparkling : f.sparkling) ? 'checked' : ''}>
              Sparkling
            </label>
          </div>
        </div>
        <div class="field">
          <label>Classification</label>
          <select id="f-classification">
            ${classificationSelectHTML(isEdit ? item.classification : f.classification)}
          </select>
        </div>
        <div class="field">
          <label>Price per bottle (€)</label>
          <input id="f-price" type="number" step="0.01" placeholder="15.00" value="${isEdit && item.price ? escapeHtml(item.price) : f.price || ''}">
        </div>
        <div class="field">
          <label>Notes (optional)</label>
          <textarea id="f-notes" placeholder="e.g. gift from John, bought while on holiday…">${val('notes', '')}</textarea>
        </div>
        <div class="modal-actions">
          ${isEdit ? `<button class="btn-secondary" data-action="delete-wine" data-id="${escapeHtml(item.id)}" style="color:var(--urgent);">Delete</button>` : `<button class="btn-secondary" data-action="close-modal">Cancel</button>`}
          <button class="btn-primary" data-action="submit-wine">${isEdit ? 'Save' : 'Add'}</button>
        </div>
        ${isEdit ? `<button class="btn-secondary" style="width:100%; margin-top:10px;" data-action="close-modal">Cancel</button>` : ''}
      </div>
    </div>`;
}
