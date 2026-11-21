// The shared page shell: <head> (SEO + social tags), header, footer.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, OUT, WITH_DRAFTS, LOCAL, cfg, A, site, BASE, ORIGIN, u, abs, NOW, write, copyDir, sameAs, CONTACT, NOTICE, phoneE164, phonePretty, SB, HOST, PERSON, WEBSITE, DEFAULT_OG, imgUrl, imgAbs } from './site.mjs';
import { esc, ld } from './util.mjs';

export const CSS = fs.readFileSync(path.join(ROOT, 'assets', 'site.css'), 'utf8').replace(/\n/g, '');
export const FONT_FILES = [['Fraunces', 500, 'normal', 'fraunces-latin-500-normal'], ['Fraunces', 700, 'normal', 'fraunces-latin-700-normal'], ['Fraunces', 500, 'italic', 'fraunces-latin-500-italic'], ['Work Sans', 400, 'normal', 'work-sans-latin-400-normal'], ['Work Sans', 600, 'normal', 'work-sans-latin-600-normal']];
export const FONT_CSS = FONT_FILES.map(([fam, w, st, f]) => `@font-face{font-family:'${fam}';font-style:${st};font-weight:${w};font-display:swap;src:url(${u('/assets/fonts/' + f + '.woff2')}) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}`).join('');
export const FONT_PRELOAD = ['work-sans-latin-400-normal', 'fraunces-latin-700-normal', 'fraunces-latin-500-italic'].map((f) => `<link rel="preload" href="${u('/assets/fonts/' + f + '.woff2')}" as="font" type="font/woff2" crossorigin>`).join('\n');

export function page({ title, description, pathName, type = 'website', image, imageAlt, jsonld = [], body, nav = '', noindex = false, article = null, track = true, extraScript = '' }) {
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
${!image || image === DEFAULT_OG || /share\.jpg$/.test(image) ? '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">' : ''}
<meta name="twitter:image:alt" content="${esc(imageAlt || cfg.siteName)}">
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
${FONT_PRELOAD}
${SB.url ? `<link rel="preconnect" href="${esc(SB.url)}" crossorigin>` : ''}
<style>${FONT_CSS}${CSS}</style>
${jsonld.length ? ld({ '@context': 'https://schema.org', '@graph': jsonld }) : ''}
<script>window.KJT=${JSON.stringify({ host: HOST, track, sb: { url: SB.url, key: SB.publishableKey }, gid: cfg.googleClientId || '', owner: CONTACT.email || '' }).replace(/</g, '\\u003c')}</script>
<script src="${u('/assets/site.js')}" defer></script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="top"><div class="wrap">
<a class="logo" href="${u('/')}"><img src="${u('/assets/avatar-96.webp')}" alt="" width="36" height="36">${esc(cfg.siteName)}</a>
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
<a href="${u('/privacy/')}">Privacy</a>
<a href="${u('/feed.xml')}">RSS</a>
</nav>
</div></footer>
${extraScript}
</body>
</html>
`;
}
