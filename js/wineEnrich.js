import { authHeaders } from './auth.js';

/**
 * Asks Claude to research a wine on the web (general info + tasting profile).
 * Best-effort: returns null on any failure instead of throwing, so callers
 * can fire this in the background without interrupting the add-wine flow.
 */
export async function fetchWineEnrichment(wine) {
  try {
    const res = await fetch('/api/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        estate: wine.estate,
        name: wine.name,
        vintage: wine.vintage,
        grapeVariety: wine.grapeVariety,
        country: wine.country,
        region: wine.region,
        classification: wine.classification,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const hasSomething =
      data &&
      (data.description || (data.flavorProfile && data.flavorProfile.length > 0) || data.estimatedPrice > 0 || data.grapeVariety || data.region);
    if (!hasSomething) return null;
    return data;
  } catch (e) {
    return null;
  }
}
