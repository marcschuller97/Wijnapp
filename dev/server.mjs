// Local dev server — no dependencies, no Vercel account needed.
//
//   node dev/server.mjs            # real Claude if ANTHROPIC_API_KEY is set
//   node dev/server.mjs --mock-ai  # canned Claude responses (free, offline)
//
// Serves the static app, runs the real /api/*.js handlers with a minimal
// Vercel-style req/res shim, and provides an in-memory KV store that speaks
// the same Upstash REST protocol as Vercel KV. Env: PORT, APP_PIN,
// ANTHROPIC_API_KEY. Not deployed (see .vercelignore).
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.env.PORT) || 3000;
const MOCK_AI = process.argv.includes('--mock-ai');
const base = `http://localhost:${PORT}`;

process.env.KV_REST_API_URL = `${base}/__kv`;
process.env.KV_REST_API_TOKEN = 'dev-token';
if (MOCK_AI) {
  process.env.ANTHROPIC_BASE_URL = `${base}/__mock_anthropic`;
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'mock-key';
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.md': 'text/markdown; charset=utf-8',
};

const kv = new Map();

function readBody(req) {
  return new Promise((ok, fail) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => ok(Buffer.concat(chunks).toString('utf8')));
    req.on('error', fail);
  });
}

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

async function handleKv(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.KV_REST_API_TOKEN}`) return sendJson(res, 401, { error: 'bad token' });
  const [cmd, key, value] = JSON.parse(await readBody(req));
  if (cmd === 'GET') return sendJson(res, 200, { result: kv.has(key) ? kv.get(key) : null });
  if (cmd === 'SET') {
    kv.set(key, value);
    return sendJson(res, 200, { result: 'OK' });
  }
  return sendJson(res, 400, { error: `unsupported ${cmd}` });
}

// Canned responses shaped like the real ones — including the awkward parts
// the endpoints must cope with (preamble text, code fences, <cite> tags,
// hallucinated ids).
async function handleMockAnthropic(req, res) {
  const body = JSON.parse(await readBody(req));
  const content = body.messages[0].content;
  const text = (t) => ({ type: 'text', text: t });
  let blocks;

  const searchFails = typeof content === 'string' && content.includes('searchfail');
  if (searchFails) {
    // How Anthropic reports a failed search: HTTP 200, error object in the result.
    blocks = [
      { type: 'server_tool_use', id: 'srv_1', name: 'web_search', input: { query: 'wine' } },
      { type: 'web_search_tool_result', tool_use_id: 'srv_1', content: { type: 'web_search_tool_result_error', error_code: 'unavailable' } },
      text('{"description":"","flavorProfile":[],"estimatedPrice":0,"grapeVariety":"","region":""}'),
    ];
  } else if (Array.isArray(body.tools) && body.tools.some((t) => t.type.startsWith('web_search'))) {
    blocks = [
      text("I'll search for this wine."),
      { type: 'server_tool_use', id: 'srv_1', name: 'web_search', input: { query: 'wine' } },
      { type: 'web_search_tool_result', tool_use_id: 'srv_1', content: [] },
      text(
        'Here is the JSON object:\n```json\n' +
          JSON.stringify({
            description: '<cite index="1-2">A juicy, well-balanced wine from a family estate.</cite> Mock enrichment for local testing.',
            flavorProfile: ['<cite index="1-3">Red cherry</cite>', 'Violet', 'Pepper'],
            estimatedPrice: 18.456,
            grapeVariety: 'Pinot Noir',
            region: 'Ahr',
          }) +
          '\n```'
      ),
    ];
  } else if (Array.isArray(content) && content.some((b) => b.type === 'image')) {
    const receipt = content.some((b) => b.type === 'text' && b.text.includes('receipt'));
    blocks = [
      text(
        '```json\n' +
          JSON.stringify([
            { country: 'France', region: 'Bordeaux', estate: "Château L'Évangile", name: 'Blason de l’Évangile', vintage: 2019, grapeVariety: 'Merlot, Cabernet Franc', color: 'Red', sparkling: false, classification: 'Pomerol AOC', quantity: receipt ? 2 : 1, price: receipt ? 39.5 : 0 },
            { country: 'Germany', region: 'Pfalz', estate: 'Weingut <b>Test</b>', name: 'Riesling "Kalkmergel"', vintage: 2022, grapeVariety: 'Riesling', color: 'White', sparkling: false, classification: 'VDP.Ortswein', quantity: 1, price: 0 },
          ]) +
          '\n```'
      ),
    ];
  } else {
    const prompt = typeof content === 'string' ? content : '';
    const ids = [...prompt.matchAll(/"id":"([^"]+)"/g)].map((m) => m[1]);
    blocks = [
      text(
        JSON.stringify([
          { id: ids[0], reason: 'Bright acidity cuts through the richness of the dish.' },
          { id: 'w-does-not-exist', reason: 'Hallucinated — must be filtered out server-side.' },
          { id: ids[0], reason: 'Duplicate — must be dropped.' },
          { id: ids[1], reason: 'Soft tannins complement the flavours.' },
        ])
      ),
    ];
  }
  await new Promise((r) => setTimeout(r, 400));
  sendJson(res, 200, { id: 'msg_mock', type: 'message', role: 'assistant', model: body.model, content: blocks, stop_reason: 'end_turn' });
}

async function handleApi(req, res, pathname) {
  const name = pathname.slice('/api/'.length).replace(/\/$/, '');
  if (!/^[a-z]+$/.test(name)) return sendJson(res, 404, { error: 'Not found' });
  let mod;
  try {
    mod = await import(pathToFileURL(join(ROOT, 'api', `${name}.js`)).href);
  } catch (e) {
    return sendJson(res, 404, { error: 'Not found' });
  }
  const raw = await readBody(req);
  let parsed = raw;
  if ((req.headers['content-type'] || '').includes('application/json') && raw) {
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return sendJson(res, 400, { error: 'Invalid JSON' });
    }
  }
  req.body = parsed;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (obj) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
    return res;
  };
  try {
    await mod.default(req, res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) sendJson(res, 500, { error: e.message });
  }
}

async function handleStatic(req, res, pathname) {
  const rel = normalize(decodeURIComponent(pathname === '/' ? '/index.html' : pathname)).replace(/^([/\\])+/, '');
  const file = join(ROOT, rel);
  if (!file.startsWith(ROOT) || rel.startsWith('api') || rel.startsWith('dev')) {
    res.writeHead(404);
    return res.end('Not found');
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  } catch (e) {
    res.writeHead(404);
    res.end('Not found');
  }
}

http
  .createServer(async (req, res) => {
    const { pathname } = new URL(req.url, base);
    try {
      if (pathname === '/__kv') return await handleKv(req, res);
      if (MOCK_AI && pathname === '/__mock_anthropic/v1/messages') return await handleMockAnthropic(req, res);
      if (pathname.startsWith('/api/')) return await handleApi(req, res, pathname);
      return await handleStatic(req, res, pathname);
    } catch (e) {
      console.error(e);
      if (!res.headersSent) sendJson(res, 500, { error: e.message });
    }
  })
  .listen(PORT, () => {
    console.log(`Wine Cellar dev server on ${base}${MOCK_AI ? ' (mock AI)' : ''}${process.env.APP_PIN ? ' (PIN on)' : ''}`);
  });
