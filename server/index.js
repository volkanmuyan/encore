'use strict';
require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');

const spotifyRouter        = require('./routes/spotify');
const concertsRouter       = require('./routes/concerts');
const setlistsRouter       = require('./routes/setlists');
const usersRouter          = require('./routes/users');
const notificationsRouter  = require('./routes/notifications');
const messagesRouter       = require('./routes/messages');

const app = express();

// ── CORS ─────────────────────────────────────
const builtinOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://volkanmuyan.github.io',
];
const envOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(s => s.trim())
  : [];
const allowedOrigins = [...new Set([...builtinOrigins, ...envOrigins])];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.some(o => origin === o || origin.startsWith(o))) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ── BODY PARSING ─────────────────────────────
app.use(express.json());

// ── RATE LIMITING ────────────────────────────
const limiter = rateLimit({ windowMs: 60_000, max: 60 });
app.use('/api/', limiter);

// ── ROUTES ───────────────────────────────────
app.use('/api/spotify',        spotifyRouter);
app.use('/api/concerts',       concertsRouter);
app.use('/api/setlists',       setlistsRouter);
app.use('/api/users',          usersRouter);
app.use('/api/notifications',  notificationsRouter);
app.use('/api/messages',       messagesRouter);

// ── HEALTH ───────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// ── ROOT → redirect to frontend ──────────────
app.get('/', (_req, res) => res.redirect('https://volkanmuyan.github.io/reprise/'));

// ── START ────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Reprise API → http://localhost:${PORT}`);
  console.log(`Spotify connected: ${!!process.env.SPOTIFY_CLIENT_ID}`);
  console.log(`Ticketmaster connected: ${!!process.env.TICKETMASTER_API_KEY}`);
  console.log(`Setlist.fm connected: ${!!process.env.SETLIST_FM_API_KEY}`);
});
