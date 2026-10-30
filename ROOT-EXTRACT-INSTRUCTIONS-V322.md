# V322 Root Extract Instructions

1. Back up the local project and preserve the `.git` directory and `.env` file.
2. Extract the ZIP contents directly into `C:\xampp\htdocs\proofing-donat-baru` (repository root), not into a nested V322 folder.
3. Allow updated project files to replace their older counterparts. Do not delete unrelated user files.
4. In PowerShell:

```powershell
cd C:\xampp\htdocs\proofing-donat-baru
node --check assets/js/app-core.js
node --check assets/js/ai-formatters.js
node scripts/sync-web-assets.mjs
node scripts/verify-release.mjs
node scripts/audit-function-names.mjs
```

5. Run `npm test` on the local machine after dependencies are installed. Confirm no `.env`, keys, tokens, or other secrets are staged.
6. Review `git status --short` and `git diff --cached --check`, then stage, commit, and push to the Preview branch.
7. Test the Preview deployment before merging to `main`.

The project remains product version V125. Technical cache token is V322. Existing `.git`, `.env`, Vercel environment variables, and user data must be preserved.
