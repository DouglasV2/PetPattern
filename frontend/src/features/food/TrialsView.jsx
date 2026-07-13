import { useState } from 'react'
import { ArrowLeft, FlaskConical } from 'lucide-react'
import { t } from '../../i18n'
import { today } from '../../lib/date'
import { proteinLabel, proteinOptions } from '../../lib/food'
import { QuickChoices } from '../../components/QuickChoices'
import { DateField } from '../../components/DateField'
import { TrialCard } from './TrialCard'

function TrialsView({ pet, trials, onBack, onCreate, onAction, onDelete }) {
  const [protein, setProtein] = useState('CHICKEN')
  const [weeks, setWeeks] = useState(3)
  const [startDate, setStartDate] = useState(today)
  const [notes, setNotes] = useState('')
  const [showForm, setShowForm] = useState(false)

  const active = trials.filter((trial) => trial.status === 'ACTIVE' || trial.status === 'REINTRODUCED')
  const past = trials.filter((trial) => trial.status === 'COMPLETED' || trial.status === 'ABANDONED')

  function submit(event) {
    event.preventDefault()
    onCreate({ protein, weeks, startDate, notes: notes.trim() || null })
    setNotes('')
    setShowForm(false)
  }

  const formOpen = trials.length === 0 || showForm

  return (
    <section className="flow-panel">
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> {t('Back')}</button>
      <p className="kicker">{t('Food & treats')}</p>
      <h1>{t('Careful food tracking')}</h1>
      <p className="lead">{t("If you're already changing {name}'s food with your vet, you can note when the change started and keep watching how they do.", { name: pet.name })}</p>
      <p className="reassure">{t('Do not change your pet’s diet because of the app. This record only helps track changes you are already making or discussing with your vet.')}</p>

      {formOpen ? (
        <form className="quick-form" onSubmit={submit}>
          <QuickChoices
            label={t('Which ingredient are you leaving out?')}
            value={protein}
            options={proteinOptions.map((value) => ({ value, label: proteinLabel(value) }))}
            onChange={setProtein}
          />
          <QuickChoices
            label={t('For how long')}
            value={weeks}
            options={[2, 3, 4, 6].map((value) => ({ value, label: t('{n} weeks', { n: value }) }))}
            onChange={setWeeks}
          />
          <div className="field-label">
            {t('Start date')}
            <DateField value={startDate} label={t('Start date')} onChange={setStartDate} />
          </div>
          <label className="field-label">
            {t('Notes')}
            <textarea value={notes} maxLength={500} placeholder={t('What changed, and anything your vet said…')} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <button className="primary-button wide" type="submit"><FlaskConical size={18} /> {t('Start tracking')}</button>
        </form>
      ) : (
        <div className="action-row">
          <button className="secondary-button" type="button" onClick={() => setShowForm(true)}>
            <FlaskConical size={18} /> {t('Track a food change')}
          </button>
        </div>
      )}

      {active.map((trial) => (
        <TrialCard key={trial.id} trial={trial} onAction={onAction} onDelete={onDelete} />
      ))}

      {past.length > 0 && (
        <>
          <p className="kicker section-divider">{t('Past trials')}</p>
          {past.map((trial) => (
            <TrialCard key={trial.id} trial={trial} onAction={onAction} onDelete={onDelete} />
          ))}
        </>
      )}
    </section>
  )
}

export { TrialsView }
