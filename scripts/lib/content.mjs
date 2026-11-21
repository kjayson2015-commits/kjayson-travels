// Loads content/threads/*.json, checks each thread, and groups threads by place.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, WITH_DRAFTS } from './site.mjs';
import { slugify, clip, plain } from './util.mjs';

export function loadContent() {
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
  const PLACEHOLDER = /\[[A-Z][A-Z0-9 _/-]{2,}\]/;
  [['title', t.title], ['summary', t.summary], ...t.posts.map((p, i) => [`post ${i + 1}`, p.text])].forEach(([where, txt]) => { const m = PLACEHOLDER.exec(txt || ''); if (m) problems.push(`${f}: ${where} still has a placeholder ${m[0]}`); });
  t.place = plain(t.place || 'Somewhere');
  t.placeSlug = slugify(t.place);
  t.updated = t.updated || t.date;
  t.tags = (t.tags || []).map(plain).filter(Boolean);
  t.url = `/threads/${t.slug}/`;
  t.cover = (t.posts.find((p) => p.image) || {}).image || null;
  t.summaryText = plain(t.summary) || clip(t.posts.map((p) => plain(p.text)).join(' '), 155);
  t.words = t.posts.map((p) => plain(p.text)).join(' ').split(' ').filter(Boolean).length;
  t.readMin = Math.max(1, Math.round(t.words / 200 + t.posts.filter((p) => p.image).length * 5 / 60)); // ~5s per photo
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
  return { threads, places, route, problems };
}
