#!/usr/bin/env node
/**
 * [AI-GENERATED][BUILD][V300]
 * Stage the canonical source assets into Capacitor's configured webDir (`www`).
 * Keep www/index.html, www/sw.js, and the existing page markup intact; only
 * synchronize source-owned static directories/files required by their URLs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webRoot = path.join(root, 'www');
const directories = ['assets', 'vendor'];
const files = ['logo-donat.svg', 'version.json'];
// [AI-GENERATED][DEPLOYMENT][V317] Mirror canonical API handlers into the
// path used by the existing Vercel deployment logs (/www/public/api).
const apiSource = path.join(root, 'api');
const deployApiRoot = path.join(root, 'www', 'public', 'api');

function assertSourceExists(relativePath) {
    const sourcePath = path.join(root, relativePath);
    if (!fs.existsSync(sourcePath)) {
        throw new Error(`Sumber build tidak ditemukan: ${relativePath}`);
    }
    return sourcePath;
}

fs.mkdirSync(webRoot, { recursive: true });
if (!fs.existsSync(apiSource)) throw new Error('Sumber API kanonis tidak ditemukan: api/');
fs.mkdirSync(deployApiRoot, { recursive: true });
fs.cpSync(apiSource, deployApiRoot, { recursive: true, force: true, preserveTimestamps: true });
for (const relativePath of directories) {
    const sourcePath = assertSourceExists(relativePath);
    fs.cpSync(sourcePath, path.join(webRoot, relativePath), {
        recursive: true,
        force: true,
        preserveTimestamps: true
    });
}
for (const relativePath of files) {
    const sourcePath = assertSourceExists(relativePath);
    fs.copyFileSync(sourcePath, path.join(webRoot, relativePath));
}

const requiredFiles = [
    'index.html',
    'sw.js',
    'assets/js/runtime-entry.js',
    'assets/js/boot.js',
    'assets/js/modal-bootstrap.js',
    'vendor/capacitor-plugins.js',
    'logo-donat.svg',
    'version.json'
];
const missing = requiredFiles.filter((relativePath) => !fs.existsSync(path.join(webRoot, relativePath)));
if (missing.length) {
    throw new Error(`Paket web belum lengkap: ${missing.join(', ')}`);
}

// Validate all install-time precache paths before allowing a release build to continue.
const serviceWorkerSource = fs.readFileSync(path.join(webRoot, 'sw.js'), 'utf8');
const assetBlock = serviceWorkerSource.match(/const ASSETS\s*=\s*\[([\s\S]*?)\];/);
if (!assetBlock) throw new Error('Daftar ASSETS tidak ditemukan di www/sw.js');
const precacheEntries = [...assetBlock[1].matchAll(/['\"]([^'\"]+)['\"]/g)].map((match) => match[1]);
const missingPrecache = precacheEntries.filter((entry) => {
    if (/^(?:https?:|data:)/i.test(entry)) return false;
    const target = path.resolve(webRoot, entry);
    return !target.startsWith(webRoot + path.sep) && target !== webRoot || !fs.existsSync(target);
});
if (missingPrecache.length) {
    throw new Error(`Aset precache tidak tersedia di webDir: ${missingPrecache.join(', ')}`);
}

console.log(`Sinkronisasi web selesai: ${directories.join(', ')}, ${files.join(', ')} -> www/`);
console.log('Sinkronisasi API selesai: api/ -> www/public/api/');
console.log(`Validasi entrypoint: ${requiredFiles.length} file wajib tersedia.`);
console.log(`Validasi precache: ${precacheEntries.length} jalur lokal/eksternal diperiksa; tidak ada aset lokal yang hilang.`);
