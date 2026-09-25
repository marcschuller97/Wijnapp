import { escapeHtml, uniqueSorted, sumBottles } from '../utils.js';
import { cardHTML } from './card.js';
import { countryDonutInnerHTML, otherCountries } from './pieChart.js';
import { colorSplitInnerHTML } from './colorSplit.js';
import { colorFilterRowHTML, matchesFilter } from './colorFilter.js';
import { ripeningInfo } from '../model.js';

const SORT_OPTIONS = [
  { key: 'name', label: 'A-Z' },
  { key: 'price', label: 'Price' },
  { key: 'drinkby', label: 'Drink by' },
];

function sortWines(wines, sortBy) {
  const sorted = wines.slice();
  if (sortBy === 'price') {
    sorted.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  } else if (sortBy === 'drinkby') {
    sorted.sort((a, b) => ripeningInfo(b).progress - ripeningInfo(a).progress);
  } else {
    sorted.sort((a, b) => a.name.localeCompare(b.name, 'en') || a.estate.localeCompare(b.estate, 'en'));
  }
  return sorted;
}

function sortChipRowHTML(sortBy) {
  const active = sortBy || 'name';
  const chips = SORT_OPTIONS.map(
    (o) => `<button class="sort-chip ${active === o.key ? 'active' : ''}" data-action="set-sort" data-sort="${o.key}">${escapeHtml(o.label)}</button>`
  ).join('');
  return `<div class="sort-chip-row"><span class="sort-chip-label">Sort</span>${chips}</div>`;
}

function dashboardHTML(inventory) {
  const country = countryDonutInnerHTML(inventory);
  if (!country) return '';
  const color = colorSplitInnerHTML(inventory);
  return `<div class="pie-section">${country}${color ? `<div class="pie-divider"></div>${color}` : ''}</div>`;
}

function searchBarHTML(searchQuery) {
  return `<input class="search-input" id="search-input" type="text" placeholder="Search by name, estate, or grape…" value="${escapeHtml(searchQuery)}">`;
}

function backBtnHTML(level, country, region) {
  return `<button class="back-btn" data-action="nav" data-level="${level}" data-country="${escapeHtml(country || '')}" data-region="${escapeHtml(region || '')}">&lsaquo; Back</button>`;
}

function breadcrumbHTML(nav) {
  const parts = [{ label: 'All countries', level: 'country' }];
  if (nav.country) parts.push({ label: nav.country, level: 'region', country: nav.country });
  if (nav.region) parts.push({ label: nav.region, level: 'estate', country: nav.country, region: nav.region });
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

export function renderVoorraad(state, searchQuery, colorFilter, sortBy) {
  const bar = searchBarHTML(searchQuery);
  const inventory = state.inventory;

  if (searchQuery.trim() !== '') {
    const q = searchQuery.trim().toLowerCase();
    const matches = inventory.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.estate.toLowerCase().includes(q) ||
        (w.grapeVariety || '').toLowerCase().includes(q) ||
        w.region.toLowerCase().includes(q) ||
        w.country.toLowerCase().includes(q)
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
    const filterRow = colorFilterRowHTML(inventory, filter);

    if (filter !== 'All') {
      const matches = sortWines(
        inventory.filter((w) => matchesFilter(w, filter)),
        sortBy
      );
      const emptyLabel = filter === 'Sparkling' ? 'sparkling' : filter.toLowerCase();
      const list =
        matches.length === 0
          ? `<div class="empty-state"><div class="glyph">&#127863;</div><p>No ${escapeHtml(emptyLabel)} wines in stock.</p></div>`
          : matches.map((w) => cardHTML(w, true)).join('');
      const sortRow = matches.length > 0 ? sortChipRowHTML(sortBy) : '';
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
      .map((r) => {
        const list = inventory.filter((w) => w.country === nav.country && w.region === r);
        return `<button class="nav-item" data-action="nav" data-level="estate" data-country="${escapeHtml(nav.country)}" data-region="${escapeHtml(r)}">
          <div>
            <div class="nav-item-name">${escapeHtml(r)}</div>
            <div class="nav-item-count">${sumBottles(list)} bottles</div>
          </div>
          <div class="nav-item-right"><span class="chevron">&rsaquo;</span></div>
        </button>`;
      })
      .join('');
    return bar + backBtnHTML('country') + breadcrumbHTML(nav) + `<div class="nav-list">${items}</div>`;
  }

  if (nav.level === 'estate') {
    const estates = uniqueSorted(inventory.filter((w) => w.country === nav.country && w.region === nav.region), 'estate');
    const items = estates
      .map((d) => {
        const list = inventory.filter((w) => w.country === nav.country && w.region === nav.region && w.estate === d);
        return `<button class="nav-item" data-action="nav" data-level="wines" data-country="${escapeHtml(nav.country)}" data-region="${escapeHtml(nav.region)}" data-estate="${escapeHtml(d)}">
          <div>
            <div class="nav-item-name">${escapeHtml(d)}</div>
            <div class="nav-item-count">${sumBottles(list)} bottles</div>
          </div>
          <div class="nav-item-right"><span class="chevron">&rsaquo;</span></div>
        </button>`;
      })
      .join('');
    return bar + backBtnHTML('region', nav.country) + breadcrumbHTML(nav) + `<div class="nav-list">${items}</div>`;
  }

  const items = inventory.filter((w) => w.country === nav.country && w.region === nav.region && w.estate === nav.estate);
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
