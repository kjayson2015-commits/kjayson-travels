// About, Contact, Privacy and 404 pages.
import { ROOT, OUT, WITH_DRAFTS, LOCAL, cfg, A, site, BASE, ORIGIN, u, abs, NOW, write, copyDir, sameAs, CONTACT, NOTICE, phoneE164, phonePretty, SB, HOST, PERSON, WEBSITE, DEFAULT_OG, imgUrl, imgAbs } from '../lib/site.mjs';
import { esc, slugify, clip, ld, fmtDate, isoDate, plain, textToHtml } from '../lib/util.mjs';
import { page } from '../lib/layout.mjs';
import { figure, stamp, REPLY_ICON, HEART_ICON, SHARE_ICON, postsHtml, entryHtml, card } from '../lib/components.mjs';

// Change these dates only when the page text itself changes.
export const PRIVACY_UPDATED = '2026-11-20';
export const PAGES_UPDATED = '2026-11-20'; // About and Contact

export function render({  }) {
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


// Privacy policy (required for Google sign-in)
write('privacy/index.html', page({
  title: `Privacy · ${cfg.siteName}`,
  description: clip(`How ${cfg.siteName} handles visits, likes, replies and Google sign-in.`, 158),
  pathName: '/privacy/',
  jsonld: [WEBSITE, PERSON, { '@type': 'WebPage', url: abs('/privacy/'), name: 'Privacy policy', isPartOf: { '@id': WEBSITE['@id'] } }],
  body: `<div class="narrow prose"><h1>Privacy</h1>
<p class="muted">Last updated ${fmtDate(PRIVACY_UPDATED)}</p>
<p>${esc(cfg.siteName)} is a personal travel site run by ${esc(A.name)}. This page explains what the site keeps and why. ${esc(NOTICE)}.</p>
<h2>Visits</h2>
<p>When you open a page, the site counts the visit: the page address, its title, the website that sent you (if any), and whether you're on a phone, tablet or computer. A random code saved in your browser lets the site tell repeat visits from new visitors. Your IP address, name and email are not stored for visits.</p>
<h2>Likes</h2>
<p>A like is saved with the same random browser code so you can unlike it later.</p>
<h2>Replies</h2>
<p>Replies are public. If you reply without signing in, your reply shows a label like "Chrome on Android" based on your browser. Your browser keeps a private key that lets only you edit or delete that reply.</p>
<h2>Sign in with Google</h2>
<p>If you choose "Continue with Google", Google shares your name, profile photo and email address with this site. Your <strong>name and photo</strong> are shown on your replies. Your <strong>email is never shown</strong> to anyone and is only used to sign you in. You can sign out at any time from the reply box, and remove the site's access in your <a href="https://myaccount.google.com/connections" rel="noopener">Google Account connections</a>.</p>
<h2>Where it's stored</h2>
<p>Visits, likes, replies and sign-ins are stored with Supabase, a database service. Pages are hosted by GitHub Pages. Fonts are served from this site. The Google sign-in button loads from Google. Nothing is sold or shared for advertising.</p>
<h2>Removing your data</h2>
<p>Delete any reply yourself from its ⋯ menu, or email <a href="mailto:${esc(CONTACT.email)}">${esc(CONTACT.email)}</a> and ask for your replies or sign-in to be removed.</p>
</div>`,
}));

write('404.html', page({ title: `Page not found · ${cfg.siteName}`, description: 'This page does not exist.', pathName: '/404.html', noindex: true,
  body: `<div class="empty wrap"><h2>Wrong turn.</h2><p>This page isn't on the route. <a href="${u('/')}">Back to the threads</a>.</p></div>` }));
}
