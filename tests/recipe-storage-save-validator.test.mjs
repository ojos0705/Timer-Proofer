/** [AI-GENERATED][QA][V279] RecipeStorageService must honor owner-pinned precommit validators. */
import test from 'node:test';
import assert from 'node:assert/strict';

function createLocalStorage() {
    const data = new Map();
    return {
        data,
        getItem(key) { return data.has(String(key)) ? data.get(String(key)) : null; },
        setItem(key, value) { data.set(String(key), String(value)); },
        removeItem(key) { data.delete(String(key)); },
        clear() { data.clear(); }
    };
}
function restoreGlobal(name, descriptor) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
}

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const localStorage = createLocalStorage();
Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value: {} });
Object.defineProperty(globalThis, 'document', {
    configurable: true,
    writable: true,
    value: { readyState: 'loading', addEventListener() {} }
});
Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: localStorage });

const { RecipeStorageService } = await import('../assets/js/recipe-storage-service.js?test=v279-save-validator');
await RecipeStorageService.setOwner('owner-A');
const ownerKeyA = `${RecipeStorageService.STORAGE_KEY}::owner-A`;

 test('precommit validator receives the captured owner and rejects before local mutation', async () => {
    const baseline = [{ id: 'existing-A', nama: 'Resep milik A' }];
    assert.equal(await RecipeStorageService.saveList(baseline), true);
    let observedOwner = null;

    await assert.rejects(
        RecipeStorageService.saveList([{ id: 'stale-A', nama: 'Tulis usang' }], {
            expectedOwnerId: 'owner-A',
            validateBeforeCommit: async ({ ownerId }) => {
                observedOwner = ownerId;
                return false;
            }
        }),
        error => error.code === 'RECIPE_SAVE_CONTEXT_CHANGED'
    );

    assert.equal(observedOwner, 'owner-A');
    assert.deepEqual(JSON.parse(localStorage.getItem(ownerKeyA)), baseline,
        'failed guard must not update the durable recipe list');
});

test('failed precommit guard does not poison the FIFO and a valid subsequent write persists', async () => {
    await assert.rejects(
        RecipeStorageService.saveList([{ id: 'rejected', nama: 'Ditolak' }], {
            expectedOwnerId: 'owner-A',
            validateBeforeCommit: async () => false
        }),
        error => error.code === 'RECIPE_SAVE_CONTEXT_CHANGED'
    );

    const updated = [{ id: 'saved-A', nama: 'Simpan berikutnya' }];
    assert.equal(await RecipeStorageService.saveList(updated, {
        expectedOwnerId: 'owner-A',
        validateBeforeCommit: async ({ ownerId }) => ownerId === 'owner-A'
    }), true);
    assert.deepEqual(JSON.parse(localStorage.getItem(ownerKeyA)), updated);
});

test('owner change already ahead in the FIFO rejects a pinned stale save', async () => {
    const switching = RecipeStorageService.setOwner('owner-B');
    const staleSave = RecipeStorageService.saveList([{ id: 'must-not-land', nama: 'Sesi lama' }], {
        expectedOwnerId: 'owner-A',
        validateBeforeCommit: async () => true
    });

    await switching;
    await assert.rejects(staleSave, error => error.code === 'RECIPE_OWNER_CHANGED');
    assert.equal(localStorage.getItem(`${RecipeStorageService.STORAGE_KEY}::owner-B`), null);
    assert.deepEqual(JSON.parse(localStorage.getItem(ownerKeyA)), [{ id: 'saved-A', nama: 'Simpan berikutnya' }]);
});

test('cleanup restores globals for other test environments', async () => {
    await RecipeStorageService.clearOwner();
    restoreGlobal('window', originalWindow);
    restoreGlobal('document', originalDocument);
    restoreGlobal('localStorage', originalLocalStorage);
    assert.ok(true);
});
