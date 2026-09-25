import { canonicalRegion, appellationInfo, regionKey } from './data/regions.js';

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
 * "Bourgogne - Meursault", "Pauillac, Bordeaux", bare appellations
 * ("Sancerre" → Loire) and English names ("Burgundy" → Bourgogne).
 * Unknown names are left as they are.
 */
export function normalizeRegionPlace(region, place) {
  let r = String(region || '').trim();
  let p = String(place || '').trim();

  if (!p) {
    const paren = r.match(/^(.+?)\s*\((.+)\)\s*$/);
    const parts = paren ? [paren[1], paren[2]] : r.split(/\s+[-–—\/]\s+|\s*,\s*/).filter(Boolean);
    if (parts.length === 2) {
      const [a, b] = parts;
      if (canonicalRegion(a) || (!canonicalRegion(b) && appellationInfo(b))) {
        r = a;
        p = b;
      } else if (canonicalRegion(b) || appellationInfo(a)) {
        r = b;
        p = a;
      }
    }
  }

  const canonical = canonicalRegion(r);
  if (canonical) {
    r = canonical;
  } else {
    const app = appellationInfo(r);
    if (app) {
      if (!p || regionKey(p) === regionKey(r)) p = app.place;
      r = app.region;
    }
  }
  // The place shouldn't just repeat the region.
  if (p && regionKey(p) === regionKey(r)) p = '';
  return { region: r, place: p };
}
