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
const TTL    = 5_000;

async function read() {
  if (!GH_TOKEN || !GH_GIST_ID) return [];
  if (_cache && Date.now() - _cacheAt < TTL) return _cache;
  try {
    const r = await fetch(`https://api.github.com/gists/${GH_GIST_ID}`, { headers: GH_HEADERS });
    if (!r.ok) return _cache || [];
    const d = await r.json();
    _cache   = JSON.parse(d.files?.['messages.json']?.content || '[]');
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
      body:    JSON.stringify({ files: { 'messages.json': { content: JSON.stringify(list) } } }),
    });
    _cache = list; _cacheAt = Date.now();
  } catch {}
}

// GET /api/messages/inbox?username=X
router.get('/inbox', async (req, res) => {
  const u = String(req.query.username || '').toLowerCase().trim();
  if (!u) return res.json([]);
  const all = await read();
  const map = {};
  all.filter(m => m.from.toLowerCase() === u || m.to.toLowerCase() === u)
     .forEach(m => {
       const p = m.from.toLowerCase() === u ? m.to.toLowerCase() : m.from.toLowerCase();
       if (!map[p] || m.ts > map[p].ts) map[p] = { ...m, partner: p };
     });
  const unread = {};
  all.forEach(m => {
    if (m.to.toLowerCase() === u && !m.read) unread[m.from.toLowerCase()] = (unread[m.from.toLowerCase()] || 0) + 1;
  });
  const result = Object.values(map).map(c => ({ ...c, unread: unread[c.partner] || 0 }));
  result.sort((a, b) => b.ts - a.ts);
  res.json(result);
});

// GET /api/messages?user1=X&user2=Y
router.get('/', async (req, res) => {
  const u1 = String(req.query.user1 || '').toLowerCase().trim();
  const u2 = String(req.query.user2 || '').toLowerCase().trim();
  if (!u1 || !u2) return res.json([]);
  const all = await read();
  res.json(all.filter(m =>
    (m.from.toLowerCase() === u1 && m.to.toLowerCase() === u2) ||
    (m.from.toLowerCase() === u2 && m.to.toLowerCase() === u1)
  ));
});

// POST /api/messages  { from, to, text }
router.post('/', async (req, res) => {
  const { from, to, text } = req.body || {};
  if (!from || !to || !text) return res.status(400).json({ error: 'from/to/text required' });
  if (String(text).length > 1000) return res.status(400).json({ error: 'too long' });
  const all = await read();
  all.push({
    id:   `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    from: String(from).trim(),
    to:   String(to).trim(),
    text: String(text).trim(),
    ts:   Date.now(),
    read: false,
  });
  if (all.length > 2000) all.splice(0, all.length - 2000);
  await write(all);
  res.json({ ok: true });
});

// PUT /api/messages/read  { username, partner }
router.put('/read', async (req, res) => {
  const { username, partner } = req.body || {};
  if (!username || !partner) return res.status(400).json({ error: 'username/partner required' });
  const all = await read();
  all.forEach(m => {
    if (m.to.toLowerCase() === username.toLowerCase() && m.from.toLowerCase() === partner.toLowerCase()) m.read = true;
  });
  await write(all);
  res.json({ ok: true });
});

module.exports = router;
