const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5';
const MAX_SEARCHES = 3;

function isAuthorized(req) {
  const requiredPin = process.env.APP_PIN;
  if (!requiredPin) return true; // not set yet: no lock active
  return req.headers['x-app-pin'] === requiredPin;
}

// Claude's final message sometimes reads "Here's the JSON object: ```json {...} ```"
// instead of bare JSON — grab the contents of a ```json code fence first if
// there is one, otherwise fall back to the first { ... } block in the text.
function extractJson(text) {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1] : text;
  const braceMatch = candidate.match(/\{[\s\S]*\}/);
  return (braceMatch ? braceMatch[0] : candidate).trim();
}

// With the web-search response, Claude sometimes adds <cite index="...">...</cite>
// citation markers inside the text itself — those tags don't belong in the UI.
function stripCiteTags(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/<\/?cite[^>]*>/gi, '')
    .replace(/\s{2,}/g, ' ')
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

  const estate = body && typeof body.estate === 'string' ? body.estate.trim() : '';
  const name = body && typeof body.name === 'string' ? body.name.trim() : '';
  if (!estate || !name) {
    res.status(400).json({ error: 'Estate and name are required.' });
    return;
  }
  const vintage = body.vintage || '';
  const grapeVariety = body.grapeVariety || '';
  const country = body.country || '';
  const region = body.region || '';
  const classification = body.classification || '';

  const promptText =
    'You are a wine expert with access to a search engine. Search online for information about this wine: ' +
    `estate/producer "${estate}", name "${name}"${vintage ? `, vintage ${vintage}` : ''}` +
    `${grapeVariety ? `, (possibly unreliable) grape variety "${grapeVariety}"` : ''}${region || country ? `, (possibly unreliable) region "${region}, ${country}"` : ''}` +
    `${classification && !/not stated/i.test(classification) ? `, classification "${classification}"` : ''}. ` +
    'The grape variety and region above may come from an automatic photo scan of the label and could be wrong. ' +
    'Use the search engine to find (1) the ACTUAL grape variety/blend and the ACTUAL wine region for this specific wine, to verify or correct the values above, ' +
    '(2) general information about the wine, the estate/producer, and the grape variety, ' +
    '(3) concrete flavor and aroma characteristics (fruit, spice, oak, mineral, floral, etc.), and ' +
    '(4) the typical retail price for a 75cl bottle at online wine retailers, in EUR. ' +
    "If you find nothing for this exact vintage but do find something for the wine style in general (e.g. a different vintage of the same cuvée), " +
    'use that as an approximation. Never invent facts, grape varieties, regions, flavors, or prices you cannot back up with the search results — ' +
    "if you truly find nothing or aren't confident enough, leave the fields empty/0 instead of making something up. For the price, if you find " +
    'multiple listings, use a realistic average, not the highest or lowest outlier.\n\n' +
    'As your very last message, return ONLY a valid JSON object — no introductory sentence before it, no explanation after it, no markdown code-block formatting, ' +
    'and no citations or citation tags in the text itself. Exactly these fields: ' +
    'description (3-5 sentences in English about the wine/estate/grape, or an empty string "" if nothing found), ' +
    'flavorProfile (array of 4-7 short English flavor or aroma terms such as "Black cherry", "Clove", "Vanilla", or an empty array [] if nothing found), ' +
    'estimatedPrice (number, average retail price per bottle in EUR with no currency symbol, e.g. 15.50, or 0 if you cannot find a reliable price), ' +
    'grapeVariety (the verified grape variety/blend if you found it with confidence, e.g. "Grenache, Syrah, Mourvèdre", or an empty string "" if not confident or nothing different from the given value), ' +
    'region (the verified wine region/appellation if you found it with confidence, e.g. "Châteauneuf-du-Pape", or an empty string "" if not confident or nothing different from the given value).';

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
        max_tokens: 2048,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: MAX_SEARCHES }],
        messages: [{ role: 'user', content: promptText }],
      }),
    });

    const claudeData = await claudeRes.json();

    if (!claudeRes.ok) {
      const message = (claudeData && claudeData.error && claudeData.error.message) || `Claude API error (${claudeRes.status})`;
      res.status(claudeRes.status === 401 ? 503 : 502).json({ error: message });
      return;
    }

    const textBlocks = (claudeData.content || []).filter((b) => b.type === 'text');
    const lastText = textBlocks[textBlocks.length - 1];
    if (!lastText) {
      res.status(502).json({ error: 'Unexpected response from Claude.' });
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(extractJson(lastText.text));
    } catch (e) {
      res.status(502).json({ error: 'Could not read the response from Claude.' });
      return;
    }

    const estimatedPrice = Number(parsed.estimatedPrice);

    res.status(200).json({
      description: stripCiteTags(typeof parsed.description === 'string' ? parsed.description : ''),
      flavorProfile: Array.isArray(parsed.flavorProfile)
        ? parsed.flavorProfile.filter((s) => typeof s === 'string').map(stripCiteTags)
        : [],
      estimatedPrice: Number.isFinite(estimatedPrice) && estimatedPrice > 0 ? estimatedPrice : 0,
      grapeVariety: stripCiteTags(typeof parsed.grapeVariety === 'string' ? parsed.grapeVariety : ''),
      region: stripCiteTags(typeof parsed.region === 'string' ? parsed.region : ''),
    });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Something went wrong while looking up this wine.' });
  }
}

export const config = {
  maxDuration: 30,
};
