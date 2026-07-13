import { useEffect, useState } from 'react'
import { api } from '../../api'
import { t } from '../../i18n'
import { BrandMark } from '../../components/BrandMark'
import { VetSheet } from './VetSheet'

function SharedVetView({ token }) {
  const [summary, setSummary] = useState(null)
  const [state, setState] = useState('loading')

  useEffect(() => {
    let alive = true
    api.sharedVetSummary(token)
      .then((data) => { if (alive) { setSummary(data); setState('ready') } })
      .catch(() => { if (alive) setState('error') })
    return () => { alive = false }
  }, [token])

  return (
    <div className="app-shell shared-shell">
      <header className="top-bar">
        <div className="brand-line">
          <span className="brand-mark"><BrandMark size={18} /></span>
          <strong>PetPattern</strong>
        </div>
      </header>
      <main className="screen">
        {state === 'loading' && <div className="loading-panel">{t('Just a moment…')}</div>}
        {state === 'error' && (
          <section className="flow-panel">
            <h1>{t('This link is no longer active')}</h1>
            <p className="muted">{t('Ask the owner for a fresh link.')}</p>
          </section>
        )}
        {state === 'ready' && summary && (
          <section className="flow-panel vet-summary">
            <p className="kicker">{t('Shared by the owner')}</p>
            <h1>{t('Vet visit summary')}</h1>
            <p className="lead">{t('A calm record of what the owner logged. Built to help a vet conversation, not to diagnose.')}</p>
            <VetSheet summary={summary} />
          </section>
        )}
      </main>
    </div>
  )
}

export { SharedVetView }
