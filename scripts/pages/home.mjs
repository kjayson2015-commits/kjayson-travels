// Home page: masthead, route strip and latest threads.
import { ROOT, OUT, WITH_DRAFTS, LOCAL, cfg, A, site, BASE, ORIGIN, u, abs, NOW, write, copyDir, sameAs, CONTACT, NOTICE, phoneE164, phonePretty, SB, HOST, PERSON, WEBSITE, DEFAULT_OG, imgUrl, imgAbs } from '../lib/site.mjs';
import { esc, slugify, clip, ld, fmtDate, isoDate, plain, textToHtml } from '../lib/util.mjs';
import { page } from '../lib/layout.mjs';
import { figure, stamp, REPLY_ICON, HEART_ICON, SHARE_ICON, postsHtml, entryHtml, card } from '../lib/components.mjs';

export function render({ threads, route }) {
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
}
