/**
 * offline-i18n.js — terjemahan UI 100% offline (tanpa internet)
 * ----------------------------------------------------------------------------
 * Cara kerja:
 *  - Kunci kamus = teks ASLI berbahasa Indonesia (mis. "Simpan Pengaturan"), sehingga
 *    HTML/JS yang sudah ada TIDAK perlu diberi atribut data-i18n satu per satu.
 *  - Mesin menelusuri teks & atribut (placeholder/title/aria-label/alt), lalu menggantinya
 *    dengan hasil dari paket bahasa: assets/lang/<kode>.json
 *  - MutationObserver menerjemahkan konten dinamis (innerHTML/textContent buatan JS).
 *  - alert()/confirm() ikut diterjemahkan.
 *  - Teks asli disimpan per-node, jadi pindah bahasa (en -> id -> en) selalu bersih.
 *  - Paket disimpan di localStorage setelah pertama kali diunduh (cadangan bila
 *    service worker belum meng-cache file JSON-nya).
 *
 * Menambah bahasa offline baru: buat assets/lang/<kode>.json lalu tambahkan
 * kodenya ke OFFLINE_LANGS di bawah (dan ke precache sw.js).
 */
(function (global) {
  'use strict';

  var PACK_BASE = 'assets/lang/';
  var PACK_VERSION = '2';                 // naikkan saat isi paket berubah (v2: membuang cache paket kerangka v1)
  var MIN_PACK_KEYS = 100;                // paket dengan kunci lebih sedikit dianggap kerangka kosong, BUKAN terjemahan
  var OFFLINE_LANGS = [
    'ab', 'ach', 'aa', 'af', 'sq', 'alz', 'am', 'ar', 'hy', 'av', 'ay', 'az',
    'bal', 'bm', 'bci', 'ba', 'eu', 'be', 'bem', 'bn', 'bik', 'bs', 'br', 'bua',
    'yue', 'ca', 'ceb', 'ch', 'ce', 'ny', 'zh-CN', 'zh-TW', 'cv', 'chk', 'co',
    'crh', 'crh-Latn', 'hr', 'cs', 'da', 'fa-AF', 'dv', 'din', 'doi', 'dov', 'nl',
    'dyu', 'dz', 'en', 'eo', 'et', 'ee', 'fo', 'fj', 'tl', 'fi', 'fon', 'fr',
    'fr-CA', 'fr-FR', 'fr-CH', 'fy', 'fur', 'ff', 'gaa', 'gl', 'lg', 'ka', 'de',
    'el', 'gn', 'gu', 'ht', 'cnh', 'ha', 'haw', 'iw', 'hil', 'hi', 'hmn', 'hu',
    'hrx', 'iba', 'is', 'ig', 'ilo', 'id', 'ms', 'ja', 'ko', 'ku', 'ky', 'lo',
    'la', 'lv', 'lt', 'lb', 'mk', 'mg', 'ml', 'mt', 'mi', 'mr', 'mn', 'my', 'ne',
    'no', 'or', 'om', 'ps', 'fa', 'pl', 'pt', 'pt-BR', 'pa', 'qu', 'ro', 'ru',
    'sm', 'sa', 'gd', 'sr', 'st', 'sn', 'sd', 'si', 'sk', 'sl', 'so', 'es', 'su',
    'sw', 'sv', 'tg', 'ta', 'tt', 'te', 'th', 'ti', 'ts', 'tr', 'tk', 'tw', 'uk',
    'ur', 'ug', 'uz', 'vi', 'cy', 'xh', 'yi', 'yo', 'zu'
  ]; // 'id' = bahasa sumber, selalu tersedia
  var LS_PREFIX = 'i18n_pack_v' + PACK_VERSION + '_';
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, IFRAME: 1 };

  var dict = null;          // kamus aktif (null = bahasa Indonesia)
  var active = null;        // kode bahasa aktif, null = 'id'
  var lastErr = null;       // 'network' | 'invalid' | null -- dibaca index.html (O.lastError()) untuk keputusan online/offline
  var readyPromise = Promise.resolve(false);   // promise dari apply() TERAKHIR -- dibaca index.html (O.whenReady())
  var observer = null;
  var applying = false;
  var textRec = new WeakMap();   // Text node  -> {orig, applied}
  var attrRec = new WeakMap();   // Element    -> {attr: {orig, applied}}

  function norm(s) { return String(s).replace(/\s+/g, ' ').trim(); }   // sama dengan tools/extract-i18n.js

  // Sumber kebenaran = window.OFFLINE_LANG_PACKS / OFFLINE_LANG_ALIASES, dihasilkan otomatis oleh
  // tools/generate-packs.js dari paket yang BENAR-BENAR sudah diterjemahkan (lihat assets/js/lang-packs.js).
  // OFFLINE_LANGS di atas dipakai HANYA sebagai cadangan sebelum generate-packs.js pernah dijalankan
  // (window.OFFLINE_LANG_PACKS belum ada) -- begitu tersedia, dialah yang menentukan status offline sebenarnya,
  // sehingga bahasa yang belum diterjemahkan otomatis jatuh ke jalur "belum offline -> pakai internet".
  function realList() {
    return (global.OFFLINE_LANG_PACKS && global.OFFLINE_LANG_PACKS.length) ? global.OFFLINE_LANG_PACKS : OFFLINE_LANGS;
  }
  function realAliases() { return global.OFFLINE_LANG_ALIASES || {}; }

  function resolve(code) {
    if (!code) return null;
    var c = String(code).toLowerCase(), list = realList(), aliases = realAliases(), k;
    for (k in aliases) if (Object.prototype.hasOwnProperty.call(aliases, k) && k.toLowerCase() === c) return aliases[k];
    for (var i = 0; i < list.length; i++) if (list[i].toLowerCase() === c) return list[i];
    var base = c.split('-')[0];
    for (k in aliases) if (Object.prototype.hasOwnProperty.call(aliases, k) && k.toLowerCase().split('-')[0] === base) return aliases[k];
    for (var j = 0; j < list.length; j++) if (list[j].toLowerCase() === base) return list[j];
    return null;
  }

  function skipped(el) {
    for (; el && el.nodeType === 1; el = el.parentElement) {
      if (SKIP_TAGS[el.tagName]) return true;
      if (el.id === 'google_translate_element') return true;
      if (el.getAttribute('translate') === 'no' || el.hasAttribute('data-no-i18n') ||
          (el.classList && el.classList.contains('notranslate')) ||
          el.getAttribute('contenteditable') === 'true') return true;
    }
    return false;
  }

  function processText(node) {
    var cur = node.nodeValue;
    var rec = textRec.get(node);
    var orig = (rec && rec.applied === cur) ? rec.orig : cur;
    var tr = dict ? dict[norm(orig)] : undefined;
    if (tr !== undefined) {
      var out = orig.match(/^\s*/)[0] + tr + orig.match(/\s*$/)[0];
      if (out !== cur) node.nodeValue = out;
      textRec.set(node, { orig: orig, applied: out });
    } else if (rec) {
      if (rec.applied === cur && orig !== cur) node.nodeValue = orig;
      textRec.set(node, { orig: orig, applied: orig });
    }
  }

  function processAttrs(el) {
    var list = ATTRS;
    if (el.tagName === 'INPUT' && /^(button|submit|reset)$/i.test(el.type)) list = ATTRS.concat(['value']);
    var recs = attrRec.get(el);
    for (var i = 0; i < list.length; i++) {
      var a = list[i], cur = el.getAttribute(a);
      if (cur === null) continue;
      var rec = recs && recs[a];
      var orig = (rec && rec.applied === cur) ? rec.orig : cur;
      var tr = dict ? dict[norm(orig)] : undefined;
      if (tr !== undefined) {
        if (tr !== cur) el.setAttribute(a, tr);
        recs = recs || {}; recs[a] = { orig: orig, applied: tr };
      } else if (rec) {
        if (rec.applied === cur && orig !== cur) el.setAttribute(a, orig);
        recs[a] = { orig: orig, applied: orig };
      }
    }
    if (recs) attrRec.set(el, recs);
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (!skipped(root.parentElement)) processText(root); return; }
    if (root.nodeType !== 1 || skipped(root)) return;
    processAttrs(root);
    var tw = document.createTreeWalker(root, 1 | 4, null);   // ELEMENT | TEXT
    var n;
    while ((n = tw.nextNode())) {
      if (n.nodeType === 3) { if (!skipped(n.parentElement)) processText(n); }
      else if (!skipped(n)) processAttrs(n);
    }
  }

  function runAll() {
    applying = true;
    try { walk(document.body); } finally { applying = false; if (observer) observer.takeRecords(); }
  }

  function startObserver() {
    if (observer || !global.MutationObserver) return;
    observer = new MutationObserver(function (muts) {
      if (applying) return;
      applying = true;
      try {
        for (var i = 0; i < muts.length; i++) {
          var m = muts[i];
          if (m.type === 'childList') { for (var k = 0; k < m.addedNodes.length; k++) walk(m.addedNodes[k]); }
          else if (m.type === 'characterData') { if (!skipped(m.target.parentElement)) processText(m.target); }
          else if (m.type === 'attributes') { processAttrs(m.target); }
        }
      } finally { applying = false; observer.takeRecords(); }
    });
    observer.observe(document.documentElement, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRS.concat(['value'])
    });
  }

  function stopObserver() { if (observer) { observer.disconnect(); observer = null; } }

  // Paket valid = objek dengan cukup banyak entri. Paket kerangka (hanya ~9 kunci berisi teks
  // Indonesia yang sama) sebelumnya lolos sebagai "berhasil" sehingga UI tidak berubah sama sekali
  // dan Google Translate tidak pernah dipakai sebagai cadangan.
  function validPack(j) {
    return !!j && typeof j === 'object' && !Array.isArray(j) && Object.keys(j).length >= MIN_PACK_KEYS;
  }

  function loadPack(code) {
    var key = LS_PREFIX + code, cached = null;
    try { cached = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) {}
    if (cached && !validPack(cached)) {                 // buang cache rusak / kerangka
      cached = null;
      try { localStorage.removeItem(key); } catch (e) {}
    }

    // Mengambil file JSON berdasarkan lokasi relatif halaman
    var fresh = fetch(PACK_BASE + code + '.json')
      .then(function (r) {
        if (!r.ok) throw new Error('File ' + code + '.json tidak ditemukan (HTTP ' + r.status + ')');
        return r.json();
      })
      .then(function (j) {
        if (!validPack(j)) throw new Error("Paket '" + code + "' belum berisi terjemahan lengkap");
        try { localStorage.setItem(key, JSON.stringify(j)); } catch (e) {}
        return j;
      });

    if (cached) {
      fresh.catch(function (err) { console.warn("Latar belakang gagal menyegarkan:", err.message); });
      return Promise.resolve(cached);
    }

    return fresh.catch(function (err) {
      lastErr = navigator.onLine ? 'invalid' : 'network';    // dibaca lewat O.lastError() di index.html
      console.warn("Bahasa '" + code + "' belum tersedia secara offline:", err.message);
      return null;
    });
  }

  function t(str) {
    if (!dict || str == null) return str;
    var v = dict[norm(str)];
    return v !== undefined ? v : str;
  }

  function reset() {
    dict = null; active = null; lastErr = null; readyPromise = Promise.resolve(false);
    runAll();          // kembalikan semua teks asli
    stopObserver();
    try { global.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang: 'id', offline: true } })); } catch (e) {}
  }

  function apply(code) {
    if (!code || String(code).toLowerCase().split('-')[0] === 'id') { reset(); return Promise.resolve(true); }
    var pack = resolve(code);
    if (!pack) { lastErr = 'invalid'; readyPromise = Promise.resolve(false); return Promise.resolve(false); }
    lastErr = null;
    readyPromise = loadPack(pack).then(function (d) {
      if (!d) return false;
      dict = d; active = pack;
      startObserver();
      runAll();
      try { global.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang: pack, offline: true } })); } catch (e) {}
      return true;
    });
    return readyPromise;
  }

  global.OfflineI18n = {
    langs: OFFLINE_LANGS.slice(),
    hasPack: function (code) { return !!resolve(code); },
    isOffline: function (code) { return String(code).toLowerCase() === 'id' || !!resolve(code); },
    apply: apply,
    reset: reset,
    current: function () { return active || 'id'; },
    t: t,
    whenReady: function () { return readyPromise; },     // promise dari apply() TERAKHIR: true jika paket offline berhasil dipakai
    lastError: function () { return lastErr; }            // 'network' | 'invalid' | null
  };

  ['alert', 'confirm'].forEach(function (name) {
    var orig = global[name];
    if (typeof orig !== 'function') return;
    global[name] = function () {
      var args = Array.prototype.slice.call(arguments);
      args[0] = t(args[0]);
      return orig.apply(global, args);
    };
  });

  // Minta service worker mengunduh SEMUA paket bahasa ke cache (berjalan di latar belakang, saat online)
  function warmOffline() {
    try {
      if (!navigator.onLine || !navigator.serviceWorker || !navigator.serviceWorker.controller) return;
      navigator.serviceWorker.controller.postMessage({ action: 'warmLangPacks' });
    } catch (e) {}
  }

  function init() {
    var saved = null;
    try { saved = localStorage.getItem('user_lang_preference'); } catch (e) {}
    try {   // hapus cache paket versi lama
      for (var i = localStorage.length - 1; i >= 0; i--) {
        var k = localStorage.key(i);
        if (k && k.indexOf('i18n_pack_v') === 0 && k.indexOf(LS_PREFIX) !== 0) localStorage.removeItem(k);
      }
    } catch (e) {}
    if (saved && saved !== 'id' && resolve(saved)) apply(saved);
    if (document.readyState === 'complete') setTimeout(warmOffline, 3000);
    else global.addEventListener('load', function () { setTimeout(warmOffline, 3000); });
    global.addEventListener('online', warmOffline);
    if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('controllerchange', function () { setTimeout(warmOffline, 1000); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

})(window);

export const OfflineI18n = window.OfflineI18n;

