// Copies the private editor page, filling in its settings.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, OUT, WITH_DRAFTS, LOCAL, cfg, A, site, BASE, ORIGIN, u, abs, NOW, write, copyDir, sameAs, CONTACT, NOTICE, phoneE164, phonePretty, SB, HOST, PERSON, WEBSITE, DEFAULT_OG, imgUrl, imgAbs } from '../lib/site.mjs';
import { esc, slugify, clip, ld, fmtDate, isoDate, plain, textToHtml } from '../lib/util.mjs';
import { page } from '../lib/layout.mjs';
import { figure, stamp, REPLY_ICON, HEART_ICON, SHARE_ICON, postsHtml, entryHtml, card } from '../lib/components.mjs';

export function render({  }) {
const editorSrc = fs.readFileSync(path.join(ROOT, 'editor', 'index.html'), 'utf8');
write('editor/index.html', editorSrc.replace('__KJT_CONFIG__', JSON.stringify({ siteUrl: ORIGIN + BASE + '/', base: BASE, repo: cfg.repo, author: { name: A.name, shortName: A.shortName, handle: A.handle } }).replace(/</g, '\\u003c')));
}
