import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Droplets,
  HeartPulse,
  PawPrint,
  Plus,
  Utensils
} from 'lucide-react'
import { api } from './api'

const today = new Date().toISOString().slice(0, 10)

const emptyCheckIn = {
  checkInDate: today,
  itchingScore: 2,
  stoolState: 'NORMAL',
  appetiteLevel: 'NORMAL',
  waterLevel: 'NORMAL',
  energyLevel: 'NORMAL',
  vomiting: false,
  earRedness: false,
  freeTextNote: ''
}

const emptyFood = {
  dateStarted: today,
  foodKind: 'TREAT',
  brand: '',
  productName: '',
  primaryProtein: 'CHICKEN',
  secondaryProteins: [],
  grainFree: false,
  newFood: true,
  notes: ''
}

const proteinOptions = ['CHICKEN', 'BEEF', 'LAMB', 'SALMON', 'TURKEY', 'DUCK', 'PORK', 'EGG', 'DAIRY', 'OTHER']

function App() {
  const [pets, setPets] = useState([])
  const [selectedPetId, setSelectedPetId] = useState(null)
  const [overview, setOverview] = useState(null)
  const [checkIns, setCheckIns] = useState([])
  const [foodLogs, setFoodLogs] = useState([])
  const [patterns, setPatterns] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState(hashView())
  const [checkInForm, setCheckInForm] = useState(emptyCheckIn)
  const [foodForm, setFoodForm] = useState(emptyFood)
  const [creatingPet, setCreatingPet] = useState({ name: '', breed: '', currentWeightKg: '' })

  const selectedPet = useMemo(() => {
    return overview?.pet ?? pets.find((pet) => pet.id === selectedPetId)
  }, [overview, pets, selectedPetId])

  const latestCheckIn = overview?.latestCheckIn ?? checkIns[0]
  const currentFood = overview?.currentFood ?? foodLogs[0]
  const topPattern = patterns[0] ?? overview?.patterns?.[0]

  useEffect(() => {
    const onHashChange = () => setView(hashView())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    loadInitial()
  }, [])

  useEffect(() => {
    if (selectedPetId) {
      loadPetData(selectedPetId)
    }
  }, [selectedPetId])

  async function loadInitial() {
    setLoading(true)
    setError('')
    try {
      const nextPets = await api.listPets()
      setPets(nextPets)
      if (nextPets.length > 0) {
        const bella = nextPets.find((pet) => pet.name?.toLowerCase() === 'bella')
        setSelectedPetId((bella ?? nextPets[0]).id)
      }
    } catch (err) {
      setError('Backend is not reachable yet. Wait a moment, then refresh.')
    } finally {
      setLoading(false)
    }
  }

  async function loadPetData(petId) {
    setError('')
    try {
      const [nextOverview, nextCheckIns, nextFoodLogs, nextPatterns] = await Promise.all([
        api.getOverview(petId),
        api.listCheckIns(petId),
        api.listFoodLogs(petId),
        api.listPatterns(petId)
      ])
      setOverview(nextOverview)
      setCheckIns(nextCheckIns)
      setFoodLogs(nextFoodLogs)
      setPatterns(nextPatterns)
    } catch (err) {
      setError('Could not load pet history. Check the backend logs.')
    }
  }

  async function loadDemo() {
    setError('')
    setSaving(true)
    try {
      const pet = await api.seedDemo()
      const nextPets = await api.listPets()
      setPets(nextPets)
      setSelectedPetId(pet.id)
      go('today')
    } catch (err) {
      setError('Demo seed failed. Make sure PostgreSQL and backend are running.')
    } finally {
      setSaving(false)
    }
  }

  async function createPet(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const pet = await api.createPet({
        name: creatingPet.name,
        species: 'DOG',
        breed: creatingPet.breed || null,
        sex: 'UNKNOWN',
        currentWeightKg: creatingPet.currentWeightKg ? Number(creatingPet.currentWeightKg) : null
      })
      const nextPets = await api.listPets()
      setPets(nextPets)
      setSelectedPetId(pet.id)
      setCreatingPet({ name: '', breed: '', currentWeightKg: '' })
      go('today')
    } catch (err) {
      setError('Could not create pet. Add at least a name.')
    } finally {
      setSaving(false)
    }
  }

  async function saveCheckIn(event) {
    event.preventDefault()
    if (!selectedPet) return
    setError('')
    setSaving(true)
    try {
      await api.saveCheckIn(selectedPet.id, checkInForm)
      setCheckInForm({ ...emptyCheckIn, checkInDate: today })
      await loadPetData(selectedPet.id)
      go('today')
    } catch (err) {
      setError("Could not save today's check-in.")
    } finally {
      setSaving(false)
    }
  }

  async function saveFood(event) {
    event.preventDefault()
    if (!selectedPet) return
    setError('')
    setSaving(true)
    try {
      await api.saveFoodLog(selectedPet.id, foodForm)
      setFoodForm({ ...emptyFood, dateStarted: today })
      await loadPetData(selectedPet.id)
      go('today')
    } catch (err) {
      setError('Could not save food change.')
    } finally {
      setSaving(false)
    }
  }

  function go(nextView) {
    window.location.hash = nextView
    setView(nextView)
  }

  if (loading) {
    return (
      <div className="center-shell">
        <div className="loading-panel">Opening PetPattern...</div>
      </div>
    )
  }

  if (!selectedPet) {
    return (
      <div className="start-shell">
        <main className="start-panel">
          <div className="brand-line">
            <span className="brand-mark"><PawPrint size={20} /></span>
            <strong>PetPattern</strong>
          </div>
          <p className="kicker">Private health memory for dogs</p>
          <h1>Remember what changed before the flare-up.</h1>
          <p className="lead">
            Track food, stool, scratching, water, appetite and energy in one structured timeline.
            PetPattern helps you notice changes worth bringing to your vet.
          </p>
          <div className="action-row">
            <button className="primary-button" type="button" onClick={loadDemo} disabled={saving}>
              <PawPrint size={18} /> Load Bella demo
            </button>
          </div>
          {error && <div className="error-box">{error}</div>}
        </main>

        <aside className="profile-panel">
          <h2>Start a dog profile</h2>
          <form onSubmit={createPet} className="stack-form">
            <input placeholder="Dog's name" value={creatingPet.name} onChange={(e) => setCreatingPet({ ...creatingPet, name: e.target.value })} />
            <input placeholder="Breed, optional" value={creatingPet.breed} onChange={(e) => setCreatingPet({ ...creatingPet, breed: e.target.value })} />
            <input placeholder="Weight kg, optional" value={creatingPet.currentWeightKg} onChange={(e) => setCreatingPet({ ...creatingPet, currentWeightKg: e.target.value })} />
            <button className="secondary-button" type="submit" disabled={saving}>
              <Plus size={18} /> Create profile
            </button>
          </form>
        </aside>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="brand-line">
          <span className="brand-mark"><PawPrint size={18} /></span>
          <strong>PetPattern</strong>
        </div>
        <div className="pet-tabs">
          {pets.map((pet) => (
            <button key={pet.id} className={pet.id === selectedPetId ? 'pet-tab active' : 'pet-tab'} type="button" onClick={() => setSelectedPetId(pet.id)}>
              {pet.name}
            </button>
          ))}
        </div>
      </header>

      <nav className="view-tabs" aria-label="PetPattern sections">
        <Tab active={view === 'today'} onClick={() => go('today')} icon={<PawPrint size={17} />} label={`${selectedPet.name} today`} />
        <Tab active={view === 'check-in'} onClick={() => go('check-in')} icon={<ClipboardList size={17} />} label="Log today" />
        <Tab active={view === 'food'} onClick={() => go('food')} icon={<Utensils size={17} />} label="Food change" />
        <Tab active={view === 'patterns'} onClick={() => go('patterns')} icon={<Activity size={17} />} label="Patterns" />
      </nav>

      <main className="screen">
        {error && <div className="error-box">{error}</div>}

        {view === 'check-in' && (
          <CheckInView
            pet={selectedPet}
            form={checkInForm}
            setForm={setCheckInForm}
            saving={saving}
            onBack={() => go('today')}
            onSave={saveCheckIn}
          />
        )}

        {view === 'food' && (
          <FoodView
            pet={selectedPet}
            form={foodForm}
            setForm={setFoodForm}
            saving={saving}
            onBack={() => go('today')}
            onSave={saveFood}
          />
        )}

        {view === 'patterns' && (
          <PatternsView pet={selectedPet} patterns={patterns} onBack={() => go('today')} />
        )}

        {view === 'today' && (
          <TodayView
            pet={selectedPet}
            overview={overview}
            latestCheckIn={latestCheckIn}
            currentFood={currentFood}
            topPattern={topPattern}
            checkIns={checkIns}
            onLogToday={() => go('check-in')}
            onFoodChange={() => go('food')}
            onPatterns={() => go('patterns')}
          />
        )}
      </main>
    </div>
  )
}

function TodayView({ pet, overview, latestCheckIn, currentFood, topPattern, checkIns, onLogToday, onFoodChange, onPatterns }) {
  return (
    <>
      <section className="today-spine">
        <div className="today-copy">
          <p className="kicker">{pet.name} today</p>
          <h1>{todayHeadline(pet, overview, topPattern, latestCheckIn)}</h1>
          <p>{overview?.todayExplanation ?? `${pet.name} is ready for a first check-in.`}</p>
          <div className="action-row">
            <button className="primary-button" type="button" onClick={onLogToday}>
              <ClipboardList size={18} /> Log today
            </button>
            <button className="secondary-button" type="button" onClick={onFoodChange}>
              <Utensils size={18} /> Add food change
            </button>
          </div>
        </div>

        <div className={`state-panel ${overview?.todayStatus ?? 'changed'}`}>
          <span>{statusLabel(overview?.todayStatus, pet.name)}</span>
          <strong>{overview?.nextAction ?? 'Log today'}</strong>
        </div>
      </section>

      <section className="home-grid">
        <article className="panel">
          <div className="panel-heading">
            <PawPrint size={18} />
            <h2>Pet profile</h2>
          </div>
          <dl className="profile-list">
            <div><dt>Name</dt><dd>{pet.name}</dd></div>
            <div><dt>Breed</dt><dd>{pet.breed ?? 'Not added'}</dd></div>
            <div><dt>Age</dt><dd>{ageLabel(pet.birthDate)}</dd></div>
            <div><dt>Weight</dt><dd>{pet.currentWeightKg ? `${pet.currentWeightKg} kg` : 'Not added'}</dd></div>
          </dl>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <HeartPulse size={18} />
            <h2>Recent signals</h2>
          </div>
          <div className="signal-list">
            <Signal label="Scratching" value={latestCheckIn?.itchingScore != null ? `${latestCheckIn.itchingScore}/10` : 'Not logged'} tone={latestCheckIn?.itchingScore >= 6 ? 'watch' : 'calm'} />
            <Signal label="Stool" value={stoolLabel(latestCheckIn)} tone={latestCheckIn?.stoolState === 'SOFT' || latestCheckIn?.stoolState === 'DIARRHEA' ? 'watch' : 'calm'} />
            <Signal label="Water" value={levelLabel(latestCheckIn?.waterLevel)} tone={latestCheckIn?.waterLevel === 'LOWER' ? 'watch' : 'calm'} />
            <Signal label="Appetite" value={levelLabel(latestCheckIn?.appetiteLevel)} tone={latestCheckIn?.appetiteLevel === 'LOWER' || latestCheckIn?.appetiteLevel === 'REFUSED' ? 'watch' : 'calm'} />
            <Signal label="Energy" value={levelLabel(latestCheckIn?.energyLevel)} tone={latestCheckIn?.energyLevel === 'LOW' || latestCheckIn?.energyLevel === 'RESTLESS' ? 'watch' : 'calm'} />
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <Utensils size={18} />
            <h2>Current food</h2>
          </div>
          {currentFood ? (
            <div className="food-summary">
              <strong>{[currentFood.brand, currentFood.productName].filter(Boolean).join(' - ')}</strong>
              <span>{foodKindLabel(currentFood.foodKind)} started {formatDate(currentFood.dateStarted)}</span>
              <div className="chip-row">
                <span className="chip">{proteinLabel(currentFood.primaryProtein)}</span>
                {currentFood.newFood && <span className="chip alert">New food</span>}
                {currentFood.grainFree && <span className="chip">Grain-free</span>}
              </div>
            </div>
          ) : (
            <p className="muted">Add the first food change to start comparing symptoms against exposure windows.</p>
          )}
        </article>

        <article className="panel pattern-teaser">
          <div className="panel-heading">
            <Activity size={18} />
            <h2>Possible pattern</h2>
          </div>
          {topPattern ? (
            <>
              <strong>{topPattern.title}</strong>
              <p>{topPattern.summary}</p>
              <button className="text-button" type="button" onClick={onPatterns}>
                Show what changed <ChevronRight size={16} />
              </button>
            </>
          ) : (
            <>
              <strong>Still learning normal for {pet.name}</strong>
              <p>A few more daily logs will make changes easier to compare.</p>
            </>
          )}
        </article>
      </section>

      <RecentTimeline checkIns={checkIns} />
    </>
  )
}

function CheckInView({ pet, form, setForm, saving, onBack, onSave }) {
  return (
    <section className="flow-panel">
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> Back</button>
      <p className="kicker">Daily check-in</p>
      <h1>How was {pet.name} today?</h1>
      <p className="lead">A quick check-in helps PetPattern learn what normal looks like for {pet.name}.</p>

      <form className="quick-form" onSubmit={onSave}>
        <label className="field-label">
          Date
          <input type="date" value={form.checkInDate} onChange={(e) => setForm({ ...form, checkInDate: e.target.value })} />
        </label>

        <QuickChoices
          label="Scratching / itching"
          value={form.itchingScore}
          options={[0, 2, 4, 6, 8, 10].map((value) => ({ value, label: String(value) }))}
          onChange={(itchingScore) => setForm({ ...form, itchingScore })}
        />
        <QuickChoices
          label="Stool"
          value={form.stoolState}
          options={[
            { value: 'NORMAL', label: 'Normal' },
            { value: 'SOFT', label: 'Soft' },
            { value: 'DIARRHEA', label: 'Diarrhea' },
            { value: 'NO_STOOL', label: 'No stool' }
          ]}
          onChange={(stoolState) => setForm({ ...form, stoolState })}
        />
        <QuickChoices
          label="Appetite"
          value={form.appetiteLevel}
          options={[
            { value: 'NORMAL', label: 'Normal' },
            { value: 'LOWER', label: 'Lower' },
            { value: 'HIGHER', label: 'Higher' },
            { value: 'REFUSED', label: 'Refused' }
          ]}
          onChange={(appetiteLevel) => setForm({ ...form, appetiteLevel })}
        />
        <QuickChoices
          label="Water"
          value={form.waterLevel}
          options={[
            { value: 'NORMAL', label: 'Normal' },
            { value: 'LOWER', label: 'Lower' },
            { value: 'HIGHER', label: 'Higher' }
          ]}
          onChange={(waterLevel) => setForm({ ...form, waterLevel })}
        />
        <QuickChoices
          label="Energy"
          value={form.energyLevel}
          options={[
            { value: 'NORMAL', label: 'Normal' },
            { value: 'LOW', label: 'Low' },
            { value: 'RESTLESS', label: 'Restless' },
            { value: 'HIGH', label: 'High' }
          ]}
          onChange={(energyLevel) => setForm({ ...form, energyLevel })}
        />

        <div className="toggle-grid">
          <ToggleButton active={form.vomiting} label="Vomiting" onClick={() => setForm({ ...form, vomiting: !form.vomiting })} />
          <ToggleButton active={form.earRedness} label="Ear redness" onClick={() => setForm({ ...form, earRedness: !form.earRedness })} />
        </div>

        <label className="field-label">
          Note
          <textarea placeholder="Anything unusual? Optional." value={form.freeTextNote} onChange={(e) => setForm({ ...form, freeTextNote: e.target.value })} />
        </label>

        <button className="primary-button wide" type="submit" disabled={saving}>
          <Check size={18} /> Save today
        </button>
      </form>
    </section>
  )
}

function FoodView({ pet, form, setForm, saving, onBack, onSave }) {
  function toggleSecondary(protein) {
    const exists = form.secondaryProteins.includes(protein)
    setForm({
      ...form,
      secondaryProteins: exists
        ? form.secondaryProteins.filter((item) => item !== protein)
        : [...form.secondaryProteins, protein]
    })
  }

  return (
    <section className="flow-panel">
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> Back</button>
      <p className="kicker">Food exposure</p>
      <h1>What changed in {pet.name}'s food?</h1>
      <p className="lead">Food changes often matter more than they seem. Track the first day {pet.name} ate it.</p>

      <form className="quick-form" onSubmit={onSave}>
        <QuickChoices
          label="Food kind"
          value={form.foodKind}
          options={[
            { value: 'MAIN_FOOD', label: 'Main food' },
            { value: 'TREAT', label: 'Treat' },
            { value: 'SUPPLEMENT', label: 'Supplement' },
            { value: 'OTHER', label: 'Other' }
          ]}
          onChange={(foodKind) => setForm({ ...form, foodKind })}
        />

        <div className="two-fields">
          <label className="field-label">
            Brand
            <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          </label>
          <label className="field-label">
            Product
            <input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} />
          </label>
        </div>

        <QuickChoices
          label="Primary protein"
          value={form.primaryProtein}
          options={proteinOptions.map((value) => ({ value, label: proteinLabel(value) }))}
          onChange={(primaryProtein) => setForm({ ...form, primaryProtein })}
        />

        <div className="choice-block">
          <span>Secondary proteins</span>
          <div className="choice-grid">
            {proteinOptions.filter((protein) => protein !== form.primaryProtein).map((protein) => (
              <button key={protein} type="button" className={form.secondaryProteins.includes(protein) ? 'choice-button active' : 'choice-button'} onClick={() => toggleSecondary(protein)}>
                {proteinLabel(protein)}
              </button>
            ))}
          </div>
        </div>

        <div className="toggle-grid">
          <ToggleButton active={form.grainFree} label="Grain-free" onClick={() => setForm({ ...form, grainFree: !form.grainFree })} />
          <ToggleButton active={form.newFood} label="New food" onClick={() => setForm({ ...form, newFood: !form.newFood })} />
        </div>

        <label className="field-label">
          Date started
          <input type="date" value={form.dateStarted} onChange={(e) => setForm({ ...form, dateStarted: e.target.value })} />
        </label>

        <label className="field-label">
          Notes
          <textarea placeholder="First serving, treat size, reason for change..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </label>

        <button className="primary-button wide" type="submit" disabled={saving}>
          <Check size={18} /> Save food change
        </button>
      </form>
    </section>
  )
}

function PatternsView({ pet, patterns, onBack }) {
  return (
    <section className="flow-panel">
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> Back</button>
      <p className="kicker">What changed?</p>
      <h1>Possible patterns for {pet.name}</h1>
      <p className="lead">These cards are generated from stored check-ins and food logs. They are cautious prompts for better tracking and vet conversations.</p>

      <div className="pattern-list">
        {patterns.length === 0 && (
          <article className="panel">
            <h2>Nothing clearly outside normal yet</h2>
            <p className="muted">Keep logging daily signals and food changes. PetPattern gets more useful as the history grows.</p>
          </article>
        )}
        {patterns.map((pattern) => (
          <article className="panel pattern-card" key={pattern.id}>
            <div className="pattern-top">
              <span className={`confidence ${pattern.confidence.toLowerCase()}`}>{confidenceLabel(pattern.confidence)}</span>
              <AlertTriangle size={17} />
            </div>
            <h2>{pattern.title}</h2>
            <p>{pattern.summary}</p>
            <ul className="evidence-list">
              {pattern.evidence?.map((line) => <li key={line}>{line}</li>)}
            </ul>
            <button className="text-button placeholder" type="button">
              Show what changed <ChevronRight size={16} />
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}

function RecentTimeline({ checkIns }) {
  if (!checkIns.length) return null
  return (
    <section className="panel timeline-panel">
      <div className="panel-heading">
        <CalendarDays size={18} />
        <h2>Recent memory</h2>
      </div>
      <div className="timeline">
        {checkIns.slice(0, 8).map((item) => (
          <div className="timeline-row" key={item.id}>
            <span>{formatDate(item.checkInDate)}</span>
            <strong>Itching {item.itchingScore ?? 'not logged'} / stool {stoolLabel(item)}</strong>
            <small>{timelineFlags(item)}</small>
          </div>
        ))}
      </div>
    </section>
  )
}

function Tab({ active, onClick, icon, label }) {
  return (
    <button className={active ? 'view-tab active' : 'view-tab'} type="button" onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  )
}

function Signal({ label, value, tone }) {
  return (
    <div className={`signal ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function QuickChoices({ label, value, options, onChange }) {
  return (
    <div className="choice-block">
      <span>{label}</span>
      <div className="choice-grid">
        {options.map((option) => (
          <button
            key={option.value}
            className={value === option.value ? 'choice-button active' : 'choice-button'}
            type="button"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function ToggleButton({ active, label, onClick }) {
  return (
    <button className={active ? 'toggle-button active' : 'toggle-button'} type="button" onClick={onClick}>
      {active && <Check size={15} />}
      {label}
    </button>
  )
}

function hashView() {
  const value = window.location.hash.replace('#', '')
  return ['today', 'check-in', 'food', 'patterns'].includes(value) ? value : 'today'
}

function statusLabel(status, petName) {
  if (status === 'normal') return 'Normal for ' + petName
  if (status === 'watch') return 'Worth watching'
  return 'Changed'
}

function todayHeadline(pet, overview, topPattern, latestCheckIn) {
  if (!latestCheckIn) return `${pet.name} needs a first baseline day.`
  if (topPattern) return topPattern.title
  if (overview?.todayStatus === 'watch') return `${pet.name} is worth watching today.`
  if (overview?.todayStatus === 'changed') return `${pet.name} needs today's check-in.`
  return `${pet.name} looks close to normal.`
}

function ageLabel(birthDate) {
  if (!birthDate) return 'Adult'
  const birth = new Date(birthDate)
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  const monthDelta = now.getMonth() - birth.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birth.getDate())) years -= 1
  return years > 0 ? `${years} years` : 'Under 1 year'
}

function stoolLabel(checkIn) {
  if (!checkIn) return 'Not logged'
  if (checkIn.stoolState) return titleCase(checkIn.stoolState)
  if (checkIn.diarrhea) return 'Diarrhea'
  if (checkIn.stoolScore) return `${checkIn.stoolScore}/5`
  return 'Not logged'
}

function levelLabel(value) {
  if (!value) return 'Not logged'
  return titleCase(value)
}

function foodKindLabel(value) {
  return titleCase(value ?? 'MAIN_FOOD')
}

function proteinLabel(value) {
  return titleCase(value ?? 'UNKNOWN')
}

function confidenceLabel(value) {
  return `${titleCase(value)} confidence`
}

function titleCase(value) {
  return String(value).toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value))
}

function timelineFlags(item) {
  const flags = []
  if (item.vomiting) flags.push('vomiting')
  if (item.stoolState === 'DIARRHEA') flags.push('diarrhea')
  if (item.earRedness) flags.push('ear redness')
  if (item.freeTextNote) flags.push(item.freeTextNote)
  return flags.length ? flags.join(' - ') : 'no major flags logged'
}

export default App
