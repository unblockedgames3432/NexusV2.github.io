(function () {
  const store = (window.NexusTheme && window.NexusTheme.store) ? window.NexusTheme.store : {
    get: function (k, d) { try { const v = localStorage.getItem(k); if (v !== null) return v; } catch (e) {} try { const v = sessionStorage.getItem(k); if (v !== null) return v; } catch (e) {} return d; },
    set: function (k, v) { const s = String(v); try { localStorage.setItem(k, s); } catch (e) {} try { sessionStorage.setItem(k, s); } catch (e) {} try { document.cookie = k + '=' + encodeURIComponent(s) + '; path=/; max-age=31536000; SameSite=Lax'; } catch (e) {} }
  };
  const XP_KEY = 'nx_xp';
  const XP_TIME_KEY = 'nx_xp_time';
  const INTERVAL = 5 * 60 * 1000;
  let last = Date.now();
  let acc = Number(store.get(XP_TIME_KEY, '0') || 0);
  if (isNaN(acc)) acc = 0;
  function tick() {
    if (document.visibilityState === 'hidden') { last = Date.now(); return; }
    const now = Date.now();
    const delta = now - last;
    last = now;
    acc += delta;
    let earned = 0;
    while (acc >= INTERVAL) {
      acc -= INTERVAL;
      earned++;
    }
    if (earned) {
      const cur = Number(store.get(XP_KEY, '0') || 0);
      store.set(XP_KEY, String(cur + earned));
    }
    store.set(XP_TIME_KEY, String(acc));
  }
  setInterval(tick, 10000);
  document.addEventListener('visibilitychange', function () { last = Date.now(); });
  window.addEventListener('beforeunload', function () { store.set(XP_TIME_KEY, String(acc)); });
})();