import { t } from '../i18n'

/**
 * Privacy / Terms / Medical disclaimer footer.
 *
 * These are in-app hash routes (App.jsx renders LegalView for #privacy | #terms | #disclaimer,
 * before the auth gate, so they are reachable signed-out). On the web we open them in a new tab so
 * the person does not lose an in-progress sign-up.
 *
 * On native we deliberately DROP target="_blank". The Capacitor WebView origin is https://localhost,
 * so these resolve same-origin and stay in the app — but "_blank" handling in Android System WebView
 * has varied by version (it needs multiple-window support, which Capacitor does not enable), and a
 * legal link that silently does nothing, or escapes to a browser showing https://localhost, is a
 * Play review problem. Same-tab navigation is deterministic, and the LegalView back control returns.
 */
function LegalLinks({ className = 'legal-footer muted' }) {
  const isNative = Boolean(globalThis.Capacitor?.isNativePlatform?.())
  const linkProps = isNative ? {} : { target: '_blank', rel: 'noopener noreferrer' }

  return (
    <p className={className}>
      <a href="/#privacy" {...linkProps}>{t('Privacy Policy')}</a>
      {' · '}
      <a href="/#terms" {...linkProps}>{t('Terms')}</a>
      {' · '}
      <a href="/#disclaimer" {...linkProps}>{t('Medical Disclaimer')}</a>
    </p>
  )
}

export { LegalLinks }
