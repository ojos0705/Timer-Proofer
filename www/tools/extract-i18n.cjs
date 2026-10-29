#!/usr/bin/env node
/**
 * Ekstrak string UI berbahasa Indonesia dari index.html -> public/assets/lang/_source.id.json
 * Pakai:   node tools/extract-i18n.cjs public/index.html
 * Cek pack: node tools/extract-i18n.cjs public/index.html --check en   (tampilkan string yang belum diterjemahkan)
 * Jalankan ulang setiap kali teks UI berubah.
 *
 * Ekstensi .cjs WAJIB: package.json memakai "type": "module", jadi file .js yang memakai require()
 * gagal dengan "ReferenceError: require is not defined in ES module scope".
 */
const fs = require('fs');
const path = require('path');
const file = process.argv[2] || 'public/index.html';
const checkIdx = process.argv.indexOf('--check');
const html = fs.readFileSync(file, 'utf8');

const decode = s => s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&');
const norm = s => s.replace(/\s+/g, ' ').trim();          // HARUS sama dengan norm() di offline-i18n.js
const looksLikeText = s => /[A-Za-z]{2,}/.test(s);

const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).join('\n');
const body = html.replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<!--[\s\S]*?-->/g, '');

const out = new Set();
// 1. teks statis di HTML
for (const m of body.matchAll(/>([^<>]+)</g)) { const t = norm(decode(m[1])); if (looksLikeText(t)) out.add(t); }
// 2. atribut
for (const m of body.matchAll(/\b(?:placeholder|title|aria-label|alt)="([^"]{2,})"/g)) { const t = norm(decode(m[1])); if (looksLikeText(t)) out.add(t); }
// 3. literal string di alert/confirm/toast
for (const m of scripts.matchAll(/\b(?:alert|confirm|showToast|toast|tampilkanToast)\(\s*(["'`])((?:\\.|(?!\1)[^\\])*?)\1\s*[,)]/g)) {
  if (m[1] === '`' && m[2].includes('${')) continue;
  const t = norm(m[2].replace(/\\n/g, ' ').replace(/\\(["'`])/g, '$1'));
  if (looksLikeText(t)) out.add(t);
}
const list = [...out];
const dir = path.join(path.dirname(file), 'assets', 'lang');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, '_source.id.json'), JSON.stringify(list, null, 2));
console.log(list.length + ' string -> ' + path.join(dir, '_source.id.json'));

if (checkIdx > -1) {
  const code = process.argv[checkIdx + 1];
  const pack = JSON.parse(fs.readFileSync(path.join(dir, code + '.json'), 'utf8'));
  const missing = list.filter(s => !(s in pack));
  console.log('Belum diterjemahkan (' + code + '): ' + missing.length);
  missing.forEach(s => console.log(' - ' + s));
}
