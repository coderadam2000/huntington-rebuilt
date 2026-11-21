#!/usr/bin/env node
// The Grapevine tab's look (2026-11-21 redesign) lives in gv/app-redesign.css, a layer over the Grapevine app's own styles.
// gv/app.html = the Grapevine repo's client.html + that layer (inlined before its first </style>) + the layer's font.
// tools/sync-grapevine.sh runs this after copying client.html; tools/check.js uses apply() to compare.
//   node tools/gv-redesign.js <client.html> <out.html>
const fs = require('fs'), path = require('path');
const FONT_OLD = 'family=IBM+Plex+Sans:wght@400;500;600&display=swap';
const FONT_NEW = 'family=IBM+Plex+Sans:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
function apply(html, css) {
  const i = html.indexOf('</style>');
  if (i < 0) throw new Error('no </style> in the Grapevine client');
  html = html.slice(0, i) + css.replace(/\n+$/, '') + '\n' + html.slice(i);
  return html.includes(FONT_OLD) ? html.replace(FONT_OLD, FONT_NEW) : html;
}
module.exports = { apply };
if (require.main === module) {
  const [src, out] = process.argv.slice(2);
  if (!src || !out) { console.error('usage: node tools/gv-redesign.js <client.html> <out.html>'); process.exit(1); }
  const css = fs.readFileSync(path.join(__dirname, '..', 'gv', 'app-redesign.css'), 'utf8');
  fs.writeFileSync(out, apply(fs.readFileSync(src, 'utf8'), css));
}
