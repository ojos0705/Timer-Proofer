/**
 * [AI-GENERATED][ES6 MODULE][V279]
 * Pure guard for asynchronous recipe-editor saves.
 * A commit is valid only for the authenticated/local owner and editor/photo
 * context captured when the user pressed Save.
 */
function normalizeIdentity(value) {
    if (value == null || value === '') return null;
    return String(value);
}

function normalizeGeneration(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
}

export function isRecipeSaveContextCurrent({
    expectedOwnerId,
    authenticatedOwnerId,
    activeOwnerId,
    capturedEditorEpoch,
    activeEditorEpoch,
    capturedEditingRecipeId,
    activeEditingRecipeId,
    capturedPhotoMutationEpoch,
    activePhotoMutationEpoch,
    capturedFormFingerprint,
    activeFormFingerprint
} = {}) {
    const expectedOwner = normalizeIdentity(expectedOwnerId);
    const authenticatedOwner = normalizeIdentity(authenticatedOwnerId);
    const activeOwner = normalizeIdentity(activeOwnerId);

    // Recipe writes are always account-scoped; ownerless saves must fail closed.
    if (!expectedOwner || authenticatedOwner !== expectedOwner || activeOwner !== expectedOwner) {
        return false;
    }

    const capturedEditorGeneration = normalizeGeneration(capturedEditorEpoch);
    const activeEditorGeneration = normalizeGeneration(activeEditorEpoch);
    if (capturedEditorGeneration === null || activeEditorGeneration === null
        || capturedEditorGeneration !== activeEditorGeneration) {
        return false;
    }

    if (normalizeIdentity(capturedEditingRecipeId) !== normalizeIdentity(activeEditingRecipeId)) {
        return false;
    }

    // A form can change without navigating to another recipe. Compare the
    // canonical serialized editor inputs as well, so a late save never clears
    // or republishes a form that the user continued editing while it awaited I/O.
    if (capturedFormFingerprint != null
        && normalizeIdentity(capturedFormFingerprint) !== normalizeIdentity(activeFormFingerprint)) {
        return false;
    }

    const capturedPhotoGeneration = normalizeGeneration(capturedPhotoMutationEpoch ?? 0);
    const activePhotoGeneration = normalizeGeneration(activePhotoMutationEpoch ?? 0);
    if (capturedPhotoGeneration === null || activePhotoGeneration === null
        || capturedPhotoGeneration !== activePhotoGeneration) {
        return false;
    }

    return true;
}
