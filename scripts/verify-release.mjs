#!/usr/bin/env node
/**
 * [AI-GENERATED][QA][V188] Dependency-free release checks for Timer Proofer.
 * Run with: npm run test:release
 * This is static verification, not a substitute for browser/device E2E tests.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ignoredDirectories = new Set(['node_modules', '.git', 'android', 'ios', 'www/node_modules']);
const webRoot = path.join(root, 'www');
const files = [];
function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);
        const relative = path.relative(root, fullPath).split(path.sep).join('/');
        if (entry.isDirectory()) {
            if (!ignoredDirectories.has(relative) && !relative.startsWith('node_modules/')) walk(fullPath);
        } else if (entry.isFile()) {
            files.push({ fullPath, relative });
        }
    }
}
walk(root);
const failures = [];
const jsFiles = files.filter(({ relative }) => relative.endsWith('.js') || relative.endsWith('.mjs'));
for (const file of jsFiles) {
    const check = spawnSync(process.execPath, ['--check', file.fullPath], { encoding: 'utf8' });
    if (check.status !== 0) failures.push(`Sintaks JS gagal: ${file.relative}\n${check.stderr || check.stdout}`);
}

let missingImports = 0;
// [AI-GENERATED][QA][V200] Match side-effect, static, dynamic, and re-export relative imports.
const importPattern = /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)['"](\.{1,2}\/[^'"]+)['"]/g;
for (const file of jsFiles) {
    const source = fs.readFileSync(file.fullPath, 'utf8');
    for (const match of source.matchAll(importPattern)) {
        const specifier = match[1].split(/[?#]/, 1)[0];
        const target = path.resolve(path.dirname(file.fullPath), specifier);
        if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
            missingImports += 1;
            failures.push(`Import relatif tidak ditemukan: ${file.relative} -> ${match[1]}`);
        }
    }
}

// [AI-GENERATED][QA][V199] Prevent legacy modules from overriding the canonical scroll-lock owner.
let scrollLockOverrides = 0;
for (const file of jsFiles.filter(({ relative }) => relative.startsWith('assets/js/') && relative !== 'assets/js/modal-bootstrap.js')) {
    const source = fs.readFileSync(file.fullPath, 'utf8');
    for (const match of source.matchAll(/document\.body\.style\.overflow\s*=/g)) {
        scrollLockOverrides += 1;
        failures.push(`Mutasi body scroll lock di luar modal-bootstrap.js: ${file.relative} (offset ${match.index})`);
    }
}

const htmlFiles = files.filter(({ relative }) => relative.endsWith('.html'));
let idCount = 0;
let duplicateIds = 0;
let inlineHandlers = 0;
for (const file of htmlFiles) {
    const source = fs.readFileSync(file.fullPath, 'utf8');
    const ids = new Set();
    for (const match of source.matchAll(/\bid\s*=\s*(["'])(.*?)\1/gi)) {
        idCount += 1;
        if (ids.has(match[2])) {
            duplicateIds += 1;
            failures.push(`ID duplikat di ${file.relative}: ${match[2]}`);
        }
        ids.add(match[2]);
    }
    const eventMatches = [...source.matchAll(/\s(on[a-z]+)\s*=/gi)];
    inlineHandlers += eventMatches.length;
    for (const match of eventMatches) failures.push(`Handler event inline di ${file.relative}: ${match[1]}`);
}

// [AI-GENERATED][QA][V199] Ensure the advertised local start command has an entrypoint.
const packagePath = path.join(root, 'package.json');
if (!fs.existsSync(packagePath)) failures.push('package.json tidak ditemukan.');
else {
    try {
        const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        if (String(packageData.scripts?.start || '').includes('server.js') && !fs.existsSync(path.join(root, 'server.js'))) {
            failures.push('Script npm start menunjuk ke server.js yang tidak ditemukan.');
        }
    } catch (error) {
        failures.push(`package.json tidak valid: ${error.message}`);
    }
}

const metadataFiles = ['version.json', 'assets/js/version.json'];
const metadata = metadataFiles.map((name) => {
    const fullPath = path.join(root, name);
    if (!fs.existsSync(fullPath)) {
        failures.push(`Metadata versi tidak ditemukan: ${name}`);
        return null;
    }
    try { return { name, data: JSON.parse(fs.readFileSync(fullPath, 'utf8')) }; }
    catch (error) { failures.push(`JSON metadata tidak valid (${name}): ${error.message}`); return null; }
}).filter(Boolean);
if (metadata.length === 2 && JSON.stringify(metadata[0].data) !== JSON.stringify(metadata[1].data)) {
    failures.push('version.json dan assets/js/version.json tidak sinkron.');
}
const version = metadata[0]?.data;
if (version) {
    const htmlPath = path.join(webRoot, 'index.html');
    if (!fs.existsSync(htmlPath)) failures.push('index.html tidak ditemukan.');
    else {
        const html = fs.readFileSync(htmlPath, 'utf8');
        const releaseToken = typeof version.releaseToken === 'string' && version.releaseToken.trim()
            ? version.releaseToken.trim()
            : `${String(version.releaseDate).replaceAll('-', '')}-${String(version.version).toLowerCase()}`;
        if (!html.includes(`runtime-entry.js?v=${releaseToken}`)) {
            failures.push(`Cache-busting runtime-entry.js tidak cocok dengan versi ${version.version}.`);
        }
        if (/\bsrc=[\"']\.\/assets\/js\/modal-bootstrap\.js/i.test(html)) {
            failures.push('modal-bootstrap.js harus dimuat melalui graph ES6 Module, bukan script klasik di HTML.');
        }
        const runtimeEntryPath = path.join(root, 'assets/js/runtime-entry.js');
        const runtimeEntrySource = fs.existsSync(runtimeEntryPath) ? fs.readFileSync(runtimeEntryPath, 'utf8') : '';
        if (!runtimeEntrySource.includes(`boot.js?v=${releaseToken}`)) {
            failures.push(`Import dinamis boot.js tidak cocok dengan token rilis ${releaseToken}.`);
        }
        if (!runtimeEntrySource.includes(`modal-bootstrap.js?v=${releaseToken}`) ||
            !/await\s+import\(['\"]\.\/modal-bootstrap\.js\?v=[^'\"]+['\"]\)[\s\S]*initializeModalBootstrap\(\)[\s\S]*await\s+initializeRuntimeBootstrap\(\)/.test(runtimeEntrySource)) {
            failures.push('Runtime entry harus memuat dan menginisialisasi modul modal sebelum startup asinkron, dengan cache-busting versi yang benar.');
        }
        // [AI-GENERATED][QA][V259] Payment gateway browser code must be lazy-loaded through its ES module adapter.
        if (/<script\b[^>]*\bsrc\s*=\s*[\"'][^\"']*snap\.js/i.test(html)) {
            failures.push('Midtrans Snap tidak boleh dimuat secara eager melalui tag script di HTML.');
        }
        if (!/meta\s+name=[\"']midtrans-snap-config[\"'][^>]*data-client-key=/i.test(html)) {
            failures.push('Konfigurasi Client Key publik Midtrans tidak ditemukan pada meta midtrans-snap-config.');
        }
        const languageEnginePath = path.join(root, 'assets/js/language-engine.js');
        const languageEngine = fs.existsSync(languageEnginePath) ? fs.readFileSync(languageEnginePath, 'utf8') : '';
        if (!/from\s+[\"']\.\/midtrans-runtime\.js[\"']/.test(languageEngine) || !/await\s+loadMidtransSnap\(\)/.test(languageEngine)) {
            failures.push('Checkout harus menggunakan Midtrans melalui adapter ES6 Module midtrans-runtime.js.');
        }
        if (!fs.existsSync(path.join(root, 'assets/js/midtrans-runtime.js'))) {
            failures.push('Adapter ES6 Module assets/js/midtrans-runtime.js tidak ditemukan.');
        }
        const moduleManifestPath = path.join(root, 'assets/js/module-manifest.js');
        const moduleManifestSource = fs.existsSync(moduleManifestPath) ? fs.readFileSync(moduleManifestPath, 'utf8') : '';
        if (!moduleManifestSource.includes('midtrans-runtime.js')) {
            failures.push('midtrans-runtime.js belum terdaftar pada module-manifest.js.');
        }
        // [AI-GENERATED][QA][V260] Google Translate's callback-driven SDK stays behind an ES-module adapter.
        const googleTranslatePath = path.join(root, 'assets/js/google-translate-runtime.js');
        const googleTranslateRuntime = fs.existsSync(googleTranslatePath) ? fs.readFileSync(googleTranslatePath, 'utf8') : '';
        if (!fs.existsSync(googleTranslatePath)) failures.push('Adapter ES6 Module google-translate-runtime.js tidak ditemukan.');
        if (!/from\s+[\"']\.\/google-translate-runtime\.js[\"']/.test(languageEngine) || !/await\s+loadGoogleTranslateWidget\(/.test(languageEngine)) {
            failures.push('language-engine.js harus memuat Google Translate melalui adapter ES6 Module.');
        }
        if (/function\s+gtLoadScript\s*\(/.test(languageEngine)) failures.push('Loader skrip Google Translate lama belum dipindahkan dari language-engine.js.');
        if (!moduleManifestSource.includes('google-translate-runtime.js')) failures.push('google-translate-runtime.js belum terdaftar pada module-manifest.js.');
        if (!googleTranslateRuntime.includes('googleTranslateElementInit')) failures.push('Bridge callback Google Translate tidak ditemukan pada adapter.');
        // [AI-GENERATED][QA][V261] OfflineI18n must be a canonical ES6 Module export.
        const offlineI18nPath = path.join(root, 'assets/js/offline-i18n.js');
        const offlineI18nSource = fs.existsSync(offlineI18nPath) ? fs.readFileSync(offlineI18nPath, 'utf8') : '';
        const appCoreSource = fs.readFileSync(path.join(root, 'assets/js/app-core.js'), 'utf8');
        if (!/export\s+const\s+OfflineI18n\s*=\s*\{/.test(offlineI18nSource)) {
            failures.push('offline-i18n.js harus mengekspor objek OfflineI18n sebagai ES6 Module.');
        }
        if (!/import\s+\{\s*OFFLINE_LANG_PACKS\s*,\s*OFFLINE_LANG_ALIASES\s*\}\s+from\s+[\"']\.\/lang-packs\.js[\"']/.test(offlineI18nSource) || /global\.OFFLINE_LANG_(?:PACKS|ALIASES)/.test(offlineI18nSource)) {
            failures.push('offline-i18n.js harus mengimpor metadata bahasa melalui ekspor modul, bukan global yang dapat berubah.');
        }
        if (!/global\.OfflineI18n\s*=\s*OfflineI18n/.test(offlineI18nSource)) {
            failures.push('Bridge window.OfflineI18n untuk pemanggil legacy harus tetap tersedia.');
        }
        if (/^\s*\(function\s*\(global\)/m.test(offlineI18nSource)) {
            failures.push('Wrapper IIFE lama offline-i18n.js belum direkonstruksi menjadi ES6 Module.');
        }
        if (!/import\s+\{\s*OfflineI18n\s*\}\s+from\s+[\"']\.\/offline-i18n\.js[\"']/.test(languageEngine) || /window\.OfflineI18n/.test(languageEngine)) {
            failures.push('language-engine.js harus memakai binding OfflineI18n dari ES6 Module, bukan global bridge.');
        }
        if (!/import\s+\{\s*OfflineI18n\s*\}\s+from\s+[\"']\.\/offline-i18n\.js[\"']/.test(appCoreSource) || /window\.OfflineI18n/.test(appCoreSource)) {
            failures.push('app-core.js harus memakai binding OfflineI18n dari ES6 Module, bukan global bridge.');
        }
        if (!moduleManifestSource.includes('offline-i18n.js')) failures.push('offline-i18n.js belum terdaftar pada module-manifest.js.');

        // [AI-GENERATED][QA][V263] The modal core must be consumed via ESM exports internally.
        const modalBootstrapPath = path.join(root, 'assets/js/modal-bootstrap.js');
        const modalBootstrapSource = fs.existsSync(modalBootstrapPath) ? fs.readFileSync(modalBootstrapPath, 'utf8') : '';
        if (!/export\s+function\s+getModalCore\(/.test(modalBootstrapSource) || !/export\s+function\s+syncModalBodyScrollLock\(/.test(modalBootstrapSource)) {
            failures.push('modal-bootstrap.js harus mengekspor getModalCore dan syncModalBodyScrollLock.');
        }
        const modalCoreConsumers = [
            'assets/js/app-core.js',
            'assets/js/app-lifecycle-service.js',
            'assets/js/language-engine.js',
            'assets/js/notification-service.js',
            'assets/js/modal.js'
        ];
        for (const consumerPath of modalCoreConsumers) {
            const consumer = fs.readFileSync(path.join(root, consumerPath), 'utf8');
            const expectedModalSpecifier = './' + `modal-bootstrap.js?v=${releaseToken}`;
            const modalImports = [...consumer.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)[\"'](\.{1,2}\/[^\"']+)[\"']/g)].map((match) => match[1]);
            if (!modalImports.includes(expectedModalSpecifier)) {
                failures.push(`${consumerPath} harus menggunakan URL ES6 Module modal-bootstrap.js yang sama dengan token rilis ${releaseToken}.`);
            }
            if (!/import\s+\{[^}]*syncModalBodyScrollLock[^}]*\}\s+from\s+[\"']\.\/modal-bootstrap\.js\?v=[^\"']+[\"']/.test(consumer)) {
                failures.push(`${consumerPath} harus menggunakan syncModalBodyScrollLock melalui ES6 Module.`);
            }
            if (/window\.__TPModalCore/.test(consumer)) {
                failures.push(`${consumerPath} masih membaca global mutable window.__TPModalCore secara langsung.`);
            }
        }
        if (!moduleManifestSource.includes('modal-bootstrap.js')) failures.push('modal-bootstrap.js belum tercatat di module-manifest.js.');

        // [AI-GENERATED][QA][V268] app-core must bind the lifecycle initializer through the canonical ESM module.
        const lifecyclePath = path.join(root, 'assets/js/app-lifecycle-service.js');
        const lifecycleSource = fs.existsSync(lifecyclePath) ? fs.readFileSync(lifecyclePath, 'utf8') : '';
        const bootPath = path.join(root, 'assets/js/boot.js');
        const bootSource = fs.existsSync(bootPath) ? fs.readFileSync(bootPath, 'utf8') : '';
        if (!/export\s+\{[^}]*\binit\b/.test(lifecycleSource) || !/function\s+init\(/.test(lifecycleSource)) {
            failures.push('app-lifecycle-service.js harus mengekspor initializer init sebagai ES6 Module.');
        }
        if (!/import\s+\{\s*init\s+as\s+initializeAppLifecycle\s*,?\s*(?:setTimerBackGuard\s*)?\}\s+from\s+["']\.\/app-lifecycle-service\.js["']/.test(appCoreSource)) {
            failures.push('app-core.js harus mengimpor initializer lifecycle melalui named export ES6 Module.');
        }
        if (!/initializeAppLifecycle\(\{/.test(appCoreSource) || /window\.AppLifecycleService\?\.init/.test(appCoreSource)) {
            failures.push('app-core.js harus menginisialisasi lifecycle melalui binding modul, bukan window.AppLifecycleService.');
        }
        if (!/import\s+[\"']\.\/app-lifecycle-service\.js[\"']/.test(bootSource)) {
            failures.push('boot.js dan app-core.js harus mengacu pada URL kanonis app-lifecycle-service.js yang sama.');
        }

        // [AI-GENERATED][QA][V262] Language-list filtering is a first-class service module.
        const languageListPath = path.join(root, 'assets/js/language-list-service.js');
        const languageListSource = fs.existsSync(languageListPath) ? fs.readFileSync(languageListPath, 'utf8') : '';
        const languageRendererPath = path.join(root, 'assets/js/lang-renderer.js');
        const languageRendererSource = fs.existsSync(languageRendererPath) ? fs.readFileSync(languageRendererPath, 'utf8') : '';
        if (!fs.existsSync(languageListPath)) failures.push('language-list-service.js tidak ditemukan.');
        if (!/export\s+function\s+filterDaftarBahasa\(/.test(languageListSource)) failures.push('language-list-service.js harus mengekspor filterDaftarBahasa sebagai ES6 Module.');
        if (!/import\s+\{\s*filterDaftarBahasa\s*\}\s+from\s+[\"']\.\/language-list-service\.js[\"']/.test(languageEngine)) failures.push('language-engine.js harus mengimpor filterDaftarBahasa dari layanan ES6 Module.');
        if (!/export\s+\{[^}]*filterDaftarBahasa[^}]*pilihBahasaGlobal/s.test(languageEngine)) failures.push('language-engine.js harus mengekspor filterDaftarBahasa dan pilihBahasaGlobal.');
        if (!/import\s+\{\s*pilihBahasaGlobal\s*\}\s+from\s+[\"']\.\/language-engine\.js[\"']/.test(languageRendererSource) || /window\.pilihBahasaGlobal/.test(languageRendererSource)) failures.push('lang-renderer.js harus memanggil pilihBahasaGlobal melalui binding modul, bukan global mutable.');
        if (!moduleManifestSource.includes('language-list-service.js')) failures.push('language-list-service.js belum terdaftar pada module-manifest.js.');

        // [AI-GENERATED][QA][V266] Language data must be consumed through ESM, not a dead mutable window global.
        const languageDataPath = path.join(root, 'assets/js/lang-data.js');
        const languageDataSource = fs.existsSync(languageDataPath) ? fs.readFileSync(languageDataPath, 'utf8') : '';
        if (!/export\s+const\s+daftarBahasa\s*=/.test(languageDataSource)) {
            failures.push('lang-data.js harus menyediakan daftarBahasa sebagai named ES6 Module export.');
        }
        if (/window\.daftarBahasa/.test(languageDataSource)) {
            failures.push('lang-data.js tidak boleh membuat global window.daftarBahasa yang tidak digunakan oleh konsumen internal.');
        }
        if (!/import\s+\{\s*daftarBahasa\s*\}\s+from\s+[\"']\.\/lang-data\.js[\"']/.test(languageRendererSource)) {
            failures.push('lang-renderer.js harus mengimpor daftarBahasa secara langsung melalui ES6 Module.');
        }
        // [AI-GENERATED][QA][V267] Bakery ingredient persistence must consume StorageService through ESM.
        const bakeryIngredientPath = path.join(root, 'assets/js/bakery-ingredient-service.js');
        const bakeryIngredientSource = fs.existsSync(bakeryIngredientPath) ? fs.readFileSync(bakeryIngredientPath, 'utf8') : '';
        if (!/import\s+\{\s*StorageService\s*\}\s+from\s+[\"']\.\/storage-service\.js[\"']/.test(bakeryIngredientSource)) {
            failures.push('bakery-ingredient-service.js StorageService harus diimpor melalui named export ES6 Module.');
        }
        if (/window\.StorageService/.test(bakeryIngredientSource)) {
            failures.push('bakery-ingredient-service.js masih bergantung pada global mutable window.StorageService.');
        }
        for (const call of ['getJSONSync', 'getJSON', 'setJSON']) {
            if (!new RegExp('StorageService\\.' + call + '\\(').test(bakeryIngredientSource)) {
                failures.push(`bakery-ingredient-service.js harus menggunakan StorageService.${call} dari binding modul.`);
            }
        }
        // [AI-GENERATED][QA][V269] Do not report a successful ingredient save when an active storage backend failed.
        if (!/const saved = await StorageService\.setJSON\(BAKERY_INGREDIENTS_KEY, normalized\)/.test(bakeryIngredientSource)
            || !/if \(saved !== true\)[\s\S]*?BAKERY_INGREDIENT_PERSIST_FAILED/.test(bakeryIngredientSource)) {
            failures.push('bakery-ingredient-service.js harus menolak status sukses jika StorageService tidak mengonfirmasi persistensi.');
        }
        if (!/void BakeryIngredientService\.persist\(snapshot\)\.then\([\s\S]*?\.catch\(\(error\) => \{[\s\S]*?Penyimpanan Bahan Gagal/.test(appCoreSource)) {
            failures.push('app-core.js harus menangani kegagalan persistensi bahan, menampilkan peringatan, dan menghindari unhandled rejection.');
        }

        // [AI-GENERATED][QA][V270] ProofingService is an ES-module dependency, not a mutable global.
        const proofingServicePath = path.join(root, 'assets/js/proofing-service.js');
        const proofingServiceSource = fs.existsSync(proofingServicePath) ? fs.readFileSync(proofingServicePath, 'utf8') : '';
        if (!/export\s+const\s+ProofingService\s*=\s*Object\.freeze\(/.test(proofingServiceSource)) {
            failures.push('proofing-service.js harus mengekspor ProofingService sebagai named ES6 Module export.');
        }
        if (/window\.ProofingService\s*=/.test(proofingServiceSource)) {
            failures.push('proofing-service.js tidak boleh menerbitkan global window.ProofingService yang tidak dibutuhkan konsumen internal.');
        }
        if (!/import\s+\{\s*ProofingService\s*\}\s+from\s+[\"']\.\/proofing-service\.js[\"']/.test(appCoreSource)) {
            failures.push('app-core.js harus mengimpor ProofingService melalui named export ES6 Module.');
        }
        if (/typeof\s+ProofingService/.test(appCoreSource) || /window\.ProofingService/.test(appCoreSource)) {
            failures.push('app-core.js tidak boleh memperlakukan binding ProofingService ESM sebagai global opsional.');
        }

        // [AI-GENERATED][QA][V271] Services with in-repository ESM consumers must not publish unused mutable window aliases.
        const orphanedServiceAliases = [
            { file: 'assets/js/profile-service.js', globalName: 'ProfileDataService', exportPattern: /export\s+const\s+ProfileService\s*=\s*Object\.freeze\(/ },
            { file: 'assets/js/weather-service.js', globalName: 'WeatherService', exportPattern: /export\s+const\s+WeatherService\s*=\s*Object\.freeze\(/ },
            { file: 'assets/js/recipe-domain-service.js', globalName: 'RecipeDomainService', exportPattern: /export\s+const\s+RecipeDomainService\s*=\s*Object\.freeze\(/ },
            { file: 'assets/js/native-capacitor-service.js', globalName: 'NativeCapacitorService', exportPattern: /const\s+NativeCapacitorService\s*=\s*Object\.freeze\([\s\S]*?\);[\s\S]*?export\s*\{[^}]*NativeCapacitorService/s },
            { file: 'assets/js/proofing-completion-service.js', globalName: 'ProofingCompletionService', exportPattern: /export\s+const\s+ProofingCompletionService\s*=\s*Object\.freeze\(/ }
        ];
        for (const contract of orphanedServiceAliases) {
            const fullPath = path.join(root, contract.file);
            const source = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
            if (!source) failures.push(`Layanan ES6 Module tidak ditemukan: ${contract.file}`);
            if (source && !contract.exportPattern.test(source)) failures.push(`${contract.file} tidak menyediakan ekspor modul kanonis yang diharapkan.`);
            if (new RegExp(`window\\.${contract.globalName}\\s*=`).test(source)) {
                failures.push(`${contract.file} tidak boleh menerbitkan alias global window.${contract.globalName} tanpa konsumen internal.`);
            }
        }
        const nativeConsumers = ['assets/js/app-core.js', 'assets/js/storage-service.js', 'assets/js/proofing-alarm-service.js', 'assets/js/proofing-notification-service.js', 'assets/js/pwa.js'];
        for (const consumerName of nativeConsumers) {
            const consumerPath = path.join(root, consumerName);
            const source = fs.existsSync(consumerPath) ? fs.readFileSync(consumerPath, 'utf8') : '';
            if (!/import\s*\{[^}]*NativeCapacitorService[^}]*\}\s*from\s*['"]\.\/native-capacitor-service\.js['"]/.test(source)) {
                failures.push(`${consumerName} harus memakai NativeCapacitorService melalui impor ES6 Module langsung.`);
            }
        }
        if (!/import\s+\{\s*ProfileService\s+as\s+ProfileDataService\s*\}\s+from\s+['"]\.\/profile-service\.js['"]/.test(appCoreSource)) {
            failures.push('app-core.js harus memakai ProfileService melalui named import ES6 Module.');
        }
        if (!/import\s+\{\s*fetchWeather\s*,\s*fetchElevation\s*\}\s+from\s+['"]\.\/weather-service\.js['"]/.test(appCoreSource)) {
            failures.push('app-core.js harus memakai fetchWeather dan fetchElevation melalui named import ES6 Module.');
        }
        if (!/import\s+\{\s*RecipeDomainService\s*\}\s+from\s+['"]\.\/recipe-domain-service\.js['"]/.test(appCoreSource)) {
            failures.push('app-core.js harus memakai RecipeDomainService melalui named import ES6 Module.');
        }
        if (!/import\s+\{\s*ProofingCompletionService\s*\}\s+from\s+['"]\.\/proofing-completion-service\.js['"]/.test(appCoreSource)) {
            failures.push('app-core.js harus memakai ProofingCompletionService melalui named import ES6 Module.');
        }

        // [AI-GENERATED][QA][V273] Keep canonical service APIs module-scoped when no runtime consumer needs window aliases.
        const esmOnlyServices = [
            { file: 'assets/js/auth-service.js', globalName: 'AuthService', exportPattern: /export\s+const\s+AuthService\s*=\s*Object\.freeze\(/ },
            { file: 'assets/js/storage-service.js', globalName: 'StorageService', exportPattern: /export\s+const\s+StorageService\s*=\s*Object\.freeze\(/ },
            { file: 'assets/js/bakery-ingredient-service.js', globalName: 'BakeryIngredientService', exportPattern: /export\s+const\s+BakeryIngredientService\s*=\s*Object\.freeze\(/ }
        ];
        for (const contract of esmOnlyServices) {
            const modulePath = path.join(root, contract.file);
            const moduleSource = fs.existsSync(modulePath) ? fs.readFileSync(modulePath, 'utf8') : '';
            if (!moduleSource) failures.push(`Modul layanan tidak ditemukan: ${contract.file}`);
            if (moduleSource && !contract.exportPattern.test(moduleSource)) failures.push(`${contract.file} harus mempertahankan named export ES6 Module.`);
            if (new RegExp(`window\\.${contract.globalName}\\s*=`).test(moduleSource)) {
                failures.push(`${contract.file} tidak boleh menerbitkan global window.${contract.globalName}; konsumen runtime harus memakai named import.`);
            }
        }
        const authCoreSource = appCoreSource;
        const authRuntimeEntrySource = runtimeEntrySource;
        if (!/import\s+\{\s*AuthService\s*\}\s+from\s+[\"']\.\/auth-service\.js[\"']/.test(authCoreSource)) {
            failures.push('app-core.js harus menggunakan AuthService melalui named import ES6 Module.');
        }
        if (!/import\([\"']\.\/auth-service\.js[\"']\)/.test(authRuntimeEntrySource) || !/\.then\(\(\{\s*AuthService\s*\}\)/.test(authRuntimeEntrySource)) {
            failures.push('runtime-entry.js harus menginisialisasi AuthService melalui impor dinamis ES6 Module.');
        }
        if (!/import\s+\{\s*StorageService\s*\}\s+from\s+[\"']\.\/storage-service\.js[\"']/.test(authCoreSource)) {
            failures.push('app-core.js harus menggunakan StorageService melalui named import ES6 Module.');
        }
        if (!/import\s+\{\s*BakeryIngredientService\s*\}\s+from\s+[\"']\.\/bakery-ingredient-service\.js[\"']/.test(authCoreSource)) {
            failures.push('app-core.js harus menggunakan BakeryIngredientService melalui named import ES6 Module.');
        }
        // [AI-GENERATED][QA][V272] Internal notification consumers use the named ESM binding.
        const notificationSource = fs.readFileSync(path.join(root, 'assets/js/notification-service.js'), 'utf8');
        const modalBootstrapSourceForNotifications = fs.readFileSync(path.join(root, 'assets/js/modal-bootstrap.js'), 'utf8');
        if (!/export\s+const\s+NotifSystem\s*=/.test(notificationSource)) {
            failures.push('notification-service.js harus mengekspor NotifSystem melalui named export ES6 Module.');
        }
        if (!/window\.NotifSystem\s*=\s*NotifSystem/.test(notificationSource)) {
            failures.push('Bridge window.NotifSystem untuk kompatibilitas legacy harus tetap tersedia.');
        }
        const notificationConsumers = [
            'assets/js/app-core.js',
            'assets/js/features-preferences.js',
            'assets/js/proofing-completion-service.js',
            'assets/js/recipe-storage-service.js',
            'assets/js/core/event-delegation.js'
        ];
        for (const consumerPath of notificationConsumers) {
            const consumer = fs.readFileSync(path.join(root, consumerPath), 'utf8');
            if (!/import\s+\{\s*NotifSystem\s*\}\s+from\s+['"](?:\.\/|\.\.\/)notification-service\.js['"]/.test(consumer)) {
                failures.push(`${consumerPath} harus mengimpor NotifSystem melalui named export ES6 Module.`);
            }
            if (/window\.NotifSystem/.test(consumer)) {
                failures.push(`${consumerPath} masih membaca NotifSystem melalui global mutable.`);
            }
        }
        if (!/export\s+function\s+registerNotificationModalHooks\(/.test(modalBootstrapSourceForNotifications) ||
            !/notificationModalHooks\.renderList\s*\|\|\s*window\.NotifSystem/.test(modalBootstrapSourceForNotifications)) {
            failures.push('Modal bootstrap harus memprioritaskan callback ESM notifikasi dengan fallback legacy terkontrol.');
        }
        if (!/registerNotificationModalHooks\(\{[\s\S]*renderList:[\s\S]*updateBadge:/.test(notificationSource)) {
            failures.push('notification-service.js harus mendaftarkan renderList dan updateBadge ke modal bootstrap.');
        }

        for (const consumer of jsFiles.filter(({ relative }) => relative.startsWith('assets/js/') && relative !== 'assets/js/lang-data.js')) {
            const source = fs.readFileSync(consumer.fullPath, 'utf8');
            if (/window\.daftarBahasa/.test(source)) {
                failures.push(`Konsumen ${consumer.relative} masih mengakses window.daftarBahasa; gunakan named import dari lang-data.js.`);
            }
        }

        // [AI-GENERATED][QA][V274] Recipe-copy persistence must be atomic, truthful,
        // owner-scoped, and isolated from mutable global Supabase lookups.
        const recipeStoragePath = path.join(root, 'assets/js/recipe-storage-service.js');
        const recipeStorageSource = fs.existsSync(recipeStoragePath) ? fs.readFileSync(recipeStoragePath, 'utf8') : '';
        if (!/async function duplicateAndSaveRecipe\(/.test(recipeStorageSource)
            || !/duplicateAndSave:\s*duplicateAndSaveRecipe/.test(recipeStorageSource)) {
            failures.push('RecipeStorageService harus menyediakan transaksi duplicateAndSave melalui named module API.');
        }
        if (/saved\s*\|\|\s*normalized\.length\s*===\s*0/.test(recipeStorageSource)) {
            failures.push('Penyimpanan daftar resep kosong tidak boleh dilaporkan sukses tanpa konfirmasi penulisan.');
        }
        if (!/preserveLeadingItems\s*\?\s*normalized\.slice\(0,\s*limit\)/.test(recipeStorageSource)) {
            failures.push('Fallback batas penyimpanan pada duplikasi resep harus mempertahankan resep baru di awal daftar.');
        }
        const copyHandlerMatch = appCoreSource.match(/card\.querySelector\(['\"]\.recipe-copy-btn['\"]\)\.addEventListener\(['\"]click['\"], async \(e\) => \{([\s\S]*?)card\.querySelector\(['\"]\.recipe-share-btn/);
        if (!copyHandlerMatch || !/RecipeStorageService\.duplicateAndSave\(duplicatedRecipe/.test(copyHandlerMatch[1])) {
            failures.push('Handler salin resep harus memakai transaksi persistensi RecipeStorageService.');
        }
        if (copyHandlerMatch && (!/catch\s*\(persistError\)/.test(copyHandlerMatch[1]) || !/getActiveOwnerId/.test(copyHandlerMatch[1]))) {
            failures.push('Handler salin resep harus menangani kegagalan simpan dan memvalidasi pemilik sebelum mengubah UI.');
        }
        if (/typeof\s+supabase\s*!==\s*['\"]undefined['\"]/.test(appCoreSource)
            || /syncRecipeToSupabase\(supabase\s*,/.test(appCoreSource)) {
            failures.push('app-core.js tidak boleh memakai global Supabase untuk gating atau sinkronisasi resep.');
        }

        // [AI-GENERATED][QA][V275] Deleting a recipe must validate the owner
        // captured at invocation time before any local destructive write.
        const deleteOwnerTestPath = path.join(root, 'tests/recipe-delete-owner-race.test.mjs');
        const deleteOwnerTestSource = fs.existsSync(deleteOwnerTestPath) ? fs.readFileSync(deleteOwnerTestPath, 'utf8') : '';
        const deleteInternalStart = recipeStorageSource.indexOf('async function deleteRecipeEverywhereInternal(');
        const deleteInternalEnd = recipeStorageSource.indexOf('// [AI-GENERATED][ROBUSTNESS][V94] Public persistence/sync boundaries', deleteInternalStart);
        const deleteInternalSource = deleteInternalStart >= 0 && deleteInternalEnd > deleteInternalStart
            ? recipeStorageSource.slice(deleteInternalStart, deleteInternalEnd)
            : '';
        if (!/const expectedLocalOwnerId = normalizeOwnerId\(activeRecipeOwnerId\);\s*const expectedOwnerId = await captureOwnerId\(supabaseClient\)/.test(recipeStorageSource)) {
            failures.push('RecipeStorageService harus menangkap namespace lokal sebelum menunggu capture auth pada penghapusan resep.');
        }
        if (!/if \(!localRecipeOwnerMatches\(expectedLocalOwnerId\)\)\s*\{\s*return createAbortedRecipeDeleteResult/.test(deleteInternalSource)) {
            failures.push('Penghapusan resep harus membatalkan operasi jika namespace lokal berbeda dari pemilik yang ditangkap.');
        }
        if (!/if \(supabaseClient\?\.auth && !expectedOwnerId\)/.test(deleteInternalSource)) {
            failures.push('Penghapusan resep harus menolak mutasi destruktif jika client autentikasi tidak memiliki pemilik yang valid.');
        }
        if (!fs.existsSync(deleteOwnerTestPath) || !/stale delete captured for owner A cannot delete a recipe after owner B becomes active/.test(deleteOwnerTestSource)) {
            failures.push('Tes race condition V275 untuk pergantian pemilik saat penghapusan resep harus tersedia.');
        }


        // [AI-GENERATED][QA][V276] All local recipe writes and cloud sync
        // boundaries must be bound to the owner active when the operation starts.
        const ownerWriteTestPath = path.join(root, 'tests/recipe-write-owner-race.test.mjs');
        const ownerWriteTestSource = fs.existsSync(ownerWriteTestPath) ? fs.readFileSync(ownerWriteTestPath, 'utf8') : '';
        const saveRecipeListStart = recipeStorageSource.indexOf('async function saveRecipeList(');
        const saveRecipeListEnd = recipeStorageSource.indexOf('// [AI-GENERATED][ROBUSTNESS][V276]', saveRecipeListStart);
        const saveRecipeListSource = saveRecipeListStart >= 0 && saveRecipeListEnd > saveRecipeListStart
            ? recipeStorageSource.slice(saveRecipeListStart, saveRecipeListEnd)
            : '';
        const upsertPublicStart = recipeStorageSource.indexOf('async function upsertRecipePublic(');
        const upsertPublicEnd = recipeStorageSource.indexOf('export const RecipeStorageService', upsertPublicStart);
        const upsertPublicSource = upsertPublicStart >= 0 && upsertPublicEnd > upsertPublicStart
            ? recipeStorageSource.slice(upsertPublicStart, upsertPublicEnd)
            : '';
        if (!/const hasExplicitOwner = Object\.prototype\.hasOwnProperty\.call\(options, 'expectedOwnerId'\)[\s\S]*?const expectedOwnerId = normalizeOwnerId\(hasExplicitOwner \? options\.expectedOwnerId : activeRecipeOwnerId\)[\s\S]*?return runRecipeOperation\(async \(\) => \{[\s\S]*?assertActiveRecipeOwner\(expectedOwnerId[\s\S]*?await validateBeforeCommit\(\{ ownerId: expectedOwnerId \}\)/.test(saveRecipeListSource)) {
            failures.push('saveList harus menangkap owner eksplisit dan memvalidasi konteks sebelum commit di antrean FIFO.');
        }
        if (!/const expectedOwnerId = normalizeOwnerId\(activeRecipeOwnerId\)[\s\S]*?assertActiveRecipeOwner\(expectedOwnerId/.test(upsertPublicSource)) {
            failures.push('upsert harus menangkap owner sebelum masuk FIFO dan menolak tulis setelah pergantian akun.');
        }
        if (!/const expectedOwnerId = normalizeOwnerId\(activeRecipeOwnerId\)[\s\S]*?assertActiveRecipeOwner\(expectedOwnerId/.test(recipeStorageSource.slice(
            recipeStorageSource.indexOf('async function duplicateAndSaveRecipe('),
            recipeStorageSource.indexOf('async function captureOwnerId(')
        ))) {
            failures.push('duplicateAndSave harus mengikat operasi ke owner pada waktu pemanggilan.');
        }
        if (!/if \(!localRecipeOwnerMatches\(expectedUserId\)\)[\s\S]*?aborted: true/.test(recipeStorageSource)) {
            failures.push('Cloud recipe sync harus dibatalkan jika namespace lokal tidak cocok dengan owner autentikasi.');
        }
        if (!fs.existsSync(ownerWriteTestPath)
            || !/queued save, upsert, and copy from owner A cannot mutate owner B after an owner switch/.test(ownerWriteTestSource)
            || !/cloud recipe pull\/push aborts if the authenticated account differs from the local namespace/.test(ownerWriteTestSource)) {
            failures.push('Tes race owner untuk write lokal dan sinkronisasi cloud harus tersedia.');
        }

        // [AI-GENERATED][QA][V277] Async photo restores must be bound to the
        // authenticated owner as well as the recipe-selection and mutation epochs.
        const photoRestoreGuardPath = path.join(root, 'assets/js/recipe-photo-restore-guard.js');
        const photoRestoreGuardTestPath = path.join(root, 'tests/recipe-photo-restore-owner-guard.test.mjs');
        const photoRestoreGuardSource = fs.existsSync(photoRestoreGuardPath) ? fs.readFileSync(photoRestoreGuardPath, 'utf8') : '';
        const photoRestoreGuardTestSource = fs.existsSync(photoRestoreGuardTestPath) ? fs.readFileSync(photoRestoreGuardTestPath, 'utf8') : '';
        if (!/export function isRecipePhotoRestoreCurrent/.test(photoRestoreGuardSource)
            || !/capturedOwner !== activeOwner/.test(photoRestoreGuardSource)
            || !/capturedRestoreEpoch\) === Number\(activeRestoreEpoch\)/.test(photoRestoreGuardSource)
            || !/capturedMutationEpoch\) === Number\(activeMutationEpoch\)/.test(photoRestoreGuardSource)) {
            failures.push('Guard pemulihan foto harus memverifikasi owner, restore epoch, dan mutation epoch.');
        }
        if (!/import \{ isRecipePhotoRestoreCurrent \} from '\.\/recipe-photo-restore-guard\.js'/.test(appCoreSource)
            || !/const activeOwner = await AuthService\.getUser\?\.\(\)/.test(appCoreSource)
            || !/isRecipePhotoRestoreCurrent\([\s\S]*?activeOwnerId: activeOwner\?\.id/.test(appCoreSource)) {
            failures.push('app-core.js harus memverifikasi kembali owner setelah pembacaan IndexedDB sebelum merender foto.');
        }
        if (!fs.existsSync(photoRestoreGuardTestPath)
            || !/late photos from owner A are rejected after the active account changes to owner B/.test(photoRestoreGuardTestSource)
            || !/owner\/generation validation must complete before the restored photo blobs reach the UI/.test(photoRestoreGuardTestSource)) {
            failures.push('Tes regresi V277 untuk race kondisi pemulihan foto harus tersedia.');
        }

        // [AI-GENERATED][QA][V278] Realtime recipe events must bind the remote
        // event, authenticated user, and local recipe namespace across all async
        // boundaries, including the write-completion -> UI-publication boundary.
        const realtimeOwnerGuardPath = path.join(root, 'assets/js/recipe-realtime-owner-guard.js');
        const realtimeOwnerGuardTestPath = path.join(root, 'tests/recipe-realtime-owner-guard.test.mjs');
        const realtimeOwnerGuardSource = fs.existsSync(realtimeOwnerGuardPath) ? fs.readFileSync(realtimeOwnerGuardPath, 'utf8') : '';
        const realtimeOwnerGuardTestSource = fs.existsSync(realtimeOwnerGuardTestPath) ? fs.readFileSync(realtimeOwnerGuardTestPath, 'utf8') : '';
        const realtimeHandlerStart = appCoreSource.indexOf('async function tanganiPerubahanResepRealtime(payload) {');
        const realtimeHandlerEnd = appCoreSource.indexOf('\n}\n\n// ==========================================\n// 4. FUNGSI PIP', realtimeHandlerStart);
        const realtimeHandlerSource = realtimeHandlerStart >= 0 && realtimeHandlerEnd > realtimeHandlerStart
            ? appCoreSource.slice(realtimeHandlerStart, realtimeHandlerEnd)
            : '';
        if (!/export function isRecipeRealtimeOwnerConsistent/.test(realtimeOwnerGuardSource)
            || !/eventOwner === authOwner/.test(realtimeOwnerGuardSource)
            || !/eventOwner === currentLocalOwner/.test(realtimeOwnerGuardSource)
            || !/currentLocalOwner === expectedLocalOwner/.test(realtimeOwnerGuardSource)) {
            failures.push('Guard owner realtime harus menyamakan owner event, auth, namespace lokal, dan namespace yang ditangkap.');
        }
        if (!/import \{ isRecipeRealtimeOwnerConsistent \} from '\.\/recipe-realtime-owner-guard\.js'/.test(appCoreSource)
            || !/const expectedLocalOwnerId = RecipeStorageService\.getActiveOwnerId\?\.\(\) \?\? null/.test(realtimeHandlerSource)
            || !/const ownerAfterCommit = await AuthService\.getUser\?\.\(\)[\s\S]*?isRecipeRealtimeOwnerConsistent\([\s\S]*?window\.recipes = resepLokal/.test(realtimeHandlerSource)) {
            failures.push('Realtime handler harus menangkap namespace dan memvalidasi owner setelah simpan sebelum memperbarui UI.');
        }
        if (!fs.existsSync(realtimeOwnerGuardTestPath)
            || !/realtime recipe event is accepted only when event, auth, and local namespace owner match/.test(realtimeOwnerGuardTestSource)
            || !/global UI state must not be published before post-write owner validation/.test(realtimeOwnerGuardTestSource)) {
            failures.push('Tes regresi V278 untuk race owner sinkronisasi realtime resep harus tersedia.');
        }

        // [AI-GENERATED][QA][V279] Recipe-editor saves must remain bound to the
        // owner, active editor, and photo mutation generation captured at invocation.
        const recipeSaveGuardPath = path.join(root, 'assets/js/recipe-save-transaction-guard.js');
        const recipeSaveGuardTestPath = path.join(root, 'tests/recipe-save-transaction-guard.test.mjs');
        const recipeSaveStorageTestPath = path.join(root, 'tests/recipe-storage-save-validator.test.mjs');
        const authSessionUserTestPath = path.join(root, 'tests/auth-session-user.test.mjs');
        const recipeSaveGuardSource = fs.existsSync(recipeSaveGuardPath) ? fs.readFileSync(recipeSaveGuardPath, 'utf8') : '';
        const recipeSaveGuardTestSource = fs.existsSync(recipeSaveGuardTestPath) ? fs.readFileSync(recipeSaveGuardTestPath, 'utf8') : '';
        const recipeSaveStorageTestSource = fs.existsSync(recipeSaveStorageTestPath) ? fs.readFileSync(recipeSaveStorageTestPath, 'utf8') : '';
        const authSessionUserTestSource = fs.existsSync(authSessionUserTestPath) ? fs.readFileSync(authSessionUserTestPath, 'utf8') : '';
        const recipeSaveStart = appCoreSource.indexOf('async function simpanResepKeDatabase() {');
        const recipeSaveEnd = appCoreSource.indexOf('\n\n// ==========================================\n// FUNGSI SINKRONISASI DATA OFFLINE KE SUPABASE', recipeSaveStart);
        const recipeSaveSource = recipeSaveStart >= 0 && recipeSaveEnd > recipeSaveStart
            ? appCoreSource.slice(recipeSaveStart, recipeSaveEnd)
            : '';
        if (!/export function isRecipeSaveContextCurrent/.test(recipeSaveGuardSource)
            || !/authenticatedOwner !== expectedOwner/.test(recipeSaveGuardSource)
            || !/activeOwner !== expectedOwner/.test(recipeSaveGuardSource)
            || !/capturedEditorGeneration !== activeEditorGeneration/.test(recipeSaveGuardSource)
            || !/capturedPhotoGeneration !== activePhotoGeneration/.test(recipeSaveGuardSource)
            || !/capturedFormFingerprint != null[\s\S]*?activeFormFingerprint/.test(recipeSaveGuardSource)) {
            failures.push('Guard save resep harus mengikat autentikasi, namespace lokal, editor, dan mutasi foto.');
        }
        if (!/import \{ isRecipeSaveContextCurrent \} from '\.\/recipe-save-transaction-guard\.js'/.test(appCoreSource)
            || !/saveContext = captureRecipeSaveContext\(\)/.test(recipeSaveSource)
            || !/recipeFormFingerprint:\s*captureRecipeFormFingerprint\(namaResep\)/.test(recipeSaveSource)
            || !/expectedOwnerId: saveContext\.expectedOwnerId/.test(recipeSaveSource)
            || !/validateBeforeCommit: async \(\) => \{[\s\S]*?assertRecipeSaveContextCurrent\(saveContext, 'before-local-write'\)/.test(recipeSaveSource)
            || !/activeFormFingerprint:\s*context\.recipeFormFingerprint == null[\s\S]*?captureRecipeFormFingerprint\(\)/.test(appCoreSource)
            || !/AuthService\.getSessionUser\(\)/.test(appCoreSource)) {
            failures.push('Penyimpanan resep harus menangkap konteks dan memvalidasinya sebelum penulisan lokal.');
        }
        const authServiceSourceV279 = fs.readFileSync(path.join(root, 'assets/js/auth-service.js'), 'utf8');
        if (!/getSessionUser: async \(\) => \{[\s\S]*?AuthService\.getSession\(\)[\s\S]*?session\?\.user \|\| null/.test(authServiceSourceV279)) {
            failures.push('AuthService harus menyediakan identitas user dari session lokal agar guard penyimpanan tetap offline-capable.');
        }
        if (!fs.existsSync(recipeSaveGuardTestPath)
            || !/late save is rejected after editor navigation, recipe selection, or photo mutation/.test(recipeSaveGuardTestSource)
            || !/save captures context before awaits and pins owner with a precommit validator/.test(recipeSaveGuardTestSource)
            || !fs.existsSync(recipeSaveStorageTestPath)
            || !/precommit validator receives the captured owner and rejects before local mutation/.test(recipeSaveStorageTestSource)
            || !fs.existsSync(authSessionUserTestPath)
            || !/getSessionUser reads cached session identity without invoking server-verified getUser/.test(authSessionUserTestSource)) {
            failures.push('Tes regresi V279 untuk save guard, validasi precommit, dan sesi lokal harus tersedia.');
        }
    }
}
// [AI-GENERATED][QA][V280] A failed recipe photo restore must never be treated as an intentional empty photo set.
{
    const photoSavePolicyPath = path.join(root, 'assets/js/recipe-photo-save-policy.js');
    const photoSavePolicyTestPath = path.join(root, 'tests/recipe-photo-save-policy.test.mjs');
    const photoSavePolicySource = fs.existsSync(photoSavePolicyPath) ? fs.readFileSync(photoSavePolicyPath, 'utf8') : '';
    const photoSavePolicyTestSource = fs.existsSync(photoSavePolicyTestPath) ? fs.readFileSync(photoSavePolicyTestPath, 'utf8') : '';
    const appCoreV280 = fs.existsSync(path.join(root, 'assets/js/app-core.js'))
        ? fs.readFileSync(path.join(root, 'assets/js/app-core.js'), 'utf8') : '';
    const manifestV280 = fs.existsSync(path.join(root, 'assets/js/module-manifest.js'))
        ? fs.readFileSync(path.join(root, 'assets/js/module-manifest.js'), 'utf8') : '';

    if (!/export function shouldPersistRecipePhotos/.test(photoSavePolicySource)
        || !/status === 'restored'/.test(photoSavePolicySource)
        || !/reason: 'explicit-photo-mutation'/.test(photoSavePolicySource)
        || !/reason: 'restore-not-confirmed'/.test(photoSavePolicySource)) {
        failures.push('Kebijakan penyimpanan foto harus melindungi foto lama jika restore gagal dan tidak ada mutasi eksplisit.');
    }
    if (!/import \{ shouldPersistRecipePhotos \} from '\.\/recipe-photo-save-policy\.js'/.test(appCoreV280)
        || !/latestRecipePhotoRestoreOutcome/.test(appCoreV280)
        || !/if \(!photoSavePolicy\.allowed\)[\s\S]*?RecipePhotoPersistenceService\.replaceRecipePhotos/.test(appCoreV280)
        || !/outcome\.status = 'restored'/.test(appCoreV280)
        || !/outcome\.status = 'failed'/.test(appCoreV280)) {
        failures.push('app-core harus membedakan hasil restore foto dan memvalidasi kebijakan sebelum menulis slot foto.');
    }
    if (!manifestV280.includes("'recipe-photo-save-policy.js'")) {
        failures.push('recipe-photo-save-policy.js tidak ada dalam module manifest.');
    }
    if (!fs.existsSync(photoSavePolicyTestPath)
        || !/failed photo restore preserves persisted photos when the user has not changed slots/.test(photoSavePolicyTestSource)
        || !/explicit user photo mutation after a failed restore permits intentional replacement/.test(photoSavePolicyTestSource)) {
        failures.push('Tes regresi V280 untuk kegagalan restore foto dan mutasi eksplisit harus tersedia.');
    }
}

// [AI-GENERATED][QA][V281] IndexedDB photo connections must not block future schema upgrades.
{
    const photoPersistencePath = path.join(root, 'assets/js/recipe-photo-persistence-service.js');
    const photoPersistenceTestPath = path.join(root, 'tests/recipe-photo-persistence-service.test.mjs');
    const photoPersistenceSource = fs.existsSync(photoPersistencePath)
        ? fs.readFileSync(photoPersistencePath, 'utf8') : '';
    const photoPersistenceTestSource = fs.existsSync(photoPersistenceTestPath)
        ? fs.readFileSync(photoPersistenceTestPath, 'utf8') : '';

    if (!/request\.onblocked\s*=/.test(photoPersistenceSource)
        || !/db\.onversionchange\s*=/.test(photoPersistenceSource)
        || !/if \(settled\)\s*\{[\s\S]*?db\?\.close\?\.\(\)/.test(photoPersistenceSource)
        || !/const rejectOnce\s*=/.test(photoPersistenceSource)) {
        failures.push('Photo IndexedDB harus menangani open yang diblokir, versionchange, dan sukses terlambat tanpa membocorkan koneksi.');
    }
    if (!/blocked IndexedDB open rejects promptly, closes a late connection, and queue recovers/.test(photoPersistenceTestSource)
        || !/database connection closes on versionchange and the persistence queue recovers/.test(photoPersistenceTestSource)) {
        failures.push('Tes regresi V281 untuk lifecycle koneksi IndexedDB harus tersedia.');
    }
}

// [AI-GENERATED][QA][V282] Synchronous IndexedDB transaction setup failures must close handles and recover the FIFO.
{
    const photoPersistencePath = path.join(root, 'assets/js/recipe-photo-persistence-service.js');
    const photoPersistenceTestPath = path.join(root, 'tests/recipe-photo-persistence-service.test.mjs');
    const photoPersistenceSource = fs.existsSync(photoPersistencePath)
        ? fs.readFileSync(photoPersistencePath, 'utf8') : '';
    const photoPersistenceTestSource = fs.existsSync(photoPersistenceTestPath)
        ? fs.readFileSync(photoPersistenceTestPath, 'utf8') : '';

    if (!/function managePhotoTransaction\(/.test(photoPersistenceSource)
        || !/transaction\.objectStore\(STORE_NAME\)[\s\S]*?catch \(error\)\s*\{\s*lifecycle\.failSetup\(error\)/.test(photoPersistenceSource)
        || !/failSetup\(error\)[\s\S]*?transaction\.abort\?\.\(\)[\s\S]*?fail\(error/.test(photoPersistenceSource)) {
        failures.push('Pengaturan transaksi foto IndexedDB harus membersihkan koneksi pada error sinkron dan membatalkan transaksi yang belum berjalan.');
    }
    if (!/synchronous objectStore\/openCursor setup failures close connections and the persistence queue recovers/.test(photoPersistenceTestSource)
        || !/must preserve existing photos/.test(photoPersistenceTestSource)) {
        failures.push('Tes regresi V282 untuk error setup IndexedDB, preservasi foto, dan pemulihan antrean harus tersedia.');
    }
}


// [AI-GENERATED][QA][V285] Mutable photo generation and slot-selection state must be module-owned, not window globals.
{
    const photoServicePath = path.join(root, 'assets/js/recipe-photo-service.js');
    const appCorePath = path.join(root, 'assets/js/app-core.js');
    const photoServiceSource = fs.existsSync(photoServicePath) ? fs.readFileSync(photoServicePath, 'utf8') : '';
    const appCoreSource = fs.existsSync(appCorePath) ? fs.readFileSync(appCorePath, 'utf8') : '';
    const mutationGlobalPattern = /window\.__recipePhotoMutationEpoch|window\.__activeRecipePhotoIndex/;
    const productionModuleSources = jsFiles
        .filter(({ relative }) => relative.startsWith('assets/js/'))
        .map(({ relative, fullPath }) => ({ relative, source: fs.readFileSync(fullPath, 'utf8') }));

    for (const file of productionModuleSources) {
        if (mutationGlobalPattern.test(file.source)) {
            failures.push(`State mutasi foto/pemilihan slot tidak boleh memakai global window: ${file.relative}`);
        }
    }
    if (!/export\s+\{[\s\S]*?\bgetRecipePhotoMutationEpoch\b[\s\S]*?\}/.test(photoServiceSource)
        || !/import\s+\{[^}]*\bgetRecipePhotoMutationEpoch\b[^}]*\}\s+from\s+["']\.\/recipe-photo-service\.js["']/.test(appCoreSource)
        || !/function\s+getRecipePhotoMutationEpoch\(\)[\s\S]*?return\s+recipePhotoMutationEpoch/.test(photoServiceSource)) {
        failures.push('Generasi mutasi foto harus dibagikan melalui named export ES6 Module.');
    }
}

// [AI-GENERATED][QA][V285] Photo services are ESM-only internally; retain only the individual legacy helper globals.
{
    const photoServicePath = path.join(root, 'assets/js/recipe-photo-service.js');
    const photoPersistencePath = path.join(root, 'assets/js/recipe-photo-persistence-service.js');
    const eventDelegationPath = path.join(root, 'assets/js/core/event-delegation.js');
    const photoServiceSource = fs.existsSync(photoServicePath) ? fs.readFileSync(photoServicePath, 'utf8') : '';
    const photoPersistenceSource = fs.existsSync(photoPersistencePath) ? fs.readFileSync(photoPersistencePath, 'utf8') : '';
    const eventDelegationSource = fs.existsSync(eventDelegationPath) ? fs.readFileSync(eventDelegationPath, 'utf8') : '';
    const appCoreSource = fs.readFileSync(path.join(root, 'assets/js/app-core.js'), 'utf8');

    if (!/export\s*\{[^}]*\bRecipePhotoService\b/s.test(photoServiceSource)
        || /window\.RecipePhotoService\s*=/.test(photoServiceSource)) {
        failures.push('RecipePhotoService harus tersedia sebagai named export tanpa alias object-level window yang tidak digunakan.');
    }
    if (!/export\s+const\s+RecipePhotoPersistenceService\s*=/.test(photoPersistenceSource)
        || /window\.RecipePhotoPersistenceService\s*=/.test(photoPersistenceSource)) {
        failures.push('RecipePhotoPersistenceService harus tersedia sebagai named export tanpa alias object-level window yang tidak digunakan.');
    }
    if (!/import\s+\{[^}]*\bRecipePhotoService\b[^}]*\}\s+from\s+["']\.\/recipe-photo-service\.js["']/.test(appCoreSource)
        || !/import\s+\{\s*RecipePhotoPersistenceService\s*\}\s+from\s+["']\.\/recipe-photo-persistence-service\.js["']/.test(appCoreSource)
        || !/import\s+\{\s*RecipePhotoService\s*\}\s+from\s+["']\.\.\/recipe-photo-service\.js["']/.test(eventDelegationSource)) {
        failures.push('Konsumen layanan foto harus memakai named import ES6 Module.');
    }
    if (/window\.RecipePhotoService\s*=|window\.RecipePhotoPersistenceService\s*=/.test(
        [photoServiceSource, photoPersistenceSource].join('\n')
    )) {
        failures.push('Alias global RecipePhotoService yang tidak digunakan muncul kembali.');
    }
    // These helper-level globals remain intentionally compatible with legacy upload/remove handlers.
    for (const requiredBridge of ['window.uploadedRecipeFiles', 'window.triggerPhotoInput', 'window.removeRecipePhoto']) {
        if (!photoServiceSource.includes(requiredBridge)) failures.push(`Bridge foto legacy yang masih diperlukan hilang: ${requiredBridge}.`);
    }
}

// [AI-GENERATED][QA][V283] Exceptions inside IndexedDB request callbacks must abort and settle.
{
    const photoPersistencePath = path.join(root, 'assets/js/recipe-photo-persistence-service.js');
    const photoPersistenceTestPath = path.join(root, 'tests/recipe-photo-persistence-service.test.mjs');
    const photoPersistenceSource = fs.existsSync(photoPersistencePath)
        ? fs.readFileSync(photoPersistencePath, 'utf8') : '';
    const photoPersistenceTestSource = fs.existsSync(photoPersistenceTestPath)
        ? fs.readFileSync(photoPersistenceTestPath, 'utf8') : '';
    const settledGuards = (photoPersistenceSource.match(/if \(lifecycle\.isSettled\(\)\) return;/g) || []).length;
    const guardedFailures = (photoPersistenceSource.match(/lifecycle\.failSetup\(error\)/g) || []).length;

    if (settledGuards < 3 || guardedFailures < 5) {
        failures.push('Semua handler event IndexedDB harus mengabaikan transaksi yang sudah selesai dan menangani kegagalan callback secara eksplisit.');
    }
    if (!/synchronous cursor continuation failure aborts the transaction, closes the DB, and recovers the queue/.test(photoPersistenceTestSource)
        || !/assert\.equal\(database\.abortCount, abortsBefore \+ 1/.test(photoPersistenceTestSource)) {
        failures.push('Tes regresi V283 untuk callback cursor yang gagal, abort eksplisit, cleanup koneksi, dan pemulihan antrean harus tersedia.');
    }
}

const swPath = path.join(webRoot, 'sw.js');
if (!fs.existsSync(swPath)) failures.push('sw.js tidak ditemukan.');
else if (version) {
    const sw = fs.readFileSync(swPath, 'utf8');
    if (!sw.includes(`const CACHE_NAME = '${version.serviceWorker}'`)) {
        failures.push(`CACHE_NAME di sw.js tidak cocok dengan metadata ${version.serviceWorker}.`);
    }
    if (!sw.includes("'./assets/js/midtrans-runtime.js'")) {
        failures.push('Adapter Midtrans ES6 Module tidak ada di precache Service Worker.');
    }
    if (!sw.includes("'./assets/js/google-translate-runtime.js'")) {
        failures.push('Adapter Google Translate ES6 Module tidak ada di precache Service Worker.');
    }
    if (!sw.includes("'./assets/js/language-list-service.js'")) {
        failures.push('Language list ES6 Module tidak ada di precache Service Worker.');
    }
    if (!sw.includes("'./assets/js/recipe-photo-restore-guard.js'")) {
        failures.push('recipe-photo-restore-guard.js tidak ada di precache Service Worker.');
    }
    if (!sw.includes("'./assets/js/recipe-realtime-owner-guard.js'")) {
        failures.push('recipe-realtime-owner-guard.js tidak ada di precache Service Worker.');
    }
    if (!sw.includes("'./assets/js/recipe-save-transaction-guard.js'")) {
        failures.push('recipe-save-transaction-guard.js tidak ada di precache Service Worker.');
    }
    if (!sw.includes("'./assets/js/recipe-photo-save-policy.js'")) {
        failures.push('recipe-photo-save-policy.js tidak ada di precache Service Worker.');
    }
    const manifestPath = path.join(root, 'assets/js/module-manifest.js');
    const manifestSource = fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, 'utf8') : '';
    if (!manifestSource.includes("'recipe-save-transaction-guard.js'")) {
        failures.push('recipe-save-transaction-guard.js tidak ada di module manifest.');
    }
    if (!manifestSource.includes("'recipe-photo-save-policy.js'")) {
        failures.push('recipe-photo-save-policy.js tidak ada di module manifest.');
    }

    // [AI-GENERATED][QA][V200] Every local module in the boot.js transitive
    // dependency graph must be included in the install-time precache. A module
    // missing here would make a first offline launch fail even if online tests pass.
    const assetBlock = sw.match(/const ASSETS\s*=\s*\[([\s\S]*?)\];/);
    if (!assetBlock) {
        failures.push('Daftar ASSETS Service Worker tidak ditemukan.');
    } else {
        const precachedPaths = new Set();
        const assetEntries = [...assetBlock[1].matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]);
        for (const entry of assetEntries) {
            if (/^(?:https?:|data:)/i.test(entry)) continue;
            const assetPath = path.resolve(webRoot, entry);
            if (!fs.existsSync(assetPath)) {
                failures.push(`Aset Service Worker tidak ditemukan: ${entry}`);
                continue;
            }
            precachedPaths.add(assetPath);
        }
        console.log(`Aset precache Service Worker: ${assetEntries.length}`);

        // Follow the actual browser entrypoint so runtime-bootstrap and the dynamic boot import are both verified.
        const bootEntrypoint = path.join(webRoot, 'assets/js/runtime-entry.js');
        const visitedModules = new Set();
        const pendingModules = [bootEntrypoint];
        while (pendingModules.length) {
            const modulePath = pendingModules.pop();
            if (visitedModules.has(modulePath)) continue;
            visitedModules.add(modulePath);
            if (!fs.existsSync(modulePath) || !fs.statSync(modulePath).isFile()) {
                failures.push(`Modul boot tidak ditemukan: ${path.relative(root, modulePath)}`);
                continue;
            }
            const source = fs.readFileSync(modulePath, 'utf8');
            for (const match of source.matchAll(importPattern)) {
                // Remove cache-busting query/hash before resolving the physical local file.
                const specifier = match[1].split(/[?#]/, 1)[0];
                const dependencyPath = path.resolve(path.dirname(modulePath), specifier);
                if (!dependencyPath.startsWith(root + path.sep)) continue;
                if (!fs.existsSync(dependencyPath) || !fs.statSync(dependencyPath).isFile()) continue;
                if (!precachedPaths.has(dependencyPath)) {
                    failures.push(`Dependensi lokal boot tidak ada di precache Service Worker: ${path.relative(root, dependencyPath)} (diimpor oleh ${path.relative(root, modulePath)}).`);
                }
                if (/\.(?:js|mjs)$/i.test(dependencyPath)) pendingModules.push(dependencyPath);
            }
        }
        console.log(`Modul lokal dalam graph entrypoint: ${visitedModules.size}`);
    }
}

// [AI-GENERATED][QA][V287] Production-step state must not split between module-local and mutable window arrays.
{
    const appCorePath = path.join(root, 'assets/js/app-core.js');
    const appCoreSource = fs.existsSync(appCorePath) ? fs.readFileSync(appCorePath, 'utf8') : '';
    if (!/let activeRecipeSteps = Array\.isArray\(window\.activeRecipeSteps\)[\s\S]*?defaultRecipeSteps/.test(appCoreSource)
        || !/Object\.defineProperty\(window,\s*'activeRecipeSteps',[\s\S]*?get\(\)\s*\{\s*return activeRecipeSteps;\s*\}[\s\S]*?set\(nextSteps\)\s*\{\s*activeRecipeSteps = Array\.isArray\(nextSteps\) \? nextSteps : \[\];/.test(appCoreSource)) {
        failures.push('State langkah produksi harus memiliki satu binding kanonis dan accessor kompatibilitas window.activeRecipeSteps.');
    }
    if (!/let bakeryIngredients = Array\.isArray\(window\.bakeryIngredients\)[\s\S]*?\? window\.bakeryIngredients[\s\S]*?: \[\];/.test(appCoreSource)
        || !/Object\.defineProperty\(window,\s*'bakeryIngredients',[\s\S]*?get\(\)\s*\{\s*return bakeryIngredients;\s*\}[\s\S]*?set\(nextIngredients\)\s*\{\s*bakeryIngredients = Array\.isArray\(nextIngredients\) \? nextIngredients : \[\];/.test(appCoreSource)) {
        failures.push('State bahan bakery harus memiliki satu binding kanonis dan accessor kompatibilitas window.bakeryIngredients.');
    }
}

console.log(`JavaScript diperiksa : ${jsFiles.length}`);
console.log(`HTML diperiksa       : ${htmlFiles.length}`);
console.log(`ID HTML              : ${idCount}`);
console.log(`Import hilang        : ${missingImports}`);
console.log(`ID duplikat           : ${duplicateIds}`);
console.log(`Handler inline        : ${inlineHandlers}`);
console.log(`Override scroll lock  : ${scrollLockOverrides}`);
console.log(`Versi                 : ${version?.version ?? 'TIDAK TERBACA'}`);
if (failures.length) {
    console.error(`\nGAGAL: ${failures.length} temuan`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
} else {
    console.log('\nLULUS: semua pemeriksaan statis release berhasil.');
}
