# Deploying PetPattern (beta)

Production stack: **frontend** (nginx: serves the SPA and proxies `/api` to the
backend over the internal Docker network), **backend** (Spring Boot), **postgres**
(internal only). TLS is terminated by a reverse proxy you run in front. Everything
runs from `docker-compose.prod.yml`, which reads secrets from `.env`.

## 1. Prerequisites

- A Linux host with Docker Engine + Docker Compose v2.
- A domain (e.g. `app.example.com`) with a DNS **A record** pointing at the host.
- Ports 80/443 open for the reverse proxy.

## 2. First deploy

```bash
git clone <repo> /opt/petpattern && cd /opt/petpattern
cp .env.example .env
#   edit .env — set POSTGRES_PASSWORD (openssl rand -base64 32) and PUBLIC_ORIGIN=https://app.example.com
docker compose -f docker-compose.prod.yml up -d --build
```

Check it came up healthy (backend is health-gated, so this reflects a working DB + app):

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml exec backend curl -fsS http://localhost:8080/actuator/health
# -> {"status":"UP"}
```

Flyway runs all `V*` migrations automatically on start; a fresh volume is
created and migrated (V1 → latest) on first boot.

## 3. TLS (required — the session cookie is HTTPS-only in prod)

The frontend is published on `127.0.0.1:7317`. Put a reverse proxy in front that
terminates TLS and forwards to it. **Caddy** is the simplest (automatic Let's
Encrypt). `/etc/caddy/Caddyfile`:

```
app.example.com {
    reverse_proxy 127.0.0.1:7317
}
```

`PUBLIC_ORIGIN` in `.env` must match this URL (`https://app.example.com`). Over
plain HTTP, login will not work — the cookie is `Secure`.

## 4. Backups (do this before real users)

The longitudinal record is the whole product — schedule dumps and copy them
off-box.

```bash
crontab -e
# daily at 03:00
0 3 * * *  cd /opt/petpattern && ops/backup-db.sh >> /var/log/petpattern-backup.log 2>&1
```

`ops/backup-db.sh` writes gzipped, timestamped dumps to `./backups/` and keeps the
newest 14 (`BACKUP_KEEP` to change). **Copy `./backups/` off the host** (rsync/S3)
— a backup on the same disk doesn't survive a disk failure. Restore:

```bash
ops/restore-db.sh backups/petpattern-YYYYmmdd-HHMMSS.sql.gz   # overwrites current data
```

## 5. Operating

- **Health:** `docker compose -f docker-compose.prod.yml ps` (backend shows
  healthy/unhealthy). Point an external uptime monitor at `https://app.example.com/`.
- **Logs:** JSON in prod — `docker compose -f docker-compose.prod.yml logs -f backend`.
  Ship to an aggregator if you have one. (Error tracking e.g. Sentry is a separate,
  recommended next step.)
- **Demo button:** `PETPATTERN_DEMO_ENABLED=false` in `.env` removes the public
  "Load Bella demo" seed. Left on, it's rate-limited (5/min/IP).

## 6. Upgrades

```bash
cd /opt/petpattern && git pull
docker compose -f docker-compose.prod.yml up -d --build
```

New migrations apply automatically on start (`ddl-auto=validate`, so the schema
must match the entities — new entities require a new `V*` migration). **Take a
backup first** (`ops/backup-db.sh`). Rollback = restore the pre-upgrade dump and
`git checkout` the previous commit, then `up -d --build`.

## 7. Security checklist

- [ ] `POSTGRES_PASSWORD` is a strong random value; `.env` is not committed.
- [ ] Served over HTTPS; `PUBLIC_ORIGIN` is the https URL.
- [ ] Postgres has no published port (it doesn't in `docker-compose.prod.yml`).
- [ ] **Backend has no published port** (the frontend proxies `/api` internally). The
  rate limiter trusts `X-Real-IP`, which nginx sets — never expose the backend to a
  proxy that forwards a client-supplied `X-Real-IP`.
- [ ] Configure email (`PETPATTERN_MAIL_ENABLED=true` + `SMTP_*`) before real users —
  otherwise password reset can't reach them (and reset links are not logged in prod).
- [ ] Backups run on a schedule and are copied off-host.
- [ ] Decide on the demo seed (`PETPATTERN_DEMO_ENABLED`).

Full pre-launch security + load assessment (findings, fixes, accepted residuals):
[`docs/security-notes.md`](docs/security-notes.md).

## Optional integrations (all off by default — see [docs/observability.md](docs/observability.md))

- **Password reset email.** The flow exists; set `PETPATTERN_MAIL_ENABLED=true` +
  `SMTP_*` in `.env` to send real mail. Left off, reset links are written to the
  backend log (usable for a tiny beta).
- **Error tracking (Sentry).** Set `SENTRY_DSN` (backend) and/or `VITE_SENTRY_DSN`
  (frontend, build-time) to enable. Empty = disabled.
- **Product analytics.** Set `VITE_ANALYTICS_URL` (build-time) to send a fixed set
  of privacy-safe funnel events. Empty = disabled.

## Known gaps before GA (not blockers for a closed beta)

- Real push / email reminders (only password-reset email exists).
- Per-user timezones (currently server-UTC with a +1-day check-in tolerance).
- Backend-generated text (patterns/vet summary) follows the UI language; owner-typed
  text (notes, food/med names) stays in whatever language it was entered.
