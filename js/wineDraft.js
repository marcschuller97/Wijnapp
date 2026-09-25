import { normalizeRegionPlace } from './model.js';

const COLOR_OPTIONS = ['White', 'Rosé', 'Red'];

export function toDraftItem(raw) {
  // Show the review screen already split into region + village/appellation.
  const { region, place } = normalizeRegionPlace(raw.region, raw.place, raw.country);
  return {
    country: raw.country || '',
    region,
    place,
    estate: raw.estate || '',
    name: raw.name || '',
    vintage: raw.vintage || '',
    grapeVariety: raw.grapeVariety || '',
    color: COLOR_OPTIONS.includes(raw.color) ? raw.color : 'Red',
    sparkling: raw.sparkling === true,
    classification: raw.classification || 'not stated on label',
    quantity: raw.quantity || 1,
    price: raw.price || 0,
    notes: '',
  };
}
