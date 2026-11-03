# Root Extract Instructions — Timer Proofer V341

1. Back up the currently working V340 directory and commit/stash any local edits.
2. Extract this ZIP directly into the project root (not into a nested V341 directory).
3. Do not overwrite or remove `.git`, `.env`, `.env.local`, `android/local.properties`, API keys, tokens, or local signing files.
4. From PowerShell run:

```powershell
npm ci
npm test
git diff --check
git status --short
```

5. Apply `supabase/migrations/20261101_hybrid_monetization_v341.sql` to the intended Supabase project.
6. Configure Vercel Preview environment variables and Midtrans Sandbox webhook as described in `HYBRID-MONETIZATION-V341.md`.
7. Deploy Preview and run `MANUAL-DEVICE-TEST-PLAN-V341.md` before any Production rollout.
8. For Android:

```powershell
npm run sync:android
cd android
.\gradlew.bat :app:assembleDebug
.\gradlew.bat :app:installDebug
```

9. Product-facing version remains V125. Technical release is V341; Service Worker cache is `Timer-Proofing-v1.1.243`.
