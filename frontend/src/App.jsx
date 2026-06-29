import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarDays, ChevronRight, ClipboardList, Droplets, HeartPulse, Sparkles } from 'lucide-react'
import { api } from './api'

const today = new Date().toISOString().slice(0, 10)

const emptyCheckIn = {
  checkInDate: today,
  stoolScore: 3,
  itchingScore: 2,
  energyScore: 8,
  appetiteScore: 8,
  sleepQualityScore: 8,
  waterIntakeMl: 800,
  vomiting: false,
  diarrhea: false,
  earRedness: false,
  notes: ''
}

const emptyFood = {
  date: today,
  brand: '',
  recipeName: '',
  primaryProtein: '',
  amountGrams: 250,
  newFood: true,
  notes: ''
}

function App() {
  const [pets, setPets] = useState([])
  const [selectedPetId, setSelectedPetId] = useState(null)
  const [checkIns, setCheckIns] = useState([])
  const [foodLogs, setFoodLogs] = useState([])
  const [insights, setInsights] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [checkInForm, setCheckInForm] = useState(emptyCheckIn)
  const [foodForm, setFoodForm] = useState(emptyFood)
  const [showFoodForm, setShowFoodForm] = useState(false)
  const [creatingPet, setCreatingPet] = useState({ name: '', breed: '', currentWeightKg: '' })

  const selectedPet = useMemo(() => pets.find((pet) => pet.id === selectedPetId), [pets, selectedPetId])
  const latestCheckIn = checkIns[0]

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
      if (nextPets.length > 0) setSelectedPetId(nextPets[0].id)
    } catch (err) {
      setError('Backend is not reachable yet. Wait a moment, then refresh.')
    } finally {
      setLoading(false)
    }
  }

  async function loadPetData(petId) {
    setError('')
    try {
      const [nextCheckIns, nextFoodLogs, nextInsights] = await Promise.all([
        api.listCheckIns(petId),
        api.listFoodLogs(petId),
        api.listInsights(petId)
      ])
      setCheckIns(nextCheckIns)
      setFoodLogs(nextFoodLogs)
      setInsights(nextInsights)
    } catch (err) {
      setError('Could not load pet history. Check the backend logs.')
    }
  }

  async function loadDemo() {
    setError('')
    try {
      const pet = await api.seedDemo()
      const nextPets = await api.listPets()
      setPets(nextPets)
      setSelectedPetId(pet.id)
    } catch (err) {
      setError('Demo seed failed. Make sure PostgreSQL and backend are running.')
    }
  }

  async function createPet(event) {
    event.preventDefault()
    setError('')
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
    } catch (err) {
      setError('Could not create pet. Add at least a name.')
    }
  }

  async function saveCheckIn(event) {
    event.preventDefault()
    if (!selectedPet) return
    setError('')
    try {
      await api.saveCheckIn(selectedPet.id, checkInForm)
      setCheckInForm({ ...emptyCheckIn, checkInDate: today })
      await loadPetData(selectedPet.id)
    } catch (err) {
      setError('Could not save today’s check-in.')
    }
  }

  async function saveFood(event) {
    event.preventDefault()
    if (!selectedPet) return
    setError('')
    try {
      await api.saveFoodLog(selectedPet.id, foodForm)
      setFoodForm({ ...emptyFood, date: today })
      setShowFoodForm(false)
      await loadPetData(selectedPet.id)
    } catch (err) {
      setError('Could not save food change.')
    }
  }

  if (loading) {
    return <div className="shell"><div className="loading-card">Opening the health memory…</div></div>
  }

  if (!selectedPet) {
    return (
      <div className="landing-shell">
        <section className="landing-card">
          <div className="brand-row">
            <div className="brand-mark">PP</div>
            <span>PetPattern</span>
          </div>
          <p className="eyebrow">A private health memory for your dog</p>
          <h1>Your dog can’t tell you what’s wrong. But the pattern is already there.</h1>
          <p className="lead">
            Track food, stool, itching, water and behavior over time. PetPattern learns what normal looks like for your dog and shows what changed before symptoms got worse.
          </p>
          <div className="landing-actions">
            <button className="primary" onClick={loadDemo}>Load Bella demo</button>
            <span className="small-note">Best first demo: seeded 42-day history with food and itching patterns.</span>
          </div>
          {error && <div className="error-box">{error}</div>}
        </section>

        <section className="create-card">
          <h2>Start a real pet profile</h2>
          <p>No diagnosis. No chatbot. Just a timeline that gets smarter the longer you use it.</p>
          <form onSubmit={createPet}>
            <input placeholder="Dog’s name" value={creatingPet.name} onChange={(e) => setCreatingPet({ ...creatingPet, name: e.target.value })} />
            <input placeholder="Breed, optional" value={creatingPet.breed} onChange={(e) => setCreatingPet({ ...creatingPet, breed: e.target.value })} />
            <input placeholder="Weight kg, optional" value={creatingPet.currentWeightKg} onChange={(e) => setCreatingPet({ ...creatingPet, currentWeightKg: e.target.value })} />
            <button className="secondary" type="submit">Create profile</button>
          </form>
        </section>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <aside className="side-panel">
        <div className="brand-row">
          <div className="brand-mark">PP</div>
          <span>PetPattern</span>
        </div>
        <div className="pet-switcher">
          {pets.map((pet) => (
            <button key={pet.id} className={pet.id === selectedPetId ? 'pet-pill active' : 'pet-pill'} onClick={() => setSelectedPetId(pet.id)}>
              {pet.name}
            </button>
          ))}
        </div>
        <div className="quiet-note">
          This pilot stores structured history and surfaces pattern candidates. It does not diagnose or replace a vet.
        </div>
      </aside>

      <main className="main-panel">
        {error && <div className="error-box">{error}</div>}

        <section className="hero-card">
          <div>
            <p className="eyebrow">{selectedPet.name} today</p>
            <h1>{todayLine(selectedPet, latestCheckIn)}</h1>
            <p className="lead small">Small daily signals become useful only when they are remembered together.</p>
          </div>
          <div className="pet-avatar">{selectedPet.name.slice(0, 1)}</div>
        </section>

        <section className="signal-grid">
          <SignalCard icon={<ClipboardList />} label="Logged days" value={checkIns.length} note="toward a useful baseline" />
          <SignalCard icon={<HeartPulse />} label="Latest itching" value={latestCheckIn ? `${latestCheckIn.itchingScore}/10` : '—'} note="compared with usual" />
          <SignalCard icon={<Droplets />} label="Latest water" value={latestCheckIn ? `${latestCheckIn.waterIntakeMl} ml` : '—'} note="watch for drops" />
          <SignalCard icon={<CalendarDays />} label="Food logs" value={foodLogs.length} note="trigger timeline" />
        </section>

        <div className="content-grid">
          <section className="panel checkin-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">20-second check-in</p>
                <h2>How was {selectedPet.name} today?</h2>
              </div>
            </div>
            <form onSubmit={saveCheckIn} className="checkin-form">
              <label>
                Date
                <input type="date" value={checkInForm.checkInDate} onChange={(e) => setCheckInForm({ ...checkInForm, checkInDate: e.target.value })} />
              </label>
              <Range label="Stool" min="1" max="5" value={checkInForm.stoolScore} hint="1 watery · 3 normal · 5 very hard" onChange={(value) => setCheckInForm({ ...checkInForm, stoolScore: value })} />
              <Range label="Itching" min="0" max="10" value={checkInForm.itchingScore} hint="0 none · 10 constant" onChange={(value) => setCheckInForm({ ...checkInForm, itchingScore: value })} />
              <Range label="Energy" min="0" max="10" value={checkInForm.energyScore} hint="0 exhausted · 10 normal playful" onChange={(value) => setCheckInForm({ ...checkInForm, energyScore: value })} />
              <Range label="Appetite" min="0" max="10" value={checkInForm.appetiteScore} hint="0 refused food · 10 normal" onChange={(value) => setCheckInForm({ ...checkInForm, appetiteScore: value })} />
              <Range label="Sleep" min="0" max="10" value={checkInForm.sleepQualityScore} hint="0 restless · 10 normal sleep" onChange={(value) => setCheckInForm({ ...checkInForm, sleepQualityScore: value })} />
              <label>
                Water estimate, ml
                <input type="number" min="0" value={checkInForm.waterIntakeMl} onChange={(e) => setCheckInForm({ ...checkInForm, waterIntakeMl: Number(e.target.value) })} />
              </label>
              <div className="toggles">
                <Toggle label="Vomiting" checked={checkInForm.vomiting} onChange={(checked) => setCheckInForm({ ...checkInForm, vomiting: checked })} />
                <Toggle label="Diarrhea" checked={checkInForm.diarrhea} onChange={(checked) => setCheckInForm({ ...checkInForm, diarrhea: checked })} />
                <Toggle label="Ear redness" checked={checkInForm.earRedness} onChange={(checked) => setCheckInForm({ ...checkInForm, earRedness: checked })} />
              </div>
              <textarea placeholder="Anything unusual? Optional." value={checkInForm.notes} onChange={(e) => setCheckInForm({ ...checkInForm, notes: e.target.value })} />
              <button className="primary" type="submit">Save today</button>
            </form>
          </section>

          <section className="panel insights-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Pattern cards</p>
                <h2>What changed?</h2>
              </div>
              <Sparkles size={20} />
            </div>
            <div className="insight-list">
              {insights.map((insight, index) => <InsightCard key={`${insight.type}-${index}`} insight={insight} />)}
            </div>
            <button className="soft-button" onClick={() => setShowFoodForm((value) => !value)}>
              Log a food change <ChevronRight size={16} />
            </button>
            {showFoodForm && (
              <form onSubmit={saveFood} className="food-form">
                <input type="date" value={foodForm.date} onChange={(e) => setFoodForm({ ...foodForm, date: e.target.value })} />
                <input placeholder="Brand" value={foodForm.brand} onChange={(e) => setFoodForm({ ...foodForm, brand: e.target.value })} />
                <input placeholder="Recipe name" value={foodForm.recipeName} onChange={(e) => setFoodForm({ ...foodForm, recipeName: e.target.value })} />
                <input placeholder="Primary protein, e.g. chicken" value={foodForm.primaryProtein} onChange={(e) => setFoodForm({ ...foodForm, primaryProtein: e.target.value })} />
                <input type="number" min="0" placeholder="grams" value={foodForm.amountGrams} onChange={(e) => setFoodForm({ ...foodForm, amountGrams: Number(e.target.value) })} />
                <Toggle label="New food" checked={foodForm.newFood} onChange={(checked) => setFoodForm({ ...foodForm, newFood: checked })} />
                <textarea placeholder="Why changed? Any treats?" value={foodForm.notes} onChange={(e) => setFoodForm({ ...foodForm, notes: e.target.value })} />
                <button className="secondary" type="submit">Save food log</button>
              </form>
            )}
          </section>
        </div>

        <section className="panel timeline-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Vet-ready memory</p>
              <h2>Recent timeline</h2>
            </div>
          </div>
          <div className="timeline">
            {checkIns.slice(0, 12).map((item) => (
              <div className="timeline-item" key={item.id}>
                <div className="timeline-date">{formatDate(item.checkInDate)}</div>
                <div className="timeline-body">
                  <strong>Itching {item.itchingScore}/10 · stool {item.stoolScore}/5 · water {item.waterIntakeMl} ml</strong>
                  <span>{timelineFlags(item)}</span>
                  {item.notes && <p>{item.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

function SignalCard({ icon, label, value, note }) {
  return (
    <div className="signal-card">
      <div className="signal-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  )
}

function InsightCard({ insight }) {
  return (
    <article className={`insight-card ${insight.severity}`}>
      <div className="insight-topline">
        <span>{insight.confidence} confidence</span>
        {insight.severity !== 'calm' && <AlertTriangle size={16} />}
      </div>
      <h3>{insight.title}</h3>
      <p>{insight.body}</p>
      <ul>
        {insight.evidence?.map((line) => <li key={line}>{line}</li>)}
      </ul>
      <small>{insight.medicalBoundary}</small>
    </article>
  )
}

function Range({ label, min, max, value, hint, onChange }) {
  return (
    <label className="range-label">
      <div className="range-row">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <small>{hint}</small>
    </label>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="toggle-label">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

function todayLine(pet, latestCheckIn) {
  if (!latestCheckIn) return `${pet.name} needs a first baseline day.`
  if (latestCheckIn.itchingScore >= 6) return `${pet.name} has been itchier than usual.`
  if (latestCheckIn.diarrhea) return `${pet.name}'s stool needs watching.`
  return `${pet.name}'s latest log looks steady.`
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value))
}

function timelineFlags(item) {
  const flags = []
  if (item.vomiting) flags.push('vomiting')
  if (item.diarrhea) flags.push('diarrhea')
  if (item.earRedness) flags.push('ear redness')
  return flags.length ? flags.join(' · ') : 'no major flags logged'
}

export default App
