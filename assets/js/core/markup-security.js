/**
 * [AI-GENERATED][SECURITY][V215] Small context-aware helpers for values that
 * must be rendered into HTML markup. Text/attribute escaping and image-source
 * validation are kept separate because escaping alone does not make a URL safe.
 */
const MAX_RECIPE_IMAGE_SOURCE_LENGTH = 5 * 1024 * 1024;
const RASTER_IMAGE_DATA_URL = /^data:image\/(?:png|jpe?g|gif|webp|avif|bmp);base64,(?=[A-Za-z0-9+/]{2})(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/i;

/** Escape an untrusted value for insertion into an HTML text or quoted attribute context. */
export function escapeHtmlMarkup(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Return an image source only when it uses a passive image format or a web URL.
 * SVG/data HTML, script schemes, file URLs, credentials, and excessively large
 * values are rejected. The returned value must still be HTML-escaped at use.
 */
export function normalizeSafeRecipeImageSource(value) {
    if (typeof value !== 'string') return '';
    const source = value.trim();
    if (!source || source.length > MAX_RECIPE_IMAGE_SOURCE_LENGTH) return '';

    if (RASTER_IMAGE_DATA_URL.test(source)) return source;
    // Data URLs are only accepted above for raster formats; do not allow SVG/HTML.
    if (/^data:/i.test(source)) return '';

    let parsed;
    try {
        parsed = new URL(source, 'https://timer-proofer.invalid/');
    } catch {
        return '';
    }

    if (!['http:', 'https:', 'blob:'].includes(parsed.protocol)) return '';
    if (parsed.username || parsed.password) return '';
    return source;
}
