// Entry point that re-exports the Capacitor plugins actually used by index.html.
// Bundled locally from node_modules (matching the exact @capacitor/core version
// used by the native Android/iOS project) instead of loading from a CDN at
// runtime. This fixes:
//   1) App requiring internet access on every launch just to fetch plugin JS
//   2) Version mismatches between the CDN package and the native shell
//   3) Plugins silently falling back to (limited) web implementations
export { App } from '@capacitor/app';
export { LocalNotifications } from '@capacitor/local-notifications';
export { Preferences } from '@capacitor/preferences';
export { Share } from '@capacitor/share';
export { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
