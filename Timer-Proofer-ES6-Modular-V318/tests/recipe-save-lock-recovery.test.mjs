/** [AI-GENERATED][QA][V279] Owner/editor-bound recipe saves always release the in-flight lock. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../assets/js/app-core.js', import.meta.url), 'utf8');
const start = source.indexOf('async function simpanResepKeDatabase()');
const end = source.indexOf('\n\n// ==========================================\n// FUNGSI SINKRONISASI DATA OFFLINE KE SUPABASE', start);
assert.ok(start >= 0 && end > start, 'canonical recipe-save function must exist');
const saveFunction = source.slice(start, end);

test('recipe save lock is released when the cached-session owner lookup rejects before local persistence', () => {
    assert.match(saveFunction, /if\s*\(isSaving\)\s*return;\s*isSaving\s*=\s*true;[\s\S]*?try\s*\{/);
    assert.match(saveFunction, /saveContext = captureRecipeSaveContext\(\)/);
    assert.match(saveFunction, /await assertRecipeSaveContextCurrent\(saveContext, 'initial'\)/);
    assert.match(saveFunction, /finally\s*\{\s*isSaving\s*=\s*false;\s*\}/);
    const inspectStart = source.indexOf('async function inspectRecipeSaveContext(context)');
    const inspectEnd = source.indexOf('\n}\n\nasync function assertRecipeSaveContextCurrent', inspectStart);
    const inspect = source.slice(inspectStart, inspectEnd);
    assert.match(inspect, /AuthService\.getSessionUser\(\)/, 'owner lookup must use the cached auth session first');
});

test('recipe-form parsing and recipe-domain construction are inside the same try/finally guard', () => {
    const outerTry = saveFunction.indexOf('try {');
    for (const operation of [
        "document.getElementById('recipe-save-name')",
        'bangunObjekResepDariForm(namaResep)',
        "await assertRecipeSaveContextCurrent(saveContext, 'initial')"
    ]) {
        const index = saveFunction.indexOf(operation);
        assert.ok(index > outerTry, `${operation} must run within the guarded save block`);
    }
    assert.match(saveFunction, /catch\s*\(err\)\s*\{[\s\S]*?Gagal menyimpan resep:[\s\S]*?\}\s*finally\s*\{\s*isSaving\s*=\s*false;/);
});

test('recipe save persists locally through the owner-pinned transaction before optional cloud sync', () => {
    const localSave = saveFunction.indexOf('await RecipeStorageService.saveList(daftarResep');
    const cloudSync = saveFunction.indexOf('RecipeStorageService.syncRecipeToSupabase');
    assert.ok(localSave >= 0, 'local recipe persistence must remain present');
    assert.ok(cloudSync > localSave, 'cloud sync must remain after local persistence');
    assert.match(saveFunction, /expectedOwnerId:\s*saveContext\.expectedOwnerId/);
    assert.match(saveFunction, /validateBeforeCommit:\s*async/);
});


function createSaveContext({ getUser, buildRecipe = () => ({ id: 'recipe-test', nama: 'Resep QA' }), captureContext } = {}) {
    const alerts = [];
    const errors = [];
    const context = {
        isSaving: false,
        document: { getElementById: () => ({ value: 'Resep QA' }) },
        bangunObjekResepDariForm: buildRecipe,
        AuthService: { getSessionUser: getUser || (async () => { throw new Error('Auth lookup failed'); }) },
        captureRecipeSaveContext: captureContext || (() => ({ expectedOwnerId: 'user-test', capturedEditorEpoch: 1 })),
        captureRecipeFormFingerprint: () => 'test-fingerprint',
        assertRecipeSaveContextCurrent: async () => context.AuthService.getSessionUser(),
        inspectRecipeSaveContext: async () => ({ current: true, owner: { id: 'user-test' }, error: null }),
        console: { error: (...args) => errors.push(args), warn() {}, log() {} },
        alert: (message) => alerts.push(String(message)),
        navigator: { onLine: false },
        Date,
        String,
        Boolean,
        Array,
        Object,
        Number,
        Math,
        JSON
    };
    vm.runInNewContext(`${saveFunction}\nthis.__save = simpanResepKeDatabase;`, context);
    return { context, alerts, errors };
}

test('rejected cached-session lookup is caught and releases the recipe-save lock', async () => {
    const { context, alerts, errors } = createSaveContext({
        getUser: async () => { throw new Error('Auth lookup failed'); }
    });

    await context.__save();

    assert.equal(context.isSaving, false, 'the save lock must always be released');
    assert.equal(errors.length, 1, 'the failure should be logged once');
    assert.match(alerts[0], /Gagal menyimpan resep: Auth lookup failed/);
});

test('synchronous transaction-context capture failure also releases the recipe-save lock', async () => {
    const { context, alerts, errors } = createSaveContext({
        captureContext: () => { throw new Error('Context capture failed'); }
    });

    await context.__save();

    assert.equal(context.isSaving, false, 'a synchronous guard failure must not strand the lock');
    assert.equal(errors.length, 1);
    assert.match(alerts[0], /Gagal menyimpan resep: Context capture failed/);
});

test('recipe construction failure before storage also releases the recipe-save lock', async () => {
    const { context, alerts } = createSaveContext({
        getUser: async () => ({ id: 'user-test' }),
        buildRecipe: () => { throw new Error('Recipe build failed'); }
    });

    await context.__save();

    assert.equal(context.isSaving, false, 'the save lock must not be stranded by form/domain errors');
    assert.match(alerts[0], /Gagal menyimpan resep: Recipe build failed/);
});
