#!/usr/bin/env node
// KJayson Travels — static site builder. No dependencies.
// Reads site.config.json + content/threads/*.json, writes the finished site to _site/.
// Usage: node scripts/build.mjs            (published threads only)
//        node scripts/build.mjs --drafts   (local preview, includes drafts)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '_site');
const WITH_DRAFTS = process.argv.includes('--drafts');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
const A = cfg.author;

const LOCAL = process.argv.includes('--local');      // preview on http://localhost:3000/
const site = new URL(LOCAL ? 'http://localhost:3000/' : cfg.siteUrl.replace(/\/?$/, '/'));
const BASE = site.pathname.replace(/\/$/, '');      // '' on a custom domain, '/kjayson-travels' on GitHub Pages
const ORIGIN = site.origin;
const u = (p) => BASE + p;                          // site-relative link
const abs = (p) => ORIGIN + BASE + p;               // full URL for canonical, sitemap, social cards
const NOW = new Date().toISOString();

// ---------- helpers ----------
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slugify = (s = '') => String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const clip = (s = '', n = 155) => { s = String(s).replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const cut = s.slice(0, n - 1); return cut.slice(0, cut.lastIndexOf(' ') > 60 ? cut.lastIndexOf(' ') : cut.length).replace(/[,.;:\s]+$/, '') + '…'; };
const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
const fmtDate = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const isoDate = (d) => new Date(d + 'T12:00:00Z').toISOString();
const write = (rel, content) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, content); };
const copyDir = (from, to) => { if (!fs.existsSync(from)) return; fs.cpSync(from, to, { recursive: true }); };

function textToHtml(text = '') {
  return String(text).trim().split(/\n{2,}/).map((para) => {
    let h = esc(para).replace(/\n/g, '<br>');
    h = h.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, (m) => `<a href="${m}" rel="nofollow noopener">${m.replace(/^https?:\/\//, '')}</a>`);
    h = h.replace(/(^|[\s(])@([A-Za-z0-9_]{1,15})\b/g, '$1<a href="https://x.com/$2" rel="nofollow noopener">@$2</a>');
    return `<p>${h}</p>`;
  }).join('');
}
const plain = (t = '') => String(t).replace(/\s+/g, ' ').trim();

// ---------- load threads ----------
const DIR = path.join(ROOT, 'content', 'threads');
const problems = [];
let threads = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => {
  let t;
  try { t = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); } catch (e) { problems.push(`${f}: not valid JSON (${e.message})`); return null; }
  t.slug = slugify(t.slug || t.title || f.replace(/\.json$/, ''));
  if (!t.title || !t.date || !Array.isArray(t.posts) || !t.posts.length) { problems.push(`${f}: needs title, date and at least one post`); return null; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t.date)) { problems.push(`${f}: date must look like 2026-10-18`); return null; }
  t.posts = t.posts.filter((p) => p && (plain(p.text) || p.image));
  t.posts.forEach((p, i) => { if (p.image && !plain(p.image.alt)) problems.push(`${f}: post ${i + 1} photo has no alt text (hurts SEO)`); });
  t.place = plain(t.place || 'Somewhere');
  t.placeSlug = slugify(t.place);
  t.updated = t.updated || t.date;
  t.tags = (t.tags || []).map(plain).filter(Boolean);
  t.url = `/threads/${t.slug}/`;
  t.cover = (t.posts.find((p) => p.image) || {}).image || null;
  t.summaryText = plain(t.summary) || clip(t.posts.map((p) => plain(p.text)).join(' '), 155);
  t.words = t.posts.map((p) => plain(p.text)).join(' ').split(' ').filter(Boolean).length;
  return t;
}).filter(Boolean) : [];
threads = threads.filter((t) => WITH_DRAFTS || !t.draft).sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));

const places = new Map();
for (const t of threads) {
  if (!places.has(t.placeSlug)) places.set(t.placeSlug, { name: t.place, slug: t.placeSlug, country: t.country || '', region: t.region || '', threads: [] });
  places.get(t.placeSlug).threads.push(t);
}
// route strip: places in the order they were first visited
const route = [...places.values()].sort((a, b) => a.threads[a.threads.length - 1].date.localeCompare(b.threads[b.threads.length - 1].date));

// ---------- shared pieces ----------
const CSS = fs.readFileSync(path.join(ROOT, 'assets', 'site.css'), 'utf8').replace(/\n/g, '');
const FONTS = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,700;1,9..144,500&family=Work+Sans:wght@400;600&display=swap';
const sameAs = [A.x, A.facebook, A.website].filter(Boolean);
const CONTACT = cfg.contact || { phones: [], email: '' };
const NOTICE = cfg.notice || 'Not a travel agent';
const phoneE164 = (n) => '+' + String(n).replace(/\D/g, '');
const phonePretty = (n) => { const d = String(n).replace(/\D/g, ''); return d.startsWith('254') && d.length === 12 ? `+254 ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}` : '+' + d; };
const SB = cfg.supabase || {};
const HOST = site.hostname;
const PERSON = { '@type': 'Person', '@id': abs('/about/#person'), name: A.name, alternateName: A.handle, url: abs('/about/'), image: abs('/assets/avatar.webp'), description: A.bio, sameAs, ...(CONTACT.email ? { email: 'mailto:' + CONTACT.email } : {}), ...(CONTACT.phones.length ? { telephone: phoneE164(CONTACT.phones[0]), contactPoint: CONTACT.phones.map((ph) => ({ '@type': 'ContactPoint', telephone: phoneE164(ph), contactType: 'customer support', ...(CONTACT.email ? { email: CONTACT.email } : {}), availableLanguage: ['English', 'Swahili'] })) } : {}) };
const WEBSITE = { '@type': 'WebSite', '@id': abs('/#website'), url: abs('/'), name: cfg.siteName, description: cfg.description, inLanguage: cfg.language, publisher: { '@id': PERSON['@id'] } };
const DEFAULT_OG = abs('/assets/og-default.png');
const imgUrl = (src) => /^https?:/.test(src) ? src : u('/' + src.replace(/^\//, ''));
const imgAbs = (src) => /^https?:/.test(src) ? src : abs('/' + src.replace(/^\//, ''));

function page({ title, description, pathName, type = 'website', image, imageAlt, jsonld = [], body, nav = '', noindex = false, article = null, track = true, extraScript = '' }) {
  const canonical = abs(pathName);
  const ogImg = image || DEFAULT_OG;
  return `<!doctype html>
<html lang="${esc(cfg.language)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex, follow">' : '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">'}
<link rel="canonical" href="${canonical}">
<meta name="author" content="${esc(A.name)}">
<meta name="theme-color" content="#F1ECE2">
<meta name="color-scheme" content="light dark">
<script>try{var t=localStorage.getItem('kjt-theme');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme',t)}catch(e){}</script>
${cfg.googleSiteVerification ? `<meta name="google-site-verification" content="${esc(cfg.googleSiteVerification)}">` : ''}
<meta property="og:site_name" content="${esc(cfg.siteName)}">
<meta property="og:locale" content="en_GB">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${esc(ogImg)}">
<meta property="og:image:alt" content="${esc(imageAlt || cfg.siteName)}">
${article ? `<meta property="article:published_time" content="${article.published}">
<meta property="article:modified_time" content="${article.modified}">
<meta property="article:author" content="${abs('/about/')}">
<meta property="article:section" content="${esc(article.section)}">
${article.tags.map((t) => `<meta property="article:tag" content="${esc(t)}">`).join('\n')}` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="${esc(A.handle)}">
<meta name="twitter:creator" content="${esc(A.handle)}">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(ogImg)}">
<link rel="icon" href="${u('/assets/favicon.svg')}" type="image/svg+xml">
<link rel="apple-touch-icon" href="${u('/assets/apple-touch-icon.png')}">
<link rel="manifest" href="${u('/site.webmanifest')}">
<link rel="alternate" type="application/rss+xml" title="${esc(cfg.siteName)}" href="${u('/feed.xml')}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<style>${CSS}</style>
${jsonld.length ? ld({ '@context': 'https://schema.org', '@graph': jsonld }) : ''}
<script>window.KJT=${JSON.stringify({ host: HOST, track, sb: { url: SB.url, key: SB.publishableKey } }).replace(/</g, '\\u003c')}</script>
<script src="${u('/assets/site.js')}" defer></script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="top"><div class="wrap">
<a class="logo" href="${u('/')}"><img src="${u('/assets/avatar.webp')}" alt="" width="36" height="36">${esc(cfg.siteName)}</a>
<div class="top-actions">
<nav class="nav" aria-label="Main">
<a href="${u('/')}"${nav === 'home' ? ' aria-current="page"' : ''}>Threads</a>
<a href="${u('/places/')}"${nav === 'places' ? ' aria-current="page"' : ''}>Places</a>
<a href="${u('/about/')}"${nav === 'about' ? ' aria-current="page"' : ''}>About</a>
<a href="${u('/contact/')}"${nav === 'contact' ? ' aria-current="page"' : ''}>Contact</a>
</nav>
<button class="theme-btn" id="themeBtn" type="button" aria-label="Switch theme"><svg class="moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg><svg class="sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg></button>
</div>
</div></header>
<main id="main">
${body}
</main>
<footer class="foot"><div class="wrap">
<div><em>Written on the road by ${esc(A.name)}</em><br><span class="notice">${esc(NOTICE)}</span></div>
<nav aria-label="Follow">
${A.x ? `<a href="${esc(A.x)}" rel="me noopener">X ${esc(A.handle)}</a>` : ''}
${A.facebook ? `<a href="${esc(A.facebook)}" rel="me noopener">Facebook</a>` : ''}
${A.website ? `<a href="${esc(A.website)}" rel="me noopener">Photos</a>` : ''}
<a href="${u('/contact/')}">Contact</a>
<a href="${u('/feed.xml')}">RSS</a>
</nav>
</div></footer>
${extraScript}
</body>
</html>
`;
}

function figure(img, { eager = false, caption = '' } = {}) {
  if (!img || !img.src) return '';
  const w = img.width || 1600, h = img.height || 1067;
  const srcset = img.src800 ? ` srcset="${imgUrl(img.src800)} 800w, ${imgUrl(img.src)} ${w}w" sizes="(max-width: 700px) 92vw, 620px"` : '';
  return `<figure class="polaroid" style="--ar:${w}/${h}"><img src="${imgUrl(img.src)}"${srcset} width="${w}" height="${h}" alt="${esc(img.alt || '')}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">${caption || img.caption ? `<figcaption>${esc(caption || img.caption)}</figcaption>` : ''}</figure>`;
}

function stamp(t, ink = false) {
  const line2 = t.region || t.country || '';
  return `<a class="stamp${ink ? ' ink' : ''}" href="${u(`/places/${t.placeSlug}/`)}" aria-label="More threads from ${esc(t.place)}">${esc(t.place)}${line2 ? `<br>${esc(line2)}` : ''}<br>${esc(new Date(t.date + 'T12:00:00Z').toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }))}</a>`;
}

function postsHtml(t, { limit = Infinity, headingLevel = 'h1' } = {}) {
  const n = t.posts.length;
  return `<ol class="thread">${t.posts.slice(0, limit).map((p, i) => `
<li class="post" id="post-${i + 1}">
<div class="rail"><img src="${u('/assets/avatar.webp')}" alt="" width="48" height="48" loading="lazy"><span></span></div>
<div class="body">
<div class="who"><strong>${esc(A.shortName || A.name)}</strong><a href="${esc(A.x || '#')}" rel="noopener">${esc(A.handle)}</a><span>· <a href="#post-${i + 1}" aria-label="Post ${i + 1} of ${n}">${i + 1}/${n}</a></span></div>
${plain(p.text) ? `<div class="text">${textToHtml(p.text)}</div>` : ''}
${figure(p.image, { eager: i === 0 && headingLevel === 'h1' })}
</div>
</li>`).join('')}</ol>`;
}

function entryHtml(t, i) {
  const photos = t.posts.filter((p) => p.image).slice(0, 3);
  const showThread = i === 0;
  return `<article class="entry">
<div class="entry-side">${stamp(t, i % 2 === 1)}<p class="kicker">${t.posts.length} posts · ${Math.max(1, Math.round(t.words / 200))} min read</p></div>
<div class="entry-main">
<h2><a href="${u(t.url)}">${esc(t.title)}</a></h2>
${showThread ? postsHtml(t, { limit: 3, headingLevel: 'h2' }) : `<p class="summary">${esc(t.summaryText)}</p>${photos.length ? `<div class="strip">${photos.map((p) => figure(p.image)).join('')}</div>` : ''}`}
<a class="more" href="${u(t.url)}">${showThread && t.posts.length > 3 ? `Continue the thread · ${t.posts.length - 3} more` : 'Read the thread'}<span class="skip"> — ${esc(t.title)}</span></a>
</div>
</article>`;
}

function card(t) {
  return `<a class="card" href="${u(t.url)}">${t.cover ? `<img src="${imgUrl(t.cover.src800 || t.cover.src)}" alt="${esc(t.cover.alt || '')}" width="800" height="533" loading="lazy" decoding="async">` : `<span class="ph" aria-hidden="true">${esc(t.place)}</span>`}<strong>${esc(t.title)}</strong><small>${esc(t.place)} · ${fmtDate(t.date)}</small></a>`;
}

// ---------- build ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
copyDir(path.join(ROOT, 'assets'), path.join(OUT, 'assets'));
copyDir(path.join(ROOT, 'images'), path.join(OUT, 'images'));
fs.rmSync(path.join(OUT, 'assets', 'site.css'), { force: true });
write('.nojekyll', '');

// Home
const homeList = { '@type': 'ItemList', itemListElement: threads.map((t, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(t.url), name: t.title })) };
write('index.html', page({
  title: `${cfg.siteName} · Travel threads by ${A.name}`,
  description: cfg.description,
  pathName: '/',
  nav: 'home',
  jsonld: [WEBSITE, PERSON, { '@type': 'CollectionPage', '@id': abs('/#page'), url: abs('/'), name: cfg.siteName, isPartOf: { '@id': WEBSITE['@id'] }, about: { '@id': PERSON['@id'] }, mainEntity: homeList }],
  body: `<section class="mast"><div class="wrap"><h1>${esc(cfg.siteName)}</h1><p>${esc(cfg.tagline)} By ${esc(A.name)}. We see details for you.</p><span class="notice">${esc(NOTICE)}</span></div></section>
${route.length ? `<nav class="route wrap" aria-label="The route so far">${route.map((p, i) => `${i ? '<svg width="36" height="12" viewBox="0 0 40 12" fill="none" stroke="#A8441F" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M1 6h36" stroke-dasharray="3 4"/><path d="M33 2l4 4-4 4"/></svg>' : ''}<a href="${u(`/places/${p.slug}/`)}">${esc(p.name)}</a>`).join('')}<svg width="36" height="12" viewBox="0 0 40 12" fill="none" stroke="#A8441F" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M1 6h36" stroke-dasharray="3 4"/><path d="M33 2l4 4-4 4"/></svg><span class="next">next stop…</span></nav>` : ''}
<div class="wrap">${threads.length ? `<div class="entries">${threads.map(entryHtml).join('')}</div>` : `<div class="empty"><h2>The first thread is on its way.</h2><p>Follow <a href="${esc(A.x)}">${esc(A.handle)}</a> to catch it first.</p></div>`}</div>`,
}));

// Thread pages
for (const t of threads) {
  const idx = threads.indexOf(t);
  const related = [...threads.filter((x) => x !== t && x.placeSlug === t.placeSlug), ...threads.filter((x) => x !== t && x.placeSlug !== t.placeSlug)].slice(0, 3);
  const titleTag = [`${t.title} · ${t.place} | ${cfg.siteName}`, `${t.title} | ${cfg.siteName}`].find((x) => x.length <= 68) || t.title;
  const images = t.posts.filter((p) => p.image).map((p) => imgAbs(p.image.src));
  const ogImage = t.ogImage ? imgAbs(t.ogImage) : (t.cover ? imgAbs(t.cover.src) : null);
  const placeLd = { '@type': 'Place', name: t.place, ...(t.country || t.region ? { address: { '@type': 'PostalAddress', ...(t.region ? { addressRegion: t.region } : {}), ...(t.country ? { addressCountry: t.country } : {}) } } : {}) };
  const shareText = encodeURIComponent(`${t.title} 🧵`);
  const shareUrl = encodeURIComponent(abs(t.url));
  write(`threads/${t.slug}/index.html`, page({
    title: titleTag,
    description: clip(t.summaryText, 158),
    pathName: t.url,
    type: 'article',
    image: ogImage,
    imageAlt: t.cover ? t.cover.alt : t.title,
    article: { published: isoDate(t.date), modified: isoDate(t.updated), section: t.place, tags: t.tags },
    jsonld: [WEBSITE, PERSON,
      { '@type': 'BlogPosting', '@id': abs(t.url + '#thread'), mainEntityOfPage: abs(t.url), headline: t.title.slice(0, 110), description: t.summaryText, datePublished: isoDate(t.date), dateModified: isoDate(t.updated), inLanguage: cfg.language, author: { '@id': PERSON['@id'] }, publisher: { '@id': PERSON['@id'] }, isPartOf: { '@id': WEBSITE['@id'] }, image: images.length ? images : [DEFAULT_OG], wordCount: t.words, keywords: [t.place, t.region, t.country, ...t.tags].filter(Boolean).join(', '), contentLocation: placeLd, about: placeLd, articleSection: t.place },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Threads', item: abs('/') },
        { '@type': 'ListItem', position: 2, name: t.place, item: abs(`/places/${t.placeSlug}/`) },
        { '@type': 'ListItem', position: 3, name: t.title, item: abs(t.url) }] }],
    body: `<div class="narrow">
<nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="${u('/')}">Threads</a></li><li><a href="${u(`/places/${t.placeSlug}/`)}">${esc(t.place)}</a></li><li aria-current="page">${esc(t.title)}</li></ol></nav>
<article>
<header class="t-head">${stamp(t)}<div class="t-head-main"><p class="kicker">Thread · ${t.posts.length} posts</p><h1>${esc(t.title)}</h1>
<div class="byline"><img src="${u('/assets/avatar.webp')}" alt="" width="28" height="28"><a href="${u('/about/')}" rel="author">${esc(A.name)}</a><time datetime="${t.date}">${fmtDate(t.date)}</time>${t.updated !== t.date ? `<span>Updated <time datetime="${t.updated}">${fmtDate(t.updated)}</time></span>` : ''}<span>${Math.max(1, Math.round(t.words / 200))} min read</span></div></div></header>
${postsHtml(t)}
${t.tags.length ? `<ul class="tags" aria-label="Topics">${t.tags.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
<div class="react"><button class="btn like-btn" id="likeBtn" type="button" data-slug="${esc(t.slug)}" aria-pressed="false" aria-label="Like this thread"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1l8.8 8.8 8.8-8.8a5 5 0 0 0 0-7.1z"/></svg><span data-count>0</span><span>Like</span></button><a class="btn" href="#comments">Comment</a></div>
<div class="share"><span>Share this thread</span>
<a class="btn solid" href="https://x.com/intent/post?text=${shareText}&url=${shareUrl}&via=${encodeURIComponent((A.handle || '').replace('@', ''))}" rel="noopener" target="_blank">Post on X</a>
<a class="btn" href="https://wa.me/?text=${shareText}%20${shareUrl}" rel="noopener" target="_blank">WhatsApp</a>
<a class="btn" href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" rel="noopener" target="_blank">Facebook</a>
<button class="btn" type="button" data-copy="${abs(t.url)}">Copy link</button>
</div>
</article>
<section class="comments" id="comments" data-slug="${esc(t.slug)}" aria-labelledby="c-title"><h2 id="c-title">Comments <span class="muted" data-ccount></span></h2>
<ol class="c-list" aria-live="polite"><li class="muted">Loading comments…</li></ol>
<form class="c-form" novalidate><div><label for="c-name">Your name</label><input id="c-name" name="name" type="text" maxlength="60" autocomplete="name" required></div>
<div><label for="c-body">Comment</label><textarea id="c-body" name="body" rows="4" maxlength="1000" required></textarea></div>
<div class="hp" aria-hidden="true"><label for="c-web">Website</label><input id="c-web" name="website" type="text" tabindex="-1" autocomplete="off"></div>
<div class="row" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center"><button class="btn solid" type="submit">Post comment</button><span class="c-msg" role="status"></span></div></form></section>
${related.length ? `<h2 class="section-title">More threads</h2><div class="cards">${related.map(card).join('')}</div>` : ''}
${idx < threads.length - 1 ? `<p><a class="more" href="${u(threads[idx + 1].url)}" rel="prev">← Older: ${esc(threads[idx + 1].title)}</a></p>` : ''}
${idx > 0 ? `<p><a class="more" href="${u(threads[idx - 1].url)}" rel="next">Newer: ${esc(threads[idx - 1].title)} →</a></p>` : ''}
</div>
<script>document.querySelectorAll('[data-copy]').forEach(function(b){b.addEventListener('click',function(){var l=b.getAttribute('data-copy');if(navigator.share){navigator.share({title:document.title,url:l}).catch(function(){});return;}(navigator.clipboard?navigator.clipboard.writeText(l):Promise.reject()).then(function(){b.textContent='Link copied';},function(){prompt('Copy this link',l);});});});</script>`,
  }));
}

// Place pages
for (const p of places.values()) {
  const where = [p.region, p.country].filter(Boolean).join(', ');
  write(`places/${p.slug}/index.html`, page({
    title: `${p.name} travel threads${where ? ` · ${where}` : ''} | ${cfg.siteName}`,
    description: clip(`Things to see, eat and do in ${p.name}${where ? `, ${where}` : ''}, told in ${p.threads.length} travel thread${p.threads.length > 1 ? 's' : ''} by ${A.name}, with real photos and honest tips.`, 158),
    pathName: `/places/${p.slug}/`,
    nav: 'places',
    image: p.threads[0].cover ? imgAbs(p.threads[0].cover.src) : null,
    jsonld: [WEBSITE, PERSON,
      { '@type': 'CollectionPage', url: abs(`/places/${p.slug}/`), name: `${p.name} travel threads`, isPartOf: { '@id': WEBSITE['@id'] }, about: { '@type': 'Place', name: p.name, ...(p.country ? { address: { '@type': 'PostalAddress', addressCountry: p.country, ...(p.region ? { addressRegion: p.region } : {}) } } : {}) }, mainEntity: { '@type': 'ItemList', itemListElement: p.threads.map((t, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(t.url), name: t.title })) } },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Places', item: abs('/places/') }, { '@type': 'ListItem', position: 2, name: p.name, item: abs(`/places/${p.slug}/`) }] }],
    body: `<div class="wrap"><nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="${u('/places/')}">Places</a></li><li aria-current="page">${esc(p.name)}</li></ol></nav>
<div class="prose"><h1>${esc(p.name)} travel threads</h1><p>Everything I've written from ${esc(p.name)}${where ? `, ${esc(where)}` : ''}: where to go, what to eat and what's worth your time, one thread at a time.</p></div>
<div class="cards">${p.threads.map(card).join('')}</div></div>`,
  }));
}

// Places index
write('places/index.html', page({
  title: `Places · ${cfg.siteName}`,
  description: clip(`Every place ${A.name} has written about on ${cfg.siteName}: ${[...places.values()].map((p) => p.name).join(', ') || 'new places coming soon'}.`, 158),
  pathName: '/places/',
  nav: 'places',
  jsonld: [WEBSITE, PERSON, { '@type': 'CollectionPage', url: abs('/places/'), name: 'Places', isPartOf: { '@id': WEBSITE['@id'] } }],
  body: `<div class="wrap"><div class="prose"><h1>Places</h1><p>Every stop on the route so far.</p></div>
${places.size ? `<div class="cards">${[...places.values()].map((p) => `<a class="card" href="${u(`/places/${p.slug}/`)}">${p.threads[0].cover ? `<img src="${imgUrl(p.threads[0].cover.src800 || p.threads[0].cover.src)}" alt="${esc(p.threads[0].cover.alt || '')}" width="800" height="533" loading="lazy">` : `<span class="ph" aria-hidden="true">${esc(p.name)}</span>`}<strong>${esc(p.name)}</strong><small>${[p.region, p.country].filter(Boolean).map(esc).join(', ')}${p.region || p.country ? ' · ' : ''}${p.threads.length} thread${p.threads.length > 1 ? 's' : ''}</small></a>`).join('')}</div>` : '<p class="empty">The first place is coming soon.</p>'}</div>`,
}));

// About (for now: only the notice, as Jayson asked)
write('about/index.html', page({
  title: `About ${A.name} · ${cfg.siteName}`,
  description: clip(`${A.name} (${A.handle}) · ${cfg.siteName}. ${NOTICE}.`, 158),
  pathName: '/about/',
  nav: 'about',
  type: 'profile',
  image: abs('/assets/avatar.webp'),
  jsonld: [WEBSITE, PERSON, { '@type': 'ProfilePage', url: abs('/about/'), name: `About ${A.name}`, mainEntity: { '@id': PERSON['@id'] }, isPartOf: { '@id': WEBSITE['@id'] } }],
  body: `<div class="narrow prose"><div class="about-head"><img src="${u('/assets/avatar.webp')}" alt="${esc(A.name)}, illustrated looking through binoculars" width="120" height="120"><div><h1 style="margin:0">${esc(A.name)}</h1><p style="margin:4px 0 0;color:var(--muted)">${esc(A.handle)}</p></div></div>
<p style="font-family:var(--serif);font-size:28px;margin-top:28px">${esc(NOTICE)}.</p></div>`,
}));

// Contact
const phoneCards = CONTACT.phones.map((ph, i) => `<div class="contact-card"><h2>Phone ${CONTACT.phones.length > 1 ? i + 1 : ''}</h2><a class="big" href="tel:${phoneE164(ph)}">${phonePretty(ph)}</a><div class="row"><a class="btn solid" href="tel:${phoneE164(ph)}">Call</a><a class="btn" href="https://wa.me/${String(ph).replace(/\D/g, '')}" rel="noopener" target="_blank">WhatsApp</a><a class="btn" href="sms:${phoneE164(ph)}">Text</a></div></div>`).join('');
write('contact/index.html', page({
  title: `Contact ${A.name} · ${cfg.siteName}`,
  description: clip(`Contact ${A.name} of ${cfg.siteName}: call or WhatsApp ${CONTACT.phones.map(phonePretty).join(' or ')}, or email ${CONTACT.email}. ${NOTICE}.`, 158),
  pathName: '/contact/',
  nav: 'contact',
  jsonld: [WEBSITE, PERSON, { '@type': 'ContactPage', url: abs('/contact/'), name: `Contact ${A.name}`, mainEntity: { '@id': PERSON['@id'] }, isPartOf: { '@id': WEBSITE['@id'] } }],
  body: `<div class="wrap"><div class="prose"><h1>Contact</h1><p>Questions about a place, a trip idea, or want to work together? Reach me here.</p><span class="notice">${esc(NOTICE)}</span></div>
<div class="contact-grid">${phoneCards}
${CONTACT.email ? `<div class="contact-card"><h2>Email</h2><a class="big" href="mailto:${esc(CONTACT.email)}">${esc(CONTACT.email)}</a><div class="row"><a class="btn solid" href="mailto:${esc(CONTACT.email)}?subject=${encodeURIComponent('Hello from ' + cfg.siteName)}">Send an email</a></div></div>` : ''}
${A.x ? `<div class="contact-card"><h2>X</h2><a class="big" href="${esc(A.x)}" rel="me noopener">${esc(A.handle)}</a><div class="row"><a class="btn" href="${esc(A.x)}" rel="noopener" target="_blank">Message on X</a></div></div>` : ''}
</div></div>`,
}));

// Dashboard (private link, never indexed, not counted)
write('dashboard/index.html', page({
  title: `Dashboard · ${cfg.siteName}`,
  description: 'Site visits dashboard.',
  pathName: '/dashboard/',
  noindex: true,
  track: false,
  body: `<div class="wrap"><div class="prose" style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:12px"><div><h1 style="margin-bottom:4px">Dashboard</h1><p class="muted" style="margin:0" id="d-updated">Loading…</p></div>
<div class="seg" role="group" aria-label="Time range"><button type="button" data-days="7" aria-pressed="false">7 days</button><button type="button" data-days="30" aria-pressed="true">30 days</button><button type="button" data-days="90" aria-pressed="false">90 days</button></div></div>
<div class="dash-tiles">
<div class="tile"><b id="d-views">–</b><span>Page views</span></div>
<div class="tile"><b id="d-visitors">–</b><span>Visitors</span></div>
<div class="tile"><b id="d-today">–</b><span>Views today</span></div>
<div class="tile"><b id="d-all">–</b><span>All-time views</span></div>
<div class="tile"><b id="d-likes">–</b><span>Likes</span></div>
<div class="tile"><b id="d-comments">–</b><span>Comments</span></div>
</div>
<section class="panel"><h2>Views per day</h2><div class="bars" id="d-bars" role="img" aria-label="Views per day"></div><div class="bar-axis"><span id="d-first"></span><span id="d-last"></span></div></section>
<div class="dash-grid">
<section class="panel"><h2>Top pages</h2><ul class="rows" id="d-pages"></ul></section>
<section class="panel"><h2>Where visitors came from</h2><ul class="rows" id="d-refs"></ul></section>
<section class="panel"><h2>Devices</h2><ul class="rows" id="d-devices"></ul></section>
<section class="panel"><h2>Latest comments</h2><ul class="rows" id="d-comments-list"></ul><p class="muted" style="font-size:14px;margin:10px 0 0">To hide a comment, open the <a href="https://supabase.com/dashboard/project/${esc((SB.url || '').replace(/^https:\/\//, '').split('.')[0])}/editor" rel="noopener" target="_blank">travel_comments table in Supabase</a> and tick <em>hidden</em>.</p></section>
</div>
<p class="muted" style="font-size:14px">Your own visits aren't counted on this device: <button class="btn" type="button" id="d-notrack" style="min-height:36px;padding:4px 12px;font-size:14px"></button></p>
</div>`,
  extraScript: `<script>
(function(){var C=window.KJT,API=C.sb.url+'/rest/v1/rpc/travel_stats',H={apikey:C.sb.key,'Content-Type':'application/json'};
var $=function(i){return document.getElementById(i)};var nf=new Intl.NumberFormat('en');
function rows(el,items,label,val){el.innerHTML='';if(!items.length){el.innerHTML='<li class="muted">Nothing yet</li>';return}items.forEach(function(x){var li=document.createElement('li');var a=document.createElement('span');a.textContent=label(x);var b=document.createElement('b');b.textContent=val(x);li.appendChild(a);li.appendChild(b);el.appendChild(li)})}
function load(days){$('d-updated').textContent='Loading…';fetch(API,{method:'POST',headers:H,body:JSON.stringify({p_days:days})}).then(function(r){return r.json()}).then(function(d){
$('d-views').textContent=nf.format(d.views);$('d-visitors').textContent=nf.format(d.visitors);$('d-today').textContent=nf.format(d.today);$('d-all').textContent=nf.format(d.all_time);$('d-likes').textContent=nf.format(d.likes);$('d-comments').textContent=nf.format(d.comments);
var map={};(d.by_day||[]).forEach(function(x){map[x.day]=x});var bars=$('d-bars');bars.innerHTML='';var max=1,list=[];for(var i=days-1;i>=0;i--){var dt=new Date(Date.now()-i*864e5);var k=dt.toISOString().slice(0,10);var v=map[k]?map[k].views:0;list.push([k,v]);if(v>max)max=v}
list.forEach(function(p){var b=document.createElement('div');b.style.height=Math.max(2,Math.round(p[1]/max*100))+'%';b.title=p[0]+': '+p[1]+' views';bars.appendChild(b)});$('d-first').textContent=list[0][0];$('d-last').textContent='Today';
rows($('d-pages'),d.top_pages||[],function(x){return (x.title||x.path).replace(/ \\| KJayson Travels$/,'')+'  ·  '+x.path},function(x){return nf.format(x.views)});
rows($('d-refs'),d.referrers||[],function(x){return x.source},function(x){return nf.format(x.views)});
rows($('d-devices'),d.devices||[],function(x){return x.device},function(x){return nf.format(x.views)});
rows($('d-comments-list'),d.latest_comments||[],function(x){return x.name+' on '+x.thread_slug+': '+x.body},function(x){return new Date(x.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})});
$('d-updated').textContent='Updated '+new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})+' · last '+days+' days';
}).catch(function(){$('d-updated').textContent='Could not load the numbers. Try again in a moment.'})}
var cur=30;document.querySelectorAll('.seg button').forEach(function(b){b.addEventListener('click',function(){cur=+b.getAttribute('data-days');document.querySelectorAll('.seg button').forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});load(cur)})});
var nt=$('d-notrack');function paint(){var off=false;try{off=localStorage.getItem('kjt-notrack')==='1'}catch(e){}nt.textContent=off?'Not counting me ✓ (tap to count me again)':'Stop counting my visits';}
nt.addEventListener('click',function(){try{var off=localStorage.getItem('kjt-notrack')==='1';localStorage.setItem('kjt-notrack',off?'0':'1')}catch(e){}paint()});paint();
try{localStorage.setItem('kjt-notrack',localStorage.getItem('kjt-notrack')||'1')}catch(e){}paint();
load(cur);setInterval(function(){load(cur)},60000);})();
</script>`,
}));

// 404
write('404.html', page({ title: `Page not found · ${cfg.siteName}`, description: 'This page does not exist.', pathName: '/404.html', noindex: true,
  body: `<div class="empty wrap"><h2>Wrong turn.</h2><p>This page isn't on the route. <a href="${u('/')}">Back to the threads</a>.</p></div>` }));

// Editor (private, never indexed)
const editorSrc = fs.readFileSync(path.join(ROOT, 'editor', 'index.html'), 'utf8');
write('editor/index.html', editorSrc.replace('__KJT_CONFIG__', JSON.stringify({ siteUrl: ORIGIN + BASE + '/', base: BASE, repo: cfg.repo, author: { name: A.name, shortName: A.shortName, handle: A.handle } }).replace(/</g, '\\u003c')));

// Sitemap, robots, RSS, manifest
const urls = [
  { loc: abs('/'), lastmod: threads[0] ? isoDate(threads[0].updated) : NOW, pri: '1.0' },
  ...threads.map((t) => ({ loc: abs(t.url), lastmod: isoDate(t.updated), pri: '0.9', images: t.posts.filter((p) => p.image).map((p) => p.image) })),
  ...[...places.values()].map((p) => ({ loc: abs(`/places/${p.slug}/`), lastmod: isoDate(p.threads[0].updated), pri: '0.7' })),
  { loc: abs('/places/'), lastmod: NOW, pri: '0.5' },
  { loc: abs('/about/'), lastmod: NOW, pri: '0.5' },
  { loc: abs('/contact/'), lastmod: NOW, pri: '0.5' },
];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.map((x) => `<url><loc>${esc(x.loc)}</loc><lastmod>${x.lastmod}</lastmod><priority>${x.pri}</priority>${(x.images || []).map((im) => `<image:image><image:loc>${esc(imgAbs(im.src))}</image:loc></image:image>`).join('')}</url>`).join('\n')}
</urlset>
`);
if (BASE === '') write('CNAME', HOST + '\n');
if (cfg.indexNowKey) write(`${cfg.indexNowKey}.txt`, cfg.indexNowKey);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${abs('/sitemap.xml')}\n`);
write('feed.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${esc(cfg.siteName)}</title>
<link>${abs('/')}</link>
<description>${esc(cfg.description)}</description>
<language>${esc(cfg.language)}</language>
<atom:link href="${abs('/feed.xml')}" rel="self" type="application/rss+xml"/>
${threads.slice(0, 30).map((t) => `<item><title>${esc(t.title)}</title><link>${abs(t.url)}</link><guid isPermaLink="true">${abs(t.url)}</guid><pubDate>${new Date(isoDate(t.date)).toUTCString()}</pubDate><category>${esc(t.place)}</category><description>${esc(t.summaryText)}</description></item>`).join('\n')}
</channel>
</rss>
`);
write('site.webmanifest', JSON.stringify({ name: cfg.siteName, short_name: 'KJ Travels', start_url: BASE + '/', display: 'standalone', background_color: '#F1ECE2', theme_color: '#F1ECE2', icons: [{ src: u('/assets/apple-touch-icon.png'), sizes: '180x180', type: 'image/png' }] }, null, 2));

console.log(`Built ${threads.length} thread(s), ${places.size} place(s) → _site/${WITH_DRAFTS ? ' (drafts included)' : ''}`);
if (problems.length) { console.log('\nThings to fix:'); problems.forEach((p) => console.log(' - ' + p)); }
