/** Runtime behavior checks for the browser notification store. */
import test from 'node:test';
import assert from 'node:assert/strict';

const persisted = new Map([['tp_notifs', JSON.stringify([
    { id: 17, kategori: 'sistem', judul: '<img src=x onerror=alert(1)>', deskripsi: '<script>bad()</script>', dibaca: true },
    { id: 'invalid', judul: 'bad record' },
    null
])]]);
const rendered = [];
const container = { innerHTML: '', children: [], appendChild(node) { this.children.push(node); rendered.push(node); } };
const empty = { style: {} };
const badge = { textContent: '', style: {} };
const makeButton = () => {
    const listeners = new Map();
    return {
        dataset: {},
        addEventListener(type, handler) { listeners.set(type, [...(listeners.get(type) || []), handler]); },
        click() { for (const handler of listeners.get('click') || []) handler({ target: this }); },
        listenerCount(type) { return (listeners.get(type) || []).length; }
    };
};
const readButton = makeButton();
const deleteButton = makeButton();
let confirmDelete = false;
let confirmationCalls = 0;
const elements = new Map([
    ['notif-list-container', container],
    ['notif-empty-msg', empty],
    ['global-notif-badge', badge],
    ['btn-notif-baca', readButton],
    ['btn-notif-hapus', deleteButton]
]);

globalThis.localStorage = {
    getItem(key) { return persisted.get(key) ?? null; },
    setItem(key, value) { persisted.set(key, String(value)); }
};
globalThis.window = {
    confirm(message) {
        confirmationCalls += 1;
        assert.match(message, /menghapus semua notifikasi/);
        return confirmDelete;
    }
};
globalThis.document = {
    readyState: 'complete',
    body: { style: {} },
    getElementById(id) { return elements.get(id) || null; },
    querySelectorAll() { return []; },
    createElement() { return { dataset: {}, style: {}, classList: { add() {}, remove() {} } }; }
};
globalThis.console = { ...console, info() {}, warn() {}, error() {} };

const { NotifSystem } = await import('../assets/js/notification-service.js?test=behavior-v299');

test('notification store normalizes cache, safely renders text, and persists user actions', () => {
    assert.equal(container.children.length, 1, 'invalid cached entries are discarded');
    assert.doesNotMatch(container.children[0].innerHTML, /<img src=x|<script>/);
    assert.match(container.children[0].innerHTML, /&lt;img/);
    assert.equal(Number(badge.textContent), 0);
    assert.equal(badge.style.display, 'none');

    const id = NotifSystem.tambah('timer', 'Selesai', 'Proofing selesai', '⏱️');
    assert.ok(Number.isFinite(id));
    assert.equal(Number(badge.textContent), 1);
    assert.equal(badge.style.display, 'flex');
    assert.equal(JSON.parse(persisted.get('tp_notifs')).length, 2);

    NotifSystem.baca(id);
    assert.equal(Number(badge.textContent), 0);
    assert.equal(JSON.parse(persisted.get('tp_notifs')).find((item) => item.id === id).dibaca, true);

    NotifSystem.hapus(id);
    assert.equal(JSON.parse(persisted.get('tp_notifs')).length, 1);

    assert.equal(readButton.listenerCount('click'), 1);
    assert.equal(deleteButton.listenerCount('click'), 1);
    NotifSystem.tambah('resep', 'Resep A', 'Tersimpan', '💾');
    NotifSystem.tambah('timer', 'Timer B', 'Selesai', '⏱️');
    assert.equal(Number(badge.textContent), 2);
    readButton.click();
    assert.equal(Number(badge.textContent), 0, 'Baca Semua marks each stored notification read');
    assert.ok(JSON.parse(persisted.get('tp_notifs')).every((item) => item.dibaca));

    deleteButton.click();
    assert.equal(confirmationCalls, 1);
    assert.equal(JSON.parse(persisted.get('tp_notifs')).length, 3, 'cancel keeps the history intact');
    confirmDelete = true;
    deleteButton.click();
    assert.equal(confirmationCalls, 2);
    assert.deepEqual(JSON.parse(persisted.get('tp_notifs')), []);
    assert.equal(empty.style.display, 'block');
});
