/** [AI-GENERATED][QA][V275] Account-switch races must not delete another owner's local recipe. */
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

test('stale delete captured for owner A cannot delete a recipe after owner B becomes active', async () => {
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const localStorage = createLocalStorage();
    let releaseAuthCapture;
    let authCalls = 0;

    Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value: {} });
    Object.defineProperty(globalThis, 'document', {
        configurable: true,
        writable: true,
        value: { readyState: 'loading', addEventListener() {} }
    });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: localStorage });

    try {
        const { RecipeStorageService } = await import('../assets/js/recipe-storage-service.js?test=v275-delete-owner-race');
        await RecipeStorageService.setOwner('owner-A');
        await RecipeStorageService.saveList([
            { id: 'recipe-shared-id', nama: 'Resep milik A' },
            { id: 'a-keep', nama: 'Tetap milik A' }
        ]);
        const ownerAKey = `${RecipeStorageService.STORAGE_KEY}::owner-A`;
        const ownerBKey = `${RecipeStorageService.STORAGE_KEY}::owner-B`;

        const client = {
            auth: {
                getUser() {
                    authCalls += 1;
                    if (authCalls === 1) {
                        return new Promise(resolve => { releaseAuthCapture = resolve; });
                    }
                    return Promise.resolve({ data: { user: { id: 'owner-B' } }, error: null });
                }
            },
            from() {
                throw new Error('Cloud DELETE must not run for an aborted stale request.');
            }
        };

        // deleteEverywhere snapshots owner A, then waits for auth before it enters
        // the serialized recipe-operation queue. Account B wins that queue first.
        const pendingDelete = RecipeStorageService.deleteEverywhere(client, 'recipe-shared-id');
        await Promise.resolve();
        assert.equal(typeof releaseAuthCapture, 'function', 'the auth-capture request should be pending');

        await RecipeStorageService.setOwner('owner-B');
        await RecipeStorageService.saveList([
            { id: 'recipe-shared-id', nama: 'Resep milik B' },
            { id: 'b-keep', nama: 'Tetap milik B' }
        ]);
        const ownerBDataBeforeDelete = localStorage.getItem(ownerBKey);
        assert.ok(ownerBDataBeforeDelete, 'owner B test data should be persisted before releasing the stale operation');

        releaseAuthCapture({ data: { user: { id: 'owner-A' } }, error: null });
        const result = await pendingDelete;

        assert.equal(result.aborted, true, 'the stale owner-A delete must be rejected');
        assert.equal(result.reason, 'owner-changed');
        assert.equal(result.ownerId, 'owner-A');
        assert.equal(authCalls, 1, 'the operation should stop before trying to validate/delete as owner B');
        assert.deepEqual(
            JSON.parse(localStorage.getItem(ownerBKey)).map(recipe => recipe.id),
            ['recipe-shared-id', 'b-keep'],
            'owner B recipes must be unchanged'
        );
        assert.deepEqual(
            JSON.parse(localStorage.getItem(ownerAKey)).map(recipe => recipe.id),
            ['recipe-shared-id', 'a-keep'],
            'the stale action must not partially delete owner A data either'
        );

        await RecipeStorageService.clearOwner();
    } finally {
        restoreGlobal('window', originalWindow);
        restoreGlobal('document', originalDocument);
        restoreGlobal('localStorage', originalLocalStorage);
    }
});
