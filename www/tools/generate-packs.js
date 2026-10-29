#!/usr/bin/env node
/**
 * generate-packs.js — buat paket terjemahan OFFLINE untuk SEMUA bahasa di public/assets/js/lang-data.js
 * -----------------------------------------------------------------------------------------------------
 * Letakkan folder `tools/` SEJAJAR dengan folder `public/` (BUKAN di dalam public — supaya tidak ikut ter-deploy / ter-bundle ke APK).
 *
 *   node tools/extract-i18n.js public/index.html     (1) perbarui daftar string sumber Indonesia
 *   set GOOGLE_API_KEY=xxxx                           (2) CMD;  PowerShell: $env:GOOGLE_API_KEY="xxxx"
 *   node tools/generate-packs.js --dry-run            (3) cek dukungan bahasa + estimasi biaya (GRATIS)
 *   node tools/generate-packs.js --prune --bump-sw    (4) terjemahkan, hapus paket kerangka, naikkan versi cache SW
 *
 * Aman diulang: paket yang sudah VALID dilewati. Paket KERANGKA (< 60% string, mis. 9 kunci) dianggap belum ada
 * dan dibuat ulang. Perlu Node 18+ dan Cloud Translation API (Basic/v2) aktif.
 *
 * Opsi:
 *   --dry-run          hanya cek status & estimasi (tidak memanggil API berbayar)
 *   --only ms,ja,ar    hanya bahasa tertentu
 *   --force            buat ulang semua paket (en.json buatan tangan tetap aman kecuali --force-en)
 *   --force-en         izinkan menimpa en.json
 *   --prune            hapus file paket kerangka/rusak dari assets/lang
 *   --bump-sw          ubah CACHE_NAME di sw.js agar perangkat mengunduh paket terbaru
 *   --concurrency 3    jumlah bahasa diproses paralel
 *   --manifest-only    hanya regenerasi lang-packs.js + _manifest.json
 *   --public <dir>     folder web (default: ../public)
 *   --endpoint <url>   ganti endpoint API (untuk uji lokal)
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const args = process.argv.slice(2);
const has = n => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i > -1 ? args[i + 1] : d; };

const PUBLIC = path.resolve(opt('--public', path.join(__dirname, '..', 'public')));
const LANG_DIR = path.join(PUBLIC, 'assets', 'lang');
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(PUBLIC, 'assets', 'js', 'lang-data.js');
const PACKS_JS = path.join(PUBLIC, 'assets', 'js', 'lang-packs.js');
const MANIFEST = path.join(LANG_DIR, '_manifest.json');
const SW_FILE = path.join(PUBLIC, 'sw.js');
const ENDPOINT = opt('--endpoint', 'https://translation.googleapis.com/language/translate/v2');
const KEY = process.env.GOOGLE_API_KEY;
const CONCURRENCY = parseInt(opt('--concurrency', '3'), 10);

// Kode di daftar aplikasi yang memakai paket bahasa lain (hemat ukuran & biaya)
const ALIASES = { 'fr-CA': 'fr', 'fr-FR': 'fr', 'fr-CH': 'fr', 'fa-AF': 'fa', 'pt-BR': 'pt' };
// Istilah yang TIDAK boleh diterjemahkan
const PROTECTED = ['Timer Proofing', 'Timer Proofer Pro', 'Timer Proofer', 'Veladamas.com', 'WhatsApp', 'Google Play Store',
  'Apple App Store', 'Samsung Galaxy Store', 'Huawei AppGallery', 'Google Analytics', 'Google Sign-In', 'Google Translate',
  'Google', 'Facebook', 'Meta', 'Apple', 'Midtrans', 'Supabase', 'Bluetooth', 'PWA', 'OTP', 'GPS', 'BLE', 'IoT', 'XP',
  'localStorage', 'IndexedDB', 'Android', 'iOS', 'Samsung', 'Huawei', "Baker's %", 'Golden Ratio', 'Rp'];
const RE_PROTECT = new RegExp('(\\{\\d+\\}|(?<![\\p{L}\\p{N}])(?:' + PROTECTED.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![\\p{L}\\p{N}]))', 'gu');

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const wrap = s => esc(s).replace(RE_PROTECT, '<span translate="no">$1</span>');
const unwrap = s => s.replace(/<\/?span[^>]*>/gi, '')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const placeholders = s => (s.match(/\{\d+\}/g) || []).sort().join(',');
const sleep = ms => new Promise(r => setTimeout(r, ms));

function readList() {
  const code = fs.readFileSync(DATA_FILE, 'utf8');
  return vm.runInNewContext(code + '\n;daftarBahasa');
}
function readSource() {
  const out = [];
  for (const f of ['_source.id.json', '_extra.id.json']) {
    const p = path.join(DATA_DIR, f);
    if (fs.existsSync(p)) JSON.parse(fs.readFileSync(p, 'utf8')).forEach(s => { if (!out.includes(s)) out.push(s); });
  }
  return out;
}

async function api(pathAndQuery, body) {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const url = ENDPOINT + pathAndQuery + (pathAndQuery.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(KEY);
      const res = await fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
      if (res.status === 429 || res.status >= 500) throw new Error('HTTP ' + res.status);
      const j = await res.json();
      if (!res.ok) { const e = new Error((j.error && j.error.message) || ('HTTP ' + res.status)); e.fatal = true; throw e; }
      return j;
    } catch (e) {
      if (e.fatal || attempt === 5) throw e;
      await sleep(parseInt(process.env.RETRY_MS || '1000', 10) * Math.pow(2, attempt));
    }
  }
}

async function translateAll(strings, target) {
  const out = [];
  let i = 0;
  while (i < strings.length) {
    const batch = []; let chars = 0;
    while (i < strings.length && batch.length < 100 && chars + strings[i].length < 12000) { batch.push(strings[i]); chars += strings[i].length; i++; }
    if (!batch.length) { batch.push(strings[i]); i++; }
    const j = await api('', { q: batch.map(wrap), source: 'id', target, format: 'html' });
    const tr = j.data.translations;
    if (tr.length !== batch.length) throw new Error('jumlah hasil tidak cocok');
    tr.forEach(t => out.push(unwrap(t.translatedText)));
  }
  return out;
}

// Paket valid = objek dengan >= 60% jumlah string sumber (min. 100). Paket "kerangka" (mis. 9 kunci) TIDAK valid.
function packState(file, minKeys) {
  if (!fs.existsSync(file)) return { state: 'none', keys: 0 };
  try {
    const d = JSON.parse(fs.readFileSync(file, 'utf8'));
    const n = d && typeof d === 'object' && !Array.isArray(d) ? Object.keys(d).length : 0;
    return { state: n >= minKeys ? 'valid' : 'skeleton', keys: n };
  } catch (e) { return { state: 'broken', keys: 0 }; }
}

function scanPacks(minKeys) {
  const res = { valid: [], invalid: [] };
  fs.readdirSync(LANG_DIR).filter(f => f.endsWith('.json') && !f.startsWith('_')).sort().forEach(f => {
    const code = f.replace(/\.json$/, '');
    (packState(path.join(LANG_DIR, f), minKeys).state === 'valid' ? res.valid : res.invalid).push(code);
  });
  return res;
}

function writeManifest(minKeys) {
  const { valid, invalid } = scanPacks(minKeys);
  const aliases = {};
  Object.keys(ALIASES).forEach(k => { if (valid.includes(ALIASES[k])) aliases[k] = ALIASES[k]; });
  const h = crypto.createHash('md5');
  valid.forEach(c => h.update(fs.readFileSync(path.join(LANG_DIR, c + '.json'))));
  const version = h.digest('hex').slice(0, 8);
  fs.writeFileSync(PACKS_JS,
    '// DIHASILKAN OTOMATIS oleh tools/generate-packs.js — jangan diedit manual\n' +
    'export const OFFLINE_LANG_PACKS = ' + JSON.stringify(valid) + ';\n' +
    'export const OFFLINE_LANG_ALIASES = ' + JSON.stringify(aliases) + ';\n' +
    'export const OFFLINE_LANG_VERSION = ' + JSON.stringify(version) + ';\n' +
    'window.OFFLINE_LANG_PACKS = OFFLINE_LANG_PACKS;\n' +
    'window.OFFLINE_LANG_ALIASES = OFFLINE_LANG_ALIASES;\n' +
    'window.OFFLINE_LANG_VERSION = OFFLINE_LANG_VERSION;\n');
  fs.writeFileSync(MANIFEST, JSON.stringify({ version, langs: valid, aliases }));   // dibaca sw.js (warmLangPacks)
  console.log(`manifest: ${valid.length} paket VALID (versi ${version}) -> assets/js/lang-packs.js, assets/lang/_manifest.json`);
  if (invalid.length) console.log(`  ${invalid.length} file paket kerangka/rusak DIABAIKAN (tidak masuk manifest): ${invalid.slice(0, 12).join(', ')}${invalid.length > 12 ? ' ...' : ''}`);
  return { version, invalid };
}

function bumpSw(version) {
  if (!fs.existsSync(SW_FILE)) return console.log('sw.js tidak ditemukan, lewati --bump-sw');
  let s = fs.readFileSync(SW_FILE, 'utf8');
  const re = /(const CACHE_NAME = ')([^']*?)(-l[0-9a-f]{8})?(';)/;
  if (!re.test(s)) return console.log('CACHE_NAME tidak ditemukan di sw.js, lewati --bump-sw');
  s = s.replace(re, (_, a, b, _c, d) => a + b + '-l' + version + d);
  fs.writeFileSync(SW_FILE, s);
  console.log('sw.js: CACHE_NAME dinaikkan -> perangkat akan mengunduh paket bahasa terbaru');
}

(async () => {
  fs.mkdirSync(LANG_DIR, { recursive: true });
  const source = readSource();
  if (!source.length) { console.error('Sumber string kosong. Jalankan dulu: node tools/extract-i18n.js public/index.html'); process.exit(1); }
  const minKeys = Math.max(100, Math.floor(source.length * 0.6));

  if (has('--manifest-only')) { const m = writeManifest(minKeys); if (has('--bump-sw')) bumpSw(m.version); return; }
  if (!KEY) { console.error('Set dulu GOOGLE_API_KEY (lihat komentar di atas file ini).'); process.exit(1); }
  if (typeof fetch !== 'function') { console.error('Butuh Node 18+.'); process.exit(1); }

  const list = readList();
  const only = opt('--only') ? opt('--only').split(',') : null;
  const totalChars = source.reduce((a, s) => a + wrap(s).length, 0);

  const sup = new Set((await api('/languages?target=en')).data.languages.map(l => l.language));
  const apiCode = c => {
    if (sup.has(c)) return c;
    if (c === 'iw' && sup.has('he')) return 'he';
    if (c === 'he' && sup.has('iw')) return 'iw';
    return null;
  };
  const targets = [], unsupported = [];
  for (const l of list) {
    if (l.code === 'id' || ALIASES[l.code]) continue;
    if (only && !only.includes(l.code)) continue;
    const ac = apiCode(l.code);
    (ac ? targets : unsupported).push({ code: l.code, name: l.name, api: ac });
  }
  // paket induk untuk alias (mis. 'fr' untuk fr-CA/fr-FR/fr-CH; 'fa' untuk fa-AF; 'pt' untuk pt-BR)
  Object.values(ALIASES).forEach(a => {
    if (!targets.find(t => t.code === a) && !unsupported.find(t => t.code === a) && sup.has(a) && (!only || only.includes(a))) targets.push({ code: a, name: a, api: a });
  });

  const todo = targets.filter(t => {
    const st = packState(path.join(LANG_DIR, t.code + '.json'), minKeys).state;
    if (t.code === 'en' && st === 'valid') return has('--force-en');
    return st !== 'valid' || has('--force');
  });
  const before = scanPacks(minKeys);
  console.log(`String sumber: ${source.length} (~${totalChars} karakter/bahasa) | ambang paket valid: ${minKeys} kunci`);
  console.log(`Paket VALID sekarang: ${before.valid.length} | kerangka/rusak: ${before.invalid.length}`);
  console.log(`Didukung API: ${targets.length} | tidak didukung: ${unsupported.length}` + (unsupported.length ? ' -> ' + unsupported.map(u => u.code).join(', ') + ' (tetap lewat Google Translate saat online)' : ''));
  console.log(`Akan diterjemahkan: ${todo.length} bahasa ≈ ${(todo.length * totalChars / 1e6).toFixed(2)} juta karakter ≈ US$${(Math.max(0, todo.length * totalChars / 1e6 - 0.5) * 20).toFixed(0)} (setelah kredit gratis 500rb karakter/bulan; cek harga terbaru di Google Cloud)`);
  if (has('--dry-run')) return;

  let done = 0; const failed = [];
  const queue = todo.slice();
  async function worker() {
    while (queue.length) {
      const t = queue.shift();
      try {
        const tr = await translateAll(source, t.api);
        const pack = {}; let dropped = 0;
        source.forEach((s, i) => {
          const v = (tr[i] || '').trim();
          if (!v) return;
          if (placeholders(s) !== placeholders(v)) { dropped++; return; }        // {0},{1} rusak -> jangan pakai
          if (v !== s || /\{\d+\}/.test(s)) pack[s] = v;                           // templat disimpan walau identik
        });
        if (Object.keys(pack).length < minKeys) throw new Error('hasil terlalu sedikit (' + Object.keys(pack).length + ')');
        fs.writeFileSync(path.join(LANG_DIR, t.code + '.json'), JSON.stringify(pack));
        console.log(`[${++done}/${todo.length}] ${t.code} ✓ ${t.name}` + (dropped ? ` (${dropped} templat dibuang)` : ''));
      } catch (e) {
        failed.push(t.code); console.log(`[${++done}/${todo.length}] ${t.code} ✗ ${e.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, CONCURRENCY) }, worker));
  if (failed.length) console.log('Gagal (jalankan ulang untuk mencoba lagi): ' + failed.join(', '));

  if (has('--prune')) {
    const { invalid } = scanPacks(minKeys);
    invalid.forEach(c => fs.unlinkSync(path.join(LANG_DIR, c + '.json')));
    if (invalid.length) console.log(`--prune: ${invalid.length} file paket kerangka/rusak dihapus`);
  }
  const m = writeManifest(minKeys);
  if (has('--bump-sw')) bumpSw(m.version);
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
