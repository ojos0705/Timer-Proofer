/**
 * [AI-GENERATED][ES6 MODULE][V262]
 * Owns language-list filtering so language-engine.js remains focused on selection and translation.
 * Existing IDs, classes, data attributes and visible UI behavior are unchanged.
 */
export function filterDaftarBahasa(documentRef = globalThis.document) {
    const input = documentRef?.getElementById?.('input-cari-bahasa');
    const container = documentRef?.getElementById?.('list-pilihan-bahasa');

    // The modal/list may not exist on every page or during teardown. Treat that as a no-op.
    if (!input || !container || typeof container.getElementsByClassName !== 'function') return;

    const filter = String(input.value ?? '').toLowerCase().trim();
    const items = container.getElementsByClassName('lang-item');

    for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        if (!item) continue;

        const textValue = String(item.textContent ?? item.innerText ?? '').toLowerCase();
        const dataName = String(item.getAttribute?.('data-name') ?? '').toLowerCase();
        const matches = textValue.includes(filter) || dataName.includes(filter);

        if (item.style) item.style.display = matches ? 'flex' : 'none';
    }
}
