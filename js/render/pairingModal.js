import { escapeHtml } from '../utils.js';

export function pairingModalHTML(ui, state) {
  if (!ui.pairingModalOpen) return '';
  const status = ui.pairingStatus;
  const statusHTML = status ? `<div class="import-status ${status.state}">${escapeHtml(status.message)}</div>` : '';
  const busy = !!(status && status.state === 'busy');

  const resultsHTML = (ui.pairingResults || [])
    .map((m) => {
      const wine = state.inventory.find((w) => w.id === m.id);
      if (!wine) return '';
      return `
        <button class="pairing-result" data-action="open-detail-from-pairing" data-id="${escapeHtml(wine.id)}">
          <div class="pairing-result-name">${escapeHtml(wine.name)}</div>
          <div class="wine-meta-domein">${escapeHtml(wine.estate)} · ${escapeHtml(wine.region)}, ${escapeHtml(wine.country)}</div>
          <p class="pairing-result-reason">${escapeHtml(m.reason)}</p>
        </button>`;
    })
    .join('');

  return `
    <div class="modal-backdrop" data-action="backdrop-close-pairing">
      <div class="modal">
        <h3>Which wine goes with this?</h3>
        <p class="photo-upload-hint" style="margin:0 0 14px;">Type a dish — Claude finds the best-matching wine from your own inventory.</p>
        <div class="field">
          <label>Dish</label>
          <input id="pairing-input" placeholder="e.g. mussels, grilled salmon, cheese fondue…" value="${escapeHtml(ui.pairingQuery || '')}" ${busy ? 'disabled' : ''}>
        </div>
        <div class="modal-actions" style="margin-top:4px;">
          <button class="btn-secondary" data-action="close-pairing">Close</button>
          <button class="btn-primary" data-action="submit-pairing" ${busy ? 'disabled' : ''}>${busy ? 'Searching…' : 'Find a wine'}</button>
        </div>
        ${statusHTML}
        ${resultsHTML ? `<div class="pairing-results">${resultsHTML}</div>` : ''}
      </div>
    </div>`;
}
