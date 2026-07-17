import { Activity, ChevronRight, HeartPulse, Stethoscope, Users, Utensils } from 'lucide-react'
import { t } from '../../i18n'
import { addDays, formatDate, today } from '../../lib/date'
import { isCat } from '../../lib/species'
import { foodKindLabel, proteinLabel } from '../../lib/food'
import { litterLabel, levelLabel, hidingLabel, stoolLabel } from '../../lib/checkins'
import { statusLabel } from '../../lib/patterns'
import { isStarterSpecies, speciesProfile } from '../../speciesProfiles'
import { HeroSprig } from '../../components/HeroSprig'
import { ActivityQuickAdd } from './ActivityQuickAdd'
import { ImmediateObservationCard } from './ImmediateObservationCard'
import { BackfillCard } from './BackfillCard'
import { PatternMemoryProgress } from './PatternMemoryProgress'
import { RecentTimeline } from './RecentTimeline'
import { RetentionStrip } from './RetentionStrip'
import { SeenBeforeCard, seenBeforeQualifies } from './SeenBeforeCard'
import { Signal } from './Signal'
import { StarterSignals } from './StarterSignals'
import { TodayDecisionActions } from './TodayDecisionActions'
import { TodayNoteCard } from './TodayNoteCard'
import { WeeklyInsightCard } from './WeeklyInsightCard'

function TodayView({ pet, overview, latestCheckIn, currentFood, topPattern, checkIns, onLogToday, onFoodChange, onFoodDetective, onPatterns, onShowTimeline, onVetSummary, onEditCheckIn, onDeleteCheckIn, onQuickLog, onCaregivers, onLogDay, onSomethingChanged, onAddNoteOrPhoto, activities, onAddActivity, onRemoveActivity }) {
  const loggedToday = overview?.retention?.loggedToday ?? checkIns.some((c) => c.checkInDate === today)

  // How many of the pet's check-ins land in the last 7 calendar days
  // (today included) — feeds the quiet "logged today" confirmation below.
  const weekCount = checkIns.filter((c) => c.checkInDate >= addDays(today, -6)).length

  // Exactly ONE primary insight, chosen in priority order: the weekly rollup
  // first, then a real recurring pattern (same guard SeenBeforeCard uses
  // internally, shared via seenBeforeQualifies so the two can't drift apart),
  // then the calm note — which already covers good-news / watch-out / empty
  // / steady-day fallbacks. Nothing is lost: the pattern data these skip
  // still lives in the "Possible pattern" panel below and the Patterns tab.
  const showWeeklyInsight = Boolean(overview?.weeklyInsight)
  const showSeenBefore = !showWeeklyInsight && seenBeforeQualifies(topPattern)

  return (
    <>
      <section className="today-spine">
        <div className="today-copy">
          <div className="today-copy-text">
            <p className="kicker">{formatDate(today)}</p>
            <h1>{t('How is {name} today?', { name: pet.name })}</h1>
            <p>{overview?.todayExplanation ?? t('{name} is ready for a first check-in.', { name: pet.name })}</p>
          </div>
          <HeroSprig />
        </div>

        {/* A never-logged pet gets a calm "getting started" panel, not the coral
            "changed" alert — there is nothing to have changed on day zero. */}
        <div className={`state-panel ${latestCheckIn ? (overview?.todayStatus ?? 'changed') : 'normal'}`}>
          <span>{latestCheckIn ? statusLabel(overview?.todayStatus, pet.name) : t('Getting started')}</span>
          <strong>{overview?.nextAction ?? t('Log today')}</strong>
        </div>
      </section>

      {/* Immediate safety layer: urgent, non-diagnostic observations from the latest entry,
          surfaced above the daily actions so a "call your vet" combination is seen first. */}
      <ImmediateObservationCard observations={overview?.immediateObservations} />

      <TodayDecisionActions
        pet={pet}
        loggedToday={loggedToday}
        onSameAsUsual={onQuickLog}
        onSomethingChanged={onSomethingChanged}
        onAddNoteOrPhoto={onAddNoteOrPhoto}
        onFoodChange={onFoodChange}
        onVetSummary={onVetSummary}
      />

      {/* The payoff: a one-line confirmation once today is logged, then the
          pattern-memory progress strip. */}
      {loggedToday && (
        <p className="today-confirmation">
          {weekCount > 1
            ? t("Saved — that's {name}'s {n} check-ins this week.", { name: pet.name, n: weekCount })
            : t("Saved — that's {name}'s first check-in this week.", { name: pet.name })}
        </p>
      )}

      <PatternMemoryProgress pet={pet} progress={overview?.patternMemory} />

      <RetentionStrip pet={pet} retention={overview?.retention} onLogToday={onLogToday} onQuickLog={onQuickLog} />

      {showWeeklyInsight ? (
        <WeeklyInsightCard insight={overview.weeklyInsight} />
      ) : showSeenBefore ? (
        <SeenBeforeCard pet={pet} pattern={topPattern} onShowTimeline={onShowTimeline} />
      ) : (
        <TodayNoteCard pet={pet} overview={overview} topPattern={topPattern} checkIns={checkIns} loggedToday={loggedToday} />
      )}

      <BackfillCard pet={pet} checkIns={checkIns} loggedToday={loggedToday} onQuickLog={onQuickLog} onLogDay={onLogDay} />

      {/* Everything below is still fully present and functional — just tucked
          behind a native, keyboard-operable disclosure so Today opens on the
          decision and one insight instead of eleven stacked sections. */}
      <details className="today-more">
        <summary>{t('More about {name} today', { name: pet.name })}</summary>
        <div className="today-more-body">
          <section className="home-grid">
            <article className="panel">
              <div className="panel-heading">
                <HeartPulse size={18} />
                <h2>{t('Recent signals')}</h2>
              </div>
              <div className="signal-list">
                {!latestCheckIn ? (
                  <p className="muted">{t("Log a day and {name}'s signals show up here.", { name: pet.name })}</p>
                ) : isCat(pet) ? (
                  <>
                    <Signal label={t('Litter box')} value={litterLabel(latestCheckIn?.litterBoxUse)} tone={['LESS', 'MORE', 'NONE'].includes(latestCheckIn?.litterBoxUse) ? 'watch' : 'calm'} />
                    <Signal label={t('Appetite')} value={levelLabel(latestCheckIn?.appetiteLevel)} tone={latestCheckIn?.appetiteLevel === 'LOWER' || latestCheckIn?.appetiteLevel === 'REFUSED' ? 'watch' : 'calm'} />
                    <Signal label={t('Water')} value={levelLabel(latestCheckIn?.waterLevel)} tone={latestCheckIn?.waterLevel === 'LOWER' || latestCheckIn?.waterLevel === 'HIGHER' ? 'watch' : 'calm'} />
                    <Signal label={t('Hiding')} value={hidingLabel(latestCheckIn?.hidingBehavior)} tone={latestCheckIn?.hidingBehavior === 'MORE' ? 'watch' : 'calm'} />
                    <Signal label={t('Energy')} value={levelLabel(latestCheckIn?.energyLevel)} tone={latestCheckIn?.energyLevel === 'LOW' || latestCheckIn?.energyLevel === 'RESTLESS' ? 'watch' : 'calm'} />
                  </>
                ) : isStarterSpecies(pet.species) ? (
                  <StarterSignals latestCheckIn={latestCheckIn} pet={pet} />
                ) : (
                  <>
                    <Signal label={t('Scratching')} value={latestCheckIn?.itchingScore != null ? `${latestCheckIn.itchingScore}/10` : t('Not logged')} tone={latestCheckIn?.itchingScore >= 6 ? 'watch' : 'calm'} />
                    <Signal label={t('Stool')} value={stoolLabel(latestCheckIn)} tone={latestCheckIn?.stoolState === 'SOFT' || latestCheckIn?.stoolState === 'DIARRHEA' ? 'watch' : 'calm'} />
                    <Signal label={t('Water')} value={levelLabel(latestCheckIn?.waterLevel)} tone={latestCheckIn?.waterLevel === 'LOWER' ? 'watch' : 'calm'} />
                    <Signal label={t('Appetite')} value={levelLabel(latestCheckIn?.appetiteLevel)} tone={latestCheckIn?.appetiteLevel === 'LOWER' || latestCheckIn?.appetiteLevel === 'REFUSED' ? 'watch' : 'calm'} />
                    <Signal label={t('Energy')} value={levelLabel(latestCheckIn?.energyLevel)} tone={latestCheckIn?.energyLevel === 'LOW' || latestCheckIn?.energyLevel === 'RESTLESS' ? 'watch' : 'calm'} />
                  </>
                )}
              </div>
            </article>

            <article className="panel">
              <div className="panel-heading">
                <Utensils size={18} />
                <h2>{t('Current food')}</h2>
              </div>
              {currentFood ? (
                <div className="food-summary">
                  <strong>{[currentFood.brand, currentFood.productName].filter(Boolean).join(' - ')}</strong>
                  <span>{foodKindLabel(currentFood.foodKind)} · {formatDate(currentFood.dateStarted)}</span>
                  <div className="chip-row">
                    <span className="chip">{proteinLabel(currentFood.primaryProtein)}</span>
                    {currentFood.newFood && <span className="chip alert">{t('New food')}</span>}
                    {currentFood.grainFree && <span className="chip">{t('Grain-free')}</span>}
                  </div>
                </div>
              ) : (
                <p className="muted">{t('Add the first food change and we can line it up against how things have been going.')}</p>
              )}
              <p className="muted food-note">{t('Food changes often matter more than they seem. PetPattern lines them up with stool, scratching, appetite, vomiting and energy changes.')}</p>
              {onFoodDetective && (
                <button className="text-button" type="button" onClick={onFoodDetective}>
                  {speciesProfile(pet.species).detectiveMode === 'ENVIRONMENT' ? t('Open environment detective') : t('Open food detective')} <ChevronRight size={16} />
                </button>
              )}
            </article>

            <article className="panel pattern-teaser">
              <div className="panel-heading">
                <Activity size={18} />
                <h2>{t('Possible pattern')}</h2>
              </div>
              {topPattern ? (
                <>
                  <strong>{topPattern.title}</strong>
                  <p>{topPattern.summary}</p>
                  <button className="text-button" type="button" onClick={() => onShowTimeline(topPattern)}>
                    {t('Show what changed')} <ChevronRight size={16} />
                  </button>
                </>
              ) : (
                <>
                  <strong>{t('Still learning normal for {name}', { name: pet.name })}</strong>
                  <p>{isCat(pet)
                    ? t('After a few logs, this is where PetPattern shows what changed before a possible pattern — litter box, urination, hiding, vomiting, appetite or energy.')
                    : t('After a few logs, this is where PetPattern shows what changed before a possible pattern — food, treats, vomiting, scratching, stool or energy.')}</p>
                </>
              )}
            </article>
          </section>

          <ActivityQuickAdd
            todayActivities={(activities || []).filter((a) => a.occurredDate === today)}
            onAdd={onAddActivity}
            onRemove={onRemoveActivity}
          />

          <RecentTimeline pet={pet} checkIns={checkIns} onEdit={onEditCheckIn} onDelete={onDeleteCheckIn} onLogDay={onLogDay} />

          <div className="care-circle-line no-print">
            <Users size={15} />
            <span>{t('Someone else helps look after {name}?', { name: pet.name })}</span>
            <button className="text-button" type="button" onClick={onCaregivers}>
              {t('Share the care')} <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </details>
    </>
  )
}

export { TodayView }
