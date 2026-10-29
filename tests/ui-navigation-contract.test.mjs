/** [AI-GENERATED][QA][V191] Static regression guards for critical existing UI contracts. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const appCore = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');
const eventDelegation = fs.readFileSync(new URL('../assets/js/core/event-delegation.js', import.meta.url), 'utf8');
const modalBootstrap = fs.readFileSync(new URL('../assets/js/modal-bootstrap.js', import.meta.url), 'utf8');

function collectIds(source) {
    return new Set([...source.matchAll(/\bid\s*=\s*(["'])(.*?)\1/gi)].map((match) => match[2]));
}

test('notification and settings controls keep valid targets and modal IDs', () => {
    const ids = collectIds(html);
    for (const id of ['notif-modal', 'settings-modal']) assert.ok(ids.has(id), `missing modal #${id}`);
    assert.match(html, /data-action="toggleModal"\s+data-arg="notif-modal"/);
    assert.match(html, /data-action="toggleModal"\s+data-arg="settings-modal"/);
    assert.match(modalBootstrap, /stopImmediatePropagation\(\)/);
    assert.match(modalBootstrap, /window\.toggleModal\s*=\s*toggleModal/);
});

test('all literal modal actions in the static HTML resolve to existing element IDs', () => {
    const ids = collectIds(html);
    const missing = [];
    for (const match of html.matchAll(/<[^>]*data-action=["']toggleModal["'][^>]*>/gi)) {
        const arg = match[0].match(/data-arg=["']([^"']+)["']/i)?.[1];
        if (arg && !ids.has(arg)) missing.push(arg);
    }
    assert.deepEqual([...new Set(missing)], []);
});

test('Tips and recipe navigation preserve their established DOM and dispatcher contracts', () => {
    const ids = collectIds(html);
    for (const id of ['tab-timer', 'tab-recipe', 'tab-tips', 'recipe', 'tips-page']) {
        assert.ok(ids.has(id), `missing navigation contract #${id}`);
    }
    assert.match(html, /id="tab-tips"[^>]*data-action="switchTab"[^>]*data-arg="tips"|data-action="switchTab"[^>]*data-arg="tips"[^>]*id="tab-tips"/);
    assert.match(appCore, /window\.switchTab\s*=\s*function\s*\(tabName\)/);
    assert.match(appCore, /tabName\s*===\s*'tips'[\s\S]{0,600}tipsModal\.style\.display\s*=\s*'flex'/);
    assert.match(eventDelegation, /document\.addEventListener\('click'/);
    assert.match(eventDelegation, /resolveAction\(actionName\)/);
});

test('event delegation reports unknown actions instead of silently swallowing them', () => {
    assert.match(eventDelegation, /Action tidak ditemukan/);
    assert.match(eventDelegation, /Action gagal:/);
});
