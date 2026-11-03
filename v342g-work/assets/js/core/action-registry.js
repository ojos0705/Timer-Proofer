/**
 * [AI-GENERATED][SECURITY][V220] Resolve only explicitly owned callable entries.
 * This prevents inherited object properties (for example `toString`) from being
 * mistaken for registered UI actions or callable globals.
 */
export function getOwnCallable(target, name) {
    if (
        target === null ||
        (typeof target !== 'object' && typeof target !== 'function') ||
        typeof name !== 'string' ||
        !Object.prototype.hasOwnProperty.call(target, name)
    ) {
        return null;
    }

    const candidate = target[name];
    return typeof candidate === 'function' ? candidate : null;
}
