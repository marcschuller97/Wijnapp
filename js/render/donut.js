// Builds an SVG donut chart (a ring of circle segments) for a list of
// {color, count} segments. Leaves the center hole empty so the caller can
// overlay a total figure on top of it (.donut-center).
export function donutSVG(segments, { size = 118, strokeWidth = 13 } = {}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((sum, s) => sum + s.count, 0);
  const center = size / 2;

  let cursor = 0;
  const rings = segments
    .filter((s) => s.count > 0)
    .map((s) => {
      const len = total > 0 ? (s.count / total) * c : 0;
      const dash = `${len.toFixed(2)} ${(c - len).toFixed(2)}`;
      const offset = (-cursor).toFixed(2);
      cursor += len;
      return `<circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${strokeWidth}" stroke-dasharray="${dash}" stroke-dashoffset="${offset}"/>`;
    })
    .join('');

  return `
    <svg class="donut-svg" viewBox="0 0 ${size} ${size}">
      <circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="${strokeWidth}"/>
      <g transform="rotate(-90 ${center} ${center})">${rings}</g>
    </svg>`;
}
