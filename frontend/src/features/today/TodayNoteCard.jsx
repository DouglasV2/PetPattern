import { t } from '../../i18n'
import { NoteGlyph } from './NoteGlyph'

// One calm, human note at the top of Today — a single sentence, never a list.
// It surfaces the most reassuring or useful thing there is to say right now, in
// priority order, and is written to sound like a note the owner might keep — not
// a diagnosis, a score, or anything analytical.
function TodayNoteCard({ pet, overview, topPattern, checkIns, loggedToday }) {
  let tone = 'calm'
  let title
  let body
  if (overview?.goodNews) {
    tone = 'good'; title = t('Nice little win'); body = overview.goodNews
  } else if (overview?.watchOut) {
    tone = 'watch'; title = t('Worth keeping an eye on'); body = overview.watchOut
  } else if (topPattern) {
    tone = 'watch'; title = t('Something changed'); body = topPattern.summary
  } else if (!checkIns.length) {
    title = t('Start with one easy note')
    body = t('A few quick logs help PetPattern learn what normal looks like for {name}.', { name: pet.name })
  } else if (!loggedToday) {
    title = t('A quick note keeps the picture clear')
    body = t('No need to write much — just save how {name} seems today.', { name: pet.name })
  } else {
    title = t('Everything looks pretty steady')
    body = t('Nothing unusual stands out from the latest note.')
  }
  return (
    <section className={`today-note tone-${tone}`} aria-label={title}>
      <span className="today-note-mark" aria-hidden="true"><NoteGlyph /></span>
      <div className="today-note-body">
        <p className="today-note-title">{title}</p>
        <p className="today-note-text">{body}</p>
      </div>
    </section>
  )
}

export { TodayNoteCard }
