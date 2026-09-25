export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generateId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function formatEuro(value) {
  return `€${Number(value || 0).toFixed(2)}`;
}

export function uniqueSorted(list, key) {
  return [...new Set(list.map((item) => item[key]))].sort((a, b) => a.localeCompare(b, 'en'));
}

export function sumBottles(list) {
  return list.reduce((sum, wine) => sum + wine.quantity, 0);
}
