import { AlertTriangle } from 'lucide-react'
import { t } from '../../i18n'

/**
 * The immediate safety layer (Layer A) on Today: urgent, non-diagnostic observations from the
 * pet's latest check-in, surfaced above everything else so a genuine "call your vet" combination
 * is the first thing the owner sees — without waiting for the seven-log historical layer.
 *
 * The backend copy already carries PetPattern's limitation ("not a diagnosis…") and the
 * vet-handoff, so this component only presents it. It is wrapped in a polite live region so a
 * screen-reader hears it appear, and reuses the shared coral `urgent-banner` treatment.
 */
function ImmediateObservationCard({ observations }) {
  if (!observations || observations.length === 0) {
    return null
  }
  return (
    <section
      className="immediate-observations"
      role="status"
      aria-live="polite"
      aria-label={t('Worth acting on now')}
    >
      {observations.map((observation) => (
        <div className="urgent-banner sev-urgent" key={observation.id}>
          <AlertTriangle size={18} className="urgent-banner-icon" aria-hidden="true" />
          <div>
            <strong>{observation.title}</strong>
            <p>{observation.summary}</p>
            {observation.urgentNote && <p className="immediate-vet-note">{observation.urgentNote}</p>}
          </div>
        </div>
      ))}
    </section>
  )
}

export { ImmediateObservationCard }
