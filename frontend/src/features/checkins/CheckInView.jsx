import { useEffect, useState } from 'react'
import { ArrowLeft, Check, ImagePlus, Pencil, Pill } from 'lucide-react'
import { api } from '../../api'
import { t } from '../../i18n'
import { isCat } from '../../lib/species'
import { CHANGED_CATEGORIES } from '../../lib/checkins'
import { isStarterSpecies, speciesProfile, visibleChangeConfig } from '../../speciesProfiles'
import { QuickChoices } from '../../components/QuickChoices'
import { DateField } from '../../components/DateField'
import { ToggleButton } from '../../components/ToggleButton'
import { GuidedFieldsForCategory } from './GuidedFieldsForCategory'
import { StarterGuidedFields } from './StarterGuidedFields'
import { SuggestionPreview } from './SuggestionPreview'
import { VisibleChangeField } from './VisibleChangeField'

function CheckInView({ pet, form, setForm, saving, aiSuggestEnabled, startMode, onBack, onSave, onQuickLog, onAddFood, onAddPhoto, onAddHealthPhoto, onAddMedication }) {
  const [note, setNote] = useState(form.freeTextNote || '')
  const [suggestion, setSuggestion] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [applied, setApplied] = useState(false)
  // 'full' = the existing full form, 'changed' = guided chips, 'note' = one
  // sentence first. Seeded by the caller (the Today decision cards) and switchable
  // in-panel ("Show full form" / "Describe instead").
  const [mode, setMode] = useState(startMode || 'full')
  const [changedCats, setChangedCats] = useState([])

  // Re-sync when the caller opens the check-in in a new mode while the view is
  // already mounted (e.g. tapping a different Today action, or the nav "Log" tab).
  useEffect(() => { setMode(startMode || 'full') }, [startMode])

  function toggleChangedCat(key) {
    setChangedCats((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  function updateNote(value) {
    setNote(value)
    setForm({ ...form, freeTextNote: value })
    setApplied(false)
  }

  async function suggestFields() {
    if (!note.trim()) return
    setAiLoading(true)
    setAiError('')
    setApplied(false)
    try {
      const result = await api.parseDailyNote({ petId: pet.id, note })
      // The Scratching control only offers 0/2/4/6/8/10, so snap an odd score
      // (a hosted model can return any 0–10) to the nearest chip before it ever
      // reaches the preview or the form.
      if (result && result.itchingScore != null) {
        result.itchingScore = Math.min(10, Math.max(0, Math.round(result.itchingScore / 2) * 2))
      }
      setSuggestion(result)
    } catch (err) {
      setAiError(t('Could not read the note. You can still fill the fields in yourself.'))
      setSuggestion(null)
    } finally {
      setAiLoading(false)
    }
  }

  function applySuggestion() {
    if (!suggestion) return
    const next = { ...form, freeTextNote: note }
    if (suggestion.itchingScore != null) next.itchingScore = suggestion.itchingScore
    if (suggestion.stoolState && suggestion.stoolState !== 'UNKNOWN') next.stoolState = suggestion.stoolState
    if (suggestion.appetiteLevel && suggestion.appetiteLevel !== 'UNKNOWN') next.appetiteLevel = suggestion.appetiteLevel
    if (suggestion.waterLevel && suggestion.waterLevel !== 'UNKNOWN') next.waterLevel = suggestion.waterLevel
    if (suggestion.energyLevel && suggestion.energyLevel !== 'UNKNOWN') next.energyLevel = suggestion.energyLevel
    if (suggestion.vomiting) next.vomiting = true
    if (suggestion.earRedness) next.earRedness = true
    // Cat-specific fields (present on the cat check-in form).
    if (suggestion.litterBoxUse && suggestion.litterBoxUse !== 'UNKNOWN') next.litterBoxUse = suggestion.litterBoxUse
    if (suggestion.urinationChange && suggestion.urinationChange !== 'UNKNOWN') next.urinationChange = suggestion.urinationChange
    if (suggestion.hidingBehavior && suggestion.hidingBehavior !== 'UNKNOWN') next.hidingBehavior = suggestion.hidingBehavior
    if (suggestion.straining) next.straining = true
    if (suggestion.weightConcern) next.weightConcern = true
    // Starter species (and any visible-change note): map generic detectedSignals into
    // the flexible observations model. Dog/cat return no detectedSignals, so this is a
    // no-op for them and their explicit-field behavior above is preserved.
    if (Array.isArray(suggestion.detectedSignals) && suggestion.detectedSignals.length) {
      const observations = { ...(next.observations || {}) }
      for (const signal of suggestion.detectedSignals) {
        if (!signal || !signal.key) continue
        const prev = observations[signal.key] || {}
        observations[signal.key] = {
          ...prev,
          label: signal.label || prev.label || signal.key,
          value: signal.value || prev.value || 'Changed',
          severity: signal.severity || prev.severity || null,
          note: prev.note || ''
        }
      }
      next.observations = observations
    }
    setForm(next)
    setApplied(true)
  }

  const cat = isCat(pet)
  const starter = isStarterSpecies(pet.species)
  const profile = speciesProfile(pet.species)
  const guidedCategories = starter ? profile.guidedCategories : (cat ? CHANGED_CATEGORIES.CAT : CHANGED_CATEGORIES.DOG)
  // A universal Visible Change / Wound category on every species' chip grid. Its
  // fields render as a dedicated <VisibleChangeField> (not a plain value chip).
  const vcCategory = { key: 'visible_change', label: visibleChangeConfig(pet.species).label }
  const categories = [...guidedCategories, vcCategory]

  return (
    <section className="flow-panel">
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> {t('Back')}</button>
      <p className="kicker">{t('Daily check-in')}</p>
      <h1>{t('How was {name} today?', { name: pet.name })}</h1>

      {mode === 'full' && (
        <>
          <p className="lead">{t('A few seconds a day builds {name}\'s record, so changes are easy to spot later.', { name: pet.name })}</p>
          <p className="reassure">
            {cat
              ? t('Only log what you noticed. Cats hide changes, so small notes can help.')
              : t('Only log what you noticed. A quick check-in is enough.')}
          </p>
        </>
      )}

      {mode === 'changed' && (
        <div className="guided-flow">
          <p className="lead">{t('Tell PetPattern what changed for {name} — just the parts that did.', { name: pet.name })}</p>
          <p className="form-section-label">{t('What changed?')}</p>
          <div className="guided-chip-grid">
            {categories.map((c) => (
              <button
                key={c.key}
                type="button"
                className={changedCats.includes(c.key) ? 'guided-chip active' : 'guided-chip'}
                aria-pressed={changedCats.includes(c.key)}
                onClick={() => toggleChangedCat(c.key)}
              >
                {t(c.label)}
              </button>
            ))}
          </div>

          {changedCats.length > 0 && (
            <form className="quick-form guided-fields" onSubmit={onSave}>
              <div className="field-label">
                {t('Date')}
                <DateField value={form.checkInDate} onChange={(d) => setForm({ ...form, checkInDate: d })} />
              </div>
              {starter ? (
                <StarterGuidedFields
                  categories={guidedCategories.filter((c) => changedCats.includes(c.key))}
                  form={form}
                  setForm={setForm}
                  note={note}
                  onAddFood={onAddFood}
                  onAddMedication={onAddMedication}
                />
              ) : (
                <GuidedFieldsForCategory
                  categories={changedCats.filter((k) => k !== 'visible_change')}
                  cat={cat}
                  form={form}
                  setForm={setForm}
                  onAddFood={onAddFood}
                  onAddMedication={onAddMedication}
                  note={note}
                />
              )}
              {changedCats.includes('visible_change') && (
                <VisibleChangeField pet={pet} form={form} setForm={setForm} onAddPhoto={onAddHealthPhoto} />
              )}
              <label className="field-label">
                {t('Add a note (optional)')}
                <textarea
                  placeholder={t('Anything else worth remembering about today?')}
                  value={note}
                  onChange={(e) => updateNote(e.target.value)}
                />
              </label>
              <button type="button" className="ghost-button wide" onClick={onAddPhoto}>
                <ImagePlus size={18} /> {t('Add a photo if it helps')}
              </button>
              <button className="primary-button wide" type="submit" disabled={saving}>
                <Check size={18} /> {t('Save today')}
              </button>
            </form>
          )}

          <div className="guided-flow-foot">
            <button className="text-button" type="button" onClick={() => setMode('note')}>{t('Describe instead')}</button>
            <button className="text-button" type="button" onClick={() => setMode('full')}>{t('Show full form')}</button>
          </div>
        </div>
      )}

      {mode === 'note' && (
        <div className="note-first-panel">
          <p className="form-section-label">{t('Describe what happened')}</p>
          <p className="muted">{t('Write one sentence. PetPattern will suggest fields before saving.')}</p>
          <form className="quick-form" onSubmit={onSave}>
            <div className="field-label">
              {t('Date')}
              <DateField value={form.checkInDate} onChange={(d) => setForm({ ...form, checkInDate: d })} />
            </div>
            <textarea
              className="note-first-input"
              placeholder={starter
                ? t(profile.notePlaceholder, { name: pet.name })
                : cat
                  ? t('e.g. {name} used the litter box less today, hid under the bed, and ate about half a meal.', { name: pet.name })
                  : t('e.g. {name} scratched more today, stool was softer, and we gave a new chicken treat yesterday.', { name: pet.name })}
              value={note}
              onChange={(e) => updateNote(e.target.value)}
            />
            <div className="action-row">
              {aiSuggestEnabled && (
                <button className="secondary-button" type="button" onClick={suggestFields} disabled={aiLoading || !note.trim()}>
                  <Pencil size={16} /> {aiLoading ? t('Reading…') : t('Suggest fields')}
                </button>
              )}
              <button className="primary-button" type="submit" disabled={saving}>
                <Check size={18} /> {t('Save note only')}
              </button>
            </div>
            {aiError && <p className="ai-error">{aiError}</p>}
            {suggestion && (
              <SuggestionPreview
                suggestion={suggestion}
                applied={applied}
                onApply={applySuggestion}
                onAddFood={() => onAddFood(suggestion.possibleFoodTrigger, note)}
              />
            )}
            <button type="button" className="ghost-button wide" onClick={onAddPhoto}>
              <ImagePlus size={18} /> {t('Add a photo if it helps')}
            </button>
          </form>
          <div className="guided-flow-foot">
            <button className="text-button" type="button" onClick={() => setMode('changed')}>{t('Something changed')}</button>
            <button className="text-button" type="button" onClick={() => setMode('full')}>{t('Show full form')}</button>
          </div>
        </div>
      )}

      {mode === 'full' && !starter && (
        <>
      {onQuickLog && (
        <div className="quiet-day">
          <button type="button" className="quiet-day-button" onClick={onQuickLog} disabled={saving}>
            <Check size={16} /> {t('No change noticed')}
          </button>
          <span className="quiet-day-hint">{t('Saves a calm day — nothing to fill in.')}</span>
        </div>
      )}

      <form className="quick-form" onSubmit={onSave}>
        <div className="field-label">
          {t('Date')}
          <DateField value={form.checkInDate} onChange={(d) => setForm({ ...form, checkInDate: d })} />
        </div>

        <p className="form-section-label">{t('How was {name}?', { name: pet.name })}</p>

        {cat ? (
          <>
            <QuickChoices
              label={t('Litter box')}
              value={form.litterBoxUse}
              options={[
                { value: 'NORMAL', label: t('Normal') },
                { value: 'LESS', label: t('Less') },
                { value: 'MORE', label: t('More') },
                { value: 'NONE', label: t('Not used') }
              ]}
              onChange={(litterBoxUse) => setForm({ ...form, litterBoxUse })}
            />
            <QuickChoices
              label={t('Appetite')}
              value={form.appetiteLevel}
              options={[
                { value: 'NORMAL', label: t('Normal') },
                { value: 'LOWER', label: t('Lower') },
                { value: 'HIGHER', label: t('Higher') },
                { value: 'REFUSED', label: t('Refused') }
              ]}
              onChange={(appetiteLevel) => setForm({ ...form, appetiteLevel })}
            />
            <QuickChoices
              label={t('Energy')}
              value={form.energyLevel}
              options={[
                { value: 'NORMAL', label: t('Normal') },
                { value: 'LOW', label: t('Low') },
                { value: 'RESTLESS', label: t('Restless') },
                { value: 'HIGH', label: t('High') }
              ]}
              onChange={(energyLevel) => setForm({ ...form, energyLevel })}
            />

            <p className="form-section-label">{t('Anything unusual?')}</p>
            <div className="toggle-grid">
              <ToggleButton active={form.hidingBehavior === 'MORE'} label={t('Hiding more')} onClick={() => setForm({ ...form, hidingBehavior: form.hidingBehavior === 'MORE' ? 'NORMAL' : 'MORE' })} />
              <ToggleButton active={form.straining} label={t('Straining')} onClick={() => setForm({ ...form, straining: !form.straining })} />
              <ToggleButton active={form.vomiting} label={t('Vomiting')} onClick={() => setForm({ ...form, vomiting: !form.vomiting })} />
              <ToggleButton active={form.weightConcern} label={t('Weight concern')} onClick={() => setForm({ ...form, weightConcern: !form.weightConcern })} />
            </div>
          </>
        ) : (
          <>
            <QuickChoices
              label={t('Scratching / itching')}
              value={form.itchingScore}
              options={[0, 2, 4, 6, 8, 10].map((value) => ({ value, label: String(value) }))}
              onChange={(itchingScore) => setForm({ ...form, itchingScore })}
            />
            <QuickChoices
              label={t('Stool')}
              value={form.stoolState}
              options={[
                { value: 'NORMAL', label: t('Normal') },
                { value: 'SOFT', label: t('Soft') },
                { value: 'DIARRHEA', label: t('Diarrhea') },
                { value: 'NO_STOOL', label: t('No stool') }
              ]}
              onChange={(stoolState) => setForm({ ...form, stoolState })}
            />
            <QuickChoices
              label={t('Energy')}
              value={form.energyLevel}
              options={[
                { value: 'NORMAL', label: t('Normal') },
                { value: 'LOW', label: t('Low') },
                { value: 'RESTLESS', label: t('Restless') },
                { value: 'HIGH', label: t('High') }
              ]}
              onChange={(energyLevel) => setForm({ ...form, energyLevel })}
            />

            <p className="form-section-label">{t('Anything unusual?')}</p>
            <div className="toggle-grid">
              <ToggleButton active={form.vomiting} label={t('Vomiting')} onClick={() => setForm({ ...form, vomiting: !form.vomiting })} />
              <ToggleButton active={form.earRedness} label={t('Ear redness')} onClick={() => setForm({ ...form, earRedness: !form.earRedness })} />
              <ToggleButton active={form.pawLicking} label={t('Paw licking')} onClick={() => setForm({ ...form, pawLicking: !form.pawLicking })} />
            </div>
          </>
        )}

        <details className="optional-details">
          <summary>{t('Optional details')}</summary>

          {cat && (
            <QuickChoices
              label={t('Urination change')}
              value={form.urinationChange}
              options={[
                { value: 'NORMAL', label: t('Normal') },
                { value: 'LESS', label: t('Less') },
                { value: 'MORE', label: t('More') }
              ]}
              onChange={(urinationChange) => setForm({ ...form, urinationChange })}
            />
          )}

          {!cat && (
            <QuickChoices
              label={t('Appetite')}
              value={form.appetiteLevel}
              options={[
                { value: 'NORMAL', label: t('Normal') },
                { value: 'LOWER', label: t('Lower') },
                { value: 'HIGHER', label: t('Higher') },
                { value: 'REFUSED', label: t('Refused') }
              ]}
              onChange={(appetiteLevel) => setForm({ ...form, appetiteLevel })}
            />
          )}

          <QuickChoices
            label={t('Water')}
            value={form.waterLevel}
            options={[
              { value: 'NORMAL', label: t('Normal') },
              { value: 'LOWER', label: t('Lower') },
              { value: 'HIGHER', label: t('Higher') }
            ]}
            onChange={(waterLevel) => setForm({ ...form, waterLevel })}
          />

          <div className="note-block">
            <div className="panel-heading">
              <Pencil size={18} />
              <h2>{t('Write what happened')}</h2>
            </div>
            <p className="muted">
              {aiSuggestEnabled
                ? t('Write naturally — PetPattern can suggest fields, but you stay in control.')
                : cat
                  ? t('Write naturally — a note is often the most useful thing for a cat.')
                  : t('Write naturally — a short note is often the most useful thing to bring to your vet.')}
            </p>
            <textarea
              placeholder={cat
                ? t('e.g. {name} used the litter box less today, hid under the bed, and ate about half a meal.', { name: pet.name })
                : t('e.g. {name} scratched a lot today, stool was softer, ate normally, and we gave a new chicken treat yesterday.', { name: pet.name })}
              value={note}
              onChange={(e) => updateNote(e.target.value)}
            />
            {aiSuggestEnabled && (
              <>
                <div className="action-row">
                  <button className="secondary-button" type="button" onClick={suggestFields} disabled={aiLoading || !note.trim()}>
                    <Pencil size={16} /> {aiLoading ? t('Reading…') : t('Suggest fields')}
                  </button>
                </div>
                {aiError && <p className="ai-error">{aiError}</p>}
                {suggestion && (
                  <SuggestionPreview
                    suggestion={suggestion}
                    applied={applied}
                    onApply={applySuggestion}
                    onAddFood={() => onAddFood(suggestion.possibleFoodTrigger, note)}
                  />
                )}
              </>
            )}
          </div>

          <button type="button" className="ghost-button wide" onClick={onAddPhoto}>
            <ImagePlus size={18} /> {t('Add a photo if it helps')}
          </button>
          <button type="button" className="ghost-button wide" onClick={onAddMedication}>
            <Pill size={18} /> {t('Add a medication or care note')}
          </button>
        </details>

        <button className="primary-button wide" type="submit" disabled={saving}>
          <Check size={18} /> {t('Save today')}
        </button>
      </form>
        </>
      )}

      {mode === 'full' && starter && (
        <form className="quick-form" onSubmit={onSave}>
          <div className="field-label">
            {t('Date')}
            <DateField value={form.checkInDate} onChange={(d) => setForm({ ...form, checkInDate: d })} />
          </div>
          <p className="form-section-label">{t('What did you notice for {name}?', { name: pet.name })}</p>
          <StarterGuidedFields categories={guidedCategories} form={form} setForm={setForm} note={note} onAddFood={onAddFood} onAddMedication={onAddMedication} />
          <VisibleChangeField pet={pet} form={form} setForm={setForm} onAddPhoto={onAddHealthPhoto} />
          <label className="field-label">
            {t('Add a note (optional)')}
            <textarea placeholder={t('Anything else worth remembering about today?')} value={note} onChange={(e) => updateNote(e.target.value)} />
          </label>
          <button type="button" className="ghost-button wide" onClick={onAddPhoto}>
            <ImagePlus size={18} /> {t('Add a photo if it helps')}
          </button>
          <button className="primary-button wide" type="submit" disabled={saving}>
            <Check size={18} /> {t('Save today')}
          </button>
        </form>
      )}
    </section>
  )
}

export { CheckInView }
