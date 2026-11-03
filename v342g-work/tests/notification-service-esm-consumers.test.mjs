/** [AI-GENERATED][QA][V272] Enforce named imports for internal notification consumers. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const consumers = [
    ['assets/js/app-core.js', './notification-service.js'],
    ['assets/js/features-preferences.js', './notification-service.js'],
    ['assets/js/proofing-completion-service.js', './notification-service.js'],
    ['assets/js/recipe-storage-service.js', './notification-service.js'],
    ['assets/js/core/event-delegation.js', '../notification-service.js']
];

test('NotifSystem is a named ESM export and remains available as a compatibility bridge', () => {
    const source = read('assets/js/notification-service.js');
    assert.match(source, /export\s+const\s+NotifSystem\s*=/);
    assert.match(source, /window\.NotifSystem\s*=\s*NotifSystem/);
    assert.match(source, /registerNotificationModalHooks\(\{[\s\S]*renderList:[\s\S]*updateBadge:/);
});

test('application notification consumers use named imports rather than window.NotifSystem', () => {
    for (const [relative, specifier] of consumers) {
        const source = read(relative);
        assert.ok(source.includes(`from '${specifier}'`) || source.includes(`from \"${specifier}\"`), `${relative} must import ${specifier}`);
        assert.match(source, /import\s+\{\s*NotifSystem\s*\}\s+from\s+['\"][^'\"]*notification-service\.js['\"]/);
        assert.doesNotMatch(source, /window\.NotifSystem/, `${relative} must not look up the mutable global`);
    }
});

test('modal bootstrap registers callback hooks and keeps only a controlled legacy fallback', () => {
    const source = read('assets/js/modal-bootstrap.js');
    assert.match(source, /export\s+function\s+registerNotificationModalHooks\(/);
    assert.match(source, /notificationModalHooks\.renderList\s*\|\|\s*window\.NotifSystem/);
    assert.match(source, /notificationModalHooks\.updateBadge\s*\|\|\s*window\.NotifSystem/);
});

test('application startup does not persist synthetic notification examples as real events', () => {
    const source = read('assets/js/app-core.js');
    assert.doesNotMatch(source, /Suntik log default ke sistem notifikasi/);
    assert.doesNotMatch(source, /GPS berhasil mendeteksi posisi di Balonggabus/);
    assert.doesNotMatch(source, /Izin Push Notification disetujui/);
});

test('notification service owns the read-all and delete-all controls', () => {
    const appCore = read('assets/js/app-core.js');
    const service = read('assets/js/notification-service.js');
    for (const id of ['btn-notif-baca', 'btn-notif-hapus']) {
        assert.doesNotMatch(appCore, new RegExp(`getElementById\\(['"]${id}['"]\\)`));
        assert.match(service, new RegExp(`getElementById\\(['"]${id}['"]\\)`));
    }
    assert.match(service, /initializeNotificationControls\(\)/);
    assert.match(service, /confirmDelete\('Apakah Anda yakin ingin menghapus semua notifikasi\?'/);
});
