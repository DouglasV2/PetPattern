# WP5 — Secure release packaging & secret hygiene

## How to build a release archive
```bash
ops/make-release.sh            # -> release/petpattern-<sha>.zip
```
The script packages from **tracked source** via `git archive HEAD` — never a copy of the working
tree — so the archive can only contain committed files. It **fails closed** and prints only file
paths, never secret values:
1. aborts if any real secret file is TRACKED (`.env`, `*.jks/*.keystore/*.p12/*.pem/*.key`,
   `key.properties`, `google-services.json`, `GoogleService-Info.plist`);
2. notes (but does not ship) any local untracked secret file present in the working tree;
3. materializes the exact archived content and scans it for secret PATTERNS (Google API key,
   `GOCSPX-` OAuth secret, `sk-ant-`, PEM private-key headers, `AKIA…`, Slack `xox…`) — abort on match;
4. asserts prohibited paths are absent (`.env`, node_modules, target, dist, backups, `.git`,
   `*;C`, `.claude`, native `build/`/`.gradle/`/`Pods/`, keystores);
5. writes the ZIP and reports path / size / file-count.

`.gitattributes export-ignore` additionally excludes dev-only tracked files from the archive
(`.claude/`, `.superpowers/`, `docs/superpowers/`, `tasks.md`, `memory.md`, `api.http`,
`LAUNCH_QA_CHECKLIST.md`, `.gitignore`, `.gitattributes`).

Because it is tracked-only, the archive automatically excludes: the local `.env` (live secrets),
`node_modules/`, `backend/target/`, `frontend/dist/`, `backups/`, `.git/`, the malformed
`backend;C` / `frontend/*.json;C` cruft, native build outputs, and any keystore.

## Files & directories that must NEVER be committed
`.env` (any real one) · OAuth/API secrets · `*.jks` / `*.keystore` / `*.p12` / `*.pem` / `*.key` ·
`key.properties` · `google-services.json` · `GoogleService-Info.plist` · iOS provisioning profiles ·
`node_modules/` · `backend/target/` · `frontend/dist/` (except intentionally) · `backups/` · local
databases / dumps / `*.log` · IDE metadata (`.idea/`, `.vscode/`) · `.claude/settings.local.json` ·
the accidental `*;C` files. All are covered by `.gitignore` today (verified: only `.env.example`
and the public `frontend/.env.mobile` match secret-ish names in the tracked set).

## OAuth credential rotation runbook (Google Sign-In)  — MANUAL, do NOT automate
The local `.env` contains a **live Google OAuth client id + client secret**. Any secret that ever
sat in a shared `.env`, a zip, a screen-share, or a chat should be rotated. Steps:

1. Google Cloud Console → **APIs & Services → Credentials** → the PetPattern OAuth 2.0 Client ID.
2. **Add** a new client secret (or "Reset secret"). Do **not** delete the old one yet.
3. Put the new secret in the server environment only (`.env` / your secret manager) as
   `GOOGLE_OAUTH_CLIENT_SECRET=…`. Never commit it. Never paste it into chat/logs/screenshots.
4. Redeploy: `docker compose -f docker-compose.prod.yml up -d` (the app reads it from the env).
5. Verify Google Sign-In works end to end, then **revoke the old secret** in the console.
6. If the **client id** itself was exposed in a way that matters (it is less sensitive — it is
   public in the redirect flow), you may instead create a new OAuth client and update
   `GOOGLE_OAUTH_CLIENT_ID` + the authorized redirect URIs.

Other credentials to rotate if they were ever shared: `POSTGRES_PASSWORD`, `SMTP_PASSWORD`,
`ANTHROPIC_API_KEY` / `GEMINI_API_KEY` (if set), `PETPATTERN_ANALYTICS_ADMIN_TOKEN`,
`PETPATTERN_ANALYTICS_REF_SALT` (rotating the salt resets analytics pseudonyms — intended), `SENTRY_DSN`.

## Git history
`git log --all --diff-filter=A -- '*.env' '.env'` and a keystore/PEM history scan return nothing —
no secret file was ever committed and later removed. So history rewriting is **not** required; only
rotating any secret that was shared out-of-band (the local `.env`) is.
