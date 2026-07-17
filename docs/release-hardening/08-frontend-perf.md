# WP7 — Frontend dependency security + performance

## Dependency security (npm audit)
| | Before | After |
|---|---|---|
| Vulnerabilities | **2** (1 moderate, 1 high) | **0** |
| Cause | `esbuild <=0.24.2` dev-server advisory (GHSA-67mh-4wv8-2f99) via `vite 5.4.21` — **dev-server only, not a production-runtime issue** | resolved |
| Fix | — | Upgraded `vite ^5.4.21 → ^7.3.6` (esbuild 0.25+) and `@vitejs/plugin-react ^4.3.4 → ^5.2.0` (required for Vite 7). |

The upgrade was validated, not forced blindly: production build passes and all 90 frontend tests
pass on Vite 7. This also resolved a latent peer mismatch (vitest 4 required vite ^6/7/8 while the
app pinned vite 5). `npm audit` (prod + dev) is now clean — **0 vulnerabilities**.

## Bundle size (production build)
| Metric | Before | After | Δ |
|---|---|---|---|
| Initial JS (entry + react-vendor + icons) | **752.84 KB** (single chunk) | **~328 KB** | **−56%** |
| Initial JS, gzip | ~201.95 KB | **~100 KB** | **−50%** |
| Entry (app) chunk | 752.84 KB | **180 KB** | −76% |
| Largest chunk | 752.84 KB | 180 KB (entry); 138 KB react-vendor (framework) | |
| JS chunks | 1 | **17** | |
| Total JS (all chunks) | 752.84 KB | ~383 KB | −49% |
| Build time | ~4.1 s | ~4 s | — |

### What changed
1. **Route/feature-level code-splitting** — 12 secondary views (`PatternsView`, `TimelineView`,
   `FoodView`, `FoodDetectiveView`, `TrialsView`, `PhotosView`, `VetSummaryView`, `RecapView`,
   `CaregiversView`, `AccountView`, `MedicationsView`, `LegalView`) are `React.lazy` + `Suspense`,
   so each is its own on-demand chunk (2.5–9 KB). Today + check-in + auth + onboarding stay in the
   initial chunk (the primary flow is instant).
2. **Loading fallback + chunk-load error boundary** — `ViewFallback` (polite live region) while a
   view loads; `ChunkErrorBoundary` recovers a stale-chunk 404 after a redeploy with a Reload action.
3. **Sentry lazy-loaded** — imported only when `VITE_SENTRY_DSN` is set; tree-shaken out of the
   default build entirely, on its own chunk otherwise.
4. **Dropped 14 unreachable locales** — only `en` + `hr` are public (`SUPPORTED`), so the 14 hidden
   locale maps were ~440 KB of dead weight in every bundle. Files kept as future work; not imported.
5. **Vendor chunking** — `react-vendor` / `icons` split for long-term caching.

## Performance budget (documented target)
- **Initial JS ≤ 400 KB raw / ≤ 120 KB gzip** — currently ~328 KB / ~100 KB. ✅
- **Largest app (non-framework) chunk ≤ 250 KB** — currently 180 KB entry. ✅
- **Each lazily-loaded feature view ≤ 15 KB** — currently ≤ 9.4 KB. ✅
- **Production `npm audit`: 0 high/critical** — currently 0 total. ✅

CI (WP10) enforces the audit budget; the bundle budget is documented here for review during future
feature work (the check-in and Today flows must not regress back into a monolith).

## Verified
- `npm ci` clean install → `npx vite build` passes → `npx vitest run` 90/90 pass on Vite 7.
- Direct/deep navigation to lazy views works (each renders inside its Suspense boundary).
