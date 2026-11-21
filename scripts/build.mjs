#!/usr/bin/env node
// KJayson Travels — static site builder. No dependencies.
// Reads site.config.json + content/threads/*.json, writes the finished site to _site/.
// Usage: node scripts/build.mjs            (published threads only)
//        node scripts/build.mjs --drafts   (local preview, includes drafts)
//        node scripts/build.mjs --local    (links point at http://localhost:3000/)
//
// Where things live:
//   lib/site.mjs        settings, URL helpers, shared structured data
//   lib/util.mjs        escaping, dates, text → HTML
//   lib/content.mjs     loads and checks the threads
//   lib/layout.mjs      <head>, header, footer
//   lib/components.mjs  photos, posts, cards
//   lib/feeds.mjs       sitemap, RSS, robots, llms.txt
//   pages/*.mjs         one file per kind of page
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, OUT, WITH_DRAFTS, write, copyDir } from './lib/site.mjs';
import { loadContent } from './lib/content.mjs';
import * as home from './pages/home.mjs';
import * as thread from './pages/thread.mjs';
import * as placesPages from './pages/places.mjs';
import * as staticPages from './pages/static.mjs';
import * as dashboard from './pages/dashboard.mjs';
import * as editor from './pages/editor.mjs';
import * as feeds from './lib/feeds.mjs';

const { threads, places, route, problems } = loadContent();

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
copyDir(path.join(ROOT, 'assets'), path.join(OUT, 'assets'));
copyDir(path.join(ROOT, 'images'), path.join(OUT, 'images'));
fs.rmSync(path.join(OUT, 'assets', 'site.css'), { force: true }); // inlined into every page instead
write('.nojekyll', '');

const ctx = { threads, places, route };
for (const p of [home, thread, placesPages, staticPages, dashboard, editor, feeds]) p.render(ctx);

console.log(`Built ${threads.length} thread(s), ${places.size} place(s) → _site/${WITH_DRAFTS ? ' (drafts included)' : ''}`);
if (problems.length) {
  console.log('\nThings to fix:');
  problems.forEach((p) => console.log(process.env.GITHUB_ACTIONS ? `::warning title=Content check::${p}` : ' - ' + p));
}
