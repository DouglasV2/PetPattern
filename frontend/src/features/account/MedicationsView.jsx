import { useState } from 'react'
import { ArrowLeft, Pill, Trash2 } from 'lucide-react'
import { t } from '../../i18n'
import { formatDate, today } from '../../lib/date'

function MedicationsView({ pet, medications, onBack, onCreate, onAction }) {
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const ongoing = medications.filter((med) => med.ongoing)
  const past = medications.filter((med) => !med.ongoing)

  async function submit(event) {
    event.preventDefault()
    if (!name.trim()) return
    setError('')
    setBusy(true)
    try {
      await onCreate({ name: name.trim(), startDate, endDate: endDate || null, notes: notes.trim() || null })
      setName('')
      setEndDate('')
      setNotes('')
      setStartDate(today)
    } catch (err) {
      setError(err.message || t('Could not add the medication. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  function card(med) {
    return (
      <article className="panel med-card" key={med.id}>
        <div className="pattern-top">
          <span className={`status-chip ${med.ongoing ? 'vet' : 'calm'}`}>{med.ongoing ? t('Ongoing') : t('Finished')}</span>
        </div>
        <h2>{med.name}</h2>
        <p className="memory-line">{formatDate(med.startDate)}{med.ongoing ? ` · ${t('ongoing')}` : ` – ${formatDate(med.endDate)}`}</p>
        {med.notes && <p className="muted">{med.notes}</p>}
        <div className="pattern-actions">
          {med.ongoing && (
            <button className="chip-button" type="button" onClick={() => onAction(med, 'stop')}>{t('Mark as finished')}</button>
          )}
          <button className="icon-button danger" type="button" aria-label={t('Delete medication')} onClick={() => onAction(med, 'delete')}>
            <Trash2 size={15} />
          </button>
        </div>
      </article>
    )
  }

  return (
    <section className="flow-panel">
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> {t('Back')}</button>
      <p className="kicker">{t('Medications')}</p>
      <h1>{t("{name}'s medications", { name: pet.name })}</h1>
      <p className="lead">{t('A simple record of medicines and care notes — handy to show your vet, and to line up against how {name} has been.', { name: pet.name })}</p>

      <form className="quick-form" onSubmit={submit}>
        <label className="field-label">
          {t('Name')}
          <input value={name} maxLength={160} placeholder={t('e.g. Otiderm ear drops')} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="two-fields">
          <label className="field-label">
            {t('Start date')}
            <input type="date" value={startDate} max={today} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label className="field-label">
            {t('End date (optional)')}
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
        </div>
        <label className="field-label">
          {t('Notes')}
          <textarea value={notes} maxLength={500} placeholder={t('Dose, reason, who prescribed it…')} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <button className="primary-button wide" type="submit" disabled={busy}><Pill size={18} /> {t('Add medication')}</button>
        {error && <p className="ai-error">{error}</p>}
      </form>

      {medications.length === 0 ? (
        <article className="panel">
          <h2>{t('No medications yet')}</h2>
          <p className="muted">{t('Add a medicine or care note above when {name} starts one.', { name: pet.name })}</p>
        </article>
      ) : (
        <>
          {ongoing.length > 0 && (<><p className="form-section-label">{t('Ongoing')}</p>{ongoing.map(card)}</>)}
          {past.length > 0 && (<><p className="kicker section-divider">{t('Finished')}</p>{past.map(card)}</>)}
        </>
      )}
    </section>
  )
}

export { MedicationsView }
