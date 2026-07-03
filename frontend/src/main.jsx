import React from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.jsx'
import './styles.css'

// Error tracking is optional and env-driven: with no VITE_SENTRY_DSN set (dev),
// Sentry is never initialised and nothing is sent. Enable it in prod by building
// with VITE_SENTRY_DSN. We deliberately keep pet/health data out of the payload.
const dsn = import.meta.env.VITE_SENTRY_DSN
if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'production',
    // No PII: don't attach IP, cookies, or user identity.
    sendDefaultPii: false,
    tracesSampleRate: 0,
    // Strip anything that could carry pet notes / symptoms / emails out of events
    // and breadcrumbs before they leave the browser.
    beforeSend(event) {
      if (event.request) {
        delete event.request.data
        delete event.request.cookies
        delete event.request.headers
      }
      if (event.user) {
        delete event.user.email
        delete event.user.username
        delete event.user.ip_address
      }
      return event
    },
    beforeBreadcrumb(crumb) {
      // Console logs can echo form state / notes — drop them. Fetch/xhr crumbs keep
      // only URL + status (no bodies), which carry no health content.
      if (crumb.category === 'console') return null
      return crumb
    }
  })
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
