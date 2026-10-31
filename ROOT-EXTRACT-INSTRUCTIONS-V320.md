# V320 — Root Extract Instructions

1. Back up `C:\xampp\htdocs\proofing-donat-baru` and keep its `.git` directory intact.
2. Extract this ZIP directly into `C:\xampp\htdocs\proofing-donat-baru` (do not create a nested V320 folder). Allow replacement only after the backup is complete.
3. Review changes and check for secrets:

```powershell
cd C:\xampp\htdocs\proofing-donat-baru
git status --short
# Ensure no .env, credentials, private keys or tokens are staged.
npm ci
npm test
git diff --check
```

4. Commit the V320 code on your working branch, then push. Create/update a Pull Request to `main` after Preview verification.

Example:

```powershell
git add assets/js www/index.html www/sw.js version.json tests RECIPE-UI-THEME-AND-AI-RESET-V320.md QA-TEST-LOG-V320.txt ROOT-EXTRACT-INSTRUCTIONS-V320.md
git diff --cached --check
git commit -m "Fix recipe close, AI reset and brand theme"
git push
```

Do not commit `.env` or API keys. Product version remains V125; V320 is the technical/cache revision.

## Restore stable Vercel URL

In Vercel Dashboard open project `timer-proofer` → Settings → Domains. Add or assign `timer-proofer.vercel.app` to Production, not to the Preview branch. Confirm the production branch is `main`. This domain assignment is project configuration and is not performed by extracting or pushing this ZIP.
