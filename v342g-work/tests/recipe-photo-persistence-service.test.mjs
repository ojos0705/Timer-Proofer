/** [AI-GENERATED][QA][V195] Persistence contract tests using an in-memory IndexedDB API double. */
import test from 'node:test';
import assert from 'node:assert/strict';

class FakeRequest {
    result = undefined;
    error = null;
    onsuccess = null;
    onerror = null;
    onupgradeneeded = null;
    onblocked = null;
}

class FakeCursor {
    constructor(request, transaction, records, position, store) {
        this._request = request;
        this._transaction = transaction;
        this._records = records;
        this._position = position;
        this._store = store;
        this.key = records[position];
        this.value = store.records.get(this.key);
    }
    delete() {
        // Cursor deletion is reflected before the next cursor step, as IndexedDB
        // transactions guarantee ordering for requests from the same transaction.
        this._store.records.delete(this.key);
        const request = new FakeRequest();
        queueMicrotask(() => request.onsuccess?.({ target: request }));
        return request;
    }
    continue() {
        if (this._transaction.database.idb.failNextCursorContinue) {
            this._transaction.database.idb.failNextCursorContinue = false;
            throw new Error('cursor.continue gagal sinkron untuk QA.');
        }
        const nextPosition = this._position + 1;
        this._transaction._enqueue(this._request, () => {
            for (let index = nextPosition; index < this._records.length; index += 1) {
                const key = this._records[index];
                if (this._store.records.has(key)) {
                    return new FakeCursor(this._request, this._transaction, this._records, index, this._store);
                }
            }
            return null;
        });
    }
}

class FakeObjectStore {
    constructor(transaction, records) {
        this.transaction = transaction;
        this.records = records;
    }
    put(value) {
        const request = new FakeRequest();
        this.transaction._enqueue(request, () => {
            if (!value || typeof value.key !== 'string') throw new Error('Data key tidak valid');
            this.records.set(value.key, structuredClone(value));
            return value.key;
        });
        return request;
    }
    openCursor() {
        if (this.transaction.database.idb.failNextOpenCursor) {
            this.transaction.database.idb.failNextOpenCursor = false;
            throw new Error('openCursor gagal sinkron untuk QA.');
        }
        const request = new FakeRequest();
        const records = [...this.records.keys()].sort();
        this.transaction._enqueue(request, () => {
            if (records.length === 0) return null;
            return new FakeCursor(request, this.transaction, records, 0, this);
        });
        return request;
    }
}

class FakeTransaction {
    constructor(database, storeName, mode) {
        this.database = database;
        this.storeName = storeName;
        this.mode = mode;
        this.pending = 0;
        this.completeScheduled = false;
        this.completed = false;
        this.aborted = false;
        this.onerror = null;
        this.onabort = null;
        this.oncomplete = null;
    }
    abort() {
        if (this.aborted || this.completed) throw new Error('Transaksi tidak dapat dibatalkan lagi.');
        this.aborted = true;
        this.database.idb.abortCount += 1;
        queueMicrotask(() => this.onabort?.({ target: this }));
    }
    objectStore(name) {
        if (this.database.idb.failNextObjectStore) {
            this.database.idb.failNextObjectStore = false;
            throw new Error('objectStore gagal sinkron untuk QA.');
        }
        if (name !== this.storeName) throw new Error(`Object store tidak dikenal: ${name}`);
        const records = this.database.state.stores.get(name);
        if (!records) throw new Error(`Object store tidak ditemukan: ${name}`);
        return new FakeObjectStore(this, records);
    }
    _enqueue(request, action) {
        this.pending += 1;
        setTimeout(() => {
            try {
                request.result = action();
                request.onsuccess?.({ target: request });
            } catch (error) {
                request.error = error;
                request.onerror?.({ target: request });
                this.onerror?.({ target: this, error });
            } finally {
                this.pending -= 1;
                this._scheduleComplete();
            }
        }, 0);
    }
    _scheduleComplete() {
        if (this.pending !== 0 || this.completeScheduled || this.completed || this.aborted) return;
        this.completeScheduled = true;
        queueMicrotask(() => {
            this.completeScheduled = false;
            if (this.pending !== 0 || this.completed) return;
            this.completed = true;
            this.oncomplete?.({ target: this });
        });
    }
}

class FakeDatabase {
    constructor(state, idb) {
        this.state = state;
        this.idb = idb;
        this.closed = false;
        this.onversionchange = null;
        this.objectStoreNames = {
            contains: (name) => this.state.stores.has(name)
        };
    }
    createObjectStore(name, options = {}) {
        if (this.state.stores.has(name)) throw new Error(`Object store duplikat: ${name}`);
        if (options.keyPath !== 'key') throw new Error('Key path yang tidak didukung');
        this.state.stores.set(name, new Map());
        return {};
    }
    transaction(storeName, mode) {
        if (this.closed) throw new Error('Database sudah ditutup.');
        if (this.idb.failNextTransaction) {
            this.idb.failNextTransaction = false;
            throw new Error('Transaksi sengaja gagal untuk QA.');
        }
        if (!this.state.stores.has(storeName)) throw new Error(`Object store tidak ditemukan: ${storeName}`);
        return new FakeTransaction(this, storeName, mode);
    }
    close() {
        if (this.closed) return;
        this.closed = true;
        this.idb.closeCount += 1;
    }
}

class FakeIndexedDB {
    constructor() {
        this.databases = new Map();
        this.failNextTransaction = false;
        this.failNextObjectStore = false;
        this.failNextOpenCursor = false;
        this.failNextCursorContinue = false;
        this.abortCount = 0;
        this.blockNextOpen = false;
        this.versionChangeNextOpen = false;
        this.closeCount = 0;
        this.lastOpenedDatabase = null;
    }
    open(name, version) {
        const request = new FakeRequest();
        const delayMs = this.blockNextOpen ? 15 : 0;
        const shouldBlock = this.blockNextOpen;
        const shouldVersionChange = this.versionChangeNextOpen;
        this.blockNextOpen = false;
        this.versionChangeNextOpen = false;
        if (shouldBlock) {
            setTimeout(() => request.onblocked?.({ target: request }), 0);
        }
        setTimeout(() => {
            let state = this.databases.get(name);
            const isNew = !state;
            if (!state) {
                state = { version, stores: new Map() };
                this.databases.set(name, state);
            }
            request.result = new FakeDatabase(state, this);
            this.lastOpenedDatabase = request.result;
            if (isNew || version > state.version) {
                state.version = version;
                try {
                    request.onupgradeneeded?.({ target: request, oldVersion: isNew ? 0 : state.version, newVersion: version });
                } catch (error) {
                    request.error = error;
                    request.onerror?.({ target: request });
                    return;
                }
            }
            queueMicrotask(() => {
                request.onsuccess?.({ target: request });
                if (shouldVersionChange) request.result?.onversionchange?.({ target: request.result });
            });
        }, delayMs);
        return request;
    }
}

globalThis.indexedDB = new FakeIndexedDB();
globalThis.window = {};
const { RecipePhotoPersistenceService: persistence } = await import('../assets/js/recipe-photo-persistence-service.js');

function photo(name, bytes, type = 'image/jpeg') {
    return new File([new Uint8Array(bytes)], name, { type });
}
async function bytesOf(blob) {
    return [...new Uint8Array(await blob.arrayBuffer())];
}
function allEmpty(slots) { return slots.every((slot) => slot === null); }

 test('save and restore preserve sparse slot positions, names, types, and bytes', async () => {
    const owner = 'owner-v194-save-restore';
    const recipe = 'recipe-sparse-slots';
    const slots = Array(5).fill(null);
    slots[0] = photo('utama.jpg', [1, 2, 3]);
    slots[3] = photo('kemasan.png', [8, 9], 'image/png');

    assert.equal(await persistence.replaceRecipePhotos(owner, recipe, slots), true);
    const loaded = await persistence.loadRecipePhotos(owner, recipe);

    assert.equal(loaded.length, 5);
    assert.equal(loaded[0].name, 'utama.jpg');
    assert.equal(loaded[0].type, 'image/jpeg');
    assert.deepEqual(await bytesOf(loaded[0]), [1, 2, 3]);
    assert.equal(loaded[1], null);
    assert.equal(loaded[2], null);
    assert.equal(loaded[3].name, 'kemasan.png');
    assert.equal(loaded[3].type, 'image/png');
    assert.deepEqual(await bytesOf(loaded[3]), [8, 9]);
    assert.equal(loaded[4], null);
});

test('replace removes stale slots but never changes a different recipe owner scope', async () => {
    const owner = 'owner-v194-scope';
    const otherOwner = 'other-owner-v194-scope';
    const recipe = 'recipe-a';
    const otherRecipe = 'recipe-b';
    await persistence.replaceRecipePhotos(owner, recipe, [photo('old-0.jpg', [1]), photo('old-1.jpg', [2])]);
    await persistence.replaceRecipePhotos(owner, otherRecipe, [photo('peer.jpg', [3])]);
    await persistence.replaceRecipePhotos(otherOwner, recipe, [photo('other-owner.jpg', [4])]);

    const replacement = Array(5).fill(null);
    replacement[4] = photo('replacement.jpg', [9, 8]);
    assert.equal(await persistence.replaceRecipePhotos(owner, recipe, replacement), true);

    const loaded = await persistence.loadRecipePhotos(owner, recipe);
    assert.equal(allEmpty(loaded.slice(0, 4)), true);
    assert.equal(loaded[4].name, 'replacement.jpg');
    assert.equal((await persistence.loadRecipePhotos(owner, otherRecipe))[0].name, 'peer.jpg');
    assert.equal((await persistence.loadRecipePhotos(otherOwner, recipe))[0].name, 'other-owner.jpg');
});

test('delete removes all photos for only the selected owner and recipe', async () => {
    const owner = 'owner-v194-delete';
    const recipe = 'recipe-delete';
    const peer = 'recipe-keep';
    await persistence.replaceRecipePhotos(owner, recipe, [photo('delete-me.jpg', [1])]);
    await persistence.replaceRecipePhotos(owner, peer, [photo('keep-me.jpg', [2])]);

    assert.equal(await persistence.deleteRecipePhotos(owner, recipe), true);
    assert.equal(allEmpty(await persistence.loadRecipePhotos(owner, recipe)), true);
    assert.equal((await persistence.loadRecipePhotos(owner, peer))[0].name, 'keep-me.jpg');
});

test('missing owner or recipe identifiers do not create or expose records', async () => {
    assert.equal(await persistence.replaceRecipePhotos('', 'recipe', [photo('x.jpg', [1])]), false);
    assert.deepEqual(await persistence.loadRecipePhotos(null, 'recipe'), []);
    assert.equal(await persistence.deleteRecipePhotos('owner', null), false);
});

test('permanent account cleanup removes every recipe photo for that owner only', async () => {
    const owner = 'owner-v224-account-delete';
    const otherOwner = 'other-owner-v224-account-delete';
    await persistence.replaceRecipePhotos(owner, 'recipe-one', [photo('one.jpg', [1])]);
    await persistence.replaceRecipePhotos(owner, 'recipe-two', [photo('two.jpg', [2])]);
    await persistence.replaceRecipePhotos(otherOwner, 'recipe-one', [photo('keep.jpg', [9])]);

    assert.equal(await persistence.deleteAllPhotosForOwner(owner), true);
    assert.equal(allEmpty(await persistence.loadRecipePhotos(owner, 'recipe-one')), true);
    assert.equal(allEmpty(await persistence.loadRecipePhotos(owner, 'recipe-two')), true);
    assert.equal((await persistence.loadRecipePhotos(otherOwner, 'recipe-one'))[0].name, 'keep.jpg');
    assert.equal(await persistence.replaceRecipePhotos(owner, 'late-recipe', [photo('stale.jpg', [7])]), false);
    assert.equal(allEmpty(await persistence.loadRecipePhotos(owner, 'late-recipe')), true);
});

test('permanent account cleanup rejects a missing owner instead of deleting globally', async () => {
    const owner = 'owner-v224-missing-owner-guard';
    await persistence.replaceRecipePhotos(owner, 'recipe-guard', [photo('retain.jpg', [4])]);

    assert.equal(await persistence.deleteAllPhotosForOwner(null), false);
    assert.equal((await persistence.loadRecipePhotos(owner, 'recipe-guard'))[0].name, 'retain.jpg');
});

test('IndexedDB unavailability rejects cleanly and the serialized queue recovers', async () => {
    const original = globalThis.indexedDB;
    try {
        globalThis.indexedDB = undefined;
        await assert.rejects(
            persistence.replaceRecipePhotos('owner-v194-recovery', 'recipe', [photo('unavailable.jpg', [1])]),
            /IndexedDB tidak tersedia/
        );
    } finally {
        globalThis.indexedDB = original;
    }

    assert.equal(await persistence.replaceRecipePhotos('owner-v194-recovery', 'recipe', [photo('recovered.jpg', [7])]), true);
    assert.equal((await persistence.loadRecipePhotos('owner-v194-recovery', 'recipe'))[0].name, 'recovered.jpg');
});


test('transaction setup failure closes its database handle and the queue recovers', async () => {
    const owner = 'owner-v194-transaction-failure';
    const database = globalThis.indexedDB;
    const closedBefore = database.closeCount;
    database.failNextTransaction = true;

    await assert.rejects(
        persistence.replaceRecipePhotos(owner, 'recipe', [photo('not-saved.jpg', [1])]),
        /Transaksi sengaja gagal/
    );
    assert.equal(database.closeCount, closedBefore + 1);
    assert.equal(await persistence.replaceRecipePhotos(owner, 'recipe', [photo('saved-after-failure.jpg', [2])]), true);
    assert.equal((await persistence.loadRecipePhotos(owner, 'recipe'))[0].name, 'saved-after-failure.jpg');
});


test('composite IDs cannot collide or delete legacy records from another owner scope', async () => {
    const owner = 'acct';
    const recipe = 'recipe::sub';
    const peerOwner = 'acct::recipe';
    const peerRecipe = 'sub';
    const database = globalThis.indexedDB;
    const state = database.databases.get(persistence.keys.db);
    assert.ok(state, 'Database should already exist from previous persistence tests.');
    const records = state.stores.get(persistence.keys.store);

    // Seed an existing legacy-format key whose string prefix collides with the
    // target scope. This record represents a different owner/recipe pair.
    records.set(`${peerOwner}::${peerRecipe}::0`, {
        key: `${peerOwner}::${peerRecipe}::0`,
        ownerId: peerOwner,
        recipeId: peerRecipe,
        slotIndex: 0,
        blob: photo('legacy-peer.jpg', [7, 7, 7]),
        name: 'legacy-peer.jpg',
        type: 'image/jpeg',
        size: 3,
        updatedAt: Date.now()
    });

    assert.equal(await persistence.replaceRecipePhotos(owner, recipe, [photo('target.jpg', [1, 2, 3])]), true);
    assert.equal((await persistence.loadRecipePhotos(owner, recipe))[0].name, 'target.jpg');
    assert.equal((await persistence.loadRecipePhotos(peerOwner, peerRecipe))[0].name, 'legacy-peer.jpg');

    // Updating the peer migrates it to the escaped key format. Both scopes can
    // then be written independently even though their legacy keys overlapped.
    assert.equal(await persistence.replaceRecipePhotos(peerOwner, peerRecipe, [photo('peer-new.jpg', [6, 6])]), true);
    assert.equal((await persistence.loadRecipePhotos(peerOwner, peerRecipe))[0].name, 'peer-new.jpg');
    assert.equal((await persistence.loadRecipePhotos(owner, recipe))[0].name, 'target.jpg');

    // Mutate/delete only the target scope; the peer record must survive.
    assert.equal(await persistence.replaceRecipePhotos(owner, recipe, [photo('target-new.jpg', [4, 5, 6])]), true);
    assert.equal((await persistence.loadRecipePhotos(owner, recipe))[0].name, 'target-new.jpg');
    assert.equal((await persistence.loadRecipePhotos(peerOwner, peerRecipe))[0].name, 'peer-new.jpg');
    await persistence.deleteRecipePhotos(owner, recipe);
    assert.equal((await persistence.loadRecipePhotos(peerOwner, peerRecipe))[0].name, 'peer-new.jpg');
});

// [AI-GENERATED][QA][V232] Invalid non-Blob values must not be treated as delete requests.
test('malformed non-Blob slots fail closed and preserve previously saved photos', async () => {
    const owner = 'owner-v232-invalid-photo-payload';
    const recipe = 'recipe-preserve-on-invalid-payload';
    const original = photo('preserve-this.jpg', [3, 1, 4, 1, 5]);
    assert.equal(await persistence.replaceRecipePhotos(owner, recipe, [original]), true);

    for (const invalid of ['not-a-photo', false, {}, 0]) {
        const malformedSlots = Array(5).fill(null);
        malformedSlots[2] = invalid;
        assert.equal(await persistence.replaceRecipePhotos(owner, recipe, malformedSlots), false);
        const restored = await persistence.loadRecipePhotos(owner, recipe);
        assert.equal(restored[0].name, 'preserve-this.jpg');
        assert.deepEqual(await bytesOf(restored[0]), [3, 1, 4, 1, 5]);
    }

    for (const invalidContainer of [null, '', 'malformed', {}]) {
        assert.equal(await persistence.replaceRecipePhotos(owner, recipe, invalidContainer), false);
        const restored = await persistence.loadRecipePhotos(owner, recipe);
        assert.equal(restored[0].name, 'preserve-this.jpg');
        assert.deepEqual(await bytesOf(restored[0]), [3, 1, 4, 1, 5]);
    }
});

// [AI-GENERATED][QA][V231] Regressions for restricted WebViews without the Blob constructor.
test('missing Blob support rejects photo replacement before clearing previously saved photos', async () => {
    const owner = 'owner-v231-no-blob-replace';
    const recipe = 'recipe-keep-existing';
    const originalPhoto = photo('keep-existing.jpg', [1, 2, 3]);
    const requestedReplacement = photo('replacement.jpg', [9, 8, 7]);
    assert.equal(await persistence.replaceRecipePhotos(owner, recipe, [originalPhoto]), true);

    const originalBlob = globalThis.Blob;
    try {
        globalThis.Blob = undefined;
        assert.equal(await persistence.replaceRecipePhotos(owner, recipe, [requestedReplacement]), false);
    } finally {
        globalThis.Blob = originalBlob;
    }

    const restored = await persistence.loadRecipePhotos(owner, recipe);
    assert.equal(restored[0].name, 'keep-existing.jpg');
    assert.deepEqual(await bytesOf(restored[0]), [1, 2, 3]);
});

test('photo restore degrades safely to empty slots when Blob constructor is unavailable', async () => {
    const owner = 'owner-v231-no-blob-load';
    const recipe = 'recipe-no-blob-load';
    assert.equal(await persistence.replaceRecipePhotos(owner, recipe, [photo('persisted.jpg', [4, 5])]), true);

    const originalBlob = globalThis.Blob;
    try {
        globalThis.Blob = undefined;
        const slots = await persistence.loadRecipePhotos(owner, recipe);
        assert.equal(slots.length, 5);
        assert.equal(slots.every((slot) => slot === null), true);
    } finally {
        globalThis.Blob = originalBlob;
    }
});


// [AI-GENERATED][QA][V281] IndexedDB connections must not block upgrades or leak after a blocked open.
test('blocked IndexedDB open rejects promptly, closes a late connection, and queue recovers', async () => {
    const database = globalThis.indexedDB;
    const closedBefore = database.closeCount;
    database.blockNextOpen = true;

    await assert.rejects(
        persistence.loadRecipePhotos('owner-v281-blocked', 'recipe'),
        (error) => error?.code === 'INDEXEDDB_OPEN_BLOCKED'
    );
    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.equal(database.closeCount, closedBefore + 1, 'late open success must close its database handle');

    assert.equal(await persistence.replaceRecipePhotos('owner-v281-blocked', 'recipe', [photo('recovered.jpg', [2])]), true);
    assert.equal((await persistence.loadRecipePhotos('owner-v281-blocked', 'recipe'))[0].name, 'recovered.jpg');
});

test('database connection closes on versionchange and the persistence queue recovers', async () => {
    const database = globalThis.indexedDB;
    const closedBefore = database.closeCount;
    database.versionChangeNextOpen = true;

    await assert.rejects(
        persistence.loadRecipePhotos('owner-v281-versionchange', 'recipe'),
        /Database sudah ditutup/
    );
    assert.equal(database.closeCount, closedBefore + 1, 'versionchange must close the stale connection');

    assert.equal(await persistence.replaceRecipePhotos('owner-v281-versionchange', 'recipe', [photo('reopened.jpg', [3])]), true);
    assert.equal((await persistence.loadRecipePhotos('owner-v281-versionchange', 'recipe'))[0].name, 'reopened.jpg');
});

// [AI-GENERATED][QA][V282] Synchronous transaction setup errors must release connections and not poison the FIFO.
test('synchronous objectStore/openCursor setup failures close connections and the persistence queue recovers', async () => {
    const database = globalThis.indexedDB;
    const owner = 'owner-v282-setup-failure';
    const recipe = 'recipe-preserve-on-setup-failure';
    assert.equal(await persistence.replaceRecipePhotos(owner, recipe, [photo('keep.jpg', [5, 6, 7])]), true);

    let closedBefore = database.closeCount;
    database.failNextObjectStore = true;
    await assert.rejects(
        persistence.loadRecipePhotos(owner, recipe),
        /objectStore gagal sinkron untuk QA/
    );
    assert.equal(database.closeCount, closedBefore + 1, 'objectStore setup failure must close the database handle');

    closedBefore = database.closeCount;
    database.failNextOpenCursor = true;
    await assert.rejects(
        persistence.replaceRecipePhotos(owner, recipe, [photo('must-not-replace.jpg', [9])]),
        /openCursor gagal sinkron untuk QA/
    );
    assert.equal(database.closeCount, closedBefore + 1, 'openCursor setup failure must close the database handle');

    const restored = await persistence.loadRecipePhotos(owner, recipe);
    assert.equal(restored[0].name, 'keep.jpg', 'failed transaction setup must preserve existing photos');
    assert.deepEqual(await bytesOf(restored[0]), [5, 6, 7]);

    assert.equal(await persistence.replaceRecipePhotos(owner, recipe, [photo('recovered.jpg', [1, 2])]), true);
    assert.equal((await persistence.loadRecipePhotos(owner, recipe))[0].name, 'recovered.jpg');
});

test('release IndexedDB lifecycle handling is present and documented in the service', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(new URL('../assets/js/recipe-photo-persistence-service.js', import.meta.url), 'utf8');
    assert.match(source, /request\.onblocked\s*=/);
    assert.match(source, /db\.onversionchange\s*=/);
    assert.match(source, /if \(settled\)[\s\S]*?db\?\.close\?\.\(\)/);
});


// [AI-GENERATED][QA][V283] Exceptions inside IDB request handlers must abort and settle explicitly.
test('synchronous cursor continuation failure aborts the transaction, closes the DB, and recovers the queue', async () => {
    const database = globalThis.indexedDB;
    const owner = 'owner-v283-cursor-callback-failure';
    const recipe = 'recipe-preserve-on-cursor-failure';
    assert.equal(await persistence.replaceRecipePhotos(owner, recipe, [photo('keep.jpg', [2, 4, 6])]), true);

    const closedBefore = database.closeCount;
    const abortsBefore = database.abortCount;
    database.failNextCursorContinue = true;
    await assert.rejects(
        persistence.loadRecipePhotos(owner, recipe),
        /cursor\.continue gagal sinkron untuk QA/
    );
    assert.equal(database.closeCount, closedBefore + 1, 'handler failure must close the database connection');
    assert.equal(database.abortCount, abortsBefore + 1, 'handler failure must explicitly abort its active transaction');

    const restored = await persistence.loadRecipePhotos(owner, recipe);
    assert.equal(restored[0].name, 'keep.jpg');
    assert.deepEqual(await bytesOf(restored[0]), [2, 4, 6]);
    assert.equal(await persistence.replaceRecipePhotos(owner, recipe, [photo('after-failure.jpg', [8, 8])]), true);
    assert.equal((await persistence.loadRecipePhotos(owner, recipe))[0].name, 'after-failure.jpg');
});
