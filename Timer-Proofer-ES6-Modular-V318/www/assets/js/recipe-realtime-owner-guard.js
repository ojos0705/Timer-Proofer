/**
 * [AI-GENERATED][ES6 MODULE][V278]
 * Fail-closed guard for asynchronous realtime recipe events.
 * The event owner, current authenticated user, and active local namespace must
 * match the local owner captured before the event handler's first await.
 */
function normalizeOwnerId(value) {
    if (value == null || value === '') return null;
    return String(value);
}

export function isRecipeRealtimeOwnerConsistent({
    eventOwnerId,
    authenticatedOwnerId,
    localOwnerId,
    expectedLocalOwnerId
} = {}) {
    const eventOwner = normalizeOwnerId(eventOwnerId);
    const authOwner = normalizeOwnerId(authenticatedOwnerId);
    const currentLocalOwner = normalizeOwnerId(localOwnerId);
    const expectedLocalOwner = normalizeOwnerId(expectedLocalOwnerId);

    if (!eventOwner || !authOwner || !currentLocalOwner || !expectedLocalOwner) return false;

    return eventOwner === authOwner
        && eventOwner === currentLocalOwner
        && currentLocalOwner === expectedLocalOwner;
}
