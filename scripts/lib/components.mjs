// Reusable HTML pieces: photos, place stamps, thread posts, home entries, cards.
import { ROOT, OUT, WITH_DRAFTS, LOCAL, cfg, A, site, BASE, ORIGIN, u, abs, NOW, write, copyDir, sameAs, CONTACT, NOTICE, phoneE164, phonePretty, SB, HOST, PERSON, WEBSITE, DEFAULT_OG, imgUrl, imgAbs } from './site.mjs';
import { esc, fmtDate, plain, textToHtml } from './util.mjs';

export function figure(img, { eager = false, caption = '' } = {}) {
  if (!img || !img.src) return '';
  const w = img.width || 1600, h = img.height || 1067;
  const srcset = img.src800 ? ` srcset="${imgUrl(img.src800)} 800w, ${imgUrl(img.src)} ${w}w" sizes="(max-width: 700px) 92vw, 620px"` : '';
  return `<figure class="polaroid" style="--ar:${w}/${h}"><img src="${imgUrl(img.src)}"${srcset} width="${w}" height="${h}" alt="${esc(img.alt || '')}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">${caption || img.caption ? `<figcaption>${esc(caption || img.caption)}</figcaption>` : ''}</figure>`;
}

export function stamp(t, ink = false) {
  const line2 = t.region || t.country || '';
  return `<a class="stamp${ink ? ' ink' : ''}" href="${u(`/places/${t.placeSlug}/`)}" aria-label="More threads from ${esc(t.place)}">${esc(t.place)}${line2 ? `<br>${esc(line2)}` : ''}<br>${esc(new Date(t.date + 'T12:00:00Z').toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }))}</a>`;
}

export const REPLY_ICON = `<svg class="reply-ico" width="20" height="18" viewBox="0 0 44 40" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 3C11 3 3 9 3 17c0 4.5 2.6 8.5 6.8 11L8 36l9.2-4.6c1.5.3 3.1.4 4.8.4 11 0 19-6 19-14.4S33 3 22 3z"/><path d="M15 12h16M15 17h16M15 22h16"/><path d="M8 33c1-7 5-12 12-13.5"/><path d="M17 15.5l5 4-5.4 3.6"/></svg>`;
export const HEART_ICON = `<svg class="heart-ico" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1l8.8 8.8 8.8-8.8a5 5 0 0 0 0-7.1z"/></svg>`;
export const SHARE_ICON = `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>`;
export function postsHtml(t, { limit = Infinity, headingLevel = 'h1', actions = false, eagerFirst = false } = {}) {
  const n = t.posts.length;
  return `<ol class="thread">${t.posts.slice(0, limit).map((p, i) => `
<li class="post" id="post-${i + 1}">
<div class="rail"><img src="${u('/assets/avatar-96.webp')}" alt="" width="48" height="48" loading="lazy" decoding="async"><span></span></div>
<div class="body">
<div class="who"><strong>${esc(A.shortName || A.name)}</strong><a href="${esc(A.x || '#')}" rel="noopener">${esc(A.handle)}</a><span>· <a href="#post-${i + 1}" aria-label="Post ${i + 1} of ${n}">${i + 1}/${n}</a></span></div>
${plain(p.text) ? `<div class="text">${textToHtml(p.text)}</div>` : ''}
${figure(p.image, { eager: i === 0 && (headingLevel === 'h1' || eagerFirst) })}
${actions ? `<div class="acts" data-key="${esc(t.slug)}#p${i + 1}" data-post="${i + 1}" role="group" aria-label="Actions for post ${i + 1}">
<button class="act act-reply" type="button" data-act="reply" aria-label="Reply to post ${i + 1}">${REPLY_ICON}<span data-rc></span></button>
<button class="act act-like" type="button" data-act="like" aria-pressed="false" aria-label="Like post ${i + 1}">${HEART_ICON}<span data-lc></span></button>
<button class="act act-share" type="button" data-act="share" data-url="${abs(t.url)}#post-${i + 1}" aria-label="Share post ${i + 1}">${SHARE_ICON}</button>
</div>` : ''}
</div>
</li>`).join('')}</ol>`;
}

export function entryHtml(t, i) {
  const photos = t.posts.filter((p) => p.image).slice(0, 3);
  const showThread = i === 0;
  return `<article class="entry">
<div class="entry-side">${stamp(t, i % 2 === 1)}<p class="kicker">${t.posts.length} posts · ${t.readMin} min read</p></div>
<div class="entry-main">
<h2><a href="${u(t.url)}">${esc(t.title)}</a></h2>
${showThread ? postsHtml(t, { limit: 3, headingLevel: 'h2', eagerFirst: true }) : `<p class="summary">${esc(t.summaryText)}</p>${photos.length ? `<div class="strip">${photos.map((p) => figure(p.image)).join('')}</div>` : ''}`}
<a class="more" href="${u(t.url)}">${showThread && t.posts.length > 3 ? `Continue the thread · ${t.posts.length - 3} more` : 'Read the thread'}<span class="skip"> — ${esc(t.title)}</span></a>
</div>
</article>`;
}

export function card(t) {
  return `<a class="card" href="${u(t.url)}">${t.cover ? `<img src="${imgUrl(t.cover.src800 || t.cover.src)}" alt="${esc(t.cover.alt || '')}" width="800" height="533" loading="lazy" decoding="async">` : `<span class="ph" aria-hidden="true">${esc(t.place)}</span>`}<strong>${esc(t.title)}</strong><small>${esc(t.place)} · ${fmtDate(t.date)}</small></a>`;
}
