/** [AI-GENERATED][QA][V274] Verify recipe-copy persistence is serialized and truthful. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const appCore = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');
const copyHandlerStart = appCore.indexOf("card.querySelector('.recipe-copy-btn').addEventListener('click'");
const copyHandlerEnd = appCore.indexOf("card.querySelector('.recipe-share-btn').addEventListener('click'", copyHandlerStart);
assert.ok(copyHandlerStart >= 0 && copyHandlerEnd > copyHandlerStart, 'recipe copy handler must exist');
const copyHandler = appCore.slice(copyHandlerStart, copyHandlerEnd);

test('recipe copy commits only the durable list and uses the stable AuthService client', () => {
    assert.match(copyHandler, /await RecipeStorageService\.duplicateAndSave\(duplicatedRecipe/);
    assert.match(copyHandler, /daftarResep\s*=\s*copyResult\.recipes/);
    assert.match(copyHandler, /catch\s*\(persistError\)[\s\S]*?return;/);
    assert.match(copyHandler, /syncRecipeToSupabase\([\s\S]*?copyResult\.ownerId/);
    assert.doesNotMatch(copyHandler, /daftarResep\.unshift\(duplicatedRecipe\)/);
    assert.doesNotMatch(copyHandler, /syncRecipeToSupabase\(supabase\s*,/);
    assert.doesNotMatch(appCore, /typeof\s+supabase\s*!==\s*['"]undefined['"]/);
});

test('RecipeStorageService duplicate transaction preserves existing data on persistence failure', async () => {
    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;
    const originalStorage = globalThis.localStorage;
    const data = new Map();
    let failWritesFor = null;
    let failWritesOverLength = null;

    globalThis.window = {};
    globalThis.document = {
        readyState: 'loading',
        addEventListener() {}
    };
    globalThis.localStorage = {
        getItem(key) { return data.has(String(key)) ? data.get(String(key)) : null; },
        setItem(key, value) {
            const normalizedKey = String(key);
            if (normalizedKey === failWritesFor) {
                const parsed = (() => { try { return JSON.parse(String(value)); } catch { return null; } })();
                if (failWritesOverLength == null || (Array.isArray(parsed) && parsed.length > failWritesOverLength)) {
                    throw new Error('quota exceeded');
                }
            }
            data.set(normalizedKey, String(value));
        },
        removeItem(key) { data.delete(String(key)); },
        clear() { data.clear(); }
    };

    try {
        const { RecipeStorageService } = await import('../assets/js/recipe-storage-service.js?test=v274-recipe-copy');
        await RecipeStorageService.setOwner('recipe-copy-owner');
        const ownerKey = `${RecipeStorageService.STORAGE_KEY}::recipe-copy-owner`;
        const existingRecipes = [{ id: 'existing-1', nama: 'Resep Lama' }];
        assert.equal(await RecipeStorageService.saveList(existingRecipes), true);

        const persistedCopy = await RecipeStorageService.duplicateAndSave({ id: 'copy-1', nama: 'Resep Salinan' });
        assert.equal(persistedCopy.ownerId, 'recipe-copy-owner');
        assert.equal(persistedCopy.truncated, false);
        assert.deepEqual(persistedCopy.recipes.map(item => item.id), ['copy-1', 'existing-1']);
        assert.deepEqual(JSON.parse(data.get(ownerKey)).map(item => item.id), ['copy-1', 'existing-1']);

        await assert.rejects(
            RecipeStorageService.duplicateAndSave({ id: 'copy-1', nama: 'ID Duplikat' }),
            error => error.code === 'RECIPE_DUPLICATE_ID_CONFLICT'
        );

        // Simulate a storage-limit retry: the full list fails, but a capped list
        // succeeds. The newest copy must remain in the actual persisted result.
        const fullExistingList = [
            { id: 'old-1', nama: 'Lama 1' },
            { id: 'old-2', nama: 'Lama 2' },
            { id: 'old-3', nama: 'Lama 3' }
        ];
        assert.equal(await RecipeStorageService.saveList(fullExistingList), true);
        failWritesFor = ownerKey;
        failWritesOverLength = 3;
        const limitedCopy = await RecipeStorageService.duplicateAndSave(
            { id: 'copy-limited', nama: 'Salinan Terbaru' },
            { maxItems: 3, notifyStorageLimit: false }
        );
        assert.equal(limitedCopy.truncated, true);
        assert.deepEqual(limitedCopy.recipes.map(item => item.id), ['copy-limited', 'old-1', 'old-2']);
        assert.deepEqual(JSON.parse(data.get(ownerKey)).map(item => item.id), ['copy-limited', 'old-1', 'old-2']);

        failWritesOverLength = null;
        const durableBeforeFailure = data.get(ownerKey);
        failWritesFor = ownerKey;
        await assert.rejects(
            RecipeStorageService.duplicateAndSave({ id: 'copy-2', nama: 'Salinan Gagal' }),
            error => error.code === 'RECIPE_STORAGE_WRITE_FAILED'
        );
        assert.equal(data.get(ownerKey), durableBeforeFailure, 'a failed copy must not replace the persisted recipe list');

        await assert.rejects(
            RecipeStorageService.saveList([]),
            error => error.code === 'RECIPE_STORAGE_WRITE_FAILED'
        );
        assert.equal(data.get(ownerKey), durableBeforeFailure, 'an empty list must not report success when its storage write fails');

        failWritesFor = null;
        await RecipeStorageService.clearOwner();
        await assert.rejects(
            RecipeStorageService.duplicateAndSave({ id: 'copy-signed-out', nama: 'Tanpa Pemilik' }),
            error => error.code === 'RECIPE_OWNER_REQUIRED'
        );
    } finally {
        if (originalWindow === undefined) delete globalThis.window;
        else globalThis.window = originalWindow;
        if (originalDocument === undefined) delete globalThis.document;
        else globalThis.document = originalDocument;
        if (originalStorage === undefined) delete globalThis.localStorage;
        else globalThis.localStorage = originalStorage;
    }
});
