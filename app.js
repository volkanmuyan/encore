// ── STATE ── (data lives in data-service.js → window.DataService)
let currentStatus = null;
let currentRating = null;
let currentEvent = null;
let fcRating = null;
let currentDetailId = null;
let currentCommunityId = null;

// ── ALIASES ── (convenience shortcuts to DataService)
const loadHistory  = ()  => DataService.getHistory();
const saveHistory  = (h) => DataService.saveHistory(h);
const getCoverImg  = (c) => DataService.getCoverImg(c);

// ── DATE HELPERS ──
function parseDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr + 'T12:00:00');
}

function formatMonth(dateStr) {
  if (!dateStr) return '—';
  const months = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  const d = parseDate(dateStr);
  return d ? months[d.getMonth()] : '—';
}

function formatDay(dateStr) {
  if (!dateStr) return '—';
  const d = parseDate(dateStr);
  return d ? d.getDate() : '—';
}

function formatFullDate(dateStr) {
  if (!dateStr) return '';
  const d = parseDate(dateStr);
  if (!d) return dateStr;
  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ── FOLLOW STATS ──
function refreshFollowStats() {
  const el = document.getElementById('profile-my-following');
  if (el) el.textContent = DataService.getFollowing().length;
}

// ── PROFILE STATS ──
function refreshProfileStats() {
  const history = loadHistory();
  const count = history.length;
  const rated = history.filter(c => c.rating);
  const avg = rated.length
    ? (rated.reduce((s, c) => s + Number(c.rating), 0) / rated.length).toFixed(1)
    : '—';
  const el = id => document.getElementById(id);
  if (el('stat-concerts')) el('stat-concerts').textContent = count;
  if (el('stat-avg')) el('stat-avg').textContent = avg;
}

// ── RENDER ATTENDED GRID ──
function renderMyAttended() {
  const history = loadHistory();
  const grid = document.getElementById('my-attended-grid');
  const empty = document.getElementById('my-attended-empty');
  if (!grid) return;

  if (history.length === 0) {
    grid.innerHTML = '';
    if (empty) { empty.style.display = 'flex'; }
    return;
  }
  if (empty) { empty.style.display = 'none'; }

  const sorted = [...history].sort((a, b) => {
    const da = a.date ? new Date(a.date) : new Date(0);
    const db = b.date ? new Date(b.date) : new Date(0);
    return db - da;
  });

  grid.innerHTML = sorted.map(c => `
    <div class="cg-item my-concert-item" data-id="${c.id}">
      <div class="cg-img" style="background-image:url('${getCoverImg(c)}')"></div>
      ${c.rating ? `<span class="cg-score">${c.rating}</span>` : ''}
      <div class="cg-artist-label">${escapeHtml(c.artist)}</div>
    </div>
  `).join('');

  grid.querySelectorAll('.my-concert-item').forEach(item => {
    item.addEventListener('click', () => openMyConcertDetail(Number(item.dataset.id)));
  });
}

// ── RENDER TIMELINE ──
function renderTimeline() {
  const container = document.getElementById('tab-timeline');
  if (!container) return;

  const history = loadHistory();

  if (history.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon-svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <p class="empty-title">Kronoloji boş</p>
        <p class="empty-sub">Konserlerini ekle, burada görünsün</p>
      </div>`;
    return;
  }

  const sorted = [...history].sort((a, b) => {
    const da = a.date ? new Date(a.date) : new Date(0);
    const db = b.date ? new Date(b.date) : new Date(0);
    return db - da;
  });

  const byYear = {};
  sorted.forEach(c => {
    const d = c.date ? parseDate(c.date) : null;
    const year = d ? d.getFullYear() : 'Tarihsiz';
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(c);
  });

  const years = Object.keys(byYear).sort((a, b) => {
    if (a === 'Tarihsiz') return 1;
    if (b === 'Tarihsiz') return -1;
    return Number(b) - Number(a);
  });

  container.innerHTML = years.map(year => `
    <div class="tl-year-group">
      <div class="tl-year-label">${year}</div>
      ${byYear[year].map(c => `
        <div class="tl-item" data-id="${c.id}">
          <div class="tl-date-col">
            <span class="tl-month">${formatMonth(c.date)}</span>
            <span class="tl-day">${formatDay(c.date)}</span>
          </div>
          <div class="tl-line-wrap"><div class="tl-dot"></div><div class="tl-line"></div></div>
          <div class="tl-body">
            <p class="tl-artist">${escapeHtml(c.artist)}</p>
            ${[c.venue, c.city].filter(Boolean).length ? `<p class="tl-venue-city">${escapeHtml([c.venue, c.city].filter(Boolean).join(' · '))}</p>` : ''}
            <div class="tl-meta-row">
              ${c.rating ? `<span class="tl-score">${c.rating}</span>` : ''}
              ${c.songs?.length ? `<span class="tl-song-count">${c.songs.length} şarkı</span>` : ''}
            </div>
            ${c.notes ? `<p class="tl-notes">"${escapeHtml(c.notes)}"</p>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `).join('');

  container.querySelectorAll('.tl-item').forEach(item => {
    item.addEventListener('click', () => openMyConcertDetail(Number(item.dataset.id)));
  });
}

// ── ESCAPE HTML ──
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── MY CONCERT DETAIL ──
function openMyConcertDetail(id) {
  const history = loadHistory();
  const c = history.find(h => h.id === id);
  if (!c) return;
  currentDetailId = id;

  document.getElementById('mdo-artist').textContent = c.artist;
  document.getElementById('mdo-venue').textContent = [c.venue, c.city].filter(Boolean).join(' · ') || '';
  document.getElementById('mdo-date').textContent = formatFullDate(c.date);

  const scoreWrap = document.getElementById('mdo-score-wrap');
  scoreWrap.innerHTML = c.rating
    ? `<span class="mdo-score-pill">${c.rating}/10</span>`
    : '';

  const notesEl = document.getElementById('mdo-notes');
  notesEl.textContent = c.notes ? `"${c.notes}"` : '';
  notesEl.style.display = c.notes ? 'block' : 'none';

  document.getElementById('mdo-delete').onclick = () => deleteConcert(id);

  // Setlist section
  let setlistHtml = document.getElementById('mdo-setlist');
  if (!setlistHtml) {
    setlistHtml = document.createElement('div');
    setlistHtml.id = 'mdo-setlist';
    document.getElementById('mdo-delete').before(setlistHtml);
  }
  if (c.songs && c.songs.length) {
    setlistHtml.innerHTML = `
      <p class="mdo-setlist-label">Setlist <span class="mdo-setlist-count">${c.songs.length} şarkı</span>${c.sfUrl ? `<a href="${c.sfUrl}" target="_blank" rel="noopener" class="mdo-sf-link">setlist.fm →</a>` : ''}</p>
      <ol class="mdo-songs">${c.songs.map(s => `<li>${s}</li>`).join('')}</ol>`;
    setlistHtml.style.display = 'block';
  } else {
    setlistHtml.style.display = 'none';
  }

  document.getElementById('my-detail-overlay').classList.add('open');
}

function closeMyConcertDetail() {
  document.getElementById('my-detail-overlay').classList.remove('open');
  currentDetailId = null;
}

function deleteConcert(id) {
  const history = loadHistory().filter(c => c.id !== id);
  saveHistory(history);
  closeMyConcertDetail();
  refreshProfileStats();
  renderMyAttended();
  renderTimeline();
  showToast('Konser silindi');
}

// ── ADD CONCERT FORM ──
let _selectedSetlist = null;
let _slResults       = [];   // store search results by index to avoid inline JSON

function _yearOptions() {
  const sel = document.getElementById('sl-year-input');
  if (!sel || sel.options.length > 2) return;
  const now = new Date().getFullYear();
  for (let y = now; y >= 1960; y--) {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y;
    sel.appendChild(opt);
  }
}

function _showStep(step) {
  // step: 'search' | 'results' | 'form'
  const searchBox = document.getElementById('sl-search-box');
  const resultsBox = document.getElementById('sl-results-box');
  const form = document.getElementById('add-concert-form');
  if (searchBox)  searchBox.style.display  = step === 'form'    ? 'none' : 'block';
  if (resultsBox) resultsBox.style.display = step === 'results' ? 'block' : 'none';
  if (form)       form.style.display       = step === 'form'    ? 'block' : 'none';
}

function openAddConcert() {
  fcRating = null;
  _selectedSetlist = null;
  _slResults = [];
  ['fc-artist','fc-venue','fc-city','fc-notes','sl-artist-input','sl-city-input']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const dateEl = document.getElementById('fc-date');
  if (dateEl) dateEl.value = '';
  const charEl = document.getElementById('fc-char-count');
  if (charEl) charEl.textContent = '0/280';
  const noteEl = document.getElementById('fc-rating-note');
  if (noteEl) noteEl.textContent = 'Puanlamak için dokunun';
  _yearOptions();
  _showStep('search');
  initFCRating();
  document.getElementById('add-concert-overlay').classList.add('open');
}

async function doSetlistSearch() {
  const artist = (document.getElementById('sl-artist-input')?.value || '').trim();
  if (!artist) { showToast('Sanatçı adı gir'); return; }
  const city = (document.getElementById('sl-city-input')?.value || '').trim();
  const year = document.getElementById('sl-year-input')?.value || '';

  const btn = document.getElementById('sl-search-btn');
  const list = document.getElementById('sl-result-list');
  if (btn)  { btn.disabled = true; btn.textContent = 'Aranıyor…'; }
  if (list) list.innerHTML = '<p class="sl-loading">Setlist.fm\'de aranıyor…</p>';
  _showStep('results');

  _slResults = await DataService.searchSetlists({ artist, city, year });

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Ara';
  }

  if (!list) return;

  if (!_slResults.length) {
    list.innerHTML = `
      <p class="sl-empty">Sonuç bulunamadı.</p>
      <button class="sl-manual-btn" onclick="openManualEntry()">Manuel olarak gir →</button>`;
    return;
  }

  list.innerHTML = _slResults.map((s, i) => `
    <div class="sl-result-item" onclick="selectSetlistByIndex(${i})">
      <div class="sl-result-main">
        <span class="sl-result-artist">${escHtml(s.artist)}</span>
        <span class="sl-result-venue">${escHtml(s.venue)}${s.city ? ' · ' + escHtml(s.city) : ''}</span>
      </div>
      <div class="sl-result-right">
        <span class="sl-result-date">${formatSetlistDate(s.date)}</span>
        ${s.songs.length ? `<span class="sl-result-songs">${s.songs.length} şarkı</span>` : ''}
      </div>
    </div>`).join('') +
    `<div class="sl-result-item sl-manual-row" onclick="openManualEntry()">
      <span style="color:var(--muted);font-size:13px">Aradığım konser listede yok — manuel gir</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
    </div>`;
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function formatSetlistDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00');
  const months = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function selectSetlistByIndex(i) {
  const s = _slResults[i];
  if (!s) return;
  _selectedSetlist = s;
  document.getElementById('fc-artist').value = s.artist;
  document.getElementById('fc-venue').value  = s.venue;
  document.getElementById('fc-city').value   = s.city;
  document.getElementById('fc-date').value   = s.date;
  const label = document.getElementById('sl-selected-label');
  if (label) label.textContent =
    `${s.artist} · ${formatSetlistDate(s.date)}${s.songs.length ? ' · ' + s.songs.length + ' şarkı' : ''}`;
  document.getElementById('sl-selected-banner').style.display = 'flex';
  _showStep('form');
  initFCRating();
  document.getElementById('add-concert-sheet')?.scrollTo({ top: 0, behavior: 'smooth' });
}

function openManualEntry() {
  _selectedSetlist = null;
  document.getElementById('sl-selected-banner').style.display = 'none';
  ['fc-artist','fc-venue','fc-city','fc-date'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  _showStep('form');
  initFCRating();
}

function backToSearch() {
  _selectedSetlist = null;
  _showStep('search');
}

function backToResults() {
  if (_slResults.length) _showStep('results');
  else _showStep('search');
}

function closeAddConcert() {
  document.getElementById('add-concert-overlay').classList.remove('open');
}

function initFCRating() {
  const scale = document.getElementById('fc-rating-scale');
  if (!scale) return;
  scale.innerHTML = '';
  for (let i = 1; i <= 10; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rating-num';
    btn.textContent = i;
    btn.addEventListener('click', () => selectFCRating(i, btn));
    scale.appendChild(btn);
  }
}

function selectFCRating(num, btnEl) {
  fcRating = num;
  document.querySelectorAll('#fc-rating-scale .rating-num').forEach(b => b.classList.remove('selected'));
  btnEl.classList.add('selected');
  const labels = {1:'Berbat',2:'Çok kötü',3:'Kötü',4:'Vasat',5:'Orta',6:'İyi sayılır',7:'İyi',8:'Çok iyi',9:'Harika',10:'Mükemmel!'};
  const noteEl = document.getElementById('fc-rating-note');
  if (noteEl) noteEl.textContent = `${num}/10 — ${labels[num]}`;
}

function saveNewConcert(e) {
  e.preventDefault();
  const get = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const artist = get('fc-artist');
  const date   = get('fc-date');
  if (!artist || !date) return;

  const concert = {
    id:         Date.now(),
    artist,
    venue:      get('fc-venue'),
    city:       get('fc-city'),
    date,
    rating:     fcRating,
    notes:      get('fc-notes'),
    addedAt:    new Date().toISOString(),
    setlistId:  _selectedSetlist?.id   || null,
    songs:      _selectedSetlist?.songs || [],
    sfUrl:      _selectedSetlist?.url  || null,
  };

  const history = loadHistory();
  history.push(concert);
  saveHistory(history);

  closeAddConcert();
  refreshProfileStats();
  renderMyAttended();
  renderTimeline();
  showToast(`"${artist}" eklendi!`);
}

function handleSheetBackdrop(event, overlayId) {
  if (event.target.id === overlayId) {
    if (overlayId === 'add-concert-overlay') closeAddConcert();
    if (overlayId === 'my-detail-overlay') closeMyConcertDetail();
  }
}

// ── COMMUNITIES ──────────────────────────────────────────────────────────────

function renderCommunities(filter) {
  const grid = document.getElementById('community-grid');
  if (!grid) return;

  const all = DataService.getAllCommunities();
  const filtered = !filter || filter === 'all'
    ? all
    : all.filter(c => c.city === filter || c.genre === filter);

  grid.innerHTML = filtered.map(c => {
    const joined = DataService.isMember(c.id);
    return `
      <div class="community-card" onclick="openCommunity('${c.id}')">
        <div class="community-card-img" style="background-image:url('${c.cover}')"></div>
        <div class="community-card-overlay">
          <span class="community-genre-badge">${c.genre}</span>
        </div>
        <div class="community-card-body">
          <h4 class="community-card-name">${c.name}</h4>
          <p class="community-card-meta">${c.city} · ${c.memberCount} üye</p>
          <button class="community-card-join ${joined ? 'joined' : ''}"
            onclick="event.stopPropagation(); handleCardJoin(this, '${c.id}')">
            ${joined ? '✓ Üyesin' : '+ Katıl'}
          </button>
        </div>
      </div>`;
  }).join('');
}

function handleCardJoin(btn, id) {
  const joined = DataService.toggleMembership(id);
  btn.classList.toggle('joined', joined);
  btn.textContent = joined ? '✓ Üyesin' : '+ Katıl';
  refreshProfileCommunities();
  showToast(joined ? 'Sahneye katıldın!' : 'Sahneden ayrıldın');
}

function openCommunity(id) {
  const c = DataService.getCommunity(id);
  if (!c) return;
  currentCommunityId = id;

  document.getElementById('co-cover').style.backgroundImage = `url('${c.cover}')`;
  document.getElementById('co-name').textContent = c.name;
  document.getElementById('co-genre-city').textContent = `${c.city} · ${c.genre}`;
  document.getElementById('co-description').textContent = c.description;
  document.getElementById('co-member-count').textContent = c.memberCount + ' üye';

  updateCommunityJoinBtn();

  // Upcoming events
  const evGrid = document.getElementById('co-events-grid');
  evGrid.innerHTML = '';
  (c.upcomingEvents || []).forEach(evId => {
    const ev = DataService.getEvent(evId);
    if (!ev) return;
    const card = document.createElement('div');
    card.className = 'event-card';
    card.onclick = () => openEvent(evId);
    card.innerHTML = `
      <div class="event-card-img" style="background-image:url('${ev.cover}')"></div>
      <div class="event-card-body">
        <p class="card-venue">${ev.venue}</p>
        <h4 class="card-name">${ev.title}</h4>
        <p class="card-date">${ev.date}</p>
        <div class="card-footer">
          <span class="card-rating">${ev.score}</span>
        </div>
      </div>`;
    evGrid.appendChild(card);
  });

  // Recent activity
  const feed = document.getElementById('co-activity-feed');
  feed.innerHTML = (c.recentActivity || []).map(a => `
    <div class="activity-item">
      <img class="av" src="${a.img}" alt="">
      <div class="activity-info">
        <p><strong>${a.user}</strong> <span class="activity-label attended">${a.action}</span></p>
        <p class="activity-event">${a.event}</p>
        <div class="mini-stars"><span class="activity-time">${a.time}</span></div>
      </div>
    </div>`).join('');

  document.getElementById('community-overlay').classList.add('open');
  document.getElementById('community-overlay').scrollTop = 0;
}

function closeCommunity() {
  document.getElementById('community-overlay').classList.remove('open');
  currentCommunityId = null;
}

function updateCommunityJoinBtn() {
  if (!currentCommunityId) return;
  const btn = document.getElementById('co-join-btn');
  const joined = DataService.isMember(currentCommunityId);
  btn.textContent = joined ? '✓ Üyesin' : '+ Sahneye Katıl';
  btn.className = 'community-join-btn' + (joined ? ' joined' : '');
}

function toggleCurrentCommunity() {
  if (!currentCommunityId) return;
  const joined = DataService.toggleMembership(currentCommunityId);
  updateCommunityJoinBtn();
  renderCommunities();
  refreshProfileCommunities();
  showToast(joined ? 'Sahneye katıldın!' : 'Sahneden ayrıldın');
}

function refreshProfileCommunities() {
  const memberships = DataService.getMemberships();
  const wrap  = document.getElementById('profile-communities-wrap');
  const strip = document.getElementById('profile-communities-strip');
  const statEl = document.getElementById('stat-communities');

  if (statEl) statEl.textContent = memberships.length;
  if (!wrap || !strip) return;

  if (memberships.length === 0) {
    wrap.style.display = 'none';
    return;
  }

  wrap.style.display = 'block';
  strip.innerHTML = memberships.map(id => {
    const c = DataService.getCommunity(id);
    if (!c) return '';
    return `
      <div class="profile-community-chip" onclick="openCommunity('${c.id}')">
        <div class="pcc-img" style="background-image:url('${c.cover}')"></div>
        <span class="pcc-name">${c.name}</span>
      </div>`;
  }).join('');
}

// ── SHARE PROFILE ──
async function shareProfile() {
  const history = loadHistory();
  const count = history.length;
  const rated = history.filter(c => c.rating);
  const avg = rated.length
    ? (rated.reduce((s, c) => s + Number(c.rating), 0) / rated.length).toFixed(1)
    : null;

  const text = (count > 0 ? count + " konser gördüm" + (avg ? ", ortalamam " + avg + "/10" : "") + ". " : "") + "Reprise'da konser geçmişimi takip ediyorum!";

  const shareData = {
    title: 'Reprise — Konser Geçmişim',
    text,
    url: 'https://volkanmuyan.github.io/reprise/',
  };

  if (navigator.share) {
    try { await navigator.share(shareData); } catch (_) {}
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(`${text} ${shareData.url}`)
      .then(() => showToast('Kopyalandı!'));
  } else {
    showToast('reprise — volkanmuyan.github.io/reprise');
  }
}

// ── TOAST ──
function showToast(msg) {
  const existing = document.getElementById('reprise-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'reprise-toast';
  toast.className = 'toast';
  toast.textContent = msg;
  document.querySelector('.app-shell').appendChild(toast);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ── NAVIGATION ──
function navigate(screenId) {
  closeAddConcert();
  closeMyConcertDetail();
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) target.classList.add('active');

  const map = { 'screen-home': 0, 'screen-search': 1, 'screen-communities': 2, 'screen-activity': 3, 'screen-profile': 4 };
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
  if (map[screenId] !== undefined) {
    document.querySelectorAll('.nav-item')[map[screenId]]?.classList.add('active');
  }

  const fab = document.getElementById('add-concert-fab');
  if (fab) fab.classList.toggle('visible', screenId === 'screen-profile');

  if (screenId === 'screen-profile') {
    refreshProfileStats();
    refreshFollowStats();
    renderMyAttended();
    renderTimeline();
    refreshProfileCommunities();
  }
  if (screenId === 'screen-notifications') {
    loadNotifications();
    setTimeout(markNotificationsRead, 1200);
  }
  if (screenId === 'screen-communities') {
    renderCommunities();
  }
}

// ── CHIP FILTER ──
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', function() {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    this.classList.add('active');
  });
});

// ── TABS (activity screen) ──
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', function() {
    const tabs = this.closest('.tab-bar').querySelectorAll('.tab');
    tabs.forEach(t => t.classList.remove('active'));
    this.classList.add('active');
  });
});

// ── WANT TO GO TOGGLE (cards) ──
function toggleWant(btn) {
  btn.classList.toggle('active');
  btn.textContent = btn.classList.contains('active') ? '✓ Listede' : '+ Listeme Ekle';
}

// ── OPEN EVENT ──
function openEvent(eventId) {
  const ev = DataService.getEvent(eventId);
  if (!ev) return;
  currentEvent = eventId;
  currentStatus = null;
  currentRating = null;

  document.getElementById('eo-cover').style.backgroundImage = `url('${ev.cover}')`;
  document.getElementById('eo-title').textContent = ev.title;
  document.getElementById('eo-venue').textContent = ev.venue;
  document.getElementById('eo-date').textContent = ev.date;
  document.getElementById('eo-score').textContent = ev.score;

  ['sb-attended','sb-want','sb-notgoing'].forEach(id => {
    document.getElementById(id).className = 'status-btn';
  });

  const scale = document.getElementById('rating-scale');
  scale.innerHTML = '';
  for (let i = 1; i <= 10; i++) {
    const btn = document.createElement('button');
    btn.className = 'rating-num';
    btn.textContent = i;
    btn.onclick = () => selectRating(i, btn);
    scale.appendChild(btn);
  }
  document.getElementById('rating-note').textContent = 'Dokunarak puan ver';
  document.getElementById('review-box').style.display = 'none';
  document.getElementById('metrics-section').style.display = 'none';

  document.querySelectorAll('.metric-dots').forEach(container => {
    container.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const dot = document.createElement('div');
      dot.className = 'metric-dot';
      dot.addEventListener('click', () => selectMetric(container, i));
      container.appendChild(dot);
    }
  });

  const attGrid = document.getElementById('attendees-grid');
  attGrid.innerHTML = '';
  document.getElementById('att-count').textContent = `(${ev.attendees.length})`;
  ev.attendees.forEach(p => {
    const div = document.createElement('div');
    div.className = 'att-person';
    div.innerHTML = `<img src="${p.img}" alt=""><span>${p.name}</span>`;
    div.addEventListener('click', () => openProfile(p.name));
    attGrid.appendChild(div);
  });

  const wantGrid = document.getElementById('want-grid');
  wantGrid.innerHTML = '';
  document.getElementById('want-count').textContent = `(${ev.wanting.length})`;
  ev.wanting.forEach(p => {
    const div = document.createElement('div');
    div.className = 'att-person';
    div.innerHTML = `<img src="${p.img}" alt=""><span>${p.name}</span>`;
    div.addEventListener('click', () => openProfile(p.name));
    wantGrid.appendChild(div);
  });

  const revSec = document.getElementById('reviews-section');
  if (ev.reviews.length > 0) {
    revSec.innerHTML = `<h3 class="er-header section-mini-title">Yorumlar <span class="att-count">(${ev.reviews.length})</span></h3>`;
    ev.reviews.forEach(r => {
      const item = document.createElement('div');
      item.className = 'er-item';
      item.innerHTML = `
        <div class="er-top">
          <img src="${r.img}" alt="">
          <span class="er-user">${r.user}</span>
          <span class="er-score">${r.score}</span>
        </div>
        <p class="er-text">${r.text}</p>
      `;
      revSec.appendChild(item);
    });
  } else {
    revSec.innerHTML = '';
  }

  document.getElementById('event-overlay').classList.add('open');
  document.getElementById('event-overlay').scrollTop = 0;
}

function closeEvent() {
  document.getElementById('event-overlay').classList.remove('open');
}

// ── ATTENDEE PROFILE ──
function openProfile(username) {
  // Try real accounts first, then fall back to static mock data
  const accounts = DataService._getAccounts();
  const account = accounts.find(a => a.username.toLowerCase() === username.toLowerCase());
  const staticUser = DataService.getUser(username);

  const u = account ? {
    username:    account.username,
    displayName: account.displayName || account.username,
    bio:         account.bio || '',
    avatar:      account.avatar || `https://i.pravatar.cc/80?u=${encodeURIComponent(account.username)}`,
    cover:       null,
    following:   null,
    followers:   null,
    concerts:    '—',
    avgRating:   '—',
    wishlist:    '—',
    attended:    [],
  } : staticUser;

  if (!u) return;

  document.getElementById('po-cover').style.backgroundImage = u.cover ? `url('${u.cover}')` : 'none';
  document.getElementById('po-avatar').src = u.avatar || '';
  document.getElementById('po-name').textContent = u.displayName || u.username;
  document.getElementById('po-bio').textContent = u.bio || '';
  document.getElementById('po-follow').innerHTML = (u.following != null)
    ? `<strong>${u.following}</strong> takip &nbsp; <strong>${u.followers}</strong> takipçi`
    : '';
  document.getElementById('po-concerts').textContent = u.concerts ?? '—';
  document.getElementById('po-avg').textContent = u.avgRating ?? '—';
  document.getElementById('po-want').textContent = u.wishlist ?? '—';

  // Follow button
  const currentUser = DataService.getCurrentUser();
  const isOwnProfile = currentUser && currentUser.username.toLowerCase() === (u.username || '').toLowerCase();
  const followBtn = document.getElementById('po-follow-btn');
  if (followBtn) {
    if (isOwnProfile) {
      followBtn.style.display = 'none';
    } else {
      followBtn.style.display = 'block';
      const following = DataService.isFollowing(u.username);
      followBtn.textContent = following ? 'Takip Ediyorum' : 'Takip Et';
      followBtn.className = 'follow-btn profile-follow-btn' + (following ? ' following' : '');
      followBtn.onclick = () => toggleFollowUser(u.username, followBtn);
    }
  }

  const msgBtn = document.getElementById('po-msg-btn');
  if (msgBtn) {
    if (isOwnProfile) {
      msgBtn.style.display = 'none';
    } else {
      msgBtn.style.display = 'flex';
      msgBtn.onclick = () => { closeProfile(); openMessages(u.username); };
    }
  }

  const grid = document.getElementById('po-grid');
  grid.innerHTML = '';
  (u.attended || []).forEach(c => {
    const item = document.createElement('div');
    item.className = 'cg-item';
    item.innerHTML = `<div class="cg-img" style="background-image:url('${c.img}')"></div><span class="cg-score">${c.score}</span>`;
    grid.appendChild(item);
  });

  document.getElementById('profile-overlay').classList.add('open');
  document.getElementById('profile-overlay').scrollTop = 0;
}

// ── NOTIFICATIONS ────────────────────────────────────────────────────────────
let _notifPollTimer = null;

async function loadNotifications() {
  const user = DataService.getCurrentUser();
  if (!user) return;
  try {
    const res  = await fetch(`${DataService.apiBase}/notifications?username=${encodeURIComponent(user.username)}`);
    const list = res.ok ? await res.json() : [];
    _renderNotifications(list);
    _updateNotifBadge(list.filter(n => !n.read).length);
  } catch {}
}

function _renderNotifications(list) {
  const el = document.getElementById('notif-list');
  if (!el) return;
  if (!list.length) {
    el.innerHTML = '<div class="notif-empty">Henüz bildirim yok</div>';
    return;
  }
  el.innerHTML = list.map(n => {
    const cls  = n.read ? '' : ' notif-unread';
    const ago  = _timeAgo(n.ts);
    const from = escHtml(n.from || '');
    if (n.type === 'follow') {
      return `<div class="notif-item${cls}" onclick="openProfile('${from}')">
        <img class="notif-avatar" src="https://i.pravatar.cc/48?u=${encodeURIComponent(n.from)}" alt="">
        <div class="notif-body">
          <span class="notif-text"><strong>${from}</strong> seni takip etmeye başladı</span>
          <span class="notif-time">${ago}</span>
        </div>
      </div>`;
    }
    if (n.type === 'message') {
      return `<div class="notif-item${cls}" onclick="openMessages('${from}')">
        <img class="notif-avatar" src="https://i.pravatar.cc/48?u=${encodeURIComponent(n.from)}" alt="">
        <div class="notif-body">
          <span class="notif-text"><strong>${from}</strong> sana mesaj gönderdi</span>
          <span class="notif-time">${ago}</span>
        </div>
      </div>`;
    }
    return '';
  }).join('');
}

function _updateNotifBadge(count) {
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  if (count > 0) {
    badge.style.display = 'flex';
    badge.textContent   = count > 9 ? '9+' : String(count);
  } else {
    badge.style.display = 'none';
    badge.textContent   = '';
  }
}

async function markNotificationsRead() {
  const user = DataService.getCurrentUser();
  if (!user) return;
  try {
    await fetch(`${DataService.apiBase}/notifications/read`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username: user.username }),
    });
  } catch {}
  _updateNotifBadge(0);
  document.querySelectorAll('.notif-unread').forEach(el => el.classList.remove('notif-unread'));
}

function _sendNotification(to, type) {
  const user = DataService.getCurrentUser();
  if (!user || !to || to.toLowerCase() === user.username.toLowerCase()) return;
  fetch(`${DataService.apiBase}/notifications`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ to, from: user.username, type }),
  }).catch(() => {});
}

function _timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60_000)      return 'az önce';
  if (d < 3_600_000)   return Math.floor(d / 60_000) + 'd önce';
  if (d < 86_400_000)  return Math.floor(d / 3_600_000) + 's önce';
  if (d < 604_800_000) return Math.floor(d / 86_400_000) + 'g önce';
  return new Date(ts).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

// ── MESSAGES ─────────────────────────────────────────────────────────────────
let _msgPartner   = null;
let _msgPollTimer = null;
let _msgLastCount = 0;

function openMessages(partner) {
  _msgPartner = partner || null;
  document.getElementById('messages-overlay').classList.add('open');
  if (partner) {
    _showChat(partner);
  } else {
    showInbox();
  }
}

function closeMessages() {
  document.getElementById('messages-overlay').classList.remove('open');
  clearInterval(_msgPollTimer);
  _msgPollTimer = null;
  _msgPartner   = null;
}

async function showInbox() {
  _msgPartner = null;
  clearInterval(_msgPollTimer);
  document.getElementById('msg-inbox-view').style.display = 'block';
  document.getElementById('msg-chat-view').style.display  = 'none';
  const user = DataService.getCurrentUser();
  if (!user) return;
  const list = document.getElementById('msg-inbox-list');
  list.innerHTML = '<div class="msg-empty">Yükleniyor…</div>';
  try {
    const res   = await fetch(`${DataService.apiBase}/messages/inbox?username=${encodeURIComponent(user.username)}`);
    const inbox = res.ok ? await res.json() : [];
    if (!inbox.length) { list.innerHTML = '<div class="msg-empty">Henüz mesaj yok</div>'; return; }
    list.innerHTML = inbox.map(c => `
      <div class="msg-conv-item" onclick="openMessages('${escHtml(c.partner)}')">
        <img class="msg-conv-avatar" src="https://i.pravatar.cc/48?u=${encodeURIComponent(c.partner)}" alt="">
        <div class="msg-conv-body">
          <div class="msg-conv-top">
            <span class="msg-conv-name">${escHtml(c.partner)}</span>
            <span class="msg-conv-time">${_timeAgo(c.ts)}</span>
          </div>
          <p class="msg-conv-preview">${escHtml((c.text || '').slice(0, 60))}${c.text && c.text.length > 60 ? '…' : ''}</p>
        </div>
        ${c.unread ? `<span class="msg-unread-badge">${c.unread}</span>` : ''}
      </div>`).join('');
  } catch {
    list.innerHTML = '<div class="msg-empty">Mesajlar yüklenemedi</div>';
  }
}

async function _showChat(partner) {
  _msgPartner = partner;
  _msgLastCount = 0;
  document.getElementById('msg-inbox-view').style.display = 'none';
  document.getElementById('msg-chat-view').style.display  = 'flex';
  document.getElementById('msg-chat-title').textContent   = partner;
  await _loadConversation();
  const user = DataService.getCurrentUser();
  if (user) {
    fetch(`${DataService.apiBase}/messages/read`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username: user.username, partner }),
    }).catch(() => {});
  }
  clearInterval(_msgPollTimer);
  _msgPollTimer = setInterval(_loadConversation, 10_000);
}

async function _loadConversation() {
  const user = DataService.getCurrentUser();
  if (!user || !_msgPartner) return;
  try {
    const res  = await fetch(`${DataService.apiBase}/messages?user1=${encodeURIComponent(user.username)}&user2=${encodeURIComponent(_msgPartner)}`);
    const msgs = res.ok ? await res.json() : [];
    if (msgs.length === _msgLastCount) return;
    _msgLastCount = msgs.length;
    const body = document.getElementById('msg-chat-body');
    if (!body) return;
    const atBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 60;
    body.innerHTML = msgs.map(m => {
      const mine = m.from.toLowerCase() === user.username.toLowerCase();
      return `<div class="msg-bubble ${mine ? 'mine' : 'theirs'}">${escHtml(m.text)}</div>`;
    }).join('');
    if (atBottom || _msgLastCount === msgs.length) body.scrollTop = body.scrollHeight;
  } catch {}
}

async function sendMessage() {
  const user = DataService.getCurrentUser();
  if (!user || !_msgPartner) return;
  const input = document.getElementById('msg-input');
  const text  = (input.value || '').trim();
  if (!text) return;
  input.value    = '';
  input.disabled = true;
  try {
    await fetch(`${DataService.apiBase}/messages`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ from: user.username, to: _msgPartner, text }),
    });
    _sendNotification(_msgPartner, 'message');
    _msgLastCount = 0;
    await _loadConversation();
  } catch {
    showToast('Mesaj gönderilemedi');
  } finally {
    input.disabled = false;
    input.focus();
  }
}

// ── USER FOLLOW ──
function toggleFollowUser(username, btn) {
  const nowFollowing = DataService.toggleFollow(username);
  btn.textContent = nowFollowing ? 'Takip Ediyorum' : 'Takip Et';
  btn.classList.toggle('following', nowFollowing);
  refreshFollowStats();
  showToast(nowFollowing ? `${username} takip ediliyor` : `${username} takipten çıkıldı`);
  if (nowFollowing) _sendNotification(username, 'follow');
}

function renderUserList(users) {
  const list = document.getElementById('user-result-list');
  if (!list) return;
  if (!users.length) {
    list.innerHTML = '<p class="user-search-hint">Kullanıcı bulunamadı</p>';
    return;
  }
  list.innerHTML = users.map(u => {
    const following = DataService.isFollowing(u.username);
    return `
      <div class="user-result-item" data-username="${escHtml(u.username)}">
        <img class="user-result-avatar" src="${escHtml(u.avatar)}" alt=""
          onerror="this.src='https://i.pravatar.cc/80?u=${encodeURIComponent(u.username)}'">
        <div class="user-result-info">
          <span class="user-result-name">${escHtml(u.displayName || u.username)}</span>
          <span class="user-result-username">@${escHtml(u.username)}</span>
        </div>
        <button class="follow-btn${following ? ' following' : ''}" data-follow="${escHtml(u.username)}">
          ${following ? 'Takip Ediyorum' : 'Takip Et'}
        </button>
      </div>`;
  }).join('');

  list.querySelectorAll('[data-follow]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      toggleFollowUser(btn.dataset.follow, btn);
    });
  });
  list.querySelectorAll('.user-result-item').forEach(item => {
    item.addEventListener('click', () => openProfile(item.dataset.username));
  });
}

function initUserSearch() {
  const input = document.getElementById('user-search-input');
  if (!input) return;

  // Always show default list when section opens
  renderUserList(DataService.getDefaultUsers());

  if (input._userSearchBound) return;
  input._userSearchBound = true;
  let _timer = null;
  input.addEventListener('input', function() {
    clearTimeout(_timer);
    const q = this.value.trim();
    if (!q) {
      renderUserList(DataService.getDefaultUsers());
      return;
    }
    _timer = setTimeout(async () => renderUserList(await DataService.searchUsers(q)), 250);
  });
}

function closeProfile() {
  document.getElementById('profile-overlay').classList.remove('open');
}

// ── STATUS ──
function setStatus(status) {
  currentStatus = status;
  ['sb-attended','sb-want','sb-notgoing'].forEach(id => {
    document.getElementById(id).className = 'status-btn';
  });

  const map = { attended: 'sb-attended', want: 'sb-want', notgoing: 'sb-notgoing' };
  const classMap = { attended: 'active-attended', want: 'active-want', notgoing: 'active-notgoing' };
  document.getElementById(map[status]).classList.add(classMap[status]);

  const ratingSection = document.getElementById('rating-section');
  const reviewBox = document.getElementById('review-box');
  const metricsSection = document.getElementById('metrics-section');

  if (status === 'attended') {
    ratingSection.style.display = 'block';
    reviewBox.style.display = 'block';
    metricsSection.style.display = 'block';
  } else if (status === 'want') {
    ratingSection.style.display = 'none';
    reviewBox.style.display = 'none';
    metricsSection.style.display = 'none';
  } else {
    ratingSection.style.display = 'block';
    reviewBox.style.display = 'none';
    metricsSection.style.display = 'none';
  }
}

// ── METRIC DOTS ──
function selectMetric(container, value) {
  const dots = container.querySelectorAll('.metric-dot');
  dots.forEach((d, i) => d.classList.toggle('filled', i < value));
}

// ── RATING ──
function selectRating(num, btnEl) {
  currentRating = num;
  document.querySelectorAll('.rating-num').forEach(b => b.classList.remove('selected'));
  btnEl.classList.add('selected');
  const labels = {1:'Berbat',2:'Çok kötü',3:'Kötü',4:'Vasat',5:'Orta',6:'İyi sayılır',7:'İyi',8:'Çok iyi',9:'Harika',10:'Mükemmel!'};
  document.getElementById('rating-note').textContent = `${num}/10 — ${labels[num]}`;
}

// ── REVIEW CHAR COUNT ──
document.querySelectorAll('.review-textarea').forEach(ta => {
  ta.addEventListener('input', function() {
    const count = this.value.length;
    this.closest('.review-box').querySelector('.review-char').textContent = `${count}/280`;
  });
});

document.getElementById('fc-notes').addEventListener('input', function() {
  const charEl = document.getElementById('fc-char-count');
  if (charEl) charEl.textContent = `${this.value.length}/280`;
});

// ── REVIEW SUBMIT ──
document.querySelectorAll('.review-submit').forEach(btn => {
  btn.addEventListener('click', function() {
    const ta = this.closest('.review-box').querySelector('.review-textarea');
    if (ta.value.trim()) {
      ta.value = '';
      this.closest('.review-box').querySelector('.review-char').textContent = '0/280';
      this.textContent = 'Paylaşıldı!';
      this.style.background = '#4ECDC4';
      setTimeout(() => { this.textContent = 'Paylaş'; this.style.background = ''; }, 2000);
    }
  });
});

// ── PROFILE TABS ──
function switchProfileTab(btn, tabId) {
  document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.ptab-content').forEach(c => c.classList.remove('active'));
  const content = document.getElementById(tabId);
  if (content) content.classList.add('active');

  if (tabId === 'tab-attended') renderMyAttended();
  if (tabId === 'tab-timeline') renderTimeline();
  if (tabId === 'tab-posts')    renderPosts();
}

// ── SWIPE TO CLOSE OVERLAYS ──
let touchStartY = 0;

const overlay = document.getElementById('event-overlay');
overlay.addEventListener('touchstart', e => { touchStartY = e.touches[0].clientY; }, { passive: true });
overlay.addEventListener('touchend', e => {
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (dy > 80 && overlay.scrollTop === 0) closeEvent();
}, { passive: true });

const profileOverlay = document.getElementById('profile-overlay');
profileOverlay.addEventListener('touchstart', e => { touchStartY = e.touches[0].clientY; }, { passive: true });
profileOverlay.addEventListener('touchend', e => {
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (dy > 80 && profileOverlay.scrollTop === 0) closeProfile();
}, { passive: true });

// ── COMMUNITY CHIP FILTER ──
document.getElementById('community-chips')?.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', function () {
    document.getElementById('community-chips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    this.classList.add('active');
    renderCommunities(this.dataset.filter);
  });
});

// ── SWIPE TO CLOSE: community overlay ──
const communityOverlay = document.getElementById('community-overlay');
communityOverlay.addEventListener('touchstart', e => { touchStartY = e.touches[0].clientY; }, { passive: true });
communityOverlay.addEventListener('touchend', e => {
  if (e.changedTouches[0].clientY - touchStartY > 80 && communityOverlay.scrollTop === 0) closeCommunity();
}, { passive: true });

// ── IMAGE RESIZE HELPER ──
function resizeImage(file, maxPx, quality = 0.82) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.width, h = img.height;
      if (w > maxPx || h > maxPx) {
        if (w > h) { h = Math.round(h * maxPx / w); w = maxPx; }
        else       { w = Math.round(w * maxPx / h); h = maxPx; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

// ── PROFILE EDIT ──
function openEditProfile() {
  const user = DataService.getCurrentUser();
  if (!user) return;
  document.getElementById('edit-displayname').value = user.displayName || user.username || '';
  document.getElementById('edit-bio').value          = user.bio || '';
  const avatarEl = document.getElementById('edit-avatar-preview');
  if (avatarEl) avatarEl.src = user.avatar || '';
  document.getElementById('edit-profile-sheet').classList.add('open');
}

function closeEditProfile() {
  document.getElementById('edit-profile-sheet').classList.remove('open');
}

async function handleAvatarFile(input) {
  const file = input.files[0];
  if (!file) return;
  const dataURL = await resizeImage(file, 300, 0.85);
  if (dataURL) document.getElementById('edit-avatar-preview').src = dataURL;
}

function saveEditProfile() {
  const displayName = document.getElementById('edit-displayname').value.trim();
  const bio         = document.getElementById('edit-bio').value.trim();

  if (!displayName) { showToast('Ad boş olamaz'); return; }

  const avatarEl  = document.getElementById('edit-avatar-preview');
  const rawSrc    = avatarEl ? avatarEl.getAttribute('src') : '';
  const avatar    = (rawSrc && rawSrc.startsWith('data:')) ? rawSrc
                  : (DataService.getCurrentUser()?.avatar || '');

  const updated = DataService.updateCurrentUser({ displayName, bio, avatar });
  if (updated) {
    renderProfileHero(updated);
    closeEditProfile();
    showToast('Profil güncellendi');
  }
}

// ── POSTS ──
let _pendingPostImage = null;

function openAddPost() {
  _pendingPostImage = null;
  document.getElementById('post-caption').value     = '';
  document.getElementById('post-photo-preview').style.display = 'none';
  document.getElementById('post-photo-picker').style.display  = 'flex';
  document.getElementById('post-file-input').value  = '';
  document.getElementById('add-post-sheet').classList.add('open');
}

function closeAddPost() {
  document.getElementById('add-post-sheet').classList.remove('open');
}

async function handlePostFile(input) {
  const file = input.files[0];
  if (!file) return;
  const dataURL = await resizeImage(file, 900, 0.80);
  if (!dataURL) return;
  _pendingPostImage = dataURL;
  const preview = document.getElementById('post-photo-preview');
  preview.src = dataURL;
  preview.style.display = 'block';
  document.getElementById('post-photo-picker').style.display = 'none';
}

function savePost() {
  const caption = document.getElementById('post-caption').value.trim();
  if (!_pendingPostImage && !caption) { showToast('Fotoğraf veya açıklama ekle'); return; }

  DataService.addPost({ imageData: _pendingPostImage, caption });
  closeAddPost();
  renderPosts();
  showToast('Gönderi paylaşıldı!');
}

function renderPosts() {
  const grid    = document.getElementById('posts-grid');
  const empty   = document.getElementById('posts-empty');
  if (!grid) return;
  const posts = DataService.getPosts();

  if (posts.length === 0) {
    grid.innerHTML = '';
    if (empty) empty.style.display = 'flex';
    return;
  }
  if (empty) empty.style.display = 'none';

  grid.innerHTML = posts.map(p => `
    <div class="post-card">
      ${p.imageData ? `<div class="post-img" style="background-image:url('${p.imageData}')"></div>` : ''}
      ${p.caption   ? `<p class="post-caption-text">${p.caption}</p>` : ''}
      <div class="post-meta">
        <span class="post-date">${formatPostDate(p.date)}</span>
        <button class="post-delete" onclick="deletePost('${p.id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </div>
    </div>`).join('');
}

function deletePost(id) {
  DataService.deletePost(id);
  renderPosts();
}

function formatPostDate(iso) {
  try {
    const d = new Date(iso);
    const months = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch { return ''; }
}

// ── FEATURED CONCERTS (homepage) ──
async function loadFeaturedConcerts() {
  // Load both city sections in parallel
  loadCitySection('ankara-card-row', () => DataService.getAnkaraConcerts(), 6);
  loadCitySection('istanbul-card-row', () => DataService.getIstanbulConcerts(), 6, true);
}

async function loadCitySection(rowId, fetcher, limit, updateHero = false) {
  const row = document.getElementById(rowId);
  if (!row) return;
  try {
    const events = await fetcher();
    if (!events || events.length === 0) {
      row.innerHTML = '<p style="color:#555;font-size:12px;padding:8px 0">Yakın tarihte etkinlik bulunamadı</p>';
      return;
    }
    if (updateHero) {
      const hero = events.find(e => e.image) || events[0];
      if (hero) updateHeroCard(hero);
    }
    row.innerHTML = events.slice(0, limit).map(renderLiveEventCard).join('');
  } catch (_) {
    row.innerHTML = '';
  }
}

function updateHeroCard(ev) {
  const $ = id => document.getElementById(id);
  if (!$('home-hero-card')) return;

  if (ev.image) $('hero-img').style.backgroundImage = `url('${ev.image}')`;
  $('hero-title').textContent = ev.name;
  $('hero-tag').textContent   = 'Ticketmaster · Öne Çıkan';

  const parts = [];
  if (ev.venue) parts.push(ev.venue);
  if (ev.city)  parts.push(ev.city);
  if (ev.date)  parts.push(formatDay(ev.date) + ' ' + formatMonth(ev.date));
  $('hero-sub').textContent = parts.join(' · ');

  if (ev.priceMin) {
    $('hero-badge').textContent = '₺' + Math.round(ev.priceMin);
  } else {
    $('hero-badge').textContent = 'Bilet';
  }
  $('hero-attending').textContent = 'Ticketmaster\'da bak →';

  const card = $('home-hero-card');
  card.onclick = null;
  card.style.cursor = 'pointer';
  card.addEventListener('click', () => window.open(ev.url, '_blank', 'noopener'));
}

function renderLiveEventCard(ev) {
  const dateStr = ev.date
    ? formatDay(ev.date) + ' ' + formatMonth(ev.date)
    : '—';
  const location = [ev.venue, ev.city].filter(Boolean).join(' · ');
  const imgStyle = ev.image
    ? `background-image:url('${ev.image}')`
    : `background:#1a1a1a`;
  const price = ev.priceMin
    ? '₺' + Math.round(ev.priceMin) + '\'den'
    : 'Bilet';

  return `
    <div class="event-card" onclick="window.open('${ev.url}','_blank','noopener')">
      <div class="event-card-img" style="${imgStyle}"></div>
      <div class="event-card-body">
        <p class="card-venue">${location}</p>
        <h4 class="card-name">${ev.name}</h4>
        <p class="card-date">${dateStr}</p>
        <div class="card-footer">
          <span class="card-rating">${price}</span>
          <span class="card-want-btn tm-badge">TM</span>
        </div>
      </div>
    </div>`;
}

// ── AUTH ──
function initAuth() {
  const user = DataService.getCurrentUser();
  if (!user) {
    document.getElementById('auth-overlay').style.display = 'flex';
  } else {
    document.getElementById('auth-overlay').style.display = 'none';
    renderProfileHero(user);
  }
}

function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('auth-tab-login').classList.toggle('active', isLogin);
  document.getElementById('auth-tab-signup').classList.toggle('active', !isLogin);
  document.getElementById('auth-login-form').style.display  = isLogin ? 'flex' : 'none';
  document.getElementById('auth-signup-form').style.display = isLogin ? 'none'  : 'flex';
  document.getElementById('login-error').textContent  = '';
  document.getElementById('signup-error').textContent = '';
}

function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  try {
    const user = DataService.login(username, password);
    document.getElementById('auth-overlay').style.display = 'none';
    renderProfileHero(user);
    showToast('Hoş geldin, ' + (user.displayName || user.username) + '!');
  } catch (err) {
    errEl.textContent = err.message;
  }
}

function handleSignup(e) {
  e.preventDefault();
  const username    = document.getElementById('signup-username').value;
  const displayName = document.getElementById('signup-displayname').value;
  const bio         = document.getElementById('signup-bio').value;
  const password    = document.getElementById('signup-password').value;
  const errEl = document.getElementById('signup-error');
  try {
    const user = DataService.signup({ username, displayName, bio, password });
    document.getElementById('auth-overlay').style.display = 'none';
    renderProfileHero(user);
    showToast('Hesap oluşturuldu, hoş geldin ' + (user.displayName || user.username) + '!');
  } catch (err) {
    errEl.textContent = err.message;
  }
}

function renderProfileHero(user) {
  const avatarEl = document.getElementById('profile-my-avatar');
  const nameEl   = document.getElementById('profile-my-name');
  const bioEl    = document.getElementById('profile-my-bio');
  if (avatarEl) avatarEl.src = user.avatar || ('https://i.pravatar.cc/80?u=' + encodeURIComponent(user.username));
  if (nameEl)   nameEl.textContent = user.displayName || user.username;
  if (bioEl)    bioEl.textContent  = user.bio || '';
}

function openSettings() {
  const user = DataService.getCurrentUser();
  if (!user) return;
  const el = id => document.getElementById(id);
  el('settings-avatar').src      = user.avatar || '';
  el('settings-username').textContent   = user.displayName || user.username;
  el('settings-bio-preview').textContent = user.bio || '@' + user.username;
  el('settings-sheet').classList.add('open');
}

function closeSettings() {
  document.getElementById('settings-sheet').classList.remove('open');
}

function confirmLogout() {
  closeSettings();
  DataService.spotifyDisconnect();
  DataService.logout();
  refreshSpotifyUI();
  document.getElementById('personal-feed-content').innerHTML = '';
  document.getElementById('auth-overlay').style.display = 'flex';
  navigate('screen-home');
  document.getElementById('profile-my-name').textContent = '—';
  document.getElementById('profile-my-bio').textContent  = '';
  document.getElementById('profile-my-avatar').src = 'https://i.pravatar.cc/80?img=15';
}

// ── ACTIVITY TABS ──
function switchActivityTab(btn, panelId) {
  document.querySelectorAll('#screen-activity .tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.activity-tab-panel').forEach(p => p.style.display = 'none');
  const panel = document.getElementById(panelId);
  if (panel) panel.style.display = 'block';
  if (panelId === 'activity-personal') loadPersonalFeed();
}

// ── SPOTIFY UI ──
function refreshSpotifyUI() {
  const connected = DataService.spotifyIsConnected();
  const disco = document.getElementById('spotify-disconnected');
  const conn  = document.getElementById('spotify-connected');
  if (disco) disco.style.display = connected ? 'none'  : 'flex';
  if (conn)  conn.style.display  = connected ? 'flex' : 'none';
}

async function connectSpotify() {
  try {
    await DataService.spotifyConnect();
  } catch (e) {
    showToast('Spotify bağlanamadı: ' + e.message);
  }
}

function disconnectSpotify() {
  DataService.spotifyDisconnect();
  refreshSpotifyUI();
  document.getElementById('personal-feed-content').innerHTML = '';
  showToast('Spotify bağlantısı kesildi');
}

// ── PERSONAL FEED (Sana Özel) ──
async function loadPersonalFeed() {
  const container = document.getElementById('personal-feed-content');
  if (!container) return;

  if (!DataService.spotifyIsConnected()) {
    container.innerHTML = `
      <div class="empty-state" style="padding-top:48px">
        <svg class="empty-icon-svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        <p class="empty-title">Spotify Bağlı Değil</p>
        <p class="empty-sub">Öneri görmek için profil sayfasından Spotify'ı bağla</p>
      </div>`;
    return;
  }

  container.innerHTML = renderRecsSkeletons();

  try {
    const artists = await DataService.spotifyGetArtists();
    if (artists.length === 0) {
      container.innerHTML = '<div class="empty-state" style="padding-top:48px"><p class="empty-title">Sanatçı bulunamadı</p><p class="empty-sub">Spotify geçmişinde sanatçı yok</p></div>';
      return;
    }
    const recs = await DataService.getRecommendations(artists);
    renderRecommendations(container, recs, artists);
  } catch (e) {
    container.innerHTML = `<div class="empty-state" style="padding-top:48px"><p class="empty-title">Hata oluştu</p><p class="empty-sub">${e.message}</p></div>`;
  }
}

function renderRecsSkeletons() {
  return Array.from({ length: 3 }, () => `
    <div class="rec-skeleton">
      <div class="rec-skeleton-img"></div>
      <div class="rec-skeleton-body">
        <div class="rec-skeleton-line wide"></div>
        <div class="rec-skeleton-line short"></div>
        <div class="rec-skeleton-line mid"></div>
      </div>
    </div>`).join('');
}

function renderRecommendations(container, recs, artists) {
  if (!recs || recs.length === 0) {
    const names = artists.slice(0, 3).join(', ');
    container.innerHTML = `
      <div class="empty-state" style="padding-top:48px">
        <svg class="empty-icon-svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <p class="empty-title">Türkiye'de yakın konser yok</p>
        <p class="empty-sub">${names} için TR'de bilet bulunamadı</p>
      </div>`;
    return;
  }

  const html = recs.map(({ artist, events }) => `
    <div class="rec-artist-group">
      <div class="rec-artist-header">
        <span class="rec-artist-name">${artist}</span>
        <span class="rec-event-count">${events.length} konser</span>
      </div>
      ${events.map(ev => `
        <a class="rec-event-card" href="${ev.url}" target="_blank" rel="noopener">
          ${ev.image ? `<div class="rec-event-img" style="background-image:url('${ev.image}')"></div>` : ''}
          <div class="rec-event-info">
            <span class="rec-event-name">${ev.name}</span>
            <span class="rec-event-meta">${ev.date || ''}${ev.venue ? ' · ' + ev.venue : ''}${ev.city ? ', ' + ev.city : ''}</span>
          </div>
          <svg class="rec-event-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </a>`).join('')}
    </div>`).join('');

  container.innerHTML = `<div class="rec-header-row"><span class="rec-header-title">Sana Özel Konserler</span><span class="rec-header-sub">Spotify'dan ${artists.length} sanatçıya göre</span></div>${html}`;
}

// ── SPOTIFY CALLBACK (PKCE) ──
async function initSpotifyCallback() {
  const params = new URLSearchParams(window.location.search);
  const code  = params.get('code');
  const state = params.get('state');
  if (!code || state !== 'reprise-pkce') return;

  // Clean URL immediately so reloads don't retrigger
  window.history.replaceState({}, '', window.location.pathname);

  showToast('Spotify bağlanıyor…');
  try {
    await DataService.spotifyHandleCallback(code);
    refreshSpotifyUI();
    navigate('screen-activity');
    setTimeout(() => {
      const personalTab = document.querySelector('#screen-activity .tab:last-child');
      if (personalTab) switchActivityTab(personalTab, 'activity-personal');
    }, 200);
    showToast('Spotify bağlandı!');
  } catch (e) {
    showToast('Bağlantı hatası: ' + e.message);
  }
}

// ── SHARE — Concert Card ──────────────────────────────────────────────────
let _shareConcert = null;   // the concert being shared
let _shareRatio   = 'story';
let _shareDataUrl = null;   // current generated PNG

function shareCurrentConcert() {
  const c = DataService.getHistory().find(h => h.id === currentDetailId);
  if (!c) { showToast('Konser bulunamadı'); return; }
  _shareConcert = c;
  _shareRatio   = 'story';
  document.getElementById('sratio-story').classList.add('active');
  document.getElementById('sratio-square').classList.remove('active');
  document.getElementById('share-preview-overlay').classList.add('open');
  _generateShareCard();
}

function closeSharePreview() {
  document.getElementById('share-preview-overlay').classList.remove('open');
  _shareDataUrl = null;
}

async function _generateShareCard() {
  _setShareLoading(true);
  try {
    const user = DataService.getCurrentUser();
    _shareDataUrl = await ShareService.concertCard(_shareConcert, user, _shareRatio);
    _setShareLoading(false, _shareDataUrl);
  } catch (e) {
    console.error('Share card error:', e);
    _setShareLoading(false, null);
    showToast('Kart hatası: ' + (e && e.message ? e.message : String(e)));
  }
}

async function setShareRatio(ratio) {
  if (_shareRatio === ratio) return;
  _shareRatio = ratio;
  document.getElementById('sratio-story').classList.toggle('active',  ratio === 'story');
  document.getElementById('sratio-square').classList.toggle('active', ratio === 'square');
  await _generateShareCard();
}

function _setShareLoading(loading, dataUrl) {
  const loadEl = document.getElementById('share-loading');
  const imgEl  = document.getElementById('share-preview-img');
  const dlBtn  = document.getElementById('share-dl-btn');
  const shBtn  = document.getElementById('share-share-btn');
  loadEl.style.display = loading ? 'flex' : 'none';
  if (!loading && dataUrl) { imgEl.src = dataUrl; imgEl.style.display = 'block'; }
  else if (!loading)       { imgEl.style.display = 'none'; }
  else                     { imgEl.style.display = 'none'; }
  dlBtn.disabled = loading || !dataUrl;
  shBtn.disabled = loading || !dataUrl;
}

async function downloadShareCard() {
  if (!_shareDataUrl) return;
  const name = (_shareConcert?.artist || 'reprise').toLowerCase().replace(/\s+/g, '-');
  const a = document.createElement('a');
  a.href = _shareDataUrl;
  a.download = `reprise-${name}-${_shareRatio}.png`;
  a.click();
}

async function doShare() {
  if (!_shareDataUrl) return;
  const name = (_shareConcert?.artist || 'reprise').toLowerCase().replace(/\s+/g, '-');
  const result = await ShareService.shareOrDownload(
    _shareDataUrl,
    `reprise-${name}-${_shareRatio}.png`
  );
  if (result === 'downloaded') showToast('Görsel indirildi!');
}

// ── WRAPPED ──────────────────────────────────────────────────────────────────
let _wrappedStats   = null;
let _wrappedDataUrl = null;
let _wrappedRatio   = 'story';

function openWrapped() {
  const history = DataService.getHistory();
  const years   = WrappedService.availableYears(history);

  const sel = document.getElementById('wrapped-year-sel');
  if (!years.length) {
    sel.innerHTML = `<option value="">${new Date().getFullYear()}</option>`;
  } else {
    sel.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
  }

  document.getElementById('wrapped-overlay').classList.add('open');
  document.getElementById('wrapped-dl-btn').disabled    = true;
  document.getElementById('wrapped-share-btn').disabled = true;

  if (years.length) {
    loadWrapped(years[0]);
  } else {
    document.getElementById('wrapped-loading').style.display = 'none';
    document.getElementById('wrapped-empty').style.display   = 'flex';
    document.getElementById('wrapped-preview-img').style.display = 'none';
  }
}

function closeWrapped() {
  document.getElementById('wrapped-overlay').classList.remove('open');
  _wrappedStats   = null;
  _wrappedDataUrl = null;
}

async function loadWrapped(year) {
  document.getElementById('wrapped-loading').style.display    = 'flex';
  document.getElementById('wrapped-empty').style.display      = 'none';
  document.getElementById('wrapped-preview-img').style.display = 'none';
  document.getElementById('wrapped-dl-btn').disabled    = true;
  document.getElementById('wrapped-share-btn').disabled = true;

  const history = DataService.getHistory();
  const stats   = WrappedService.compute(history, Number(year));

  if (!stats) {
    document.getElementById('wrapped-loading').style.display = 'none';
    document.getElementById('wrapped-empty').style.display   = 'flex';
    return;
  }

  _wrappedStats = stats;
  try {
    const user = DataService.getCurrentUser();
    _wrappedDataUrl = await ShareService.wrappedCard(stats, user, _wrappedRatio);
    const img = document.getElementById('wrapped-preview-img');
    img.src = _wrappedDataUrl;
    img.style.display = 'block';
    document.getElementById('wrapped-loading').style.display = 'none';
    document.getElementById('wrapped-dl-btn').disabled    = false;
    document.getElementById('wrapped-share-btn').disabled = false;
  } catch (e) {
    closeWrapped();
    showToast('Wrapped oluşturulamadı');
  }
}

async function downloadWrapped() {
  if (!_wrappedDataUrl) return;
  const year = _wrappedStats?.year || new Date().getFullYear();
  const a = document.createElement('a');
  a.href = _wrappedDataUrl;
  a.download = `reprise-wrapped-${year}.png`;
  a.click();
}

async function doShareWrapped() {
  if (!_wrappedDataUrl) return;
  const year = _wrappedStats?.year || new Date().getFullYear();
  const result = await ShareService.shareOrDownload(
    _wrappedDataUrl,
    `reprise-wrapped-${year}.png`
  );
  if (result === 'downloaded') showToast('Görsel indirildi!');
}

// ── SEARCH SCREEN: chip / section toggle ──
document.getElementById('search-genre-chips')?.addEventListener('click', function(e) {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  const isUsers = chip.dataset.section === 'users';
  const userSection = document.getElementById('user-search-section');
  const eventGrid   = document.getElementById('event-search-grid');
  if (userSection) userSection.style.display = isUsers ? 'block' : 'none';
  if (eventGrid)   eventGrid.style.display   = isUsers ? 'none'  : 'grid';
  if (isUsers) initUserSearch();
});

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  const _initUser = DataService.getCurrentUser();
  if (_initUser) {
    DataService._syncUserToBackend(_initUser);
    loadNotifications();
    _notifPollTimer = setInterval(() => { if (DataService.getCurrentUser()) loadNotifications(); }, 60_000);
  }
  document.getElementById('msg-input')?.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });
  loadFeaturedConcerts();
  refreshProfileStats();
  refreshFollowStats();
  renderMyAttended();
  renderTimeline();
  refreshProfileCommunities();
  refreshSpotifyUI();
  initSpotifyCallback();
});
