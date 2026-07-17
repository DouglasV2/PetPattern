# Google Sign-In

"Continue with Google" is implemented as a hand-rolled OAuth2 authorization-code
flow that plugs into the app's existing opaque-session auth — **no Spring
Security**, and email/password sign-in is untouched. It is fully **additive** and
**env-driven**: with the env vars unset, the endpoints 404 and the UI shows no
Google button.

## How it works

1. Frontend shows "Continue with Google" only when `/api/config` reports
   `googleLoginEnabled: true`. The button navigates to `/api/auth/google/start`.
2. `GET /api/auth/google/start` sets a short-lived, HttpOnly `pp_oauth_state`
   CSRF cookie and 302-redirects to Google's consent screen (scope
   `openid email profile`, `prompt=select_account`).
3. Google redirects back to `GET /api/auth/google/callback`. The backend:
   verifies `state` against the cookie (constant-time), swaps the `code` for
   tokens server-to-server over TLS (with the client secret), reads the
   **verified** email + name from Google's userinfo endpoint, finds-or-creates
   the owner, issues the normal `pp_session` cookie, and 302-redirects to the app.
4. On any failure it redirects to `/#auth-error=…` and the login screen shows a
   neutral message.

**Account linking:** the owner is found-or-created by email, so signing in with
Google for an email that already has a password account signs into that same
account (no duplicate). Only `email_verified: true` accounts are accepted.
Google-only accounts get a random, unusable password hash (password login can
never match), so no schema migration was needed.

**Scope & privacy:** only `openid email profile`. We store just the email and, if
present, the display name — nothing else. The client secret stays server-side.

## Setup

1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth client
   ID** → *Web application*.
2. Add an **Authorized redirect URI** that exactly matches
   `GOOGLE_OAUTH_REDIRECT_URI`. For local Docker dev:
   `http://localhost:7317/api/auth/google/callback`. For prod:
   `https://<your-domain>/api/auth/google/callback`.
3. Put the credentials in `.env` (gitignored — never commit):

```
GOOGLE_OAUTH_CLIENT_ID=<client id>.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=<client secret>
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:7317/api/auth/google/callback
```

4. `docker compose up -d --build` — compose reads `.env` and passes the vars to
   the backend. Verify with `curl -s http://127.0.0.1:8317/api/config` →
   `{"demoEnabled":true,"googleLoginEnabled":true}`.

## Notes

- The redirect URI's host determines where the session cookie is set and where
  the final redirect lands — keep it on the same origin the user browses.
- In production set `PETPATTERN_COOKIE_SECURE=true` (https) so the session and
  state cookies are TLS-only; the redirect URI must be `https://`.
- Backend: [GoogleAuthController.java](../backend/src/main/java/com/petpattern/api/GoogleAuthController.java),
  [AuthService.findOrCreateGoogleOwner](../backend/src/main/java/com/petpattern/auth/AuthService.java).

## Native apps (post-beta)

This is a **web-redirect** flow: it navigates the browser to `/api/auth/google/start`, sets a
`pp_oauth_state` cookie, and lands back on the same web origin with a session cookie. That round-trip
cannot return a session into a native (Capacitor) WebView whose origin is `capacitor://localhost` /
`https://localhost`, so the **Google button is hidden on Android/iOS** (`AuthScreen`). Native users
sign in with email/password and can reset their password.

Full native Google OAuth (a proper system-browser / ASWebAuthenticationSession + Custom Tabs handoff
that returns the session to the app) is intentionally **out of scope for the closed beta** and is
tracked as a post-beta enhancement. Do not ship a half-finished WebView redirect that cannot return
a native session.
