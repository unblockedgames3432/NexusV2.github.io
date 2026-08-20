/* NEXUS V2 · home page · decorative particle field,
   tab switching, games from the on-disk manifest,
   embedded media player. Follows saved user settings. */

(function () {
  const canvas = document.getElementById('particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const { store, prefs, DENSITY, SPEED, applyUserTheme } = window.NexusTheme;
  const t = applyUserTheme(prefs);

  const bloomOn = !!prefs.bloom;
  const speedFactor = SPEED[prefs.speed] || 1;
  const particleHues = t.hues;

  let w = 0, h = 0, parts = [];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seed() {
    const base = Math.min(32, Math.max(18, Math.floor((w * h) / 34000)));
    const count = Math.max(8, Math.round(base * (DENSITY[prefs.density] || 1)));
    parts = [];
    for (let i = 0; i < count; i++) {
      const big = Math.random() < 0.16;
      parts.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: big ? 1.7 + Math.random() * 0.9 : 0.5 + Math.random() * 1.1,
        vx: (Math.random() - 0.5) * 0.07 * speedFactor,
        vy: -(0.02 + Math.random() * (big ? 0.07 : 0.13)) * speedFactor,
        hue: particleHues[(Math.random() * particleHues.length) | 0],
        a: big ? 0.04 + Math.random() * 0.1 : 0.07 + Math.random() * 0.24,
        tw: Math.random() * Math.PI * 2,
        tws: 0.006 + Math.random() * 0.018,
      });
    }
  }

  function tick() {
    ctx.clearRect(0, 0, w, h);
    ctx.shadowBlur = bloomOn ? 5 : 0;
    for (const p of parts) {
      p.x += p.vx;
      p.y += p.vy;
      p.tw += p.tws;
      if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
      const a = p.a * (0.5 + 0.5 * Math.sin(p.tw));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.shadowColor = 'hsla(' + p.hue + ', 85%, 72%, ' + a + ')';
      ctx.fillStyle = 'hsla(' + p.hue + ', 88%, 74%, ' + a + ')';
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    requestAnimationFrame(tick);
  }

  resize();
  seed();
  addEventListener('resize', function () { resize(); seed(); });
  tick();

  /* ---------- tabs ---------- */

  const tabBtns = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  function showTab(name) {
    tabBtns.forEach(function (b) {
      const on = b.dataset.tab === name;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    panels.forEach(function (p) {
      p.classList.toggle('active', p.dataset.panel === name);
    });
    window.scrollTo(0, 0);
  }

  tabBtns.forEach(function (b) {
    b.addEventListener('click', function () { showTab(b.dataset.tab); });
  });

  /* ---------- game library (folder manifest) ---------- */

  const gameGrid = document.getElementById('game-grid');
  const gamesStatus = document.getElementById('games-status');
  const gameCount = document.getElementById('game-count');
  const gamesHint = document.getElementById('games-hint');

  let GAMES = Array.isArray(window.NEXUS_GAMES) ? window.NEXUS_GAMES.slice() : [];

  function el(tag, cls) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }

  function renderGames() {
    if (gameCount) gameCount.textContent = GAMES.length + (GAMES.length === 1 ? ' game' : ' games');
    gameGrid.innerHTML = '';
    if (!GAMES.length) {
      if (gamesStatus) gamesStatus.textContent = 'library empty — add a game file and a manifest entry';
      return;
    }
    if (gamesStatus) gamesStatus.textContent = '';
    GAMES.forEach(function (g) { gameGrid.appendChild(makeCard(g)); });
  }

  function makeCard(g) {
    const card = el('article', 'card game-card');
    const cover = el('div', 'game-cover');
    cover.style.setProperty('--ga', g.accent || '#f472b6');
    if (g.iconImg) {
      const img = el('img', 'game-icon-img');
      img.src = g.iconImg;
      img.alt = '';
      img.loading = 'lazy';
      cover.appendChild(img);
    } else {
      const icon = el('span', 'game-icon');
      icon.textContent = g.icon || '🎮';
      cover.appendChild(icon);
    }

    const title = el('h3', 'card-title');
    title.textContent = g.title;
    const sub = el('p', 'card-sub');
    sub.textContent = g.desc || '';
    const rating = el('div', 'game-rating');
    rating.textContent = ratingText(g.id);

    const foot = el('div', 'game-foot');
    const a = el('a', 'btn btn-primary btn-sm');
    a.href = g.url;
    a.textContent = 'Play';
    if (/^https?:/i.test(g.url)) { a.target = '_blank'; a.rel = 'noopener'; }
    foot.appendChild(a);

    card.appendChild(cover);
    card.appendChild(title);
    card.appendChild(sub);
    card.appendChild(rating);
    card.appendChild(foot);
    return card;
  }

  /* ---------- social grid ---------- */

  /* device id: stable per browser, identifies this member on the feed */
  const DEVICE_ID_KEY = 'nx_device';
  let deviceId = '';
  try { deviceId = String(store.get(DEVICE_ID_KEY, '') || ''); } catch (e) {}
  if (!deviceId) {
    deviceId = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
    try { store.set(DEVICE_ID_KEY, deviceId); } catch (e) {}
  }

  /* the social feed is owned by the server (shared across devices).
     this object mirrors the latest /api/social snapshot locally. */
  const social = {
    users: [],
    friends: [],
    requests: { inbound: [], outbound: [] },
    groups: [],
    messages: [],
    dms: [],
    activity: [],
    ratings: {}
  };
  let socialPollTimer = null;
  let socialLastPoll = 0;
  let socialSig = null;
  const dmSeen = {}; // target -> last t we have open in the chat pane

  const SENDER_COLORS = ['#f472b6', '#a78bfa', '#22d3ee', '#fbbf24', '#34d399', '#fb7185'];
  function senderColor(name) {
    let h = 0;
    const s = String(name || '');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return SENDER_COLORS[h % SENDER_COLORS.length];
  }

  function setLive(on) {
    const live = document.getElementById('social-live');
    if (live) {
      live.className = 'live-dot' + (on ? ' on' : ' off');
      live.setAttribute('aria-label', on ? 'Live synced' : 'Offline');
      live.lastChild.textContent = on ? 'live' : 'offline';
    }
  }

  function applySocial(d) {
    if (!d || !Array.isArray(d.messages)) return;
    const sig = JSON.stringify({ u: d.users, f: d.friends, m: d.messages, d: d.dms, r: d.ratings, a: d.activity, q: d.requests });
    social.users = Array.isArray(d.users) ? d.users : [];
    social.friends = Array.isArray(d.friends) ? d.friends : [];
    social.requests = d.requests && typeof d.requests === 'object' ? { inbound: d.requests.inbound || [], outbound: d.requests.outbound || [] } : { inbound: [], outbound: [] };
    social.groups = Array.isArray(d.groups) ? d.groups : [];
    social.messages = Array.isArray(d.messages) ? d.messages : [];
    social.dms = Array.isArray(d.dms) ? d.dms : [];
    social.activity = Array.isArray(d.activity) ? d.activity : [];
    social.ratings = d.ratings && typeof d.ratings === 'object' ? d.ratings : {};
    if (sig !== socialSig) {
      socialSig = sig;
      renderSocial();
      if (typeof renderGames === 'function') renderGames();
      if (typeof profile !== 'undefined' && typeof renderProfile === 'function') renderProfile();
    }
  }

  function senderName() {
    try {
      if (typeof profile !== 'undefined' && profile && profile.handle) return profile.handle;
    } catch (e) {}
    return '@operator';
  }

  function fetchSocial() {
    if (Date.now() - socialLastPoll < 1200) return Promise.resolve();
    socialLastPoll = Date.now();
    return fetch('/api/social/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: deviceId, name: senderName() })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) { setLive(true); applySocial(d); })
      .catch(function () { setLive(false); });
  }

  let demoMode = false;

  function setDemoMode() {
    if (demoMode) return;
    demoMode = true;
    setLive(false);
    const live = document.getElementById('social-live');
    if (live) live.lastChild.textContent = 'demo';
    const shell = document.querySelector('.social-shell');
    if (shell) {
      const note = el('div', 'demo-note');
      note.textContent = 'Static preview — run node server.js for live chat, friends and ratings.';
      shell.insertBefore(note, shell.firstChild);
    }
    [chatForm, friendForm].forEach(function (f) {
      if (f) {
        Array.prototype.forEach.call(f.querySelectorAll('input,button'), function (n) { n.disabled = true; });
      }
    });
  }

  function startSocial() {
    if (socialPollTimer || demoMode) return;
    NexusTheme.probeBackend().then(function (live) {
      if (!live) { setDemoMode(); return; }
      fetchSocial();
      socialPollTimer = setInterval(fetchSocial, 5000);
    });
  }

  function timeAgo(ts) {
    const s = Math.max(1, Math.round((Date.now() - Number(ts || Date.now())) / 1000));
    if (s < 60) return s + 's ago';
    const m = Math.round(s / 60);
    if (m < 60) return m + 'm ago';
    const h = Math.round(m / 60);
    if (h < 24) return h + 'h ago';
    return Math.round(h / 24) + 'd ago';
  }

  function pushActivity(text) {
    fetch('/api/social/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text })
    }).catch(function () {});
  }

  const RATING_NONE = { avg: 0, count: 0, mine: 0 };
  function ratingInfo(id) {
    const r = social.ratings && social.ratings[id];
    if (!r || typeof r !== 'object') return RATING_NONE;
    return {
      avg: Number(r.avg) || 0,
      count: Number(r.count) || 0,
      mine: Number(r.mine) || 0
    };
  }
  function ratingText(id) {
    const r = ratingInfo(id);
    return r.count ? 'Rating ' + r.avg + '/5' : 'Not rated yet';
  }
  function ratedCount() {
    return Object.keys(social.ratings).filter(function (k) { return ratingInfo(k).count > 0; }).length;
  }

  renderGames();

  const onlineCount = document.getElementById('online-count');
  const friendCount = document.getElementById('friend-count');
  const messageCount = document.getElementById('message-count');
  const ratingCount = document.getElementById('rating-count');
  const chatTarget = document.getElementById('chat-target');
  const chatLog = document.getElementById('chat-log');
  const chatForm = document.getElementById('chat-form');
  const chatName = document.getElementById('chat-name');
  const chatInput = document.getElementById('chat-input');
  const friendForm = document.getElementById('friend-form');
  const friendName = document.getElementById('friend-name');
  const friendList = document.getElementById('friend-list');
  const groupList = document.getElementById('group-list');
  const ratingList = document.getElementById('rating-list');
  const activityList = document.getElementById('activity-list');

  function renderSocial() {
    if (!chatLog) return;
    if (friendCount) friendCount.textContent = social.friends.length + (social.friends.length === 1 ? ' friend' : ' friends');
    if (messageCount) messageCount.textContent = social.messages.length + (social.messages.length === 1 ? ' message' : ' messages');
    const rated = ratedCount();
    if (ratingCount) ratingCount.textContent = rated + (rated === 1 ? ' rating' : ' ratings');

    renderTargets();
    renderChat();
    renderFriends();
    renderGroups();
    renderRatings();
    renderActivity();
  }

  function emptyLog(text, glyph) {
    const box = el('div', 'chat-empty');
    const g = el('span', 'chat-empty-glyph');
    g.textContent = glyph || '·';
    const t = el('span');
    t.textContent = text;
    box.appendChild(g);
    box.appendChild(t);
    return box;
  }

  function renderSocial() {
    if (!chatLog) return;
    const onlineN = social.users.filter(function (u) { return u.status === 'online'; }).length;
    if (onlineCount) onlineCount.textContent = onlineN + (onlineN === 1 ? ' online' : ' online');
    const friendN = social.friends ? social.friends.length : 0;
    const msgN = social.messages.length + social.dms.length;
    if (friendCount) friendCount.textContent = friendN + (friendN === 1 ? ' friend' : ' friends');
    if (messageCount) messageCount.textContent = msgN + (msgN === 1 ? ' message' : ' messages');
    const rated = ratedCount();
    if (ratingCount) ratingCount.textContent = rated + (rated === 1 ? ' rating' : ' ratings');

    renderTargets();
    renderChat();
    renderFriends();
    renderGroups();
    renderRatings();
    renderActivity();
    renderNetBadge();
  }

  function renderNetBadge() {
    const b = document.getElementById('request-badge');
    if (!b) return;
    const n = (social.requests.inbound || []).length;
    if (n > 0) { b.hidden = false; b.textContent = n; }
    else b.hidden = true;
  }

  function dmTarget(uid) { return 'dm:' + uid; }
  function isDmTarget(t) { return String(t || '').indexOf('dm:') === 0; }
  function dmPeer(t) { return isDmTarget(t) ? String(t).slice(3) : ''; }

  function friendByUid(uid) {
    return (social.friends || []).find(function (f) { return f.uid === uid; });
  }
  function peerName(uid) {
    const f = friendByUid(uid);
    if (f) return f.name;
    const u = (social.users || []).find(function (x) { return x.uid === uid; });
    return u ? u.name : 'unknown';
  }

  function dmThread(uid) {
    return social.dms
      .filter(function (d) { return (d.from === deviceId && d.to === uid) || (d.from === uid && d.to === deviceId); })
      .sort(function (a, b) { return Number(a.t) - Number(b.t); });
  }

  function unreadFor(uid) {
    const last = Number(dmSeen[dmTarget(uid)] || 0);
    return social.dms.filter(function (d) { return d.to === deviceId && d.from === uid && Number(d.t) > last; }).length;
  }

  function avatarEl(name, uid) {
    const a = el('span', 'avatar');
    const c = senderColor(name);
    a.style.setProperty('--av', c);
    a.textContent = String(name || '?').replace(/^@/, '').charAt(0).toUpperCase();
    a.title = name;
    if (uid === deviceId) a.classList.add('you');
    return a;
  }

  function renderTargets() {
    const current = chatTarget.value;
    chatTarget.innerHTML = '';
    social.groups.forEach(function (g) {
      const o = document.createElement('option');
      o.value = g.name;
      o.textContent = '#' + g.name;
      chatTarget.appendChild(o);
    });
    social.friends.forEach(function (f) {
      const o = document.createElement('option');
      o.value = dmTarget(f.uid);
      const un = unreadFor(f.uid);
      o.textContent = 'DM · ' + f.name + (un ? ' (' + un + ' new)' : '');
      chatTarget.appendChild(o);
    });
    if (current) chatTarget.value = current;
  }

  function renderChat() {
    chatLog.innerHTML = '';

    if (isDmTarget(chatTarget.value)) {
      const uid = dmPeer(chatTarget.value);
      const msgs = dmThread(uid).slice(-40);
      if (!msgs.length) {
        chatLog.appendChild(emptyLog('Start a private thread with ' + peerName(uid) + '.', '✉'));
        return;
      }
      msgs.forEach(function (m) {
        const own = m.from === deviceId;
        const row = el('div', 'chat-msg' + (own ? ' own' : ''));
        const top = el('div', 'chat-top');
        top.appendChild(avatarEl(own ? senderName() : peerName(m.from), own ? deviceId : m.from));
        const meta = el('div', 'chat-meta');
        const who = el('span', 'msg-name');
        who.style.color = senderColor(own ? senderName() : peerName(m.from));
        who.textContent = own ? senderName() + ' (you)' : peerName(m.from);
        const ago = el('span', 'msg-ago');
        ago.textContent = timeAgo(m.t);
        meta.appendChild(who);
        meta.appendChild(ago);
        top.appendChild(meta);
        const txt = el('p', 'chat-text');
        txt.textContent = m.text;
        row.appendChild(top);
        row.appendChild(txt);
        chatLog.appendChild(row);
      });
      dmSeen[dmTarget(uid)] = Math.max.apply(null, msgs.map(function (m) { return Number(m.t); }));
      chatLog.scrollTop = chatLog.scrollHeight;
      return;
    }

    const target = chatTarget.value || (social.groups[0] && social.groups[0].name) || 'General';
    const msgs = social.messages.filter(function (m) { return m.target === target; }).slice(-30);
    if (!msgs.length) {
      chatLog.appendChild(emptyLog('No messages in #' + target + ' yet.', '✉'));
      return;
    }
    msgs.forEach(function (m) {
      const own = m.uid === deviceId;
      const row = el('div', 'chat-msg' + (own ? ' own' : ''));
      const top = el('div', 'chat-top');
      top.appendChild(avatarEl(m.name, m.uid));
      const meta = el('div', 'chat-meta');
      const who = el('span', 'msg-name');
      who.style.color = senderColor(m.name);
      who.textContent = m.name + (own ? ' (you)' : '');
      const ago = el('span', 'msg-ago');
      ago.textContent = timeAgo(m.t);
      meta.appendChild(who);
      meta.appendChild(ago);
      top.appendChild(meta);
      const txt = el('p', 'chat-text');
      txt.textContent = m.text;
      row.appendChild(top);
      row.appendChild(txt);
      chatLog.appendChild(row);
    });
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function openDm(uid) {
    chatTarget.value = dmTarget(uid);
    renderSocial();
    if (chatInput) chatInput.focus();
  }

  function friendAction(kind, uid) {
    const body = { uid: deviceId };
    let path = '';
    if (kind === 'request') { path = '/api/social/friend/request'; body.fromUid = deviceId; body.fromName = senderName(); body.toUid = uid; }
    else if (kind === 'accept') { path = '/api/social/friend/accept'; body.fromUid = uid; }
    else if (kind === 'decline') { path = '/api/social/friend/decline'; body.fromUid = uid; }
    else if (kind === 'remove') { path = '/api/social/friend/remove'; body.friendUid = uid; }
    else return;
    fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(function (r) { return r.json(); })
      .then(function () { socialSig = null; return fetchSocial(); })
      .catch(function () {});
  }

  function renderFriends() {
    friendList.innerHTML = '';
    const inbound = social.requests.inbound || [];
    const outbound = social.requests.outbound || [];
    const friends = social.friends || [];

    if (inbound.length) {
      const head = el('p', 'roster-head');
      head.textContent = 'Incoming requests';
      friendList.appendChild(head);
      inbound.forEach(function (u) {
        const row = el('div', 'person-row request');
        row.appendChild(avatarEl(u.name, u.uid));
        const info = el('div', 'person-info');
        const nm = el('span', 'person-name');
        nm.textContent = u.name;
        nm.style.color = senderColor(u.name);
        const st = el('span', 'person-status ask');
        st.textContent = 'wants to be friends';
        info.appendChild(nm);
        info.appendChild(st);
        row.appendChild(info);
        const acts = el('div', 'row-actions');
        const ok = el('button', 'btn btn-primary btn-tiny');
        ok.type = 'button';
        ok.textContent = 'Accept';
        ok.addEventListener('click', function () { friendAction('accept', u.uid); });
        const no = el('button', 'btn btn-tiny ghost');
        no.type = 'button';
        no.textContent = 'Decline';
        no.addEventListener('click', function () { friendAction('decline', u.uid); });
        acts.appendChild(ok);
        acts.appendChild(no);
        row.appendChild(acts);
        friendList.appendChild(row);
      });
    }

    if (outbound.length) {
      const head = el('p', 'roster-head');
      head.textContent = 'Pending requests';
      friendList.appendChild(head);
      outbound.forEach(function (u) {
        const row = el('div', 'person-row');
        row.appendChild(avatarEl(u.name, u.uid));
        const info = el('div', 'person-info');
        const nm = el('span', 'person-name');
        nm.textContent = u.name;
        nm.style.color = senderColor(u.name);
        const st = el('span', 'person-status waiting');
        st.textContent = 'waiting…';
        info.appendChild(nm);
        info.appendChild(st);
        row.appendChild(info);
        friendList.appendChild(row);
      });
    }

    if (friends.length) {
      const head = el('p', 'roster-head');
      head.textContent = 'Friends';
      friendList.appendChild(head);
      friends.forEach(function (f) {
        const peer = social.users.find(function (u) { return u.uid === f.uid; });
        const st = peer ? peer.status : 'offline';
        const row = el('div', 'person-row');
        row.appendChild(avatarEl(f.name, f.uid));
        const info = el('div', 'person-info');
        const nm = el('span', 'person-name');
        nm.textContent = f.name;
        nm.style.color = senderColor(f.name);
        const dot = el('span', 'pick-presence ' + st);
        nm.appendChild(dot);
        const stEl = el('span', 'person-status ' + st);
        stEl.textContent = st;
        info.appendChild(nm);
        info.appendChild(stEl);
        row.appendChild(info);
        const acts = el('div', 'row-actions');
        const un = unreadFor(f.uid);
        const msg = el('button', 'btn btn-tiny ghost' + (un ? ' has-unread' : ''));
        msg.type = 'button';
        msg.textContent = un ? 'DM · ' + un : 'DM';
        msg.addEventListener('click', function () { openDm(f.uid); });
        const rm = el('button', 'btn btn-tiny danger');
        rm.type = 'button';
        rm.textContent = 'Remove';
        rm.title = 'Unfriend ' + f.name;
        rm.addEventListener('click', function () { friendAction('remove', f.uid); });
        acts.appendChild(msg);
        acts.appendChild(rm);
        row.appendChild(acts);
        friendList.appendChild(row);
      });
    }

    const around = social.users.filter(function (u) {
      if (u.uid === deviceId) return false;
      if (friends.some(function (f) { return f.uid === u.uid; })) return false;
      if (outbound.some(function (o) { return o.uid === u.uid; })) return false;
      if (inbound.some(function (o) { return o.uid === u.uid; })) return false;
      return true;
    });

    if (around.length) {
      const head = el('p', 'roster-head');
      head.textContent = 'Around you';
      friendList.appendChild(head);
      around.forEach(function (u) {
        const row = el('div', 'person-row');
        row.appendChild(avatarEl(u.name, u.uid));
        const info = el('div', 'person-info');
        const nm = el('span', 'person-name');
        nm.textContent = u.name;
        nm.style.color = senderColor(u.name);
        const dot = el('span', 'pick-presence ' + u.status);
        nm.appendChild(dot);
        const st = el('span', 'person-status ' + u.status);
        st.textContent = u.status;
        info.appendChild(nm);
        info.appendChild(st);
        row.appendChild(info);
        const acts = el('div', 'row-actions');
        const add = el('button', 'btn btn-outline btn-tiny');
        add.type = 'button';
        add.textContent = 'Add friend';
        add.addEventListener('click', function () { friendAction('request', u.uid); });
        acts.appendChild(add);
        row.appendChild(acts);
        friendList.appendChild(row);
      });
    }

    if (!inbound.length && !outbound.length && !friends.length && !around.length) {
      friendList.appendChild(emptyLog('No one is on the network yet.', '⇄'));
    }
  }

  function renderGroups() {
    groupList.innerHTML = '';
    const isDm = isDmTarget(chatTarget.value);
    social.groups.forEach(function (g) {
      const btn = el('button', 'group-pill');
      btn.type = 'button';
      btn.textContent = '#' + g.name;
      btn.classList.toggle('active', !isDm && chatTarget.value === g.name);
      btn.addEventListener('click', function () {
        chatTarget.value = g.name;
        renderSocial();
      });
      groupList.appendChild(btn);
    });
    if (isDm) {
      const dm = el('button', 'group-pill active');
      dm.type = 'button';
      dm.textContent = 'DM · ' + peerName(dmPeer(chatTarget.value));
      dm.addEventListener('click', function () { renderSocial(); });
      groupList.appendChild(dm);
    }
  }

  function submitRating(gid, title, value) {
    fetch('/api/social/rating', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: gid, uid: deviceId, name: senderName(), title: title, value: value })
    })
      .then(function (r) { return r.json(); })
      .then(function () { socialSig = null; return fetchSocial(); })
      .catch(function () {});
  }

  function renderRatings() {
    ratingList.innerHTML = '';
    if (!GAMES.length) {
      ratingList.appendChild(emptyLog('No games available.', '★'));
      return;
    }
    GAMES.forEach(function (g) {
      const r = ratingInfo(g.id);
      const row = el('div', 'rating-row');
      const info = el('div', 'rating-info');
      const name = el('span', 'rating-name');
      name.textContent = g.title;
      const sub = el('span', 'rating-sub');
      sub.textContent = r.count
        ? (r.count + (r.count === 1 ? ' vote' : ' votes') + ' · you ' + (r.mine || '–'))
        : 'No votes yet · tap a star';
      info.appendChild(name);
      info.appendChild(sub);
      const side = el('div', 'rating-side');
      const avg = el('div', 'rating-avg');
      avg.textContent = r.count ? String(r.avg) : '–';
      const mark = document.createElement('small');
      mark.textContent = r.count ? '/5' : '';
      avg.appendChild(mark);
      side.appendChild(avg);
      const stars = el('div', 'stars');
      for (let i = 1; i <= 5; i++) {
        const b = el('button', 'star-btn');
        b.type = 'button';
        b.textContent = i <= r.mine ? '★' : '☆';
        b.classList.toggle('lit', i <= r.mine);
        b.title = 'You rated ' + g.title + ' ' + r.mine + '/5. Click to rate ' + i + '/5' + (r.count ? ' (avg ' + r.avg + ')' : '');
        b.addEventListener('click', (function (val) {
          return function () { submitRating(g.id, g.title, val); };
        })(i));
        stars.appendChild(b);
      }
      side.appendChild(stars);
      row.appendChild(info);
      row.appendChild(side);
      ratingList.appendChild(row);
    });
  }

  function renderActivity() {
    activityList.innerHTML = '';
    if (!social.activity.length) {
      activityList.appendChild(emptyLog('No activity yet.', '◌'));
      return;
    }
    social.activity.slice(0, 10).forEach(function (a) {
      const row = el('div', 'activity-row');
      row.textContent = a.text + ' · ' + timeAgo(a.t);
      activityList.appendChild(row);
    });
  }

  if (chatForm) {
    chatTarget.addEventListener('change', renderSocial);
    chatForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (!text) return;
      const name = chatName.value.trim() || senderName();
      const target = chatTarget.value || 'General';
      chatInput.value = '';

      if (isDmTarget(target)) {
        const toUid = dmPeer(target);
        const optimistic = { id: 'tmp' + Date.now(), from: deviceId, to: toUid, text: text, t: Date.now() };
        social.dms.push(optimistic);
        socialSig = null;
        renderSocial();
        renderProfile();
        fetch('/api/social/dm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromUid: deviceId, toUid: toUid, text: text })
        })
          .then(function (r) { if (!r.ok) throw new Error('dm'); return r.json(); })
          .then(function () { socialSig = null; return fetchSocial(); })
          .catch(function () {});
        return;
      }

      const optimistic = { id: 'tmp' + Date.now(), uid: deviceId, name: name, target: target, text: text, t: Date.now() };
      social.messages.push(optimistic);
      socialSig = null;
      renderSocial();
      renderProfile();
      fetch('/api/social/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: deviceId, name: name, target: target, text: text })
      })
        .then(function (r) { if (!r.ok) throw new Error('send'); return r.json(); })
        .then(function () { socialSig = null; return fetchSocial(); })
        .catch(function () {});
    });

    friendForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const handle = friendName.value.trim().toLowerCase();
      const msg = document.getElementById('friend-msg');
      friendName.value = '';
      if (!handle) return;
      const target = social.users.find(function (u) { return u.uid !== deviceId && u.name.toLowerCase() === handle; });
      if (!target) {
        if (msg) { msg.hidden = false; msg.textContent = 'No one on the network goes by that handle.'; }
        return;
      }
      if (msg) msg.hidden = true;
      friendAction('request', target.uid);
    });

    renderSocial();
    startSocial();
  }

  /* ---------- profile ---------- */

  const PROFILE_DEFAULTS = {
    handle: '@operator',
    display: 'Operator',
    bio: 'Handle, avatar and activity — everything this node presents to the mesh.',
    status: 'online',
    accent: '#f472b6',
    avatar: '',
    createdAt: Date.now()
  };

  function loadProfile() {
    let data;
    try { data = JSON.parse(store.get('nx_profile', 'null')); } catch (e) { data = null; }
    if (!data || typeof data !== 'object') data = {};
    return {
      handle: String(data.handle || PROFILE_DEFAULTS.handle).slice(0, 24),
      display: String(data.display || PROFILE_DEFAULTS.display).slice(0, 36),
      bio: String(data.bio || PROFILE_DEFAULTS.bio).slice(0, 160),
      status: String(data.status || PROFILE_DEFAULTS.status),
      accent: /^#[0-9a-f]{6}$/i.test(data.accent) ? data.accent : PROFILE_DEFAULTS.accent,
      avatar: String(data.avatar || ''),
      createdAt: Number(data.createdAt) || Date.now()
    };
  }

  const profile = loadProfile();

  function saveProfile() {
    store.set('nx_profile', JSON.stringify(profile));
  }

  function currentHandle() {
    return profile && profile.handle ? profile.handle : '@operator';
  }

  function cleanHandle(v) {
    let h = String(v || '').trim().replace(/\s+/g, '-');
    if (!h) h = '@operator';
    if (h.charAt(0) !== '@') h = '@' + h;
    return h.slice(0, 24);
  }

  const profileHeroPic = document.getElementById('profile-hero-pic');
  const profileHeroName = document.getElementById('profile-hero-name');
  const profileHeroBio = document.getElementById('profile-hero-bio');
  const profileChipHandle = document.getElementById('profile-chip-handle');
  const profileChipStatus = document.getElementById('profile-chip-status');
  const profileChipLevel = document.getElementById('profile-chip-level');
  const profilePreview = document.getElementById('profile-preview');
  const profileForm = document.getElementById('profile-form');
  const profileHandle = document.getElementById('profile-handle');
  const profileDisplay = document.getElementById('profile-display');
  const profileBio = document.getElementById('profile-bio');
  const profileStatus = document.getElementById('profile-status');
  const profileAccent = document.getElementById('profile-accent');
  const profileAvatar = document.getElementById('profile-avatar');
  const profileClearAvatar = document.getElementById('profile-clear-avatar');
  const profileMsg = document.getElementById('profile-msg');
  const profileStats = document.getElementById('profile-stats');
  const achievementList = document.getElementById('achievement-list');
  const profileActivity = document.getElementById('profile-activity');

  function profileLevel() {
    const custom = (profile.avatar ? 2 : 0) + (profile.handle !== PROFILE_DEFAULTS.handle ? 1 : 0) + (profile.bio !== PROFILE_DEFAULTS.bio ? 1 : 0);
    return Math.max(1, Math.floor((social.messages.length + social.friends.length + ratedCount() + custom) / 4) + 1);
  }

  function setProfilePic(node) {
    if (!node) return;
    node.style.setProperty('--profile-accent', profile.accent);
    if (profile.avatar) {
      node.classList.add('has-img');
      node.style.backgroundImage = 'url("' + profile.avatar + '")';
      node.innerHTML = '';
    } else {
      node.classList.remove('has-img');
      node.style.backgroundImage = '';
      if (node === profilePreview) node.textContent = (profile.display || profile.handle || 'N').charAt(0).toUpperCase();
    }
  }

  function achievementDefs() {
    const mediaCountLocal = Array.isArray(window.NEXUS_MEDIA) ? window.NEXUS_MEDIA.length : 0;
    return [
      { id: 'profile-ready', name: 'Profile Ready', desc: 'Save your profile once.', on: profile.handle !== PROFILE_DEFAULTS.handle || profile.display !== PROFILE_DEFAULTS.display || profile.bio !== PROFILE_DEFAULTS.bio },
      { id: 'portrait-mode', name: 'Portrait Mode', desc: 'Add a profile picture.', on: !!profile.avatar },
      { id: 'first-message', name: 'First Signal', desc: 'Send or receive a message.', on: social.messages.length > 0 },
      { id: 'connector', name: 'Connector', desc: 'Add at least one friend.', on: social.friends.length > 0 },
      { id: 'critic', name: 'Game Critic', desc: 'Rate one game.', on: ratedCount() >= 1 },
      { id: 'completionist', name: 'Full Review', desc: 'Rate every game.', on: GAMES.length > 0 && ratedCount() >= GAMES.length },
      { id: 'curator', name: 'Media Curator', desc: 'Have media in the library.', on: mediaCountLocal > 0 },
      { id: 'level-five', name: 'Level Five', desc: 'Reach profile level 5.', on: profileLevel() >= 5 }
    ];
  }

  function unlockedAchievements() {
    return achievementDefs().filter(function (a) { return a.on; });
  }

  function renderProfile() {
    if (!profileForm) return;
    profileHandle.value = profile.handle;
    profileDisplay.value = profile.display;
    profileBio.value = profile.bio;
    profileStatus.value = profile.status;
    profileAccent.value = profile.accent;

    if (profileHeroName) profileHeroName.textContent = profile.handle;
    if (profileHeroBio) profileHeroBio.textContent = profile.bio;
    if (profileChipHandle) profileChipHandle.textContent = profile.display + ' ' + profile.handle;
    if (profileChipStatus) profileChipStatus.textContent = profile.status;
    if (profileChipLevel) profileChipLevel.textContent = 'level ' + profileLevel();
    if (chatName && !chatName.value) chatName.placeholder = profile.handle;

    setProfilePic(profilePreview);
    if (profileHeroPic) {
      profileHeroPic.style.setProperty('--profile-accent', profile.accent);
      if (profile.avatar) {
        profileHeroPic.classList.add('has-img');
        profileHeroPic.style.backgroundImage = 'url("' + profile.avatar + '")';
      } else {
        profileHeroPic.classList.remove('has-img');
        profileHeroPic.style.backgroundImage = '';
      }
    }

    renderProfileStats();
    renderAchievements();
    renderProfileActivity();
  }

  function renderProfileStats() {
    profileStats.innerHTML = '';
    const stats = [
      ['Messages', social.messages.length],
      ['Friends', social.friends.length],
      ['Ratings', ratedCount() + '/' + GAMES.length],
      ['Achievements', unlockedAchievements().length + '/' + achievementDefs().length],
      ['Media', Array.isArray(window.NEXUS_MEDIA) ? window.NEXUS_MEDIA.length : 0],
      ['Level', profileLevel()]
    ];
    stats.forEach(function (s) {
      const box = el('div', 'profile-stat');
      const n = el('strong');
      n.textContent = s[1];
      const l = el('span');
      l.textContent = s[0];
      box.appendChild(n);
      box.appendChild(l);
      profileStats.appendChild(box);
    });
  }

  function renderAchievements() {
    achievementList.innerHTML = '';
    achievementDefs().forEach(function (a) {
      const row = el('div', 'achievement-row' + (a.on ? ' unlocked' : ''));
      const badge = el('span', 'achievement-badge');
      badge.textContent = a.on ? '✓' : '•';
      const text = el('div', 'achievement-copy');
      const name = el('strong');
      name.textContent = a.name;
      const desc = el('span');
      desc.textContent = a.desc;
      text.appendChild(name);
      text.appendChild(desc);
      row.appendChild(badge);
      row.appendChild(text);
      achievementList.appendChild(row);
    });
  }

  function renderProfileActivity() {
    profileActivity.innerHTML = '';
    const events = social.activity.slice(0, 8);
    if (!events.length) {
      const p = el('p', 'chat-empty');
      p.textContent = 'No activity yet.';
      profileActivity.appendChild(p);
      return;
    }
    events.forEach(function (a) {
      const row = el('div', 'activity-row');
      row.textContent = a.text + ' · ' + timeAgo(a.t);
      profileActivity.appendChild(row);
    });
  }

  if (profileForm) {
    profileForm.addEventListener('submit', function (e) {
      e.preventDefault();
      profile.handle = cleanHandle(profileHandle.value);
      profile.display = String(profileDisplay.value || 'Operator').trim().slice(0, 36);
      profile.bio = String(profileBio.value || PROFILE_DEFAULTS.bio).trim().slice(0, 160);
      profile.status = profileStatus.value;
      profile.accent = profileAccent.value;
      saveProfile();
      pushActivity(profile.handle + ' updated their profile');
      if (profileMsg) profileMsg.textContent = 'Profile saved.';
      renderProfile();
      renderSocial();
    });

    profileAvatar.addEventListener('change', function () {
      const file = profileAvatar.files && profileAvatar.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) {
        if (profileMsg) profileMsg.textContent = 'Choose an image file.';
        return;
      }
      const reader = new FileReader();
      reader.onload = function () {
        profile.avatar = String(reader.result || '');
        saveProfile();
        pushActivity(profile.handle + ' changed profile picture');
        if (profileMsg) profileMsg.textContent = 'Profile picture updated.';
        renderProfile();
        renderSocial();
      };
      reader.readAsDataURL(file);
    });

    profileClearAvatar.addEventListener('click', function () {
      profile.avatar = '';
      profileAvatar.value = '';
      saveProfile();
      pushActivity(profile.handle + ' cleared profile picture');
      renderProfile();
      renderSocial();
    });

    renderProfile();
  }

  /* ---------- media library ---------- */

  const MEDIA_ITEMS = Array.isArray(window.NEXUS_MEDIA) ? window.NEXUS_MEDIA.slice() : [];

  const mediaGrid = document.getElementById('media-grid');
  const mediaStatus = document.getElementById('media-status');
  const mediaCount = document.getElementById('media-count');
  const mediaSearch = document.getElementById('media-search');
  const mediaSort = document.getElementById('media-sort');
  const mediaStage = document.getElementById('media-stage');
  const mediaPlayer = document.getElementById('media-player');
  const mediaTitle = document.getElementById('media-title');
  const mediaOpen = document.getElementById('media-open');
  let mediaFilter = 'all';

  const KIND_ICON = { audio: '🎵', video: '🎬', link: '🔗' };
  const KIND_LABEL = { audio: 'audio', video: 'video', link: 'link' };
  const KIND_RANK = { audio: 0, video: 1, link: 2 };

  function setMediaStatus(msg, isErr) {
    if (!mediaStatus) return;
    mediaStatus.textContent = msg || '';
    mediaStatus.className = 'media-status' + (isErr ? ' err' : '');
  }

  function mediaSource(m) {
    if (m.kind === 'link') return '/api/media/proxy?url=' + encodeURIComponent(m.url);
    return m.url;
  }

  function fmtDate(ts) {
    const d = new Date(Number(ts) || Date.now());
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function visibleItems() {
    const q = (mediaSearch ? mediaSearch.value : '').trim().toLowerCase();
    let list = MEDIA_ITEMS.filter(function (m) {
      if (mediaFilter !== 'all' && m.kind !== mediaFilter) return false;
      if (q && !(m.name || '').toLowerCase().includes(q)) return false;
      return true;
    });
    list = list.slice();
    switch (mediaSort.value) {
      case 'old': list.sort(function (a, b) { return a.addedAt - b.addedAt; }); break;
      case 'name': list.sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); }); break;
      case 'kind':
        list.sort(function (a, b) {
          const ka = KIND_RANK[a.kind] === undefined ? 9 : KIND_RANK[a.kind];
          const kb = KIND_RANK[b.kind] === undefined ? 9 : KIND_RANK[b.kind];
          if (ka !== kb) return ka - kb;
          return (b.addedAt || 0) - (a.addedAt || 0);
        });
        break;
      default: list.sort(function (a, b) { return b.addedAt - a.addedAt; });
    }
    return list;
  }

  function renderMedia() {
    const list = visibleItems();
    if (mediaCount) mediaCount.textContent = list.length + (list.length === 1 ? ' item' : ' items');
    mediaGrid.innerHTML = '';
    if (!list.length) {
      setMediaStatus('library empty — add a file or link', false);
      return;
    }
    setMediaStatus(mediaSort.value === 'kind' ? 'sorted by type — newest first' : '');
    let lastKind = null;
    list.forEach(function (m) {
      if (mediaSort.value === 'kind' && m.kind !== lastKind) {
        lastKind = m.kind;
        const head = el('h3', 'media-group-title');
        head.textContent = (KIND_LABEL[m.kind] || m.kind || 'other') + 's';
        mediaGrid.appendChild(head);
      }
      mediaGrid.appendChild(makeMediaCard(m));
    });
  }

  function playMedia(m) {
    if (!mediaStage) return;
    mediaStage.classList.remove('hidden');
    if (mediaTitle) mediaTitle.textContent = m.name || 'Untitled';
    if (mediaOpen) mediaOpen.href = m.url || '#';

    mediaPlayer.innerHTML = '';
    let el;
    const src = mediaSource(m);

    if (m.kind === 'audio') {
      el = document.createElement('audio');
      el.controls = true;
      el.autoplay = true;
    } else {
      el = document.createElement('video');
      el.controls = true;
      el.autoplay = true;
      el.playsInline = true;
    }
    el.src = src;
    el.addEventListener('error', function () {
      setMediaStatus('could not play this source', true);
    });
    mediaPlayer.appendChild(el);
    mediaStage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.play().catch(function () {
      setMediaStatus('ready — press play if the browser blocked autoplay', false);
    });
  }

  function makeMediaCard(m) {
    const card = el('article', 'card media-card');
    const cover = el('div', 'media-cover');
    cover.style.setProperty('--ga', m.accent || '#22d3ee');
    const icon = el('span', 'media-icon');
    icon.textContent = m.icon || KIND_ICON[m.kind] || '🎵';
    cover.appendChild(icon);

    const tag = el('span', 'media-tag');
    tag.textContent = KIND_LABEL[m.kind] || m.kind;
    cover.appendChild(tag);

    const body = el('div', 'media-body');
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.flex = '1';

    const title = el('h3', 'card-title');
    title.textContent = m.name || 'Untitled';
    body.appendChild(title);

    const meta = el('p', 'media-meta');
    meta.textContent = (KIND_LABEL[m.kind] || m.kind || 'media') + ' · added ' + fmtDate(m.addedAt);
    body.appendChild(meta);

    const foot = el('div', 'media-foot');
    const play = el('button', 'btn btn-primary btn-sm');
    play.textContent = 'Play';
    play.addEventListener('click', function () { playMedia(m); });
    foot.appendChild(play);

    const del = el('button', 'media-del');
    del.textContent = '✕';
    del.title = 'Remove media';
    del.setAttribute('aria-label', 'Remove ' + (m.name || ''));
    del.addEventListener('click', function () { toggleDel(card, m); });
    foot.appendChild(del);

    body.appendChild(foot);
    card.appendChild(cover);
    card.appendChild(body);
    return card;
  }

  function toggleDel(card, m) {
    const existing = card.querySelector('.del-box');
    if (existing) { existing.remove(); return; }
    const box = el('div', 'del-box');
    const input = el('input');
    input.type = 'password';
    input.placeholder = 'admin code';
    input.spellcheck = false;
    const ok = el('button', 'btn btn-outline btn-sm');
    ok.textContent = 'Remove';
    const cancel = el('button', 'btn-link');
    cancel.textContent = 'Cancel';
    box.appendChild(input);
    box.appendChild(ok);
    box.appendChild(cancel);

    ok.addEventListener('click', function () {
      removeMedia(m.id, input.value).then(function (res) {
        if (res === true) {
          const idx = MEDIA_ITEMS.findIndex(function (x) { return x.id === m.id; });
          if (idx !== -1) MEDIA_ITEMS.splice(idx, 1);
          setMediaStatus('', false);
          renderMedia();
          renderProfile();
        } else setMediaStatus(typeof res === 'string' ? res : 'could not remove', true);
      });
    });
    cancel.addEventListener('click', function () { box.remove(); });
    card.appendChild(box);
    input.focus();
  }

  async function removeMedia(id, code) {
    try {
      const r = await fetch('/api/media/' + encodeURIComponent(id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code })
      });
      if (r.status === 401) return 'wrong admin code';
      if (r.status === 429) return 'too many attempts — wait a minute';
      if (!r.ok) return 'request failed';
      return true;
    } catch (e) { return 'server unreachable'; }
  }

  /* ---------- admin panel (tabbed: library / add game / add media) ---------- */

  const adminModal = document.getElementById('admin-modal');
  const adminLock = document.getElementById('admin-lock');
  const adminBody = document.getElementById('admin-body');
  const adminLockForm = document.getElementById('admin-lock-form');
  const adminLockMsg = document.getElementById('admin-lock-msg');
  const adminCodeInput = document.getElementById('admin-code');
  const adminTabs = document.querySelectorAll('.admin-tab');
  const adminPanes = document.querySelectorAll('.admin-pane');
  let adminCode = '';

  function showAdminTab(name) {
    adminTabs.forEach(function (b) {
      const on = b.dataset.atab === name;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    adminPanes.forEach(function (p) {
      p.classList.toggle('active', p.dataset.apane === name);
    });
    if (name === 'library') renderLibrary();
  }

  adminTabs.forEach(function (b) {
    b.addEventListener('click', function () { showAdminTab(b.dataset.atab); });
  });

  function openAdmin() {
    adminModal.classList.remove('hidden');
    adminModal.setAttribute('aria-hidden', 'false');
    adminLockMsg.textContent = '';
    if (adminCode) {
      adminLock.classList.add('hidden');
      adminBody.classList.remove('hidden');
      showAdminTab('library');
    } else {
      adminLock.classList.remove('hidden');
      adminBody.classList.add('hidden');
      adminCodeInput.value = '';
      adminCodeInput.focus();
    }
  }
  function closeAdmin() {
    adminModal.classList.add('hidden');
    adminModal.setAttribute('aria-hidden', 'true');
  }
  function lockAdmin() {
    adminCode = '';
    adminLock.classList.remove('hidden');
    adminBody.classList.add('hidden');
    adminCodeInput.value = '';
    adminLockMsg.textContent = '';
    adminCodeInput.focus();
  }

  document.getElementById('btn-admin').addEventListener('click', openAdmin);
  document.getElementById('admin-done').addEventListener('click', closeAdmin);
  document.getElementById('admin-lockout').addEventListener('click', lockAdmin);
  const gamesHintAdmin = document.getElementById('games-hint-admin');
  if (gamesHintAdmin) gamesHintAdmin.addEventListener('click', openAdmin);

  adminModal.addEventListener('click', function (e) {
    if (e.target === adminModal) closeAdmin();
  });

  adminLockForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const code = adminCodeInput.value;
    if (!code) { adminLockMsg.className = 'modal-msg err'; adminLockMsg.textContent = 'enter the admin code'; return; }
    fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code })
    }).then(function (r) {
      if (r.status === 401) return Promise.reject('wrong admin code');
      if (r.status === 429) return Promise.reject('too many attempts — wait a minute');
      if (!r.ok) return Promise.reject('request failed');
      return r.json();
    }).then(function () {
      adminCode = code;
      adminLock.classList.add('hidden');
      adminBody.classList.remove('hidden');
      showAdminTab('library');
    }).catch(function (msg) {
      adminLockMsg.className = 'modal-msg err';
      adminLockMsg.textContent = msg;
    });
  });

  /* -- library (manage existing games + media) -- */

  const libGames = document.getElementById('lib-games');
  const libMedia = document.getElementById('lib-media');
  const libMsg = document.getElementById('lib-msg');

  function setLibMsg(msg, isErr) {
    if (!libMsg) return;
    libMsg.textContent = msg || '';
    libMsg.className = 'modal-msg' + (isErr ? ' err' : '');
  }

  function thumbFor(item, isGame) {
    const t = el('span', 'lib-thumb');
    const src = isGame ? (item.iconImg || '') : (item.icon);
    if (isGame && item.iconImg) {
      const img = el('img');
      img.src = item.iconImg;
      img.alt = '';
      t.appendChild(img);
    } else {
      t.textContent = isGame ? (item.icon || '🎮') : (item.icon || KIND_ICON[item.kind] || '🎵');
    }
    return t;
  }

  function renderLibrary() {
    if (!libGames) return;
    libGames.innerHTML = '';
    setLibMsg('');

    const games = currentGames();
    if (!games.length) {
      const e = el('p', 'chat-empty');
      e.textContent = 'no games yet';
      libGames.appendChild(e);
    }
    games.forEach(function (g) { libGames.appendChild(makeLibGameRow(g)); });

    if (!libMedia) return;
    libMedia.innerHTML = '';
    const items = Array.isArray(window.NEXUS_MEDIA) ? window.NEXUS_MEDIA : MEDIA_ITEMS;
    if (!items.length) {
      const e = el('p', 'chat-empty');
      e.textContent = 'no media yet';
      libMedia.appendChild(e);
    }
    items.forEach(function (m) { libMedia.appendChild(makeLibMediaRow(m)); });
  }

  function libRowButtons(row, item, isGame) {
    const btns = el('div', 'lib-actions');
    const edit = el('button', 'btn btn-outline btn-sm');
    edit.textContent = 'Edit';
    const del = el('button', 'btn btn-outline btn-sm danger');
    del.textContent = 'Delete';
    btns.appendChild(edit);
    btns.appendChild(del);

    const meta = row.querySelector('.lib-meta');

    edit.addEventListener('click', function () {
      const existing = row.querySelector('.lib-edit');
      if (existing) { existing.remove(); edit.textContent = 'Edit'; return; }
      const form = isGame ? gameEditForm(item) : mediaEditForm(item);
      meta.appendChild(form);
      edit.textContent = 'Close';
      form.querySelector('input, select').focus();
    });

    del.addEventListener('click', function () {
      const box = el('div', 'del-box lib-del');
      const p = el('p');
      p.textContent = 'Remove ‘' + (item.title || item.name || 'this item') + '‘?';
      const ok = el('button', 'btn btn-outline btn-sm danger');
      ok.textContent = 'Delete';
      const cancel = el('button', 'btn-link');
      cancel.textContent = 'Cancel';
      box.appendChild(p);
      box.appendChild(ok);
      box.appendChild(cancel);
      row.appendChild(box);

      ok.addEventListener('click', function () {
        const call = isGame
          ? POST('/api/games/' + encodeURIComponent(item.id), { code: adminCode, delete: true })
          : removeMedia(item.id, adminCode);
        Promise.resolve(call).then(function (res) {
          if (!isGame) {
            if (res !== true) { setLibMsg(typeof res === 'string' ? res : 'could not remove', true); return; }
          } else if (!res || res.status !== 200) {
            setLibMsg('could not remove', true);
            return;
          }
          if (isGame) {
            const gi = GAMES.findIndex(function (x) { return x.id === item.id; });
            if (gi !== -1) GAMES.splice(gi, 1);
            window.NEXUS_GAMES = GAMES.slice();
            renderGames();
            renderSocial();
          } else {
            const mi = MEDIA_ITEMS.findIndex(function (x) { return x.id === item.id; });
            if (mi !== -1) MEDIA_ITEMS.splice(mi, 1);
            window.NEXUS_MEDIA = MEDIA_ITEMS.slice();
            renderMedia();
          }
          renderLibrary();
          setLibMsg('removed ' + (item.title || item.name || 'item'));
          renderProfile();
        });
      });
      cancel.addEventListener('click', function () { box.remove(); });
    });

    return btns;
  }

  function makeLibGameRow(g) {
    const row = el('div', 'lib-row');
    row.appendChild(thumbFor(g, true));
    const meta = el('div', 'lib-meta');
    const title = el('strong', 'lib-name');
    title.textContent = g.title;
    const sub = el('span', 'lib-kind');
    sub.textContent = g.desc ? g.desc : g.url;
    meta.appendChild(title);
    meta.appendChild(sub);
    row.appendChild(meta);
    row.appendChild(libRowButtons(row, g, true));
    return row;
  }

  function makeLibMediaRow(m) {
    const row = el('div', 'lib-row');
    row.appendChild(thumbFor(m, false));
    const meta = el('div', 'lib-meta');
    const title = el('strong', 'lib-name');
    title.textContent = m.name || 'Untitled';
    const sub = el('span', 'lib-kind');
    sub.textContent = (KIND_LABEL[m.kind] || m.kind || 'media') + (m.kind !== 'link' ? ' · added ' + fmtDate(m.addedAt) : ' · link');
    meta.appendChild(title);
    meta.appendChild(sub);
    row.appendChild(meta);
    row.appendChild(libRowButtons(row, m, false));
    return row;
  }

  function POST(path, body) {
    try {
      return fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(function (r) { return r.json().then(function (d) { return { status: r.status, d: d }; }); });
    } catch (e) { return Promise.resolve({ status: 0, d: {} }); }
  }

  /* -- game edit form -- */

  function gameEditForm(g) {
    const form = el('form', 'lib-edit');
    const t1 = el('label'); {
      const s = el('span', 'mf-label'); s.textContent = 'Title';
      const i = el('input'); i.type = 'text'; i.value = g.title; i.maxLength = 80; i.spellcheck = false;
      t1.appendChild(s); t1.appendChild(i);
    }
    const t2 = el('label'); {
      const s = el('span', 'mf-label'); s.textContent = 'Description';
      const i = el('input'); i.type = 'text'; i.value = g.desc || ''; i.maxLength = 200; i.spellcheck = false;
      t2.appendChild(s); t2.appendChild(i);
    }
    const t3 = el('label'); {
      const s = el('span', 'mf-label'); s.textContent = 'Accent';
      const i = el('input'); i.type = 'color'; i.value = g.accent || '#f472b6';
      t3.appendChild(s); t3.appendChild(i);
    }
    const t4 = el('label'); {
      const s = el('span', 'mf-label'); s.textContent = 'Icon (emoji)';
      const i = el('input'); i.type = 'text'; i.value = g.icon || '🎮'; i.maxLength = 8; i.spellcheck = false;
      t4.appendChild(s); t4.appendChild(i);
    }
    const t5 = el('label'); {
      const s = el('span', 'mf-label'); s.textContent = 'Icon image (URL)';
      const i = el('input'); i.type = 'text'; i.value = g.iconImg || ''; i.placeholder = 'games/icons/… or https://…'; i.spellcheck = false;
      t5.appendChild(s); t5.appendChild(i);
    }
    const t6 = el('label'); {
      const s = el('span', 'mf-label'); s.textContent = '…or replace with a file';
      const i = el('input'); i.type = 'file'; i.accept = 'image/*';
      t6.appendChild(s); t6.appendChild(i);
    }
    const row = el('div', 'modal-actions');
    const save = el('button', 'btn btn-primary btn-sm');
    save.type = 'submit';
    save.textContent = 'Save';
    const msg = el('p', 'modal-msg');
    row.appendChild(save);
    form.appendChild(t1); form.appendChild(t2);
    {
      const r2 = el('div', 'modal-row');
      r2.appendChild(t3); r2.appendChild(t4);
      form.appendChild(r2);
    }
    form.appendChild(t5);
    form.appendChild(t6);
    form.appendChild(msg);
    form.appendChild(row);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      save.disabled = true;
      const args0 = { title: t1.querySelector('input').value, desc: t2.querySelector('input').value, accent: t3.querySelector('input').value, icon: t4.querySelector('input').value };
      const urlVal = t5.querySelector('input').value.trim();
      const f = t6.querySelector('input').files && t6.querySelector('input').files[0];
      const finish = function (extra) {
        const args = Object.assign({ code: adminCode }, args0, extra || {});
        POST('/api/games/' + encodeURIComponent(g.id), args).then(function (res) {
          save.disabled = false;
          if (res.status === 200) {
            const up = res.d.game;
            const gi = GAMES.findIndex(function (x) { return x.id === g.id; });
            if (gi !== -1) GAMES[gi] = up;
            window.NEXUS_GAMES = GAMES.slice();
            setLibMsg('saved ' + up.title);
            renderGames();
            renderSocial();
            renderLibrary();
          } else if (res.status === 401) {
            msg.className = 'modal-msg err'; msg.textContent = 'wrong admin code — lock and retry'; lockAdmin();
          } else if (res.status === 429) {
            msg.className = 'modal-msg err'; msg.textContent = 'too many attempts — wait a minute';
          } else {
            msg.className = 'modal-msg err'; msg.textContent = (res.d && res.d.error) || 'request failed';
          }
        }).catch(function () {
          save.disabled = false;
          msg.className = 'modal-msg err'; msg.textContent = 'server unreachable — run node server.js';
        });
      };
      if (f) {
        const rr = new FileReader();
        rr.onload = function () { finish({ iconFile: { name: f.name, data: rr.result } }); };
        rr.onerror = function () { msg.className = 'modal-msg err'; msg.textContent = 'could not read icon'; };
        rr.readAsDataURL(f);
      } else if (urlVal && urlVal !== (g.iconImg || '')) {
        finish({ iconImg: urlVal });
      } else if (!urlVal && g.iconImg) {
        finish({ iconClear: true });
      } else {
        finish();
      }
    });
    return form;
  }

  /* -- media edit form -- */

  function mediaEditForm(m) {
    const form = el('form', 'lib-edit');
    const t1 = el('label'); {
      const s = el('span', 'mf-label'); s.textContent = 'Name';
      const i = el('input'); i.type = 'text'; i.value = m.name || ''; i.maxLength = 120; i.spellcheck = false;
      t1.appendChild(s); t1.appendChild(i);
    }
    const t2 = el('label'); {
      const s = el('span', 'mf-label'); s.textContent = 'Accent';
      const i = el('input'); i.type = 'color'; i.value = m.accent || '#22d3ee';
      t2.appendChild(s); t2.appendChild(i);
    }
    const t3 = el('label'); {
      const s = el('span', 'mf-label'); s.textContent = 'Icon (emoji)';
      const i = el('input'); i.type = 'text'; i.value = m.icon || KIND_ICON[m.kind] || '🎵'; i.maxLength = 8; i.spellcheck = false;
      t3.appendChild(s); t3.appendChild(i);
    }
    const kindSeg = el('div', 'seg lib-kind-seg');
    kindSeg.id = 'edit-kind-' + m.id;
    [['upload', 'File'], ['link', 'Link']].forEach(function (pair) {
      const b = el('button', 'seg-btn');
      b.type = 'button';
      b.dataset.val = pair[0];
      b.textContent = pair[1];
      b.classList.toggle('active', (m.kind === pair[0]) || (m.kind !== 'link' && pair[0] === 'upload'));
      kindSeg.appendChild(b);
    });

    const urlWrap = el('label', 'lib-url-wrap' + (m.kind === 'link' ? '' : ' hidden'));
    {
      const s = el('span', 'mf-label'); s.textContent = 'Video / audio link';
      const i = el('input'); i.type = 'url'; i.value = m.url || ''; i.placeholder = 'https://…'; i.spellcheck = false;
      urlWrap.appendChild(s); urlWrap.appendChild(i);
    }
    const fileWrap = el('label', 'lib-file-wrap' + (m.kind === 'link' ? ' hidden' : ''));
    {
      const s = el('span', 'mf-label'); s.textContent = 'Replace file';
      const i = el('input'); i.type = 'file'; i.accept = 'audio/*,video/*,.mp3,.mp4,.webm,.ogg,.m4a,.wav,.flac,.aac,.mov,.m4v';
      fileWrap.appendChild(s); fileWrap.appendChild(i);
    }
    kindSeg.querySelectorAll('.seg-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        kindSeg.querySelectorAll('.seg-btn').forEach(function (x) { x.classList.toggle('active', x === b); });
        const isLink = b.dataset.val === 'link';
        urlWrap.classList.toggle('hidden', !isLink);
        fileWrap.classList.toggle('hidden', isLink);
      });
    });

    const row = el('div', 'modal-actions');
    const save = el('button', 'btn btn-primary btn-sm');
    save.type = 'submit';
    save.textContent = 'Save';
    const msg = el('p', 'modal-msg');
    row.appendChild(save);
    form.appendChild(t1);
    {
      const r2 = el('div', 'modal-row');
      r2.appendChild(t2); r2.appendChild(t3);
      form.appendChild(r2);
    }
    form.appendChild(kindSeg);
    form.appendChild(urlWrap);
    form.appendChild(fileWrap);
    form.appendChild(msg);
    form.appendChild(row);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      save.disabled = true;
      const isLink = kindSeg.querySelector('.seg-btn.active').dataset.val === 'link';
      const args0 = { name: t1.querySelector('input').value, accent: t2.querySelector('input').value, icon: t3.querySelector('input').value, kind: isLink ? 'link' : 'upload' };
      const f = fileWrap.querySelector('input').files && fileWrap.querySelector('input').files[0];
      const urlVal = urlWrap.querySelector('input').value.trim();
      const finish = function (extra) {
        const args = Object.assign({ code: adminCode }, args0, extra || {});
        POST('/api/media/' + encodeURIComponent(m.id), args).then(function (res) {
          save.disabled = false;
          if (res.status === 200) {
            const up = res.d.media;
            const mi = MEDIA_ITEMS.findIndex(function (x) { return x.id === m.id; });
            if (mi !== -1) MEDIA_ITEMS[mi] = up;
            window.NEXUS_MEDIA = MEDIA_ITEMS.slice();
            setLibMsg('saved ' + up.name);
            renderMedia();
            renderLibrary();
            renderProfile();
          } else if (res.status === 401) {
            msg.className = 'modal-msg err'; msg.textContent = 'wrong admin code — lock and retry'; lockAdmin();
          } else if (res.status === 429) {
            msg.className = 'modal-msg err'; msg.textContent = 'too many attempts — wait a minute';
          } else {
            msg.className = 'modal-msg err'; msg.textContent = (res.d && res.d.error) || 'request failed';
          }
        }).catch(function () {
          save.disabled = false;
          msg.className = 'modal-msg err'; msg.textContent = 'server unreachable — run node server.js';
        });
      };
      if (f) {
        const rr = new FileReader();
        rr.onload = function () { finish({ file: { name: f.name, data: rr.result } }); };
        rr.onerror = function () { msg.className = 'modal-msg err'; msg.textContent = 'could not read file'; };
        rr.readAsDataURL(f);
      } else if (isLink) {
        finish({ url: urlVal });
      } else {
        finish();
      }
    });
    return form;
  }

  /* -- add game -- */

  const agForm = document.getElementById('ag-form');
  const agMsg = document.getElementById('ag-msg');
  const agKindBtn = document.querySelectorAll('#ag-kind .seg-btn');
  const agFileWrap = document.getElementById('ag-file-wrap');
  const agUrlWrap = document.getElementById('ag-url-wrap');
  let agKind = 'upload';

  function setAgKind(k) {
    agKind = k;
    agKindBtn.forEach(function (b) {
      b.classList.toggle('active', b.dataset.val === k);
    });
    agFileWrap.classList.toggle('hidden', k === 'link');
    agUrlWrap.classList.toggle('hidden', k === 'upload');
  }

  agKindBtn.forEach(function (b) {
    b.addEventListener('click', function () { setAgKind(b.dataset.val); });
  });

  agForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const title = document.getElementById('ag-title').value.trim();
    const desc = document.getElementById('ag-desc').value.trim();
    const accent = document.getElementById('ag-accent').value;
    const icon = document.getElementById('ag-icon').value.trim() || '🎮';
    if (!title) { agMsg.className = 'modal-msg err'; agMsg.textContent = 'title required'; return; }

    const iconFileInput = document.getElementById('ag-icon-file');
    const iconUrlInput = document.getElementById('ag-icon-url');
    const payload = { kind: null, title: title, desc: desc, accent: accent, icon: icon, url: '', file: null };
    const iconUrl = iconUrlInput.value.trim();

    function send(extra) {
      Object.assign(payload, extra);
      submitGame(payload);
    }

    if (agKind === 'upload') {
      const file = document.getElementById('ag-file').files && document.getElementById('ag-file').files[0];
      if (!file) { agMsg.className = 'modal-msg err'; agMsg.textContent = 'choose an .html game file'; return; }
      const reader = new FileReader();
      reader.onload = function () {
        const base = { kind: 'upload', file: { name: file.name, data: reader.result } };
        const iconFile = iconFileInput.files && iconFileInput.files[0];
        if (iconFile) {
          const r2 = new FileReader();
          r2.onload = function () { send(Object.assign(base, { iconFile: { name: iconFile.name, data: r2.result } })); };
          r2.onerror = function () { agMsg.className = 'modal-msg err'; agMsg.textContent = 'could not read icon'; };
          r2.readAsDataURL(iconFile);
          return;
        }
        if (iconUrl) { send(Object.assign(base, { iconImg: iconUrl })); return; }
        send(base);
      };
      reader.onerror = function () {
        agMsg.className = 'modal-msg err';
        agMsg.textContent = 'could not read file';
      };
      reader.readAsDataURL(file);
    } else {
      const url = document.getElementById('ag-url').value.trim();
      if (!url) { agMsg.className = 'modal-msg err'; agMsg.textContent = 'games/ path required'; return; }
      const base = { kind: 'link', url: url };
      const iconFile = iconFileInput.files && iconFileInput.files[0];
      if (iconFile) {
        const r2 = new FileReader();
        r2.onload = function () { send(Object.assign(base, { iconFile: { name: iconFile.name, data: r2.result } })); };
        r2.onerror = function () { agMsg.className = 'modal-msg err'; agMsg.textContent = 'could not read icon'; };
        r2.readAsDataURL(iconFile);
        return;
      }
      if (iconUrl) { send(Object.assign(base, { iconImg: iconUrl })); return; }
      send(base);
    }
  });

  function submitGame(payload) {
    agMsg.className = 'modal-msg';
    agMsg.textContent = 'adding…';
    payload.code = adminCode;
    fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json().then(function (d) { return { status: r.status, d: d }; });
    }).then(function (res) {
      if (res.status === 201) {
        const game = res.d.game;
        GAMES.push(game);
        window.NEXUS_GAMES = GAMES;
        agForm.reset();
        document.getElementById('ag-accent').value = '#f472b6';
        document.getElementById('ag-icon').value = '🎮';
        setAgKind('upload');
        agMsg.className = 'modal-msg';
        agMsg.textContent = 'added ' + game.title;
        renderGames();
        renderSocial();
        renderProfile();
        showTab('game');
      } else if (res.status === 401) {
        agMsg.className = 'modal-msg err';
        agMsg.textContent = 'wrong admin code — lock and retry';
        lockAdmin();
      } else if (res.status === 429) {
        agMsg.className = 'modal-msg err';
        agMsg.textContent = 'too many attempts — wait a minute';
      } else {
        agMsg.className = 'modal-msg err';
        agMsg.textContent = (res.d && res.d.error) || 'request failed';
      }
    }).catch(function () {
      agMsg.className = 'modal-msg err';
      agMsg.textContent = 'server unreachable — run node server.js';
    });
  }

  function currentGames() {
    return GAMES.length ? GAMES : (Array.isArray(window.NEXUS_GAMES) ? window.NEXUS_GAMES : []);
  }

  /* -- add media -- */

  const mmForm = document.getElementById('media-form');
  const mmMsg = document.getElementById('mm-msg');
  const mmKindBtn = document.querySelectorAll('#mm-kind .seg-btn');
  const mmFileWrap = document.getElementById('mm-file-wrap');
  const mmUrlWrap = document.getElementById('mm-url-wrap');
  let mmKind = 'upload';

  function setMmKind(k) {
    mmKind = k;
    mmKindBtn.forEach(function (b) {
      b.classList.toggle('active', b.dataset.val === k);
    });
    mmFileWrap.classList.toggle('hidden', k === 'link');
    mmUrlWrap.classList.toggle('hidden', k === 'upload');
  }

  mmKindBtn.forEach(function (b) {
    b.addEventListener('click', function () { setMmKind(b.dataset.val); });
  });

  mmForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const name = document.getElementById('mm-title').value.trim();
    const accent = document.getElementById('mm-accent').value;
    const icon = document.getElementById('mm-icon').value.trim() || KIND_ICON[mmKind];
    const fileInput = document.getElementById('mm-file');
    const urlInput = document.getElementById('mm-url');

    if (!name) { mmMsg.className = 'modal-msg err'; mmMsg.textContent = 'title required'; return; }

    if (mmKind === 'upload') {
      const file = fileInput.files && fileInput.files[0];
      if (!file) { mmMsg.className = 'modal-msg err'; mmMsg.textContent = 'choose a file'; return; }
      const reader = new FileReader();
      reader.onload = function () {
        submitMedia({ name: name, accent: accent, icon: icon, kind: 'upload', file: { name: file.name, data: reader.result } });
      };
      reader.onerror = function () {
        mmMsg.className = 'modal-msg err';
        mmMsg.textContent = 'could not read file';
      };
      reader.readAsDataURL(file);
    } else {
      const url = urlInput.value.trim();
      if (!url) { mmMsg.className = 'modal-msg err'; mmMsg.textContent = 'link required'; return; }
      submitMedia({ name: name, accent: accent, icon: icon, kind: 'link', url: url });
    }
  });

  function submitMedia(payload) {
    mmMsg.className = 'modal-msg';
    mmMsg.textContent = 'uploading…';
    payload.code = adminCode;
    fetch('/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json().then(function (d) { return { status: r.status, d: d }; });
    }).then(function (res) {
      if (res.status === 201) {
        const item = res.d.media;
        MEDIA_ITEMS.unshift(item);
        mmForm.reset();
        document.getElementById('mm-accent').value = '#22d3ee';
        document.getElementById('mm-icon').value = '🎵';
        setMmKind('upload');
        mmMsg.className = 'modal-msg';
        mmMsg.textContent = 'added — playing now';
        renderMedia();
        renderProfile();
        showTab('media');
        playMedia(item);
      } else if (res.status === 401) {
        mmMsg.className = 'modal-msg err';
        mmMsg.textContent = 'wrong admin code — lock and retry';
        lockAdmin();
      } else if (res.status === 429) {
        mmMsg.className = 'modal-msg err';
        mmMsg.textContent = 'too many attempts — wait a minute';
      } else {
        mmMsg.className = 'modal-msg err';
        mmMsg.textContent = (res.d && res.d.error) || 'request failed';
      }
    }).catch(function () {
      mmMsg.className = 'modal-msg err';
      mmMsg.textContent = 'server unreachable — run node server.js';
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && adminModal && !adminModal.classList.contains('hidden')) closeAdmin();
  });

  mediaSearch.addEventListener('input', renderMedia);
  mediaSort.addEventListener('change', renderMedia);
  document.querySelectorAll('#media-filter .seg-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('#media-filter .seg-btn').forEach(function (x) { x.classList.toggle('active', x === b); });
      mediaFilter = b.dataset.val;
      renderMedia();
    });
  });

  renderMedia();

  showTab('home');
})();
