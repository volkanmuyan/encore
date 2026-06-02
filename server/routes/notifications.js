'use strict';
const express = require('express');
const router  = express.Router();

const GH_TOKEN   = process.env.GITHUB_TOKEN;
const GH_GIST_ID = process.env.GITHUB_GIST_ID;
const GH_HEADERS = {
  Authorization:  `Bearer ${GH_TOKEN}`,
  Accept:         'application/vnd.github.v3+json',
  'Content-Type': 'application/json',
};

let _cache   = null;
let _cacheAt = 0;
const TTL    = 15_000;

async function read() {
  if (!GH_TOKEN || !GH_GIST_ID) return [];
  if (_cache && Date.now() - _cacheAt < TTL) return _cache;
  try {
    const r = await fetch(`https://api.github.com/gists/${GH_GIST_ID}`, { headers: GH_HEADERS });
    if (!r.ok) return _cache || [];
    const d = await r.json();
    _cache   = JSON.parse(d.files?.['notifications.json']?.content || '[]');
    _cacheAt = Date.now();
    return _cache;
  } catch { return _cache || []; }
}

async function write(list) {
  if (!GH_TOKEN || !GH_GIST_ID) return;
  try {
    await fetch(`https://api.github.com/gists/${GH_GIST_ID}`, {
      method:  'PATCH',
      headers: GH_HEADERS,
      body:    JSON.stringify({ files: { 'notifications.json': { content: JSON.stringify(list) } } }),
    });
    _cache = list; _cacheAt = Date.now();
  } catch {}
}

// GET /api/notifications?username=X
router.get('/', async (req, res) => {
  const u = String(req.query.username || '').toLowerCase().trim();
  if (!u) return res.json([]);
  const all = await read();
  res.json(all.filter(n => (n.to || '').toLowerCase() === u).slice(-50).reverse());
});

// POST /api/notifications  { to, from, type }
router.post('/', async (req, res) => {
  const { to, from, type } = req.body || {};
  if (!to || !from || !type) return res.status(400).json({ error: 'to/from/type required' });
  const all = await read();
  if (type === 'follow') {
    const i = all.findIndex(n => n.type === 'follow' && n.to === to && n.from === from);
    if (i >= 0) { all[i].read = false; all[i].ts = Date.now(); await write(all); return res.json({ ok: true }); }
  }
  all.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, to, from, type, ts: Date.now(), read: false });
  if (all.length > 500) all.splice(0, all.length - 500);
  await write(all);
  res.json({ ok: true });
});

// DELETE /api/notifications/follow  { to, from }
router.delete('/follow', async (req, res) => {
  const { to, from } = req.body || {};
  if (!to || !from) return res.status(400).json({ error: 'to/from required' });
  const updated = (await read()).filter(n => !(n.type === 'follow' && n.to === to && n.from === from));
  await write(updated);
  res.json({ ok: true });
});

// PUT /api/notifications/read  { username }
router.put('/read', async (req, res) => {
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: 'username required' });
  const all = await read();
  all.forEach(n => { if ((n.to || '').toLowerCase() === username.toLowerCase()) n.read = true; });
  await write(all);
  res.json({ ok: true });
});

module.exports = router;
