#!/usr/bin/env node
// The Grapevine tab's look (2026-11-21 redesign) lives in gv/app-redesign.css (+ gv/app-redesign.js), a layer over the app.
// gv/app.html = the Grapevine repo's client.html + the CSS (inlined before its first </style>) + the layer's font
//   + the JS (a script just before </body>, after the app's own).
// tools/sync-grapevine.sh runs this after copying client.html; tools/check.js uses apply() to compare.
//   node tools/gv-redesign.js <client.html> <out.html>
const fs = require('fs'), path = require('path');
const FONT_OLD = 'family=IBM+Plex+Sans:wght@400;500;600&display=swap';
const FONT_NEW = 'family=IBM+Plex+Sans:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@600;700;800&display=swap';
function apply(html, css, js) {
  const i = html.indexOf('</style>');
  if (i < 0) throw new Error('no </style> in the Grapevine client');
  html = html.slice(0, i) + css.replace(/\n+$/, '') + '\n' + html.slice(i);
  if (js) {
    const j = html.lastIndexOf('</body>');
    if (j < 0) throw new Error('no </body> in the Grapevine client');
    html = html.slice(0, j) + '<script>\n' + js.replace(/<\/script/gi, '<\\/script').replace(/\n+$/, '') + '\n</script>\n' + html.slice(j);
  }
  return html.includes(FONT_OLD) ? html.replace(FONT_OLD, FONT_NEW) : html;
}
module.exports = { apply };
if (require.main === module) {
  const [src, out] = process.argv.slice(2);
  if (!src || !out) { console.error('usage: node tools/gv-redesign.js <client.html> <out.html>'); process.exit(1); }
  const gv = path.join(__dirname, '..', 'gv');
  fs.writeFileSync(out, apply(fs.readFileSync(src, 'utf8'), fs.readFileSync(path.join(gv, 'app-redesign.css'), 'utf8'),
    fs.readFileSync(path.join(gv, 'app-redesign.js'), 'utf8')));
}
