// sitemap.xml, robots.txt, RSS, llms.txt, web manifest, CNAME and the IndexNow key file.
import { ROOT, OUT, WITH_DRAFTS, LOCAL, cfg, A, site, BASE, ORIGIN, u, abs, NOW, write, copyDir, sameAs, CONTACT, NOTICE, phoneE164, phonePretty, SB, HOST, PERSON, WEBSITE, DEFAULT_OG, imgUrl, imgAbs } from './site.mjs';
import { esc, isoDate } from './util.mjs';
import { PRIVACY_UPDATED, PAGES_UPDATED } from '../pages/static.mjs';

export function render({ threads, places }) {
const newest = threads.length ? isoDate(threads.map((t) => t.updated).sort().pop()) : isoDate(PAGES_UPDATED);
const urls = [
  { loc: abs('/'), lastmod: newest, pri: '1.0' },
  ...threads.map((t) => ({ loc: abs(t.url), lastmod: isoDate(t.updated), pri: '0.9', images: t.posts.filter((p) => p.image).map((p) => p.image) })),
  ...[...places.values()].map((p) => ({ loc: abs(`/places/${p.slug}/`), lastmod: isoDate(p.threads[0].updated), pri: '0.7' })),
  { loc: abs('/places/'), lastmod: newest, pri: '0.5' },
  { loc: abs('/about/'), lastmod: isoDate(PAGES_UPDATED), pri: '0.5' },
  { loc: abs('/contact/'), lastmod: isoDate(PAGES_UPDATED), pri: '0.5' },
  { loc: abs('/privacy/'), lastmod: isoDate(PRIVACY_UPDATED), pri: '0.2' },
];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.map((x) => `<url><loc>${esc(x.loc)}</loc><lastmod>${x.lastmod}</lastmod><priority>${x.pri}</priority>${(x.images || []).map((im) => `<image:image><image:loc>${esc(imgAbs(im.src))}</image:loc></image:image>`).join('')}</url>`).join('\n')}
</urlset>
`);
if (BASE === '') write('CNAME', HOST + '\n');
if (cfg.indexNowKey) write(`${cfg.indexNowKey}.txt`, cfg.indexNowKey);
// llms.txt: a plain summary for AI search tools (ChatGPT, Perplexity, Gemini, Claude)
write('llms.txt', `# ${cfg.siteName}

> ${cfg.description} ${NOTICE}.

Written by ${A.name} (${A.handle}). Each page is a travel thread: short numbered posts with real photos from one trip.

## Threads
${threads.map((t) => `- [${t.title}](${abs(t.url)}): ${t.place}${t.country ? ', ' + t.country : ''}. ${t.summaryText}`).join('\n') || '- Coming soon'}

## Places
${[...places.values()].map((p) => `- [${p.name}](${abs(`/places/${p.slug}/`)})`).join('\n') || '- Coming soon'}

## About
- [About ${A.name}](${abs('/about/')})
- [Contact](${abs('/contact/')})
- [Privacy](${abs('/privacy/')})
`);
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
}
