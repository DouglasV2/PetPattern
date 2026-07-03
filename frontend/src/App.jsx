import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bell,
  CalendarDays,
  CalendarRange,
  Cat,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  Dog,
  Download,
  Droplets,
  Flame,
  FlaskConical,
  HeartPulse,
  ImagePlus,
  LogOut,
  Mail,
  PawPrint,
  Pencil,
  Pill,
  Plus,
  Printer,
  Settings,
  Share2,
  Stethoscope,
  Trash2,
  UserPlus,
  Users,
  Utensils,
  X
} from 'lucide-react'
import { api, setUnauthorizedHandler } from './api'
import { t, setLang, getLang, loadLang, persistLang, LANGUAGES } from './i18n'
import { LEGAL } from './legal'
import { track } from './analytics'

// The brand mark: a paw whose pads sit on a small memory trail, with one coral
// pad for the point that changed. Drawn in currentColor so it inherits the
// .brand-mark colour (white on teal, teal on the soft variant); only the changed
// pad carries the fixed coral accent.
function BrandMark({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="M12 15.4 C 14.2 13.8, 15.7 12.8, 16.7 10.9" stroke="currentColor" strokeWidth="0.85" strokeLinecap="round" strokeDasharray="0.2 1.7" opacity="0.6" />
      <circle cx="7.45" cy="10.65" r="1.75" fill="currentColor" />
      <circle cx="10.35" cy="8.35" r="1.75" fill="currentColor" />
      <circle cx="13.65" cy="8.35" r="1.75" fill="currentColor" />
      <circle cx="16.55" cy="10.65" r="1.75" fill="#c75b46" />
      <path d="M12 12.2c2.15 0 3.75 1.55 3.75 3.4 0 1.55-1.5 2.4-3.75 2.4s-3.75-.85-3.75-2.4c0-1.85 1.6-3.4 3.75-3.4z" fill="currentColor" />
    </svg>
  )
}

// Small, self-contained flag glyphs for the language picker. Inline SVG (not
// emoji) so they render the same on every OS — Windows shows flag emoji as bare
// letters. Simplified but recognisable; 3:2 ratio.
function Flag({ code, size = 20 }) {
  const w = size, h = Math.round(size * 0.68)
  const box = { width: w, height: h, viewBox: '0 0 24 16', style: { borderRadius: 2, display: 'block', flex: 'none' }, 'aria-hidden': true }
  switch (code) {
    case 'hr': return (<svg {...box}><rect width="24" height="5.33" fill="#c8102e"/><rect y="5.33" width="24" height="5.33" fill="#fff"/><rect y="10.66" width="24" height="5.34" fill="#1e40af"/><rect x="9.6" y="4.4" width="4.8" height="4.8" fill="#fff"/><rect x="9.6" y="4.4" width="1.6" height="1.6" fill="#c8102e"/><rect x="12.8" y="4.4" width="1.6" height="1.6" fill="#c8102e"/><rect x="11.2" y="6" width="1.6" height="1.6" fill="#c8102e"/><rect x="9.6" y="7.6" width="1.6" height="1.6" fill="#c8102e"/><rect x="12.8" y="7.6" width="1.6" height="1.6" fill="#c8102e"/></svg>)
    case 'de': return (<svg {...box}><rect width="24" height="5.33" fill="#000"/><rect y="5.33" width="24" height="5.33" fill="#dd0000"/><rect y="10.66" width="24" height="5.34" fill="#ffce00"/></svg>)
    case 'es': return (<svg {...box}><rect width="24" height="16" fill="#c60b1e"/><rect y="4" width="24" height="8" fill="#ffc400"/></svg>)
    case 'fr': return (<svg {...box}><rect width="8" height="16" fill="#0055a4"/><rect x="8" width="8" height="16" fill="#fff"/><rect x="16" width="8" height="16" fill="#ef4135"/></svg>)
    case 'it': return (<svg {...box}><rect width="8" height="16" fill="#009246"/><rect x="8" width="8" height="16" fill="#fff"/><rect x="16" width="8" height="16" fill="#ce2b37"/></svg>)
    case 'pl': return (<svg {...box}><rect width="24" height="8" fill="#fff"/><rect y="8" width="24" height="8" fill="#dc143c"/></svg>)
    case 'no': return (<svg {...box}><rect width="24" height="16" fill="#ba0c2f"/><rect x="6" width="4" height="16" fill="#fff"/><rect y="6" width="24" height="4" fill="#fff"/><rect x="7" width="2" height="16" fill="#00205b"/><rect y="7" width="24" height="2" fill="#00205b"/></svg>)
    case 'en': return (<svg {...box}><rect width="24" height="16" fill="#012169"/><path d="M0 0l24 16M24 0L0 16" stroke="#fff" strokeWidth="3.2"/><path d="M0 0l24 16M24 0L0 16" stroke="#c8102e" strokeWidth="1.6"/><rect x="9.5" width="5" height="16" fill="#fff"/><rect y="5.5" width="24" height="5" fill="#fff"/><rect x="10.5" width="3" height="16" fill="#c8102e"/><rect y="6.5" width="24" height="3" fill="#c8102e"/></svg>)
    default: return (<svg {...box}><rect width="24" height="16" fill="#6d8b5f"/></svg>)
  }
}

// The Google "G" in its four brand colours, for the sign-in button.
function GoogleG({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
    </svg>
  )
}

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

const PHOTO_AREAS = ['EAR', 'PAW', 'SKIN', 'COAT', 'EYE', 'STOOL', 'OTHER']

// Species shapes what we track and how we talk about it. Copy is translated at
// render time via t(); these are the English keys.
const SPECIES = {
  DOG: {
    label: 'Dog',
    intro: 'PetPattern will focus on food changes, stool, scratching, vomiting and energy.',
    cta: 'Start my dog’s memory'
  },
  CAT: {
    label: 'Cat',
    intro: 'PetPattern will focus on litter box changes, appetite, hiding, water, vomiting and weight.',
    cta: 'Start my cat’s memory'
  }
}

function isCat(pet) {
  return (pet?.species || 'DOG') === 'CAT'
}

// Carry a steady level forward, falling back to NORMAL when it was unknown.
function keep(level) {
  return level && level !== 'UNKNOWN' ? level : 'NORMAL'
}

// A fresh check-in seeded only with the fields that species actually tracks, so a
// cat never carries dog signals (scratching/stool) and vice-versa.
function emptyCheckInFor(species) {
  const base = { checkInDate: today, appetiteLevel: 'NORMAL', waterLevel: 'NORMAL', energyLevel: 'NORMAL', vomiting: false, freeTextNote: '' }
  if (species === 'CAT') {
    return { ...base, litterBoxUse: 'NORMAL', urinationChange: 'NORMAL', straining: false, hidingBehavior: 'NORMAL', weightConcern: false }
  }
  return { ...base, itchingScore: 2, stoolState: 'NORMAL', earRedness: false }
}

function App() {
  const [pets, setPets] = useState([])
  const [selectedPetId, setSelectedPetId] = useState(null)
  const [overview, setOverview] = useState(null)
  const [checkIns, setCheckIns] = useState([])
  const [foodLogs, setFoodLogs] = useState([])
  const [patterns, setPatterns] = useState([])
  const [photos, setPhotos] = useState([])
  const [foodTrials, setFoodTrials] = useState([])
  const [recap, setRecap] = useState(null)
  const [medications, setMedications] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState(hashView())
  const [checkInForm, setCheckInForm] = useState(emptyCheckIn)
  const [foodForm, setFoodForm] = useState(emptyFood)
  const [selectedPattern, setSelectedPattern] = useState(null)
  const [timeline, setTimeline] = useState(null)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [vetSummary, setVetSummary] = useState(null)
  const [vetLoading, setVetLoading] = useState(false)
  const [vetDays, setVetDays] = useState(30)
  const [lang, setLangState] = useState(() => loadLang())
  const [owner, setOwner] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [invites, setInvites] = useState([])
  // Whether the "Load Bella demo" button is offered. Comes from the public
  // /config so we never show a demo button that would just 404 when the demo
  // seed is turned off in production.
  const [demoEnabled, setDemoEnabled] = useState(true)
  // Whether "Continue with Google" is offered — only when the backend has Google
  // OAuth configured (env-driven), so the button never leads to a 404.
  const [googleEnabled, setGoogleEnabled] = useState(false)
  // Captured once from the URL on load. Held in state (not re-derived each render)
  // so ResetPasswordView can strip the token from the URL without the view being
  // dropped when other state (the auth check) updates.
  const [resetToken, setResetToken] = useState(() => resetTokenFromHash())

  function switchLang(next) {
    setLang(next)
    persistLang(next)
    setLangState(next)
  }

  const selectedPet = useMemo(() => {
    return overview?.pet ?? pets.find((pet) => pet.id === selectedPetId)
  }, [overview, pets, selectedPetId])

  const latestCheckIn = overview?.latestCheckIn ?? checkIns[0]
  const currentFood = overview?.currentFood ?? foodLogs[0]
  // The overview list is already active-only; never let a dismissed pattern
  // surface on Bella today.
  const topPattern = overview?.patterns?.[0] ?? patterns.find((pattern) => !isDismissedStatus(pattern.status))

  useEffect(() => {
    const onHashChange = () => setView(hashView())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Funnel analytics: fire once when the patterns / vet-summary views are opened
  // (keyed on `view`, so it doesn't re-fire on every render). No pet or health
  // detail is ever sent — only the event name. See analytics.js.
  useEffect(() => {
    if (view === 'patterns') track('pattern_viewed')
    else if (view === 'vet') track('vet_summary_viewed')
  }, [view])

  useEffect(() => {
    // A 401 anywhere (e.g. an expired session) drops back to the login screen.
    setUnauthorizedHandler(() => setOwner(null))
    checkAuth()
    // Public config — currently just whether the demo seed is available. A failure
    // leaves the button shown (the seed endpoint still guards itself), so this is
    // best-effort and never blocks sign-in.
    api.config().then((cfg) => {
      if (cfg && typeof cfg.demoEnabled === 'boolean') setDemoEnabled(cfg.demoEnabled)
      if (cfg && typeof cfg.googleLoginEnabled === 'boolean') setGoogleEnabled(cfg.googleLoginEnabled)
    }).catch(() => {})
  }, [])

  async function checkAuth() {
    try {
      const current = await api.me()
      setOwner(current)
      await loadInitial()
    } catch (err) {
      setOwner(null)
    } finally {
      setAuthChecked(true)
      setLoading(false)
    }
  }

  async function afterSignedIn(current) {
    setOwner(current)
    setAuthChecked(true)
    // Fresh session — clear any previous owner's data before loading.
    setSelectedPetId(null)
    setOverview(null)
    await loadInitial()
  }

  async function logout() {
    try {
      await api.logout()
    } catch (err) {
      // ignore — clear locally regardless
    }
    setOwner(null)
    setPets([])
    setSelectedPetId(null)
    setOverview(null)
    setCheckIns([])
    setFoodLogs([])
    setPatterns([])
    setPhotos([])
    setFoodTrials([])
    setRecap(null)
    go('today')
  }

  // After the account (and all its data) is deleted, drop cleanly to the sign-in
  // screen — same local reset as logout, but the server already ended the session.
  function afterAccountDeleted() {
    setOwner(null)
    setPets([])
    setSelectedPetId(null)
    setOverview(null)
    setCheckIns([])
    setFoodLogs([])
    setPatterns([])
    setPhotos([])
    setFoodTrials([])
    setRecap(null)
    setInvites([])
    go('today')
  }

  useEffect(() => {
    if (selectedPetId) {
      loadPetData(selectedPetId)
    }
  }, [selectedPetId])

  // Handle direct hash loads / reloads of the detail views.
  useEffect(() => {
    if (!selectedPet) return
    if (view === 'vet' && !vetSummary && !vetLoading) {
      openVetSummary(vetDays)
    }
    if (view === 'timeline' && !selectedPattern && !timelineLoading && !timeline) {
      go('patterns')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedPet])

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
      loadMyInvites()
    } catch (err) {
      setError('Backend is not reachable yet. Wait a moment, then refresh.')
    } finally {
      setLoading(false)
    }
  }

  async function loadMyInvites() {
    try {
      setInvites(await api.myInvites())
    } catch (err) {
      // invites are a soft, secondary signal — never block the app on them
    }
  }

  async function acceptInvite(inviteId) {
    setError('')
    try {
      const pet = await api.acceptInvite(inviteId)
      const nextPets = await api.listPets()
      setPets(nextPets)
      setSelectedPetId(pet.id)
      await loadMyInvites()
      go('today')
    } catch (err) {
      setError(err.message || 'Could not accept the invite.')
    }
  }

  async function declineInvite(inviteId) {
    setError('')
    try {
      await api.declineInvite(inviteId)
      await loadMyInvites()
    } catch (err) {
      setError(err.message || 'Could not decline the invite.')
    }
  }

  // A caregiver stepped away from a pet — drop it from the list and reselect.
  async function leftPet() {
    setError('')
    try {
      const nextPets = await api.listPets()
      setPets(nextPets)
      setSelectedPetId(nextPets[0]?.id ?? null)
      setOverview(null)
    } catch (err) {
      // ignore — worst case the pet reappears on next load
    }
    go('today')
  }

  async function loadPetData(petId) {
    setError('')
    try {
      const [nextOverview, nextCheckIns, nextFoodLogs, nextPatterns, nextPhotos, nextTrials, nextRecap, nextMeds] = await Promise.all([
        api.getOverview(petId),
        api.listCheckIns(petId),
        api.listFoodLogs(petId),
        api.listPatterns(petId),
        api.listPhotos(petId),
        api.listFoodTrials(petId),
        api.getRecap(petId, 30),
        api.listMedications(petId)
      ])
      setOverview(nextOverview)
      setCheckIns(nextCheckIns)
      setFoodLogs(nextFoodLogs)
      setPatterns(nextPatterns)
      setPhotos(nextPhotos)
      setFoodTrials(nextTrials)
      setRecap(nextRecap)
      setMedications(nextMeds)
      // Switching pets invalidates any open detail view.
      setSelectedPattern(null)
      setTimeline(null)
      setVetSummary(null)
    } catch (err) {
      setError('Could not load pet history. Check the backend logs.')
    }
  }

  async function openTimeline(pattern) {
    if (!pattern || !selectedPet) return
    setSelectedPattern(pattern)
    setTimeline(null)
    setError('')
    go('timeline')
    setTimelineLoading(true)
    try {
      let data
      try {
        data = await api.patternTimeline(selectedPet.id, pattern.id)
      } catch (innerErr) {
        // Fallback for clients/proxies that dislike the id in the path.
        data = await api.patternTimelineByType(selectedPet.id, pattern.type)
      }
      setTimeline(data)
    } catch (err) {
      setError('Could not load the timeline. Try again in a moment.')
    } finally {
      setTimelineLoading(false)
    }
  }

  async function openVetSummary(days = vetDays) {
    if (!selectedPet) return
    setError('')
    setVetDays(days)
    go('vet')
    setVetLoading(true)
    try {
      const data = await api.vetSummary(selectedPet.id, days)
      setVetSummary(data)
    } catch (err) {
      setError('Could not load the vet summary. Try again in a moment.')
    } finally {
      setVetLoading(false)
    }
  }

  async function setPatternStatus(pattern, status) {
    if (!selectedPet || !pattern) return
    setError('')
    try {
      await api.setPatternStatus(selectedPet.id, pattern.id, status)
      const nextPatterns = await api.listPatterns(selectedPet.id)
      setPatterns(nextPatterns)
      const nextOverview = await api.getOverview(selectedPet.id)
      setOverview(nextOverview)
    } catch (err) {
      setError('Could not update the pattern. Try again in a moment.')
    }
  }

  async function removeCheckIn(item) {
    if (!selectedPet || !item) return
    if (!window.confirm("Delete this day's check-in? This can't be undone.")) return
    setError('')
    try {
      await api.deleteCheckIn(selectedPet.id, item.id)
      await loadPetData(selectedPet.id)
    } catch (err) {
      setError('Could not delete the check-in. Try again in a moment.')
    }
  }

  async function reloadPhotos() {
    if (!selectedPet) return
    try {
      setPhotos(await api.listPhotos(selectedPet.id))
    } catch (err) {
      setError('Could not refresh photos. Try again in a moment.')
    }
  }

  async function removePhoto(photo) {
    if (!selectedPet || !photo) return
    if (!window.confirm(t('Remove this photo? This cannot be undone.'))) return
    setError('')
    try {
      await api.deletePhoto(selectedPet.id, photo.id)
      await reloadPhotos()
    } catch (err) {
      setError('Could not delete the photo. Try again in a moment.')
    }
  }

  async function reloadTrials() {
    if (!selectedPet) return
    try {
      setFoodTrials(await api.listFoodTrials(selectedPet.id))
    } catch (err) {
      setError('Could not refresh trials. Try again in a moment.')
    }
  }

  async function createTrial(payload) {
    if (!selectedPet) return
    setError('')
    try {
      await api.createFoodTrial(selectedPet.id, payload)
      await reloadTrials()
    } catch (err) {
      setError('Could not start the trial. Try again in a moment.')
    }
  }

  async function trialAction(trial, action) {
    if (!selectedPet || !trial) return
    setError('')
    try {
      if (action === 'reintroduce') await api.reintroduceTrial(selectedPet.id, trial.id, {})
      else if (action === 'complete') await api.completeTrial(selectedPet.id, trial.id)
      else if (action === 'abandon') await api.abandonTrial(selectedPet.id, trial.id)
      await reloadTrials()
    } catch (err) {
      setError('Could not update the trial. Try again in a moment.')
    }
  }

  async function removeTrial(trial) {
    if (!selectedPet || !trial) return
    if (!window.confirm(t('Delete this trial? This cannot be undone.'))) return
    setError('')
    try {
      await api.deleteFoodTrial(selectedPet.id, trial.id)
      await reloadTrials()
    } catch (err) {
      setError('Could not delete the trial. Try again in a moment.')
    }
  }

  async function reloadMedications() {
    if (!selectedPet) return
    try {
      setMedications(await api.listMedications(selectedPet.id))
    } catch (err) {
      setError('Could not refresh medications. Try again in a moment.')
    }
  }

  async function createMedication(payload) {
    if (!selectedPet) return
    await api.createMedication(selectedPet.id, payload)
    await reloadMedications()
  }

  async function medicationAction(medication, action) {
    if (!selectedPet || !medication) return
    setError('')
    try {
      if (action === 'stop') {
        await api.stopMedication(selectedPet.id, medication.id)
      } else if (action === 'delete') {
        if (!window.confirm(t('Delete this medication? This cannot be undone.'))) return
        await api.deleteMedication(selectedPet.id, medication.id)
      }
      await reloadMedications()
    } catch (err) {
      setError('Could not update the medication. Try again in a moment.')
    }
  }

  async function removeFoodLog(item) {
    if (!selectedPet || !item) return
    if (!window.confirm("Delete this food entry? This can't be undone.")) return
    setError('')
    try {
      await api.deleteFoodLog(selectedPet.id, item.id)
      await loadPetData(selectedPet.id)
    } catch (err) {
      setError('Could not delete the food entry. Try again in a moment.')
    }
  }

  function editCheckIn(item) {
    if (!item) return
    const shared = {
      checkInDate: item.checkInDate,
      appetiteLevel: item.appetiteLevel ?? 'NORMAL',
      waterLevel: item.waterLevel ?? 'NORMAL',
      energyLevel: item.energyLevel ?? 'NORMAL',
      vomiting: !!item.vomiting,
      freeTextNote: item.freeTextNote ?? ''
    }
    if (isCat(selectedPet)) {
      setCheckInForm({
        ...shared,
        litterBoxUse: item.litterBoxUse ?? 'NORMAL',
        urinationChange: item.urinationChange ?? 'NORMAL',
        straining: !!item.straining,
        hidingBehavior: item.hidingBehavior ?? 'NORMAL',
        weightConcern: !!item.weightConcern
      })
    } else {
      setCheckInForm({
        ...shared,
        // Snap to the nearest even chip the Scratching control renders, so the
        // value is always visibly selected when editing (odd scores can arrive
        // from the AI parse path).
        itchingScore: item.itchingScore == null ? 0 : Math.min(10, Math.round(item.itchingScore / 2) * 2),
        stoolState: item.stoolState ?? 'NORMAL',
        earRedness: !!item.earRedness
      })
    }
    go('check-in')
  }

  function addFoodFromSuggestion(trigger, note) {
    setFoodForm({
      ...emptyFood,
      dateStarted: today,
      foodKind: trigger?.foodKind ?? 'TREAT',
      primaryProtein: trigger?.primaryProtein ?? 'CHICKEN',
      newFood: true,
      notes: trigger?.description ?? note ?? ''
    })
    go('food')
  }

  async function signIn(email, password) {
    const current = await api.login({ email, password })
    await afterSignedIn(current)
    go('today')
  }

  async function signUp(email, password, displayName, acceptedTerms) {
    const current = await api.register({ email, password, displayName, acceptedTerms })
    track('registered')
    await afterSignedIn(current)
    go('today')
  }

  async function signInDemo() {
    await api.seedDemo()
    await afterSignedIn(await api.me())
    go('today')
  }

  async function loadDemo() {
    setError('')
    setSaving(true)
    try {
      await signInDemo()
    } catch (err) {
      setError(t('Demo could not load. Try again in a moment.'))
    } finally {
      setSaving(false)
    }
  }

  // Used by the species-specific onboarding flow. Returns the created pet (or
  // throws, so the onboarding component can show its own inline error).
  async function createPetFromOnboarding(payload) {
    const pet = await api.createPet(payload)
    track('pet_created')
    const nextPets = await api.listPets()
    setPets(nextPets)
    // Deliberately don't select yet — the onboarding shows its "ready" step first,
    // then finishOnboarding() selects the pet and navigates.
    return pet
  }

  // Open a fresh daily check-in seeded for the selected pet's species.
  function openCheckIn() {
    setCheckInForm(emptyCheckInFor(selectedPet?.species))
    go('check-in')
  }

  // Leaving onboarding: select the new pet and go where they chose.
  function finishOnboarding(pet, where) {
    setSelectedPetId(pet.id)
    if (where === 'check-in') {
      setCheckInForm(emptyCheckInFor(pet.species))
      go('check-in')
    } else {
      go('today')
    }
  }

  async function saveCheckIn(event) {
    event.preventDefault()
    if (!selectedPet) return
    setError('')
    setSaving(true)
    try {
      await api.saveCheckIn(selectedPet.id, checkInForm)
      track('checkin_created')
      setCheckInForm(emptyCheckInFor(selectedPet.species))
      await loadPetData(selectedPet.id)
      go('today')
    } catch (err) {
      setError("Could not save today's check-in.")
    } finally {
      setSaving(false)
    }
  }

  async function quickLog() {
    if (!selectedPet) return
    setError('')
    setSaving(true)
    try {
      const base = latestCheckIn
      const cat = isCat(selectedPet)
      let payload
      if (!base) {
        payload = emptyCheckInFor(selectedPet.species)
      } else if (cat) {
        payload = {
          checkInDate: today,
          appetiteLevel: keep(base.appetiteLevel),
          waterLevel: keep(base.waterLevel),
          energyLevel: keep(base.energyLevel),
          // Steady signals carry over; acute flags start clean each day.
          litterBoxUse: keep(base.litterBoxUse),
          urinationChange: keep(base.urinationChange),
          hidingBehavior: keep(base.hidingBehavior),
          straining: false,
          weightConcern: false,
          vomiting: false,
          freeTextNote: ''
        }
      } else {
        payload = {
          checkInDate: today,
          itchingScore: base.itchingScore ?? 2,
          stoolState: keep(base.stoolState),
          appetiteLevel: keep(base.appetiteLevel),
          waterLevel: keep(base.waterLevel),
          energyLevel: keep(base.energyLevel),
          // Acute flags are never carried forward — a quiet day starts clean.
          vomiting: false,
          earRedness: false,
          freeTextNote: ''
        }
      }
      await api.saveCheckIn(selectedPet.id, payload)
      track('checkin_created')
      await loadPetData(selectedPet.id)
    } catch (err) {
      setError("Couldn't save today's quick log. Try again in a moment.")
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

  // A shared vet link opens read-only, before (and instead of) the login gate.
  const sharedToken = sharedTokenFromHash()
  if (sharedToken) {
    return <SharedVetView token={sharedToken} />
  }

  // A password-reset link (from the email) opens before the login gate.
  if (resetToken) {
    return (
      <ResetPasswordView
        token={resetToken}
        lang={lang}
        onLangChange={switchLang}
        onDone={() => { setResetToken(null); window.location.hash = '' }}
      />
    )
  }

  // Legal pages are public — reachable before signing in (and from registration).
  const legalSection = legalFromHash()
  if (legalSection) {
    return (
      <LegalView
        section={legalSection}
        lang={lang}
        onLangChange={switchLang}
        onBack={() => { if (window.history.length > 1) window.history.back(); else { window.location.hash = '' } }}
      />
    )
  }

  if (!authChecked) {
    return (
      <div className="center-shell">
        <div className="loading-panel">{t('Just a moment…')}</div>
      </div>
    )
  }

  if (!owner) {
    return <AuthScreen lang={lang} onLangChange={switchLang} onLogin={signIn} onRegister={signUp} onDemo={signInDemo} demoEnabled={demoEnabled} googleEnabled={googleEnabled} />
  }

  if (loading) {
    return (
      <div className="center-shell">
        <div className="loading-panel">{t('Just a moment…')}</div>
      </div>
    )
  }

  // Account/settings is a standalone screen (not a nav tab) so it works even for
  // an owner with no pets.
  if (view === 'account') {
    return <AccountView owner={owner} onBack={() => go('today')} onDeleted={afterAccountDeleted} />
  }

  if (!selectedPet) {
    return (
      <div className="onboard-shell">
        <main className="onboard-panel">
          <div className="brand-line">
            <span className="brand-mark"><BrandMark size={20} /></span>
            <strong>PetPattern</strong>
            <LangToggle lang={lang} onChange={switchLang} />
            <button className="text-button" type="button" onClick={() => go('account')} title={t('Account')}>
              <Settings size={16} /> {t('Account')}
            </button>
            <button className="text-button logout-button" type="button" onClick={logout} title={owner?.email}>
              <LogOut size={16} /> {t('Sign out')}
            </button>
          </div>
          {invites.length > 0 && (
            <InvitesBanner invites={invites} onAccept={acceptInvite} onDecline={declineInvite} />
          )}
          <PetOnboarding
            onCreate={createPetFromOnboarding}
            onFinish={finishOnboarding}
            onDemo={loadDemo}
            demoBusy={saving}
            demoEnabled={demoEnabled}
          />
          {error && <div className="error-box" role="alert">{error}</div>}
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="brand-line">
          <span className="brand-mark"><BrandMark size={18} /></span>
          <strong>PetPattern</strong>
          <LangToggle lang={lang} onChange={switchLang} />
          <button className="text-button" type="button" onClick={() => go('account')} title={t('Account')}>
            <Settings size={16} /> {t('Account')}
          </button>
          <button className="text-button logout-button" type="button" onClick={logout} title={owner?.email}>
            <LogOut size={16} /> {t('Sign out')}
          </button>
        </div>
        <div className="pet-tabs">
          {pets.map((pet) => (
            <button key={pet.id} className={pet.id === selectedPetId ? 'pet-tab active' : 'pet-tab'} type="button" onClick={() => setSelectedPetId(pet.id)}>
              {pet.name}
            </button>
          ))}
          <button className="pet-tab add-pet-tab" type="button" onClick={() => go('add-pet')}>
            <Plus size={15} /> {t('Add pet')}
          </button>
        </div>
      </header>

      {invites.length > 0 && (
        <InvitesBanner invites={invites} onAccept={acceptInvite} onDecline={declineInvite} />
      )}

      <nav className="view-tabs" aria-label="PetPattern sections">
        <Tab active={view === 'today'} onClick={() => go('today')} icon={<PawPrint size={17} />} label={t('{name} today', { name: selectedPet.name })} />
        <Tab active={view === 'check-in' || view === 'photos'} onClick={openCheckIn} icon={<ClipboardList size={17} />} label={t('Log today')} />
        <Tab active={view === 'food' || view === 'trial'} onClick={() => go('food')} icon={<Utensils size={17} />} label={t('Food change')} />
        <Tab active={view === 'patterns' || view === 'timeline' || view === 'recap'} onClick={() => go('patterns')} icon={<Activity size={17} />} label={t('Patterns')} />
        <Tab active={view === 'vet'} onClick={() => openVetSummary()} icon={<Stethoscope size={17} />} label={t('Vet summary')} />
      </nav>

      <main className="screen">
        {error && <div className="error-box" role="alert">{error}</div>}

        {view === 'check-in' && (
          <CheckInView
            pet={selectedPet}
            form={checkInForm}
            setForm={setCheckInForm}
            saving={saving}
            onBack={() => go('today')}
            onSave={saveCheckIn}
            onAddFood={addFoodFromSuggestion}
            onAddPhoto={() => go('photos')}
            onAddMedication={() => go('medications')}
          />
        )}

        {view === 'food' && (
          <FoodView
            pet={selectedPet}
            form={foodForm}
            setForm={setFoodForm}
            saving={saving}
            foodLogs={foodLogs}
            onBack={() => go('today')}
            onSave={saveFood}
            onDeleteFood={removeFoodLog}
            onTrial={() => go('trial')}
          />
        )}

        {view === 'patterns' && (
          <PatternsView
            pet={selectedPet}
            patterns={patterns}
            recap={recap}
            onBack={() => go('today')}
            onShowTimeline={openTimeline}
            onSetStatus={setPatternStatus}
            onRecap={() => go('recap')}
            onVetSummary={() => openVetSummary()}
          />
        )}

        {view === 'timeline' && (
          <TimelineView
            pet={selectedPet}
            pattern={selectedPattern}
            timeline={timeline}
            loading={timelineLoading}
            photos={photos}
            onBack={() => go('patterns')}
            onVetSummary={() => openVetSummary()}
            onTrial={() => go('trial')}
          />
        )}

        {view === 'photos' && (
          <PhotosView
            pet={selectedPet}
            photos={photos}
            onBack={() => go('today')}
            onUploaded={reloadPhotos}
            onDeletePhoto={removePhoto}
          />
        )}

        {view === 'trial' && (
          <TrialsView
            pet={selectedPet}
            trials={foodTrials}
            onBack={() => go('today')}
            onCreate={createTrial}
            onAction={trialAction}
            onDelete={removeTrial}
          />
        )}

        {view === 'recap' && (
          <RecapView pet={selectedPet} recap={recap} onBack={() => go('today')} onVetSummary={() => openVetSummary()} />
        )}

        {view === 'medications' && (
          <MedicationsView
            pet={selectedPet}
            medications={medications}
            onBack={() => go('today')}
            onCreate={createMedication}
            onAction={medicationAction}
          />
        )}

        {view === 'caregivers' && (
          <CaregiversView key={selectedPet.id} pet={selectedPet} onBack={() => go('today')} onLeft={leftPet} />
        )}

        {view === 'add-pet' && (
          <PetOnboarding
            onCreate={createPetFromOnboarding}
            onFinish={finishOnboarding}
            onCancel={() => go('today')}
          />
        )}

        {view === 'vet' && (
          <VetSummaryView
            pet={selectedPet}
            summary={vetSummary}
            loading={vetLoading}
            days={vetDays}
            onBack={() => go('today')}
            onChangeDays={openVetSummary}
            onMedications={() => go('medications')}
          />
        )}

        {view === 'today' && (
          <TodayView
            pet={selectedPet}
            overview={overview}
            latestCheckIn={latestCheckIn}
            currentFood={currentFood}
            topPattern={topPattern}
            checkIns={checkIns}
            onLogToday={openCheckIn}
            onFoodChange={() => go('food')}
            onPatterns={() => go('patterns')}
            onShowTimeline={openTimeline}
            onVetSummary={() => openVetSummary()}
            onEditCheckIn={editCheckIn}
            onDeleteCheckIn={removeCheckIn}
            onQuickLog={quickLog}
            onCaregivers={() => go('caregivers')}
          />
        )}
      </main>
    </div>
  )
}

function TodayView({ pet, overview, latestCheckIn, currentFood, topPattern, checkIns, onLogToday, onFoodChange, onPatterns, onShowTimeline, onVetSummary, onEditCheckIn, onDeleteCheckIn, onQuickLog, onCaregivers }) {
  return (
    <>
      <section className="today-spine">
        <div className="today-copy">
          <p className="kicker">{t('{name} today', { name: pet.name })}</p>
          <h1>{todayHeadline(pet, overview, topPattern, latestCheckIn)}</h1>
          <p>{overview?.todayExplanation ?? `${pet.name} is ready for a first check-in.`}</p>
          {overview?.goodNews && (
            <p className="moment good">{overview.goodNews}</p>
          )}
          {overview?.watchOut && (
            <p className="moment watch">{overview.watchOut}</p>
          )}
          <div className="action-row">
            <button className="primary-button" type="button" onClick={onLogToday}>
              <ClipboardList size={18} /> {t('Log today')}
            </button>
            <button className="secondary-button" type="button" onClick={onFoodChange}>
              <Utensils size={18} /> {t('Add food change')}
            </button>
            <button className="ghost-button" type="button" onClick={onVetSummary}>
              <Stethoscope size={18} /> {t('Bring this to your vet')}
            </button>
          </div>
        </div>

        <div className={`state-panel ${overview?.todayStatus ?? 'changed'}`}>
          <span>{statusLabel(overview?.todayStatus, pet.name)}</span>
          <strong>{overview?.nextAction ?? t('Log today')}</strong>
        </div>
      </section>

      <RetentionStrip pet={pet} retention={overview?.retention} checkInCount={checkIns.length} onLogToday={onLogToday} onQuickLog={onQuickLog} />

      <section className="home-grid">
        <article className="panel">
          <div className="panel-heading">
            <HeartPulse size={18} />
            <h2>{t('Recent signals')}</h2>
          </div>
          <div className="signal-list">
            {isCat(pet) ? (
              <>
                <Signal label={t('Litter box')} value={litterLabel(latestCheckIn?.litterBoxUse)} tone={['LESS', 'MORE', 'NONE'].includes(latestCheckIn?.litterBoxUse) ? 'watch' : 'calm'} />
                <Signal label={t('Appetite')} value={levelLabel(latestCheckIn?.appetiteLevel)} tone={latestCheckIn?.appetiteLevel === 'LOWER' || latestCheckIn?.appetiteLevel === 'REFUSED' ? 'watch' : 'calm'} />
                <Signal label={t('Water')} value={levelLabel(latestCheckIn?.waterLevel)} tone={latestCheckIn?.waterLevel === 'LOWER' || latestCheckIn?.waterLevel === 'HIGHER' ? 'watch' : 'calm'} />
                <Signal label={t('Hiding')} value={hidingLabel(latestCheckIn?.hidingBehavior)} tone={latestCheckIn?.hidingBehavior === 'MORE' ? 'watch' : 'calm'} />
                <Signal label={t('Energy')} value={levelLabel(latestCheckIn?.energyLevel)} tone={latestCheckIn?.energyLevel === 'LOW' || latestCheckIn?.energyLevel === 'RESTLESS' ? 'watch' : 'calm'} />
              </>
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

      <RecentTimeline pet={pet} checkIns={checkIns} onEdit={onEditCheckIn} onDelete={onDeleteCheckIn} />

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

function CheckInView({ pet, form, setForm, saving, onBack, onSave, onAddFood, onAddPhoto, onAddMedication }) {
  const [note, setNote] = useState(form.freeTextNote || '')
  const [suggestion, setSuggestion] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [applied, setApplied] = useState(false)

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
    setForm(next)
    setApplied(true)
  }

  const cat = isCat(pet)

  return (
    <section className="flow-panel">
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> {t('Back')}</button>
      <p className="kicker">{t('Daily check-in')}</p>
      <h1>{t('How was {name} today?', { name: pet.name })}</h1>
      <p className="lead">{t('A few seconds a day builds {name}\'s record, so changes are easy to spot later.', { name: pet.name })}</p>
      <p className="reassure">
        {cat
          ? t('Only log what you noticed. Cats hide changes, so small notes can help.')
          : t('Only log what you noticed. A quick check-in is enough.')}
      </p>

      <form className="quick-form" onSubmit={onSave}>
        <label className="field-label">
          {t('Date')}
          <input type="date" value={form.checkInDate} max={today} onChange={(e) => setForm({ ...form, checkInDate: e.target.value })} />
        </label>

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
              {cat
                ? t('Write naturally — a note is often the most useful thing for a cat.')
                : t('Write naturally — PetPattern can suggest fields, but you stay in control.')}
            </p>
            <textarea
              placeholder={cat
                ? t('e.g. {name} used the litter box less today, hid under the bed, and ate about half a meal.', { name: pet.name })
                : t('e.g. {name} scratched a lot today, stool was softer, ate normally, and we gave a new chicken treat yesterday.', { name: pet.name })}
              value={note}
              onChange={(e) => updateNote(e.target.value)}
            />
            {!cat && (
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
            <Pill size={18} /> {t('Add a medication or treatment')}
          </button>
        </details>

        <button className="primary-button wide" type="submit" disabled={saving}>
          <Check size={18} /> {t('Save today')}
        </button>
      </form>
    </section>
  )
}

function SuggestionPreview({ suggestion, applied, onApply, onAddFood }) {
  const chips = []
  if (suggestion.itchingScore != null) chips.push(`Itching ${suggestion.itchingScore}/10`)
  if (suggestion.stoolState && suggestion.stoolState !== 'UNKNOWN') chips.push(`Stool ${titleCase(suggestion.stoolState)}`)
  if (suggestion.appetiteLevel && suggestion.appetiteLevel !== 'UNKNOWN') chips.push(`Appetite ${titleCase(suggestion.appetiteLevel)}`)
  if (suggestion.waterLevel && suggestion.waterLevel !== 'UNKNOWN') chips.push(`Water ${titleCase(suggestion.waterLevel)}`)
  if (suggestion.energyLevel && suggestion.energyLevel !== 'UNKNOWN') chips.push(`Energy ${titleCase(suggestion.energyLevel)}`)
  if (suggestion.vomiting) chips.push('Vomiting')
  if (suggestion.earRedness) chips.push('Ear redness')

  const trigger = suggestion.possibleFoodTrigger

  return (
    <div className="suggestion">
      <div className="suggestion-top">
        <strong>{t('Suggested fields')}</strong>
        <span className={`confidence ${String(suggestion.confidence || 'low').toLowerCase()}`}>{confidenceLabel(suggestion.confidence || 'low')}</span>
      </div>
      <p className="muted">{t("Nothing's saved until you tap Save today.")}</p>

      {chips.length > 0 ? (
        <div className="chip-row">
          {chips.map((chip) => <span className="chip" key={chip}>{chip}</span>)}
        </div>
      ) : (
        <p className="muted">{t('No clear fields detected. Fill them in below.')}</p>
      )}

      {trigger && (trigger.primaryProtein || trigger.foodKind) && (
        <div className="food-callout">
          <span>{t('Possible food change spotted:')} <strong>{trigger.description || [trigger.primaryProtein, trigger.foodKind].filter(Boolean).map(titleCase).join(' ')}</strong></span>
          <button className="text-button" type="button" onClick={onAddFood}>
            {t('Add as food change')} <ChevronRight size={16} />
          </button>
        </div>
      )}

      {suggestion.warnings?.length > 0 && (
        <ul className="warning-list">
          {suggestion.warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      )}

      <button className="primary-button" type="button" onClick={onApply}>
        {applied ? <><Check size={16} /> {t('Suggestions applied')}</> : t('Use these suggestions')}
      </button>
    </div>
  )
}

function FoodView({ pet, form, setForm, saving, foodLogs, onBack, onSave, onDeleteFood, onTrial }) {
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
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> {t('Back')}</button>
      <p className="kicker">{t('Food exposure')}</p>
      <h1>{t("What changed in {name}'s food?", { name: pet.name })}</h1>
      <p className="lead">{t('Food changes often matter more than they seem. Track the first day {name} ate it.', { name: pet.name })}</p>

      <form className="quick-form" onSubmit={onSave}>
        <QuickChoices
          label={t('Food kind')}
          value={form.foodKind}
          options={[
            { value: 'MAIN_FOOD', label: t('Main food') },
            { value: 'TREAT', label: t('Treat') },
            { value: 'SUPPLEMENT', label: t('Supplement') },
            { value: 'OTHER', label: t('Other') }
          ]}
          onChange={(foodKind) => setForm({ ...form, foodKind })}
        />

        <div className="two-fields">
          <label className="field-label">
            {t('Brand')}
            <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          </label>
          <label className="field-label">
            {t('Product')}
            <input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} />
          </label>
        </div>

        <QuickChoices
          label={t('Primary protein')}
          value={form.primaryProtein}
          options={proteinOptions.map((value) => ({ value, label: proteinLabel(value) }))}
          onChange={(primaryProtein) => setForm({ ...form, primaryProtein })}
        />

        <div className="choice-block">
          <span>{t('Secondary proteins')}</span>
          <div className="choice-grid">
            {proteinOptions.filter((protein) => protein !== form.primaryProtein).map((protein) => (
              <button key={protein} type="button" aria-pressed={form.secondaryProteins.includes(protein)} className={form.secondaryProteins.includes(protein) ? 'choice-button active' : 'choice-button'} onClick={() => toggleSecondary(protein)}>
                {proteinLabel(protein)}
              </button>
            ))}
          </div>
        </div>

        <div className="toggle-grid">
          <ToggleButton active={form.grainFree} label={t('Grain-free')} onClick={() => setForm({ ...form, grainFree: !form.grainFree })} />
          <ToggleButton active={form.newFood} label={t('New food')} onClick={() => setForm({ ...form, newFood: !form.newFood })} />
        </div>

        <label className="field-label">
          {t('Date started')}
          <input type="date" value={form.dateStarted} onChange={(e) => setForm({ ...form, dateStarted: e.target.value })} />
        </label>

        <label className="field-label">
          {t('Notes')}
          <textarea placeholder={t('First serving, treat size, reason for the change…')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </label>

        <button className="primary-button wide" type="submit" disabled={saving}>
          <Check size={18} /> {t('Save food change')}
        </button>
      </form>

      {foodLogs?.length > 0 && (
        <div className="food-history">
          <p className="form-section-label">{t('Recent food changes')}</p>
          <ul className="food-history-list">
            {foodLogs.slice(0, 8).map((food) => (
              <li key={food.id}>
                <div className="food-history-main">
                  <strong>{formatDate(food.dateStarted)}</strong>{' '}
                  {[food.brand, food.productName].filter(Boolean).join(' - ') || foodKindLabel(food.foodKind)}
                  <span className="muted"> · {proteinLabel(food.primaryProtein)}{food.newFood ? ' · new' : ''}</span>
                </div>
                <button className="icon-button danger" type="button" aria-label={`Delete food entry from ${formatDate(food.dateStarted)}`} onClick={() => onDeleteFood(food)}>
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="context-cta">
        <p className="muted">{t("Wondering if a food doesn't sit well? You can remove one ingredient for a few weeks and watch.")}</p>
        <button className="secondary-button" type="button" onClick={onTrial}>
          <FlaskConical size={18} /> {t('Track a careful food trial')}
        </button>
      </div>
    </section>
  )
}

function PatternsView({ pet, patterns, recap, onBack, onShowTimeline, onSetStatus, onRecap, onVetSummary }) {
  const active = patterns.filter((pattern) => patternGroup(pattern) === 'active')
  const settled = patterns.filter((pattern) => patternGroup(pattern) === 'settled')
  const dismissed = patterns.filter((pattern) => patternGroup(pattern) === 'dismissed')

  return (
    <section className="flow-panel">
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> {t('Back')}</button>
      <p className="kicker">{t('What changed?')}</p>
      <h1>{t('Possible patterns for {name}', { name: pet.name })}</h1>
      <p className="lead">{t('These cards are generated from stored check-ins and food logs. They are cautious prompts for better tracking and vet conversations.')}</p>

      {recap && recap.daysLogged >= 5 && onRecap && (
        <div className="context-cta">
          <button className="ghost-button" type="button" onClick={onRecap}>
            <CalendarRange size={18} /> {t('See your last 30 days')}
          </button>
        </div>
      )}

      <div className="pattern-list">
        {patterns.length === 0 && (
          <article className="panel">
            <h2>{t('Nothing clearly outside normal yet')}</h2>
            <p className="muted">{t('Keep logging daily signals and food changes. PetPattern gets more useful as the history grows.')}</p>
          </article>
        )}
        {active.map((pattern) => (
          <PatternCard key={pattern.id} pattern={pattern} variant="active" onShowTimeline={onShowTimeline} onSetStatus={onSetStatus} />
        ))}
      </div>

      {settled.length > 0 && (
        <>
          <p className="kicker section-divider">{t('Settled — not seen recently')}</p>
          <div className="pattern-list">
            {settled.map((pattern) => (
              <PatternCard key={pattern.id} pattern={pattern} variant="settled" onShowTimeline={onShowTimeline} onSetStatus={onSetStatus} />
            ))}
          </div>
        </>
      )}

      {dismissed.length > 0 && (
        <>
          <p className="kicker section-divider">{t('Resolved & set aside')}</p>
          <div className="pattern-list">
            {dismissed.map((pattern) => (
              <PatternCard key={pattern.id} pattern={pattern} variant="dismissed" onShowTimeline={onShowTimeline} onSetStatus={onSetStatus} />
            ))}
          </div>
        </>
      )}

      {onVetSummary && (
        <div className="action-row">
          <button className="primary-button" type="button" onClick={onVetSummary}>
            <Stethoscope size={18} /> {t('Bring this to your vet')}
          </button>
        </div>
      )}
    </section>
  )
}

function PatternCard({ pattern, variant, onShowTimeline, onSetStatus }) {
  const meta = statusMeta(pattern.status)
  const muted = variant !== 'active'

  return (
    <article className={muted ? 'panel pattern-card dismissed' : 'panel pattern-card'}>
      <div className="pattern-top">
        <span className={`confidence ${String(pattern.confidence ?? 'low').toLowerCase()}`}>{confidenceLabel(pattern.confidence ?? 'low')}</span>
        {variant === 'settled' && <span className="status-chip calm">{t('Settled')}</span>}
        {variant !== 'settled' && meta.label && <span className={`status-chip ${meta.tone}`}>{meta.label}</span>}
      </div>
      <h2>{pattern.title}</h2>
      {variant === 'settled' ? (
        <p className="memory-line">{settledLine(pattern)}</p>
      ) : (
        memoryLine(pattern) && <p className="memory-line">{memoryLine(pattern)}</p>
      )}
      <p>{pattern.summary}</p>
      {variant === 'active' && pattern.evidence?.length > 0 && (
        <ul className="evidence-list">
          {pattern.evidence.map((line) => <li key={line}>{line}</li>)}
        </ul>
      )}
      {variant === 'active' && (
        <button className="text-button" type="button" onClick={() => onShowTimeline(pattern)}>
          {t('Show what changed')} <ChevronRight size={16} />
        </button>
      )}

      <div className="pattern-actions">
        {variant === 'dismissed' && (
          <button className="chip-button" type="button" onClick={() => onSetStatus(pattern, 'ACKNOWLEDGED')}>{t('Bring back')}</button>
        )}
        {variant === 'settled' && (
          <>
            <button className="chip-button" type="button" onClick={() => onSetStatus(pattern, 'RESOLVED')}>{t('Mark resolved')}</button>
            <button className="chip-button subtle" type="button" onClick={() => onSetStatus(pattern, 'NOT_RELEVANT')}>{t('Not relevant')}</button>
          </>
        )}
        {variant === 'active' && (
          <>
            {pattern.status === 'NEW' && (
              <button className="chip-button" type="button" onClick={() => onSetStatus(pattern, 'ACKNOWLEDGED')}>{t("I'm watching this")}</button>
            )}
            <button className="chip-button" type="button" onClick={() => onSetStatus(pattern, 'SHARED_WITH_VET')}>{t('Told my vet')}</button>
            <button className="chip-button" type="button" onClick={() => onSetStatus(pattern, 'RESOLVED')}>{t('Resolved')}</button>
            <button className="chip-button subtle" type="button" onClick={() => onSetStatus(pattern, 'NOT_RELEVANT')}>{t('Not relevant')}</button>
          </>
        )}
      </div>
    </article>
  )
}

function TimelineView({ pet, pattern, timeline, loading, photos, onBack, onVetSummary, onTrial }) {
  // Covers the loading state and the direct-hash-load case (no selected pattern
  // yet), so the recovery redirect never flashes the empty story panel.
  if ((loading && !timeline) || (!pattern && !timeline)) {
    return (
      <section className="flow-panel">
        <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> {t('Back')}</button>
        <p className="muted">{t("Pulling together {name}'s days…", { name: pet.name })}</p>
      </section>
    )
  }

  const headline = pattern?.title ?? timeline?.patternTitle
  const confidence = pattern?.confidence ?? timeline?.confidence
  const events = timeline?.events ?? []
  const photosByDate = {}
  ;(photos ?? []).forEach((photo) => {
    const key = (photo.capturedDate ?? '').slice(0, 10)
    if (!key) return
    ;(photosByDate[key] = photosByDate[key] || []).push(photo)
  })
  // Show a day's photos only once — on the first event of that day.
  const firstEventIndexByDate = {}
  events.forEach((event, index) => {
    const key = (event.date ?? '').slice(0, 10)
    if (key && firstEventIndexByDate[key] === undefined) firstEventIndexByDate[key] = index
  })

  return (
    <section className="flow-panel">
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> {t('Back')}</button>
      <p className="kicker">{t('What changed?')}</p>
      <h1>{timeline?.title ?? t('What changed before this?')}</h1>
      <p className="lead">{timeline?.subtitle ?? t("PetPattern looks at the days before {name}'s signals changed.", { name: pet.name })}</p>

      {headline && (
        <article className="panel pattern-card">
          <div className="pattern-top">
            {confidence && <span className={`confidence ${String(confidence).toLowerCase()}`}>{confidenceLabel(confidence)}</span>}
            <Activity size={17} />
          </div>
          <h2>{headline}</h2>
          {pattern?.seenBefore && pattern.detectionCount > 1 && (
            <p className="memory-line">{t("You've seen this {n} times since {date}.", { n: pattern.detectionCount, date: formatDate(pattern.firstDetectedAt) })}</p>
          )}
          {timeline?.summary && <p>{timeline.summary}</p>}
          {timeline?.ownerExplanation && <p className="owner-explanation">{timeline.ownerExplanation}</p>}
        </article>
      )}

      {timeline?.empty || events.length === 0 ? (
        <article className="panel">
          <h2>{t('Not enough of a story yet')}</h2>
          <p className="muted">{timeline?.emptyMessage ?? t('There is not enough history yet. Keep logging for a few more days.')}</p>
        </article>
      ) : (
        <div className="story">
          {events.map((event, index) => (
            <div className={`story-row sev-${event.severity ?? 'info'}`} key={`${event.date}-${event.type}-${index}`}>
              <div className="story-rail">
                <span className="story-dot">{timelineIcon(event.type)}</span>
              </div>
              <div className="story-body">
                <span className="story-date">{formatDate(event.date)}</span>
                <strong>{event.title}</strong>
                <p>{event.summary}</p>
                {firstEventIndexByDate[(event.date ?? '').slice(0, 10)] === index
                  && photosByDate[(event.date ?? '').slice(0, 10)]?.length > 0 && (
                  <div className="story-thumbs">
                    {photosByDate[(event.date ?? '').slice(0, 10)].map((photo) => (
                      <img key={photo.id} className="story-thumb" src={photo.imageUrl} alt={photo.caption || photoAreaLabel(photo.area)} loading="lazy" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="action-row">
        <button className="primary-button" type="button" onClick={onVetSummary}>
          <Stethoscope size={18} /> {t('Bring this to your vet')}
        </button>
        {(pattern?.type ?? timeline?.type) === 'POSSIBLE_FOOD_TRIGGER' && onTrial && (
          <button className="secondary-button" type="button" onClick={onTrial}>
            <FlaskConical size={18} /> {t('Track a careful food trial')}
          </button>
        )}
      </div>

      {timeline?.medicalDisclaimer && <p className="disclaimer">{timeline.medicalDisclaimer}</p>}
    </section>
  )
}

function VetSummaryView({ pet, summary, loading, days, onBack, onChangeDays, onMedications }) {
  const [copied, setCopied] = useState(false)

  async function copySummary() {
    if (!summary?.plainText) return
    try {
      await navigator.clipboard.writeText(summary.plainText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch (err) {
      setCopied(false)
    }
  }

  if (loading && !summary) {
    return (
      <section className="flow-panel">
        <button className="back-button no-print" type="button" onClick={onBack}><ArrowLeft size={17} /> {t('Back')}</button>
        <p className="muted">{t("Preparing {name}'s summary…", { name: pet.name })}</p>
      </section>
    )
  }

  if (!summary) {
    return (
      <section className="flow-panel">
        <button className="back-button no-print" type="button" onClick={onBack}><ArrowLeft size={17} /> {t('Back')}</button>
        <p className="muted">{t('No summary yet.')}</p>
      </section>
    )
  }

  return (
    <section className="flow-panel vet-summary">
      <button className="back-button no-print" type="button" onClick={onBack}><ArrowLeft size={17} /> {t('Back')}</button>
      <p className="kicker">{t('Bring this to your vet')}</p>
      <h1>{t('Vet visit summary')}</h1>
      <p className="lead">{t('A calm record of what you logged. Built to help a vet conversation, not to diagnose.')}</p>

      <VetShareCard key={pet.id} pet={pet} />

      <div className="vet-toolbar no-print">
        <div className="day-range">
          {[30, 45, 90].map((option) => (
            <button
              key={option}
              type="button"
              className={days === option ? 'choice-button active' : 'choice-button'}
              onClick={() => onChangeDays(option)}
            >
              {option} {t('days')}
            </button>
          ))}
        </div>
        <div className="vet-actions">
          <button className="secondary-button" type="button" onClick={copySummary}>
            <Copy size={16} /> {copied ? t('Copied') : t('Copy summary')}
          </button>
          <button className="ghost-button" type="button" onClick={() => window.print()}>
            <Printer size={16} /> {t('Save as PDF')}
          </button>
        </div>
      </div>

      <VetSheet summary={summary} onMedications={onMedications} />
    </section>
  )
}

function VetSheet({ summary, onMedications }) {
  const identity = summary.pet
  // Stool is a dog signal; cats track litter box instead, so don't show an
  // all-zero stool block for a cat (their signals surface via patterns + wellbeing).
  const cat = /cat/i.test(identity?.species || '')
  return (
    <div className="vet-sheet">
      <section className="vet-block">
        <h2>{identity?.name}</h2>
        <p className="vet-identity">
          {[identity?.breed, identity?.ageLabel, identity?.sex, identity?.weightKg ? `${identity.weightKg} kg` : null]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <p className="vet-range">{formatLongDate(summary.rangeStart)} – {formatLongDate(summary.rangeEnd)} ({summary.days} {t('days')})</p>
      </section>

      <VetBlock title={t('Owner-observed concern')}>
        <p>{summary.mainConcern}</p>
      </VetBlock>

      <VetBlock title={t('Recent check-in summary')}>
        <p>{summary.checkInSummary?.narrative}</p>
      </VetBlock>

      <VetBlock title={t('Food exposure history')}>
        {summary.foodChanges?.length ? (
          <ul className="vet-list">
            {summary.foodChanges.map((food, index) => (
              <li key={`${food.dateStarted}-${index}`}>
                <strong>{formatDate(food.dateStarted)}</strong> — {food.label}
                <span className="muted"> ({[titleCase(food.foodKind), food.primaryProtein ? titleCase(food.primaryProtein) : null, food.newFood ? 'new food' : null].filter(Boolean).join(', ')})</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t('No food changes logged in this period.')}</p>
        )}
      </VetBlock>

      <VetBlock title={t('Medications & treatments')}>
        {summary.medications?.length ? (
          <ul className="vet-list">
            {summary.medications.map((med, index) => (
              <li key={`${med.name}-${index}`}>
                <strong>{med.name}</strong>
                <span className="muted"> — {formatDate(med.startDate)}{med.ongoing ? ` · ${t('ongoing')}` : ` – ${formatDate(med.endDate)}`}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t('No medications logged in this period.')}</p>
        )}
        {onMedications && (
          <button className="text-button no-print" type="button" onClick={onMedications}>
            {t('Manage medications')} <ChevronRight size={16} />
          </button>
        )}
      </VetBlock>

      {!cat && (
        <VetBlock title={t('Stool changes')}>
          <p>{summary.stoolSummary?.narrative}</p>
          <p className="muted">{t('Normal')}: {summary.stoolSummary?.normalDays} · {t('Soft')}: {summary.stoolSummary?.softDays} · {t('Diarrhea')}: {summary.stoolSummary?.diarrheaDays}</p>
        </VetBlock>
      )}

      {summary.catSignals && (
        <VetBlock title={t('Litter box & behavior')}>
          <p>{summary.catSignals.narrative}</p>
          <p className="muted">
            {t('Litter box changed')}: {summary.catSignals.litterBoxChangedDays} · {t('Not used')}: {summary.catSignals.litterBoxNotUsedDays} · {t('Urination change')}: {summary.catSignals.urinationChangedDays} · {t('Straining')}: {summary.catSignals.strainingDays} · {t('Hiding more')}: {summary.catSignals.hidingMoreDays} · {t('Weight concern')}: {summary.catSignals.weightConcernDays}
          </p>
        </VetBlock>
      )}

      <VetBlock title={t('Water, appetite & energy')}>
        <p>{summary.wellbeing?.narrative}</p>
      </VetBlock>

      <VetBlock title={t('Possible patterns')}>
        {summary.patterns?.length ? (
          <ul className="vet-list">
            {summary.patterns.map((p, index) => (
              <li key={`${p.type}-${index}`}>
                <span className={`confidence ${String(p.confidence).toLowerCase()}`}>{titleCase(p.confidence)}</span>
                <strong> {p.title}</strong>
                <p>{p.summary}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t('Nothing stood out clearly in this period.')}</p>
        )}
      </VetBlock>

      <VetBlock title={t('Notes worth discussing')}>
        {summary.ownerNotes?.length ? (
          <ul className="vet-list">
            {summary.ownerNotes.map((note, index) => (
              <li key={`${note.date}-${index}`}><strong>{formatDate(note.date)}</strong> — {note.note}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t('No free-text notes in this period.')}</p>
        )}
      </VetBlock>

      <p className="disclaimer">{summary.disclaimer}</p>
    </div>
  )
}

function VetShareCard({ pet }) {
  const [status, setStatus] = useState(null)
  const [url, setUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  // Link management is the primary owner's; a caregiver gets 404 on status,
  // so the whole card quietly disappears for them.
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let alive = true
    api.getVetShare(pet.id)
      .then((s) => { if (alive) setStatus(s) })
      .catch(() => { if (alive) setHidden(true) })
    return () => { alive = false }
  }, [pet.id])

  if (hidden) return null

  function linkFor(token) {
    return `${window.location.origin}/#shared=${token}`
  }

  async function createLink() {
    setBusy(true)
    try {
      const s = await api.createVetShare(pet.id)
      setStatus({ active: true, expiresAt: s.expiresAt })
      setUrl(linkFor(s.token))
    } catch (err) {
      // leave as-is
    } finally {
      setBusy(false)
    }
  }

  async function revokeLink() {
    if (!window.confirm(t('Turn off this link? Anyone who has it will lose access.'))) return
    setBusy(true)
    try {
      await api.revokeVetShare(pet.id)
      setStatus({ active: false })
      setUrl('')
    } catch (err) {
      // leave as-is
    } finally {
      setBusy(false)
    }
  }

  async function copyLink() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch (err) {
      setCopied(false)
    }
  }

  return (
    <div className="context-cta no-print vet-share">
      <div className="panel-heading">
        <Share2 size={18} />
        <h2>{t('Share with your vet')}</h2>
      </div>
      <p className="muted">{t('Create a private link to this summary. It is read-only, expires in 90 days, and you can turn it off anytime.')}</p>

      {url && (
        <div className="share-link-row">
          <input className="share-link" readOnly value={url} onFocus={(e) => e.target.select()} />
          <button className="secondary-button" type="button" onClick={copyLink}>
            <Copy size={16} /> {copied ? t('Copied') : t('Copy link')}
          </button>
        </div>
      )}

      <div className="action-row">
        <button className="secondary-button" type="button" onClick={createLink} disabled={busy}>
          <Share2 size={16} /> {status?.active && !url ? t('Create a new link') : t('Create a link')}
        </button>
        {status?.active && (
          <button className="ghost-button" type="button" onClick={revokeLink} disabled={busy}>
            {t('Turn off sharing')}
          </button>
        )}
      </div>
      {status?.active && !url && (
        <p className="muted">{t('A link is active. Create a new one to see and copy it (the old one stops working).')}</p>
      )}
    </div>
  )
}

function SharedVetView({ token }) {
  const [summary, setSummary] = useState(null)
  const [state, setState] = useState('loading')

  useEffect(() => {
    let alive = true
    api.sharedVetSummary(token)
      .then((data) => { if (alive) { setSummary(data); setState('ready') } })
      .catch(() => { if (alive) setState('error') })
    return () => { alive = false }
  }, [token])

  return (
    <div className="app-shell shared-shell">
      <header className="top-bar">
        <div className="brand-line">
          <span className="brand-mark"><BrandMark size={18} /></span>
          <strong>PetPattern</strong>
        </div>
      </header>
      <main className="screen">
        {state === 'loading' && <div className="loading-panel">{t('Just a moment…')}</div>}
        {state === 'error' && (
          <section className="flow-panel">
            <h1>{t('This link is no longer active')}</h1>
            <p className="muted">{t('Ask the owner for a fresh link.')}</p>
          </section>
        )}
        {state === 'ready' && summary && (
          <section className="flow-panel vet-summary">
            <p className="kicker">{t('Shared by the owner')}</p>
            <h1>{t('Vet visit summary')}</h1>
            <p className="lead">{t('A calm record of what the owner logged. Built to help a vet conversation, not to diagnose.')}</p>
            <VetSheet summary={summary} />
          </section>
        )}
      </main>
    </div>
  )
}

function VetBlock({ title, children }) {
  return (
    <section className="vet-block">
      <h3>{title}</h3>
      {children}
    </section>
  )
}

function RetentionStrip({ pet, retention, checkInCount = 0, onLogToday, onQuickLog }) {
  if (!retention) return null
  const { loggedToday, streakDays, daysSinceLastCheckIn, loggedDaysLast30 } = retention
  // Before there are seven days of history, show a calm "build the baseline"
  // progress instead of a streak — it matches how the pattern engine actually
  // needs about a week before it can compare anything, and it never scolds a
  // missed day. Once the baseline exists, the ordinary stats take over.
  const baselineDays = Math.min(checkInCount, 7)
  const baselineBuilt = checkInCount >= 7
  return (
    <section className={baselineBuilt ? 'retention-strip' : 'retention-strip building'}>
      {baselineBuilt ? (
        <div className="retention-stats">
          <div className="retention-stat">
            <Flame size={18} />
            <div><strong>{streakDays}</strong><span>{t('day streak')}</span></div>
          </div>
          <div className="retention-stat">
            <CalendarDays size={18} />
            <div><strong>{loggedDaysLast30}/30</strong><span>{t('days logged')}</span></div>
          </div>
        </div>
      ) : (
        <div className="baseline-hook">
          <div className="baseline-head">
            <CalendarDays size={18} />
            <div className="baseline-copy">
              <strong>{t("Build {name}'s 7-day baseline", { name: pet.name })}</strong>
              <span className="muted">{t('Log only what you noticed. A quick check-in is enough.')}</span>
            </div>
          </div>
          <div className="baseline-track">
            <span className="baseline-dots" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <span key={i} className={i < baselineDays ? 'baseline-dot on' : 'baseline-dot'} />
              ))}
            </span>
            <span className="baseline-count muted">{t('{done} / 7 baseline days', { done: baselineDays })}</span>
          </div>
        </div>
      )}

      <div className={loggedToday ? 'retention-nudge done' : 'retention-nudge todo'}>
        {loggedToday ? (
          <span><Check size={16} /> {streakDays > 1 ? t('Logged today — {n} days in a row.', { n: streakDays }) : t("Logged today — that's a start.")}</span>
        ) : (
          <>
            <span>{nudgeText(pet, daysSinceLastCheckIn)}</span>
            <div className="nudge-actions">
              <button className="primary-button" type="button" onClick={onLogToday}>
                <ClipboardList size={16} /> {t('Log today')}
              </button>
              {onQuickLog && (
                <button className="ghost-button" type="button" onClick={onQuickLog}>
                  {t('No change noticed')}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <ReminderControl pet={pet} loggedToday={loggedToday} />
    </section>
  )
}

function nudgeText(pet, daysSince) {
  if (daysSince == null) return t("Start {name}'s memory with a quick check-in.", { name: pet.name })
  if (daysSince <= 1) return t("Add today's check-in so {name}'s record stays complete.", { name: pet.name })
  return t("It's been {n} days since {name}'s last check-in — a quick log keeps patterns accurate.", { n: daysSince, name: pet.name })
}

function ReminderControl({ pet, loggedToday }) {
  const storageKey = `petpattern.reminder.${pet.id}`
  const [pref, setPref] = useState(() => loadReminder(storageKey))
  const [permission, setPermission] = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )

  useEffect(() => { setPref(loadReminder(storageKey)) }, [storageKey])
  useEffect(() => { saveReminder(storageKey, pref) }, [storageKey, pref])

  useEffect(() => {
    if (!pref.enabled || permission !== 'granted') return undefined
    maybeNotify(pet, pref, loggedToday, storageKey)
    const id = setInterval(() => maybeNotify(pet, pref, loggedToday, storageKey), 60000)
    return () => clearInterval(id)
  }, [pref, permission, loggedToday, pet, storageKey])

  async function toggle() {
    if (pref.enabled) {
      setPref({ ...pref, enabled: false })
      return
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      const result = await Notification.requestPermission()
      setPermission(result)
    } else if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission)
    }
    setPref({ ...pref, enabled: true })
  }

  return (
    <div className="reminder">
      <button className={pref.enabled ? 'chip-button active-chip' : 'chip-button'} type="button" onClick={toggle}>
        <Bell size={15} /> {pref.enabled ? t('Browser nudge on') : t('Browser nudge')}
      </button>
      {pref.enabled && (
        <label className="reminder-time">
          {t('at')}
          <input type="time" value={pref.time} onChange={(e) => setPref({ ...pref, time: e.target.value || '19:00' })} />
        </label>
      )}
      {pref.enabled && (
        <span className="reminder-note muted">
          {typeof Notification === 'undefined'
            ? t('This browser does not support reminders.')
            : permission === 'granted'
              ? t('Works while PetPattern is open — not an email reminder yet.')
              : permission === 'denied'
                ? t('Notifications are blocked — enable them in your browser settings to get a nudge.')
                : t('Allow notifications to get a nudge (works while PetPattern is open).')}
        </span>
      )}
    </div>
  )
}

function loadReminder(key) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return { enabled: false, time: '19:00', ...JSON.parse(raw) }
  } catch (err) {
    // ignore unreadable/blocked storage
  }
  return { enabled: false, time: '19:00' }
}

function saveReminder(key, pref) {
  try {
    localStorage.setItem(key, JSON.stringify({ enabled: pref.enabled, time: pref.time }))
  } catch (err) {
    // ignore blocked storage
  }
}

function maybeNotify(pet, pref, loggedToday, key) {
  if (loggedToday || !pref.enabled) return
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  if (!/^\d{2}:\d{2}$/.test(pref.time)) return // ignore a cleared/invalid time
  const now = new Date()
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  if (hhmm < pref.time) return
  const today = now.toISOString().slice(0, 10)
  const notifiedKey = `${key}.notified`
  try {
    if (localStorage.getItem(notifiedKey) === today) return
  } catch (err) {
    return
  }
  // Construct first; only mark the day as done if the notification actually
  // fired, so a browser that throws here doesn't silently swallow the reminder.
  try {
    new Notification('PetPattern', { body: t("Time for {name}'s daily check-in.", { name: pet.name }) })
    try { localStorage.setItem(notifiedKey, today) } catch (err) { /* ignore blocked storage */ }
  } catch (err) {
    // some browsers require a service worker for Notification construction; ignore
  }
}

function RecentTimeline({ pet, checkIns, onEdit, onDelete }) {
  if (!checkIns.length) return null
  const cat = isCat(pet)
  return (
    <section className="panel timeline-panel">
      <div className="panel-heading">
        <CalendarDays size={18} />
        <h2>{t('Recent memory')}</h2>
      </div>
      <div className="timeline">
        {checkIns.slice(0, 8).map((item) => (
          <div className="timeline-row editable" key={item.id}>
            <div className="timeline-main">
              <span>{formatDate(item.checkInDate)}</span>
              <strong>{timelineSummary(item, cat)}</strong>
              <small>{timelineFlags(item, cat)}</small>
            </div>
            {(onEdit || onDelete) && (
              <div className="row-actions">
                {onEdit && (
                  <button className="icon-button" type="button" aria-label={`Edit check-in for ${formatDate(item.checkInDate)}`} onClick={() => onEdit(item)}>
                    <Pencil size={15} />
                  </button>
                )}
                {onDelete && (
                  <button className="icon-button danger" type="button" aria-label={`Delete check-in for ${formatDate(item.checkInDate)}`} onClick={() => onDelete(item)}>
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function PhotosView({ pet, photos, onBack, onUploaded, onDeletePhoto }) {
  const [area, setArea] = useState('EAR')
  const [date, setDate] = useState(today)
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [lightbox, setLightbox] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!lightbox) return undefined
    const onKey = (event) => { if (event.key === 'Escape') setLightbox(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  async function onFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const blob = await resizeImage(file, 1400, 0.82)
      const formData = new FormData()
      formData.append('file', blob, 'photo.jpg')
      formData.append('area', area)
      formData.append('capturedDate', date)
      if (caption.trim()) formData.append('caption', caption.trim())
      await api.uploadPhoto(pet.id, formData)
      setCaption('')
      await onUploaded()
    } catch (err) {
      setError(t('That photo could not be added. Try a JPEG or PNG.'))
    } finally {
      setUploading(false)
    }
  }

  const groups = PHOTO_AREAS
    .map((code) => ({ code, items: (photos ?? []).filter((photo) => photo.area === code) }))
    .filter((group) => group.items.length > 0)

  return (
    <section className="flow-panel">
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> {t('Back')}</button>
      <p className="kicker">{t('Photo record')}</p>
      <h1>{t("{name}'s photos", { name: pet.name })}</h1>
      <p className="lead">{t('Add a photo of an ear, paw, skin or stool to see how it changes over time — handy to show your vet.')}</p>

      <div className="photo-uploader">
        <div className="choice-block">
          <span>{t('What is this a photo of?')}</span>
          <div className="choice-grid">
            {PHOTO_AREAS.map((code) => (
              <button key={code} type="button" aria-pressed={area === code} className={area === code ? 'choice-button active' : 'choice-button'} onClick={() => setArea(code)}>
                {photoAreaLabel(code)}
              </button>
            ))}
          </div>
        </div>
        <div className="two-fields">
          <label className="field-label">
            {t('Date')}
            <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field-label">
            {t('Caption (optional)')}
            <input value={caption} maxLength={300} placeholder={t('e.g. left ear, looked red after the walk')} onChange={(e) => setCaption(e.target.value)} />
          </label>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={onFile} />
        <button className="primary-button wide" type="button" disabled={uploading} onClick={() => fileRef.current?.click()}>
          <ImagePlus size={18} /> {uploading ? t('Adding…') : t('Add a photo')}
        </button>
        {error && <p className="ai-error">{error}</p>}
      </div>

      {groups.length === 0 ? (
        <article className="panel">
          <h2>{t('No photos yet')}</h2>
          <p className="muted">{t("Add a photo of {name}'s ear, paw or skin to start a visual record you can compare later.", { name: pet.name })}</p>
        </article>
      ) : (
        groups.map((group) => (
          <div className="photo-area-group" key={group.code}>
            <p className="form-section-label">{photoAreaLabel(group.code)} · {group.items.length}</p>
            <div className="photo-grid">
              {group.items.slice().sort(byCapturedDateAsc).map((photo) => (
                <figure className="photo-tile" key={photo.id}>
                  <button type="button" className="photo-open" onClick={() => setLightbox(photo)} aria-label={t('Open photo')}>
                    <img className="photo-img" src={photo.imageUrl} alt={photo.caption || photoAreaLabel(photo.area)} loading="lazy" />
                  </button>
                  <figcaption>
                    <span className="photo-date">{formatDate(photo.capturedDate)}</span>
                    {photo.caption && <span className="photo-caption">{photo.caption}</span>}
                  </figcaption>
                  <button className="icon-button danger photo-delete" type="button" aria-label={t('Delete photo')} onClick={() => onDeletePhoto(photo)}>
                    <Trash2 size={15} />
                  </button>
                </figure>
              ))}
            </div>
          </div>
        ))
      )}

      {lightbox && (
        <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" type="button" aria-label={t('Close')} onClick={() => setLightbox(null)}><X size={22} /></button>
          <figure className="lightbox-figure" onClick={(event) => event.stopPropagation()}>
            <img src={lightbox.imageUrl} alt={lightbox.caption || photoAreaLabel(lightbox.area)} />
            <figcaption>
              <strong>{photoAreaLabel(lightbox.area)}</strong> · {formatDate(lightbox.capturedDate)}
              {lightbox.caption && <span> — {lightbox.caption}</span>}
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  )
}

function TrialsView({ pet, trials, onBack, onCreate, onAction, onDelete }) {
  const [protein, setProtein] = useState('CHICKEN')
  const [weeks, setWeeks] = useState(3)
  const [startDate, setStartDate] = useState(today)
  const [notes, setNotes] = useState('')
  const [showForm, setShowForm] = useState(false)

  const active = trials.filter((trial) => trial.status === 'ACTIVE' || trial.status === 'REINTRODUCED')
  const past = trials.filter((trial) => trial.status === 'COMPLETED' || trial.status === 'ABANDONED')

  function submit(event) {
    event.preventDefault()
    onCreate({ protein, weeks, startDate, notes: notes.trim() || null })
    setNotes('')
    setShowForm(false)
  }

  const formOpen = trials.length === 0 || showForm

  return (
    <section className="flow-panel">
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> {t('Back')}</button>
      <p className="kicker">{t('Food trial')}</p>
      <h1>{t('Food trials')}</h1>
      <p className="lead">{t('Take one ingredient out for a few weeks, keep logging, then bring it back — a calm way to see whether things change without it, and a clear story for your vet.')}</p>

      {formOpen ? (
        <form className="quick-form" onSubmit={submit}>
          <QuickChoices
            label={t('Which ingredient to take out')}
            value={protein}
            options={proteinOptions.map((value) => ({ value, label: proteinLabel(value) }))}
            onChange={setProtein}
          />
          <QuickChoices
            label={t('For how long')}
            value={weeks}
            options={[2, 3, 4, 6].map((value) => ({ value, label: t('{n} weeks', { n: value }) }))}
            onChange={setWeeks}
          />
          <label className="field-label">
            {t('Start date')}
            <input type="date" value={startDate} max={today} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label className="field-label">
            {t('Notes')}
            <textarea value={notes} maxLength={500} placeholder={t('What to avoid, why you are trying this…')} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <button className="primary-button wide" type="submit"><FlaskConical size={18} /> {t('Start the trial')}</button>
        </form>
      ) : (
        <div className="action-row">
          <button className="secondary-button" type="button" onClick={() => setShowForm(true)}>
            <FlaskConical size={18} /> {t('Start a new trial')}
          </button>
        </div>
      )}

      {active.map((trial) => (
        <TrialCard key={trial.id} trial={trial} onAction={onAction} onDelete={onDelete} />
      ))}

      {past.length > 0 && (
        <>
          <p className="kicker section-divider">{t('Past trials')}</p>
          {past.map((trial) => (
            <TrialCard key={trial.id} trial={trial} onAction={onAction} onDelete={onDelete} />
          ))}
        </>
      )}
    </section>
  )
}

function TrialCard({ trial, onAction, onDelete }) {
  const result = trial.result
  const pct = trial.totalDays > 0 ? Math.min(100, Math.round((100 * trial.dayOfTrial) / trial.totalDays)) : 0
  return (
    <article className={`panel trial-card status-${String(trial.status).toLowerCase()}`}>
      <div className="pattern-top">
        <span className={`status-chip ${trialTone(trial.status)}`}>{trialStatusLabel(trial.status)}</span>
      </div>
      <h2>{t('Removing: {protein}', { protein: trial.proteinLabel })}</h2>
      <p className="memory-line">{trial.phase}</p>

      {trial.status === 'ACTIVE' && trial.totalDays > 0 && (
        <>
          <div className="trial-progress"><span style={{ width: `${pct}%` }} /></div>
          {trial.daysLeft != null && <p className="muted">{t('{n} days to go', { n: trial.daysLeft })}</p>}
        </>
      )}

      {result?.hasEnoughData && (
        <div className="trial-windows">
          <TrialWindow label={t('Before')} stat={result.baseline} />
          <TrialWindow label={t('During')} stat={result.elimination} tone="good" />
          {result.reintroduction && <TrialWindow label={t('After')} stat={result.reintroduction} tone="watch" />}
        </div>
      )}

      {result?.verdict && <p className="trial-verdict">{result.verdict}</p>}

      {result && (
        <p className="muted trial-adherence">
          {result.cleanRun
            ? t('Stayed on plan the whole time.')
            : t('Slipped: {list}', { list: result.slips.join(', ') })}
        </p>
      )}

      {trial.notes && <p className="muted">{trial.notes}</p>}

      <div className="pattern-actions">
        {trial.status === 'ACTIVE' && (
          <button className="chip-button" type="button" onClick={() => onAction(trial, 'reintroduce')}>
            {t('Bring {protein} back', { protein: String(trial.proteinLabel).toLowerCase() })}
          </button>
        )}
        {(trial.status === 'ACTIVE' || trial.status === 'REINTRODUCED') && (
          <button className="chip-button" type="button" onClick={() => onAction(trial, 'complete')}>{t('Wrap up')}</button>
        )}
        {(trial.status === 'ACTIVE' || trial.status === 'REINTRODUCED') && (
          <button className="chip-button subtle" type="button" onClick={() => onAction(trial, 'abandon')}>{t('Stop')}</button>
        )}
        <button className="icon-button danger" type="button" aria-label={t('Delete trial')} onClick={() => onDelete(trial)}>
          <Trash2 size={15} />
        </button>
      </div>
    </article>
  )
}

function TrialWindow({ label, stat, tone }) {
  return (
    <div className={`trial-window ${tone || ''}`}>
      <span className="trial-window-label">{label}</span>
      <strong>{stat.avgItching != null ? `${stat.avgItching}/10` : '—'}</strong>
      <span className="muted">{t('{n} days', { n: stat.loggedDays })}</span>
    </div>
  )
}

function trialStatusLabel(status) {
  switch (status) {
    case 'ACTIVE': return t('In progress')
    case 'REINTRODUCED': return t('Reintroducing')
    case 'COMPLETED': return t('Done')
    case 'ABANDONED': return t('Stopped')
    default: return status
  }
}

function trialTone(status) {
  switch (status) {
    case 'ACTIVE': return 'vet'
    case 'REINTRODUCED': return 'watch'
    case 'COMPLETED': return 'calm'
    default: return 'muted'
  }
}

function RecapView({ pet, recap, onBack, onVetSummary }) {
  if (!recap) {
    return (
      <section className="flow-panel">
        <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> {t('Back')}</button>
        <p className="muted">{t('Just a moment…')}</p>
      </section>
    )
  }
  const itching = recap.itching
  return (
    <section className="flow-panel">
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> {t('Back')}</button>
      <p className="kicker">{t('Looking back')}</p>
      <h1>{t("{name}'s last {days} days", { name: pet.name, days: recap.days })}</h1>
      <p className="lead">{recap.headline}</p>

      <div className="recap-grid">
        <RecapStat value={`${recap.daysLogged}/${recap.days}`} label={t('days logged')} />
        <RecapStat value={t('{n} days', { n: recap.calmestStreakDays })} label={t('calmest stretch')} />
        <RecapStat value={itching.recentAvg != null ? `${itching.recentAvg}/10` : '—'} label={t('avg scratching')} />
      </div>

      {itching.recentAvg != null && itching.priorAvg != null && itching.label && (
        <article className="panel recap-trend">
          <p>
            {itching.label === 'about the same'
              ? t('Scratching averaged {recent}/10 — about the same as the month before ({prior}/10).', { recent: itching.recentAvg, prior: itching.priorAvg })
              : t('Scratching averaged {recent}/10 — {label} than the month before ({prior}/10).', { recent: itching.recentAvg, label: trendWord(itching.label), prior: itching.priorAvg })}
          </p>
        </article>
      )}

      <article className="panel">
        <div className="panel-heading"><CalendarRange size={18} /><h2>{t('Worth noting')}</h2></div>
        {recap.milestones.length ? (
          <ul className="recap-milestones">
            {recap.milestones.map((milestone, index) => (
              <li key={index}><strong>{milestone.label}</strong>{milestone.detail && <span className="muted"> — {milestone.detail}</span>}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t('Keep logging — more shows up here as the history grows.')}</p>
        )}
      </article>

      <p className="muted recap-did">{t('Food changes: {food} · Photos: {photos} · Trials: {trials}.', { food: recap.foodChanges, photos: recap.photosAdded, trials: recap.trialsRun })}</p>

      <div className="action-row">
        <button className="primary-button" type="button" onClick={onVetSummary}>
          <Stethoscope size={18} /> {t('Bring this to your vet')}
        </button>
      </div>
    </section>
  )
}

function RecapStat({ value, label }) {
  return (
    <div className="recap-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function trendWord(label) {
  switch (label) {
    case 'calmer': return t('calmer')
    case 'itchier': return t('itchier')
    default: return t('about the same')
  }
}

function AuthScreen({ lang, onLangChange, onLogin, onRegister, onDemo, demoEnabled = true, googleEnabled = false }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // A failed Google round-trip redirects back with #auth-error=google… — show a
  // neutral message and strip the marker from the URL.
  useEffect(() => {
    if (typeof window !== 'undefined' && /auth-error=google/.test(window.location.hash)) {
      setError(t('Could not sign in with Google. Please try again.'))
      history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [])

  function setModeAndClear(next) {
    setMode(next)
    setError('')
    setNotice('')
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (mode === 'register' && !accepted) {
      setError(t('Please accept the terms and privacy policy to continue.'))
      return
    }
    setBusy(true)
    try {
      if (mode === 'login') {
        await onLogin(email.trim(), password)
      } else if (mode === 'register') {
        await onRegister(email.trim(), password, displayName.trim(), accepted)
      } else {
        // Forgot password. The response is always neutral (it never reveals whether
        // an account exists), so we just show the same confirmation message.
        await api.forgotPassword(email.trim())
        setNotice(t("If an account exists for that email, we've sent reset instructions. Check your inbox."))
        setBusy(false)
      }
    } catch (err) {
      setError(err.message || t('Something went wrong. Try again.'))
      setBusy(false)
    }
  }

  async function demo() {
    setError('')
    setBusy(true)
    try {
      await onDemo()
    } catch (err) {
      setError(t('Demo could not load. Try again in a moment.'))
      setBusy(false)
    }
  }

  return (
    <div className="start-shell">
      <main className="start-panel">
        <div className="brand-line">
          <span className="brand-mark"><BrandMark size={20} /></span>
          <strong>PetPattern</strong>
          <LangToggle lang={lang} onChange={onLangChange} />
        </div>
        <p className="kicker">{t('PetPattern remembers what changed.')}</p>
        <h1>{mode === 'login' ? t('Welcome back') : mode === 'register' ? t('Create your account') : t('Reset your password')}</h1>
        <p className="lead">{mode === 'forgot' ? t("Enter your email and we'll send a link to set a new password.") : t('Log only what you noticed. A quick check-in is enough.')}</p>
        {mode !== 'forgot' && (
          <p className="start-sub muted">{t('Food, stool, itching, vomiting, litter box, appetite, energy — small notes become useful over time.')}</p>
        )}

        {googleEnabled && mode !== 'forgot' && (
          <>
            <button className="google-button" type="button" onClick={() => { window.location.href = '/api/auth/google/start' }}>
              <GoogleG size={18} /> {t('Continue with Google')}
            </button>
            <div className="auth-divider">{t('or')}</div>
          </>
        )}

        <form onSubmit={submit} className="stack-form">
          {mode === 'register' && (
            <input placeholder={t('Your name, optional')} value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" />
          )}
          <input type="email" required placeholder={t('Email')} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          {mode !== 'forgot' && (
            <input type="password" required minLength={8} placeholder={t('Password (min 8 characters)')} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          )}
          {mode === 'register' && (
            <label className="accept-terms">
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
              <span>{t('I accept the Terms, Privacy Policy and Medical Disclaimer, and I understand PetPattern shows possible patterns based on owner-reported logs — not a diagnosis, and not a substitute for a vet.')}</span>
            </label>
          )}
          <button className="primary-button wide" type="submit" disabled={busy || (mode === 'register' && !accepted)}>
            {mode === 'login' ? t('Sign in') : mode === 'register' ? t('Create account') : t('Send reset link')}
          </button>
        </form>

        {notice && <p className="muted auth-notice">{notice}</p>}
        {error && <div className="error-box" role="alert">{error}</div>}

        {mode === 'login' && (
          <button className="text-button" type="button" onClick={() => setModeAndClear('forgot')}>
            {t('Forgot your password?')}
          </button>
        )}
        <button className="text-button" type="button" onClick={() => setModeAndClear(mode === 'register' ? 'login' : mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? t('New here? Create an account') : mode === 'register' ? t('Already have an account? Sign in') : t('Back to sign in')}
        </button>

        {demoEnabled && (
          <div className="auth-demo">
            <p className="muted">{t('Just exploring?')}</p>
            <button className="secondary-button" type="button" onClick={demo} disabled={busy}>
              <PawPrint size={18} /> {t('Load Bella demo')}
            </button>
          </div>
        )}

        {mode !== 'forgot' && (
          <p className="start-disclaimer muted">{t("Not a diagnosis. Not a vet chatbot. Just a clearer memory for your pet's health.")}</p>
        )}

        <p className="legal-footer muted">
          <a href="/#privacy" target="_blank" rel="noopener noreferrer">{t('Privacy Policy')}</a>
          {' · '}
          <a href="/#terms" target="_blank" rel="noopener noreferrer">{t('Terms')}</a>
          {' · '}
          <a href="/#disclaimer" target="_blank" rel="noopener noreferrer">{t('Medical Disclaimer')}</a>
        </p>
      </main>
    </div>
  )
}

function MedicationsView({ pet, medications, onBack, onCreate, onAction }) {
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const ongoing = medications.filter((med) => med.ongoing)
  const past = medications.filter((med) => !med.ongoing)

  async function submit(event) {
    event.preventDefault()
    if (!name.trim()) return
    setError('')
    setBusy(true)
    try {
      await onCreate({ name: name.trim(), startDate, endDate: endDate || null, notes: notes.trim() || null })
      setName('')
      setEndDate('')
      setNotes('')
      setStartDate(today)
    } catch (err) {
      setError(err.message || t('Could not add the medication. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  function card(med) {
    return (
      <article className="panel med-card" key={med.id}>
        <div className="pattern-top">
          <span className={`status-chip ${med.ongoing ? 'vet' : 'calm'}`}>{med.ongoing ? t('Ongoing') : t('Finished')}</span>
        </div>
        <h2>{med.name}</h2>
        <p className="memory-line">{formatDate(med.startDate)}{med.ongoing ? ` · ${t('ongoing')}` : ` – ${formatDate(med.endDate)}`}</p>
        {med.notes && <p className="muted">{med.notes}</p>}
        <div className="pattern-actions">
          {med.ongoing && (
            <button className="chip-button" type="button" onClick={() => onAction(med, 'stop')}>{t('Mark as finished')}</button>
          )}
          <button className="icon-button danger" type="button" aria-label={t('Delete medication')} onClick={() => onAction(med, 'delete')}>
            <Trash2 size={15} />
          </button>
        </div>
      </article>
    )
  }

  return (
    <section className="flow-panel">
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> {t('Back')}</button>
      <p className="kicker">{t('Medications')}</p>
      <h1>{t("{name}'s medications", { name: pet.name })}</h1>
      <p className="lead">{t('A simple record of medicines and treatments — handy to show your vet, and to line up against how {name} has been.', { name: pet.name })}</p>

      <form className="quick-form" onSubmit={submit}>
        <label className="field-label">
          {t('Name')}
          <input value={name} maxLength={160} placeholder={t('e.g. Otiderm ear drops')} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="two-fields">
          <label className="field-label">
            {t('Start date')}
            <input type="date" value={startDate} max={today} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label className="field-label">
            {t('End date (optional)')}
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
        </div>
        <label className="field-label">
          {t('Notes')}
          <textarea value={notes} maxLength={500} placeholder={t('Dose, reason, who prescribed it…')} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <button className="primary-button wide" type="submit" disabled={busy}><Pill size={18} /> {t('Add medication')}</button>
        {error && <p className="ai-error">{error}</p>}
      </form>

      {medications.length === 0 ? (
        <article className="panel">
          <h2>{t('No medications yet')}</h2>
          <p className="muted">{t('Add a medicine or treatment above when {name} starts one.', { name: pet.name })}</p>
        </article>
      ) : (
        <>
          {ongoing.length > 0 && (<><p className="form-section-label">{t('Ongoing')}</p>{ongoing.map(card)}</>)}
          {past.length > 0 && (<><p className="kicker section-divider">{t('Finished')}</p>{past.map(card)}</>)}
        </>
      )}
    </section>
  )
}

function LangToggle({ lang, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0]

  return (
    <div className="lang-menu" ref={ref}>
      <button type="button" className="lang-trigger" aria-haspopup="listbox" aria-expanded={open}
              aria-label={`Language: ${current.label}`} onClick={() => setOpen((o) => !o)}>
        <Flag code={current.code} size={20} />
        <span>{current.code.toUpperCase()}</span>
        <ChevronDown className="chev" size={15} />
      </button>
      {open && (
        <div className="lang-list" role="listbox" aria-label="Language">
          {LANGUAGES.map((l) => (
            <button key={l.code} type="button" role="option" aria-selected={l.code === lang}
                    className={l.code === lang ? 'lang-item active' : 'lang-item'}
                    onClick={() => { onChange(l.code); setOpen(false) }}>
              <Flag code={l.code} size={20} />
              <span>{l.label}</span>
              {l.code === lang && <Check className="check" size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Tab({ active, onClick, icon, label }) {
  return (
    <button className={active ? 'view-tab active' : 'view-tab'} type="button" onClick={onClick} aria-current={active ? 'page' : undefined}>
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
            aria-pressed={value === option.value}
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
    <button className={active ? 'toggle-button active' : 'toggle-button'} type="button" aria-pressed={active} onClick={onClick}>
      {active && <Check size={15} />}
      {label}
    </button>
  )
}

function PetOnboarding({ onCreate, onFinish, onDemo, onCancel, demoBusy, demoEnabled = true }) {
  const [step, setStep] = useState('species') // species | profile | done
  const [species, setSpecies] = useState(null)
  const [form, setForm] = useState({ name: '', breed: '', birthDate: '', currentWeightKg: '', sex: 'UNKNOWN' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [createdPet, setCreatedPet] = useState(null)

  function choose(next) {
    setSpecies(next)
    setError('')
    setStep('profile')
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
        currentWeightKg: form.currentWeightKg ? Number(form.currentWeightKg) : null
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
        <span className="brand-mark big">{isCat(createdPet) ? <Cat size={26} /> : <Dog size={26} />}</span>
        <h1>{t('{name}’s memory is ready.', { name: createdPet.name })}</h1>
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
    const meta = SPECIES[species]
    return (
      <section className="onboarding">
        <button className="back-button" type="button" onClick={() => { setStep('species'); setError('') }}>
          <ArrowLeft size={17} /> {t('Back')}
        </button>
        <p className="kicker">{species === 'CAT' ? t('New cat') : t('New dog')}</p>
        <h1>{species === 'CAT' ? t('Tell us about your cat') : t('Tell us about your dog')}</h1>
        <p className="lead">{t(meta.intro)}</p>
        <form className="stack-form onboarding-form" onSubmit={submit}>
          <label className="field-label">{t('Name')}
            <input autoFocus value={form.name} placeholder={species === 'CAT' ? t("Your cat's name") : t("Your dog's name")} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="field-label">{t('Breed, optional')}
            <input value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
          </label>
          <label className="field-label">{t('Birth date, optional')}
            <input type="date" max={today} value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
          </label>
          <label className="field-label">{t('Weight kg, optional')}
            <input inputMode="decimal" value={form.currentWeightKg} onChange={(e) => setForm({ ...form, currentWeightKg: e.target.value })} />
          </label>
          <QuickChoices
            label={t('Sex, optional')}
            value={form.sex}
            options={[
              { value: 'UNKNOWN', label: t('Not sure') },
              { value: 'FEMALE', label: t('Female') },
              { value: 'MALE', label: t('Male') }
            ]}
            onChange={(sex) => setForm({ ...form, sex })}
          />
          {error && <div className="error-box" role="alert">{error}</div>}
          <button className="primary-button wide" type="submit" disabled={busy}>
            <Check size={18} /> {t(meta.cta)}
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
      <p className="kicker">{t('Private health memory for dogs and cats')}</p>
      <h1>{t('Who are we tracking?')}</h1>
      <p className="lead">{t('PetPattern remembers the small daily signals and helps you spot changes worth watching.')}</p>
      <div className="species-choice">
        <button type="button" className="species-card" onClick={() => choose('DOG')}>
          <Dog size={30} />
          <strong>{t('Dog')}</strong>
          <span>{t(SPECIES.DOG.intro)}</span>
        </button>
        <button type="button" className="species-card" onClick={() => choose('CAT')}>
          <Cat size={30} />
          <strong>{t('Cat')}</strong>
          <span>{t(SPECIES.CAT.intro)}</span>
        </button>
      </div>
      {onDemo && demoEnabled && (
        <div className="onboarding-demo">
          <span className="muted">{t('Just exploring?')}</span>
          <button className="ghost-button" type="button" onClick={onDemo} disabled={demoBusy}>
            <PawPrint size={16} /> {t('Load Bella demo')}
          </button>
        </div>
      )}
    </section>
  )
}

function InvitesBanner({ invites, onAccept, onDecline }) {
  // Track the in-flight invite so a double-tap can't fire two accepts (which would
  // race on the caregiver unique constraint server-side).
  const [busyId, setBusyId] = useState(null)

  async function act(fn, id) {
    if (busyId) return
    setBusyId(id)
    try {
      await fn(id)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="invites-banner no-print">
      {invites.map((invite) => (
        <div key={invite.id} className="invite-row">
          <Mail size={17} />
          <p>
            <strong>{invite.invitedByName}</strong>{' '}
            {t('asked you to help look after {name}.', { name: invite.petName })}
          </p>
          <div className="invite-actions">
            <button className="secondary-button" type="button" disabled={busyId === invite.id} onClick={() => act(onAccept, invite.id)}>
              {t('Join')}
            </button>
            <button className="ghost-button" type="button" disabled={busyId === invite.id} onClick={() => act(onDecline, invite.id)}>
              {t('Not now')}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function CaregiversView({ pet, onBack, onLeft }) {
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading') // loading | ready | forbidden
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function leave() {
    if (!window.confirm(t('Stop helping with {name}? You can be invited again later.', { name: pet.name }))) return
    setBusy(true)
    setError('')
    try {
      await api.leavePet(pet.id)
      if (onLeft) onLeft()
    } catch (err) {
      setError(err.message || t('Something went wrong. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  async function load() {
    setState('loading')
    try {
      setData(await api.listCaregivers(pet.id))
      setState('ready')
    } catch (err) {
      // Only the primary owner can manage the circle; caregivers get a 404 here.
      setState('forbidden')
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pet.id])

  async function invite(event) {
    event.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    setError('')
    try {
      await api.inviteCaregiver(pet.id, email.trim())
      setEmail('')
      await load()
    } catch (err) {
      setError(err.message || t('Could not send the invite.'))
    } finally {
      setBusy(false)
    }
  }

  async function remove(ownerId) {
    if (!window.confirm(t('Remove this person? They will lose access to {name}.', { name: pet.name }))) return
    setError('')
    try {
      await api.removeCaregiver(pet.id, ownerId)
      await load()
    } catch (err) {
      setError(err.message || t('Something went wrong. Try again.'))
    }
  }

  async function cancel(inviteId) {
    setError('')
    try {
      await api.cancelInvite(pet.id, inviteId)
      await load()
    } catch (err) {
      setError(err.message || t('Something went wrong. Try again.'))
    }
  }

  return (
    <section className="flow-panel">
      <button className="back-button no-print" type="button" onClick={onBack}>
        <ArrowLeft size={17} /> {t('Back to {name} today', { name: pet.name })}
      </button>
      <p className="kicker">{t('Care circle')}</p>
      <h1>{t('Who helps look after {name}', { name: pet.name })}</h1>
      <p className="lead">
        {t('Invite the people who share the day-to-day — a partner, family, a dog walker. They can log and see everything for {name}. Nobody is added until they accept.', { name: pet.name })}
      </p>

      {state === 'loading' && <p className="muted">{t('Just a moment…')}</p>}

      {state === 'forbidden' && (
        <>
          <p className="muted">{t('Only the person who started this profile can manage who helps. You can still log and see everything for {name}.', { name: pet.name })}</p>
          {error && <div className="error-box" role="alert">{error}</div>}
          <div className="action-row">
            <button className="ghost-button" type="button" onClick={leave} disabled={busy}>
              <LogOut size={16} /> {t('Stop helping with {name}', { name: pet.name })}
            </button>
          </div>
        </>
      )}

      {state === 'ready' && data && (
        <>
          <form className="invite-form" onSubmit={invite}>
            <input
              type="email"
              placeholder={t('Their email address')}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button className="secondary-button" type="submit" disabled={busy}>
              <UserPlus size={16} /> {t('Send invite')}
            </button>
          </form>
          {error && <div className="error-box" role="alert">{error}</div>}

          <div className="care-list">
            <div className="panel-heading">
              <Users size={18} />
              <h2>{t('Helping now')}</h2>
            </div>
            {data.caregivers.length === 0 ? (
              <p className="muted">{t('Just you for now.')}</p>
            ) : (
              data.caregivers.map((person) => (
                <div key={person.ownerId} className="care-row">
                  <div className="care-who">
                    <strong>{person.displayName || person.email}</strong>
                    {person.displayName && <span className="muted">{person.email}</span>}
                  </div>
                  <button className="ghost-button" type="button" onClick={() => remove(person.ownerId)}>
                    {t('Remove')}
                  </button>
                </div>
              ))
            )}
          </div>

          {data.invites.length > 0 && (
            <div className="care-list">
              <div className="panel-heading">
                <Mail size={18} />
                <h2>{t('Invited, waiting to join')}</h2>
              </div>
              {data.invites.map((pending) => (
                <div key={pending.id} className="care-row">
                  <div className="care-who">
                    <strong>{pending.email}</strong>
                    <span className="muted">{t('Invited {date}', { date: formatDate(pending.createdAt) })}</span>
                  </div>
                  <button className="ghost-button" type="button" onClick={() => cancel(pending.id)}>
                    {t('Cancel')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}

function sharedTokenFromHash() {
  const match = (window.location.hash || '').match(/^#shared=(.+)$/)
  return match ? decodeURIComponent(match[1]) : null
}

function resetTokenFromHash() {
  const match = (window.location.hash || '').match(/^#reset=(.+)$/)
  return match ? decodeURIComponent(match[1]) : null
}

function legalFromHash() {
  const value = (window.location.hash || '').replace('#', '')
  return ['privacy', 'terms', 'disclaimer'].includes(value) ? value : null
}

function LegalView({ section, lang, onLangChange, onBack }) {
  const content = (LEGAL[lang] || LEGAL.en)
  const order = ['privacy', 'terms', 'disclaimer']
  return (
    <div className="onboard-shell">
      <main className="onboard-panel legal-panel">
        <div className="brand-line">
          <span className="brand-mark"><BrandMark size={20} /></span>
          <strong>PetPattern</strong>
          <LangToggle lang={lang} onChange={onLangChange} />
        </div>
        <button className="back-button" type="button" onClick={onBack}>
          <ArrowLeft size={17} /> {t('Back')}
        </button>
        {order.map((key) => {
          const doc = content[key]
          return (
            <section key={key} id={key} className="legal-doc">
              <h1>{doc.title}</h1>
              {doc.body.map((para, i) => <p key={i}>{para}</p>)}
            </section>
          )
        })}
        <p className="muted legal-updated">{content.updated}</p>
      </main>
    </div>
  )
}

function ResetPasswordView({ token, lang, onLangChange, onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // Strip the token from the URL + browser history on mount, so it can't be
  // recovered from the address bar or history on a shared device. The token is
  // already held in the `token` prop, so the flow still works.
  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [])

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (password.length < 8) {
      setError(t('Password must be at least 8 characters.'))
      return
    }
    if (password !== confirm) {
      setError(t('The two passwords do not match.'))
      return
    }
    setBusy(true)
    try {
      await api.resetPassword(token, password)
      setDone(true)
    } catch (err) {
      setError(err.message || t('Something went wrong. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="start-shell">
      <main className="start-panel">
        <div className="brand-line">
          <span className="brand-mark"><BrandMark size={20} /></span>
          <strong>PetPattern</strong>
          <LangToggle lang={lang} onChange={onLangChange} />
        </div>
        {done ? (
          <>
            <h1>{t('Password updated')}</h1>
            <p className="lead">{t('You can sign in with your new password now.')}</p>
            <button className="primary-button wide" type="button" onClick={onDone}>
              {t('Go to sign in')}
            </button>
          </>
        ) : (
          <>
            <p className="kicker">{t('Reset password')}</p>
            <h1>{t('Choose a new password')}</h1>
            <p className="lead">{t('Set a new password for your account.')}</p>
            <form onSubmit={submit} className="stack-form">
              <input type="password" required minLength={8} placeholder={t('New password (min 8 characters)')}
                value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
              <input type="password" required minLength={8} placeholder={t('Repeat new password')}
                value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
              <button className="primary-button wide" type="submit" disabled={busy}>
                {t('Update password')}
              </button>
            </form>
            {error && <div className="error-box" role="alert">{error}</div>}
            <button className="text-button" type="button" onClick={onDone}>
              {t('Back to sign in')}
            </button>
          </>
        )}
      </main>
    </div>
  )
}

function AccountView({ owner, onBack, onDeleted }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function exportData() {
    setBusy(true)
    setError('')
    setMessage('')
    track('export_clicked')
    try {
      const data = await api.exportMyData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'petpattern-export.json'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setMessage(t('Your data has been downloaded.'))
    } catch (err) {
      setError(err.message || t('Something went wrong. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  async function deleteAccount() {
    if (!window.confirm(t('Delete your account and all your pet data permanently? This cannot be undone.'))) return
    if (!window.confirm(t('Last check — this permanently removes your account and every pet record you own.'))) return
    setBusy(true)
    setError('')
    try {
      await api.deleteAccount()
      track('account_deleted')
      onDeleted()
    } catch (err) {
      setError(err.message || t('Something went wrong. Try again.'))
      setBusy(false)
    }
  }

  return (
    <div className="onboard-shell">
      <main className="onboard-panel">
        <button className="back-button" type="button" onClick={onBack}>
          <ArrowLeft size={17} /> {t('Back')}
        </button>
        <p className="kicker">{t('Account')}</p>
        <h1>{t('Your account')}</h1>
        <p className="lead">{owner?.email}</p>

        {error && <div className="error-box" role="alert">{error}</div>}
        {message && <p className="muted">{message}</p>}

        <div className="account-section">
          <h2>{t('Your data')}</h2>
          <p className="muted">{t('Download everything PetPattern stores for you as a JSON file.')}</p>
          <button className="secondary-button" type="button" onClick={exportData} disabled={busy}>
            <Download size={16} /> {t('Export my data')}
          </button>
        </div>

        <div className="account-section">
          <h2>{t('Legal')}</h2>
          <p className="legal-footer muted">
            <a href="/#privacy" target="_blank" rel="noopener noreferrer">{t('Privacy Policy')}</a>
            {' · '}
            <a href="/#terms" target="_blank" rel="noopener noreferrer">{t('Terms')}</a>
            {' · '}
            <a href="/#disclaimer" target="_blank" rel="noopener noreferrer">{t('Medical Disclaimer')}</a>
          </p>
        </div>

        <div className="account-section danger-zone">
          <h2>{t('Delete account')}</h2>
          <p className="muted">{t('Permanently deletes your account and all pet records you own. This cannot be undone.')}</p>
          <button className="ghost-button danger" type="button" onClick={deleteAccount} disabled={busy}>
            <Trash2 size={16} /> {t('Delete my account')}
          </button>
        </div>
      </main>
    </div>
  )
}

function hashView() {
  const value = window.location.hash.replace('#', '')
  return ['today', 'check-in', 'food', 'patterns', 'timeline', 'photos', 'trial', 'recap', 'medications', 'vet', 'caregivers', 'add-pet', 'account'].includes(value) ? value : 'today'
}

function photoAreaLabel(area) {
  switch (String(area || 'OTHER').toUpperCase()) {
    case 'EAR': return t('Ears')
    case 'PAW': return t('Paw')
    case 'SKIN': return t('Skin')
    case 'COAT': return t('Coat')
    case 'EYE': return t('Eyes')
    case 'STOOL': return t('Stool')
    default: return t('Other')
  }
}

function byCapturedDateAsc(a, b) {
  return String(a.capturedDate).localeCompare(String(b.capturedDate))
}

// Downscale + re-encode to JPEG in the browser so uploads stay small and
// the stored bytes are a known-safe raster type.
function resizeImage(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    if (!file.type || !file.type.startsWith('image/')) {
      reject(new Error('not an image'))
      return
    }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const width = Math.max(1, Math.round(img.width * scale))
      const height = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('encode failed'))),
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('could not load image'))
    }
    img.src = url
  })
}

function statusLabel(status, petName) {
  if (status === 'normal') return t('Normal for {name}', { name: petName })
  if (status === 'watch') return t('Worth watching')
  return t('Changed')
}

function todayHeadline(pet, overview, topPattern, latestCheckIn) {
  if (!latestCheckIn) return t('{name} needs a first baseline day.', { name: pet.name })
  if (topPattern) return topPattern.title
  if (overview?.todayStatus === 'watch') return t('{name} is worth watching today.', { name: pet.name })
  if (overview?.todayStatus === 'changed') return t("{name} needs today's check-in.", { name: pet.name })
  return t('{name} looks close to normal.', { name: pet.name })
}

function stoolLabel(checkIn) {
  if (!checkIn) return t('Not logged')
  const state = checkIn.stoolState
  if (state === 'NORMAL') return t('Normal')
  if (state === 'SOFT') return t('Soft')
  if (state === 'DIARRHEA') return t('Diarrhea')
  if (state === 'NO_STOOL') return t('No stool')
  if (checkIn.diarrhea) return t('Diarrhea')
  if (checkIn.stoolScore) return `${checkIn.stoolScore}/5`
  return t('Not logged')
}

function levelLabel(value) {
  if (!value || value === 'UNKNOWN') return t('Not logged')
  return t(titleCase(value))
}

function litterLabel(value) {
  if (!value || value === 'UNKNOWN') return t('Not logged')
  if (value === 'NONE') return t('Not used')
  return t(titleCase(value))
}

function hidingLabel(value) {
  if (!value || value === 'UNKNOWN') return t('Not logged')
  return value === 'MORE' ? t('Hiding more') : t('As usual')
}

function foodKindLabel(value) {
  return (value ?? 'MAIN_FOOD') === 'TREAT' ? t('Treat') : t('Main food')
}

function proteinLabel(value) {
  return t(titleCase(value ?? 'UNKNOWN'))
}

function confidenceLabel(value) {
  const level = String(value ?? 'low').toLowerCase()
  if (level === 'high') return t('High confidence')
  if (level === 'medium') return t('Medium confidence')
  return t('Low confidence')
}

function isDismissedStatus(status) {
  return status === 'RESOLVED' || status === 'NOT_RELEVANT'
}

function patternGroup(pattern) {
  if (isDismissedStatus(pattern.status)) return 'dismissed'
  if (pattern.currentlyDetected === false) return 'settled'
  return 'active'
}

function settledLine(pattern) {
  const days = pattern.daysSinceLastSeen
  if (days == null) return t('Settled')
  if (days <= 0) return t('Settled — last seen today')
  return t(days === 1 ? 'Not seen in {n} day' : 'Not seen in {n} days', { n: days })
}

function statusMeta(status) {
  switch (status) {
    case 'ACKNOWLEDGED':
      return { label: t('Watching'), tone: 'watch' }
    case 'SHARED_WITH_VET':
      return { label: t('Told your vet'), tone: 'vet' }
    case 'RESOLVED':
      return { label: t('Resolved'), tone: 'calm' }
    case 'NOT_RELEVANT':
      return { label: t('Set aside'), tone: 'muted' }
    default:
      return { label: '', tone: '' }
  }
}

function memoryLine(pattern) {
  if (!pattern?.firstDetectedAt) return ''
  if (pattern.seenBefore && pattern.detectionCount > 1) {
    return t('Seen {n}× since {date}', { n: pattern.detectionCount, date: formatDate(pattern.firstDetectedAt) })
  }
  return t('First noticed {date}', { date: formatDate(pattern.firstDetectedAt) })
}

function titleCase(value) {
  return String(value).toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function dateLocale() {
  return getLang() === 'hr' ? 'hr' : 'en'
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat(dateLocale(), { month: 'short', day: 'numeric' }).format(date)
}

function formatLongDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat(dateLocale(), { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function timelineIcon(type) {
  switch (type) {
    case 'FOOD_STARTED':
      return <Utensils size={15} />
    case 'MEDICATION_STARTED':
    case 'MEDICATION_ENDED':
      return <Pill size={15} />
    case 'ITCHING_CHANGE':
      return <HeartPulse size={15} />
    case 'STOOL_CHANGE':
    case 'WATER_CHANGE':
      return <Droplets size={15} />
    case 'NOTE':
      return <ClipboardList size={15} />
    case 'PATTERN_DETECTED':
      return <Activity size={15} />
    default:
      return <AlertTriangle size={15} />
  }
}

// The headline line for a day in the recent memory, in the signals that species
// actually tracks — a cat never shows "Itching / stool", a dog never shows
// litter box.
function timelineSummary(item, cat) {
  if (cat) {
    return `${t('Litter box')} ${litterLabel(item.litterBoxUse)} · ${t('Appetite')} ${levelLabel(item.appetiteLevel)}`
  }
  return `${t('Scratching')} ${item.itchingScore ?? t('Not logged')} · ${t('Stool')} ${stoolLabel(item)}`
}

// The small "what else stood out" line, again species-appropriate and translated.
function timelineFlags(item, cat) {
  const flags = []
  if (item.vomiting) flags.push(t('Vomiting'))
  if (cat) {
    if (item.straining) flags.push(t('Straining'))
    if (item.hidingBehavior === 'MORE') flags.push(t('Hiding more'))
    if (item.weightConcern) flags.push(t('Weight concern'))
    if (item.urinationChange && item.urinationChange !== 'NORMAL' && item.urinationChange !== 'UNKNOWN') {
      flags.push(t('Urination change'))
    }
  } else {
    if (item.stoolState === 'DIARRHEA' || item.diarrhea) flags.push(t('Diarrhea'))
    if (item.earRedness) flags.push(t('Ear redness'))
  }
  if (item.freeTextNote) flags.push(item.freeTextNote)
  return flags.length ? flags.join(' · ') : t('Nothing unusual noted')
}

export default App
