import { useEffect, useState } from 'react'
import { Cat, Dog } from 'lucide-react'
import { api } from '../../api'
import { t } from '../../i18n'
import { BrandMark } from '../../components/BrandMark'
import { LangToggle } from '../../components/LangToggle'
import { GoogleG } from '../../components/GoogleG'

function AuthScreen({ lang, onLangChange, onLogin, onRegister, onDemo, onCatDemo, onRabbitDemo, demoEnabled = true, googleEnabled = false }) {
  // Google sign-in is a web-redirect flow (relative /api/auth/google/start) that cannot return a
  // session into a native WebView, so it is HIDDEN on Android/iOS for this beta — native users keep
  // email/password + password reset. Full native OAuth is post-beta (see docs/google-login.md).
  const isNative = Boolean(globalThis.Capacitor?.isNativePlatform?.())
  const showGoogle = googleEnabled && !isNative
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // A failed Google round-trip redirects back with #auth-error=google… — show a
  // neutral message and strip the marker from the URL.
  useEffect(() => {
    if (typeof window !== 'undefined' && /auth-error=google/.test(window.location.hash)) {
      setError(t('Could not sign in with Google. Please try again.'))
      history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [])

  function setModeAndClear(next) {
    setMode(next)
    setError('')
    setNotice('')
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (mode === 'register' && !accepted) {
      setError(t('Please accept the terms and privacy policy to continue.'))
      return
    }
    setBusy(true)
    try {
      if (mode === 'login') {
        await onLogin(email.trim(), password)
      } else if (mode === 'register') {
        await onRegister(email.trim(), password, displayName.trim(), accepted)
      } else {
        // Forgot password. The response is always neutral (it never reveals whether
        // an account exists), so we just show the same confirmation message.
        await api.forgotPassword(email.trim())
        setNotice(t("If an account exists for that email, we've sent reset instructions. Check your inbox."))
        setBusy(false)
      }
    } catch (err) {
      setError(err.message || t('Something went wrong. Try again.'))
      setBusy(false)
    }
  }

  async function demo() {
    setError('')
    setBusy(true)
    try {
      await onDemo()
    } catch (err) {
      setError(t('Demo could not load. Try again in a moment.'))
      setBusy(false)
    }
  }

  async function catDemo() {
    if (!onCatDemo) return
    setError('')
    setBusy(true)
    try {
      await onCatDemo()
    } catch (err) {
      setError(t('Demo could not load. Try again in a moment.'))
      setBusy(false)
    }
  }

  async function rabbitDemo() {
    if (!onRabbitDemo) return
    setError('')
    setBusy(true)
    try {
      await onRabbitDemo()
    } catch (err) {
      setError(t('Demo could not load. Try again in a moment.'))
      setBusy(false)
    }
  }

  return (
    <div className="start-shell">
      <main className="start-panel">
        <div className="brand-line">
          <span className="brand-mark"><BrandMark size={20} /></span>
          <strong>PetPattern</strong>
          <LangToggle lang={lang} onChange={onLangChange} />
        </div>
        <h1 className="auth-hero">{t('PetPattern remembers what changed.')}</h1>
        <p className="lead">{mode === 'forgot' ? t("Enter your email and we'll send a link to set a new password.") : t('Log only what you noticed. A quick check-in is enough.')}</p>
        {mode !== 'forgot' && (
          <p className="start-sub muted">{t('Food, stool, itching, vomiting, litter box, appetite, energy — small notes become useful over time.')}</p>
        )}

        {showGoogle && mode !== 'forgot' && (
          <>
            <button className="google-button" type="button" onClick={() => { window.location.href = '/api/auth/google/start' }}>
              <GoogleG size={18} /> {t('Continue with Google')}
            </button>
            <div className="auth-divider">{t('or')}</div>
          </>
        )}

        <p className="form-title">{mode === 'login' ? t('Welcome back') : mode === 'register' ? t('Create your account') : t('Reset your password')}</p>
        <form onSubmit={submit} className="stack-form">
          {mode === 'register' && (
            <input placeholder={t('Your name, optional')} aria-label={t('Your name, optional')} value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" />
          )}
          <input type="email" required placeholder={t('Email')} aria-label={t('Email')} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          {mode !== 'forgot' && (
            <input type="password" required minLength={8} placeholder={t('Password (min 8 characters)')} aria-label={t('Password (min 8 characters)')} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          )}
          {mode === 'register' && (
            <label className="accept-terms">
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
              <span>{t('I accept the Terms, Privacy Policy and Medical Disclaimer, and I understand PetPattern shows possible patterns based on owner-reported logs — not a diagnosis, and not a substitute for a vet.')}</span>
            </label>
          )}
          <button className="primary-button wide" type="submit" disabled={busy || (mode === 'register' && !accepted)}>
            {mode === 'login' ? t('Sign in') : mode === 'register' ? t('Create account') : t('Send reset link')}
          </button>
        </form>

        {notice && <p className="muted auth-notice">{notice}</p>}
        {error && <div className="error-box" role="alert">{error}</div>}

        {mode === 'login' && (
          <button className="text-button" type="button" onClick={() => setModeAndClear('forgot')}>
            {t('Forgot your password?')}
          </button>
        )}
        <button className="text-button" type="button" onClick={() => setModeAndClear(mode === 'register' ? 'login' : mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? t('New here? Create an account') : mode === 'register' ? t('Already have an account? Sign in') : t('Back to sign in')}
        </button>

        {demoEnabled && (
          <div className="auth-demo">
            <p className="muted">{t('Just exploring?')}</p>
            <div className="demo-buttons">
              <button className="secondary-button" type="button" onClick={demo} disabled={busy}>
                <Dog size={18} /> {t('Try dog demo')}
              </button>
              {onCatDemo && (
                <button className="secondary-button" type="button" onClick={catDemo} disabled={busy}>
                  <Cat size={18} /> {t('Try cat demo')}
                </button>
              )}
              {onRabbitDemo && (
                <button className="secondary-button" type="button" onClick={rabbitDemo} disabled={busy}>
                  <span className="btn-emoji" aria-hidden="true">🐰</span> {t('Try rabbit demo')}
                </button>
              )}
            </div>
          </div>
        )}

        {mode !== 'forgot' && (
          <p className="start-disclaimer muted">{t("Not a diagnosis. Not a vet chatbot. Just a clearer memory for your pet's health.")}</p>
        )}

        <p className="legal-footer muted">
          <a href="/#privacy" target="_blank" rel="noopener noreferrer">{t('Privacy Policy')}</a>
          {' · '}
          <a href="/#terms" target="_blank" rel="noopener noreferrer">{t('Terms')}</a>
          {' · '}
          <a href="/#disclaimer" target="_blank" rel="noopener noreferrer">{t('Medical Disclaimer')}</a>
        </p>
      </main>
    </div>
  )
}

export { AuthScreen }
