#!/usr/bin/env node
/**
 * Ekstrak string UI berbahasa Indonesia dari index.html -> tools/data/_source.id.json   (v2, berbasis AST)
 * Pakai:    node tools/extract-i18n.js public/index.html
 * Cek pack: node tools/extract-i18n.js public/index.html --check en   (tampilkan string yang belum diterjemahkan)
 *
 * v2 dibanding versi lama:
 *   - Skrip inline & skrip lokal yang dimuat index.html diurai dengan AST (acorn), bukan regex.
 *     Menangkap SEMUA string literal, template literal (`Suhu ${t}°C` -> "Suhu {0}°C"), dan rangkaian
 *     penjumlahan ('Suhu ' + t + '°C'), bukan cuma yang ada di dalam alert/confirm/toast(...).
 *   - String berisi HTML (mis. innerHTML = '<b>Halo</b> {0}') dipecah per potongan teks + atribut,
 *     sama seperti versi lama menangani body HTML.
 *   - {0},{1},... = bagian dinamis (offline-i18n.js mencocokkannya sebagai pola saat runtime), sehingga
 *     "Terakhir diperbarui: 22.06" ikut diterjemahkan walau angkanya berubah-ubah. Pola begini TIDAK
 *     perlu lagi ditulis manual di tools/data/_extra.id.json -- file itu sekarang hanya untuk string yang
 *     memang tidak muncul dalam bentuk apa pun di index.html/skrip lokal (mis. dibuat dari data eksternal).
 *
 * Depends: acorn, acorn-walk (lihat tools/package.json -> `cd tools && npm install` sekali saja).
 * Jalankan ulang setiap kali teks UI berubah.
 */
const fs = require('fs');
const path = require('path');

const file = process.argv[2] || path.join(__dirname, '..', 'public', 'index.html');
const checkIdx = process.argv.indexOf('--check');
const html = fs.readFileSync(file, 'utf8');
const baseDir = path.dirname(file);
const dataDir = path.join(__dirname, 'data');
const langDir = path.join(path.dirname(path.resolve(file)), 'assets', 'lang');

let acorn, walk;
try {
  acorn = require('acorn');
  walk = require('acorn-walk');
} catch (e) {
  console.error('acorn / acorn-walk belum terpasang. Jalankan sekali: cd tools && npm install');
  process.exit(1);
}

const decode = s => s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&times;/g, '×').replace(/&copy;/g, '©').replace(/&amp;/g, '&');
const norm = s => s.replace(/\s+/g, ' ').trim();          // HARUS sama dengan norm() di offline-i18n.js
const LETTERS2 = /\p{L}{2}/u;

// ---------- filter: apakah string ini "teks yang dilihat pengguna"? ----------
const HTTP_WORDS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'JSON', 'UTF', 'CORS']);
function looksLikeUiText(s) {
  if (s.length < 2 || s.length > 600) return false;
  const bare = s.replace(/\{\d+\}/g, '');
  if (!LETTERS2.test(bare)) return false;
  if (/^(https?:|data:|mailto:|tel:|\/|\.{1,2}\/|#|\.|\[|@)/.test(s)) return false;
  if (/[{};]|=>|\bfunction\b|\brgba?\(|gradient\(|https?:\/\/|^\s*<|\.(js|css|png|svg|json|mp3|wav)\b/i.test(bare)) return false;
  const tokens = s.split(' ');
  if (tokens.length === 1) {
    if (HTTP_WORDS.has(s)) return false;
    if (/[_.\-#\[\]()=\/:]/.test(bare.replace(/[.!?:…]+$/, ''))) return false;
    return /^[\p{Lu}\p{Extended_Pictographic}]/u.test(s);
  }
  if (tokens.every(t => /^[a-z0-9_\-:.,>+~*="'()\[\]#]+$/.test(t)) &&
      (tokens.length <= 2 || tokens.some(t => /[-_:.#\[\]=>]/.test(t)))) return false;
  return true;
}

// ---------- pemecah string HTML -> potongan teks & atribut ----------
function htmlPieces(str, out) {
  for (const m of str.matchAll(/\b(?:placeholder|title|aria-label|alt)="([^"<>]{2,})"/g)) out.push(m[1]);
  const text = str.replace(/<!--[\s\S]*?-->/g, '<i>');
  for (const piece of text.split(/<[^>]*>/)) out.push(piece);
}

const found = new Set();
function emit(raw) {
  if (typeof raw !== 'string') return;
  const pieces = [];
  if (/<[a-zA-Z\/!][^>]*>/.test(raw)) htmlPieces(raw, pieces); else pieces.push(raw);
  for (const p of pieces) {
    let t = norm(decode(p));
    if (/\{\d+\}\s*\{\d+\}/.test(t)) continue;                 // placeholder bersebelahan = ambigu
    let k = 0; t = t.replace(/\{\d+\}/g, () => `{${k++}}`);     // nomori ulang 0..n-1 sesuai urutan kemunculan
    if (looksLikeUiText(t)) found.add(t);
  }
}

// ---------- kumpulkan sumber: skrip inline + skrip lokal yang di-<script src> oleh index.html ----------
const sources = [];
for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  const attrs = m[1];
  const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(attrs);
  if (src) {
    const local = src[1].split('?')[0];
    if (/^https?:/.test(local) || /(offline-i18n|lang-data|lang-renderer|lang-packs|html2pdf|capacitor-plugins)/.test(local)) continue;
    const f = path.join(baseDir, local);
    if (fs.existsSync(f)) sources.push({ code: fs.readFileSync(f, 'utf8'), module: false, name: local });
  } else if (m[2].trim() && !/importmap|application\/(ld\+)?json/i.test(attrs)) {
    sources.push({ code: m[2], module: /type\s*=\s*["']module["']/i.test(attrs), name: 'inline#' + sources.length });
  }
}

function isConsoleCall(node) {
  return node.type === 'CallExpression' && node.callee.type === 'MemberExpression' &&
    node.callee.object.type === 'Identifier' && node.callee.object.name === 'console';
}
function flattenConcat(node, parts) {
  if (node.type === 'BinaryExpression' && node.operator === '+') { flattenConcat(node.left, parts); flattenConcat(node.right, parts); }
  else parts.push(node);
}
function buildPattern(parts) {
  let n = 0, out = '', hasText = false;
  for (const p of parts) {
    if (p.type === 'Literal' && typeof p.value === 'string') { out += p.value; hasText = true; }
    else if (p.type === 'TemplateLiteral') {
      p.quasis.forEach((q, i) => { out += q.value.cooked ?? q.value.raw; if (i < p.expressions.length) out += `{${n++}}`; });
      hasText = true;
    } else out += `{${n++}}`;
  }
  return hasText && n > 0 ? out : null;
}

let parseErrors = 0;
for (const s of sources) {
  let ast;
  try {
    ast = acorn.parse(s.code, {
      ecmaVersion: 'latest', sourceType: s.module ? 'module' : 'script',
      allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true, allowHashBang: true
    });
  } catch (e) { parseErrors++; console.warn(`! ${s.name}: gagal parse AST (${e.message}) -> dilewati`); continue; }

  walk.ancestor(ast, {
    Literal(node, _st, anc) {
      if (typeof node.value !== 'string') return;
      const parent = anc[anc.length - 2];
      if (!parent) return;
      if (parent.type === 'Property' && parent.key === node && !parent.computed) return;
      if (parent.type === 'MethodDefinition' || parent.type === 'ImportDeclaration' || parent.type === 'ExportNamedDeclaration' ||
          parent.type === 'ExportAllDeclaration' || (parent.type === 'SwitchCase' && parent.test === node)) return;
      if (parent.type === 'ExpressionStatement') return;         // 'use strict'
      if (parent.type === 'MemberExpression' && parent.property === node) return;
      if (anc.some(isConsoleCall)) return;
      emit(node.value);
    },
    TemplateLiteral(node, _st, anc) {
      const parent = anc[anc.length - 2];
      if (parent && parent.type === 'TaggedTemplateExpression') return;
      if (anc.some(isConsoleCall)) return;
      let n = 0, str = '';
      node.quasis.forEach((q, i) => { str += q.value.cooked ?? q.value.raw; if (i < node.expressions.length) str += `{${n++}}`; });
      emit(str);
    },
    BinaryExpression(node, _st, anc) {
      if (node.operator !== '+') return;
      const parent = anc[anc.length - 2];
      if (parent && parent.type === 'BinaryExpression' && parent.operator === '+') return;   // hanya rantai terluar
      if (anc.some(isConsoleCall)) return;
      const parts = []; flattenConcat(node, parts);
      const pat = buildPattern(parts);
      if (pat) emit(pat);
    }
  });
}

// ---------- HTML statis (di luar <script>/<style>) ----------
const body = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
for (const m of body.matchAll(/>([^<>]+)</g)) { const t = norm(decode(m[1])); if (/[A-Za-z]{2,}/.test(t)) found.add(t); }
for (const m of body.matchAll(/\b(?:placeholder|title|aria-label|alt)="([^"]{2,})"/g)) { const t = norm(decode(m[1])); if (/[A-Za-z]{2,}/.test(t)) found.add(t); }

const list = [...found];
fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(path.join(dataDir, '_source.id.json'), JSON.stringify(list, null, 2));
const pat = list.filter(s => /\{\d+\}/.test(s)).length;
console.log(`${list.length} string (${pat} pola dinamis) dari ${sources.length} skrip, ${parseErrors} gagal parse -> ${path.join(dataDir, '_source.id.json')}`);

if (checkIdx > -1) {
  const code = process.argv[checkIdx + 1];
  const pack = JSON.parse(fs.readFileSync(path.join(langDir, code + '.json'), 'utf8'));
  let extra = [];
  try { extra = JSON.parse(fs.readFileSync(path.join(dataDir, '_extra.id.json'), 'utf8')); } catch (e) {}
  const missing = list.concat(extra).filter(s => !(s in pack));
  console.log('Belum diterjemahkan (' + code + '): ' + missing.length);
  missing.forEach(s => console.log(' - ' + s));
}
