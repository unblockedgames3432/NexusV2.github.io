/* =========================================================
   NEXUS V2  ·  shared settings engine
   store + user prefs + colour themes + DOM apply.
   loaded BEFORE page scripts on every page.
   ========================================================= */

(function (root) {
  'use strict';

  /* ---------- persistence: localStorage + sessionStorage + cookie + memory + window.name (incognito-safe) ---------- */

  const _mem = {};
  function _wnGet(k) {
    try {
      const o = JSON.parse(window.name || '');
      if (o && typeof o === 'object' && k in o) return String(o[k]);
    } catch (e) {}
    return null;
  }
  function _wnSet(k, v) {
    try {
      let o = {};
      try { o = JSON.parse(window.name || '') || {}; } catch (e) { o = {}; }
      if (typeof o !== 'object' || o === null) o = {};
      o[k] = String(v);
      window.name = JSON.stringify(o);
    } catch (e) {}
  }
  const store = {
    get(k, def) {
      if (k in _mem) {
        try { const v = _mem[k]; if (v !== undefined && v !== null) return v; } catch (e) {}
      }
      try {
        const v = localStorage.getItem(k);
        if (v !== null) return v;
      } catch (e) {}
      try {
        const v = sessionStorage.getItem(k);
        if (v !== null) return v;
      } catch (e) {}
      try {
        const esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const m = document.cookie.match(new RegExp('(?:^|; )' + esc + '=([^;]*)'));
        if (m) return decodeURIComponent(m[1]);
      } catch (e) {}
      const w = _wnGet(k);
      if (w !== null) return w;
      return def;
    },
    set(k, v) {
      const s = String(v);
      _mem[k] = s;
      _wnSet(k, s);
      try { localStorage.setItem(k, s); } catch (e) {}
      try { sessionStorage.setItem(k, s); } catch (e) {}
      try {
        document.cookie = k + '=' + encodeURIComponent(s) +
          '; path=/; max-age=31536000; SameSite=Lax';
      } catch (e) {}
      try {
        if ('indexedDB' in root) {
          const req = indexedDB.open('nx_store', 1);
          req.onupgradeneeded = function () { try { req.result.createObjectStore('kv'); } catch (e) {} };
          req.onsuccess = function () {
            try {
              const tx = req.result.transaction('kv', 'readwrite');
              tx.objectStore('kv').put(s, k);
            } catch (e) {}
          };
        }
      } catch (e) {}
    }
  };

  /* ---------- user preferences ---------- */

  const DEFAULTS = {
    particles: true,
    bloom: true,
    density: 'med',
    speed: 'med',
    grain: true,
    grainamt: 'std',
    aura: true,
    glow: true,
    motion: false,
    theme: 'pink-violet',
    custom: '#f472b6',
    mode: 'home'
  };

  const prefs = {};
  Object.keys(DEFAULTS).forEach(function (k) {
    const raw = store.get('nx_' + k, null);
    const d = DEFAULTS[k];
    if (raw === null) { prefs[k] = d; return; }
    if (typeof d === 'boolean') prefs[k] = raw === '1' || raw === 'true';
    else if (typeof d === 'number') prefs[k] = Number(raw);
    else prefs[k] = raw;
  });

  /* ---------- palettes ---------- */

  const THEMES = {
    'pink-violet': { pink: '#f472b6', magenta: '#d946ef', violet: '#a855f7', vio: '#8b5cf6', hues: [325, 325, 340, 345, 270, 270] },
    'pink':        { pink: '#ff7ab8', magenta: '#ff4fa3', violet: '#f43f8f', vio: '#e02477', hues: [330, 335, 340, 345, 350, 325] },
    'violet':      { pink: '#b99ff9', magenta: '#8b5cf6', violet: '#7c3aed', vio: '#6d28d9', hues: [258, 262, 268, 274, 250, 256] }
  };

  const DENSITY = { low: 0.6, med: 1, high: 1.6 };
  const SPEED = { drift: 0.55, med: 1, fast: 1.7 };
  const GRAIN = { subtle: 0.022, std: 0.035, heavy: 0.06 };

  const PRESETS = [
    { name: 'Hot Pink', hex: '#ff2e6e' },
    { name: 'Neon Pink', hex: '#ff5c9e' },
    { name: 'Nexus Pink', hex: '#f472b6' },
    { name: 'Soft Pink', hex: '#ff9ecd' },
    { name: 'Magenta', hex: '#d946ef' },
    { name: 'Fuchsia', hex: '#c026d3' },
    { name: 'Violet', hex: '#a855f7' },
    { name: 'Deep Violet', hex: '#8b5cf6' },
    { name: 'Royal Purple', hex: '#7c3aed' },
    { name: 'Dark Plum', hex: '#6d28d9' },
    { name: 'Indigo', hex: '#6366f1' },
    { name: 'Blue', hex: '#3b82f6' },
    { name: 'Cyan', hex: '#22d3ee' },
    { name: 'Teal', hex: '#2dd4bf' },
    { name: 'Emerald', hex: '#34d399' },
    { name: 'Amber', hex: '#fbbf24' },
    { name: 'Orange', hex: '#fb923c' },
    { name: 'Rose', hex: '#f43f5e' }
  ];

  /* ---------- colour helpers ---------- */

  function hexToHsl(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return { h: 330, s: 0.7, l: 0.7 };
    const n = parseInt(m[1], 16);
    let r = ((n >> 16) & 255) / 255;
    let g = ((n >> 8) & 255) / 255;
    let b = (n & 255) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    let h = 0, s = 0;
    if (d !== 0) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h, s, l };
  }

  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = Math.min(1, Math.max(0, s));
    l = Math.min(1, Math.max(0, l));
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function norm(h) { return ((h % 360) + 360) % 360; }

  function lighten(c, amt) {
    const { h, s, l } = hexToHsl(c);
    return hslToHex(h, Math.min(1, s * 0.9), Math.min(0.92, l + amt));
  }

  function customTheme(obj) {
    const prefsObj = obj || prefs;
    const base = /^#[0-9a-f]{6}$/i.test(prefsObj.custom) ? prefsObj.custom : '#f472b6';
    const { h, s, l } = hexToHsl(base);
    const sat = Math.min(1, s * 1.05);
    const lum = Math.min(0.92, Math.max(0.18, l));
    return {
      pink: base,
      magenta: hslToHex(h + 15, sat, Math.min(1, lum + 0.03)),
      violet: hslToHex(h + 42, sat, Math.max(0.18, lum - 0.02)),
      vio: hslToHex(h + 58, sat, Math.max(0.14, lum - 0.06)),
      hues: [h, h + 12, h + 26, h + 42, h + 58].map(norm)
    };
  }

  /* ---------- apply to DOM ---------- */

  function setFavicon(pink, vio) {
    const link = document.querySelector('link[rel="icon"]');
    if (!link) return;
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">'
      + '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
      + '<stop offset="0" stop-color="' + pink + '"/>'
      + '<stop offset="1" stop-color="' + vio + '"/>'
      + '</linearGradient></defs>'
      + '<path d="M24 4l17.2 10v20L24 44 6.8 34V14z" fill="none" stroke="url(#g)" stroke-width="3"/>'
      + '<circle cx="24" cy="24" r="4" fill="url(#g)"/></svg>';
    link.setAttribute('href', 'data:image/svg+xml,' + encodeURIComponent(svg));
  }

  function applyUserTheme(prefsObj) {
    const body = document.body;
    const el = document.documentElement;
    const p = prefsObj || prefs;
    body.classList.toggle('no-particles', !p.particles);
    body.classList.toggle('no-grain', !p.grain);
    body.classList.toggle('no-aura', !p.aura);
    el.classList.toggle('no-glow', !p.glow);
    el.classList.toggle('no-motion', !!p.motion);
    el.style.setProperty('--grain', String(GRAIN[p.grainamt] || GRAIN.std));

    const t = p.theme === 'custom' ? customTheme(p) : (THEMES[p.theme] || THEMES['pink-violet']);
    el.style.setProperty('--pink', t.pink);
    el.style.setProperty('--magenta', t.magenta);
    el.style.setProperty('--violet', t.violet);
    el.style.setProperty('--vio-deep', t.vio);
    const bhsl = hexToHsl(t.pink);
    const textL = Math.min(0.82, Math.max(0.5, 0.4 + 0.42 * (1 - bhsl.l)));
    el.style.setProperty('--accent-text', hslToHex(bhsl.h, Math.min(1, bhsl.s * 0.85), textL));
    el.style.setProperty('--on-accent', bhsl.l < 0.55 ? '#ffffff' : '#17051e');
    const darkish = bhsl.l < 0.45;
    const amt = (0.45 - bhsl.l) * 1.6 + 0.12;
    const mk = darkish ? lighten(t.pink, amt) : t.pink;
    const mv = darkish ? lighten(t.vio, amt * 0.85) : t.vio;
    const mm = darkish ? lighten(t.magenta, amt * 0.92) : t.magenta;
    el.style.setProperty('--mark-pink', mk);
    el.style.setProperty('--mark-vio', mv);
    el.style.setProperty('--grad-logo', 'linear-gradient(120deg,' + mk + ' 0%,' + mm + ' 45%,' + mv + ' 100%)');
    el.style.setProperty('--logo-glow', darkish ? 'rgba(255, 255, 255, 0.12)' : '');
    setFavicon(t.pink, t.vio);
    return t;
  }

  /* settings always apply, on every page */
  applyUserTheme(prefs);

  /* ---------- school mode disguise ---------- */
  function applyMode(mode) {
    const m = mode === 'school' ? 'school' : 'home';
    document.documentElement.classList.toggle('school-mode', m === 'school');
    document.body.classList.toggle('school-mode', m === 'school');
    if (m === 'school') {
      document.title = 'My Drive - Google Drive';
      const link = document.querySelector('link[rel="icon"]');
      if (link) {
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M12 8 L36 8 L44 20 L36 40 L12 40 Z" fill="#fff"/><path d="M12 8 L28 8 L36 20 L12 20 Z" fill="#4285F4"/><path d="M28 8 L36 8 L36 20 Z" fill="#34A853"/><path d="M12 20 L36 20 L36 40 L12 40 Z" fill="#F8AB00"/></svg>';
        try { link.setAttribute('href', 'data:image/svg+xml,' + encodeURIComponent(svg)); } catch (e) {}
      }
      const brand = document.querySelector('.nav-name');
      if (brand) brand.textContent = 'My Drive';
    } else {
      document.title = 'Nexusv2';
      const t = prefs.theme === 'custom' ? customTheme(prefs) : (THEMES[prefs.theme] || THEMES['pink-violet']);
      setFavicon(t.pink, t.vio);
      const brand = document.querySelector('.nav-name');
      if (brand) brand.innerHTML = 'Nexus<span class="nav-v2">v2</span>';
    }
  }
  applyMode(prefs.mode);
  function setMode(mode) {
    const m = mode === 'school' ? 'school' : 'home';
    prefs.mode = m;
    store.set('nx_mode', m);
    applyMode(m);
  }

  /* ---------- backend detection: true if the live node server responds ---------- */

  let backendPromise = null;
  const backendCache = {};
  function probeBackend(force) {
    if (backendPromise) {
      if (!force && backendCache.state) return backendPromise;
      if (force && backendCache.active) return backendPromise;
    }
    backendCache.active = true;
    backendPromise = new Promise(function (resolve) {
      let settled = false;
      const fin = function (ok) {
        if (settled) return;
        settled = true;
        backendCache.state = ok;
        backendCache.active = false;
        resolve(ok);
      };
      try {
        const ctrl = ('AbortController' in root) ? new AbortController() : null;
        const opts = { method: 'GET', headers: { 'Cache-Control': 'no-cache' }, signal: ctrl ? ctrl.signal : undefined };
        const t = ctrl ? setTimeout(function () { ctrl.abort(); }, 3500) : null;
        fetch('/api/health', opts).then(function (r) {
          if (t) clearTimeout(t);
          fin(r.ok && r.status === 200);
        }).catch(function () {
          if (t) clearTimeout(t);
          fin(false);
        });
      } catch (e) {
        fin(false);
      }
    });
    return backendPromise;
  }

  root.NexusTheme = {
    store,
    DEFAULTS,
    prefs,
    THEMES,
    DENSITY,
    SPEED,
    GRAIN,
    PRESETS,
    customTheme,
    applyUserTheme,
    applyMode,
    setMode,
    probeBackend
  };
})(window);