/**
 * [AI-GENERATED][REFACTOR][V39] Canonical Capacitor capability bridge.
 * Keeps all native plugin discovery/registration behind one service.
 * Browser/PWA remains dependency-free and always uses web fallbacks.
 */
import {
    App,
    Filesystem,
    LocalNotifications,
    Preferences,
    Share
} from '../../vendor/capacitor-plugins.js';

const STATIC_PLUGINS = Object.freeze({
    App,
    Filesystem,
    LocalNotifications,
    Preferences,
    Share
});

const NATIVE_PLUGIN_NAMES = Object.freeze([
    'Geolocation',
    'Network',
    'Haptics',
    'BluetoothLe'
]);

function getCapacitor() {
    return typeof window !== 'undefined' ? window.Capacitor || null : null;
}

function isNativePlatform() {
    try {
        return getCapacitor()?.isNativePlatform?.() === true;
    } catch (error) {
        console.warn('[NativeCapacitorService] Native detection gagal:', error);
        return false;
    }
}

function registerNativePlugin(name) {
    const capacitor = getCapacitor();
    if (!capacitor || !isNativePlatform()) return null;

    const existing = capacitor.Plugins?.[name];
    if (existing) return existing;

    try {
        if (typeof capacitor.registerPlugin !== 'function') return null;
        // [AI-GENERATED][BUG FIX] Capacitor v8 can create the native proxy from
        // native PluginHeaders; no web implementation is supplied here because
        // these capabilities have deliberate browser fallbacks.
        return capacitor.registerPlugin(name);
    } catch (error) {
        // Another module may have registered the plugin concurrently.
        return capacitor.Plugins?.[name] || null;
    }
}

function getPlugin(name) {
    if (STATIC_PLUGINS[name]) return STATIC_PLUGINS[name];

    const capacitor = getCapacitor();
    const registered = capacitor?.Plugins?.[name];
    if (registered) return registered;

    if (NATIVE_PLUGIN_NAMES.includes(name)) {
        return registerNativePlugin(name);
    }

    return null;
}

function canUse(name) {
    const plugin = getPlugin(name);
    return Boolean(plugin && typeof plugin === 'object');
}

function getCapabilities() {
    return Object.freeze({
        native: isNativePlatform(),
        geolocation: canUse('Geolocation'),
        network: canUse('Network'),
        haptics: canUse('Haptics'),
        bluetoothLe: canUse('BluetoothLe'),
        filesystem: canUse('Filesystem'),
        localNotifications: canUse('LocalNotifications'),
        preferences: canUse('Preferences'),
        share: canUse('Share')
    });
}

const NativeCapacitorService = Object.freeze({
    isNativePlatform,
    getPlugin,
    canUse,
    getCapabilities,
    App,
    Filesystem,
    LocalNotifications,
    Preferences,
    Share,
    DocumentsDirectory: 'DOCUMENTS'
});


export {
    NativeCapacitorService,
    isNativePlatform,
    getPlugin,
    canUse,
    getCapabilities
};
