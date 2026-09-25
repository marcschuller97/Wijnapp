import { state, loadState, refreshFromServer, adjustCount, markDrunk, addWine, updateWine, deleteWine, resetData, setNav, setOwnerName } from './state.js';
import { sumBottles, escapeHtml } from './utils.js';
import { ripeningInfo } from './model.js';
import { renderVoorraad } from './render/voorraad.js';
import { renderRecentlyAdded } from './render/recentlyAdded.js';
import { renderDrinkSoon } from './render/binnenkort.js';
import { renderHistory } from './render/historie.js';
import { renderByPrice } from './render/byPrice.js';
import { modalHTML } from './render/modal.js';
import { batchModalHTML } from './render/batchModal.js';
import { renderWineDetail } from './render/wineDetail.js';
import { pairingModalHTML } from './render/pairingModal.js';
import { toDraftItem } from './wineDraft.js';
import { recognizeFromPhotos } from './photoRecognize.js';
import { findWinePairing } from './winePairing.js';
import { enrichWine } from './wineEnrich.js';
import { ensureUnlocked } from './auth.js';

const ui = {
  activeTab: 'stock',
  colorFilter: 'All',
  sortBy: 'name',
  searchQuery: '',
  modalOpen: false,
  modalMode: 'add', // 'add' | 'edit'
  editingId: null,
  formDraft: {},
  photoStatus: null,
  photoPreviews: [],
  batchModalOpen: false,
  batchItems: [],
  detailId: null,
  pairingModalOpen: false,
  pairingQuery: '',
  pairingStatus: null,
  pairingResults: [],
  enrichStatus: null, // { id, state: 'busy' | 'ok' | 'err', message } for the detail screen
};

const appEl = document.getElementById('app');

function totalBottles() {
  return sumBottles(state.inventory);
}
function urgentCount() {
  return state.inventory.filter((w) => ripeningInfo(w).status !== 'Can still wait').length;
}
function totalValue() {
  return state.inventory.reduce((sum, w) => sum + w.quantity * Number(w.price || 0), 0);
}

function render() {
  const focused = document.activeElement;
  const preserveSearch = focused && focused.id === 'search-input';
  const selStart = preserveSearch ? focused.selectionStart : null;
  const selEnd = preserveSearch ? focused.selectionEnd : null;

  const total = totalBottles();
  const urgent = urgentCount();
  const value = totalValue();
  const valueLabel = value >= 1000 ? `€${(value / 1000).toFixed(1)}k` : `€${value.toFixed(0)}`;

  appEl.innerHTML = `
    <div class="header">
      <p class="eyebrow">Wine Collection</p>
      <h1 class="title">Wine Cellar</h1>
      <button class="owner-line" data-action="edit-owner">
        ${state.ownerName ? `by ${escapeHtml(state.ownerName)}` : '+ add a name'}
        <span class="owner-edit-icon">&#9998;</span>
      </button>
      <p class="subtitle">Stock, ripeness, and what to open next</p>
      <div class="hairline"></div>
      <div class="stat-row">
        <div class="stat">
          <div class="stat-num">${total}</div>
          <div class="stat-label">bottles in stock</div>
        </div>
        <div class="stat urgent-stat">
          <div class="stat-num">${urgent}</div>
          <div class="stat-label">need attention</div>
        </div>
        <button class="stat" data-action="show-by-price">
          <div class="stat-num">${valueLabel}</div>
          <div class="stat-label">cellar value <span class="stat-chevron">&rsaquo;</span></div>
        </button>
      </div>
      <button class="pairing-cta" data-action="open-pairing">
        <span class="pairing-cta-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v7a2 2 0 0 0 4 0V2M10 9v13M16 2c-1.3 1.4-2 3-2 5.5S14.7 11 16 11v11"/></svg>
        </span>
        <span class="pairing-cta-text">
          <span class="pairing-cta-title">Which wine goes with this?</span>
          <span class="pairing-cta-sub">Pick a dish, Claude finds the match from your stock</span>
        </span>
        <span class="chevron">&rsaquo;</span>
      </button>
    </div>

    <div class="tabs">
      <button class="tab-add-btn" data-action="go-home" title="Back to home">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9a1 1 0 0 0 1 1H9v-5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v5h2.5a1 1 0 0 0 1-1v-9"/></svg>
      </button>
      <div class="tab-scroll">
        <button class="tab-btn ${ui.activeTab === 'stock' ? 'active' : ''}" data-action="set-tab" data-tab="stock">Stock</button>
        <button class="tab-btn ${ui.activeTab === 'recent' ? 'active' : ''}" data-action="set-tab" data-tab="recent">Recently added</button>
        <button class="tab-btn ${ui.activeTab === 'soon' ? 'active' : ''}" data-action="set-tab" data-tab="soon">Drink soon</button>
        <button class="tab-btn ${ui.activeTab === 'history' ? 'active' : ''}" data-action="set-tab" data-tab="history">History</button>
      </div>
      <button class="tab-add-btn primary" data-action="open-modal" title="Add wine">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
      </button>
    </div>

    <div class="content">
      ${
        ui.detailId
          ? renderWineDetail(state.inventory.find((w) => w.id === ui.detailId), ui.enrichStatus)
          : `
        ${ui.activeTab === 'stock' ? renderVoorraad(state, ui.searchQuery, ui.colorFilter, ui.sortBy) : ''}
        ${ui.activeTab === 'recent' ? renderRecentlyAdded(state) : ''}
        ${ui.activeTab === 'soon' ? renderDrinkSoon(state) : ''}
        ${ui.activeTab === 'history' ? renderHistory(state) : ''}
        ${ui.activeTab === 'price' ? renderByPrice(state, ui.colorFilter) : ''}
      `
      }
    </div>

    ${
      !ui.detailId
        ? `
    <div class="footer-note">
      <button class="export-btn" data-action="export-csv">&#8681; Export inventory to CSV</button>
      <button data-action="reset-data">Reset to original inventory</button>
    </div>
    `
        : ''
    }

    ${modalHTML(ui, state)}
    ${batchModalHTML(ui)}
    ${pairingModalHTML(ui, state)}
  `;

  if (preserveSearch) {
    const el = document.getElementById('search-input');
    if (el) {
      el.focus();
      try {
        el.setSelectionRange(selStart, selEnd);
      } catch (e) {
        /* ignore */
      }
    }
  }

  const activeTabEl = appEl.querySelector('.tab-btn.active');
  if (activeTabEl) {
    activeTabEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}

function clearPhotoPreviews() {
  ui.photoPreviews.forEach((url) => URL.revokeObjectURL(url));
  ui.photoPreviews = [];
}

function openAddModal() {
  ui.modalMode = 'add';
  ui.editingId = null;
  ui.formDraft = {};
  ui.photoStatus = null;
  clearPhotoPreviews();
  ui.modalOpen = true;
  render();
}

function openEditModal(id) {
  ui.modalMode = 'edit';
  ui.editingId = id;
  ui.modalOpen = true;
  render();
}

function closeModal() {
  ui.modalOpen = false;
  ui.modalMode = 'add';
  ui.editingId = null;
  clearPhotoPreviews();
  render();
}

function closeBatch() {
  ui.batchModalOpen = false;
  ui.batchItems = [];
  clearPhotoPreviews();
  render();
}

function openPairingModal() {
  ui.pairingModalOpen = true;
  ui.pairingQuery = '';
  ui.pairingStatus = null;
  ui.pairingResults = [];
  render();
}

function closePairingModal() {
  ui.pairingModalOpen = false;
  ui.pairingStatus = null;
  ui.pairingResults = [];
  render();
}

async function handlePairingSubmit() {
  const inputEl = document.getElementById('pairing-input');
  const dish = inputEl ? inputEl.value.trim() : '';
  if (!dish) return;
  ui.pairingQuery = dish;
  ui.pairingResults = [];
  ui.pairingStatus = { state: 'busy', message: 'Claude is looking for a matching wine…' };
  render();
  try {
    const matches = await findWinePairing(dish, state.inventory);
    if (matches.length === 0) {
      ui.pairingStatus = { state: 'err', message: 'No matching wine found in your inventory for this dish.' };
    } else {
      ui.pairingStatus = null;
    }
    ui.pairingResults = matches;
  } catch (e) {
    ui.pairingStatus = { state: 'err', message: e.message };
  }
  render();
}

function submitWine() {
  const country = document.getElementById('f-country').value.trim() || 'Germany';
  const region = document.getElementById('f-region').value.trim() || 'Ahr';
  const estate = document.getElementById('f-estate').value.trim();
  const name = document.getElementById('f-name').value.trim();
  const vintage = document.getElementById('f-vintage').value;
  const quantity = document.getElementById('f-quantity').value;
  const grapeVariety = document.getElementById('f-grape').value.trim();
  const color = document.getElementById('f-color').value;
  const sparkling = document.getElementById('f-sparkling').checked;
  const classification = document.getElementById('f-classification').value;
  const price = document.getElementById('f-price').value;
  const notes = document.getElementById('f-notes').value.trim();

  if (!estate || !name || !vintage) {
    alert('Please fill in at least the estate, name, and vintage.');
    return;
  }

  const wine = { country, region, estate, name, vintage, grapeVariety, color, sparkling, classification, quantity, price, notes };
  if (ui.modalMode === 'edit') {
    updateWine(ui.editingId, wine);
  } else {
    const { wine: added, isNew } = addWine(wine);
    if (isNew && !added.description) {
      enrichWineAsync(added.id);
    }
  }
  closeModal();
}

function applyEnrichment(id, data) {
  const wine = state.inventory.find((w) => w.id === id);
  if (!wine) return;
  const updates = {};
  // Keep existing info when a new lookup comes back emptier.
  if (data.description) updates.description = data.description;
  if (data.flavorProfile && data.flavorProfile.length) updates.flavorProfile = data.flavorProfile;
  // Never overwrite a price the user entered (e.g. from a receipt)...
  if ((!wine.price || Number(wine.price) === 0) && data.estimatedPrice > 0) {
    updates.price = data.estimatedPrice;
  }
  // ...but a corrected grape/region always wins: the photo reading is the
  // unreliable one.
  if (data.grapeVariety) updates.grapeVariety = data.grapeVariety;
  if (data.region) updates.region = data.region;
  updateWine(id, updates);
}

// Best-effort background task for a newly added wine. Doesn't interrupt the
// add flow; if it fails, the detail screen's "Look up" button can retry and
// shows the reason.
async function enrichWineAsync(id) {
  const wine = state.inventory.find((w) => w.id === id);
  if (!wine) return;
  const { data, error } = await enrichWine(wine);
  if (error) {
    console.warn('Background lookup failed:', error);
    return;
  }
  if (!data) return;
  applyEnrichment(id, data);
  render();
}

// Foreground lookup from the detail screen, with visible progress and errors.
async function enrichFromDetail(id) {
  const wine = state.inventory.find((w) => w.id === id);
  if (!wine || (ui.enrichStatus && ui.enrichStatus.state === 'busy')) return;
  ui.enrichStatus = { id, state: 'busy', message: 'Searching the web for this wine… (can take up to a minute)' };
  render();
  const { data, error } = await enrichWine(wine);
  if (error) {
    ui.enrichStatus = { id, state: 'err', message: error };
  } else if (!data) {
    ui.enrichStatus = { id, state: 'err', message: 'Nothing reliable found online for this wine.' };
  } else {
    const hadPrice = Number(wine.price) > 0;
    applyEnrichment(id, data);
    const priceNote = hadPrice
      ? ' Your own price was kept.'
      : data.estimatedPrice > 0
        ? ` Estimated price: €${data.estimatedPrice.toFixed(2)}.`
        : ' No price found.';
    ui.enrichStatus = { id, state: 'ok', message: `Info updated.${priceNote}` };
  }
  render();
}

async function handlePhotoFiles(files, mode) {
  clearPhotoPreviews();
  ui.photoPreviews = Array.from(files).map((f) => URL.createObjectURL(f));
  ui.photoStatus = { state: 'busy', message: mode === 'receipt' ? 'Reading receipt…' : 'Recognizing photos…' };
  render();
  try {
    const items = await recognizeFromPhotos(files, mode);
    ui.photoStatus = null;
    ui.batchItems = items.map(toDraftItem);
    ui.modalOpen = false;
    ui.batchModalOpen = true;
  } catch (e) {
    ui.photoStatus = { state: 'err', message: e.message };
  }
  render();
}

function exportCSV() {
  const header = ['Country', 'Region', 'Estate', 'Name', 'Vintage', 'Grape Variety', 'Classification', 'Quantity', 'Price per bottle', 'Total'];
  const rows = state.inventory.map((w) => [
    w.country,
    w.region,
    w.estate,
    w.name,
    w.vintage,
    w.grapeVariety,
    w.classification,
    w.quantity,
    Number(w.price).toFixed(2),
    (w.quantity * Number(w.price)).toFixed(2),
  ]);
  const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wine-inventory-export-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

appEl.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;

  if (action === 'backdrop-close' || action === 'backdrop-close-batch' || action === 'backdrop-close-pairing') {
    if (e.target !== el) return; // click landed inside the modal, not on the backdrop itself
  }

  switch (action) {
    case 'set-tab':
      ui.activeTab = el.dataset.tab;
      ui.detailId = null;
      render();
      break;
    case 'nav':
      ui.detailId = null;
      setNav(el.dataset.level, el.dataset.country, el.dataset.region, el.dataset.estate);
      render();
      break;
    case 'adjust':
      adjustCount(el.dataset.id, Number(el.dataset.delta));
      render();
      break;
    case 'drink':
      markDrunk(el.dataset.id);
      render();
      break;
    case 'go-home':
      ui.activeTab = 'stock';
      ui.searchQuery = '';
      ui.colorFilter = 'All';
      ui.detailId = null;
      setNav('country');
      render();
      break;
    case 'show-by-price':
      ui.activeTab = 'price';
      ui.colorFilter = 'All';
      ui.searchQuery = '';
      ui.detailId = null;
      render();
      break;
    case 'set-color-filter':
      ui.colorFilter = el.dataset.color;
      render();
      break;
    case 'set-sort':
      ui.sortBy = el.dataset.sort;
      render();
      break;
    case 'edit-owner': {
      const name = window.prompt('Whose cellar is this?', state.ownerName || '');
      if (name !== null) {
        setOwnerName(name);
        render();
      }
      break;
    }
    case 'open-modal':
      openAddModal();
      break;
    case 'open-edit':
      openEditModal(el.dataset.id);
      break;
    case 'enrich-wine':
      enrichFromDetail(el.dataset.id);
      break;
    case 'open-detail':
      ui.detailId = el.dataset.id;
      if (!ui.enrichStatus || ui.enrichStatus.state !== 'busy') ui.enrichStatus = null;
      render();
      break;
    case 'close-detail':
      ui.detailId = null;
      render();
      break;
    case 'close-modal':
    case 'backdrop-close':
      closeModal();
      break;
    case 'submit-wine':
      submitWine();
      break;
    case 'delete-wine':
      if (confirm('Delete this wine from your inventory completely?')) {
        deleteWine(el.dataset.id);
        ui.detailId = null;
        closeModal();
      }
      break;
    case 'export-csv':
      exportCSV();
      break;
    case 'reset-data':
      if (confirm('Are you sure you want to reset your inventory to the original list? History will also be cleared.')) {
        resetData();
        render();
      }
      break;
    case 'remove-batch-item':
      ui.batchItems.splice(Number(el.dataset.index), 1);
      render();
      break;
    case 'close-batch':
    case 'backdrop-close-batch':
      closeBatch();
      break;
    case 'submit-batch':
      ui.batchItems.forEach((b) => {
        if (!b.estate || !b.name) return;
        const { wine: added, isNew } = addWine(b);
        if (isNew && !added.description) {
          enrichWineAsync(added.id);
        }
      });
      closeBatch();
      break;
    case 'open-pairing':
      openPairingModal();
      break;
    case 'close-pairing':
    case 'backdrop-close-pairing':
      closePairingModal();
      break;
    case 'submit-pairing':
      handlePairingSubmit();
      break;
    case 'open-detail-from-pairing':
      ui.pairingModalOpen = false;
      ui.pairingResults = [];
      ui.pairingStatus = null;
      ui.detailId = el.dataset.id;
      render();
      break;
    default:
      break;
  }
});

appEl.addEventListener('input', (e) => {
  if (e.target.id === 'search-input') {
    ui.searchQuery = e.target.value;
    render();
    return;
  }
  if (e.target.dataset && e.target.dataset.batchField) {
    const idx = Number(e.target.dataset.index);
    ui.batchItems[idx][e.target.dataset.batchField] = e.target.value;
    return;
  }
  if (e.target.dataset && e.target.dataset.batchCheckbox) {
    const idx = Number(e.target.dataset.index);
    ui.batchItems[idx][e.target.dataset.batchCheckbox] = e.target.checked;
  }
});

appEl.addEventListener('change', (e) => {
  if (e.target.type === 'file' && e.target.dataset.photoMode) {
    // Snapshot as a plain array before clearing .value — some browsers
    // reuse the same live FileList instance, so clearing .value empties
    // it in place and a captured reference would see 0 files too.
    const files = Array.from(e.target.files || []);
    const mode = e.target.dataset.photoMode;
    e.target.value = '';
    if (files.length > 0) {
      handlePhotoFiles(files, mode);
    }
  }
});

appEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.id === 'pairing-input') {
    e.preventDefault();
    handlePairingSubmit();
  }
});

(async function init() {
  await ensureUnlocked(appEl);
  await loadState();
  render();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* not a problem, e.g. during local testing */
    });
  }

  // Refresh the inventory when the app comes back into view or after being
  // open for a while, so changes from a partner trickle in.
  const maybeRefresh = () => {
    if (document.visibilityState !== 'visible') return;
    refreshFromServer().then((changed) => {
      if (changed) render();
    });
  };
  document.addEventListener('visibilitychange', maybeRefresh);
  setInterval(maybeRefresh, 15000);
})();
