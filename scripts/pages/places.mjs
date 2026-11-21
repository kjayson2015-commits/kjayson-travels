// Place pages and the Places index.
import { ROOT, OUT, WITH_DRAFTS, LOCAL, cfg, A, site, BASE, ORIGIN, u, abs, NOW, write, copyDir, sameAs, CONTACT, NOTICE, phoneE164, phonePretty, SB, HOST, PERSON, WEBSITE, DEFAULT_OG, imgUrl, imgAbs } from '../lib/site.mjs';
import { esc, slugify, clip, ld, fmtDate, isoDate, plain, textToHtml } from '../lib/util.mjs';
import { page } from '../lib/layout.mjs';
import { figure, stamp, REPLY_ICON, HEART_ICON, SHARE_ICON, postsHtml, entryHtml, card } from '../lib/components.mjs';

export function render({ places }) {
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
}
