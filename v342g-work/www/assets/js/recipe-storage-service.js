/**
 * [AI-GENERATED][REFACTOR][V25]
 * Canonical persistence + Supabase synchronization service for saved recipes.
 * UI rendering, notifications, alerts, and form handling remain in app-core.js.
 */
import { StorageService } from './storage-service.js';
import { NotifSystem } from './notification-service.js'; // [AI-GENERATED][ES6 MODULE][V272]

const RECIPE_STORAGE_KEY = 'premium_saved_recipes';
const LEGACY_RECIPE_KEYS = ['premium_saved_recipe', 'daftar_resep'];
// [AI-GENERATED][SECURITY][V149] Durable marker for the one-time legacy
// migration. Without an explicit marker, a stale global legacy key could be
// claimed by a later account after the first account already had a scoped store.
const LEGACY_MIGRATION_MARKER_KEY = 'premium_saved_recipes::legacy_migrated_owner';

// [AI-GENERATED][ROBUSTNESS][V133] Local recipe persistence is account-scoped.
// The previous canonical key was global, which allowed account B to inherit
// account A's local recipes after logout/login on the same device. The active
// owner is established by the canonical AuthService lifecycle before any cloud
// recipe synchronization begins.
let activeRecipeOwnerId = null;

function normalizeOwnerId(ownerId) {
    if (ownerId == null || ownerId === '') return null;
    return String(ownerId);
}

function getRecipeStorageKey(ownerId = activeRecipeOwnerId) {
    const normalizedOwnerId = normalizeOwnerId(ownerId);
    if (!normalizedOwnerId) return RECIPE_STORAGE_KEY;
    const safeOwnerId = normalizedOwnerId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${RECIPE_STORAGE_KEY}::${safeOwnerId}`;
}

// [AI-GENERATED][ROBUSTNESS][V94] Tombstones prevent an offline local delete
// from being resurrected by the next cloud pull. Records are scoped to the
// authenticated owner so one account can never consume another account's tombstone.
const PENDING_DELETE_STORAGE_KEY = 'premium_saved_recipe_pending_deletes';

// [AI-GENERATED][ROBUSTNESS][V95] Capture operation owner before entering the FIFO persistence queue; then revalidate at execution/mutation boundaries.
// [AI-GENERATED][ROBUSTNESS][V94] Serialize recipe persistence/sync mutations.
// A cloud SELECT must never race a local delete/save and then overwrite the
// newer local intent. Each operation still revalidates authentication at its
// cloud mutation boundary; this queue only orders local persistence transitions.
let recipeOperationChain = Promise.resolve();
// [AI-GENERATED][ROBUSTNESS][V105] Legacy migration is coordinated with the
// persistence queue so a late legacy migration cannot overwrite a newer save.
let legacyMigrationPromise = null;

function runRecipeOperation(operation) {
    const next = recipeOperationChain
        .catch(() => undefined)
        .then(async () => {
            if (legacyMigrationPromise) await legacyMigrationPromise;
            return operation();
        });
    recipeOperationChain = next.catch(() => undefined);
    return next;
}

function normalizeList(value) {
    return Array.isArray(value) ? value : [];
}

async function migrateLegacySingleRecipeInternal() {
    const targetKey = getRecipeStorageKey();
    const activeOwner = normalizeOwnerId(activeRecipeOwnerId);
    if (!activeOwner) return null;

    // [AI-GENERATED][SECURITY][V149] Once legacy data has been claimed by one
    // authenticated owner, no later account may consume a leftover global key.
    // The marker is deliberately independent of the recipe namespace.
    const migrationMarker = await StorageService.getString(LEGACY_MIGRATION_MARKER_KEY, null);
    if (migrationMarker) {
        // [AI-GENERATED][SECURITY][V149] A marker means the legacy namespace has
        // already been claimed. Any leftover single-recipe keys are stale and must
        // not remain available for a future account.
        for (const legacyKey of LEGACY_RECIPE_KEYS) {
            if (await StorageService.getString(legacyKey, null) != null) {
                await StorageService.remove(legacyKey);
            }
        }
        return null;
    }

    for (const legacyKey of LEGACY_RECIPE_KEYS) {
        const legacyRaw = await StorageService.getString(legacyKey, null);
        if (!legacyRaw) continue;

        try {
            // [AI-GENERATED][SECURITY][V149] Re-check the scoped owner store before
            // consuming global legacy data. If this account already has canonical
            // data, fail closed: discard the ambiguous global key rather than
            // risking cross-account inheritance.
            const canonicalRaw = await StorageService.getString(targetKey, null);
            if (canonicalRaw != null) {
                try {
                    const canonical = JSON.parse(canonicalRaw);
                    if (Array.isArray(canonical)) {
                        await StorageService.setString(LEGACY_MIGRATION_MARKER_KEY, activeOwner);
                        await StorageService.remove(legacyKey);
                        return canonical;
                    }
                } catch {
                    // Invalid canonical JSON is handled below as an empty scoped store.
                }
            }

            const legacyRecipe = JSON.parse(legacyRaw);
            if (!legacyRecipe || typeof legacyRecipe !== 'object') continue;

            const list = [legacyRecipe];
            await saveRecipeListInternal(list);
            // [AI-GENERATED][SECURITY][V149] Mark the claim before removing the
            // legacy source. If marker persistence fails, do not silently report a
            // successful migration; the caller can retry while the source remains.
            const markerSaved = await StorageService.setString(LEGACY_MIGRATION_MARKER_KEY, activeOwner);
            if (!markerSaved) {
                throw new Error('Legacy migration marker gagal disimpan.');
            }
            await StorageService.remove(legacyKey);
            return list;
        } catch (error) {
            console.warn(`[RecipeStorageService] Legacy recipe migration failed for ${legacyKey}:`, error);
        }
    }

    return null;
}

function migrateLegacySingleRecipe() {
    if (!legacyMigrationPromise) {
        legacyMigrationPromise = migrateLegacySingleRecipeInternal().finally(() => {
            legacyMigrationPromise = null;
        });
    }
    return legacyMigrationPromise;
}

async function readRecipeList() {
    // [AI-GENERATED][ROBUSTNESS][V141] Never expose the legacy/global recipe
    // namespace while signed out. The migration path is the only code allowed
    // to read the old global key, and it runs after an authenticated owner has
    // been established by AuthService.
    if (!activeRecipeOwnerId) return [];

    const targetKey = getRecipeStorageKey(activeRecipeOwnerId);
    const stored = await StorageService.getJSON(targetKey, null);
    if (Array.isArray(stored)) return stored;

    // [AI-GENERATED][ROBUSTNESS][V133] One-time migration of the old global
    // recipe list is allowed only when an authenticated owner has been selected.
    // After migration the legacy global key is removed, preventing another
    // account from consuming the previous user's data.
    return (await migrateLegacySingleRecipe()) || [];
}

function readRecipeListSync() {
    // [AI-GENERATED][ROBUSTNESS][V141] Synchronous consumers must enforce the
    // same account boundary as async reads. Never fall back to the old global
    // key when there is no authenticated recipe owner.
    if (!activeRecipeOwnerId) return [];
    const stored = StorageService.getJSONSync(getRecipeStorageKey(activeRecipeOwnerId), null);
    return Array.isArray(stored) ? stored : [];
}

async function saveRecipeListInternal(recipeList, { maxItems = 10, notifyStorageLimit = true, preserveLeadingItems = false, returnDetails = false } = {}) {
    // [AI-GENERATED][ROBUSTNESS][V134] Recipe persistence is account-owned.
    // Never create/write the legacy global key after V133; unauthenticated or
    // post-logout callers must fail closed instead of creating data that a
    // later account could inherit during legacy migration.
    if (!activeRecipeOwnerId) {
        const error = new Error('Pemilik resep belum terautentikasi. Penyimpanan resep dibatalkan.');
        error.code = 'RECIPE_OWNER_REQUIRED';
        throw error;
    }

    let normalized = normalizeList(recipeList);
    const targetKey = getRecipeStorageKey();
    const saved = await StorageService.setString(targetKey, JSON.stringify(normalized));

    // [AI-GENERATED][BUG FIX][V274] Empty arrays still require a confirmed write.
    // Treating `normalized.length === 0` as success could leave stale recipes
    // on disk after a failed clear/save operation.
    if (saved) {
        return returnDetails
            ? { recipes: normalized, truncated: false }
            : true;
    }

    const limit = Number.isFinite(maxItems) && maxItems > 0 ? maxItems : 10;
    normalized = preserveLeadingItems
        ? normalized.slice(0, limit)
        : normalized.slice(Math.max(0, normalized.length - limit));
    const trimmedSaved = await StorageService.setString(targetKey, JSON.stringify(normalized));

    if (trimmedSaved && notifyStorageLimit && typeof NotifSystem !== 'undefined') {
        NotifSystem.tambah(
            'sistem',
            '⚠️ Storage Penuh',
            `Hanya ${limit} resep terbaru yang disimpan.`,
            '💾'
        );
    }

    // [AI-GENERATED][ROBUSTNESS][V100] A failed retry must never be reported
    // as a successful persistence operation. Callers rely on the boolean
    // contract to decide whether the local state is durable.
    if (!trimmedSaved) {
        const error = new Error('Penyimpanan daftar resep gagal. Data lokal tidak dapat dipastikan tersimpan.');
        error.code = 'RECIPE_STORAGE_WRITE_FAILED';
        throw error;
    }

    return returnDetails
        ? { recipes: normalized, truncated: true }
        : true;
}

async function readPendingDeletes() {
    const stored = await StorageService.getJSON(PENDING_DELETE_STORAGE_KEY, []);
    if (!Array.isArray(stored)) return [];

    // [AI-GENERATED][ROBUSTNESS][V96] Normalize persisted tombstones at the
    // storage boundary so malformed/duplicate records cannot become executable
    // delete intents after a partial write or legacy migration.
    const unique = new Map();
    for (const item of stored) {
        if (!item || item.id == null || !item.ownerId) continue;
        const id = String(item.id);
        const ownerId = String(item.ownerId);
        const key = `${ownerId}\u0000${id}`;
        if (unique.has(key)) continue;
        unique.set(key, {
            id: item.id,
            ownerId,
            deletedAt: item.deletedAt || null
        });
    }
    return Array.from(unique.values());
}

async function savePendingDeletes(records) {
    const normalized = Array.isArray(records) ? records : [];
    return StorageService.setJSON(PENDING_DELETE_STORAGE_KEY, normalized);
}

async function addPendingDelete(id, ownerId) {
    if (id == null || !ownerId) return false;
    const records = await readPendingDeletes();
    const withoutDuplicate = records.filter(item =>
        !(String(item.id) === String(id) && String(item.ownerId) === String(ownerId))
    );
    withoutDuplicate.push({
        id,
        ownerId: String(ownerId),
        deletedAt: new Date().toISOString()
    });

    // [AI-GENERATED][ROBUSTNESS][V96] Report the actual persistence result so
    // callers never claim a durable pending delete when storage rejected it.
    const persisted = await savePendingDeletes(withoutDuplicate);
    if (!persisted) {
        console.warn('[RecipeStorageService] Pending-delete tombstone gagal disimpan.', { id, ownerId });
    }
    return persisted;
}

async function removePendingDelete(id, ownerId = null) {
    const records = await readPendingDeletes();
    const filtered = records.filter(item => {
        if (String(item.id) !== String(id)) return true;
        if (!ownerId) return false;
        return String(item.ownerId) !== String(ownerId);
    });
    if (filtered.length === records.length) return true;
    return savePendingDeletes(filtered);
}

async function upsertRecipe(recipe, options = {}) {
    if (!recipe || recipe.id == null) throw new Error('Data resep tidak valid.');

    // [AI-GENERATED][ROBUSTNESS][V102] Keep the old offline-delete tombstone
    // until the replacement recipe is durably written locally. If storage
    // fails, the tombstone must survive so a stale cloud row cannot resurrect
    // the recipe on the next synchronization attempt.
    const pendingOwner = options?.pendingDeleteOwnerId || null;

    const list = await readRecipeList();
    const index = list.findIndex(item => String(item?.id) === String(recipe.id));

    if (index >= 0) list[index] = recipe;
    else list.unshift(recipe);

    await saveRecipeListInternal(list, options);

    // [AI-GENERATED][ROBUSTNESS][V102] Only cancel the tombstone after the
    // replacement is confirmed durable. A failed write leaves the destructive
    // cloud-delete intent intact.
    if (pendingOwner) await removePendingDelete(recipe.id, pendingOwner);

    return list;
}

async function deleteRecipeById(id) {
    const list = await readRecipeList();
    const filtered = list.filter(item => String(item?.id) !== String(id));
    await saveRecipeListInternal(filtered);
    return filtered;
}

// [AI-GENERATED][ROBUSTNESS][V88] Revalidate the authenticated owner before
// cloud mutations. Auth can change while an async local-read is in flight; a
// stale sync must never upload the previous account's local recipes into the
// newly authenticated account.
async function getCurrentAuthenticatedUser(supabaseClient, expectedUserId = null) {
    if (!supabaseClient?.auth || typeof supabaseClient.auth.getUser !== 'function') {
        return null;
    }

    const { data: { user } = {}, error } = await supabaseClient.auth.getUser();
    if (error) throw error;
    if (!user) return null;
    if (expectedUserId && String(user.id) !== String(expectedUserId)) {
        return null;
    }
    return user;
}

function buildCloudPayload(recipe, userId = null) {
    return {
        id: recipe.id,
        user_id: userId,
        name: recipe.nama || recipe.name || 'Tanpa Nama',
        details: recipe,
        updated_at: recipe.waktuSimpan || new Date().toISOString()
    };
}

async function syncListToSupabase(supabaseClient, recipes, expectedOwnerId = null) {
    if (!supabaseClient?.auth || !supabaseClient?.from) return { synced: 0, skipped: true };

    const { data: { user } = {}, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) return { synced: 0, skipped: true, error: userError || null };
    const expectedUserId = expectedOwnerId || user.id;
    if (expectedOwnerId && String(user.id) !== String(expectedOwnerId)) {
        return { synced: 0, skipped: true, aborted: true, reason: 'auth-changed' };
    }

    // [AI-GENERATED][SECURITY][V276] Cloud writes require the local recipe
    // namespace to belong to the authenticated cloud owner. An explicit recipe
    // list can outlive the UI/session that created it; never upload it after the
    // active local owner has switched to another account.
    if (!localRecipeOwnerMatches(expectedUserId)) {
        return {
            synced: 0,
            skipped: true,
            aborted: true,
            reason: activeRecipeOwnerId ? 'owner-changed' : 'owner-not-set'
        };
    }

    const list = normalizeList(recipes);
    let synced = 0;

    for (const recipe of list) {
        // [AI-GENERATED][ROBUSTNESS][V88] Re-check ownership immediately before
        // every mutation because the auth session may have changed during the
        // previous network request.
        const currentUser = await getCurrentAuthenticatedUser(supabaseClient, expectedUserId);
        if (!currentUser) {
            return { synced, skipped: true, aborted: true, reason: 'auth-changed' };
        }

        const payload = buildCloudPayload(recipe, currentUser.id);
        const { error } = await supabaseClient
            .from('recipes')
            .upsert([payload], { onConflict: 'id' });

        if (error) throw error;
        synced += 1;
    }

    return { synced, skipped: false };
}

async function syncPendingDeletesInternal(supabaseClient, expectedOwnerId = null) {
    if (!supabaseClient?.auth || !supabaseClient?.from || navigator.onLine === false) {
        return { deleted: 0, skipped: true };
    }

    const owner = await getCurrentAuthenticatedUser(supabaseClient, expectedOwnerId);
    if (!owner) return { deleted: 0, skipped: true, aborted: Boolean(expectedOwnerId), reason: expectedOwnerId ? 'auth-changed' : undefined };

    const records = await readPendingDeletes();
    const owned = records.filter(item => String(item.ownerId) === String(owner.id));
    if (!owned.length) return { deleted: 0, skipped: false };

    let deleted = 0;
    for (const record of owned) {
        const currentUser = await getCurrentAuthenticatedUser(supabaseClient, owner.id);
        if (!currentUser) {
            return { deleted, skipped: true, aborted: true, reason: 'auth-changed' };
        }

        const { error } = await supabaseClient
            .from('recipes')
            .delete()
            .eq('id', record.id)
            .eq('user_id', currentUser.id);
        if (error) throw error;

        await removePendingDelete(record.id, currentUser.id);
        deleted += 1;
    }

    return { deleted, skipped: false };
}

async function syncRecipeToSupabaseInternal(supabaseClient, recipe, expectedOwnerId = null) {
    if (!recipe || recipe.id == null) throw new Error('Data resep tidak valid.');

    // [AI-GENERATED][ROBUSTNESS][V104] Do not clear an offline-delete
    // tombstone before the replacement cloud write succeeds. If the upsert
    // fails, the tombstone must remain so a later sync cannot resurrect a
    // stale cloud row.
    const result = await syncListToSupabase(supabaseClient, [recipe], expectedOwnerId);

    if (supabaseClient?.auth && !result?.aborted && !result?.skipped) {
        const owner = await getCurrentAuthenticatedUser(supabaseClient, expectedOwnerId);
        if (owner) {
            const tombstoneRemoved = await removePendingDelete(recipe.id, owner.id);
            if (!tombstoneRemoved) {
                console.warn('[RecipeStorageService] Tombstone resep tidak dapat dibersihkan setelah cloud upsert berhasil.', {
                    id: recipe.id,
                    ownerId: owner.id
                });
            }
        }
    }

    return result;
}

async function syncLocalToSupabaseInternal(supabaseClient, expectedOwnerId = null) {
    // [AI-GENERATED][SECURITY][V276] Validate the local namespace before any
    // pending-delete cloud mutation. Auth identity and local owner are separate
    // state machines and may briefly disagree during logout/account switching.
    if (supabaseClient?.auth && supabaseClient?.from) {
        const authenticatedOwner = await getCurrentAuthenticatedUser(supabaseClient, expectedOwnerId);
        if (!authenticatedOwner) {
            return { synced: 0, pendingDeleted: 0, skipped: true, aborted: true, reason: 'auth-changed' };
        }
        if (!localRecipeOwnerMatches(authenticatedOwner.id)) {
            return { synced: 0, pendingDeleted: 0, skipped: true, aborted: true, reason: 'owner-changed' };
        }
    }

    const pending = await syncPendingDeletesInternal(supabaseClient, expectedOwnerId);
    if (pending.aborted) return { synced: 0, pendingDeleted: pending.deleted, skipped: true, aborted: true, reason: pending.reason };

    const recipes = await readRecipeList();
    if (!recipes.length) return { synced: 0, pendingDeleted: pending.deleted, skipped: true };
    // [AI-GENERATED][SECURITY][V276] Revalidate after asynchronous reads before
    // handing locally owned data to the remote persistence boundary.
    if (supabaseClient?.auth && supabaseClient?.from) {
        const authenticatedOwner = await getCurrentAuthenticatedUser(supabaseClient, expectedOwnerId);
        if (!authenticatedOwner || !localRecipeOwnerMatches(authenticatedOwner.id)) {
            return { synced: 0, pendingDeleted: pending.deleted, skipped: true, aborted: true, reason: 'owner-changed' };
        }
    }
    const result = await syncListToSupabase(supabaseClient, recipes, expectedOwnerId);
    return { ...result, pendingDeleted: pending.deleted };
}

async function syncFromSupabaseInternal(supabaseClient, expectedOwnerId = null) {
    if (!supabaseClient?.auth || !supabaseClient?.from) return { recipes: [], changed: false, skipped: true };

    const { data: { user } = {}, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) return { recipes: activeRecipeOwnerId ? await readRecipeList() : [], changed: false, skipped: true };
    const expectedUserId = expectedOwnerId || user.id;
    if (expectedOwnerId && String(user.id) !== String(expectedOwnerId)) {
        return { recipes: [], changed: false, skipped: true, aborted: true, reason: 'auth-changed' };
    }
    // [AI-GENERATED][SECURITY][V276] Never read/merge a cloud account into a
    // different local namespace, even if no subsequent write would be needed.
    if (!localRecipeOwnerMatches(expectedUserId)) {
        return { recipes: [], changed: false, skipped: true, aborted: true, reason: activeRecipeOwnerId ? 'owner-changed' : 'owner-not-set' };
    }

    const { data, error } = await supabaseClient
        .from('recipes')
        .select('*')
        .eq('user_id', user.id);

    if (error) throw error;

    // [AI-GENERATED][ROBUSTNESS][V95] Revalidate immediately after the cloud
    // SELECT, even when the result produces no local merge. Account context
    // must remain stable for the entire async operation, not only for writes.
    const currentUserAfterSelect = await getCurrentAuthenticatedUser(supabaseClient, expectedUserId);
    if (!currentUserAfterSelect) {
        return { recipes: await readRecipeList(), changed: false, skipped: true, aborted: true, reason: 'auth-changed' };
    }

    const localRecipes = await readRecipeList();
    const merged = [...localRecipes];
    let changed = false;

    for (const row of Array.isArray(data) ? data : []) {
        let cloudRecipe;
        try {
            cloudRecipe = typeof row?.details === 'string'
                ? JSON.parse(row.details)
                : (row?.details || { id: row?.id, nama: row?.name, ...row });
        } catch (parseError) {
            console.warn('[RecipeStorageService] Proses sinkronisasi dilewati: details cloud tidak valid.', parseError);
            continue;
        }

        if (!cloudRecipe?.id) continue;

        const index = merged.findIndex(item => String(item?.id) === String(cloudRecipe.id));
        if (index >= 0) {
            const local = merged[index];
            const localTime = Date.parse(local?.waktuSimpan || local?.updated_at || '') || 0;
            const cloudTime = Date.parse(cloudRecipe?.waktuSimpan || row?.updated_at || '') || 0;
            if (cloudTime >= localTime) {
                merged[index] = cloudRecipe;
                changed = true;
            }
        } else {
            merged.push(cloudRecipe);
            changed = true;
        }
    }

    // [AI-GENERATED][ROBUSTNESS][V103] Pending-delete tombstones are an
    // independent source of truth and must be applied even when the cloud
    // SELECT produces no other merge change. Otherwise a stale local record
    // could survive a pull simply because its cloud row matched the local
    // timestamp.
    const pendingDeletes = await readPendingDeletes();
    const ownedPendingIds = new Set(
        pendingDeletes
            .filter(item => String(item.ownerId) === String(expectedUserId))
            .map(item => String(item.id))
    );

    if (ownedPendingIds.size) {
        for (let index = merged.length - 1; index >= 0; index -= 1) {
            if (ownedPendingIds.has(String(merged[index]?.id))) {
                merged.splice(index, 1);
                changed = true;
            }
        }
    }

    if (changed) {
        // [AI-GENERATED][ROBUSTNESS][V148] The account can still change during
        // the local-read / merge phase after the post-SELECT check. Revalidate
        // immediately before the durable local commit so Account A cloud data
        // can never be written into Account B's active namespace.
        const ownerBeforeCommit = await getCurrentAuthenticatedUser(supabaseClient, expectedUserId);
        if (!ownerBeforeCommit || String(ownerBeforeCommit.id) !== String(expectedUserId)) {
            return { recipes: await readRecipeList(), changed: false, skipped: true, aborted: true, reason: 'auth-changed' };
        }

        // [AI-GENERATED][ROBUSTNESS][V148] Also require the storage boundary to
        // still be bound to the same owner. AuthService/session state and the
        // queued local owner transition are intentionally separate timelines.
        if (!activeRecipeOwnerId || String(activeRecipeOwnerId) !== String(expectedUserId)) {
            return { recipes: await readRecipeList(), changed: false, skipped: true, aborted: true, reason: 'owner-changed' };
        }

        await saveRecipeListInternal(merged);
    }
    return { recipes: merged, changed, skipped: false };
}

// [AI-GENERATED][ROBUSTNESS][V275] A stale destructive action must never operate
// on whichever account happens to be active when its queued callback starts.
// The public boundary captures both auth identity and local namespace identity;
// this guard uses a synchronous snapshot on abort so rejecting a stale delete
// cannot trigger a legacy migration or any other storage mutation.
function createAbortedRecipeDeleteResult(reason, expectedOwnerId, expectedLocalOwnerId) {
    return {
        recipes: readRecipeListSync(),
        cloudDeleted: false,
        skipped: true,
        aborted: true,
        reason,
        ownerId: expectedOwnerId || expectedLocalOwnerId || null
    };
}

function localRecipeOwnerMatches(expectedLocalOwnerId) {
    return normalizeOwnerId(activeRecipeOwnerId) === normalizeOwnerId(expectedLocalOwnerId);
}

// [AI-GENERATED][SECURITY][V276] Shared guard for write APIs that must remain
// bound to the owner active at invocation time while waiting in the FIFO queue.
function assertActiveRecipeOwner(expectedOwnerId, operationLabel = 'Operasi resep') {
    const expected = normalizeOwnerId(expectedOwnerId);
    if (!expected) {
        const error = new Error(`Pemilik resep belum terautentikasi. ${operationLabel} dibatalkan.`);
        error.code = 'RECIPE_OWNER_REQUIRED';
        throw error;
    }
    if (!localRecipeOwnerMatches(expected)) {
        const error = new Error(`Sesi pemilik resep berubah. ${operationLabel} dibatalkan.`);
        error.code = 'RECIPE_OWNER_CHANGED';
        error.expectedOwnerId = expected;
        error.activeOwnerId = normalizeOwnerId(activeRecipeOwnerId);
        throw error;
    }
    return expected;
}

// [AI-GENERATED][ROBUSTNESS][V275] Revalidate the owner after asynchronous
// reads and immediately before the local write. Auth can change before this
// operation enters the FIFO queue, even though owner transitions are serialized
// once queued. In particular, never delete from account B's namespace when the
// request was initiated while account A was active.
async function deleteRecipeEverywhereInternal(
    supabaseClient,
    id,
    expectedOwnerId = null,
    expectedLocalOwnerId = normalizeOwnerId(activeRecipeOwnerId)
) {
    if (!localRecipeOwnerMatches(expectedLocalOwnerId)) {
        return createAbortedRecipeDeleteResult('owner-changed', expectedOwnerId, expectedLocalOwnerId);
    }

    // A configured auth client with no captured user is not safe to use for a
    // destructive mutation. Fail closed rather than deleting local records and
    // only discovering the auth mismatch after the write.
    if (supabaseClient?.auth && !expectedOwnerId) {
        return createAbortedRecipeDeleteResult('auth-changed', expectedOwnerId, expectedLocalOwnerId);
    }

    let owner = null;
    if (supabaseClient?.auth) {
        owner = await getCurrentAuthenticatedUser(supabaseClient, expectedOwnerId);
        if (!owner || String(owner.id) !== String(expectedOwnerId)) {
            return createAbortedRecipeDeleteResult('auth-changed', expectedOwnerId, expectedLocalOwnerId);
        }
    }

    if (!localRecipeOwnerMatches(expectedLocalOwnerId)) {
        return createAbortedRecipeDeleteResult('owner-changed', expectedOwnerId, expectedLocalOwnerId);
    }

    const currentRecipes = await readRecipeList();

    // readRecipeList() may await StorageService and legacy migration. Validate
    // both the active namespace and auth session again after that async boundary.
    if (!localRecipeOwnerMatches(expectedLocalOwnerId)) {
        return createAbortedRecipeDeleteResult('owner-changed', expectedOwnerId, expectedLocalOwnerId);
    }
    if (supabaseClient?.auth) {
        owner = await getCurrentAuthenticatedUser(supabaseClient, expectedOwnerId);
        if (!owner || String(owner.id) !== String(expectedOwnerId)) {
            return createAbortedRecipeDeleteResult('auth-changed', expectedOwnerId, expectedLocalOwnerId);
        }
    }
    if (!localRecipeOwnerMatches(expectedLocalOwnerId)) {
        return createAbortedRecipeDeleteResult('owner-changed', expectedOwnerId, expectedLocalOwnerId);
    }

    const recipes = currentRecipes.filter(item => String(item?.id) !== String(id));
    await saveRecipeListInternal(recipes);
    let cloudDeleted = false;

    if (supabaseClient?.auth && supabaseClient?.from && navigator.onLine !== false) {
        if (!owner) {
            // Defensive fallback; configured auth clients were required to have
            // a validated owner before the local mutation above.
            return { recipes, cloudDeleted: false, skipped: true, aborted: true, reason: 'auth-changed', ownerId: null };
        }

        const currentUser = await getCurrentAuthenticatedUser(supabaseClient, owner.id);
        if (!currentUser) {
            const tombstonePersisted = await addPendingDelete(id, owner.id);
            return { recipes, cloudDeleted: false, skipped: true, aborted: true, reason: 'auth-changed', pendingDeletePersisted: tombstonePersisted, ownerId: owner.id };
        }

        const { error } = await supabaseClient
            .from('recipes')
            .delete()
            .eq('id', id)
            .eq('user_id', currentUser.id);
        if (error) {
            // [AI-GENERATED][ROBUSTNESS][V94] Preserve the user's destructive
            // intent when a network/cloud failure happens after local deletion.
            // The next online sync can retry the owner-scoped cloud DELETE.
            const tombstonePersisted = await addPendingDelete(id, currentUser.id);
            // [AI-GENERATED][ROBUSTNESS][V145] Expose the exact owner and
            // tombstone durability so callers can safely clean device-local
            // photo blobs after a cloud failure without re-reading auth.
            error.pendingDeletePersisted = tombstonePersisted;
            error.ownerId = currentUser.id;
            throw error;
        }
        cloudDeleted = true;
    } else if (owner) {
        // [AI-GENERATED][ROBUSTNESS][V94] Keep an owner-scoped tombstone while
        // offline so the next reconnect deletes the stale cloud row before any
        // cloud-to-local merge can resurrect it.
        const tombstonePersisted = await addPendingDelete(id, owner.id);
        return { recipes, cloudDeleted, pendingCloudDelete: tombstonePersisted, pendingDeletePersisted: tombstonePersisted, ownerId: owner.id };
    }

    return { recipes, cloudDeleted, pendingCloudDelete: false, pendingDeletePersisted: false, ownerId: owner?.id || expectedLocalOwnerId || null };
}

// [AI-GENERATED][ROBUSTNESS][V94] Public persistence/sync boundaries are
// single-flight through one FIFO chain. This prevents concurrent UI refresh,
// online-event, auth-bootstrap, import, and delete operations from crossing
// local state transitions.
async function setRecipeOwner(ownerId) {
    const normalizedOwnerId = normalizeOwnerId(ownerId);
    if (!normalizedOwnerId) throw new Error('Owner resep tidak valid.');

    return runRecipeOperation(async () => {
        activeRecipeOwnerId = normalizedOwnerId;
        const ownerKey = getRecipeStorageKey(normalizedOwnerId);
        const ownerData = await StorageService.getJSON(ownerKey, null);
        if (Array.isArray(ownerData)) {
            // [AI-GENERATED][SECURITY][V149] A scoped store already exists, so any
            // surviving global legacy key is ambiguous. Never import it into this
            // account. Remove the global source and seal the one-time migration.
            const marker = await StorageService.getString(LEGACY_MIGRATION_MARKER_KEY, null);
            const staleGlobal = await StorageService.getString(RECIPE_STORAGE_KEY, null);
            if (staleGlobal != null && !marker) {
                await StorageService.setString(LEGACY_MIGRATION_MARKER_KEY, normalizedOwnerId);
                await StorageService.remove(RECIPE_STORAGE_KEY);
            }
            return ownerData;
        }

        // [AI-GENERATED][SECURITY][V149] Preserve pre-V133 local data only for
        // the first authenticated owner that can legitimately claim the legacy
        // namespace. A durable marker prevents a later account from inheriting a
        // stale global key left behind by an interrupted/older migration.
        const migrationMarker = await StorageService.getString(LEGACY_MIGRATION_MARKER_KEY, null);
        const legacyRaw = await StorageService.getString(RECIPE_STORAGE_KEY, null);
        if (legacyRaw != null && !migrationMarker) {
            try {
                const legacyList = JSON.parse(legacyRaw);
                if (Array.isArray(legacyList)) {
                    await StorageService.setString(ownerKey, JSON.stringify(legacyList));
                    const markerSaved = await StorageService.setString(LEGACY_MIGRATION_MARKER_KEY, normalizedOwnerId);
                    if (!markerSaved) throw new Error('Legacy migration marker gagal disimpan.');
                    await StorageService.remove(RECIPE_STORAGE_KEY);
                    return legacyList;
                }
            } catch (error) {
                console.warn('[RecipeStorageService] Migrasi global recipe store gagal:', error);
            }
        }

        // [AI-GENERATED][SECURITY][V149] If a global key survives after a scoped
        // store already exists, it is ambiguous. Never copy it into another account.
        if (legacyRaw != null && migrationMarker) {
            await StorageService.remove(RECIPE_STORAGE_KEY);
        }

        return [];
    });
}

async function clearRecipeOwner() {
    return runRecipeOperation(async () => {
        activeRecipeOwnerId = null;
        legacyMigrationPromise = null;
        return true;
    });
}

async function saveRecipeList(recipeList, options = {}) {
    // [AI-GENERATED][SECURITY][V276] Snapshot ownership at the public API
    // boundary, not when its queued callback eventually executes. A session
    // transition queued ahead of this save must make the stale write fail closed.
    // [AI-GENERATED][ROBUSTNESS][V279] Larger editor transactions can pin their
    // owner and validate editor/session state from inside the serialized commit queue.
    const hasExplicitOwner = Object.prototype.hasOwnProperty.call(options, 'expectedOwnerId');
    const expectedOwnerId = normalizeOwnerId(hasExplicitOwner ? options.expectedOwnerId : activeRecipeOwnerId);
    const validateBeforeCommit = options.validateBeforeCommit;
    const {
        expectedOwnerId: _expectedOwnerId,
        validateBeforeCommit: _validateBeforeCommit,
        ...persistenceOptions
    } = options;

    return runRecipeOperation(async () => {
        assertActiveRecipeOwner(expectedOwnerId, 'Penyimpanan daftar resep');
        if (typeof validateBeforeCommit === 'function') {
            const valid = await validateBeforeCommit({ ownerId: expectedOwnerId });
            if (valid !== true) {
                const error = new Error('Konteks sesi/editor berubah sebelum penyimpanan resep.');
                error.code = 'RECIPE_SAVE_CONTEXT_CHANGED';
                error.ownerId = expectedOwnerId;
                throw error;
            }
            // The validator may await authentication; check the local namespace again
            // before resolving the storage key and starting the durable write.
            assertActiveRecipeOwner(expectedOwnerId, 'Penyimpanan daftar resep');
        }
        return saveRecipeListInternal(recipeList, persistenceOptions);
    });
}

// [AI-GENERATED][ROBUSTNESS][V276] Mutating recipe operations are bound to the
// owner active when the API is called, including while waiting behind the FIFO.
// The returned list reflects the data actually persisted if storage is capped.
async function duplicateAndSaveRecipe(recipe, options = {}) {
    if (!recipe || typeof recipe !== 'object' || recipe.id == null) {
        throw new Error('Data resep tidak valid untuk disalin.');
    }

    const expectedOwnerId = normalizeOwnerId(activeRecipeOwnerId);
    return runRecipeOperation(async () => {
        const ownerId = assertActiveRecipeOwner(expectedOwnerId, 'Penyalinan resep');

        const current = await readRecipeList();
        const duplicateId = String(recipe.id);
        if (current.some(item => String(item?.id) === duplicateId)) {
            const error = new Error('ID resep salinan sudah digunakan. Silakan coba salin kembali.');
            error.code = 'RECIPE_DUPLICATE_ID_CONFLICT';
            throw error;
        }

        let recipeCopy;
        try {
            recipeCopy = JSON.parse(JSON.stringify(recipe));
        } catch (cause) {
            const error = new Error('Data resep tidak dapat disalin.', { cause });
            error.code = 'RECIPE_COPY_INVALID';
            throw error;
        }

        const nextRecipes = [recipeCopy, ...current];
        const persisted = await saveRecipeListInternal(nextRecipes, {
            ...options,
            preserveLeadingItems: true,
            returnDetails: true
        });

        return {
            recipes: persisted.recipes,
            ownerId,
            truncated: persisted.truncated
        };
    });
}

async function captureOwnerId(supabaseClient) {
    if (!supabaseClient?.auth || typeof supabaseClient.auth.getUser !== 'function') return null;
    const owner = await getCurrentAuthenticatedUser(supabaseClient);
    return owner?.id || null;
}

async function syncPendingDeletes(supabaseClient) {
    const expectedOwnerId = await captureOwnerId(supabaseClient);
    return runRecipeOperation(() => syncPendingDeletesInternal(supabaseClient, expectedOwnerId));
}

async function syncRecipeToSupabase(supabaseClient, recipe, expectedOwnerIdOverride = null) {
    // [AI-GENERATED][ROBUSTNESS][V146] Callers that already captured an owner
    // must be able to carry that identity through the complete async mutation.
    // Re-reading AuthService here could switch A -> B between local save and
    // cloud upsert, causing account A data to be uploaded into account B.
    const expectedOwnerId = expectedOwnerIdOverride || await captureOwnerId(supabaseClient);
    return runRecipeOperation(() => syncRecipeToSupabaseInternal(supabaseClient, recipe, expectedOwnerId));
}

async function syncLocalToSupabase(supabaseClient) {
    const expectedOwnerId = await captureOwnerId(supabaseClient);
    return runRecipeOperation(() => syncLocalToSupabaseInternal(supabaseClient, expectedOwnerId));
}

async function syncFromSupabase(supabaseClient) {
    const expectedOwnerId = await captureOwnerId(supabaseClient);
    return runRecipeOperation(() => syncFromSupabaseInternal(supabaseClient, expectedOwnerId));
}

async function deleteRecipeEverywhere(supabaseClient, id) {
    // [AI-GENERATED][ROBUSTNESS][V275] Snapshot the local recipe namespace before
    // awaiting auth. If account B is selected while captureOwnerId() is pending,
    // the queued delete must reject the stale account-A action before any write.
    const expectedLocalOwnerId = normalizeOwnerId(activeRecipeOwnerId);
    const expectedOwnerId = await captureOwnerId(supabaseClient);
    return runRecipeOperation(() => deleteRecipeEverywhereInternal(
        supabaseClient,
        id,
        expectedOwnerId,
        expectedLocalOwnerId
    ));
}

async function deleteRecipeByIdPublic(id) {
    // [AI-GENERATED][ROBUSTNESS][V275] Apply the same owner snapshot to local-only
    // deletes so delayed calls cannot target a different account namespace.
    const expectedLocalOwnerId = normalizeOwnerId(activeRecipeOwnerId);
    return runRecipeOperation(() => {
        if (!localRecipeOwnerMatches(expectedLocalOwnerId)) {
            const error = new Error('Sesi pemilik resep berubah; penghapusan dibatalkan.');
            error.code = 'RECIPE_OWNER_CHANGED';
            throw error;
        }
        return deleteRecipeById(id);
    });
}

async function upsertRecipePublic(recipe, options = {}) {
    // [AI-GENERATED][SECURITY][V276] Prevent a delayed save from account A
    // from using whichever local namespace is active when its queued callback
    // runs after a switch to account B.
    const expectedOwnerId = normalizeOwnerId(activeRecipeOwnerId);
    return runRecipeOperation(() => {
        assertActiveRecipeOwner(expectedOwnerId, 'Penyimpanan resep');
        return upsertRecipe(recipe, options);
    });
}

export const RecipeStorageService = Object.freeze({
    STORAGE_KEY: RECIPE_STORAGE_KEY,
    setOwner: setRecipeOwner,
    clearOwner: clearRecipeOwner,
    getActiveOwnerId: () => activeRecipeOwnerId,
    read: readRecipeList,
    readSync: readRecipeListSync,
    saveList: saveRecipeList,
    duplicateAndSave: duplicateAndSaveRecipe,
    upsert: upsertRecipePublic,
    deleteById: deleteRecipeByIdPublic,
    syncRecipeToSupabase,
    syncLocalToSupabase,
    syncListToSupabase: async (supabaseClient, recipes) => {
        const expectedOwnerId = await captureOwnerId(supabaseClient);
        return runRecipeOperation(() => syncListToSupabase(supabaseClient, recipes, expectedOwnerId));
    },
    syncFromSupabase,
    deleteEverywhere: deleteRecipeEverywhere,
    syncPendingDeletes
});

// [AI-GENERATED][COMPATIBILITY] Public bridge for legacy runtime callers.
window.RecipeStorageService = RecipeStorageService;
