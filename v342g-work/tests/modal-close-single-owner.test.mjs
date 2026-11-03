/** Regression guard for modal close controls with delegated actions. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const appCore = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');

test('settings close is handled only by its existing delegated modal action', () => {
    assert.match(html, /<button[^>]*id="btn-close-setting"[^>]*data-action="toggleModal"[^>]*data-arg="settings-modal"/);
    assert.doesNotMatch(appCore, /getElementById\(['"]btn-close-setting['"]\)[\s\S]{0,300}addEventListener\(['"]click['"]/);
});

test('notification back control is handled only by its existing delegated modal action', () => {
    assert.match(html, /<button[^>]*id="btn-notif-kembali"[^>]*data-action="toggleModal"[^>]*data-arg="notif-modal"/);
    assert.doesNotMatch(appCore, /getElementById\(['"]btn-notif-kembali['"]\)[\s\S]{0,300}addEventListener\(['"]click['"]/);
});

test('recipe calculator actions do not run through both delegation and direct listeners', () => {
    const delegated = [
        ['fc-badge', 'switchFolderTab', 'unilever-badge'],
        ['btn-simpan-resep', 'simpanResepKeDatabase', null],
        ['btn-recipe-close-bottom', 'tutupHalamanResepSecaraAman', null]
    ];
    for (const [id, action, argument] of delegated) {
        const tag = html.match(new RegExp(`<[^>]*\\bid="${id}"[^>]*>`))?.[0] || '';
        assert.ok(tag.includes(`data-action="${action}"`), `${id} keeps its delegated ${action} action`);
        if (argument) assert.ok(tag.includes(`data-arg="${argument}"`), `${id} keeps its ${argument} argument`);
        assert.doesNotMatch(appCore, new RegExp(`getElementById\\(['"]${id}['"]\\)[\\s\\S]{0,300}addEventListener\\(['"]click['"]`));
    }
});


test('toggleModal is not executed twice by the generic action delegation when modal bootstrap owns it', () => {
    const delegation = fs.readFileSync(
        new URL('../assets/js/core/event-delegation.js', import.meta.url), 'utf8'
    );
    const bootstrap = fs.readFileSync(
        new URL('../assets/js/modal-bootstrap.js', import.meta.url), 'utf8'
    );
    assert.match(delegation, /actionName === ['"]toggleModal['"] && window\.__TP_MODAL_BOOTSTRAP__ === true/);
    assert.match(bootstrap, /document\.addEventListener\(['"]click['"],[\s\S]*?\}, true\)/);
    assert.match(bootstrap, /event\.stopImmediatePropagation\(\)/);
});
