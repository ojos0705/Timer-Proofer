/** [AI-GENERATED][QA][V276] Queued recipe writes and cloud sync stay bound to their originating owner. */
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

test('queued save, upsert, and copy from owner A cannot mutate owner B after an owner switch', async () => {
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

    try {
        const { RecipeStorageService } = await import('../assets/js/recipe-storage-service.js?test=v276-write-owner-race');
        await RecipeStorageService.setOwner('owner-A');
        await RecipeStorageService.saveList([{ id: 'a-original', nama: 'Data A' }]);

        const ownerAKey = `${RecipeStorageService.STORAGE_KEY}::owner-A`;
        const ownerBKey = `${RecipeStorageService.STORAGE_KEY}::owner-B`;

        // Capture owner A at each public API boundary, then queue owner B first.
        // Those operations must reject rather than writing into B after the queue advances.
        const switchingToB = RecipeStorageService.setOwner('owner-B');
        const staleSave = RecipeStorageService.saveList([{ id: 'stale-save-a', nama: 'Data lama A' }]);
        const staleUpsert = RecipeStorageService.upsert({ id: 'stale-upsert-a', nama: 'Upsert lama A' });
        const staleCopy = RecipeStorageService.duplicateAndSave({ id: 'stale-copy-a', nama: 'Salinan lama A' });

        await switchingToB;
        const outcomes = await Promise.allSettled([staleSave, staleUpsert, staleCopy]);
        for (const outcome of outcomes) {
            assert.equal(outcome.status, 'rejected');
            assert.equal(outcome.reason.code, 'RECIPE_OWNER_CHANGED');
        }

        assert.deepEqual(JSON.parse(localStorage.getItem(ownerAKey)).map(recipe => recipe.id), ['a-original']);
        assert.equal(localStorage.getItem(ownerBKey), null, 'stale owner-A calls must not create a recipe list for B');

        await RecipeStorageService.saveList([{ id: 'b-original', nama: 'Data B' }]);
        assert.deepEqual(JSON.parse(localStorage.getItem(ownerBKey)).map(recipe => recipe.id), ['b-original']);
        await RecipeStorageService.clearOwner();
    } finally {
        restoreGlobal('window', originalWindow);
        restoreGlobal('document', originalDocument);
        restoreGlobal('localStorage', originalLocalStorage);
    }
});

test('cloud recipe pull/push aborts if the authenticated account differs from the local namespace', async () => {
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const localStorage = createLocalStorage();
    let cloudCalls = 0;

    Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value: {} });
    Object.defineProperty(globalThis, 'document', {
        configurable: true,
        writable: true,
        value: { readyState: 'loading', addEventListener() {} }
    });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: localStorage });

    try {
        const { RecipeStorageService } = await import('../assets/js/recipe-storage-service.js?test=v276-cloud-owner-alignment');
        await RecipeStorageService.setOwner('owner-B');
        await RecipeStorageService.saveList([{ id: 'b-private', nama: 'Resep privat B' }]);

        const client = {
            auth: {
                async getUser() {
                    return { data: { user: { id: 'owner-A' } }, error: null };
                }
            },
            from() {
                cloudCalls += 1;
                throw new Error('Cloud mutation/read must not be reached after owner mismatch.');
            }
        };

        const pushResult = await RecipeStorageService.syncListToSupabase(client, [
            { id: 'b-private', nama: 'Resep privat B' }
        ]);
        assert.equal(pushResult.aborted, true);
        assert.equal(pushResult.reason, 'owner-changed');

        const localPushResult = await RecipeStorageService.syncLocalToSupabase(client);
        assert.equal(localPushResult.aborted, true);
        assert.equal(localPushResult.reason, 'owner-changed');

        const pullResult = await RecipeStorageService.syncFromSupabase(client);
        assert.equal(pullResult.aborted, true);
        assert.equal(pullResult.reason, 'owner-changed');
        assert.deepEqual(pullResult.recipes, []);

        assert.equal(cloudCalls, 0, 'no cloud SELECT/UPSERT/DELETE should run for a mismatched local owner');
        assert.deepEqual(
            JSON.parse(localStorage.getItem(`${RecipeStorageService.STORAGE_KEY}::owner-B`)).map(recipe => recipe.id),
            ['b-private'],
            'owner B local data must remain intact'
        );
        await RecipeStorageService.clearOwner();
    } finally {
        restoreGlobal('window', originalWindow);
        restoreGlobal('document', originalDocument);
        restoreGlobal('localStorage', originalLocalStorage);
    }
});
