// Site settings, URL helpers, file output and the shared structured-data blocks.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OUT = path.join(ROOT, '_site');
export const WITH_DRAFTS = process.argv.includes('--drafts');
export const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
export const A = cfg.author;

export const LOCAL = process.argv.includes('--local');      // preview on http://localhost:3000/
export const site = new URL(LOCAL ? 'http://localhost:3000/' : cfg.siteUrl.replace(/\/?$/, '/'));
export const BASE = site.pathname.replace(/\/$/, '');      // '' on a custom domain, '/kjayson-travels' on GitHub Pages
export const ORIGIN = site.origin;
export const u = (p) => BASE + p;                          // site-relative link
export const abs = (p) => ORIGIN + BASE + p;               // full URL for canonical, sitemap, social cards
export const NOW = new Date().toISOString();
export const write = (rel, content) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, content); };
export const copyDir = (from, to) => { if (!fs.existsSync(from)) return; fs.cpSync(from, to, { recursive: true }); };

export const sameAs = [A.x, A.facebook, A.website].filter(Boolean);
export const CONTACT = cfg.contact || { phones: [], email: '' };
export const NOTICE = cfg.notice || 'Not a travel agent';
export const phoneE164 = (n) => '+' + String(n).replace(/\D/g, '');
export const phonePretty = (n) => { const d = String(n).replace(/\D/g, ''); return d.startsWith('254') && d.length === 12 ? `+254 ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}` : '+' + d; };
export const SB = cfg.supabase || {};
export const HOST = site.hostname;
export const PERSON = { '@type': 'Person', '@id': abs('/about/#person'), name: A.name, alternateName: A.handle, url: abs('/about/'), image: abs('/assets/avatar.webp'), description: A.bio, sameAs, ...(CONTACT.email ? { email: 'mailto:' + CONTACT.email } : {}), ...(CONTACT.phones.length ? { telephone: phoneE164(CONTACT.phones[0]), contactPoint: CONTACT.phones.map((ph) => ({ '@type': 'ContactPoint', telephone: phoneE164(ph), contactType: 'customer support', ...(CONTACT.email ? { email: CONTACT.email } : {}), availableLanguage: ['English', 'Swahili'] })) } : {}) };
export const WEBSITE = { '@type': 'WebSite', '@id': abs('/#website'), url: abs('/'), name: cfg.siteName, description: cfg.description, inLanguage: cfg.language, publisher: { '@id': PERSON['@id'] } };
export const DEFAULT_OG = abs('/assets/og-default.png');
export const imgUrl = (src) => /^https?:/.test(src) ? src : u('/' + src.replace(/^\//, ''));
export const imgAbs = (src) => /^https?:/.test(src) ? src : abs('/' + src.replace(/^\//, ''));
