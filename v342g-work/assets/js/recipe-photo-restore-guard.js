/**
 * [AI-GENERATED][ES6 MODULE][V277]
 * Pure ownership/generation guard for asynchronously restored recipe photos.
 * A restore may render only if the authenticated owner and UI/mutation generations
 * still match those captured when the restore began.
 */
function normalizeOwnerId(value) {
    if (value == null || value === '') return null;
    return String(value);
}

export function isRecipePhotoRestoreCurrent({
    capturedOwnerId,
    activeOwnerId,
    capturedRestoreEpoch,
    activeRestoreEpoch,
    capturedMutationEpoch,
    activeMutationEpoch
} = {}) {
    const capturedOwner = normalizeOwnerId(capturedOwnerId);
    const activeOwner = normalizeOwnerId(activeOwnerId);
    if (!capturedOwner || !activeOwner || capturedOwner !== activeOwner) return false;

    return Number.isFinite(Number(capturedRestoreEpoch))
        && Number(capturedRestoreEpoch) === Number(activeRestoreEpoch)
        && Number.isFinite(Number(capturedMutationEpoch))
        && Number(capturedMutationEpoch) === Number(activeMutationEpoch);
}
