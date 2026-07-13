import { Activity, Check, Stethoscope, Utensils } from 'lucide-react'
import { t } from '../../i18n'
import { NoteGlyph } from './NoteGlyph'

// The heart of Today: one calm question, three large choices. "Same as usual" is
// a single tap (and disables once today is logged); "Something changed" opens the
// guided chips; "Add note or photo" opens the one-sentence note. Food + vet stay
// secondary.
function TodayDecisionActions({ pet, loggedToday, onSameAsUsual, onSomethingChanged, onAddNoteOrPhoto, onFoodChange, onVetSummary }) {
  return (
    <section className="today-decision" aria-label={t('How is {name} today?', { name: pet.name })}>
      <div className="today-decision-head">
        <p>{t('Normal days are useful too. PetPattern learns what is normal for {name}.', { name: pet.name })}</p>
      </div>
      <div className="decision-grid">
        <button className="decision-card primary quiet" type="button" onClick={onSameAsUsual} disabled={loggedToday}>
          <span className="decision-icon"><Check size={22} /></span>
          <strong>{t('Same as usual')}</strong>
          <span>{loggedToday ? t('Today is logged') : t('Save a quiet day in one tap.')}</span>
        </button>
        <button className="decision-card changed" type="button" onClick={onSomethingChanged}>
          <span className="decision-icon"><Activity size={22} /></span>
          <strong>{t('Something changed')}</strong>
          <span>{t('Pick just what changed — not the whole form.')}</span>
        </button>
        <button className="decision-card note" type="button" onClick={onAddNoteOrPhoto}>
          <span className="decision-icon"><NoteGlyph size={22} /></span>
          <strong>{t('Add note or photo')}</strong>
          <span>{t('Write one sentence or add a photo.')}</span>
        </button>
      </div>
      <div className="decision-secondary">
        <button className="ghost-button" type="button" onClick={onFoodChange}>
          <Utensils size={18} /> {t('Add food change')}
        </button>
        <button className="ghost-button" type="button" onClick={onVetSummary}>
          <Stethoscope size={18} /> {t('Bring this to your vet')}
        </button>
      </div>
    </section>
  )
}

export { TodayDecisionActions }
