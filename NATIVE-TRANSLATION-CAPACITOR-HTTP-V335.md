# Native Translation Networking — V335

## Problem addressed

Capacitor WebView requests made with browser `fetch` can fail during CORS preflight when sending an `Authorization` header to the remote Vercel endpoint. PWA requests are still browser requests and continue to require correct server CORS headers.

## Implementation

- `CapacitorHttp` is imported from the bundled Capacitor core vendor module and exposed by `NativeCapacitorService`.
- `CloudTranslationService` requests `preferNativeHttp: true`.
- `ApiClientService` uses `CapacitorHttp.request()` only when the runtime is a native Capacitor platform and the caller opts in.
- The native branch sends JSON and the Supabase bearer token through Capacitor's native HTTP bridge, with connection/read timeouts and structured HTTP/error-code handling.
- Other native API calls and all PWA/browser API calls retain their existing fetch behavior.
- Missing native HTTP capability fails with `API_NATIVE_HTTP_UNAVAILABLE`; it does not silently fall back to WebView fetch and recreate the same CORS error.
- The shared timeout timer is cleared after the native request.

Capacitor's official docs state that CapacitorHttp is bundled with `@capacitor/core`, provides direct native `request()` helpers, and that the `enabled` configuration flag controls patching global `fetch`/`XMLHttpRequest`. V335 uses the direct request helper and intentionally does not patch global networking for the whole app. See:

- https://github.com/ionic-team/capacitor/blob/main/core/http.md
- https://ionicframework.com/docs/troubleshooting/cors

## Remaining runtime requirements

- `api/translate.js` must be deployed to `https://timer-proofer.vercel.app/api/translate`.
- Android/iOS must be synchronized and rebuilt after this change so the updated native bridge/runtime is packaged.
- MyMemory is an external free provider with daily quotas and language-pair coverage limits.
- A real native device request and a live Vercel deployment check remain manual acceptance tests.
