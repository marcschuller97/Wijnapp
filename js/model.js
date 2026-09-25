import { canonicalRegion, appellationInfo, regionKey, regionPrefix, isCountryName } from './data/regions.js';

const CURRENT_YEAR = new Date().getFullYear();

function classify(classification, name) {
  const s = `${classification} ${name}`.toLowerCase();
  if (s.includes('blanc de noir') || s.includes('rosé') || s.includes('rose')) {
    return { label: 'Drink young', min: 0, max: 3 };
  }
  if (s.includes('grosses gewächs') || s.includes('grosse lage') || s.includes(' gg')) {
    return { label: 'Top wine, ages well', min: 4, max: 12 };
  }
  if (s.includes('ortswein')) {
    return { label: 'Medium term', min: 2, max: 8 };
  }
  if (s.includes('gutswein') || s.includes('q.b.a') || s.includes('qualitätswein') || s.includes('not specified')) {
    return { label: 'Can safely wait 5 years', min: 2, max: 5 };
  }
  return { label: 'Unknown, estimate', min: 2, max: 5 };
}

export function ripeningInfo(wine) {
  const c = classify(wine.classification, wine.name);
  const age = CURRENT_YEAR - wine.vintage;
  const progress = Math.max(0, Math.min(1, age / c.max));
  const drinkByYear = wine.vintage + c.max;
  let status;
  let statusColor;
  if (age >= c.max) {
    status = 'Drink now';
    statusColor = 'var(--urgent)';
  } else if (age >= c.max * 0.7) {
    status = 'Soon';
    statusColor = 'var(--warn)';
  } else {
    status = 'Can still wait';
    statusColor = 'var(--ok)';
  }
  return { ...c, age, progress, drinkByYear, status, color: statusColor };
}

// ---------- Grapes ----------


// Same grape, different name per country — filtering on one finds the others.
const GRAPE_SYNONYMS = {
  spatburgunder: 'Pinot Noir',
  blauburgunder: 'Pinot Noir',
  'pinot nero': 'Pinot Noir',
  grauburgunder: 'Pinot Gris',
  'pinot grigio': 'Pinot Gris',
  weissburgunder: 'Pinot Blanc',
  weißburgunder: 'Pinot Blanc',
  'pinot bianco': 'Pinot Blanc',
  garnacha: 'Grenache',
  cannonau: 'Grenache',
  shiraz: 'Syrah',
  monastrell: 'Mourvèdre',
  mataro: 'Mourvèdre',
  'tinta roriz': 'Tempranillo',
  'tinto fino': 'Tempranillo',
  'tinta de toro': 'Tempranillo',
  'sauvignon': 'Sauvignon Blanc',
  'blanc fume': 'Sauvignon Blanc',
  'grüner veltliner': 'Grüner Veltliner',
  'gruner veltliner': 'Grüner Veltliner',
};

// Words that describe a blend rather than name a grape ("Champagne blend").
const NOT_A_GRAPE = /\b(blend|cuv[ée]e|assemblage|not stated|unknown|onbekend|various|others?|and others)\b/i;

function titleCase(s) {
  return s.replace(/(^|[\s-])(\p{L})/gu, (m, sep, ch) => sep + ch.toUpperCase());
}

/**
 * Splits a grape field into individual grapes, so "Merlot 60%, Cabernet
 * Franc (40%)" or "Grenache/Syrah & Mourvèdre" become separate entries.
 * Returns [{ key, label }] with synonyms mapped to one international name.
 */
export function parseGrapes(grapeVariety) {
  const seen = new Set();
  return String(grapeVariety || '')
    .split(/,|;|\/|&|\+|\band\b|\bund\b|\bet\b|\ben\b|\by\b|\be\b/i)
    .map((part) =>
      part
        .replace(/\(.*?\)/g, ' ')
        .replace(/\d+([.,]\d+)?\s*%/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter((part) => part.length > 1 && !NOT_A_GRAPE.test(part))
    .map((part) => {
      const simple = part.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const label = GRAPE_SYNONYMS[part.toLowerCase()] || GRAPE_SYNONYMS[simple] || titleCase(part.toLowerCase());
      return { key: regionKey(label), label };
    })
    .filter((g) => !seen.has(g.key) && seen.add(g.key));
}

export function hasGrape(wine, grapeKey) {
  return parseGrapes(wine.grapeVariety).some((g) => g.key === grapeKey);
}

// ---------- Region / place ----------

/**
 * Keeps Region to the broad wine region ("Bourgogne", "Champagne") and moves
 * the village/appellation to Place. Handles "Loire (Sancerre)",
 * "Bourgogne - Meursault", "Chablis, Burgundy, France",
 * "Bourgogne Côtes d'Auxerre", bare appellations ("Sancerre" → Loire) and
 * English names ("Burgundy" → Bourgogne). A place the user already set is
 * kept. Unknown names are left as they are. Idempotent.
 */
export function normalizeRegionPlace(region, place, country) {
  const raw = String(region || '').trim();
  let p = String(place || '').trim();

  const paren = raw.match(/^(.+?)\s*\((.+)\)\s*$/);
  const parts = (paren ? [paren[1], paren[2]] : raw.split(/\s+[-–—\/]\s+|\s*,\s*/))
    .map((x) => x.trim())
    .filter((x) => x && !isCountryName(x, country));

  let found = null;
  const rest = [];
  parts.forEach((part) => {
    const canonical = canonicalRegion(part);
    if (canonical && !found) {
      found = canonical;
      return;
    }
    // A full appellation name wins over a prefix split ("Bordeaux Supérieur").
    const app = appellationInfo(part);
    const prefix = !app && regionPrefix(part);
    if (prefix && !found) {
      found = prefix.region;
      rest.push(prefix.rest);
      return;
    }
    rest.push(part);
  });
  if (!found) {
    const app = rest.map(appellationInfo).find(Boolean);
    if (app) found = app.region;
  }

  let r;
  if (found) {
    r = found;
    if (!p && rest.length) {
      const app = appellationInfo(rest[0]);
      p = app ? app.place : rest[0];
    }
  } else {
    r = parts.join(', ');
  }

  // "Bourgogne Tonnerre" as place under region Bourgogne → "Tonnerre".
  if (p && r) {
    const pre = regionPrefix(p);
    if (pre && pre.region === r && !appellationInfo(p)) p = pre.rest;
  }
  if (p && regionKey(p) === regionKey(r)) p = '';
  return { region: r, place: p };
}
