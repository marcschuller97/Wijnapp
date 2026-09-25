import { DEFAULT_WINES } from './data/seedWines.js';
import { generateId } from './utils.js';
import { authHeaders } from './auth.js';

const STORAGE_KEY = 'winecellar-data';
const API_URL = '/api/inventory';

function freshState() {
  return {
    inventory: DEFAULT_WINES.map((w, i) => ({ id: 'w' + i, ...w })),
    history: [],
    nav: { level: 'country', country: null, region: null, estate: null },
    ownerName: '',
  };
}

export const state = freshState();
// Loaded lazily so a fresh install seeds from DEFAULT_WINES exactly once.
state.inventory = [];
state.history = [];
state.ownerName = '';

function saveLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Save failed (localStorage blocked)', e);
  }
}

// Fire-and-forget sync to the shared store (Vercel KV). Silently no-ops
// until a KV store is connected to the project — the app keeps working
// on localStorage alone until then.
function syncToServer() {
  fetch(API_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ inventory: state.inventory, history: state.history, ownerName: state.ownerName }),
  }).catch(() => {
    /* offline, or KV not connected yet — local storage remains the source of truth */
  });
}

function persist() {
  saveLocal();
  syncToServer();
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state.inventory = parsed.inventory || [];
      state.history = parsed.history || [];
      state.nav = parsed.nav || { level: 'country', country: null, region: null, estate: null };
      state.ownerName = parsed.ownerName || '';
      return true;
    }
  } catch (e) {
    console.error('Could not read saved inventory', e);
  }
  return false;
}

export async function loadState() {
  const hadLocal = loadLocal();

  try {
    const res = await fetch(API_URL, { headers: authHeaders() });
    if (res.ok) {
      const remote = await res.json();
      if (remote && Array.isArray(remote.inventory)) {
        const remoteIsEmpty = remote.inventory.length === 0 && (remote.history || []).length === 0;
        const localHasData = hadLocal && state.inventory.length > 0;
        if (remoteIsEmpty && localHasData) {
          // Server is (still) empty but we already have data — push it up
          // instead of blindly wiping our own inventory.
          syncToServer();
        } else {
          state.inventory = remote.inventory;
          state.history = remote.history || [];
          state.ownerName = remote.ownerName || state.ownerName || '';
          saveLocal();
        }
        return;
      }
    }
  } catch (e) {
    /* offline, or KV not connected yet — fall back to local/default data */
  }

  if (hadLocal) return;

  const seeded = freshState();
  state.inventory = seeded.inventory;
  state.history = seeded.history;
  state.nav = seeded.nav;
  persist();
}

// Refreshes inventory/history from the server (e.g. after changes made by a
// partner). Returns true if something changed, so the UI can re-render.
// Leaves UI state (nav, search query, open modals) untouched.
export async function refreshFromServer() {
  try {
    const res = await fetch(API_URL, { headers: authHeaders() });
    if (!res.ok) return false;
    const remote = await res.json();
    if (!remote || !Array.isArray(remote.inventory)) return false;
    const changed =
      JSON.stringify(remote.inventory) !== JSON.stringify(state.inventory) ||
      JSON.stringify(remote.history || []) !== JSON.stringify(state.history) ||
      (remote.ownerName || '') !== (state.ownerName || '');
    if (changed) {
      state.inventory = remote.inventory;
      state.history = remote.history || [];
      state.ownerName = remote.ownerName || '';
      saveLocal();
    }
    return changed;
  } catch (e) {
    return false;
  }
}

function normalizeWine(w) {
  return {
    ...w,
    quantity: Math.max(0, Number(w.quantity) || 0),
    price: Number(w.price) || 0,
    vintage: Number(w.vintage) || new Date().getFullYear(),
  };
}

export function adjustCount(id, delta) {
  const item = state.inventory.find((w) => w.id === id);
  if (!item) return;
  item.quantity = Math.max(0, item.quantity + delta);
  if (item.quantity === 0) {
    state.inventory = state.inventory.filter((w) => w.id !== id);
  }
  persist();
}

export function markDrunk(id) {
  const item = state.inventory.find((w) => w.id === id);
  if (!item || item.quantity <= 0) return;
  item.quantity -= 1;
  const dateStr = new Date().toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
  state.history.unshift({
    id: generateId('h'),
    estate: item.estate,
    name: item.name,
    vintage: item.vintage,
    date: dateStr,
  });
  if (item.quantity === 0) {
    state.inventory = state.inventory.filter((w) => w.id !== id);
  }
  persist();
}

export function addWine(rawWine) {
  const w = normalizeWine(rawWine);
  const existing = state.inventory.find(
    (x) =>
      x.country === w.country &&
      x.region === w.region &&
      x.estate === w.estate &&
      x.name.trim().toLowerCase() === (w.name || '').trim().toLowerCase() &&
      x.vintage === w.vintage
  );
  let result;
  if (existing) {
    existing.quantity += w.quantity;
    if ((!existing.price || existing.price === 0) && w.price) existing.price = w.price;
    if ((!existing.grapeVariety || existing.grapeVariety === '') && w.grapeVariety) existing.grapeVariety = w.grapeVariety;
    result = { wine: existing, isNew: false };
  } else {
    const created = { id: generateId('w'), ...w, addedAt: new Date().toISOString() };
    state.inventory.push(created);
    result = { wine: created, isNew: true };
  }
  persist();
  return result;
}

export function updateWine(id, updates) {
  const item = state.inventory.find((x) => x.id === id);
  if (!item) return;
  Object.assign(item, normalizeWine({ ...item, ...updates }));
  persist();
}

export function deleteWine(id) {
  state.inventory = state.inventory.filter((x) => x.id !== id);
  persist();
}

export function resetData() {
  const seeded = freshState();
  state.inventory = seeded.inventory;
  state.history = seeded.history;
  state.nav = seeded.nav;
  persist();
}

export function setNav(level, country, region, estate) {
  state.nav = { level, country: country || null, region: region || null, estate: estate || null };
}

export function setOwnerName(name) {
  state.ownerName = (name || '').trim();
  persist();
}
