/* KJayson Travels: theme switch, visit counter, likes and comments. */
(function () {
  'use strict';
  var C = window.KJT || {};
  var root = document.documentElement;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  // ---------- theme ----------
  var themeBtn = document.getElementById('themeBtn');
  function setTheme(t) {
    root.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', t === 'dark' ? '#151916' : '#F1ECE2');
    if (themeBtn) themeBtn.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }
  setTheme(root.getAttribute('data-theme') || 'light');
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var t = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    store.set('kjt-theme', t); setTheme(t);
  });

  if (!C.sb || !C.sb.url || !C.sb.key) return;
  var API = C.sb.url.replace(/\/$/, '') + '/rest/v1/';
  var H = { apikey: C.sb.key, 'Content-Type': 'application/json' };
  function api(path, opts) {
    opts = opts || {};
    return fetch(API + path, { method: opts.method || 'GET', headers: Object.assign({}, H, opts.headers || {}), body: opts.body ? JSON.stringify(opts.body) : undefined })
      .then(function (r) {
        if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) { throw new Error(j.message || ('Error ' + r.status)); });
        return r.status === 204 || r.status === 201 && opts.minimal ? null : r.json();
      });
  }
  function visitor() {
    var v = store.get('kjt-vid');
    if (!v) { v = (Date.now().toString(36) + Math.random().toString(36).slice(2, 12)); store.set('kjt-vid', v); }
    return v;
  }

  // ---------- visits ----------
  var host = location.hostname;
  var isLive = host === C.host || host === 'www.' + C.host;
  if (C.track && isLive && !navigator.webdriver && store.get('kjt-notrack') !== '1') {
    var ref = '';
    try { if (document.referrer) { var rh = new URL(document.referrer).hostname.replace(/^www\./, ''); if (rh && rh !== C.host) ref = rh; } } catch (e) {}
    var w = window.innerWidth || 1024;
    api('travel_page_views', { method: 'POST', minimal: true, headers: { Prefer: 'return=minimal' }, body: {
      path: location.pathname.slice(0, 300), title: document.title.slice(0, 200), referrer: ref.slice(0, 300),
      visitor_id: visitor(), device: w < 700 ? 'mobile' : w < 1100 ? 'tablet' : 'desktop'
    } }).catch(function () {});
  }

  // ---------- likes ----------
  var likeBtn = document.getElementById('likeBtn');
  if (likeBtn) {
    var slug = likeBtn.getAttribute('data-slug'), countEl = likeBtn.querySelector('[data-count]');
    var paint = function (s) {
      if (!s) return;
      likeBtn.setAttribute('aria-pressed', s.liked ? 'true' : 'false');
      countEl.textContent = s.count;
      likeBtn.setAttribute('aria-label', (s.liked ? 'Unlike' : 'Like') + ' this thread, ' + s.count + ' like' + (s.count === 1 ? '' : 's'));
    };
    api('rpc/travel_like_state', { method: 'POST', body: { p_slug: slug, p_visitor: visitor() } }).then(paint).catch(function () {});
    likeBtn.addEventListener('click', function () {
      likeBtn.disabled = true;
      api('rpc/travel_toggle_like', { method: 'POST', body: { p_slug: slug, p_visitor: visitor() } }).then(paint).catch(function () {}).then(function () { likeBtn.disabled = false; });
    });
  }

  // ---------- comments ----------
  var REPLY_ICON = '<svg class="reply-ico" width="18" height="16" viewBox="0 0 44 40" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 3C11 3 3 9 3 17c0 4.5 2.6 8.5 6.8 11L8 36l9.2-4.6c1.5.3 3.1.4 4.8.4 11 0 19-6 19-14.4S33 3 22 3z"/><path d="M15 12h16M15 17h16M15 22h16"/><path d="M8 33c1-7 5-12 12-13.5"/><path d="M17 15.5l5 4-5.4 3.6"/></svg>';
  var box = document.getElementById('comments');
  if (box) {
    var cslug = box.getAttribute('data-slug');
    var list = box.querySelector('.c-list'), countLabel = box.querySelector('[data-ccount]');
    var form = box.querySelector('form'), msg = box.querySelector('.c-msg');
    var fmt = function (iso) { try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } };
    var add = function (c) {
      var li = document.createElement('li'); li.className = 'c-item';
      var who = document.createElement('span'); who.className = 'c-who'; who.innerHTML = REPLY_ICON; who.appendChild(document.createTextNode(' ' + c.name));
      var t = document.createElement('time'); t.dateTime = c.created_at; t.textContent = fmt(c.created_at);
      var p = document.createElement('p'); p.textContent = c.body;
      li.appendChild(who); li.appendChild(t); li.appendChild(p); list.appendChild(li);
    };
    var setCount = function () { var n = list.children.length; countLabel.textContent = n ? '(' + n + ')' : ''; };
    api('travel_comments?select=name,body,created_at&thread_slug=eq.' + encodeURIComponent(cslug) + '&order=created_at.asc&limit=300')
      .then(function (rows) { list.innerHTML = ''; (rows || []).forEach(add); if (!rows || !rows.length) list.innerHTML = '<li class="muted">No replies yet. Be the first.</li>'; setCount(); })
      .catch(function () { list.innerHTML = '<li class="muted">Replies could not load right now.</li>'; });
    var asName = (function () {
      var ua = navigator.userAgent || '', b = 'Browser', os = '';
      if (/SamsungBrowser/i.test(ua)) b = 'Samsung Internet';
      else if (/OPR\/|Opera/i.test(ua)) b = 'Opera';
      else if (/Edg\//i.test(ua)) b = 'Edge';
      else if (/Firefox|FxiOS/i.test(ua)) b = 'Firefox';
      else if (/CriOS|Chrome/i.test(ua)) b = 'Chrome';
      else if (/Safari/i.test(ua)) b = 'Safari';
      if (/iPhone/i.test(ua)) os = 'iPhone';
      else if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) os = 'iPad';
      else if (/Android/i.test(ua)) os = 'Android';
      else if (/Windows/i.test(ua)) os = 'Windows';
      else if (/Mac OS X|Macintosh/i.test(ua)) os = 'Mac';
      else if (/CrOS/i.test(ua)) os = 'Chromebook';
      else if (/Linux/i.test(ua)) os = 'Linux';
      return os ? b + ' on ' + os : b + ' visitor';
    })();
    var asEl = form.querySelector('[data-asname]'); if (asEl) asEl.textContent = asName;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.querySelector('[name=website]').value) return; // bots
      var body = form.querySelector('[name=body]').value.trim();
      if (!body) { msg.className = 'c-msg err'; msg.textContent = 'Write something first.'; return; }
      var btn = form.querySelector('button'); btn.disabled = true; msg.className = 'c-msg'; msg.textContent = 'Posting…';
      api('travel_comments', { method: 'POST', headers: { Prefer: 'return=representation' }, body: { thread_slug: cslug, name: asName.slice(0, 60), body: body.slice(0, 1000) } })
        .then(function (rows) {
          if (list.querySelector('.muted')) list.innerHTML = '';
          (rows || []).forEach(add); setCount();
          form.querySelector('[name=body]').value = ''; msg.className = 'c-msg ok'; msg.textContent = 'Reply posted!';
        })
        .catch(function (err) { msg.className = 'c-msg err'; msg.textContent = /Too many/.test(err.message) ? err.message : 'Could not post. Please try again.'; })
        .then(function () { btn.disabled = false; });
    });
  }
})();
