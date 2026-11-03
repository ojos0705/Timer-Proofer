/**
 * [AI-GENERATED][ROBUSTNESS][V138]
 * Device-local persistence boundary for recipe photo blobs.
 *
 * Recipe JSON remains lightweight and cloud-compatible; binary photo data is
 * stored separately in IndexedDB and scoped by authenticated owner + recipe ID.
 * Existing DOM IDs/classes/data-action contracts are intentionally preserved.
 */

const DB_NAME = 'timer_proofer_recipe_photos';
const DB_VERSION = 1;
const STORE_NAME = 'photos';
const MAX_PHOTOS = 5;

// [AI-GENERATED][ROBUSTNESS][V231] Guard the binary boundary against restricted
// WebViews where the Blob constructor is absent. Never evaluate `value instanceof Blob`
// without feature detection; callers must not lose previously saved photos on failure.
function isBlobLike(value) {
    return typeof Blob !== 'undefined' && value instanceof Blob;
}

// [AI-GENERATED][ROBUSTNESS][V148] Serialize every IndexedDB photo operation
// through one failure-tolerant FIFO. Recipe JSON writes are already serialized
// by RecipeStorageService, but photo blobs historically ran outside that queue.
// Without this boundary, an older save/delete could finish after a newer one
// and overwrite the latest slot state. Reads also wait behind prior writes so a
// WebView restore cannot observe an intermediate transaction ordering.
let photoPersistenceQueue = Promise.resolve();
// [AI-GENERATED][PRIVACY][V224] Prevent late async writes from resurrecting photo
// blobs after a permanent account deletion completed in this runtime.
const permanentlyDeletedPhotoOwners = new Set();

function runPhotoPersistenceOperation(operation) {
    const task = photoPersistenceQueue.then(operation);
    photoPersistenceQueue = task.catch(() => undefined);
    return task;
}

// [AI-GENERATED][ROBUSTNESS][V282] Register transaction completion handlers before
// touching objectStore()/openCursor(). Those setup calls can throw synchronously
// in a closed or inconsistent WebView connection; every path must settle the caller,
// abort unfinished work when possible, and release the database handle exactly once.
function managePhotoTransaction(db, transaction, {
    resolve,
    reject,
    onComplete,
    errorMessage,
    abortMessage
}) {
    let settled = false;

    const closeDatabase = () => {
        try { db?.close?.(); }
        catch (error) {
            console.warn('[RecipePhotoPersistence] Gagal menutup koneksi IndexedDB:', error);
        }
    };

    const fail = (error) => {
        if (settled) return;
        settled = true;
        closeDatabase();
        reject(error || new Error(errorMessage));
    };

    transaction.oncomplete = () => {
        if (settled) return;
        let result;
        try {
            // [AI-GENERATED][ROBUSTNESS][V283] Resolve only after the completion
            // callback has produced a value. A future callback regression must not
            // throw from an IndexedDB event and leave the caller Promise pending.
            result = onComplete();
        } catch (error) {
            settled = true;
            closeDatabase();
            reject(error);
            return;
        }
        settled = true;
        closeDatabase();
        resolve(result);
    };
    transaction.onerror = () => fail(transaction.error || new Error(errorMessage));
    transaction.onabort = () => fail(transaction.error || new Error(abortMessage));

    return {
        isSettled() { return settled; },
        failSetup(error) {
            if (settled) return;
            try { transaction.abort?.(); } catch { /* It may already be inactive. */ }
            fail(error || new Error(errorMessage));
        }
    };
}

function normalizeOwnerId(ownerId) {
    if (ownerId == null || ownerId === '') return null;
    return String(ownerId);
}

function normalizeRecipeId(recipeId) {
    if (recipeId == null || recipeId === '') return null;
    return String(recipeId);
}

// [AI-GENERATED][BUG FIX][V195] Escape the composite-key delimiter inside each
// identifier. The previous raw `${owner}::${recipe}::${slot}` format allowed
// (owner='acct', recipe='recipe::sub') to collide with
// (owner='acct::recipe', recipe='sub'), overwriting another scope's photo.
// Ordinary UUID-like IDs remain unchanged; legacy records are still discoverable
// because reads/deletes scope by the stored ownerId and recipeId fields.
function encodeKeyPart(value) {
    return String(value).replace(/%/g, '%25').replace(/:/g, '%3A');
}

function makeKey(ownerId, recipeId, slotIndex) {
    return `${encodeKeyPart(normalizeOwnerId(ownerId))}::${encodeKeyPart(normalizeRecipeId(recipeId))}::${slotIndex}`;
}

function openDatabase() {
    if (typeof indexedDB === 'undefined') {
        return Promise.reject(new Error('IndexedDB tidak tersedia pada platform ini.'));
    }

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        let settled = false;

        const rejectOnce = (error) => {
            if (settled) return;
            settled = true;
            reject(error);
        };

        request.onerror = () => rejectOnce(
            request.error || new Error('Gagal membuka IndexedDB foto resep.')
        );

        // [AI-GENERATED][ROBUSTNESS][V281] Do not leave callers waiting forever
        // when another tab/WebView holds an older connection during an upgrade.
        // A blocked request may still complete later; its late connection is closed
        // by onsuccess below instead of leaking a handle after this Promise rejects.
        request.onblocked = () => {
            const error = new Error('Pembukaan IndexedDB foto resep diblokir oleh koneksi lain.');
            error.code = 'INDEXEDDB_OPEN_BLOCKED';
            rejectOnce(error);
        };

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'key' });
            }
        };

        request.onsuccess = () => {
            const db = request.result;
            // [AI-GENERATED][ROBUSTNESS][V281] Release connections when a newer
            // schema version is requested by another runtime. Otherwise an old tab
            // may keep the upgrade blocked indefinitely.
            if (settled) {
                try { db?.close?.(); } catch { /* Best-effort cleanup of late success. */ }
                return;
            }

            settled = true;
            try {
                db.onversionchange = () => {
                    try { db.close(); } catch (error) {
                        console.warn('[RecipePhotoPersistence] Gagal menutup koneksi saat versionchange:', error);
                    }
                };
            } catch (error) {
                // Some restricted WebViews expose a read-only connection wrapper.
                console.warn('[RecipePhotoPersistence] Handler versionchange tidak tersedia:', error);
            }
            resolve(db);
        };
    });
}

async function replaceRecipePhotosInternal(ownerId, recipeId, slotFiles = []) {
    const normalizedOwner = normalizeOwnerId(ownerId);
    const normalizedRecipe = normalizeRecipeId(recipeId);
    if (!normalizedOwner || !normalizedRecipe) return false;
    // Check at execution time (inside the serialized queue), not only when the
    // call is made, so writes queued behind a completed account cleanup are denied.
    if (permanentlyDeletedPhotoOwners.has(normalizedOwner)) return false;

    // [AI-GENERATED][BUG FIX][V232] Reject a malformed container before reading
    // slots. An empty string or null-like container must not be interpreted as an
    // intentional request to delete every saved photo.
    if (!Array.isArray(slotFiles)) {
        console.warn('[RecipePhotoPersistence] Daftar slot foto tidak valid; foto lama dipertahankan.');
        return false;
    }

    // Preserve explicitly supplied invalid values so they can be rejected instead
    // of silently coerced to empty slots (`value || null` used to hide false/empty-string).
    const files = Array.from({ length: MAX_PHOTOS }, (_, index) => slotFiles[index] ?? null);

    // [AI-GENERATED][BUG FIX][V231] Fail before opening a read-write transaction
    // if binary inputs exist but this runtime cannot identify Blob values. This
    // prevents clearing an older valid photo set and then failing halfway through.
    if (typeof Blob === 'undefined' && files.some((file) => file != null)) {
        console.warn('[RecipePhotoPersistence] Blob tidak tersedia; foto lama dipertahankan.');
        return false;
    }

    // [AI-GENERATED][ROBUSTNESS][V232] A malformed non-null slot is not an
    // instruction to delete the saved photo. Reject the whole replacement before
    // opening IndexedDB so prior valid photos remain intact on caller bugs or bad data.
    if (files.some((file) => file !== null && !isBlobLike(file))) {
        console.warn('[RecipePhotoPersistence] Payload foto tidak valid; foto lama dipertahankan.');
        return false;
    }

    const db = await openDatabase();
    let transaction;
    try {
        transaction = db.transaction(STORE_NAME, 'readwrite');
    } catch (error) {
        // [AI-GENERATED][ROBUSTNESS][V194] Close the DB handle if transaction
        // creation fails (for example, after a partially migrated local DB).
        db.close();
        throw error;
    }

    return new Promise((resolve, reject) => {
        const lifecycle = managePhotoTransaction(db, transaction, {
            resolve,
            reject,
            onComplete: () => true,
            errorMessage: 'Gagal menyimpan foto resep.',
            abortMessage: 'Penyimpanan foto resep dibatalkan.'
        });
        let store;
        let clearRequest;
        try {
            store = transaction.objectStore(STORE_NAME);
            clearRequest = store.openCursor();
        } catch (error) {
            lifecycle.failSetup(error);
            return;
        }
        clearRequest.onsuccess = () => {
            if (lifecycle.isSettled()) return;
            try {
                const cursor = clearRequest.result;
                if (!cursor) {
                    files.forEach((file, slotIndex) => {
                        if (!isBlobLike(file)) return;
                        store.put({
                            key: makeKey(normalizedOwner, normalizedRecipe, slotIndex),
                            ownerId: normalizedOwner,
                            recipeId: normalizedRecipe,
                            slotIndex,
                            blob: file,
                            name: typeof file.name === 'string' ? file.name : `foto-resep-${slotIndex + 1}`,
                            type: file.type || 'application/octet-stream',
                            size: Number(file.size) || 0,
                            updatedAt: Date.now()
                        });
                    });
                    return;
                }

                // [AI-GENERATED][BUG FIX][V195] Never infer ownership from a key
                // prefix. Legacy composite keys may be ambiguous when identifiers
                // contain `::`; stored scope fields are the authoritative match.
                const record = cursor.value;
                if (record?.ownerId === normalizedOwner && record?.recipeId === normalizedRecipe) {
                    cursor.delete();
                }
                cursor.continue();
            } catch (error) {
                // [AI-GENERATED][ROBUSTNESS][V283] Event-handler exceptions must
                // explicitly abort the transaction. A throw from an IndexedDB
                // request callback is not guaranteed to reject our outer Promise.
                lifecycle.failSetup(error);
            }
        };

    });
}

async function loadRecipePhotosInternal(ownerId, recipeId) {
    const normalizedOwner = normalizeOwnerId(ownerId);
    const normalizedRecipe = normalizeRecipeId(recipeId);
    if (!normalizedOwner || !normalizedRecipe) return [];

    const db = await openDatabase();
    let transaction;
    try {
        transaction = db.transaction(STORE_NAME, 'readonly');
    } catch (error) {
        // [AI-GENERATED][ROBUSTNESS][V194] Avoid leaking a connection on setup failure.
        db.close();
        throw error;
    }
    return new Promise((resolve, reject) => {
        const slots = Array(MAX_PHOTOS).fill(null);
        const lifecycle = managePhotoTransaction(db, transaction, {
            resolve,
            reject,
            onComplete: () => slots,
            errorMessage: 'Gagal membaca foto resep.',
            abortMessage: 'Pembacaan foto resep dibatalkan.'
        });
        let request;
        try {
            request = transaction.objectStore(STORE_NAME).openCursor();
        } catch (error) {
            lifecycle.failSetup(error);
            return;
        }

        request.onsuccess = () => {
            if (lifecycle.isSettled()) return;
            try {
                const cursor = request.result;
                if (!cursor) return;
                const value = cursor.value;
                if (value?.ownerId === normalizedOwner && value?.recipeId === normalizedRecipe) {
                    const index = Number(value.slotIndex);
                    if (Number.isInteger(index) && index >= 0 && index < MAX_PHOTOS && isBlobLike(value.blob)) {
                        try {
                            slots[index] = new File(
                                [value.blob],
                                value.name || `foto-resep-${index + 1}`,
                                { type: value.type || value.blob.type || 'application/octet-stream', lastModified: Date.now() }
                            );
                        } catch (error) {
                            // Older/limited WebViews may not expose File(); Blob remains renderable.
                            slots[index] = value.blob;
                        }
                    }
                }
                cursor.continue();
            } catch (error) {
                // [AI-GENERATED][ROBUSTNESS][V283] A failure to advance a cursor
                // must settle the read and release its connection, not escape a
                // request event callback and strand the serialized FIFO.
                lifecycle.failSetup(error);
            }
        };

    });
}

async function replaceRecipePhotos(ownerId, recipeId, slotFiles = []) {
    return runPhotoPersistenceOperation(() =>
        replaceRecipePhotosInternal(ownerId, recipeId, slotFiles)
    );
}

async function loadRecipePhotos(ownerId, recipeId) {
    return runPhotoPersistenceOperation(() =>
        loadRecipePhotosInternal(ownerId, recipeId)
    );
}

async function deleteRecipePhotos(ownerId, recipeId) {
    return replaceRecipePhotos(ownerId, recipeId, []);
}

// [AI-GENERATED][PRIVACY][V224] Permanent account deletion must also remove
// this owner's binary photo records. StorageService.clear() intentionally only
// clears LocalStorage/Capacitor Preferences and cannot remove IndexedDB blobs.
// Never accept an absent owner ID here: a global deletion would risk other users.
async function deleteAllRecipePhotosForOwnerInternal(ownerId) {
    const normalizedOwner = normalizeOwnerId(ownerId);
    if (!normalizedOwner) return false;

    const db = await openDatabase();
    let transaction;
    try {
        transaction = db.transaction(STORE_NAME, 'readwrite');
    } catch (error) {
        db.close();
        throw error;
    }

    return new Promise((resolve, reject) => {
        const lifecycle = managePhotoTransaction(db, transaction, {
            resolve,
            reject,
            onComplete: () => true,
            errorMessage: 'Gagal menghapus seluruh foto resep pemilik akun.',
            abortMessage: 'Penghapusan foto resep pemilik akun dibatalkan.'
        });
        let request;
        try {
            request = transaction.objectStore(STORE_NAME).openCursor();
        } catch (error) {
            lifecycle.failSetup(error);
            return;
        }
        request.onsuccess = () => {
            if (lifecycle.isSettled()) return;
            try {
                const cursor = request.result;
                if (!cursor) return;

                // Persisted ownerId is authoritative; never delete by key prefix,
                // which may also match another owner's legacy composite key.
                if (cursor.value?.ownerId === normalizedOwner) cursor.delete();
                cursor.continue();
            } catch (error) {
                // [AI-GENERATED][ROBUSTNESS][V283] Keep owner cleanup failures on
                // the Promise path and abort before any partial delete can commit.
                lifecycle.failSetup(error);
            }
        };
    });
}

async function deleteAllPhotosForOwner(ownerId) {
    return runPhotoPersistenceOperation(async () => {
        const normalizedOwner = normalizeOwnerId(ownerId);
        if (!normalizedOwner) return false;
        const deleted = await deleteAllRecipePhotosForOwnerInternal(normalizedOwner);
        if (deleted) permanentlyDeletedPhotoOwners.add(normalizedOwner);
        return deleted;
    });
}

export const RecipePhotoPersistenceService = Object.freeze({
    replaceRecipePhotos,
    loadRecipePhotos,
    deleteRecipePhotos,
    deleteAllPhotosForOwner,
    keys: Object.freeze({ db: DB_NAME, store: STORE_NAME })
});

// [AI-GENERATED][ES6 MODULE][V284] Internal consumers import this service directly.
