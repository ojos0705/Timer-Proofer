// [AI-GENERATED][REFACTOR] Shared DOM event utility for replaceable listeners.
// Prevents feature modules from maintaining hidden event-handler registries.
const replaceableClickHandlers = new WeakMap();

export function bindReplaceableClick(element, handler) {
    if (!(element instanceof Element) || typeof handler !== 'function') return () => {};

    const previous = replaceableClickHandlers.get(element);
    if (previous) element.removeEventListener('click', previous);

    element.addEventListener('click', handler);
    replaceableClickHandlers.set(element, handler);

    return () => {
        const current = replaceableClickHandlers.get(element);
        if (current === handler) {
            element.removeEventListener('click', handler);
            replaceableClickHandlers.delete(element);
        }
    };
}
