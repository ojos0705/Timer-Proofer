# Free Online Translation — MyMemory (V334)

## Why this provider

Cloud Translation was not selected because the project owner cannot enable Google Cloud Billing. V334 uses the MyMemory translation API from the Vercel server-side route instead.

## Cost and quota

MyMemory's published usage limits document 5,000 translated characters per day for anonymous usage and up to 50,000 characters per day when a valid contact email is supplied with the `de` request parameter. These are provider limits, not unlimited service guarantees.

Optional Vercel variable:

`MYMEMORY_CONTACT_EMAIL=your-contact-address@example.com`

The variable is optional and not a secret/API key. Its value is sent to MyMemory as a contact/developer email. Do not use an address that should not be shared with the provider.

## Technical flow

1. The app collects safe UI text nodes and selected UI attributes.
2. User-authored recipe/profile data is excluded by OnlineI18n.
3. The app sends bounded batches to Vercel `/api/translate` with its Supabase access token.
4. The backend verifies the Supabase user, applies per-user rate limits, splits any long text below 500 UTF-8 bytes, and sends individual segments to MyMemory.
5. Results are cached in the Vercel process for 24 hours and by the existing client language cache. Cache lifetimes and capacity are bounded; serverless instances may be recycled.
6. The app restores the previous language if the new language choice fails.

## Important limitations

- There is no unlimited free hosted translation API in this implementation.
- MyMemory can reject unsupported language pairs. The language picker is a local candidate list, not an authoritative provider-support list.
- Free quotas can be exhausted. Repeated translations of cached strings reduce repeated provider usage but do not make first-time translation free beyond the provider limit.
- MyMemory's API terms prohibit abusive use, crawling, and prohibited high-volume/paragraph behavior. V334 sends individual UI text segments and enforces bounds; do not repurpose the endpoint for bulk document translation.
- Translation text is sent to MyMemory. User-authored recipe/profile information is excluded, but static UI text is externally processed.
- The API route validates the user's Supabase session; it does not expose a provider API key to the browser or APK.
- API response and retry tests are mocked. Live API compatibility, quotas, and language-pair availability must be verified after Vercel deployment.

## Official references

- Usage limits: https://mymemory.translated.net/doc/usagelimits.php
- API specification: https://mymemory.translated.net/doc/spec.php
- Terms and conditions: https://mymemory.translated.net/terms-and-conditions

## Alternatives

LibreTranslate is open-source and can be self-hosted without a paid per-character API contract, but hosting still requires an always-on server, network, maintenance, and compute resources. Its public hosted API is not a guaranteed unlimited free service. It is a possible future alternative if the project has a suitable server to host it.
