import { t } from '../../i18n'

// Honest first-week "pattern memory progress" — mirrors the backend's real
// engine gates (see PatternMemoryProgress.java). Every line here describes
// something the engine actually does at that stage; nothing is a promise
// about a capability that hasn't been reached yet.
const STAGE_COPY = {
  baseline_start: {
    headline: "Start {name}'s baseline",
    body: 'Nothing is logged yet. Your first check-in — even a calm "same as usual" — becomes day one of {name}\'s baseline.',
    next: "One check-in starts {name}'s baseline."
  },
  baseline_building: {
    headline: "Today is saved as part of {name}'s baseline",
    body: "PetPattern is learning what an ordinary day looks like for {name}. It waits until there are seven days on record before it compares anything — {logsToNextStage} more to go. No repeated change is visible yet, and that's expected this early.",
    next: '{logsToNextStage} more check-ins and PetPattern has enough for a first weekly overview.'
  },
  first_overview: {
    headline: 'PetPattern now has enough entries for a first weekly overview',
    body: "Seven days are on record, so PetPattern can put together {name}'s first weekly overview and start noticing when a recent day differs from the usual ones. It still won't call a single odd day a pattern.",
    next: "About two more weeks of logged days lets PetPattern compare {name}'s recent days against a month-long baseline."
  },
  trend_baseline: {
    headline: "Building up what's usual for {name}",
    body: "That's most of what the trend comparison needs for a dog — it looks at how {name}'s recent days compare with their usual range over about a month. A few more logged days and it has enough.",
    next: 'Logging food changes too builds a fuller record — so a rough stretch and what changed before it can be lined up for your vet to review.'
  },
  food_trigger_ready: {
    headline: "Enough history to line food changes up with the days after",
    body: "Three weeks of check-ins and at least two food changes are on record. PetPattern can now line up how {name} did after the same protein more than once, and show you and your vet what repeated and what didn't — it never calls this a cause.",
    next: ''
  }
}

function PatternMemoryProgress({ pet, progress }) {
  if (!progress) return null
  const { usefulLogs, patternsActive, weeklyOverviewReady, stage, nextStageAt, logsToNextStage } = progress
  const copy = STAGE_COPY[stage]
  if (!copy) return null

  const vars = { name: pet.name, logsToNextStage }
  const filled = Math.min(usefulLogs, nextStageAt)
  const showFacts = patternsActive > 0 || weeklyOverviewReady

  return (
    <section className="panel pattern-memory-progress">
      <h2>{t(copy.headline, vars)}</h2>
      <p>{t(copy.body, vars)}</p>

      <div className="baseline-track">
        {nextStageAt > 0 ? (
          <>
            <span className="baseline-dots" aria-hidden="true">
              {Array.from({ length: nextStageAt }, (_, i) => (
                <span key={i} className={i < filled ? 'baseline-dot on' : 'baseline-dot'} />
              ))}
            </span>
            <span className="baseline-count muted">
              {t('{done} of {total} days logged', { done: filled, total: nextStageAt })}
            </span>
          </>
        ) : (
          <span className="baseline-count muted">{t('{n} days logged', { n: usefulLogs })}</span>
        )}
      </div>

      {showFacts && (
        <div className="chip-row">
          {patternsActive > 0 && (
            <span className="chip">
              {patternsActive === 1
                ? t('{n} possible pattern noticed', { n: patternsActive })
                : t('{n} possible patterns noticed', { n: patternsActive })}
            </span>
          )}
          {weeklyOverviewReady && <span className="chip alert">{t('First weekly overview ready')}</span>}
        </div>
      )}

      {nextStageAt > 0 && <p className="muted pattern-memory-next">{t(copy.next, vars)}</p>}

      <p className="muted pattern-memory-caption">
        {t('Days that are the same as usual are just as useful — they are what "different" gets measured against.')}
      </p>
    </section>
  )
}

export { PatternMemoryProgress }
