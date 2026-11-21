// One page per thread, with replies, sharing and related threads.
import { ROOT, OUT, WITH_DRAFTS, LOCAL, cfg, A, site, BASE, ORIGIN, u, abs, NOW, write, copyDir, sameAs, CONTACT, NOTICE, phoneE164, phonePretty, SB, HOST, PERSON, WEBSITE, DEFAULT_OG, imgUrl, imgAbs } from '../lib/site.mjs';
import { esc, slugify, clip, ld, fmtDate, isoDate, plain, textToHtml } from '../lib/util.mjs';
import { page } from '../lib/layout.mjs';
import { figure, stamp, REPLY_ICON, HEART_ICON, SHARE_ICON, postsHtml, entryHtml, card } from '../lib/components.mjs';

export function render({ threads }) {
for (const t of threads) {
  const idx = threads.indexOf(t);
  const related = [...threads.filter((x) => x !== t && x.placeSlug === t.placeSlug), ...threads.filter((x) => x !== t && x.placeSlug !== t.placeSlug)].slice(0, 3);
  const titleTag = [`${t.title} · ${t.place} | ${cfg.siteName}`, `${t.title} | ${cfg.siteName}`].find((x) => x.length <= 68) || t.title;
  const images = t.posts.filter((p) => p.image).map((p) => ({ '@type': 'ImageObject', url: imgAbs(p.image.src), ...(p.image.width ? { width: p.image.width, height: p.image.height } : {}), ...(p.image.alt ? { caption: p.image.alt } : {}) }));
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
<div class="byline"><img src="${u('/assets/avatar-96.webp')}" alt="" width="28" height="28"><a href="${u('/about/')}" rel="author">${esc(A.name)}</a><time datetime="${t.date}">${fmtDate(t.date)}</time>${t.updated !== t.date ? `<span>Updated <time datetime="${t.updated}">${fmtDate(t.updated)}</time></span>` : ''}<span>${t.readMin} min read</span></div></div></header>
${postsHtml(t, { actions: true })}
${t.tags.length ? `<ul class="tags" aria-label="Topics">${t.tags.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
<div class="share"><span>Share this thread</span>
<a class="btn solid" href="https://x.com/intent/post?text=${shareText}&url=${shareUrl}&via=${encodeURIComponent((A.handle || '').replace('@', ''))}" rel="noopener" target="_blank">Post on X</a>
<a class="btn" href="https://wa.me/?text=${shareText}%20${shareUrl}" rel="noopener" target="_blank">WhatsApp</a>
<a class="btn" href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" rel="noopener" target="_blank">Facebook</a>
<button class="btn" type="button" data-copy="${abs(t.url)}">Copy link</button>
</div>
</article>
<section class="x-replies" id="replies" data-slug="${esc(t.slug)}" data-posts="${t.posts.length}" aria-labelledby="r-title">
<h2 id="r-title">${REPLY_ICON} Replies <span class="muted" data-rtotal></span></h2>
<form class="x-compose" id="composer" novalidate>
<div class="x-av" data-me aria-hidden="true">?</div>
<div class="x-cbody">
<p class="x-replying">Replying to <a href="${esc(A.x || '#')}" rel="noopener">${esc(A.handle)}</a><span data-to></span></p>
<label class="sr" for="r-body">Post your reply</label>
<textarea id="r-body" name="body" rows="2" maxlength="1000" placeholder="Post your reply"></textarea>
<div class="hp" aria-hidden="true"><label for="r-web">Website</label><input id="r-web" name="website" type="text" tabindex="-1" autocomplete="off"></div>
<div class="x-cbar"><span class="muted" style="font-size:14px">as <strong data-asname>a visitor</strong></span><span class="x-right"><span class="x-count" data-chars>0/1000</span><button class="x-pill" type="submit" disabled>Reply</button></span></div>
<p class="c-msg" role="status"></p>
</div>
</form>
<ol class="x-list" aria-live="polite"><li class="muted x-empty">Loading replies…</li></ol>
</section>
${related.length ? `<h2 class="section-title">More threads</h2><div class="cards">${related.map(card).join('')}</div>` : ''}
${idx < threads.length - 1 ? `<p><a class="more" href="${u(threads[idx + 1].url)}" rel="prev">← Older: ${esc(threads[idx + 1].title)}</a></p>` : ''}
${idx > 0 ? `<p><a class="more" href="${u(threads[idx - 1].url)}" rel="next">Newer: ${esc(threads[idx - 1].title)} →</a></p>` : ''}
</div>
<script>document.querySelectorAll('[data-copy]').forEach(function(b){b.addEventListener('click',function(){var l=b.getAttribute('data-copy');if(navigator.share){navigator.share({title:document.title,url:l}).catch(function(){});return;}(navigator.clipboard?navigator.clipboard.writeText(l):Promise.reject()).then(function(){b.textContent='Link copied';},function(){prompt('Copy this link',l);});});});</script>`,
  }));
}
}
