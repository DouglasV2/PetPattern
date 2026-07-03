# Security & performance assessment (pre-launch)

A load test (~20 concurrent users), a database-optimization review, and a
multi-agent security audit (static code audit + live probing), with adversarial
verification of every finding. This records what was tested, what was fixed, and
which residual items are consciously accepted for the beta.

## Load test — PASS

20 concurrent virtual users for 45s against the real stack (seeded: 20 owners ×
1 pet × 30 check-ins). **12,769 requests, 282 req/s, 0.00% errors.** Latency:

| Endpoint | p95 | p99 | max |
|---|---|---|---|
| `/overview` (hot path) | 102 ms | 156 ms | 245 ms |
| `/patterns` | 81 ms | — | 212 ms |
| `/vet-summary` | 83 ms | — | 206 ms |
| `/check-ins` | 37 ms | — | 125 ms |

The connection pool never starved (0 timeouts). `EXPLAIN` confirmed check-in
queries use the `(pet_id, check_in_date)` unique index; food-log/owner lookups
were sequential scans (tiny tables today, indexed anyway — see below).

## Fixed

| Sev | Issue | Fix |
|---|---|---|
| **High** | Password-reset link (raw token) was logged in prod by default (mail off → `WARN` with the token → account takeover for anyone with log access) | Token link is now logged **only when the `prod` profile is NOT active**. In prod it logs a "mail not configured" notice with no token. Mail delivery moved off the request thread. |
| Med | No HTTP security headers on the SPA | Added `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `HSTS`, and a SPA-tuned `Content-Security-Policy` (`frame-ancestors 'none'`) in `nginx.conf`. |
| Med | Connection pool used Hikari's default 10 for a 20-user target | Explicit `maximum-pool-size: 20`, `minimum-idle: 5`, `connection-timeout: 10s` (`DB_POOL_SIZE` override). |
| Low | Login timing side-channel (BCrypt only ran for known emails → email enumeration) | Login now always runs one BCrypt comparison (dummy hash for unknown emails) — constant-time. |
| Low | `forgot-password` timing (sync SMTP on the request thread revealed account existence + held a DB connection) | Email is rendered on the request thread then delivered **`@Async`, after commit** — response no longer waits on SMTP. |
| Low | Missing indexes on FK columns (`pets.owner_id`, `food_logs.pet_id`, …) | `V8__fk_indexes.sql` adds btree indexes (also speeds cascade deletes). |
| Low | Reset token persisted in the URL/history after use (shared-device replay window) | `ResetPasswordView` strips the token from the URL via `history.replaceState` on mount. |
| Low | Register/reset accepted unbounded input (oversized email → misleading 409; unbounded password) | `@Size` caps + `@Valid` on register/reset; `@Max` on `waterIntakeMl` / `amountGrams`. |
| Low | Image upload trusted the client `Content-Type` (arbitrary bytes stored as "image") | Magic-byte detection (JPEG/PNG/WebP); the **detected** type is stored, not the client header. |
| Low | Backend container ran as root | Backend `Dockerfile` now creates and runs as a non-root `app` user. |

## Accepted / documented residuals (not fixed for the beta)

- **Registration reveals whether an email exists** (409 on duplicate). Inherent to
  self-service signup; closing it fully needs an email-verification flow (a new
  feature, out of scope under the freeze). Rate-limited to 5/min/IP.
- **`X-Real-IP` is trusted for rate limiting.** Safe on the shipped prod path
  (backend has no published port; nginx overwrites the header). Only spoofable if
  an operator publishes the backend directly behind a proxy that doesn't sanitise
  it — a misconfiguration. Documented in `DEPLOY.md`.
- **`server.error.include-message: always`.** Kept so handled 4xx reason phrases
  reach the UI; stack traces are off in prod. Worst case is a framework parse
  message on malformed JSON. A global exception handler is the future cleanup.
- **`/check-ins`, `/food-logs`, export are unpaginated.** Growth is bounded to one
  check-in per pet per day and the endpoints are owner-scoped, so responses stay
  small for years; add `Pageable` before large-scale GA.
- **Pattern engine recomputes on each read.** Bounded (~120 rows/pet, indexed);
  cache it if histories or traffic grow well beyond the beta.
- **Frontend nginx master runs as root** (workers drop to `nginx`). Switch to
  `nginxinc/nginx-unprivileged` at GA (changes the listen port + compose mapping).
- **Base images use floating tags** (not digest-pinned). Reproducibility/hygiene;
  pin by `@sha256` at GA.
- **esbuild dev-server advisory (GHSA-67mh-4wv8-2f99)** is present transitively but
  **not shipped** — the prod image is static nginx only; affects `npm run dev` only.

## Not found (verified absent)

- No SQL/JPQL injection (all queries parameterized; one JPQL `@Query`, no
  string-built queries). No IDOR: every pet-scoped endpoint routes through
  `PetAccess` and re-checks child ownership; the `access-control` audit returned
  **zero** findings. No `dangerouslySetInnerHTML`/`eval`/`innerHTML` in the
  frontend. Sentry/analytics payloads carry no health content (verified: no
  request bodies, allow-listed event names only).
