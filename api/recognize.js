import { guardAiRequest, callClaude, parseJsonLoose } from './_lib/shared.js';

const MAX_IMAGES = 6;

const LABEL_PROMPT =
  'These are one or more photos of wine bottles or wine labels. Multiple different bottles can appear in one photo, and the same bottle can appear in multiple photos. Return ONLY a valid JSON array, with no explanation and no markdown formatting. For each distinct wine you recognize, provide an object with exactly these fields: country (e.g. "Germany" or "France"), region (the broad wine region only, in the local spelling used on labels, e.g. "Bourgogne", "Champagne", "Bordeaux", "Rhône", "Loire", "Toscana", "Piemonte", "Rioja", "Mosel" — NOT the village or sub-appellation), place (the village or sub-appellation if it can be determined, e.g. "Meursault", "Pauillac", "Sancerre", "Chablis", or "" if none), estate (name of the winery/producer), name (name of the cuvée/wine, without producer and without vintage), vintage (number, or null for a non-vintage wine), grapeVariety (grape or blend), color (exactly "White", "Rosé" or "Red"), sparkling (true or false — is it a sparkling wine), classification (quality classification, or "not stated on label" if not visible), quantity (always 1, regardless of how many photos of the same bottle there are), price (always 0). If the same wine appears in multiple photos, include it only once. Only report what you can actually read — never guess or invent an estate, name, or vintage. If a field is not legible, use an empty string (or null for vintage). If in doubt whether something is a wine at all, leave it out: an empty array [] is better than a made-up entry. Return an empty array [] if you cannot recognize any wine.';

const RECEIPT_PROMPT =
  'These are one or more photos of (parts of) the same receipt or invoice for a wine purchase, possibly listing multiple wines. Return ONLY a valid JSON array, with no explanation and no markdown formatting, with an object for each wine line on the receipt with these fields: country (guess based on shop/wine name if not explicitly stated), region (the broad wine region only, in the local spelling used on labels, e.g. "Bourgogne", "Champagne", "Bordeaux", "Rhône", "Loire", "Toscana", "Piemonte", "Rioja", "Mosel" — NOT the village or sub-appellation, or "" if unknown), place (the village or sub-appellation if it can be determined, e.g. "Meursault", "Pauillac", "Sancerre", "Chablis", or "" if none), estate (name of the winery/producer, or "" if not distinguishable from the wine name), name (name of the wine/cuvée), vintage (number, or null if not stated), grapeVariety (if it can be inferred, otherwise ""), color (exactly "White", "Rosé" or "Red", estimated as best you can), sparkling (true or false), classification ("not stated on receipt" if this isn\'t on the receipt), quantity (number of bottles on this line), price (price PER BOTTLE — divide a total price by the quantity). Include every distinct wine line as a separate object in the array. Skip non-wine items (deposit, bags, discounts). Never invent lines or values that are not on the receipt. Return an empty array [] if no wine lines can be recognized.';

export default async function handler(req, res) {
  const guarded = guardAiRequest(req, res);
  if (!guarded) return;
  const { apiKey, body } = guarded;

  const images = Array.isArray(body.images) ? body.images : [];
  const mode = body.mode === 'receipt' ? 'receipt' : 'label';

  if (images.length === 0) {
    res.status(400).json({ error: 'No photo received.' });
    return;
  }
  if (images.length > MAX_IMAGES) {
    res.status(400).json({ error: `Maximum of ${MAX_IMAGES} photos at a time.` });
    return;
  }
  for (const img of images) {
    if (!img || typeof img.data !== 'string' || !img.data) {
      res.status(400).json({ error: 'One of the photos could not be read.' });
      return;
    }
  }

  const content = [
    ...images.map((img) => ({
      type: 'image',
      source: { type: 'base64', media_type: img.mediaType || 'image/jpeg', data: img.data },
    })),
    { type: 'text', text: mode === 'receipt' ? RECEIPT_PROMPT : LABEL_PROMPT },
  ];

  try {
    const result = await callClaude(apiKey, { max_tokens: 4096, messages: [{ role: 'user', content }] });
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
      res.status(502).json({ error: 'Could not read the response from Claude. Try again with a clearer photo.' });
      return;
    }
    // Always answer with an array, even when the model returned one bare object.
    if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') parsed = [parsed];
    if (!Array.isArray(parsed)) {
      res.status(502).json({ error: 'Unexpected format from Claude — expected a list of wines.' });
      return;
    }

    res.status(200).json({ items: parsed.filter((item) => item && typeof item === 'object') });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Something went wrong while recognizing the photos.' });
  }
}
