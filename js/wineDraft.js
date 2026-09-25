const COLOR_OPTIONS = ['White', 'Rosé', 'Red'];

export function toDraftItem(raw) {
  return {
    country: raw.country || 'Germany',
    region: raw.region || '',
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
