// Small pure helpers shared by every page.
export const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const slugify = (s = '') => String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export const clip = (s = '', n = 155) => { s = String(s).replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const cut = s.slice(0, n - 1); return cut.slice(0, cut.lastIndexOf(' ') > 60 ? cut.lastIndexOf(' ') : cut.length).replace(/[,.;:\s]+$/, '') + '…'; };
export const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
export const fmtDate = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
export const isoDate = (d) => new Date(d + 'T12:00:00Z').toISOString();

export function textToHtml(text = '') {
  return String(text).trim().split(/\n{2,}/).map((para) => {
    let h = esc(para).replace(/\n/g, '<br>');
    h = h.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, (m) => `<a href="${m}" rel="nofollow noopener">${m.replace(/^https?:\/\//, '')}</a>`);
    h = h.replace(/(^|[\s(])@([A-Za-z0-9_]{1,15})\b/g, '$1<a href="https://x.com/$2" rel="nofollow noopener">@$2</a>');
    return `<p>${h}</p>`;
  }).join('');
}
export const plain = (t = '') => String(t).replace(/\s+/g, ' ').trim();
