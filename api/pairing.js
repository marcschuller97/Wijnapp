import { guardAiRequest, callClaude, parseJsonLoose } from './_lib/shared.js';

const MAX_WINES = 200;

export default async function handler(req, res) {
  const guarded = guardAiRequest(req, res);
  if (!guarded) return;
  const { apiKey, body } = guarded;

  const dish = typeof body.dish === 'string' ? body.dish.trim().slice(0, 500) : '';
  const wines = Array.isArray(body.wines) ? body.wines : [];

  if (!dish) {
    res.status(400).json({ error: 'No dish provided.' });
    return;
  }
  if (wines.length === 0) {
    res.status(400).json({ error: 'No wines in stock to choose from.' });
    return;
  }
  if (wines.length > MAX_WINES) {
    res.status(400).json({ error: 'Too many wines to process.' });
    return;
  }

  // Only ids that were actually sent may come back — anything else is a
  // wine the model made up.
  const validIds = new Set(wines.map((w) => w && w.id).filter(Boolean));

  const promptText =
    `You are an experienced sommelier. I'm about to eat or cook this dish: "${dish}". ` +
    `Here is my wine inventory as a JSON list of wines I have on hand:\n${JSON.stringify(wines)}\n\n` +
    'Pick the 1 to 3 wines from THIS list (use the exact "id" field) that best pair with this dish. ' +
    'Return ONLY a valid JSON array, with no explanation and no markdown formatting, with each recommended wine as an object with the fields: ' +
    'id (the exact id from the list), reason (a short, concrete explanation in English of why this wine pairs well with this dish, at most 2 sentences, referencing flavors/aromas from the flavor profile where possible). ' +
    'Sort from best to least good match. Use ONLY ids that literally appear in the list — never invent a wine. ' +
    'If truly no wine in the list is a reasonable match, return an empty array [].';

  try {
    const result = await callClaude(apiKey, { max_tokens: 1024, messages: [{ role: 'user', content: promptText }] });
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    if (result.texts.length === 0) {
      res.status(502).json({ error: 'Unexpected response from Claude.' });
      return;
    }

    let parsed;
    try {
      parsed = parseJsonLoose(result.texts.join('\n'));
    } catch (e) {
      res.status(502).json({ error: 'Could not read the response from Claude. Please try again.' });
      return;
    }
    if (!Array.isArray(parsed)) {
      res.status(502).json({ error: 'Unexpected format from Claude.' });
      return;
    }

    const seen = new Set();
    const matches = parsed
      .filter((m) => m && validIds.has(m.id) && !seen.has(m.id) && seen.add(m.id))
      .slice(0, 3)
      .map((m) => ({ id: m.id, reason: typeof m.reason === 'string' ? m.reason : '' }));

    res.status(200).json({ matches });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Something went wrong while looking for a matching wine.' });
  }
}
