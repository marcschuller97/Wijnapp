import { isAuthorized, parseBody } from './_lib/shared.js';

const KV_KEY = 'winecellar:state';

async function kvCommand(command) {
  // Vercel's native "KV" storage and the Upstash marketplace integration
  // expose different env var names for the same REST API — support both.
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw Object.assign(new Error('Vercel KV is not connected to this project yet.'), { code: 'NO_KV' });
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    throw new Error(`KV request failed (${res.status})`);
  }
  return res.json();
}

export default async function handler(req, res) {
  if (!isAuthorized(req)) {
    res.status(401).json({ error: 'Incorrect or missing PIN.' });
    return;
  }

  if (req.method === 'GET') {
    try {
      const { result } = await kvCommand(['GET', KV_KEY]);
      res.status(200).json(result ? JSON.parse(result) : null);
    } catch (e) {
      res.status(e.code === 'NO_KV' ? 503 : 500).json({ error: e.message });
    }
    return;
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    try {
      const body = parseBody(req);
      if (!body || !Array.isArray(body.inventory) || !Array.isArray(body.history)) {
        res.status(400).json({ error: 'Invalid data: inventory and history must be arrays.' });
        return;
      }
      await kvCommand(['SET', KV_KEY, JSON.stringify({ inventory: body.inventory, history: body.history, ownerName: body.ownerName || '' })]);
      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(e.code === 'NO_KV' ? 503 : 500).json({ error: e.message });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
