// Private visits dashboard (never indexed, not counted).
import { ROOT, OUT, WITH_DRAFTS, LOCAL, cfg, A, site, BASE, ORIGIN, u, abs, NOW, write, copyDir, sameAs, CONTACT, NOTICE, phoneE164, phonePretty, SB, HOST, PERSON, WEBSITE, DEFAULT_OG, imgUrl, imgAbs } from '../lib/site.mjs';
import { esc, slugify, clip, ld, fmtDate, isoDate, plain, textToHtml } from '../lib/util.mjs';
import { page } from '../lib/layout.mjs';
import { figure, stamp, REPLY_ICON, HEART_ICON, SHARE_ICON, postsHtml, entryHtml, card } from '../lib/components.mjs';

export function render({  }) {
write('dashboard/index.html', page({
  title: `Dashboard · ${cfg.siteName}`,
  description: 'Site visits dashboard.',
  pathName: '/dashboard/',
  noindex: true,
  track: false,
  body: `<div class="wrap"><div class="prose" style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:12px"><div><h1 style="margin-bottom:4px">Dashboard</h1><p class="muted" style="margin:0" id="d-updated">Loading…</p></div>
<div class="seg" role="group" aria-label="Time range"><button type="button" data-days="1" aria-pressed="false">Today</button><button type="button" data-days="7" aria-pressed="false">7 days</button><button type="button" data-days="30" aria-pressed="true">30 days</button><button type="button" data-days="90" aria-pressed="false">90 days</button></div></div>
<div class="dash-tiles">
<div class="tile"><b id="d-views">–</b><span>Page views</span></div>
<div class="tile"><b id="d-visitors">–</b><span>Visitors</span></div>
<div class="tile"><b id="d-today">–</b><span>Views today</span></div>
<div class="tile"><b id="d-all">–</b><span id="d-all-label">Total views</span></div>
<div class="tile"><b id="d-likes">–</b><span>Likes</span></div>
<div class="tile"><b id="d-comments">–</b><span>Replies</span></div>
</div>
<section class="panel"><h2 id="d-bars-title">Views per day</h2><div class="bars" id="d-bars" role="img" aria-label="Views per day"></div><div class="bar-axis"><span id="d-first"></span><span id="d-last"></span></div></section>
<div class="dash-grid">
<section class="panel"><h2>Top pages</h2><ul class="rows" id="d-pages"></ul></section>
<section class="panel"><h2>Where visitors came from</h2><ul class="rows" id="d-refs"></ul></section>
<section class="panel"><h2>Devices</h2><ul class="rows" id="d-devices"></ul></section>
<section class="panel"><h2>Latest replies</h2><ul class="rows" id="d-comments-list"></ul><p class="muted" style="font-size:14px;margin:10px 0 0">To hide a comment, open the <a href="https://supabase.com/dashboard/project/${esc((SB.url || '').replace(/^https:\/\//, '').split('.')[0])}/editor" rel="noopener" target="_blank">travel_comments table in Supabase</a> and tick <em>hidden</em>.</p></section>
</div>
<p class="muted" style="font-size:14px">Your own visits aren't counted on this device: <button class="btn" type="button" id="d-notrack" style="min-height:36px;padding:4px 12px;font-size:14px"></button></p>
</div>`,
  extraScript: `<script src="${u('/assets/dashboard.js')}" defer></script>`,
}));
}
