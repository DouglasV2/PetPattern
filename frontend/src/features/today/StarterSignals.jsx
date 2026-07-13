import { t } from '../../i18n'
import { parseObservations } from '../../lib/checkins'
import { isChangedValue } from '../../speciesProfiles'
import { Signal } from './Signal'

// Latest observed signals for a starter species, read from the flexible
// observations model. A changed value reads "watch"; a quiet day shows a prompt.
function StarterSignals({ latestCheckIn, pet }) {
  const obs = parseObservations(latestCheckIn?.observationsJson)
  const signals = Object.entries(obs).filter(([, v]) => v && (v.value || v.note)).slice(0, 6)
  if (!signals.length) {
    return <p className="muted">{t('Log a day and {name}\'s signals show up here.', { name: pet.name })}</p>
  }
  return (
    <>
      {signals.map(([key, v]) => (
        <Signal key={key} label={t(v.label || key)} value={t(v.value || 'Noticed')} tone={isChangedValue(v.value) ? 'watch' : 'calm'} />
      ))}
    </>
  )
}

export { StarterSignals }
