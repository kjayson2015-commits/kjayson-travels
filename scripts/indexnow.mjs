#!/usr/bin/env node
// Tells Bing, Yandex and other IndexNow search engines about every page in the live sitemap.
// Runs in GitHub Actions right after each deploy. Google reads the sitemap via Search Console.
import fs from 'node:fs';
const cfg = JSON.parse(fs.readFileSync(new URL('../site.config.json', import.meta.url), 'utf8'));
const site = new URL(cfg.siteUrl.replace(/\/?$/, '/'));
if (!cfg.indexNowKey || site.pathname !== '/') { console.log('IndexNow skipped (needs a key and a root domain).'); process.exit(0); }
const sitemap = await fetch(new URL('sitemap.xml', site), { cache: 'no-store' }).then((r) => r.text()).catch(() => '');
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&')).slice(0, 10000);
if (!urlList.length) { console.log('IndexNow: sitemap not reachable yet, skipping.'); process.exit(0); }
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: site.hostname, key: cfg.indexNowKey, keyLocation: new URL(`${cfg.indexNowKey}.txt`, site).href, urlList }),
}).catch((e) => ({ status: 'error', statusText: e.message }));
console.log(`IndexNow: sent ${urlList.length} URL(s) → ${res.status} ${res.statusText || ''}`);
