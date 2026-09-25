import { guardAiRequest, callClaude, parseJsonLoose, stripCiteTags } from './_lib/shared.js';

const MAX_SEARCHES = 3;

function field(body, key) {
  const v = body[key];
  return v === undefined || v === null ? '' : String(v).trim().slice(0, 200);
}

export default async function handler(req, res) {
  const guarded = guardAiRequest(req, res);
  if (!guarded) return;
  const { apiKey, body } = guarded;

  const estate = field(body, 'estate');
  const name = field(body, 'name');
  if (!estate || !name) {
    res.status(400).json({ error: 'Estate and name are required.' });
    return;
  }
  const vintage = field(body, 'vintage');
  const grapeVariety = field(body, 'grapeVariety');
  const country = field(body, 'country');
  const region = field(body, 'region');
  const classification = field(body, 'classification');

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
    const result = await callClaude(apiKey, {
      max_tokens: 2048,
      // Basic web search variant — the one Haiku supports. Searches are billed
      // per use on top of tokens, so keep max_uses low.
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: MAX_SEARCHES }],
      messages: [{ role: 'user', content: promptText }],
    });
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    // With a search tool the answer is split over several text blocks
    // (preamble, cited fragments, the JSON). The JSON is asked for last, so
    // try the last block first and fall back to all text joined together.
    const lastText = result.texts[result.texts.length - 1];
    if (!lastText) {
      res.status(502).json({ error: 'Unexpected response from Claude.' });
      return;
    }

    let parsed;
    try {
      parsed = parseJsonLoose(lastText);
    } catch (e) {
      try {
        parsed = parseJsonLoose(result.texts.join(''));
      } catch (e2) {
        res.status(502).json({ error: 'Could not read the response from Claude.' });
        return;
      }
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      res.status(502).json({ error: 'Unexpected format from Claude.' });
      return;
    }

    const estimatedPrice = Number(parsed.estimatedPrice);

    res.status(200).json({
      description: stripCiteTags(parsed.description),
      flavorProfile: Array.isArray(parsed.flavorProfile)
        ? parsed.flavorProfile.filter((s) => typeof s === 'string').map(stripCiteTags).filter(Boolean)
        : [],
      estimatedPrice: Number.isFinite(estimatedPrice) && estimatedPrice > 0 ? Math.round(estimatedPrice * 100) / 100 : 0,
      grapeVariety: stripCiteTags(parsed.grapeVariety),
      region: stripCiteTags(parsed.region),
    });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Something went wrong while looking up this wine.' });
  }
}

export const config = {
  // Web search takes several round trips; 30s was too tight in practice.
  maxDuration: 60,
};
