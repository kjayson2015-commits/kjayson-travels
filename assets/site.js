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

  // ---------- X-style likes, replies, share ----------
  var REPLY_ICON = '<svg class="reply-ico" width="20" height="18" viewBox="0 0 44 40" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 3C11 3 3 9 3 17c0 4.5 2.6 8.5 6.8 11L8 36l9.2-4.6c1.5.3 3.1.4 4.8.4 11 0 19-6 19-14.4S33 3 22 3z"/><path d="M15 12h16M15 17h16M15 22h16"/><path d="M8 33c1-7 5-12 12-13.5"/><path d="M17 15.5l5 4-5.4 3.6"/></svg>';
  var HEART_ICON = '<svg class="heart-ico" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1l8.8 8.8 8.8-8.8a5 5 0 0 0 0-7.1z"/></svg>';
  var box = document.getElementById('replies');
  if (!box) return;
  var slug = box.getAttribute('data-slug'), nPosts = +box.getAttribute('data-posts') || 1;
  var form = document.getElementById('composer'), ta = form.querySelector('textarea'), pill = form.querySelector('.x-pill');
  var msg = form.querySelector('.c-msg'), list = box.querySelector('.x-list'), toEl = form.querySelector('[data-to]');
  var replyTo = null;      // post number the reply points at
  var likeState = {};      // key -> {count, liked}
  var replyCounts = {};    // post number -> count

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
  var hue = function (s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return 'hsl(' + h + ' 38% 42%)'; };
  var initial = function (s) { return (String(s).trim()[0] || '?').toUpperCase(); };
  var ago = function (iso) {
    var d = new Date(iso), s = (Date.now() - d.getTime()) / 1000;
    if (s < 60) return 'now'; if (s < 3600) return Math.floor(s / 60) + 'm'; if (s < 86400) return Math.floor(s / 3600) + 'h';
    if (s < 604800) return Math.floor(s / 86400) + 'd';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
  };
  var fmtN = function (n) { return !n ? '' : n < 1000 ? String(n) : (n / 1000).toFixed(n < 10000 ? 1 : 0).replace(/\.0$/, '') + 'K'; };

  var me = form.querySelector('[data-me]'); me.textContent = initial(asName); me.style.background = hue(asName);
  form.querySelector('[data-asname]').textContent = asName;

  // likes
  function paintLike(btn) {
    var k = btn.closest('[data-key]').getAttribute('data-key'), st = likeState[k] || { count: 0, liked: false };
    btn.setAttribute('aria-pressed', st.liked ? 'true' : 'false');
    btn.querySelector('[data-lc]').textContent = fmtN(st.count);
    var label = btn.getAttribute('aria-label').replace(/^(Like|Unlike)/, st.liked ? 'Unlike' : 'Like');
    btn.setAttribute('aria-label', label.replace(/, \d+ likes?$/, '') + (st.count ? ', ' + st.count + ' like' + (st.count === 1 ? '' : 's') : ''));
  }
  function loadLikes(keys) {
    if (!keys.length) return Promise.resolve();
    return api('rpc/travel_like_states', { method: 'POST', body: { p_keys: keys, p_visitor: visitor() } }).then(function (m) {
      Object.keys(m || {}).forEach(function (k) { likeState[k] = m[k]; });
      document.querySelectorAll('.act-like').forEach(paintLike);
    }).catch(function () {});
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.act'); if (!btn) return;
    var wrap = btn.closest('[data-key]'), key = wrap.getAttribute('data-key'), act = btn.getAttribute('data-act');
    if (act === 'like') {
      var st = likeState[key] || { count: 0, liked: false };
      likeState[key] = { count: Math.max(0, st.count + (st.liked ? -1 : 1)), liked: !st.liked }; paintLike(btn); // instant, like X
      api('rpc/travel_toggle_like', { method: 'POST', body: { p_slug: key, p_visitor: visitor() } })
        .then(function (s) { likeState[key] = s; paintLike(btn); })
        .catch(function () { likeState[key] = st; paintLike(btn); });
    } else if (act === 'reply') {
      setReplyTo(+wrap.getAttribute('data-post') || null);
      form.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(function () { ta.focus({ preventScroll: true }); }, 300);
    } else if (act === 'share') {
      var url = btn.getAttribute('data-url') || location.href.split('#')[0];
      if (navigator.share) navigator.share({ title: document.title, url: url }).catch(function () {});
      else (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () {
        var old = btn.getAttribute('aria-label'); btn.setAttribute('aria-label', 'Link copied'); btn.title = 'Link copied';
        setTimeout(function () { btn.setAttribute('aria-label', old); btn.title = ''; }, 1600);
      }, function () { prompt('Copy this link', url); });
    }
  });

  // composer
  function setReplyTo(n) { replyTo = n; toEl.textContent = n ? ' · post ' + n + '/' + nPosts : ''; }
  ta.addEventListener('input', function () {
    var L = ta.value.length; form.querySelector('[data-chars]').textContent = L + '/1000';
    pill.disabled = !ta.value.trim();
    ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 320) + 'px';
  });

  // replies list
  function paintReplyCounts() {
    document.querySelectorAll('.post .acts').forEach(function (a) {
      var n = +a.getAttribute('data-post'), el = a.querySelector('[data-rc]');
      if (el) el.textContent = fmtN(replyCounts[n] || 0);
    });
    var total = list.querySelectorAll('.x-reply').length;
    box.querySelector('[data-rtotal]').textContent = total ? '(' + total + ')' : '';
  }
  function replyEl(c, fresh) {
    var li = document.createElement('li'); li.className = 'x-reply' + (fresh ? ' fresh' : '');
    var av = document.createElement('div'); av.className = 'x-av'; av.setAttribute('aria-hidden', 'true'); av.textContent = initial(c.name); av.style.background = hue(c.name);
    var body = document.createElement('div');
    var head = document.createElement('div'); head.className = 'x-rhead';
    var nm = document.createElement('strong'); nm.textContent = c.name;
    var tm = document.createElement('span'); var t = document.createElement('time'); t.dateTime = c.created_at; t.textContent = ago(c.created_at); t.title = new Date(c.created_at).toLocaleString();
    tm.appendChild(document.createTextNode('· ')); tm.appendChild(t);
    head.appendChild(nm); head.appendChild(tm); body.appendChild(head);
    if (c.post_index) {
      var to = document.createElement('p'); to.className = 'x-rto';
      to.innerHTML = 'Replying to <a href="#post-' + (+c.post_index) + '">post ' + (+c.post_index) + '/' + nPosts + '</a>';
      body.appendChild(to);
    }
    var p = document.createElement('p'); p.className = 'x-rtext'; p.textContent = c.body; body.appendChild(p);
    var acts = document.createElement('div'); acts.className = 'acts'; acts.setAttribute('data-key', slug + '#r' + c.id); acts.setAttribute('data-post', c.post_index || '');
    acts.innerHTML = '<button class="act act-reply" type="button" data-act="reply" aria-label="Reply">' + REPLY_ICON + '<span data-rc></span></button>' +
      '<button class="act act-like" type="button" data-act="like" aria-pressed="false" aria-label="Like this reply">' + HEART_ICON + '<span data-lc></span></button>';
    body.appendChild(acts);
    li.appendChild(av); li.appendChild(body);
    return li;
  }
  api('travel_comments?select=id,name,body,created_at,post_index&thread_slug=eq.' + encodeURIComponent(slug) + '&order=created_at.desc&limit=300')
    .then(function (rows) {
      rows = rows || []; list.innerHTML = '';
      if (!rows.length) list.innerHTML = '<li class="muted x-empty">No replies yet. Be the first.</li>';
      rows.forEach(function (c) { list.appendChild(replyEl(c)); if (c.post_index) replyCounts[c.post_index] = (replyCounts[c.post_index] || 0) + 1; else replyCounts[1] = (replyCounts[1] || 0) + 1; });
      paintReplyCounts();
      var keys = []; for (var i = 1; i <= nPosts; i++) keys.push(slug + '#p' + i);
      rows.forEach(function (c) { keys.push(slug + '#r' + c.id); });
      return loadLikes(keys);
    })
    .catch(function () { list.innerHTML = '<li class="muted x-empty">Replies could not load right now.</li>'; });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (form.querySelector('[name=website]').value) return; // bots
    var body = ta.value.trim(); if (!body) return;
    pill.disabled = true; msg.className = 'c-msg'; msg.textContent = 'Posting…';
    var row = { thread_slug: slug, name: asName.slice(0, 60), body: body.slice(0, 1000) };
    if (replyTo) row.post_index = replyTo;
    api('travel_comments', { method: 'POST', headers: { Prefer: 'return=representation' }, body: row })
      .then(function (rows) {
        var empty = list.querySelector('.x-empty'); if (empty) empty.remove();
        (rows || []).forEach(function (c) {
          list.insertBefore(replyEl(c, true), list.firstChild);
          var n = c.post_index || 1; replyCounts[n] = (replyCounts[n] || 0) + 1;
          likeState[slug + '#r' + c.id] = { count: 0, liked: false };
        });
        paintReplyCounts();
        ta.value = ''; ta.style.height = ''; form.querySelector('[data-chars]').textContent = '0/1000';
        msg.className = 'c-msg ok'; msg.textContent = 'Your reply was sent.';
        setTimeout(function () { if (msg.textContent === 'Your reply was sent.') msg.textContent = ''; }, 3000);
      })
      .catch(function (err) { msg.className = 'c-msg err'; msg.textContent = /Too many/.test(err.message) ? err.message : 'Could not post. Please try again.'; pill.disabled = false; });
  });
  if (/^#post-\d+$/.test(location.hash)) { var tgt = document.querySelector(location.hash); if (tgt) tgt.classList.add('flash'); }
})();
