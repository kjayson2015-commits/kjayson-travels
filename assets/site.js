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
      replyToPost(+wrap.getAttribute('data-post') || null);
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

  // ---------- reply tree, edit, delete ----------
  var TOKENS_KEY = 'kjt-tokens';
  var tokens = {}; try { tokens = JSON.parse(store.get(TOKENS_KEY) || '{}') || {}; } catch (e) {}
  var saveToken = function (id, t) { tokens[id] = t; store.set(TOKENS_KEY, JSON.stringify(tokens)); };
  var byId = {};          // id -> reply data
  var homeSlot = document.createElement('div'); homeSlot.className = 'x-compose-home';
  form.parentNode.insertBefore(homeSlot, form); homeSlot.appendChild(form);
  var parentId = null;
  var cancelBtn = document.createElement('button'); cancelBtn.type = 'button'; cancelBtn.className = 'x-cancel'; cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', function () { resetComposer(); });
  form.querySelector('.x-right').insertBefore(cancelBtn, form.querySelector('.x-right').firstChild);

  function setReplyTo(n) { replyTo = n; }
  function resetComposer() {
    parentId = null; setReplyTo(null); homeSlot.appendChild(form); form.classList.remove('nested');
    toEl.textContent = ''; form.querySelector('.x-replying').firstChild.textContent = 'Replying to ';
    form.querySelector('.x-replying a').hidden = false; cancelBtn.hidden = true;
  }
  function replyToPost(n) {
    resetComposer(); setReplyTo(n || null); toEl.textContent = n ? ' · post ' + n + '/' + nPosts : '';
  }
  function replyToReply(id) {
    var r = byId[id]; if (!r) return;
    parentId = id; setReplyTo(r.post_index || null);
    var li = document.getElementById('reply-' + id); var slot = li.querySelector(':scope > .x-rbody > .x-slot');
    slot.appendChild(form); form.classList.add('nested'); cancelBtn.hidden = false;
    form.querySelector('.x-replying').firstChild.textContent = 'Replying to ';
    form.querySelector('.x-replying a').hidden = true; toEl.textContent = r.deleted ? 'a deleted reply' : r.name;
  }
  cancelBtn.hidden = true;

  ta.addEventListener('input', function () {
    var L = ta.value.length; form.querySelector('[data-chars]').textContent = L + '/1000';
    pill.disabled = !ta.value.trim();
    ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 320) + 'px';
  });

  function canManage(r) { return !r.deleted && (!!tokens[r.id] || !!r.mine || !!window.KJT_OWNER); }
  function countTree(id) { var n = 0; (byId[id].kids || []).forEach(function (k) { n += 1 + countTree(k); }); return n; }
  function paintReplyCounts() {
    var perPost = {};
    Object.keys(byId).forEach(function (id) { var r = byId[id]; if (!r.deleted) { var n = r.post_index || 1; perPost[n] = (perPost[n] || 0) + 1; } });
    document.querySelectorAll('.post .acts').forEach(function (a) {
      var n = +a.getAttribute('data-post'), el = a.querySelector('[data-rc]'); if (el) el.textContent = fmtN(perPost[n] || 0);
    });
    Object.keys(byId).forEach(function (id) {
      var li = document.getElementById('reply-' + id); if (!li) return;
      var el = li.querySelector(':scope > .x-rbody > .acts [data-rc]'); if (el) el.textContent = fmtN((byId[id].kids || []).length);
    });
    var total = Object.keys(byId).filter(function (id) { return !byId[id].deleted; }).length;
    box.querySelector('[data-rtotal]').textContent = total ? '(' + total + ')' : '';
    if (!list.querySelector('.x-reply')) list.innerHTML = '<li class="muted x-empty">No replies yet. Be the first.</li>';
  }

  function avatarEl(r) {
    var av = document.createElement('div'); av.className = 'x-av'; av.setAttribute('aria-hidden', 'true');
    if (r.deleted) { av.className += ' gone'; av.textContent = ''; return av; }
    if (r.avatar_url) { var img = document.createElement('img'); img.src = r.avatar_url; img.alt = ''; img.referrerPolicy = 'no-referrer'; img.loading = 'lazy'; av.appendChild(img); av.style.background = 'transparent'; }
    else { av.textContent = initial(r.name); av.style.background = hue(r.name); }
    return av;
  }
  function replyEl(r, fresh) {
    var li = document.createElement('li'); li.className = 'x-reply' + (fresh ? ' fresh' : '') + (r.deleted ? ' is-gone' : ''); li.id = 'reply-' + r.id;
    li.appendChild(avatarEl(r));
    var body = document.createElement('div'); body.className = 'x-rbody';
    var head = document.createElement('div'); head.className = 'x-rhead';
    if (r.deleted) {
      var gone = document.createElement('em'); gone.className = 'muted'; gone.textContent = 'This reply was deleted'; head.appendChild(gone);
      body.appendChild(head);
    } else {
      var nm = document.createElement('strong'); nm.textContent = r.name; head.appendChild(nm);
      if (r.verified) { var vb = document.createElement('span'); vb.className = 'x-verified'; vb.title = 'Signed in with Google'; vb.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2l2.4 2.1 3.1-.4 1 3 2.8 1.5-.9 3 1.4 2.8-2.5 1.9-.2 3.2-3.1.4L14.4 22 12 20.3 9.6 22l-1.6-2.5-3.1-.4-.2-3.2L2.2 14l1.4-2.8-.9-3 2.8-1.5 1-3 3.1.4z"/><path d="M8 12.3l2.6 2.6L16.2 9" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="sr">Signed in with Google</span>'; head.appendChild(vb); }
      var tm = document.createElement('span'); var t = document.createElement('time'); t.dateTime = r.created_at; t.textContent = ago(r.created_at); t.title = new Date(r.created_at).toLocaleString();
      tm.appendChild(document.createTextNode('· ')); tm.appendChild(t);
      if (r.edited_at) { var ed = document.createElement('span'); ed.className = 'x-edited'; ed.textContent = ' · Edited'; tm.appendChild(ed); }
      head.appendChild(tm);
      if (canManage(r)) {
        var mb = document.createElement('button'); mb.type = 'button'; mb.className = 'x-more'; mb.setAttribute('aria-label', 'Reply options'); mb.setAttribute('aria-haspopup', 'menu'); mb.setAttribute('aria-expanded', 'false');
        mb.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>';
        var menu = document.createElement('div'); menu.className = 'x-menu'; menu.setAttribute('role', 'menu'); menu.hidden = true;
        var own = !!tokens[r.id] || !!r.mine;
        menu.innerHTML = (own ? '<button type="button" role="menuitem" data-m="edit"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>Edit</button>' : '') +
          '<button type="button" role="menuitem" data-m="delete" class="danger"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>Delete</button>';
        var wrapM = document.createElement('span'); wrapM.className = 'x-more-wrap'; wrapM.appendChild(mb); wrapM.appendChild(menu);
        head.appendChild(wrapM);
      }
      body.appendChild(head);
      var parent = r.parent_id && byId[r.parent_id];
      if (!r.parent_id && r.post_index) {
        var to = document.createElement('p'); to.className = 'x-rto';
        to.innerHTML = 'Replying to <a href="#post-' + (+r.post_index) + '">post ' + (+r.post_index) + '/' + nPosts + '</a>'; body.appendChild(to);
      } else if (parent && !parent.deleted) {
        var to2 = document.createElement('p'); to2.className = 'x-rto'; to2.appendChild(document.createTextNode('Replying to '));
        var a = document.createElement('a'); a.href = '#reply-' + parent.id; a.textContent = parent.name; to2.appendChild(a); body.appendChild(to2);
      }
      var p = document.createElement('p'); p.className = 'x-rtext'; p.textContent = r.body; body.appendChild(p);
      var acts = document.createElement('div'); acts.className = 'acts'; acts.setAttribute('data-key', slug + '#r' + r.id); acts.setAttribute('data-reply', r.id);
      acts.innerHTML = '<button class="act act-reply" type="button" data-act="replyto" aria-label="Reply to ' + r.name.replace(/"/g, '') + '">' + REPLY_ICON + '<span data-rc></span></button>' +
        '<button class="act act-like" type="button" data-act="like" aria-pressed="false" aria-label="Like this reply">' + HEART_ICON + '<span data-lc></span></button>';
      body.appendChild(acts);
    }
    var slot = document.createElement('div'); slot.className = 'x-slot'; body.appendChild(slot);
    var kids = document.createElement('ol'); kids.className = 'x-kids'; body.appendChild(kids);
    li.appendChild(body);
    return li;
  }
  function render() {
    list.innerHTML = '';
    var roots = [];
    Object.keys(byId).forEach(function (id) { byId[id].kids = []; });
    Object.keys(byId).map(Number).sort(function (a, b) { return a - b; }).forEach(function (id) {
      var r = byId[id]; if (r.parent_id && byId[r.parent_id]) byId[r.parent_id].kids.push(id); else roots.push(id);
    });
    var visible = function (id) { var r = byId[id]; return !r.deleted || r.kids.some(visible); };
    var build = function (id, depth) {
      var li = replyEl(byId[id]);
      var kidsOl = li.querySelector(':scope > .x-rbody > .x-kids');
      byId[id].kids.filter(visible).forEach(function (k) {
        var child = build(k, depth + 1);
        if (depth >= 3) li.parentNode ? li.parentNode.appendChild(child) : kidsOl.appendChild(child); else kidsOl.appendChild(child);
      });
      return li;
    };
    roots.filter(visible).reverse().forEach(function (id) { list.appendChild(build(id, 1)); });
    paintReplyCounts();
    document.querySelectorAll('.x-reply .act-like').forEach(paintLike);
  }

  api('rpc/travel_list_replies', { method: 'POST', body: { p_slug: slug } })
    .then(function (rows) {
      (rows || []).forEach(function (r) { byId[r.id] = r; });
      render();
      var keys = []; for (var i = 1; i <= nPosts; i++) keys.push(slug + '#p' + i);
      Object.keys(byId).forEach(function (id) { keys.push(slug + '#r' + id); });
      return loadLikes(keys);
    })
    .then(function () { if (/^#reply-\d+$/.test(location.hash)) { var el = document.querySelector(location.hash); if (el) { el.classList.add('fresh'); el.scrollIntoView({ block: 'center' }); } } })
    .catch(function () { list.innerHTML = '<li class="muted x-empty">Replies could not load right now.</li>'; });

  // reply buttons on replies, menus, edit, delete
  box.addEventListener('click', function (e) {
    var t = e.target;
    var rt = t.closest('[data-act=replyto]');
    if (rt) { e.stopPropagation(); replyToReply(+rt.closest('[data-reply]').getAttribute('data-reply')); setTimeout(function () { ta.focus(); }, 50); return; }
    var mb = t.closest('.x-more');
    if (mb) { var m = mb.nextElementSibling, open = m.hidden; closeMenus(); m.hidden = !open; mb.setAttribute('aria-expanded', open ? 'true' : 'false'); if (open) m.querySelector('button').focus(); return; }
    var mi = t.closest('[data-m]');
    if (mi) { var li = mi.closest('.x-reply'), id = +li.id.replace('reply-', ''); closeMenus(); if (mi.getAttribute('data-m') === 'edit') startEdit(id); else askDelete(id); return; }
    if (!t.closest('.x-menu')) closeMenus();
  }, true);
  document.addEventListener('click', function (e) { if (!e.target.closest('.x-more-wrap')) closeMenus(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenus(); });
  function closeMenus() { box.querySelectorAll('.x-menu').forEach(function (m) { m.hidden = true; }); box.querySelectorAll('.x-more').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); }); }

  function startEdit(id) {
    var li = document.getElementById('reply-' + id), body = li.querySelector(':scope > .x-rbody'), p = body.querySelector(':scope > .x-rtext');
    if (!p || body.querySelector(':scope > .x-editbox')) return;
    var boxE = document.createElement('div'); boxE.className = 'x-editbox';
    var eta = document.createElement('textarea'); eta.value = byId[id].body; eta.maxLength = 1000; eta.rows = 3; eta.setAttribute('aria-label', 'Edit your reply');
    var row = document.createElement('div'); row.className = 'x-editbar';
    var cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'x-cancel'; cancel.textContent = 'Cancel';
    var save = document.createElement('button'); save.type = 'button'; save.className = 'x-pill'; save.textContent = 'Save';
    var em = document.createElement('span'); em.className = 'c-msg';
    row.appendChild(em); row.appendChild(cancel); row.appendChild(save); boxE.appendChild(eta); boxE.appendChild(row);
    p.hidden = true; p.after(boxE); eta.focus(); eta.setSelectionRange(eta.value.length, eta.value.length);
    cancel.addEventListener('click', function () { boxE.remove(); p.hidden = false; });
    save.addEventListener('click', function () {
      var v = eta.value.trim(); if (!v) { em.className = 'c-msg err'; em.textContent = 'Write something first.'; return; }
      save.disabled = true; em.className = 'c-msg'; em.textContent = 'Saving…';
      api('rpc/travel_edit_reply', { method: 'POST', body: { p_id: id, p_token: tokens[id] || null, p_body: v } }).then(function (res) {
        byId[id].body = res.body; byId[id].edited_at = res.edited_at; p.textContent = res.body; boxE.remove(); p.hidden = false;
        var head = body.querySelector(':scope > .x-rhead > span:not(.x-more-wrap):not(.x-verified)');
        if (head && !head.querySelector('.x-edited')) { var ed = document.createElement('span'); ed.className = 'x-edited'; ed.textContent = ' · Edited'; head.appendChild(ed); }
      }).catch(function (err) { save.disabled = false; em.className = 'c-msg err'; em.textContent = err.message || 'Could not save.'; });
    });
  }
  function askDelete(id) {
    var li = document.getElementById('reply-' + id), body = li.querySelector(':scope > .x-rbody');
    if (body.querySelector(':scope > .x-confirm')) return;
    var c = document.createElement('div'); c.className = 'x-confirm'; c.setAttribute('role', 'alertdialog'); c.setAttribute('aria-label', 'Delete reply?');
    c.innerHTML = '<strong>Delete reply?</strong><span class="muted">This can’t be undone.</span><span class="x-editbar"><button type="button" class="x-cancel" data-no>Cancel</button><button type="button" class="x-pill danger" data-yes>Delete</button></span>';
    body.querySelector(':scope > .acts').after(c); c.querySelector('[data-yes]').focus();
    c.querySelector('[data-no]').addEventListener('click', function () { c.remove(); });
    c.querySelector('[data-yes]').addEventListener('click', function () {
      var yes = c.querySelector('[data-yes]'); yes.disabled = true; yes.textContent = 'Deleting…';
      api('rpc/travel_delete_reply', { method: 'POST', body: { p_id: id, p_token: tokens[id] || null } }).then(function (res) {
        if (form.closest('#reply-' + id)) resetComposer();
        if (res.soft) { byId[id].deleted = true; byId[id].body = ''; byId[id].name = ''; } else { delete byId[id]; }
        delete tokens[id]; store.set(TOKENS_KEY, JSON.stringify(tokens));
        render();
      }).catch(function (err) { yes.disabled = false; yes.textContent = 'Delete'; c.querySelector('.muted').textContent = err.message || 'Could not delete.'; });
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (form.querySelector('[name=website]').value) return; // bots
    var body = ta.value.trim(); if (!body) return;
    pill.disabled = true; msg.className = 'c-msg'; msg.textContent = 'Posting…';
    api('rpc/travel_add_reply', { method: 'POST', body: { p_slug: slug, p_name: asName, p_body: body, p_post_index: parentId ? null : replyTo, p_parent_id: parentId } })
      .then(function (r) {
        saveToken(r.id, r.edit_token); delete r.edit_token;
        byId[r.id] = r; likeState[slug + '#r' + r.id] = { count: 0, liked: false };
        var target = parentId; resetComposer(); render();
        var el = document.getElementById('reply-' + r.id); if (el) { el.classList.add('fresh'); if (target) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        ta.value = ''; ta.style.height = ''; form.querySelector('[data-chars]').textContent = '0/1000';
        msg.className = 'c-msg ok'; msg.textContent = 'Your reply was sent.';
        setTimeout(function () { if (msg.textContent === 'Your reply was sent.') msg.textContent = ''; }, 3000);
      })
      .catch(function (err) { msg.className = 'c-msg err'; msg.textContent = /Too many|can.t reply|no longer/i.test(err.message) ? err.message : 'Could not post. Please try again.'; pill.disabled = false; });
  });
  if (/^#post-\d+$/.test(location.hash)) { var tgt = document.querySelector(location.hash); if (tgt) tgt.classList.add('flash'); }
})();
