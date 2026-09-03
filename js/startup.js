(function () {
  'use strict';

  /* ---------- shared settings engine (theme.js) ---------- */

  const { store, DEFAULTS, prefs, THEMES, DENSITY, SPEED, PRESETS, applyUserTheme } = window.NexusTheme;

  /* ---------- state ---------- */

  const canvas = document.getElementById('particles');
  let w = 0, h = 0, parts = [], ctx = null;
  let particleHues = THEMES[prefs.theme] ? THEMES[prefs.theme].hues : THEMES['pink-violet'].hues;
  let speedFactor = 1;
  let bloomOn = true;

  if (canvas) ctx = canvas.getContext('2d');

  /* ---------- apply ---------- */

  function apply() {
    const t = applyUserTheme(prefs);
    speedFactor = SPEED[prefs.speed] || 1;
    bloomOn = !!prefs.bloom;
    particleHues = t.hues;
    if (ctx) seed();
  }

  function setPref(k, v) {
    prefs[k] = v;
    store.set('nx_' + k, typeof v === 'boolean' ? (v ? '1' : '0') : v);
    apply();
    syncControls();
  }

  /* ---------- controls ---------- */

  function syncControls() {
    document.querySelectorAll('input[data-pref]').forEach(function (inp) {
      if (inp.type === 'checkbox') inp.checked = !!prefs[inp.dataset.pref];
    });
    document.querySelectorAll('.seg[data-pref]').forEach(function (seg) {
      const k = seg.dataset.pref;
      seg.querySelectorAll('.seg-btn').forEach(function (b) {
        b.setAttribute('aria-pressed', String(prefs[k] === b.dataset.val));
      });
    });
    const colorInp = document.querySelector('input[data-pref="custom"]');
    if (colorInp) {
      const val = /^#[0-9a-fA-F]{6}$/.test(prefs.custom) ? prefs.custom : '#f472b6';
      colorInp.value = val.toLowerCase();
      const hexOut = document.getElementById('hex-out');
      if (hexOut) hexOut.textContent = val.toUpperCase();
      const sw = document.getElementById('swatch');
      if (sw) sw.style.background = val;
      const advT = document.getElementById('adv-toggle');
      if (advT) advT.classList.toggle('active', prefs.theme === 'custom');
    }
    const curPink = prefs.theme === 'custom'
      ? prefs.custom
      : ((THEMES[prefs.theme] || THEMES['pink-violet']).pink);
    document.querySelectorAll('.swatch-btn').forEach(function (b) {
      b.classList.toggle('active', String(b.dataset.hex).toLowerCase() === String(curPink).toLowerCase());
    });
  }

  /* ---------- particle field ---------- */

  function resize() {
    if (!ctx) return;
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
    if (!ctx) return;
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
    if (!ctx) return;
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

  if (canvas && ctx) {
    resize();
    seed();
    addEventListener('resize', function () { resize(); seed(); });
    tick();
  }

  /* ---------- settings screen ---------- */

  const settingsScreen = document.getElementById('screen-settings');
  const btnSettings = document.getElementById('btn-settings');
  const btnDone = document.getElementById('btn-done');
  const btnReset = document.getElementById('btn-reset');

  function openSettings() {
    settingsScreen.classList.remove('hidden');
    settingsScreen.setAttribute('aria-hidden', 'false');
    syncControls();
    const first = settingsScreen.querySelector('input[data-pref]');
    if (first) first.focus();
  }

  function closeSettings() {
    settingsScreen.classList.add('hidden');
    settingsScreen.setAttribute('aria-hidden', 'true');
    if (btnSettings) btnSettings.focus();
  }

  btnSettings.addEventListener('click', openSettings);
  btnDone.addEventListener('click', closeSettings);

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    const admin = document.getElementById('screen-admin');
    if (admin && !admin.classList.contains('hidden')) { closeAdmin(); return; }
    if (profileScreen && !profileScreen.classList.contains('hidden')) { closeProfile(); return; }
    closeSettings();
  });

  settingsScreen.addEventListener('click', function (e) {
    if (e.target === settingsScreen) closeSettings();
  });

  document.querySelectorAll('input[data-pref]').forEach(function (inp) {
    if (inp.type !== 'checkbox') return;
    inp.addEventListener('change', function () {
      setPref(inp.dataset.pref, inp.checked);
    });
  });

  document.querySelectorAll('.seg[data-pref] .seg-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      const pref = b.closest('.seg').dataset.pref;
      const val = b.dataset.val;
      if (pref === 'mode' && val === 'school') {
        openModePopup('school', false);
        return;
      }
      setPref(pref, val);
      if (pref === 'mode' && window.NexusTheme && window.NexusTheme.setMode) {
        try { window.NexusTheme.setMode(val); } catch (e) {}
      }
    });
  });

  const advToggle = document.getElementById('adv-toggle');
  const advBody = document.getElementById('adv-body');
  if (advToggle && advBody) {
    advToggle.addEventListener('click', function () {
      const open = advBody.classList.toggle('open');
      advToggle.classList.toggle('open', open);
      advToggle.setAttribute('aria-expanded', String(open));
    });
  }

  const colorInput = document.querySelector('input[data-pref="custom"]');
  if (colorInput) {
    colorInput.addEventListener('input', function () {
      prefs.theme = 'custom';
      prefs.custom = colorInput.value;
      apply();
      syncControls();
    });
    colorInput.addEventListener('change', function () {
      store.set('nx_theme', 'custom');
      store.set('nx_custom', colorInput.value);
    });
  }

  btnReset.addEventListener('click', function () {
    Object.keys(DEFAULTS).forEach(function (k) {
      prefs[k] = DEFAULTS[k];
      store.set('nx_' + k, typeof DEFAULTS[k] === 'boolean' ? (DEFAULTS[k] ? '1' : '0') : DEFAULTS[k]);
    });
    apply();
    syncControls();
  });

  /* ---------- preset swatches ---------- */

  function buildSwatches() {
    const wrap = document.getElementById('swatches');
    if (!wrap) return;
    PRESETS.forEach(function (p) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch-btn';
      b.dataset.hex = p.hex;
      b.title = p.name + ' ' + p.hex;
      b.setAttribute('aria-label', p.name);
      b.style.background = p.hex;
      wrap.appendChild(b);
      b.addEventListener('click', function () {
        prefs.theme = 'custom';
        prefs.custom = p.hex;
        apply();
        store.set('nx_theme', 'custom');
        store.set('nx_custom', p.hex);
        syncControls();
      });
    });
  }

  /* ---------- admin panel ---------- */

  const ADMIN_DEFAULTS = {
    maxAtt: 5,
    lockMin: 5
  };

  const aprefs = {};
  Object.keys(ADMIN_DEFAULTS).forEach(function (k) {
    const raw = store.get('nxa_' + k, null);
    const d = ADMIN_DEFAULTS[k];
    if (raw === null) { aprefs[k] = d; return; }
    if (typeof d === 'boolean') aprefs[k] = raw === '1' || raw === 'true';
    else if (typeof d === 'number') aprefs[k] = Number(raw);
    else aprefs[k] = raw;
  });

  const SESS_MS = 24 * 60 * 60 * 1000;
  const DEFAULT_CODE = '0000';

  let admSalt = store.get('nxa_salt', null);
  if (!admSalt) {
    admSalt = Math.random().toString(36).slice(2) + Date.now().toString(36);
    store.set('nxa_salt', admSalt);
  }
  let admHash = store.get('nxa_hash', null);

  function hashPass(secret, salt) {
    return new Promise(function (resolve) {
      try {
        const data = new TextEncoder().encode(salt + ':' + secret + ':nexus');
        crypto.subtle.digest('SHA-256', data).then(function (buf) {
          resolve(Array.prototype.map.call(new Uint8Array(buf), function (b) {
            return ('0' + b.toString(16)).slice(-2);
          }).join(''));
        }, function () { resolve(fallbackHash(secret, salt)); });
      } catch (e) { resolve(fallbackHash(secret, salt)); }
    });
  }

  function fallbackHash(secret, salt) {
    const s = salt + ':' + secret + ':nexus';
    let h1 = 0x811c9dc5, h2 = 0x01000193;
    for (let i = 0; i < s.length; i++) {
      h1 ^= s.charCodeAt(i);
      h1 = Math.imul(h1, 0x01000193) >>> 0;
      h2 = Math.imul(h2 ^ s.charCodeAt(i), 0x85ebca6b) >>> 0;
    }
    return ('00000000' + h1.toString(16)).slice(-8) + ('00000000' + h2.toString(16)).slice(-8);
  }

  function verifyCode(code) {
    const want = store.get('nxa_hash', null);
    return hashPass(code, admSalt).then(function (got) {
      if (want === null) return hashPass(DEFAULT_CODE, admSalt).then(function (d) { return got === d; });
      return got === want;
    });
  }

  function sessUntil() { return Number(store.get('nxa_sess', 0)); }
  function sessValid() { return sessUntil() > Date.now(); }
  function lockUntil() { return Number(store.get('nxa_lock', 0)); }
  function remainingLock() { return Math.max(0, lockUntil() - Date.now()); }

  function pushLog(ok) {
    let log = [];
    try { log = JSON.parse(store.get('nxa_log', '[]')); } catch (e) { log = []; }
    log.push({ t: Date.now(), ok: ok });
    if (log.length > 20) log = log.slice(-20);
    store.set('nxa_log', JSON.stringify(log));
  }

  const adminScreen = document.getElementById('screen-admin');
  const adminLock = document.getElementById('admin-lock');
  const adminBody = document.getElementById('admin-body');
  const adminClose = document.getElementById('admin-close');
  const lockForm = document.getElementById('lock-form');
  const lockCode = document.getElementById('lock-code');
  const lockMsg = document.getElementById('lock-msg');
  const lockHint = document.getElementById('lock-hint');
  const codeForm = document.getElementById('code-form');
  const strength = document.getElementById('strength');
  const strengthLabel = document.getElementById('strength-label');
  let lockTicker = null;

  function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  }

  function fmt(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    if (s >= 3600) {
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      return h + 'h ' + m + 'm';
    }
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + ':' + String(r).padStart(2, '0');
  }

  function codeStrength(code) {
    let s = 0;
    if (code.length >= 8) s += 2;
    else if (code.length >= 4) s += 1;
    if (/[A-Z]/.test(code)) s += 1;
    if (/[0-9]/.test(code)) s += 1;
    if (/[^A-Za-z0-9]/.test(code)) s += 1;
    return s <= 1 ? 'weak' : s <= 3 ? 'ok' : 'strong';
  }

  function updateStrength(code) {
    const s = codeStrength(code);
    strength.setAttribute('data-s', s);
    strengthLabel.textContent = s;
  }

  function renderLog() {
    const el = document.getElementById('adm-log');
    if (!el) return;
    let log = [];
    try { log = JSON.parse(store.get('nxa_log', '[]')); } catch (e) { log = []; }
    el.innerHTML = '';
    if (!log.length) {
      el.innerHTML = '<p class="admin-note">No entries yet.</p>';
      return;
    }
    log.slice(-10).reverse().forEach(function (e) {
      const row = document.createElement('div');
      row.className = 'log-row';
      const t = document.createElement('span');
      t.className = 'log-t';
      t.textContent = new Date(e.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const r = document.createElement('span');
      r.className = 'log-r ' + (e.ok ? 'ok' : 'fail');
      r.textContent = e.ok ? 'OK' : 'FAIL';
      row.appendChild(t);
      row.appendChild(r);
      el.appendChild(row);
    });
  }

  function renderSystem() {
    setText('sys-build', 'nexus v2.0 · nexusv2');
    setText('sys-sess', sessValid()
      ? 'active · ' + new Date(sessUntil()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'locked');
    const t = document.getElementById('sys-tunnel');
    if (t) {
      fetch('/api/tunnel').then(function (r) { return r.json(); }).then(function (d) {
        if (d && d.url) {
          t.textContent = d.url.replace('https://', '');
          t.title = 'Open from anywhere: ' + d.url;
          t.style.cursor = 'pointer';
          t.onclick = function () { window.open(d.url, '_blank'); };
        } else if (d && d.note) {
          t.textContent = d.note;
        } else {
          t.textContent = d && d.enabled ? 'connecting…' : 'off';
        }
      }).catch(function () { t.textContent = '—'; });
    }
  }

  function unlockAdmin() {
    adminLock.classList.add('hidden');
    adminBody.classList.remove('hidden');
    lockMsg.textContent = '';
    store.set('nxa_sess', String(Date.now() + SESS_MS));
    renderSystem();
    renderLog();
    const first = adminBody.querySelector('input, button');
    if (first) first.focus();
  }

  function lockAdmin() {
    adminBody.classList.add('hidden');
    adminLock.classList.remove('hidden');
    lockCode.value = '';
    lockCode.disabled = remainingLock() > 0;
    lockMsg.textContent = '';
    updateLockUI();
    maybeShowDefaultHint();
  }

  function updateLockUI() {
    const r = remainingLock();
    if (lockCode) lockCode.disabled = r > 0;
    if (r > 0) {
      if (lockMsg && !lockMsg.textContent) lockMsg.textContent = 'Locked. Retry in ' + fmt(r) + '.';
    }
  }

  function startLockTicker() {
    stopLockTicker();
    lockTicker = setInterval(function () {
      const r = remainingLock();
      if (lockCode) lockCode.disabled = r > 0;
      if (r <= 0 && lockCode) {
        lockCode.disabled = false;
        if (lockMsg) lockMsg.textContent = '';
        stopLockTicker();
      } else if (lockMsg) {
        lockMsg.textContent = 'Locked. Retry in ' + fmt(r) + '.';
      }
    }, 1000);
  }

  function stopLockTicker() {
    if (lockTicker) { clearInterval(lockTicker); lockTicker = null; }
  }

  function maybeShowDefaultHint() {
    if (!lockHint) return;
    verifyCode(DEFAULT_CODE).then(function (isDefault) {
      lockHint.textContent = isDefault ? 'default code: 0000 — change it after signing in' : '';
    });
  }

  function openAdmin() {
    adminScreen.classList.remove('hidden');
    adminScreen.setAttribute('aria-hidden', 'false');
    syncAdminControls();
    if (sessValid()) {
      unlockAdmin();
    } else {
      lockAdmin();
      if (lockCode) lockCode.focus();
    }
    if (remainingLock() > 0) startLockTicker();
  }

  function closeAdmin() {
    adminScreen.classList.add('hidden');
    adminScreen.setAttribute('aria-hidden', 'true');
    stopLockTicker();
    const b = document.getElementById('btn-admin');
    if (b) b.focus();
  }

  function tryLogin() {
    const code = lockCode.value;
    const lk = lockUntil();
    if (lk > Date.now()) {
      lockMsg.textContent = 'Locked. Retry in ' + fmt(remainingLock()) + '.';
      startLockTicker();
      return;
    }
    verifyCode(code).then(function (ok) {
      const max = Math.max(1, Number(aprefs.maxAtt) || 5);
      if (ok) {
        store.set('nxa_att', '0');
        store.set('nxa_lock', '0');
        pushLog(true);
        unlockAdmin();
      } else {
        pushLog(false);
        const att = Number(store.get('nxa_att', 0)) + 1;
        if (att >= max) {
          store.set('nxa_att', '0');
          store.set('nxa_lock', String(Date.now() + Math.max(1, Number(aprefs.lockMin) || 5) * 60000));
          lockMsg.textContent = 'Too many failed attempts. Locked for ' + fmt(remainingLock()) + '.';
          lockCode.disabled = true;
          startLockTicker();
        } else {
          store.set('nxa_att', String(att));
          lockMsg.className = 'admin-msg err';
          lockMsg.textContent = 'Invalid code. Attempts left: ' + (max - att);
        }
      }
    });
  }

  function syncAdminControls() {
    document.querySelectorAll('input[data-apref]').forEach(function (inp) {
      const k = inp.dataset.apref;
      if (inp.type === 'number') inp.value = aprefs[k];
    });
  }

  function copyText(t, btn) {
    function done() {
      if (btn) { const o = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = o; }, 1400); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(done, function () { legacyCopy(t); done(); });
    } else { legacyCopy(t); done(); }
  }

  function legacyCopy(t) {
    const ta = document.createElement('textarea');
    ta.value = t;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  function exportConfig(btn) {
    const data = { app: 'nexus', v: 2, user: {}, admin: {} };
    Object.keys(prefs).forEach(function (k) { data.user[k] = prefs[k]; });
    Object.keys(aprefs).forEach(function (k) { data.admin[k] = aprefs[k]; });
    copyText(JSON.stringify(data, null, 2), btn);
  }

  function importConfig(text) {
    const msg = document.getElementById('import-msg');
    let d;
    try { d = JSON.parse(text); } catch (e) { msg.textContent = 'Invalid JSON.'; return; }
    if (!d || d.app !== 'nexus' || typeof d.user !== 'object' || typeof d.admin !== 'object') {
      msg.textContent = 'Not a Nexus config.';
      return;
    }
    let n = 0;
    Object.keys(d.user).forEach(function (k) {
      if (k in DEFAULTS) { prefs[k] = d.user[k]; store.set('nx_' + k, d.user[k]); n++; }
    });
    Object.keys(d.admin).forEach(function (k) {
      if (k in ADMIN_DEFAULTS) { aprefs[k] = d.admin[k]; store.set('nxa_' + k, d.admin[k]); n++; }
    });
    apply();
    syncControls();
    msg.className = 'admin-msg';
    msg.textContent = 'Applied ' + n + ' keys.';
  }

  function wipeAll() {
    Object.keys(DEFAULTS).forEach(function (k) {
      prefs[k] = DEFAULTS[k];
      store.set('nx_' + k, typeof DEFAULTS[k] === 'boolean' ? (DEFAULTS[k] ? '1' : '0') : DEFAULTS[k]);
    });
    Object.keys(ADMIN_DEFAULTS).forEach(function (k) {
      aprefs[k] = ADMIN_DEFAULTS[k];
      store.set('nxa_' + k, typeof ADMIN_DEFAULTS[k] === 'boolean' ? (ADMIN_DEFAULTS[k] ? '1' : '0') : ADMIN_DEFAULTS[k]);
    });
    store.set('nxa_att', '0');
    store.set('nxa_lock', '0');
    store.set('nxa_sess', '0');
    store.set('nxa_log', '[]');
    hashPass(DEFAULT_CODE, admSalt).then(function (h) {
      store.set('nxa_hash', h);
      admHash = h;
    });
    apply();
    syncControls();
    lockAdmin();
    const w = document.getElementById('adm-wipe-confirm');
    if (w) w.classList.add('hidden');
    const msg = document.getElementById('import-msg');
    if (msg) { msg.className = 'admin-msg'; msg.textContent = 'All data wiped. Code reset to 0000.'; }
  }

  /* admin wiring */
  document.getElementById('btn-admin').addEventListener('click', openAdmin);
  adminClose.addEventListener('click', closeAdmin);
  adminScreen.addEventListener('click', function (e) {
    if (e.target === adminScreen) closeAdmin();
  });

  lockForm.addEventListener('submit', function (e) {
    e.preventDefault();
    lockMsg.className = 'admin-msg';
    tryLogin();
  });

  codeForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const cur = document.getElementById('adm-cur').value;
    const n1 = document.getElementById('adm-new').value;
    const n2 = document.getElementById('adm-conf').value;
    verifyCode(cur).then(function (ok) {
      const msg = document.getElementById('code-msg');
      if (!ok) { msg.className = 'admin-msg err'; msg.textContent = 'Current code is wrong.'; return; }
      if (n1.length < 4) { msg.className = 'admin-msg err'; msg.textContent = 'New code must be at least 4 characters.'; return; }
      if (n1 !== n2) { msg.className = 'admin-msg err'; msg.textContent = 'New codes do not match.'; return; }
      hashPass(n1, admSalt).then(function (h) {
        store.set('nxa_hash', h);
        admHash = h;
        store.set('nxa_att', '0');
        document.getElementById('adm-cur').value = '';
        document.getElementById('adm-new').value = '';
        document.getElementById('adm-conf').value = '';
        updateStrength('');
        msg.className = 'admin-msg';
        msg.textContent = 'Code updated.';
      });
    });
  });

  document.getElementById('adm-new').addEventListener('input', function () {
    updateStrength(this.value);
  });

  document.getElementById('adm-lock').addEventListener('click', function () {
    store.set('nxa_sess', '0');
    lockAdmin();
  });

  document.getElementById('adm-open-settings').addEventListener('click', function () {
    closeAdmin();
    openSettings();
  });

  document.getElementById('adm-clear-log').addEventListener('click', function () {
    store.set('nxa_log', '[]');
    renderLog();
  });

  document.getElementById('adm-export').addEventListener('click', function (e) {
    exportConfig(e.currentTarget);
  });

  document.getElementById('adm-import-btn').addEventListener('click', function () {
    importConfig(document.getElementById('adm-import').value);
  });

  document.getElementById('adm-wipe').addEventListener('click', function () {
    const c = document.getElementById('adm-wipe-confirm');
    c.classList.remove('hidden');
    const self = this;
    const o = self.textContent;
    self.textContent = 'Really?';
    setTimeout(function () {
      c.classList.add('hidden');
      self.textContent = o;
    }, 4000);
  });

  document.getElementById('adm-wipe-confirm').addEventListener('click', wipeAll);

  document.querySelectorAll('input[data-apref][type="number"]').forEach(function (inp) {
    inp.addEventListener('change', function () {
      const k = inp.dataset.apref;
      aprefs[k] = Number(inp.value);
      store.set('nxa_' + k, inp.value);
    });
  });

  /* ---------- profile gate (first contact) ---------- */

  const profileScreen = document.getElementById('screen-profile');
  const btnEnter = document.getElementById('btn-enter');

  if (btnEnter) {
    btnEnter.addEventListener('click', function (e) {
      const existing = store.get('nx_profile', null);
      if (existing) {
        try {
          const p = JSON.parse(existing);
          if (p && p.handle) return;
        } catch (err) {}
      }
      e.preventDefault();
      openProfile();
    });
  }

  const WIZ_GLYPHS = ['✦', '✧', '⋆', '★', '☆', '♛', '♞', '♠', '♥', '♦', '♣', '❖', '♫', '✜', '✢', '♚'];
  const WIZ_COLORS = ['#f472b6', '#ec4899', '#a855f7', '#8b5cf6', '#6366f1',
                      '#22d3ee', '#34d399', '#a3e635', '#fbbf24', '#f97316',
                      '#fb7185', '#e879f9'];
  const WIZ_NAMES = [
    ['voidwalker', 'Void Walker'], ['bytegirl', 'Byte Girl'], ['ghostlink', 'Ghost Link'],
    ['pixeldrift', 'Pixel Drift'], ['neonfox', 'Neon Fox'], ['starlace', 'Star Lace'],
    ['dreamstatic', 'Dream Static'], ['mothcrypt', 'Moth Crypt'], ['wiredshade', 'Wired Shade'],
    ['glimmer', 'Glimmer'], ['lunarkite', 'Lunar Kite'], ['cinder', 'Cinder'],
    ['softglitch', 'Soft Glitch'], ['eclipsed', 'Eclipsed'], ['quasar', 'Quasar']
  ];

  const wizNext = document.getElementById('wiz-next');
  const wizBack = document.getElementById('wiz-back');
  const wizDots = Array.prototype.slice.call(document.querySelectorAll('.wiz-dot'));
  const wizSteps = Array.prototype.slice.call(document.querySelectorAll('.wiz-step'));
  const wizHandle = document.getElementById('wiz-handle');
  const wizDisplay = document.getElementById('wiz-display');
  const wizBio = document.getElementById('wiz-bio');
  const wizHint = document.getElementById('wiz-handle-hint');
  const wizGlyphs = document.getElementById('wiz-glyphs');
  const wizSwatches = document.getElementById('wiz-swatches');
  const wizAvPreview = document.getElementById('wiz-av-preview');
  const wizAvGlyph = document.getElementById('wiz-av-glyph');
  const wizDoneRing = document.getElementById('wiz-done-ring');
  const wizDoneGlyph = document.getElementById('wiz-done-glyph');
  const wizDoneName = document.getElementById('wiz-done-name');
  const wizDice = document.getElementById('wiz-dice');

  let wiz = { step: 0, glyph: '✦', color: '#f472b6' };
  let wizMode = store.get('nx_mode', 'home') === 'school' ? 'school' : 'home';
  const modePopup = document.getElementById('screen-mode-popup');
  const modeConfirm = document.getElementById('mode-confirm');
  const modeCancel = document.getElementById('mode-cancel');
  let pendingMode = null;
  let pendingWizNext = false;
  function openModePopup(mode, isWiz) {
    pendingMode = mode;
    pendingWizNext = !!isWiz;
    if (modePopup) { modePopup.classList.remove('hidden'); modePopup.setAttribute('aria-hidden', 'false'); }
  }
  function closeModePopup() {
    if (modePopup) { modePopup.classList.add('hidden'); modePopup.setAttribute('aria-hidden', 'true'); }
    pendingMode = null;
    pendingWizNext = false;
  }
  document.querySelectorAll('[data-wiz-mode] .seg-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      const val = b.dataset.val;
      if (val === 'school') { openModePopup('school', true); return; }
      wizMode = val;
      document.querySelectorAll('[data-wiz-mode] .seg-btn').forEach(function (x) {
        const on = x === b;
        x.classList.toggle('active', on);
        x.setAttribute('aria-pressed', String(on));
      });
      const warn = document.getElementById('wiz-mode-warn');
      if (warn) warn.classList.add('hidden');
    });
  });
  (function () {
    document.querySelectorAll('[data-wiz-mode] .seg-btn').forEach(function (b) {
      const on = b.dataset.val === wizMode;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    const warn = document.getElementById('wiz-mode-warn');
    if (warn) warn.classList.toggle('hidden', wizMode !== 'school');
  })();
  if (modeCancel) modeCancel.addEventListener('click', function () {
    const wasWiz = pendingWizNext;
    closeModePopup();
    if (wasWiz) return;
    try { store.set('nx_mode', 'home'); prefs.mode = 'home'; if (window.NexusTheme && window.NexusTheme.setMode) window.NexusTheme.setMode('home'); syncControls(); } catch (e) {}
  });
  if (modeConfirm) modeConfirm.addEventListener('click', function () {
    const m = pendingMode || 'school';
    const wasWiz = pendingWizNext;
    closeModePopup();
    try { store.set('nx_mode', m); prefs.mode = m; if (window.NexusTheme && window.NexusTheme.setMode) window.NexusTheme.setMode(m); } catch (e) {}
    document.querySelectorAll('[data-wiz-mode] .seg-btn').forEach(function (b) {
      const on = b.dataset.val === m;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    const warn = document.getElementById('wiz-mode-warn');
    if (warn) warn.classList.toggle('hidden', m !== 'school');
    wizMode = m;
    try { syncControls(); } catch (e) {}
    if (wasWiz) goWiz(wiz.step + 1);
  });
  if (modePopup) modePopup.addEventListener('click', function (e) { if (e.target === modePopup) closeModePopup(); });

  function cleanWizHandle(v) {
    let h = String(v || '').trim().replace(/\s+/g, '-');
    if (!h) return '';
    if (h.charAt(0) !== '@') h = '@' + h;
    return h.slice(0, 24);
  }

  function wizGlyphData(glyph, color) {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">'
      + '<defs><linearGradient id="wxg" x1="0" y1="0" x2="1" y2="1">'
      + '<stop offset="0" stop-color="' + color + '"/>'
      + '<stop offset="1" stop-color="#17051e"/>'
      + '</linearGradient></defs>'
      + '<rect width="96" height="96" rx="26" fill="url(#wxg)"/>'
      + '<text x="48" y="63" font-size="42" text-anchor="middle" fill="#ffffff">' + glyph + '</text>'
      + '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function setWizPreview() {
    if (wizAvPreview) wizAvPreview.style.setProperty('--wiz-accent', wiz.color);
    if (wizAvGlyph) wizAvGlyph.textContent = wiz.glyph;
    if (wizDoneRing) wizDoneRing.style.setProperty('--wiz-accent', wiz.color);
    if (wizDoneGlyph) wizDoneGlyph.textContent = wiz.glyph;
  }

  function wizHintText() {
    if (!wizHint) return;
    const h = cleanWizHandle(wizHandle.value);
    if (!h) {
      wizHint.className = 'wiz-hint';
      wizHint.textContent = "Pick a handle — it's how the mesh finds you.";
      return;
    }
    if (h === '@operator') {
      wizHint.className = 'wiz-hint bad';
      wizHint.textContent = '@operator is my name. Make it yours.';
      return;
    }
    wizHint.className = 'wiz-hint ok';
    wizHint.textContent = 'ready as ' + h + ' — letters, numbers, dashes';
  }

  function paintWizSwatch() {
    Array.prototype.forEach.call(wizSwatches.children, function (c) {
      c.classList.toggle('active', String(c.dataset.hex).toLowerCase() === String(wiz.color).toLowerCase());
    });
  }

  function buildWizPickers() {
    if (wizGlyphs && !wizGlyphs.children.length) {
      WIZ_GLYPHS.forEach(function (g) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'glyph-btn' + (g === wiz.glyph ? ' active' : '');
        b.textContent = g;
        b.setAttribute('aria-label', 'Symbol ' + g);
        wizGlyphs.appendChild(b);
        b.addEventListener('click', function () {
          wiz.glyph = g;
          Array.prototype.forEach.call(wizGlyphs.children, function (c) {
            c.classList.toggle('active', c === b);
          });
          setWizPreview();
        });
      });
    }
    if (wizSwatches && !wizSwatches.children.length) {
      WIZ_COLORS.forEach(function (c) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'swatch-btn';
        b.dataset.hex = c;
        b.style.background = c;
        b.setAttribute('aria-label', c);
        wizSwatches.appendChild(b);
        b.addEventListener('click', function () {
          wiz.color = c;
          paintWizSwatch();
          setWizPreview();
        });
      });
      paintWizSwatch();
    }
  }

  function sparkle(ring) {
    if (!ring) return;
    const colors = [wiz.color, '#f472b6', '#8b5cf6', '#ffffff'];
    for (let i = 0; i < 18; i++) {
      const s = document.createElement('span');
      s.className = 'spark';
      const ang = (Math.PI * 2 * i) / 18 + Math.random() * 0.5;
      const d = 66 + Math.random() * 40;
      s.style.setProperty('--x', String(Math.cos(ang)));
      s.style.setProperty('--y', String(Math.sin(ang)));
      s.style.setProperty('--d', d + 'px');
      s.style.background = colors[i % colors.length];
      ring.appendChild(s);
      (function (el) {
        setTimeout(function () { el.remove(); }, 950);
      })(s);
    }
  }

  function goWiz(step) {
    wiz.step = Math.max(0, Math.min(2, step));
    wizSteps.forEach(function (s, i) {
      s.classList.toggle('active', i === wiz.step);
      s.setAttribute('aria-hidden', i === wiz.step ? 'false' : 'true');
    });
    wizDots.forEach(function (d, i) {
      d.className = 'wiz-dot' + (i < wiz.step ? ' done' : '') + (i === wiz.step ? ' active' : '');
      d.setAttribute('aria-current', i === wiz.step ? 'step' : 'false');
    });
    const last = wiz.step === 2;
    if (wizNext) wizNext.textContent = last ? 'Enter Nexus' : 'Continue';
    if (wizBack) wizBack.hidden = wiz.step === 0;
    if (last) {
      if (wizDoneName) {
        wizDoneName.textContent = String(wizDisplay.value.trim() || 'friend').slice(0, 30);
      }
      setWizPreview();
      sparkle(wizDoneRing);
      if (wizNext) wizNext.focus();
    } else if (wiz.step === 0 && wizHandle) {
      wizHandle.focus();
    }
  }

  function openProfile() {
    buildWizPickers();
    setWizPreview();
    wizHandle.value = wizHandle.value || '';
    wizDisplay.value = wizDisplay.value || '';
    wizBio.value = wizBio.value || '';
    wizHintText();
    goWiz(0);
    profileScreen.classList.remove('hidden');
    profileScreen.setAttribute('aria-hidden', 'false');
    if (wizHandle) wizHandle.focus();
  }

  function closeProfile() {
    profileScreen.classList.add('hidden');
    profileScreen.setAttribute('aria-hidden', 'true');
    if (btnEnter) btnEnter.focus();
  }

  function wizFinish() {
    const handle = cleanWizHandle(wizHandle.value);
    const display = String(wizDisplay.value.trim() || 'Explorer').slice(0, 36);
    const bio = String(wizBio.value.trim() || 'Handle, avatar and activity — everything this node presents to the mesh.').slice(0, 160);
    try { store.set('nx_mode', wizMode); } catch (e) {}
    try { if (window.NexusTheme && window.NexusTheme.setMode) window.NexusTheme.setMode(wizMode); } catch (e) {}
    const payload = JSON.stringify({
      handle: handle,
      display: display,
      bio: bio,
      status: 'online',
      accent: wiz.color,
      avatar: wizGlyphData(wiz.glyph, wiz.color),
      createdAt: Date.now()
    });
    try { store.set('nx_profile', payload); } catch (e) {}
    try {
      const check = store.get('nx_profile', null);
      if (!check || check !== payload) {
        try { localStorage.setItem('nx_profile', payload); } catch (e2) {}
        try { sessionStorage.setItem('nx_profile', payload); } catch (e2) {}
        try { document.cookie = 'nx_profile=' + encodeURIComponent(payload) + '; path=/; max-age=31536000; SameSite=Lax'; } catch (e2) {}
        try { window.name = JSON.stringify(Object.assign({}, (function () { try { return JSON.parse(window.name || '{}'); } catch (e) { return {}; } })(), { nx_profile: payload })); } catch (e2) {}
      }
    } catch (e) {}
    location.href = 'home.html';
  }

  if (wizNext) {
    wizNext.addEventListener('click', function () {
      if (wiz.step === 2) { wizFinish(); return; }
      if (wiz.step === 0) {
        const h = cleanWizHandle(wizHandle.value);
        if (!h || h === '@operator') {
          if (wizHint) wizHint.className = 'wiz-hint bad';
          if (wizHint) wizHint.textContent = 'Give me a handle first, then we go in.';
          if (wizHandle) { wizHandle.classList.add('bad'); setTimeout(function () { wizHandle.classList.remove('bad'); }, 400); }
          if (wizHandle) wizHandle.focus();
          return;
        }
        if (wizMode === 'school') {
          openModePopup('school', true);
          return;
        }
      }
      goWiz(wiz.step + 1);
    });
  }

  if (wizBack) {
    wizBack.addEventListener('click', function () { goWiz(wiz.step - 1); });
  }

  wizDots.forEach(function (d) {
    d.addEventListener('click', function () {
      if (Number(d.dataset.step) > wiz.step && wiz.step === 0) {
        const h = cleanWizHandle(wizHandle.value);
        if (!h || h === '@operator') {
          if (wizHandle) wizHandle.focus();
          return;
        }
      }
      goWiz(Number(d.dataset.step));
    });
  });

  if (wizHandle) {
    wizHandle.addEventListener('input', function () {
      wizHandle.value = wizHandle.value.replace(/[\s]+/g, '-');
      wizHintText();
    });
  }

  if (wizDice) {
    wizDice.addEventListener('click', function () {
      if (!WIZ_NAMES.length) return;
      const pick = WIZ_NAMES[(Math.random() * WIZ_NAMES.length) | 0];
      wizHandle.value = '@' + pick[0];
      wizDisplay.value = pick[1];
      wiz.glyph = WIZ_GLYPHS[(Math.random() * WIZ_GLYPHS.length) | 0];
      wiz.color = WIZ_COLORS[(Math.random() * WIZ_COLORS.length) | 0];
      wizHintText();
      paintWizSwatch();
      Array.prototype.forEach.call(wizGlyphs.children, function (c) {
        c.classList.toggle('active', c.textContent === wiz.glyph);
      });
      setWizPreview();
    });
  }

  profileScreen.addEventListener('click', function (e) {
    if (e.target === profileScreen) closeProfile();
  });

  /* ---------- init ---------- */

  buildSwatches();
  apply();
})();