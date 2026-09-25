import { DEFAULT_WINES } from './data/seedWines.js';
import { generateId } from './utils.js';
import { normalizeRegionPlace } from './model.js';
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

// Local changes the server hasn't confirmed yet. While this is set, a refresh
// must not pull server data over them — it pushes them up instead.
const DIRTY_KEY = 'winecellar-dirty';
let dirty = readDirtyFlag();
let syncsInFlight = 0;

function readDirtyFlag() {
  try {
    return localStorage.getItem(DIRTY_KEY) === '1';
  } catch (e) {
    return false;
  }
}

function setDirty(value) {
  dirty = value;
  try {
    if (value) localStorage.setItem(DIRTY_KEY, '1');
    else localStorage.removeItem(DIRTY_KEY);
  } catch (e) {
    /* ignore */
  }
}

// Sync to the shared store (Vercel KV). Until a KV store is connected (503)
// or while offline, the app keeps working on localStorage alone and retries
// on the next refresh.
async function syncToServer() {
  setDirty(true);
  syncsInFlight++;
  try {
    const res = await fetch(API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ inventory: state.inventory, history: state.history, ownerName: state.ownerName }),
    });
    // Only the most recent PUT may clear the flag — an older one finishing
    // late doesn't prove the newest change arrived.
    if (res.ok && syncsInFlight === 1) setDirty(false);
  } catch (e) {
    /* offline — local storage remains the source of truth for now */
  } finally {
    syncsInFlight--;
  }
}

function isEmptyRemote(remote) {
  return remote.inventory.length === 0 && (remote.history || []).length === 0;
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
  await loadStateFromSources();
  if (migrateInventory()) persist();
}

// Brings every wine in line with the current region rules: split
// "Loire (Sancerre)" / "Bourgogne Tonnerre" into region + place, map
// "Burgundy" to Bourgogne, etc. Idempotent, so it only writes (and syncs)
// when a wine actually changes — e.g. data saved by an older app version.
function migrateInventory() {
  let changed = false;
  state.inventory.forEach((w) => {
    const { region, place } = normalizeRegionPlace(w.region, w.place, w.country);
    if (w.region === region && w.place === place) return;
    w.region = region;
    w.place = place;
    changed = true;
  });
  // A region we navigated into may have been renamed.
  if (changed && state.nav && state.nav.level !== 'country') {
    state.nav = { level: 'country', country: null, region: null, estate: null };
  }
  return changed;
}

async function loadStateFromSources() {
  const hadLocal = loadLocal();

  try {
    const res = await fetch(API_URL, { headers: authHeaders() });
    if (res.ok) {
      const remote = await res.json();
      if (remote && Array.isArray(remote.inventory)) {
        const localHasData = hadLocal && (state.inventory.length > 0 || state.history.length > 0);
        if (localHasData && (isEmptyRemote(remote) || dirty)) {
          // Server is (still) empty, or we have unsynced local changes —
          // push ours up instead of blindly wiping our own inventory.
          syncToServer();
        } else {
          applyRemote(remote);
        }
        return;
      }
      if (remote === null && hadLocal) {
        // KV is connected but has never been written: seed it from local data.
        syncToServer();
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

function applyRemote(remote) {
  state.inventory = remote.inventory;
  state.history = remote.history || [];
  state.ownerName = remote.ownerName || '';
  saveLocal();
}

// Refreshes inventory/history from the server (e.g. after changes made by a
// partner). Returns true if something changed, so the UI can re-render.
// Leaves UI state (nav, search query, open modals) untouched.
export async function refreshFromServer() {
  if (syncsInFlight > 0) return false; // our own write is still on its way
  if (dirty) {
    // A previous sync failed (offline, KV hiccup): retry pushing instead of
    // pulling the older server copy over our changes.
    syncToServer();
    return false;
  }
  try {
    const res = await fetch(API_URL, { headers: authHeaders() });
    if (!res.ok) return false;
    const remote = await res.json();
    if (!remote || !Array.isArray(remote.inventory)) return false;
    if (syncsInFlight > 0 || dirty) return false; // a local change happened meanwhile
    if (isEmptyRemote(remote) && (state.inventory.length > 0 || state.history.length > 0)) {
      // Never let an empty server response wipe a filled local inventory.
      syncToServer();
      return false;
    }
    const changed =
      JSON.stringify(remote.inventory) !== JSON.stringify(state.inventory) ||
      JSON.stringify(remote.history || []) !== JSON.stringify(state.history) ||
      (remote.ownerName || '') !== (state.ownerName || '');
    if (changed) {
      applyRemote(remote);
      // Data written by a device still on an older version of the app.
      if (migrateInventory()) persist();
    }
    return changed;
  } catch (e) {
    return false;
  }
}

function normalizeWine(w) {
  return {
    ...w,
    ...normalizeRegionPlace(w.region, w.place, w.country),
    country: String(w.country || '').trim() || 'Unknown',
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

export function setNav(level, country, region, estate, place) {
  state.nav = { level, country: country || null, region: region || null, estate: estate || null, place: place || null };
}

export function setOwnerName(name) {
  state.ownerName = (name || '').trim();
  persist();
}
