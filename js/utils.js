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
  return [...new Set(list.map((item) => String(item[key] ?? '')))].sort((a, b) => a.localeCompare(b, 'en'));
}

export function sumBottles(list) {
  return list.reduce((sum, wine) => sum + wine.quantity, 0);
}

// Short label for the round classification seal. Space-free prefixes such as
// "VDP.Ortswein" or "Cru.Classé" would otherwise break mid-word in the small
// badge, so add a space after any "Word." that's glued to the next word.
// CSS (overflow-wrap: anywhere) is the safety net for anything left over.
export function badgeLabel(classification) {
  return String(classification || '')
    .split(',')[0]
    .trim()
    .replace(/^VDP\.\s*/i, 'VDP ')
    .replace(/([\p{L}]{2,})\.(?=[\p{L}])/gu, '$1. ')
    // Words too long for the badge even at the smallest size get a soft
    // hyphen, preferably before a German compound tail (Qualitäts-wein).
    .replace(/[\p{L}]{11,}/gu, (w) => {
      const tail = w.match(/(wein|gewächs|lage|berg)$/i);
      const at = tail && tail.index >= 4 ? tail.index : Math.ceil(w.length / 2);
      return `${w.slice(0, at)}\u00AD${w.slice(at)}`;
    });
}

// Font scale for the seal so the longest word ("ORTSWEIN", "CHAMPAGNE")
// fits whole instead of wrapping mid-word. Returned as an inline CSS
// variable; words too long even at the minimum size fall back to the
// overflow-wrap safety net in CSS.
export function badgeScaleStyle(label) {
  const longest = Math.max(0, ...String(label).split(/[\s\u00AD]+/).map((w) => w.length));
  const scale = Math.max(0.62, Math.min(1, 6.6 / Math.max(longest, 1)));
  return scale < 1 ? `style="--seal-scale:${scale.toFixed(2)}"` : '';
}
