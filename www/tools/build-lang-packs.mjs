#!/usr/bin/env node
/**
 * build-lang-packs.mjs — membuat paket bahasa offline: public/assets/lang/<kode>.json
 *
 * Sumber string : public/assets/lang/_source.id.json   (hasil: node tools/extract-i18n.cjs public/index.html)
 * Daftar bahasa : public/assets/js/lang-data.js         (daftarBahasa, satu-satunya sumber kebenaran)
 * Mesin         : Claude API (butuh ANTHROPIC_API_KEY di environment)
 *
 * Contoh (Windows PowerShell):
 *   $env:ANTHROPIC_API_KEY = "sk-ant-..."
 *   node tools/build-lang-packs.mjs --dry-run                 # lihat rencana tanpa memanggil API
 *   node tools/build-lang-packs.mjs --only fr,es,ar,ja,ko     # uji beberapa bahasa dulu
 *   node tools/build-lang-packs.mjs                            # semua bahasa yang belum lengkap
 *   node tools/build-lang-packs.mjs --force --only de          # timpa paket yang sudah ada
 *   node tools/build-lang-packs.mjs --mock --out tmp-lang      # uji alur tanpa API (hasil palsu, WAJIB pakai --out)
 *
 * Aman dijalankan ulang: bahasa yang cakupannya >= --min-coverage (default 0.95) dilewati.
 * Selesai -> menulis ulang assets/lang/_manifest.json (dipakai service worker untuk cache offline).
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const arg = (name, def) => { const i = process.argv.indexOf(name); return i > -1 ? (process.argv[i + 1] ?? true) : def; };
const flag = (name) => process.argv.includes(name);

const OUT_DIR = path.resolve(arg('--out', path.join(ROOT, 'assets', 'lang')));
const SRC_FILE = path.join(ROOT, 'assets', 'lang', '_source.id.json');
const ONLY = arg('--only', '') ? String(arg('--only')).split(',').map(s => s.trim()).filter(Boolean) : null;
const FORCE = flag('--force'), DRY = flag('--dry-run'), MOCK = flag('--mock');
const MIN_COVERAGE = Number(arg('--min-coverage', 0.95));
const CONCURRENCY = Number(arg('--concurrency', 3));
const BATCH = Number(arg('--batch', 40));
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5';
const API_KEY = process.env.ANTHROPIC_API_KEY;

if (MOCK && !arg('--out', null)) { console.error('--mock hanya boleh dengan --out <folder> agar paket asli tidak tertimpa hasil palsu.'); process.exit(1); }
if (!DRY && !MOCK && !API_KEY) { console.error('Set ANTHROPIC_API_KEY dulu (atau pakai --dry-run / --mock).'); process.exit(1); }

const SOURCE = JSON.parse(fs.readFileSync(SRC_FILE, 'utf8'));
const LANGS = vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'assets/js/lang-data.js'), 'utf8') + '\n;daftarBahasa', {})
  .filter(l => l.code !== 'id' && (!ONLY || ONLY.includes(l.code)));

// bahasa berdata latih sangat sedikit -> hasil perlu dicek penutur asli
const LOW_RESOURCE = new Set(['ach', 'alz', 'av', 'bal', 'bci', 'bem', 'bik', 'bua', 'ce', 'ch', 'chk', 'cnh', 'crh', 'crh-Latn',
  'cv', 'din', 'doi', 'dov', 'dyu', 'ee', 'ff', 'fon', 'fur', 'gaa', 'hil', 'hrx', 'iba', 'ilo']);

const TOKEN_RE = /\$\{[^}]+\}|\{[^}]+\}|%[sd]|&[a-z]+;|https?:\/\/\S+/gi;
const tokens = s => (s.match(TOKEN_RE) || []).sort().join('|');
const sleep = ms => new Promise(r => setTimeout(r, ms));

function coverage(file) {
  try {
    const pack = JSON.parse(fs.readFileSync(file, 'utf8'));
    return SOURCE.filter(s => typeof pack[s] === 'string' && pack[s] !== '').length / SOURCE.length;
  } catch { return 0; }
}

async function callClaude(lang, batch) {
  const system =
`You are a professional UI localizer for "Timer Proofer", a bakery dough-proofing timer app (donuts, bread).
Translate each Indonesian UI string into ${lang.name} (code: ${lang.code}).
Return ONLY a JSON array of strings: same length and same order as the input. No commentary, no markdown fences.
Rules: keep emoji, digits, units, punctuation, HTML entities and placeholders ({x}, \${x}, %s) exactly as-is;
keep brand and product names untranslated (Timer Proofer, Google, WhatsApp, Facebook, Apple, App Store, Google Play Store,
Samsung Galaxy Store, Huawei AppGallery, Kedai Mak-er); keep it short enough for buttons; use the natural everyday register;
if the language has no established term, use a common loanword rather than inventing one.`;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 8000, system, messages: [{ role: 'user', content: JSON.stringify(batch) }] })
  });
  if (!res.ok) { const e = new Error('HTTP ' + res.status); e.status = res.status; throw e; }
  const data = await res.json();
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  const arr = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1));
  if (!Array.isArray(arr) || arr.length !== batch.length) throw new Error('panjang array tidak sama');
  return arr;
}

async function translateBatch(lang, batch) {
  if (MOCK) return batch.map(s => '[' + lang.code + '] ' + s);
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const arr = await callClaude(lang, batch);
      return arr.map((s, i) => (typeof s === 'string' && s.trim() && tokens(s) === tokens(batch[i])) ? s : null);
    } catch (e) {
      if (attempt === 4) { console.warn(`  ! ${lang.code}: batch gagal (${e.message})`); return batch.map(() => null); }
      await sleep((e.status === 429 || e.status >= 500 ? 4000 : 1000) * attempt);
    }
  }
}

async function buildLang(lang) {
  const file = path.join(OUT_DIR, lang.code + '.json');
  const pack = {};
  for (let i = 0; i < SOURCE.length; i += BATCH) {
    const batch = SOURCE.slice(i, i + BATCH);
    const out = await translateBatch(lang, batch);
    batch.forEach((s, k) => { if (out[k]) pack[s] = out[k]; });   // yang gagal DIHILANGKAN -> mesin memakai teks asli per-kunci
  }
  const cov = Object.keys(pack).length / SOURCE.length;
  fs.writeFileSync(file, JSON.stringify(pack, null, 1) + '\n');
  console.log(`  ${cov >= MIN_COVERAGE ? 'OK ' : 'KURANG'} ${lang.code.padEnd(9)} ${lang.name}  ${(cov * 100).toFixed(1)}%${LOW_RESOURCE.has(lang.code) ? '  (perlu review penutur asli)' : ''}`);
  return cov;
}

// en.json ditulis tangan -> tidak pernah ditimpa kecuali eksplisit: --force --only en
const todo = LANGS.filter(l => (l.code !== 'en' || (FORCE && ONLY)) &&
  (FORCE || coverage(path.join(OUT_DIR, l.code + '.json')) < MIN_COVERAGE));
console.log(`${SOURCE.length} string sumber | ${LANGS.length} bahasa dipilih | ${todo.length} perlu dibuat | ${Math.ceil(SOURCE.length / BATCH)} batch/bahasa | model ${MODEL}`);
if (DRY) { console.log(todo.map(l => l.code).join(' ')); process.exit(0); }

fs.mkdirSync(OUT_DIR, { recursive: true });
let next = 0;
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (next < todo.length) await buildLang(todo[next++]);
}));

// manifest untuk service worker (semua paket yang ada, kecuali file berawalan "_")
const langs = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.json') && !f.startsWith('_')).map(f => f.slice(0, -5)).sort();
fs.writeFileSync(path.join(OUT_DIR, '_manifest.json'), JSON.stringify({ version: '2', langs }) + '\n');
const lengkap = langs.filter(c => coverage(path.join(OUT_DIR, c + '.json')) >= MIN_COVERAGE);
console.log(`\nManifest: ${langs.length} paket | lengkap (>= ${MIN_COVERAGE * 100}%): ${lengkap.length}`);
console.log('Belum lengkap: ' + (langs.filter(c => !lengkap.includes(c)).join(' ') || '-'));
console.log('Selanjutnya: naikkan CACHE_NAME di sw.js agar perangkat mengunduh paket baru.');
