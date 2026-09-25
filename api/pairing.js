const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5';
const MAX_WINES = 200;

function isAuthorized(req) {
  const requiredPin = process.env.APP_PIN;
  if (!requiredPin) return true; // not set yet: no lock active
  return req.headers['x-app-pin'] === requiredPin;
}

function stripCodeFences(text) {
  return text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/```\s*$/, '')
    .trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!isAuthorized(req)) {
    res.status(401).json({ error: 'Incorrect or missing PIN.' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'The Claude API key has not been set up yet (ANTHROPIC_API_KEY is missing in Vercel).' });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    res.status(400).json({ error: 'Invalid request.' });
    return;
  }

  const dish = body && typeof body.dish === 'string' ? body.dish.trim() : '';
  const wines = body && Array.isArray(body.wines) ? body.wines : [];

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

  const validIds = new Set(wines.map((w) => w && w.id));

  const promptText =
    `You are an experienced sommelier. I'm about to eat or cook this dish: "${dish}". ` +
    `Here is my wine inventory as a JSON list of wines I have on hand:\n${JSON.stringify(wines)}\n\n` +
    'Pick the 1 to 3 wines from THIS list (use the exact "id" field) that best pair with this dish. ' +
    'Return ONLY a valid JSON array, with no explanation and no markdown formatting, with each recommended wine as an object with the fields: ' +
    'id (the exact id from the list), reason (a short, concrete explanation in English of why this wine pairs well with this dish, at most 2 sentences, referencing flavors/aromas from the flavor profile where possible). ' +
    'Sort from best to least good match. Use ONLY ids that literally appear in the list — never invent a wine. ' +
    'If truly no wine in the list is a reasonable match, return an empty array [].';

  try {
    const claudeRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: promptText }],
      }),
    });

    const claudeData = await claudeRes.json();

    if (!claudeRes.ok) {
      const message = (claudeData && claudeData.error && claudeData.error.message) || `Claude API error (${claudeRes.status})`;
      res.status(claudeRes.status === 401 ? 503 : 502).json({ error: message });
      return;
    }

    const textBlock = (claudeData.content || []).find((b) => b.type === 'text');
    if (!textBlock) {
      res.status(502).json({ error: 'Unexpected response from Claude.' });
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(stripCodeFences(textBlock.text));
    } catch (e) {
      res.status(502).json({ error: 'Could not read the response from Claude. Please try again.' });
      return;
    }

    if (!Array.isArray(parsed)) {
      res.status(502).json({ error: 'Unexpected format from Claude.' });
      return;
    }

    const matches = parsed
      .filter((m) => m && validIds.has(m.id))
      .slice(0, 3)
      .map((m) => ({ id: m.id, reason: typeof m.reason === 'string' ? m.reason : '' }));

    res.status(200).json({ matches });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Something went wrong while looking for a matching wine.' });
  }
}
