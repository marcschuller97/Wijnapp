import { escapeHtml, uniqueSorted, sumBottles } from '../utils.js';
import { cardHTML } from './card.js';
import { countryDonutInnerHTML, otherCountries } from './pieChart.js';
import { colorSplitInnerHTML } from './colorSplit.js';
import { colorFilterRowHTML, grapeFilterHTML, matchesFilters } from './colorFilter.js';
import { ripeningInfo } from '../model.js';

const SORT_OPTIONS = [
  { key: 'name', label: 'A-Z' },
  { key: 'price', label: 'Price' },
  { key: 'drinkby', label: 'Drink by' },
];

export function sortByPrice(wines, priceDir) {
  const dir = priceDir === 'asc' ? 1 : -1;
  return wines.slice().sort((a, b) => dir * (Number(a.price || 0) - Number(b.price || 0)));
}

function sortWines(wines, sortBy, priceDir) {
  let sorted = wines.slice();
  if (sortBy === 'price') {
    sorted = sortByPrice(sorted, priceDir);
  } else if (sortBy === 'drinkby') {
    sorted.sort((a, b) => ripeningInfo(b).progress - ripeningInfo(a).progress);
  } else {
    sorted.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'en') || String(a.estate || '').localeCompare(String(b.estate || ''), 'en'));
  }
  return sorted;
}

// Tapping the active Price chip again flips the direction (↓ high→low, ↑ low→high).
function sortChipRowHTML(sortBy, priceDir) {
  const active = sortBy || 'name';
  const chips = SORT_OPTIONS.map((o) => {
    const arrow = o.key === 'price' && active === 'price' ? (priceDir === 'asc' ? ' &uarr;' : ' &darr;') : '';
    const title = o.key === 'price' && active === 'price' ? ` title="${priceDir === 'asc' ? 'Low to high' : 'High to low'} — tap to flip"` : '';
    return `<button class="sort-chip ${active === o.key ? 'active' : ''}" data-action="set-sort" data-sort="${o.key}"${title}>${escapeHtml(o.label)}${arrow}</button>`;
  }).join('');
  return `<div class="sort-chip-row"><span class="sort-chip-label">Sort</span>${chips}</div>`;
}

function dashboardHTML(inventory) {
  const country = countryDonutInnerHTML(inventory);
  if (!country) return '';
  const color = colorSplitInnerHTML(inventory);
  return `<div class="pie-section">${country}${color ? `<div class="pie-divider"></div>${color}` : ''}</div>`;
}

function searchBarHTML(searchQuery) {
  return `<input class="search-input" id="search-input" type="text" placeholder="Search name, estate, grape, region, color…" value="${escapeHtml(searchQuery)}">`;
}

function backBtnHTML(level, country, region) {
  return `<button class="back-btn" data-action="nav" data-level="${level}" data-country="${escapeHtml(country || '')}" data-region="${escapeHtml(region || '')}">&lsaquo; Back</button>`;
}

// Wines in a region without a village/appellation are grouped under this key.
const NO_PLACE = '__none__';
const placeLabel = (place) => (place === NO_PLACE ? 'Other / no village' : place);

function breadcrumbHTML(nav) {
  const parts = [{ label: 'All countries', level: 'country' }];
  if (nav.country) parts.push({ label: nav.country, level: 'region', country: nav.country });
  if (nav.region) parts.push({ label: nav.region || 'Unknown region', level: 'estate', country: nav.country, region: nav.region });
  if (nav.place) parts.push({ label: placeLabel(nav.place), level: null });
  if (nav.estate) parts.push({ label: nav.estate, level: null });

  return `<div class="breadcrumb">${parts
    .map((p, i) => {
      const isLast = i === parts.length - 1;
      const sep = i > 0 ? '<span class="sep">/</span>' : '';
      if (isLast || !p.level) {
        return `${sep}<span class="crumb current">${escapeHtml(p.label)}</span>`;
      }
      return `${sep}<button class="crumb" data-action="nav" data-level="${p.level}" data-country="${escapeHtml(p.country || '')}" data-region="${escapeHtml(p.region || '')}">${escapeHtml(p.label)}</button>`;
    })
    .join('')}</div>`;
}

function navItemHTML(label, list, attrs) {
  const data = Object.entries(attrs)
    .map(([k, v]) => `data-${k}="${escapeHtml(v || '')}"`)
    .join(' ');
  return `<button class="nav-item" data-action="nav" ${data}>
    <div>
      <div class="nav-item-name">${escapeHtml(label)}</div>
      <div class="nav-item-count">${sumBottles(list)} ${sumBottles(list) === 1 ? 'bottle' : 'bottles'}</div>
    </div>
    <div class="nav-item-right"><span class="chevron">&rsaquo;</span></div>
  </button>`;
}

const byName = (a, b) =>
  String(a.estate || '').localeCompare(String(b.estate || ''), 'en') || String(a.name || '').localeCompare(String(b.name || ''), 'en');

export function renderVoorraad(state, { searchQuery, colorFilter, grapeFilter, sortBy, priceDir }) {
  const bar = searchBarHTML(searchQuery);
  const inventory = state.inventory;

  if (searchQuery.trim() !== '') {
    const q = searchQuery.trim().toLowerCase();
    const fields = ['name', 'estate', 'grapeVariety', 'region', 'place', 'country', 'color', 'classification'];
    const matches = inventory.filter(
      (w) => fields.some((f) => String(w[f] || '').toLowerCase().includes(q)) || (q.startsWith('spark') && w.sparkling)
    );
    if (matches.length === 0) {
      return bar + `<div class="empty-state"><div class="glyph">&#128269;</div><p>No wines found for "${escapeHtml(searchQuery)}".</p></div>`;
    }
    return bar + matches.map((w) => cardHTML(w, true)).join('');
  }

  const nav = state.nav;
  if (inventory.length === 0) {
    return bar + `<div class="empty-state"><div class="glyph">&#127863;</div><p>No wines left in stock.</p></div>`;
  }

  if (nav.level === 'country') {
    const filter = colorFilter || 'All';
    const grape = grapeFilter || 'All';
    const filterRow = colorFilterRowHTML(inventory, filter) + grapeFilterHTML(inventory, grape, filter);

    if (filter !== 'All' || grape !== 'All') {
      const matches = sortWines(
        inventory.filter((w) => matchesFilters(w, filter, grape)),
        sortBy,
        priceDir
      );
      const list =
        matches.length === 0
          ? `<div class="empty-state"><div class="glyph">&#127863;</div><p>No wines in stock for this filter.</p></div>`
          : matches.map((w) => cardHTML(w, true)).join('');
      const sortRow = matches.length > 0 ? sortChipRowHTML(sortBy, priceDir) : '';
      return bar + dashboardHTML(inventory) + filterRow + sortRow + list;
    }

    const countries = uniqueSorted(inventory, 'country');
    const items = countries
      .map((country) => {
        const list = inventory.filter((w) => w.country === country);
        return `<button class="nav-item" data-action="nav" data-level="region" data-country="${escapeHtml(country)}">
          <div>
            <div class="nav-item-name">${escapeHtml(country)}</div>
            <div class="nav-item-count">${sumBottles(list)} bottles</div>
          </div>
          <div class="nav-item-right"><span class="chevron">&rsaquo;</span></div>
        </button>`;
      })
      .join('');
    return bar + dashboardHTML(inventory) + filterRow + `<div class="nav-list">${items}</div>`;
  }

  if (nav.level === 'other') {
    const countries = otherCountries(inventory);
    const items = countries
      .map((country) => {
        const list = inventory.filter((w) => w.country === country);
        return `<button class="nav-item" data-action="nav" data-level="region" data-country="${escapeHtml(country)}">
          <div>
            <div class="nav-item-name">${escapeHtml(country)}</div>
            <div class="nav-item-count">${sumBottles(list)} bottles</div>
          </div>
          <div class="nav-item-right"><span class="chevron">&rsaquo;</span></div>
        </button>`;
      })
      .join('');
    return (
      bar +
      backBtnHTML('country') +
      `<div class="domain-header">
        <div class="domain-name">Other countries</div>
      </div>
      <div class="nav-list">${items}</div>`
    );
  }

  if (nav.level === 'region') {
    const regions = uniqueSorted(inventory.filter((w) => w.country === nav.country), 'region');
    const items = regions
      .map((r) => navItemHTML(r || 'Unknown region', inventory.filter((w) => w.country === nav.country && w.region === r), { level: 'estate', country: nav.country, region: r }))
      .join('');
    return bar + backBtnHTML('country') + breadcrumbHTML(nav) + `<div class="nav-list">${items}</div>`;
  }

  if (nav.level === 'estate') {
    // Inside a region: drill down by village/appellation when the region has
    // any (Bourgogne → Chablis), otherwise by estate as before.
    const inRegion = inventory.filter((w) => w.country === nav.country && (w.region || '') === (nav.region || ''));
    const places = uniqueSorted(inRegion.filter((w) => w.place), 'place');
    const back = bar + backBtnHTML('region', nav.country) + breadcrumbHTML(nav);

    if (places.length > 0) {
      const withoutPlace = inRegion.filter((w) => !w.place);
      const items = places
        .map((pl) => navItemHTML(pl, inRegion.filter((w) => w.place === pl), { level: 'place', country: nav.country, region: nav.region, place: pl }))
        .join('');
      const other = withoutPlace.length
        ? navItemHTML(placeLabel(NO_PLACE), withoutPlace, { level: 'place', country: nav.country, region: nav.region, place: NO_PLACE })
        : '';
      return back + `<div class="nav-list">${items}${other}</div>`;
    }

    const estates = uniqueSorted(inRegion, 'estate');
    const items = estates
      .map((d) => navItemHTML(d, inRegion.filter((w) => w.estate === d), { level: 'wines', country: nav.country, region: nav.region, estate: d }))
      .join('');
    return back + `<div class="nav-list">${items}</div>`;
  }

  if (nav.level === 'place') {
    const items = inventory
      .filter((w) => w.country === nav.country && (w.region || '') === (nav.region || '') && (nav.place === NO_PLACE ? !w.place : w.place === nav.place))
      .sort(byName);
    return (
      bar +
      backBtnHTML('estate', nav.country, nav.region) +
      breadcrumbHTML(nav) +
      `<div class="domain-header">
        <div class="domain-name">${escapeHtml(placeLabel(nav.place))}</div>
        <div class="domain-count">${sumBottles(items)} bottles</div>
      </div>
      ${items.map((w) => cardHTML(w, true)).join('')}`
    );
  }

  const items = inventory.filter((w) => w.country === nav.country && (w.region || '') === (nav.region || '') && w.estate === nav.estate);
  return (
    bar +
    backBtnHTML('estate', nav.country, nav.region) +
    breadcrumbHTML(nav) +
    `<div class="domain-header">
      <div class="domain-name">${escapeHtml(nav.estate)}</div>
      <div class="domain-count">${sumBottles(items)} bottles</div>
    </div>
    ${items.map((w) => cardHTML(w, false)).join('')}`
  );
}
