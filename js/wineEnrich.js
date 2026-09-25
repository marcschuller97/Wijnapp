import { authHeaders } from './auth.js';

/**
 * Asks Claude to research a wine on the web (general info, tasting profile,
 * price estimate, corrected grape/region).
 * Returns { data } on success, { data: null } when nothing was found, or
 * { error } with a user-facing message — never throws.
 */
export async function enrichWine(wine) {
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
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      /* e.g. a platform timeout page */
    }
    if (!res.ok) {
      const message = (data && data.error) || (res.status === 504 ? 'The lookup took too long. Please try again.' : `Lookup failed (${res.status}).`);
      return { error: message };
    }
    const hasSomething =
      data &&
      (data.description || (data.flavorProfile && data.flavorProfile.length > 0) || data.estimatedPrice > 0 || data.grapeVariety || data.region);
    return { data: hasSomething ? data : null };
  } catch (e) {
    return { error: 'No connection — please try again when you are online.' };
  }
}
