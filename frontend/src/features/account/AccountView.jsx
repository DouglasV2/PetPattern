import { useState } from 'react'
import { ArrowLeft, Download, Trash2 } from 'lucide-react'
import { api } from '../../api'
import { t } from '../../i18n'
import { track } from '../../analytics'

function AccountView({ owner, pets = [], onDeletePet, onBack, onDeleted }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const ownedPets = pets.filter((pet) => pet.owned)

  async function deletePet(pet) {
    if (!window.confirm(t("Delete {name}? This permanently removes all of {name}'s logs and photos, and cannot be undone.", { name: pet.name }))) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await onDeletePet(pet.id)
      setMessage(t('{name} was deleted.', { name: pet.name }))
    } catch (err) {
      setError(err.message || t('Something went wrong. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  async function exportData() {
    setBusy(true)
    setError('')
    setMessage('')
    track('export_clicked')
    try {
      const data = await api.exportMyData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'petpattern-export.json'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setMessage(t('Your data has been downloaded.'))
    } catch (err) {
      setError(err.message || t('Something went wrong. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  async function deleteAccount() {
    if (!window.confirm(t('Delete your account and all your pet data permanently? This cannot be undone.'))) return
    if (!window.confirm(t('Last check — this permanently removes your account and every pet record you own.'))) return
    setBusy(true)
    setError('')
    try {
      await api.deleteAccount()
      track('account_deleted')
      onDeleted()
    } catch (err) {
      setError(err.message || t('Something went wrong. Try again.'))
      setBusy(false)
    }
  }

  return (
    <div className="onboard-shell">
      <main className="onboard-panel">
        <button className="back-button" type="button" onClick={onBack}>
          <ArrowLeft size={17} /> {t('Back')}
        </button>
        <p className="kicker">{t('Account')}</p>
        <h1>{t('Your account')}</h1>
        <p className="lead">{owner?.email}</p>

        {error && <div className="error-box" role="alert">{error}</div>}
        {message && <p className="muted">{message}</p>}

        <div className="account-section">
          <h2>{t('Your data')}</h2>
          <p className="muted">{t('Download everything PetPattern stores for you as a JSON file.')}</p>
          <button className="secondary-button" type="button" onClick={exportData} disabled={busy}>
            <Download size={16} /> {t('Export my data')}
          </button>
        </div>

        {ownedPets.length > 0 && (
          <div className="account-section">
            <h2>{t('Your pets')}</h2>
            <p className="muted">{t('Remove a pet and all of its logs. This cannot be undone.')}</p>
            <ul className="account-pet-list">
              {ownedPets.map((pet) => (
                <li key={pet.id}>
                  <span>{pet.name}</span>
                  <button className="chip-button subtle danger" type="button" onClick={() => deletePet(pet)} disabled={busy}>
                    <Trash2 size={15} /> {t('Delete')}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="account-section">
          <h2>{t('Legal')}</h2>
          <p className="legal-footer muted">
            <a href="/#privacy" target="_blank" rel="noopener noreferrer">{t('Privacy Policy')}</a>
            {' · '}
            <a href="/#terms" target="_blank" rel="noopener noreferrer">{t('Terms')}</a>
            {' · '}
            <a href="/#disclaimer" target="_blank" rel="noopener noreferrer">{t('Medical Disclaimer')}</a>
          </p>
        </div>

        <div className="account-section danger-zone">
          <h2>{t('Delete account')}</h2>
          <p className="muted">{t('Permanently deletes your account and all pet records you own. This cannot be undone.')}</p>
          <button className="ghost-button danger" type="button" onClick={deleteAccount} disabled={busy}>
            <Trash2 size={16} /> {t('Delete my account')}
          </button>
        </div>
      </main>
    </div>
  )
}

export { AccountView }
