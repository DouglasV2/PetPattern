// Preflight for `npm run build:mobile`.
//
// A native build has no same-origin proxy, so VITE_API_BASE must be a real https origin. Shipping
// the placeholder produces an app where EVERY request fails — and it looks fine until a device
// opens it. Fail the build here instead, loudly, with the fix in the message.
//
// Also refuses to let anything secret-shaped be inlined into the bundle: every VITE_* value is
// public once built.

const RED = (s) => `\x1b[31m${s}\x1b[0m`
const DIM = (s) => `\x1b[2m${s}\x1b[0m`

const problems = []
const apiBase = (process.env.VITE_API_BASE || '').trim()

if (!apiBase) {
  problems.push(
    'VITE_API_BASE is not set.\n'
    + '    A native build cannot use a relative "/api" origin — it needs your deployed API.\n'
    + '    Fix: VITE_API_BASE=https://api.yourdomain.com/api npm run build:mobile'
  )
} else if (/example\.com|YOUR-PRODUCTION-API|changeme|localhost|127\.0\.0\.1/i.test(apiBase)) {
  problems.push(
    `VITE_API_BASE is still a placeholder / local address: ${apiBase}\n`
    + '    A store build must point at the real, publicly reachable production API.'
  )
} else if (!/^https:\/\//i.test(apiBase)) {
  problems.push(
    `VITE_API_BASE must be https:// (got: ${apiBase})\n`
    + '    Android blocks cleartext traffic by default and the session cookie is Secure.'
  )
}

// Nothing secret-shaped may be inlined into a public bundle.
const SECRETISH = /(secret|password|passwd|private[_-]?key|client[_-]?secret|admin[_-]?token)/i
for (const [key, value] of Object.entries(process.env)) {
  if (!key.startsWith('VITE_')) continue
  if (SECRETISH.test(key)) {
    problems.push(`${key} looks like a secret. VITE_* values are PUBLIC in the built bundle.`)
    continue
  }
  const v = String(value || '')
  if (/^(AIza[0-9A-Za-z_-]{35}|GOCSPX-|sk-ant-|xox[baprs]-|AKIA[0-9A-Z]{16})/.test(v)
      || v.includes('-----BEGIN')) {
    problems.push(`${key} contains a secret-shaped value. VITE_* values are PUBLIC in the bundle.`)
  }
}

if (problems.length) {
  console.error(RED('\n✖ Mobile build preflight failed\n'))
  for (const p of problems) console.error(`  • ${p}\n`)
  console.error(DIM('  See docs/android-release.md for the full release procedure.\n'))
  process.exit(1)
}

console.log(`✔ mobile env OK — VITE_API_BASE=${apiBase}`)
