import { useState } from 'react'
import { ArrowLeft, Cat, Check, ClipboardList, Dog } from 'lucide-react'
import { t } from '../../i18n'
import { SPECIES_ORDER, SPECIES_PROFILES, speciesProfile } from '../../speciesProfiles'
import { today } from '../../lib/date'
import { kgToLb, lbToKg } from '../../lib/units'
import { CAT_BREEDS, DOG_BREEDS } from '../../lib/species'
import { QuickChoices } from '../../components/QuickChoices'

function PetOnboarding({ onCreate, onFinish, onDemo, onCatDemo, onRabbitDemo, onCancel, demoBusy, demoEnabled = true }) {
  const [step, setStep] = useState('species') // species | profile | done
  const [species, setSpecies] = useState(null)
  const [form, setForm] = useState({ name: '', breed: '', birthDate: '', currentWeightKg: '', sex: 'UNKNOWN' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [createdPet, setCreatedPet] = useState(null)
  const [weightUnit, setWeightUnit] = useState('kg')

  function choose(next) {
    setSpecies(next)
    setError('')
    setStep('profile')
  }

  // Switch the weight unit and convert what's already typed, so the same real
  // weight is shown. Always stored as kg (see submit()).
  function switchUnit(unit) {
    if (unit === weightUnit) return
    const value = parseFloat(form.currentWeightKg)
    if (!Number.isNaN(value)) {
      const converted = unit === 'lbs' ? kgToLb(value) : lbToKg(value)
      setForm({ ...form, currentWeightKg: String(Math.round(converted * 10) / 10) })
    }
    setWeightUnit(unit)
  }

  async function submit(event) {
    event.preventDefault()
    if (!form.name.trim()) {
      setError(t('Add a name to start.'))
      return
    }
    setBusy(true)
    setError('')
    try {
      const pet = await onCreate({
        name: form.name.trim(),
        species,
        breed: form.breed.trim() || null,
        birthDate: form.birthDate || null,
        sex: form.sex || 'UNKNOWN',
        currentWeightKg: form.currentWeightKg
          ? Math.round((weightUnit === 'lbs' ? lbToKg(Number(form.currentWeightKg)) : Number(form.currentWeightKg)) * 100) / 100
          : null
      })
      setCreatedPet(pet)
      setStep('done')
    } catch (err) {
      setError(err.message || t('Could not create the profile. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  if (step === 'done' && createdPet) {
    return (
      <section className="onboarding onboarding-done">
        <span className="brand-mark big species-emoji" aria-hidden="true">{speciesProfile(createdPet.species).emoji}</span>
        <h1>{t('{name} is all set.', { name: createdPet.name })}</h1>
        <p className="lead">{t('Log your first check-in and PetPattern starts learning what’s normal for {name}.', { name: createdPet.name })}</p>
        <div className="action-row">
          <button className="primary-button" type="button" onClick={() => onFinish(createdPet, 'check-in')}>
            <ClipboardList size={18} /> {t('Log today')}
          </button>
          <button className="ghost-button" type="button" onClick={() => onFinish(createdPet, 'today')}>
            {t('Go to {name} today', { name: createdPet.name })}
          </button>
        </div>
      </section>
    )
  }

  if (step === 'profile') {
    const meta = speciesProfile(species)
    const isDogCat = species === 'DOG' || species === 'CAT'
    return (
      <section className="onboarding">
        <button className="back-button" type="button" onClick={() => { setStep('species'); setError('') }}>
          <ArrowLeft size={17} /> {t('Back')}
        </button>
        <p className="kicker"><span aria-hidden="true">{meta.emoji}</span> {t(meta.label)}</p>
        <h1>{t('Tell us about your {species}', { species: t(meta.label).toLowerCase() })}</h1>
        <p className="lead">{t(meta.description)}</p>
        <form className="stack-form onboarding-form" onSubmit={submit}>
          <label className="field-label">{t('Name')}
            <input autoFocus value={form.name} placeholder={t("Your pet's name")} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>

          <div className="optional-fields">
            <p className="optional-fields-hint">{t('You can add these now or later.')}</p>
          <label className="field-label">{t('Breed (optional)')}
            <input value={form.breed} list={isDogCat ? 'breed-options' : undefined} autoComplete="off"
              onChange={(e) => setForm({ ...form, breed: e.target.value })} />
            {isDogCat && (
              <datalist id="breed-options">
                {(species === 'CAT' ? CAT_BREEDS : DOG_BREEDS).map((b) => <option key={b} value={b} />)}
              </datalist>
            )}
          </label>
          <label className="field-label">{t('Birth date (optional)')}
            <input type="date" max={today} value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
          </label>
          <div className="field-label">
            <span className="weight-label-row">
              {t('Weight (optional)')}
              <span className="unit-toggle" role="group" aria-label={t('Weight unit')}>
                <button type="button" className={weightUnit === 'kg' ? 'unit-btn active' : 'unit-btn'} onClick={() => switchUnit('kg')}>kg</button>
                <button type="button" className={weightUnit === 'lbs' ? 'unit-btn active' : 'unit-btn'} onClick={() => switchUnit('lbs')}>lbs</button>
              </span>
            </span>
            <input inputMode="decimal" value={form.currentWeightKg} placeholder={weightUnit}
              onChange={(e) => setForm({ ...form, currentWeightKg: e.target.value })} />
          </div>
          <QuickChoices
            label={t('Sex (optional)')}
            value={form.sex}
            options={[
              { value: 'UNKNOWN', label: t('Not sure') },
              { value: 'FEMALE', label: t('Female') },
              { value: 'MALE', label: t('Male') }
            ]}
            onChange={(sex) => setForm({ ...form, sex })}
          />
          </div>
          {error && <div className="error-box" role="alert">{error}</div>}
          <button className="primary-button wide" type="submit" disabled={busy}>
            <Check size={18} /> {t('Create profile')}
          </button>
        </form>
      </section>
    )
  }

  // step === 'species'
  return (
    <section className="onboarding">
      {onCancel && (
        <button className="back-button" type="button" onClick={onCancel}><ArrowLeft size={17} /> {t('Back')}</button>
      )}
      <p className="kicker">{t('Species-specific pattern memory')}</p>
      <h1>{t('What pet do you want to track?')}</h1>
      <p className="lead">{t('PetPattern uses species-specific signals, not generic logs.')}</p>
      <div className="species-grid">
        {SPECIES_ORDER.map((key) => {
          const profile = SPECIES_PROFILES[key]
          return (
            <button key={key} type="button" className={`species-card support-${profile.support.toLowerCase()}`} onClick={() => choose(key)}>
              <span className="species-emoji" aria-hidden="true">{profile.emoji}</span>
              <strong>{t(profile.label)}</strong>
              <span className="species-support">{profile.support === 'FULL' ? t('Full support') : t('Starter support')}</span>
            </button>
          )
        })}
      </div>
      {onDemo && demoEnabled && (
        <div className="onboarding-demo">
          <span className="muted">{t('Just exploring?')}</span>
          <div className="demo-buttons">
            <button className="ghost-button" type="button" onClick={onDemo} disabled={demoBusy}>
              <Dog size={16} /> {t('Try dog demo')}
            </button>
            {onCatDemo && (
              <button className="ghost-button" type="button" onClick={onCatDemo} disabled={demoBusy}>
                <Cat size={16} /> {t('Try cat demo')}
              </button>
            )}
            {onRabbitDemo && (
              <button className="ghost-button" type="button" onClick={onRabbitDemo} disabled={demoBusy}>
                <span className="btn-emoji" aria-hidden="true">🐰</span> {t('Try rabbit demo')}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export { PetOnboarding }
