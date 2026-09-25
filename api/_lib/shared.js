// Shared helpers for the serverless functions. Lives in an underscore-prefixed
// folder so Vercel doesn't deploy it as a route of its own.
import { timingSafeEqual } from 'node:crypto';

// Cheapest/fastest Claude model — plenty for photo→JSON extraction and
// matching against a short inventory list.
export const MODEL = 'claude-haiku-4-5';

// ANTHROPIC_BASE_URL only exists so the local dev server can point at a mock;
// in production it's unset and requests go straight to Anthropic.
const ANTHROPIC_API_URL = `${process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com'}/v1/messages`;

export function isAuthorized(req) {
  const requiredPin = process.env.APP_PIN;
  if (!requiredPin) return true; // not set yet: no lock active
  const given = Buffer.from(String(req.headers['x-app-pin'] || ''));
  const expected = Buffer.from(requiredPin);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function parseBody(req) {
  return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
}

/**
 * Handles the checks every AI endpoint shares (POST only, PIN, API key, JSON
 * body). Returns { apiKey, body } or null after it has already responded.
 * The API key is read here, server-side only — it never reaches the browser.
 */
export function guardAiRequest(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return null;
  }
  if (!isAuthorized(req)) {
    res.status(401).json({ error: 'Incorrect or missing PIN.' });
    return null;
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'The Claude API key has not been set up yet (ANTHROPIC_API_KEY is missing in Vercel).' });
    return null;
  }
  let body;
  try {
    body = parseBody(req);
  } catch (e) {
    body = null;
  }
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'Invalid request.' });
    return null;
  }
  return { apiKey, body };
}

/**
 * Calls the Messages API. Returns { ok: true, texts } with every text block
 * in order, or { ok: false, status, error } with a status to pass on.
 */
export async function callClaude(apiKey, params) {
  const claudeRes = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: MODEL, ...params }),
  });

  let data = null;
  try {
    data = await claudeRes.json();
  } catch (e) {
    /* non-JSON error page */
  }

  if (!claudeRes.ok) {
    const error = (data && data.error && data.error.message) || `Claude API error (${claudeRes.status})`;
    // A 401 from Anthropic means *our* key is wrong — that's a setup problem,
    // not the user's PIN, so don't pass the 401 through to the client.
    return { ok: false, status: claudeRes.status === 401 ? 503 : 502, error };
  }

  const texts = ((data && data.content) || []).filter((b) => b.type === 'text').map((b) => b.text);
  return { ok: true, texts };
}

// The model sometimes wraps its answer — "Here's the JSON: ```json [...] ```"
// — instead of returning bare JSON, especially with a search tool. Try a code
// fence first, then the outermost {...} or [...] block, then the raw text.
export function extractJson(text) {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenceMatch ? fenceMatch[1] : text).trim();
  const starts = ['{', '['].map((c) => candidate.indexOf(c)).filter((i) => i >= 0);
  if (starts.length === 0) return candidate;
  const start = Math.min(...starts);
  const end = candidate.lastIndexOf(candidate[start] === '{' ? '}' : ']');
  return end > start ? candidate.slice(start, end + 1) : candidate;
}

export function parseJsonLoose(text) {
  return JSON.parse(extractJson(text));
}

// With web search on, the model can leave (cite index="...">...</cite>
// markers inside the text fields themselves — those don't belong in the UI.
export function stripCiteTags(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<\/?cite[^>]*>/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
