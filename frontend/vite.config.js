import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The app version travels with analytics events (validated + clamped server-side). Read it from
// package.json at build time so there is a single source of truth and it can never drift.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

export default defineConfig({
  plugins: [react()],
  // Injected build-time constant — see src/lib/clientInfo.js. VITE_APP_VERSION (if set in the
  // environment / .env) wins, else the package.json version.
  define: {
    __APP_VERSION__: JSON.stringify(process.env.VITE_APP_VERSION || pkg.version)
  },
  build: {
    // Route-level code-splitting (React.lazy) removed the monolith; keep a sane threshold and
    // split heavy libs into their own long-cacheable chunks. @sentry is reached ONLY via a
    // dynamic import (main.jsx), so it lands in its own on-demand chunk and never in the initial
    // load; react/react-dom and the icon set become separately cacheable vendor chunks.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('@sentry')) return 'sentry'
          if (id.includes('lucide-react')) return 'icons'
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'react-vendor'
          return 'vendor'
        }
      }
    }
  },
  server: {
    port: 7317,
    proxy: {
      // 127.0.0.1, not localhost: on some Windows/IPv6 setups `localhost`
      // resolves to ::1 first and the dev proxy stalls against the backend's
      // published IPv4 port.
      '/api': 'http://127.0.0.1:8317'
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    // Vitest owns the unit/integration tests under src/. The Playwright E2E specs live in e2e/ and
    // must NOT be collected here (Playwright's test.describe is incompatible with the vitest runner).
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    // Vitest's CSS processing isn't needed for these tests (jsdom doesn't apply
    // layout/paint anyway) and just slows the run down.
    css: false
  }
})
