import { Activity, ChevronRight, HeartPulse, Stethoscope, Users, Utensils } from 'lucide-react'
import { t } from '../../i18n'
import { formatDate, today } from '../../lib/date'
import { isCat } from '../../lib/species'
import { foodKindLabel, proteinLabel } from '../../lib/food'
import { litterLabel, levelLabel, hidingLabel, stoolLabel } from '../../lib/checkins'
import { statusLabel } from '../../lib/patterns'
import { isStarterSpecies, speciesProfile } from '../../speciesProfiles'
import { HeroSprig } from '../../components/HeroSprig'
import { ActivityQuickAdd } from './ActivityQuickAdd'
import { BackfillCard } from './BackfillCard'
import { RecentTimeline } from './RecentTimeline'
import { RetentionStrip } from './RetentionStrip'
import { SeenBeforeCard } from './SeenBeforeCard'
import { Signal } from './Signal'
import { StarterSignals } from './StarterSignals'
import { TodayDecisionActions } from './TodayDecisionActions'
import { TodayNoteCard } from './TodayNoteCard'
import { WeeklyInsightCard } from './WeeklyInsightCard'

function TodayView({ pet, overview, latestCheckIn, currentFood, topPattern, checkIns, onLogToday, onFoodChange, onFoodDetective, onPatterns, onShowTimeline, onVetSummary, onEditCheckIn, onDeleteCheckIn, onQuickLog, onCaregivers, onLogDay, onSomethingChanged, onAddNoteOrPhoto, activities, onAddActivity, onRemoveActivity }) {
  const loggedToday = overview?.retention?.loggedToday ?? checkIns.some((c) => c.checkInDate === today)
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

      <TodayDecisionActions
        pet={pet}
        loggedToday={loggedToday}
        onSameAsUsual={onQuickLog}
        onSomethingChanged={onSomethingChanged}
        onAddNoteOrPhoto={onAddNoteOrPhoto}
        onFoodChange={onFoodChange}
        onVetSummary={onVetSummary}
      />

      <TodayNoteCard pet={pet} overview={overview} topPattern={topPattern} checkIns={checkIns} loggedToday={loggedToday} />

      <SeenBeforeCard pet={pet} pattern={topPattern} onShowTimeline={onShowTimeline} />

      <BackfillCard pet={pet} checkIns={checkIns} loggedToday={loggedToday} onQuickLog={onQuickLog} onLogDay={onLogDay} />

      <ActivityQuickAdd
        todayActivities={(activities || []).filter((a) => a.occurredDate === today)}
        onAdd={onAddActivity}
        onRemove={onRemoveActivity}
      />

      <RetentionStrip pet={pet} retention={overview?.retention} checkInCount={checkIns.length} onLogToday={onLogToday} onQuickLog={onQuickLog} />

      <WeeklyInsightCard insight={overview?.weeklyInsight} />

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

      <RecentTimeline pet={pet} checkIns={checkIns} onEdit={onEditCheckIn} onDelete={onDeleteCheckIn} onLogDay={onLogDay} />

      <div className="care-circle-line no-print">
        <Users size={15} />
        <span>{t('Someone else helps look after {name}?', { name: pet.name })}</span>
        <button className="text-button" type="button" onClick={onCaregivers}>
          {t('Share the care')} <ChevronRight size={15} />
        </button>
      </div>
    </>
  )
}

export { TodayView }
