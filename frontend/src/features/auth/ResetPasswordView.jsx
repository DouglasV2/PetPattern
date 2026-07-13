import { useEffect, useState } from 'react'
import { api } from '../../api'
import { t } from '../../i18n'
import { BrandMark } from '../../components/BrandMark'
import { LangToggle } from '../../components/LangToggle'

function ResetPasswordView({ token, lang, onLangChange, onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // Strip the token from the URL + browser history on mount, so it can't be
  // recovered from the address bar or history on a shared device. The token is
  // already held in the `token` prop, so the flow still works.
  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [])

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (password.length < 8) {
      setError(t('Password must be at least 8 characters.'))
      return
    }
    if (password !== confirm) {
      setError(t('The two passwords do not match.'))
      return
    }
    setBusy(true)
    try {
      await api.resetPassword(token, password)
      setDone(true)
    } catch (err) {
      setError(err.message || t('Something went wrong. Try again.'))
    } finally {
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
        {done ? (
          <>
            <h1>{t('Password updated')}</h1>
            <p className="lead">{t('You can sign in with your new password now.')}</p>
            <button className="primary-button wide" type="button" onClick={onDone}>
              {t('Go to sign in')}
            </button>
          </>
        ) : (
          <>
            <p className="kicker">{t('Reset password')}</p>
            <h1>{t('Choose a new password')}</h1>
            <p className="lead">{t('Set a new password for your account.')}</p>
            <form onSubmit={submit} className="stack-form">
              <input type="password" required minLength={8} placeholder={t('New password (min 8 characters)')}
                value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
              <input type="password" required minLength={8} placeholder={t('Repeat new password')}
                value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
              <button className="primary-button wide" type="submit" disabled={busy}>
                {t('Update password')}
              </button>
            </form>
            {error && <div className="error-box" role="alert">{error}</div>}
            <button className="text-button" type="button" onClick={onDone}>
              {t('Back to sign in')}
            </button>
          </>
        )}
      </main>
    </div>
  )
}

export { ResetPasswordView }
