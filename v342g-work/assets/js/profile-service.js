/**
 * [AI-GENERATED][REFACTOR][V254]
 * Canonical profile persistence with account-scoped local namespaces.
 * Existing logical field names remain compatible; only physical storage keys
 * are namespaced after the authenticated owner is established.
 */
import { StorageService } from './storage-service.js';

const PROFILE_KEYS = Object.freeze({
    name: 'profile_name',
    bakery: 'profile_bakery',
    phone: 'profile_phone',
    email: 'profile_email'
});

const DEFAULT_PROFILE = Object.freeze({
    name: 'Pengguna',
    bakery: 'Nama Bakery',
    phone: '-',
    email: '-'
});

// [AI-GENERATED][SECURITY][V254] The legacy marker records which authenticated
// owner may migrate pre-account-scoped profile values. It prevents a later user
// on the same device from claiming another user's leftover legacy cache.
const LEGACY_MIGRATION_MARKER_KEY = '__tp_profile_legacy_owner';
const LEGACY_PROFILE_KEYS = Object.freeze([...Object.values(PROFILE_KEYS), 'user_profile']);
let activeOwnerId = null;

function normalizeOwnerId(ownerId) {
    if (ownerId == null || String(ownerId).trim() === '') return null;
    return String(ownerId).trim();
}

function safeOwnerId(ownerId) {
    return normalizeOwnerId(ownerId)?.replace(/[^a-zA-Z0-9_-]/g, '_') || null;
}

function storageKey(key, ownerId = activeOwnerId) {
    const safeId = safeOwnerId(ownerId);
    return safeId ? `${key}::${safeId}` : null;
}

function normalize(value, fallback) {
    const text = String(value ?? '').trim();
    return text || fallback;
}

export function normalizeProfile(profile = {}) {
    return {
        name: normalize(profile.name, DEFAULT_PROFILE.name),
        bakery: normalize(profile.bakery, DEFAULT_PROFILE.bakery),
        phone: normalize(profile.phone, DEFAULT_PROFILE.phone),
        email: normalize(profile.email, DEFAULT_PROFILE.email)
    };
}

async function readLegacyProfile() {
    const values = {};
    let found = false;
    let rawProfile = null;

    try {
        rawProfile = await StorageService.getString('user_profile', null);
        if (rawProfile != null) found = true;
    } catch (error) {
        console.warn('[ProfileService] Gagal membaca profil legacy:', error);
    }

    for (const [field, key] of Object.entries(PROFILE_KEYS)) {
        try {
            const value = await StorageService.getString(key, null);
            if (value != null) found = true;
            values[field] = value;
        } catch (error) {
            console.warn(`[ProfileService] Gagal membaca kunci legacy ${key}:`, error);
        }
    }

    if (rawProfile) {
        try {
            const parsed = JSON.parse(rawProfile);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return { found: true, profile: normalizeProfile({ ...values, ...parsed }) };
            }
        } catch (error) {
            console.warn('[ProfileService] user_profile legacy tidak valid; memakai kunci individual.', error);
        }
    }

    return { found, profile: normalizeProfile(values) };
}

async function writeProfileForOwner(profile, ownerId) {
    const normalized = normalizeProfile(profile);
    const writes = [
        [storageKey(PROFILE_KEYS.name, ownerId), normalized.name],
        [storageKey(PROFILE_KEYS.bakery, ownerId), normalized.bakery],
        [storageKey(PROFILE_KEYS.phone, ownerId), normalized.phone],
        [storageKey(PROFILE_KEYS.email, ownerId), normalized.email],
        [storageKey('user_profile', ownerId), JSON.stringify(normalized)]
    ];
    const results = await Promise.allSettled(
        writes.map(([key, value]) => StorageService.setString(key, value))
    );
    const failedKeys = results.flatMap((result, index) =>
        result.status === 'fulfilled' && result.value === true ? [] : [writes[index][0]]
    );
    return { normalized, failedKeys };
}

async function removeLegacyProfileKeys() {
    const results = await Promise.allSettled(LEGACY_PROFILE_KEYS.map((key) => StorageService.remove(key)));
    return results.every((result) => result.status === 'fulfilled' && result.value === true);
}

// [AI-GENERATED][SECURITY][V254] A legacy cache can be claimed only by the
// owner recorded in the migration marker. The marker is persisted before copying
// data, so a partial migration remains retryable by the same owner but is never
// exposed to another account.
async function migrateLegacyProfileForOwner(ownerId) {
    const scopedProfileKey = storageKey('user_profile', ownerId);
    const scopedRaw = await StorageService.getString(scopedProfileKey, null);
    const marker = await StorageService.getString(LEGACY_MIGRATION_MARKER_KEY, null);
    // A marker belonging to another owner seals the legacy namespace. Do not
    // even load those raw values into this account's migration path.
    if (marker && marker !== ownerId) return true;
    const legacy = await readLegacyProfile();

    if (scopedRaw != null) {
        if (legacy.found && (!marker || marker === ownerId)) {
            if (!marker) {
                const markerSaved = await StorageService.setString(LEGACY_MIGRATION_MARKER_KEY, ownerId);
                if (markerSaved !== true) return false;
            }
            if ((await StorageService.getString(LEGACY_MIGRATION_MARKER_KEY, null)) === ownerId) {
                return removeLegacyProfileKeys();
            }
        }
        return true;
    }

    if (!legacy.found || (marker && marker !== ownerId)) return true;

    if (!marker) {
        const markerSaved = await StorageService.setString(LEGACY_MIGRATION_MARKER_KEY, ownerId);
        if (markerSaved !== true) {
            console.warn('[ProfileService] Marker migrasi legacy gagal disimpan; data legacy dipertahankan.');
            return false;
        }
    }

    const writeResult = await writeProfileForOwner(legacy.profile, ownerId);
    if (writeResult.failedKeys.length) {
        console.warn('[ProfileService] Migrasi profil legacy belum lengkap:', writeResult.failedKeys);
        return false;
    }

    return removeLegacyProfileKeys();
}

// [AI-GENERATED][SECURITY][V254] Establish the account boundary before profile
// reads/writes. Migration failures do not break authentication; global legacy
// values remain sealed to the owner marker and are not read by other accounts.
async function setProfileOwner(ownerId) {
    const normalizedOwnerId = normalizeOwnerId(ownerId);
    if (!normalizedOwnerId) throw new Error('Pemilik profil tidak valid.');
    activeOwnerId = normalizedOwnerId;
    try {
        return await migrateLegacyProfileForOwner(normalizedOwnerId);
    } catch (error) {
        console.warn('[ProfileService] Migrasi profil per akun belum selesai:', error);
        return false;
    }
}

function clearProfileOwner() {
    activeOwnerId = null;
    return true;
}

export async function loadStoredProfile() {
    const ownerId = activeOwnerId;
    if (!ownerId) return normalizeProfile();

    const raw = await StorageService.getString(storageKey('user_profile', ownerId), '');
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return normalizeProfile(parsed);
            }
        } catch (error) {
            console.warn('[ProfileService] user_profile scoped tidak valid; fallback ke key individual.', error);
        }
    }

    return normalizeProfile({
        name: await StorageService.getString(storageKey(PROFILE_KEYS.name, ownerId), DEFAULT_PROFILE.name),
        bakery: await StorageService.getString(storageKey(PROFILE_KEYS.bakery, ownerId), DEFAULT_PROFILE.bakery),
        phone: await StorageService.getString(storageKey(PROFILE_KEYS.phone, ownerId), DEFAULT_PROFILE.phone),
        email: await StorageService.getString(storageKey(PROFILE_KEYS.email, ownerId), DEFAULT_PROFILE.email)
    });
}

export async function saveStoredProfile(profile) {
    const ownerId = activeOwnerId;
    if (!ownerId) {
        const error = new Error('Pemilik profil belum terautentikasi. Penyimpanan profil dibatalkan.');
        error.code = 'PROFILE_OWNER_REQUIRED';
        throw error;
    }

    const { normalized, failedKeys } = await writeProfileForOwner(profile, ownerId);
    if (failedKeys.length) {
        const error = new Error(`Profil belum tersimpan lengkap. Periksa ruang penyimpanan/perangkat lalu coba lagi. Kunci gagal: ${failedKeys.join(', ')}`);
        error.code = 'PROFILE_PERSISTENCE_INCOMPLETE';
        error.failedKeys = Object.freeze(failedKeys);
        throw error;
    }

    return normalized;
}

export async function clearStoredProfile() {
    const ownerId = activeOwnerId;
    if (!ownerId) return false;

    const scopedKeys = [
        storageKey(PROFILE_KEYS.name, ownerId),
        storageKey(PROFILE_KEYS.bakery, ownerId),
        storageKey(PROFILE_KEYS.phone, ownerId),
        storageKey(PROFILE_KEYS.email, ownerId),
        storageKey('user_profile', ownerId)
    ];
    const results = await Promise.allSettled(scopedKeys.map((key) => StorageService.remove(key)));
    let complete = results.every((result) => result.status === 'fulfilled' && result.value === true);

    // Delete legacy values only when this account owns the sealed migration
    // namespace (or when it is still unclaimed). Never erase another owner's
    // interrupted migration during an ordinary profile cleanup.
    const marker = await StorageService.getString(LEGACY_MIGRATION_MARKER_KEY, null);
    if (!marker || marker === ownerId) {
        const legacyRemoved = await removeLegacyProfileKeys();
        complete = complete && legacyRemoved;
    }
    return complete;
}

export const ProfileService = Object.freeze({
    keys: PROFILE_KEYS,
    defaults: DEFAULT_PROFILE,
    normalize: normalizeProfile,
    load: loadStoredProfile,
    save: saveStoredProfile,
    clear: clearStoredProfile,
    setOwner: setProfileOwner,
    clearOwner: clearProfileOwner,
    getActiveOwnerId: () => activeOwnerId,
    migrationMarkerKey: LEGACY_MIGRATION_MARKER_KEY
});

