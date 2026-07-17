#!/usr/bin/env bash
# Deterministic, secure release packaging for PetPattern.
#
# Builds the release archive from TRACKED SOURCE via `git archive` (never a copy of the working
# tree), so it can only ever contain committed files — `.env`, node_modules, target, dist, DB
# backups and the accidental `*;C` cruft are excluded by construction. `.gitattributes export-ignore`
# additionally drops dev-only tracked files (.claude/, tasks.md, memory.md, …).
#
# It fails CLOSED: if a real secret file is tracked, or a secret PATTERN appears anywhere in the
# archived content, packaging aborts with a non-zero exit. It NEVER prints secret values — only the
# offending file paths.
#
# Usage:  ops/make-release.sh [output-dir]     (default: ./release)
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
OUT_DIR="${1:-release}"
mkdir -p "$OUT_DIR"

SHA="$(git rev-parse --short HEAD)"
ZIP="$OUT_DIR/petpattern-${SHA}.zip"

echo "==> PetPattern release packaging (HEAD ${SHA})"

fail() { echo "ERROR: $*" >&2; exit 1; }

# --- 1. Refuse to package if a real secret file is TRACKED ------------------------------------
# (.env.example and frontend/.env.mobile are safe placeholders / public config.)
TRACKED_SECRETS="$(git ls-files \
  | grep -iE '(^|/)\.env$|(^|/)\.env\.[a-z]*local|\.jks$|\.keystore$|\.p12$|\.pem$|\.key$|key\.properties$|google-services\.json$|GoogleService-Info\.plist$' \
  || true)"
if [ -n "$TRACKED_SECRETS" ]; then
  echo "$TRACKED_SECRETS" >&2
  fail "a secret-like file is TRACKED in git (see paths above). Remove it before releasing."
fi

# --- 2. Warn about untracked local secrets present in the working tree ------------------------
# These will NOT ship (git archive is tracked-only), but flag them so nothing is a surprise.
for f in .env backend/.env frontend/.env; do
  [ -f "$f" ] && echo "note: local secret file present (excluded from the archive): $f"
done

# --- 3. Materialize the exact archived content and scan it for secret PATTERNS -----------------
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git archive --format=tar HEAD | ( cd "$TMP" && tar -xf - )

# Patterns match real secret SHAPES (a value must follow), so this scanner file does not match
# itself. Only file paths are ever printed — never the matched value.
PATTERNS='AIza[0-9A-Za-z_-]{35}|GOCSPX-[0-9A-Za-z_-]{20,}|sk-ant-[0-9A-Za-z_-]{24,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}|xox[baprs]-[0-9A-Za-z-]{10,}'
HITS="$(grep -rIlE "$PATTERNS" "$TMP" 2>/dev/null | sed "s#^$TMP/##" | grep -vE '^ops/(make-release|verify-archive)\.sh$' || true)"
if [ -n "$HITS" ]; then
  echo "$HITS" >&2
  fail "secret-pattern match(es) in archived content (paths above). NEVER commit real secrets."
fi

# --- 4. Assert prohibited paths are absent from the archived content ---------------------------
ARCHIVED="$(git archive --format=tar HEAD | tar -tf - )"
PROHIBITED='(^|/)\.env$|(^|/)node_modules/|(^|/)target/|frontend/dist/|(^|/)backups/|(^|/)\.git/|;C($|/)|(^|/)\.claude/|\.keystore$|\.jks$|\.p12$|(^|/)build/|(^|/)\.gradle/|local\.properties$|(^|/)Pods/'
BAD="$(echo "$ARCHIVED" | grep -iE "$PROHIBITED" || true)"
if [ -n "$BAD" ]; then
  echo "$BAD" >&2
  fail "prohibited path(s) present in the archive (paths above)."
fi

# --- 5. Produce the ZIP from the same tracked source ------------------------------------------
rm -f "$ZIP"
git archive --format=zip -o "$ZIP" HEAD

FILE_COUNT="$(echo "$ARCHIVED" | grep -vE '/$' | wc -l | tr -d ' ')"
SIZE="$(wc -c < "$ZIP" | tr -d ' ')"
SIZE_H="$(awk -v b="$SIZE" 'BEGIN{ printf "%.2f MB", b/1048576 }')"

echo
echo "==> Release archive OK"
echo "    path:      $ZIP"
echo "    size:      $SIZE_H ($SIZE bytes)"
echo "    files:     $FILE_COUNT"
echo "    excluded:  .env / secrets, node_modules, target, dist, backups, .git,"
echo "               *;C cruft, .claude, native build outputs, keystores"
echo "    checks:    tracked-secret scan PASS, secret-pattern scan PASS, prohibited-path scan PASS"
