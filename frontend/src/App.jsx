import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  ArrowLeft,
  CalendarRange,
  Cat,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  Dog,
  Download,
  FlaskConical,
  ImagePlus,
  LogOut,
  Mail,
  PawPrint,
  Pill,
  Plus,
  Printer,
  Search,
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
import { t, setLang, getLang, loadLang, persistLang } from './i18n'
import { LEGAL } from './legal'
import { track } from './analytics'
import { SPECIES_PROFILES, SPECIES_ORDER, speciesProfile, isStarterSpecies } from './speciesProfiles'
import { today, formatDate, formatLongDate, parseLocalDate, addDays } from './lib/date'
import { kgToLb, lbToKg } from './lib/units'
import { isCat, DOG_BREEDS, CAT_BREEDS } from './lib/species'
import { petAgeLabel } from './lib/pets'
import { emptyCheckIn, emptyCheckInFor, keep, toObservationsJson, parseObservations, starterObservationRows, titleCase } from './lib/checkins'
import { emptyFood, proteinOptions, foodKindLabel, proteinLabel, foodDetectiveSignals } from './lib/food'
import { isDismissedStatus, trendWord } from './lib/patterns'
import { trialStatusLabel, trialTone } from './lib/trials'
import { hashView, sharedTokenFromHash, resetTokenFromHash, legalFromHash } from './lib/nav'
import { PHOTO_AREAS, photoAreaLabel, isProfilePhoto, byCapturedDateAsc, resizeImage } from './lib/photos'
import { BrandMark } from './components/BrandMark'
import { HeroSprig } from './components/HeroSprig'
import { PetAvatar } from './components/PetAvatar'
import { PetPhotoStack } from './components/PetPhotoStack'
import { PetIdentityCard } from './components/PetIdentityCard'
import { Flag } from './components/Flag'
import { GoogleG } from './components/GoogleG'
import { Toast } from './components/Toast'
import { LangToggle } from './components/LangToggle'
import { Tab } from './components/Tab'
import { QuickChoices } from './components/QuickChoices'
import { ToggleButton } from './components/ToggleButton'
import { DateField } from './components/DateField'
import { TodayView } from './features/today/TodayView'
import { CheckInView } from './features/checkins/CheckInView'
import { PatternsView } from './features/patterns/PatternsView'
import { TimelineView } from './features/patterns/TimelineView'

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
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState(hashView())
  const [checkInForm, setCheckInForm] = useState(emptyCheckIn)
  // How the check-in opens: 'full' (the full form), 'changed' (guided chips) or
  // 'note' (one sentence first). Set by openCheckIn()/editCheckIn().
  const [checkInStartMode, setCheckInStartMode] = useState('full')
  // Bumped on every explicit open so CheckInView remounts fresh (mode, chips and
  // note all reset) — even when the start mode is unchanged, e.g. tapping nav "Log"
  // after switching to note/guided mode with the in-panel foot links.
  const [checkInOpenSeq, setCheckInOpenSeq] = useState(0)
  const [foodForm, setFoodForm] = useState(emptyFood)
  const [selectedPattern, setSelectedPattern] = useState(null)
  const [timeline, setTimeline] = useState(null)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [vetSummary, setVetSummary] = useState(null)
  const [vetLoading, setVetLoading] = useState(false)
  const [vetDays, setVetDays] = useState(30)
  // A brief confirmation toast (e.g. after adding a pattern to the vet summary).
  // Keyed by a bumping sequence so the same message re-fires the dismiss timer.
  const [toast, setToast] = useState(null)
  const toastSeq = useRef(0)
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
  // Whether the note "Suggest fields" helper is offered. Default OFF, and only
  // turned on when the backend reports a real, configured AI provider. The local
  // mock parser is keyword-only (no negation, English-only) and would misread
  // notes like "no vomiting" / "nije povraćala", so it stays hidden for launch.
  const [aiSuggestEnabled, setAiSuggestEnabled] = useState(false)
  // Max pets per account (server-enforced). Used to hide "Add pet" at the limit
  // so a user can't pile up (or spam) dozens of pets. Comes from /config.
  const [maxPets, setMaxPets] = useState(20)
  // Captured once from the URL on load. Held in state (not re-derived each render)
  // so ResetPasswordView can strip the token from the URL without the view being
  // dropped when other state (the auth check) updates.
  const [resetToken, setResetToken] = useState(() => resetTokenFromHash())

  function switchLang(next) {
    setLang(next)
    persistLang(next)
    setLangState(next)
    // Backend-generated text (pattern cards, vet summary, recap, timeline) is
    // localized server-side at fetch time. Without this re-fetch it would stay in
    // the previous language after a switch (e.g. an open Vet summary keeping its
    // English text). loadPetData refreshes the lists and clears the detail caches;
    // re-open whichever detail view is currently showing.
    if (selectedPetId) {
      const activeView = view
      const activePattern = selectedPattern
      loadPetData(selectedPetId).then(() => {
        if (activeView === 'vet') openVetSummary(vetDays)
        else if (activeView === 'timeline' && activePattern) openTimeline(activePattern)
      })
    }
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
      if (cfg && typeof cfg.aiSuggestEnabled === 'boolean') setAiSuggestEnabled(cfg.aiSuggestEnabled)
      if (cfg && Number.isFinite(cfg.maxPets) && cfg.maxPets > 0) setMaxPets(cfg.maxPets)
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

  // Owner permanently deletes one of their own pets and all its data. Reselect
  // another pet (or fall back to onboarding when none remain). Throws on failure
  // so the caller can surface the message.
  async function removePet(petId) {
    await api.deletePet(petId)
    const nextPets = await api.listPets()
    setPets(nextPets)
    setSelectedPetId((prev) => (prev === petId ? (nextPets[0]?.id ?? null) : prev))
    setOverview(null)
  }

  async function loadPetData(petId) {
    setError('')
    try {
      const [nextOverview, nextCheckIns, nextFoodLogs, nextPatterns, nextPhotos, nextTrials, nextRecap, nextMeds, nextActivities] = await Promise.all([
        api.getOverview(petId),
        api.listCheckIns(petId),
        api.listFoodLogs(petId),
        api.listPatterns(petId),
        api.listPhotos(petId),
        api.listFoodTrials(petId),
        api.getRecap(petId, 30),
        api.listMedications(petId),
        api.listActivities(petId)
      ])
      setOverview(nextOverview)
      setCheckIns(nextCheckIns)
      setFoodLogs(nextFoodLogs)
      setPatterns(nextPatterns)
      setPhotos(nextPhotos)
      setFoodTrials(nextTrials)
      setRecap(nextRecap)
      setMedications(nextMeds)
      setActivities(nextActivities)
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

  // Show a brief confirmation. A new object each time (via the bumping seq) so
  // the dismiss effect re-runs and the timer restarts even for a repeat message.
  function showToast(message) {
    toastSeq.current += 1
    setToast({ message, key: toastSeq.current })
  }

  async function setPatternStatus(pattern, status) {
    if (!selectedPet || !pattern) return
    setError('')
    try {
      await api.setPatternStatus(selectedPet.id, pattern.id, status)
      if (status === 'SHARED_WITH_VET') showToast(t('Added to vet summary'))
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

  // Add a profile photo from the desktop sidebar or the mobile pet switcher.
  // Profile photos live in the same lightweight photo store, but are marked as
  // PROFILE so they stay out of the health-photo gallery and timeline. A pet has a
  // single cover: the new photo REPLACES the old one — once the upload succeeds we
  // retire any previous PROFILE photos so they don't pile up unseen in the DB. The
  // order matters: upload first, delete after, so a failed upload never leaves the
  // pet with no photo. Health photos (ear/paw/wound…) are untouched and keep their
  // full history.
  async function addPetPhoto(file) {
    if (!selectedPet || !file) return
    setError('')
    try {
      const blob = await resizeImage(file, 1400, 0.82)
      const formData = new FormData()
      formData.append('file', blob, 'photo.jpg')
      formData.append('area', 'PROFILE')
      formData.append('capturedDate', today)
      await api.uploadPhoto(selectedPet.id, formData)
      const priorProfile = (photos || []).filter(isProfilePhoto)
      if (priorProfile.length) {
        await Promise.allSettled(priorProfile.map((p) => api.deletePhoto(selectedPet.id, p.id)))
      }
      setPhotos(await api.listPhotos(selectedPet.id))
      setPets(await api.listPets())
      showToast(t("Profile photo added — that's {name} now.", { name: selectedPet.name }))
    } catch (err) {
      setError('That photo could not be added. Try a JPEG or PNG.')
    }
  }

  // Attach a health / visible-change photo tagged with a body area (WOUND, SKIN,
  // SHELL, FEATHER, FIN_SCALE, …) and dated to the check-in day, so it lines up in
  // the area-grouped progression view. Unlike addPetPhoto this is NOT a profile photo.
  async function addHealthPhoto(file, area, capturedDate) {
    if (!selectedPet || !file) return null
    setError('')
    try {
      const blob = await resizeImage(file, 1400, 0.82)
      const formData = new FormData()
      formData.append('file', blob, 'photo.jpg')
      formData.append('area', area || 'WOUND')
      formData.append('capturedDate', capturedDate || today)
      const saved = await api.uploadPhoto(selectedPet.id, formData)
      setPhotos(await api.listPhotos(selectedPet.id))
      showToast(t('Photo added — track how it looks over time.'))
      return saved
    } catch (err) {
      setError('That photo could not be added. Try a JPEG or PNG.')
      return null
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

  async function addActivity(type) {
    if (!selectedPet) return
    setError('')
    try {
      await api.addActivity(selectedPet.id, { type, occurredDate: today })
      await loadPetData(selectedPet.id)   // refreshes activities + overview (weekly insight)
    } catch (err) {
      setError('Could not log the activity. Try again in a moment.')
    }
  }

  async function removeActivity(activity) {
    if (!selectedPet || !activity) return
    if (!window.confirm('Remove this activity?')) return
    setError('')
    try {
      await api.deleteActivity(selectedPet.id, activity.id)
      await loadPetData(selectedPet.id)
    } catch (err) {
      setError('Could not remove the activity. Try again in a moment.')
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
    } else if (isStarterSpecies(selectedPet?.species)) {
      setCheckInForm({
        checkInDate: item.checkInDate,
        freeTextNote: item.freeTextNote ?? '',
        observations: parseObservations(item.observationsJson)
      })
    } else {
      setCheckInForm({
        ...shared,
        // Snap to the nearest even chip the Scratching control renders, so the
        // value is always visibly selected when editing (odd scores can arrive
        // from the AI parse path).
        itchingScore: item.itchingScore == null ? 0 : Math.min(10, Math.round(item.itchingScore / 2) * 2),
        stoolState: item.stoolState ?? 'NORMAL',
        earRedness: !!item.earRedness,
        pawLicking: !!item.pawLicking
      })
    }
    // Editing an existing check-in always opens the full form, never a guided flow.
    setCheckInStartMode('full')
    setCheckInOpenSeq((n) => n + 1)
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

  // Milo the cat demo. Seeds Milo alongside Bella under the same demo account, then
  // selects Milo so the cat-specific signals show immediately. loadInitial() (via
  // afterSignedIn) defaults to Bella, so we override the selection afterwards.
  async function signInCatDemo() {
    const milo = await api.seedCatDemo()
    await afterSignedIn(await api.me())
    if (milo?.id) setSelectedPetId(milo.id)
    go('today')
  }

  async function loadCatDemo() {
    setError('')
    setSaving(true)
    try {
      await signInCatDemo()
    } catch (err) {
      setError(t('Demo could not load. Try again in a moment.'))
    } finally {
      setSaving(false)
    }
  }

  // Poppy the rabbit — a starter-species demo (flexible observations model).
  async function signInRabbitDemo() {
    const poppy = await api.seedRabbitDemo()
    await afterSignedIn(await api.me())
    if (poppy?.id) setSelectedPetId(poppy.id)
    go('today')
  }

  async function loadRabbitDemo() {
    setError('')
    setSaving(true)
    try {
      await signInRabbitDemo()
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

  // Open a fresh daily check-in seeded for the selected pet's species. Mode picks
  // the entry point: 'full' (nav Log), 'changed' or 'note' (Today decision cards).
  // Guard the arg — onClick handlers pass a DOM event, not a mode string.
  function openCheckIn(mode = 'full') {
    const startMode = typeof mode === 'string' ? mode : 'full'
    setCheckInStartMode(startMode)
    setCheckInForm(emptyCheckInFor(selectedPet?.species))
    setCheckInOpenSeq((n) => n + 1)
    go('check-in')
  }

  // Open a fresh check-in seeded to a specific past day (from "Find a day" → "Log
  // this day", or the Today backfill rows). Opens the guided "changed" flow; the
  // date field stays visible and is capped at today.
  function openCheckInForDate(date) {
    const day = date && date > today ? today : date
    setCheckInStartMode('changed')
    setCheckInForm({ ...emptyCheckInFor(selectedPet?.species), checkInDate: day })
    setCheckInOpenSeq((n) => n + 1)
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
      // Every species can carry observations now: starter-species signals and the
      // universal visible-change note. Strip the working object and send the JSON
      // (null when nothing was recorded — dog/cat keep using their explicit columns).
      const { observations, ...rest } = checkInForm
      const payload = { ...rest, observationsJson: toObservationsJson(checkInForm, selectedPet.species) }
      await api.saveCheckIn(selectedPet.id, payload)
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

  async function quickLog(date = today) {
    if (!selectedPet) return
    // Guard: onClick passes a DOM event, and a future date is never valid — so a
    // non-string or out-of-range value falls back to today. A past date lets the
    // Today "fill the last few days" rows save a quiet day for that day.
    const day = typeof date === 'string' && date <= today ? date : today
    setError('')
    setSaving(true)
    try {
      const base = latestCheckIn
      const cat = isCat(selectedPet)
      let payload
      if (!base) {
        payload = { ...emptyCheckInFor(selectedPet.species), checkInDate: day }
      } else if (cat) {
        payload = {
          checkInDate: day,
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
          checkInDate: day,
          itchingScore: base.itchingScore ?? 2,
          stoolState: keep(base.stoolState),
          appetiteLevel: keep(base.appetiteLevel),
          waterLevel: keep(base.waterLevel),
          energyLevel: keep(base.energyLevel),
          // Acute flags are never carried forward — a quiet day starts clean.
          vomiting: false,
          earRedness: false,
          pawLicking: false,
          freeTextNote: ''
        }
      }
      await api.saveCheckIn(selectedPet.id, payload)
      track('checkin_created')
      setCheckInForm(emptyCheckInFor(selectedPet.species))
      await loadPetData(selectedPet.id)
      showToast(t('Saved — quiet days matter too.'))
      // Works from both the Today nudge and the Daily Log form — a no-op if
      // already on Today, and returns to Today when saved from the form.
      go('today')
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
    return <AuthScreen lang={lang} onLangChange={switchLang} onLogin={signIn} onRegister={signUp} onDemo={signInDemo} onCatDemo={signInCatDemo} onRabbitDemo={signInRabbitDemo} demoEnabled={demoEnabled} googleEnabled={googleEnabled} />
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
    return <AccountView owner={owner} pets={pets} onDeletePet={removePet} onBack={() => go('today')} onDeleted={afterAccountDeleted} />
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
              <Settings size={16} /> <span className="btn-label">{t('Account')}</span>
            </button>
            <button className="text-button logout-button" type="button" onClick={logout} title={owner?.email}>
              <LogOut size={16} /> <span className="btn-label">{t('Sign out')}</span>
            </button>
          </div>
          {invites.length > 0 && (
            <InvitesBanner invites={invites} onAccept={acceptInvite} onDecline={declineInvite} />
          )}
          <PetOnboarding
            onCreate={createPetFromOnboarding}
            onFinish={finishOnboarding}
            onDemo={loadDemo}
            onCatDemo={loadCatDemo}
            onRabbitDemo={loadRabbitDemo}
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
          <span className="brand-mark"><BrandMark size={20} /></span>
          <span className="brand-text">
            <strong>PetPattern</strong>
            <span className="brand-tagline">{t('A private health notebook for your pets')}</span>
          </span>
        </div>

        <div className="rail-group rail-pets">
          {selectedPet && <PetIdentityCard pet={selectedPet} photos={photos} onAddPhoto={addPetPhoto} />}
          <PetSwitcher
            pets={pets}
            selectedPetId={selectedPetId}
            onSelect={setSelectedPetId}
            onAdd={() => go('add-pet')}
            onAddPhoto={addPetPhoto}
            canAdd={pets.length < maxPets}
          />
          <div className="pet-tabs">
            {pets.some((p) => p.id !== selectedPetId) && <p className="rail-label pet-tabs-label">{t('Switch pet')}</p>}
            {pets.filter((p) => p.id !== selectedPetId).map((pet) => (
              <button key={pet.id} className="pet-tab" type="button" onClick={() => setSelectedPetId(pet.id)}>
                <PetAvatar pet={pet} size={22} /> {pet.name}
              </button>
            ))}
            {pets.length < maxPets && (
              <button className="pet-tab add-pet-tab" type="button" onClick={() => go('add-pet')}>
                <Plus size={15} /> {t('Add pet')}
              </button>
            )}
          </div>
        </div>

        <nav className="record-nav" aria-label="PetPattern sections">
          <p className="rail-label record-nav-head">{t('Notebook')}</p>
          <Tab active={view === 'today'} onClick={() => go('today')} icon={<PawPrint size={16} />} label={t('{name} today', { name: selectedPet.name })} />
          <Tab active={view === 'check-in' || view === 'photos'} onClick={() => openCheckIn('full')} icon={<ClipboardList size={16} />} label={t('Log')} />
          <Tab active={view === 'food' || view === 'trial'} onClick={() => go('food')} icon={<Utensils size={16} />} label={t('Food')} />
          <Tab active={view === 'patterns' || view === 'timeline' || view === 'recap'} onClick={() => go('patterns')} icon={<Activity size={16} />} label={t('Changes')} />
          <Tab active={view === 'vet'} onClick={() => openVetSummary()} icon={<Stethoscope size={16} />} label={t('Vet')} />
        </nav>

        <div className="rail-group rail-account">
          <p className="rail-label">{t('My account')}</p>
          {owner && <span className="rail-owner">{owner.displayName || owner.email}</span>}
          <LangToggle lang={lang} onChange={switchLang} />
          <button className="text-button" type="button" onClick={() => go('account')} title={t('Account')}>
            <Settings size={16} /> <span className="btn-label">{t('Account')}</span>
          </button>
          <button className="text-button logout-button" type="button" onClick={logout} title={owner?.email}>
            <LogOut size={16} /> <span className="btn-label">{t('Sign out')}</span>
          </button>
        </div>
      </header>

      <div className="record-body">
      {invites.length > 0 && (
        <InvitesBanner invites={invites} onAccept={acceptInvite} onDecline={declineInvite} />
      )}

      <main className="screen">
        {error && <div className="error-box" role="alert">{error}</div>}

        {view === 'check-in' && (
          <CheckInView
            key={checkInOpenSeq}
            pet={selectedPet}
            form={checkInForm}
            setForm={setCheckInForm}
            saving={saving}
            aiSuggestEnabled={aiSuggestEnabled}
            startMode={checkInStartMode}
            onBack={() => go('today')}
            onSave={saveCheckIn}
            onQuickLog={quickLog}
            onAddFood={addFoodFromSuggestion}
            onAddPhoto={() => go('photos')}
            onAddHealthPhoto={addHealthPhoto}
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
            onFoodDetective={() => go('food-detective')}
          />
        )}

        {view === 'food-detective' && (
          <FoodDetectiveView
            pet={selectedPet}
            foodLogs={foodLogs}
            checkIns={checkIns}
            onBack={() => go('food')}
            onFoodChange={() => go('food')}
          />
        )}

        {view === 'patterns' && (
          <PatternsView
            pet={selectedPet}
            patterns={patterns}
            checkIns={checkIns}
            foodLogs={foodLogs}
            recap={recap}
            onBack={() => go('today')}
            onShowTimeline={openTimeline}
            onSetStatus={setPatternStatus}
            onRecap={() => go('recap')}
            onVetSummary={() => openVetSummary()}
            onFoodDetective={() => go('food-detective')}
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
            checkIns={checkIns}
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
            onLogToday={() => openCheckIn('full')}
            onSomethingChanged={() => openCheckIn('changed')}
            onAddNoteOrPhoto={() => openCheckIn('note')}
            onFoodChange={() => go('food')}
            onFoodDetective={() => go('food-detective')}
            onPatterns={() => go('patterns')}
            onShowTimeline={openTimeline}
            onVetSummary={() => openVetSummary()}
            onEditCheckIn={editCheckIn}
            onDeleteCheckIn={removeCheckIn}
            onQuickLog={quickLog}
            onCaregivers={() => go('caregivers')}
            onLogDay={openCheckInForDate}
            activities={activities}
            onAddActivity={addActivity}
            onRemoveActivity={removeActivity}
          />
        )}
      </main>
      </div>
      {toast && <Toast key={toast.key} message={toast.message} onDismiss={() => setToast(null)} />}
    </div>
  )
}

// A transparent timeline: each food/treat change with the notable check-in signals
// logged within the following week. It lines things up — it never claims a cause.
function FoodDetectiveView({ pet, foodLogs, checkIns, onBack, onFoodChange }) {
  const profile = speciesProfile(pet.species)
  const environment = profile.detectiveMode === 'ENVIRONMENT'
  const hasData = foodLogs?.length > 0 && checkIns?.length > 0
  const byDateAsc = [...(checkIns || [])].sort((a, b) => (a.checkInDate < b.checkInDate ? -1 : 1))
  const entries = [...(foodLogs || [])]
    .sort((a, b) => (a.dateStarted < b.dateStarted ? 1 : -1))
    .slice(0, 12)
    .map((food) => {
      const start = food.dateStarted
      const end = addDays(start, 7)
      const nearby = byDateAsc
        .filter((c) => c.checkInDate >= start && c.checkInDate <= end)
        .flatMap((c) => {
          const n = Math.round((parseLocalDate(c.checkInDate) - parseLocalDate(start)) / 86400000)
          return foodDetectiveSignals(c, pet.species).map((sig) => ({ n, sig }))
        })
        .slice(0, 8)
      return { food, nearby }
    })

  return (
    <section className="flow-panel food-detective">
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> {t('Back')}</button>
      <p className="kicker">{t('Timeline')}</p>
      <h1>{environment ? t('Environment detective') : t('Food detective')}</h1>
      <p className="lead">{environment
        ? t('See whether appetite, activity, droppings or other changes often happen near a care or environment change.')
        : t('See whether stool, scratching, appetite, vomiting, or energy changes often happen near food or treat changes.')}</p>
      <p className="pattern-disclaimer muted">{environment
        ? t('PetPattern lines up care or environment changes with later observations. This is not a diagnosis.')
        : t('This is not an allergy diagnosis. It is a timeline you can discuss with your vet.')}</p>

      {!hasData ? (
        <article className="panel">
          <p className="muted">{t('Add a food or treat change and a few check-ins. PetPattern will line them up here.')}</p>
        </article>
      ) : (
        <div className="detective-list">
          {entries.map(({ food, nearby }) => (
            <article className="panel detective-entry" key={food.id}>
              <div className="detective-head">
                <strong>{formatDate(food.dateStarted)}</strong>
                <span className="detective-food">{[food.brand, food.productName].filter(Boolean).join(' - ') || foodKindLabel(food.foodKind)}</span>
                <div className="chip-row">
                  <span className="chip">{proteinLabel(food.primaryProtein)}</span>
                  <span className="chip">{foodKindLabel(food.foodKind)}</span>
                  {food.newFood && <span className="chip alert">{t('New')}</span>}
                </div>
              </div>
              {nearby.length > 0 ? (
                <ul className="detective-signals">
                  {nearby.map((row, idx) => (
                    <li key={idx}>
                      <span className="detective-when">{row.n <= 0 ? t('Same day') : row.n === 1 ? t('1 day after') : t('{n} days after', { n: row.n })}</span>
                      <span className="detective-sig">{row.sig}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">{t('Nothing notable was logged in the week after this change.')}</p>
              )}
            </article>
          ))}
        </div>
      )}

      <div className="context-cta">
        <p className="muted">{t('These signals were logged near a change — worth mentioning to your vet, not a proven cause.')}</p>
        <button className="secondary-button" type="button" onClick={onFoodChange}>
          <Utensils size={18} /> {t('Add food change')}
        </button>
      </div>
    </section>
  )
}

function FoodView({ pet, form, setForm, saving, foodLogs, onBack, onSave, onDeleteFood, onTrial, onFoodDetective }) {
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
      <p className="kicker">{t('Food & treats')}</p>
      <h1>{t('{name} · food', { name: pet.name })}</h1>
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
          label={t('Main ingredient')}
          value={form.primaryProtein}
          options={proteinOptions.map((value) => ({ value, label: proteinLabel(value) }))}
          onChange={(primaryProtein) => setForm({ ...form, primaryProtein })}
        />

        <div className="choice-block">
          <span>{t('Other ingredients')}</span>
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

        <div className="field-label">
          {t('Date started')}
          <DateField value={form.dateStarted} label={t('Date started')} onChange={(d) => setForm({ ...form, dateStarted: d })} />
        </div>

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
                  <span className="muted"> · {proteinLabel(food.primaryProtein)}{food.newFood ? ` · ${t('new')}` : ''}</span>
                </div>
                <button className="icon-button danger" type="button" aria-label={`Delete food entry from ${formatDate(food.dateStarted)}`} onClick={() => onDeleteFood(food)}>
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {onFoodDetective && (
        <div className="context-cta">
          <p className="muted">{t('Wondering if a food change lines up with a change in how {name} felt?', { name: pet.name })}</p>
          <button className="secondary-button" type="button" onClick={onFoodDetective}>
            <Search size={18} /> {t('See food timeline')}
          </button>
        </div>
      )}

      <div className="context-cta">
        <p className="muted">{t('Already changing food with your vet? You can note when a change started and keep watching how {name} does.', { name: pet.name })}</p>
        <button className="secondary-button" type="button" onClick={onTrial}>
          <FlaskConical size={18} /> {t('Track a food change')}
        </button>
      </div>
    </section>
  )
}

// A small ring gauge for the "days filled" vet stat — pure SVG, no dependency.
function Donut({ pct }) {
  const p = Math.max(0, Math.min(100, Math.round(pct || 0)))
  const r = 15.5
  const circ = 2 * Math.PI * r
  return (
    <svg className="vet-donut" viewBox="0 0 40 40" role="img" aria-label={`${p}%`}>
      <circle cx="20" cy="20" r={r} className="vet-donut-track" />
      <circle cx="20" cy="20" r={r} className="vet-donut-arc"
        strokeDasharray={`${(circ * p / 100).toFixed(1)} ${circ.toFixed(1)}`} transform="rotate(-90 20 20)" />
      <text x="20" y="20" className="vet-donut-label">{p}%</text>
    </svg>
  )
}

// Scannable header stats for the vet summary — days tracked · entries logged · how
// full the record is. On-screen only (no-print); the printable sheet below carries
// the full detail. Mirrors the summary's own range so the numbers always agree.
function VetStats({ summary, checkIns }) {
  const days = summary?.days || 0
  const start = summary?.rangeStart
  const end = summary?.rangeEnd
  const entries = (checkIns || []).filter((c) => (!start || c.checkInDate >= start) && (!end || c.checkInDate <= end)).length
  const pct = days ? Math.min(100, Math.round((entries / days) * 100)) : 0
  return (
    <div className="vet-stats no-print">
      <div className="vet-stat">
        <strong>{days}</strong>
        <span>{t('days tracked')}</span>
      </div>
      <div className="vet-stat">
        <strong>{entries}</strong>
        <span>{t('entries')}</span>
      </div>
      <div className="vet-stat">
        <Donut pct={pct} />
        <span>{t('days filled')}</span>
      </div>
    </div>
  )
}

function VetSummaryView({ pet, summary, loading, days, checkIns, onBack, onChangeDays, onMedications }) {
  const [copied, setCopied] = useState(false)
  // Native share is mostly a phone/tablet capability; on a desktop without it the
  // "Copy summary" button below is the fallback, so we simply hide Share there.
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

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

  async function shareSummary() {
    if (!summary?.plainText) return
    const title = t('PetPattern summary — {name}', { name: summary.pet?.name || pet.name })
    if (navigator.share) {
      try {
        await navigator.share({ title, text: summary.plainText })
      } catch (err) {
        // Share sheet dismissed or failed — cancelling is normal, so do nothing.
      }
    } else {
      copySummary()
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
        <p className="kicker">{t('Bring this to your vet')}</p>
        <h1>{t('Vet visit summary')}</h1>
        <p className="muted">{t('Nothing to summarise yet. Log a few days and this becomes a clear, shareable note for your vet.')}</p>
      </section>
    )
  }

  return (
    <section className="flow-panel vet-summary">
      <button className="back-button no-print" type="button" onClick={onBack}><ArrowLeft size={17} /> {t('Back')}</button>
      <p className="kicker">{t('Bring this to your vet')}</p>
      <h1>{t('Vet visit summary')}</h1>
      <p className="lead">{t('A calm record of what you logged. Built to help a vet conversation, not to diagnose.')}</p>

      <VetStats summary={summary} checkIns={checkIns} />

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
          {canShare && (
            <button className="secondary-button" type="button" onClick={shareSummary}>
              <Share2 size={16} /> {t('Share summary')}
            </button>
          )}
          <button className={canShare ? 'ghost-button' : 'secondary-button'} type="button" onClick={copySummary}>
            <Copy size={16} /> {copied ? t('Copied') : t('Copy summary')}
          </button>
          <button className="ghost-button" type="button" onClick={() => window.print()}>
            <Printer size={16} /> {t('Save as PDF')}
          </button>
        </div>
      </div>

      <VetSheet summary={summary} species={pet?.species} onMedications={onMedications} checkIns={checkIns} />
    </section>
  )
}

function VetSheet({ summary, species, onMedications, checkIns }) {
  const identity = summary.pet
  // Stool is a dog signal; cats track litter box; starter species use the flexible
  // observations model — so gate each dog/cat section by the exact species. Use the
  // real enum code when available (owner view); fall back to the localized display
  // label for the shared-link view, which has no enum client-side.
  const cat = species ? species === 'CAT' : /cat/i.test(identity?.species || '')
  const dog = species ? species === 'DOG' : /dog/i.test(identity?.species || '')
  const starter = species ? isStarterSpecies(species) : !(cat || dog)
  const observationRows = starter ? starterObservationRows(checkIns) : []
  return (
    <div className="vet-sheet">
      <section className="vet-block vet-report-head">
        <p className="vet-report-kicker">{t('PetPattern vet summary')}</p>
        <h2>{identity?.name}</h2>
        <p className="vet-identity">
          {[identity?.species, identity?.breed, identity?.ageLabel, identity?.sex, identity?.weightKg ? `${identity.weightKg} kg` : null]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <p className="vet-range">{formatLongDate(summary.rangeStart)} – {formatLongDate(summary.rangeEnd)} ({summary.days} {t('days')})</p>
        <p className="vet-report-note muted">{t('Owner-observed timeline, not a diagnosis.')}</p>
      </section>

      <VetBlock title={t('Owner-observed concern')}>
        <p>{summary.mainConcern}</p>
      </VetBlock>

      <VetBlock title={t('Recent check-in summary')}>
        <p>{summary.checkInSummary?.narrative}</p>
      </VetBlock>

      <VetBlock title={t('Food & treats')}>
        {summary.foodChanges?.length ? (
          <ul className="vet-list">
            {summary.foodChanges.map((food, index) => (
              <li key={`${food.dateStarted}-${index}`}>
                <strong>{formatDate(food.dateStarted)}</strong> — {food.label}
                <span className="muted"> ({[foodKindLabel(food.foodKind), food.primaryProtein ? proteinLabel(food.primaryProtein) : null, food.newFood ? t('new food') : null].filter(Boolean).join(', ')})</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t('No food changes logged in this period.')}</p>
        )}
      </VetBlock>

      <VetBlock title={t('Medications & care notes')}>
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

      {dog && (
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

      {!starter && (
        <VetBlock title={t('Water, appetite & energy')}>
          <p>{summary.wellbeing?.narrative}</p>
        </VetBlock>
      )}

      {starter && (
        <VetBlock title={t('Species-specific observations')}>
          {observationRows.length ? (
            <ul className="vet-observations-list">
              {observationRows.map((row, index) => (
                <li key={index}><span className="obs-date">{formatDate(row.date)}</span> — {row.text}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t('No species-specific observations logged in this period.')}</p>
          )}
        </VetBlock>
      )}

      {summary.visibleChanges && (
        <VetBlock title={t('Visible changes over time')}>
          <p className="muted">{t('Track how this looked over time. Useful to show your vet. Not a diagnosis.')}</p>
          {summary.visibleChanges.entries?.length ? (
            <ul className="vet-list vet-visible-changes">
              {summary.visibleChanges.entries.map((entry, index) => (
                <li key={`${entry.date}-${index}`}>
                  <strong>{formatDate(entry.date)}</strong> — {t(entry.value)}
                  {entry.status && <span className="vc-status"> ({t(titleCase(entry.status))})</span>}
                  {entry.note && <span className="muted"> — {entry.note}</span>}
                  {entry.photoCount > 0 && (
                    <span className="muted vc-photos"> · <ImagePlus size={12} /> {entry.photoCount}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{summary.visibleChanges.narrative}</p>
          )}
        </VetBlock>
      )}

      <VetBlock title={t('Possible patterns')}>
        {summary.patterns?.length ? (
          <ul className="vet-list">
            {summary.patterns.map((p, index) => (
              <li key={`${p.type}-${index}`}>
                <span className="pattern-flag">{t('Worth mentioning')}</span>
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

  const healthPhotos = (photos ?? []).filter((photo) => !isProfilePhoto(photo))
  const groups = PHOTO_AREAS
    .map((code) => ({ code, items: healthPhotos.filter((photo) => photo.area === code) }))
    .filter((group) => group.items.length > 0)

  return (
    <section className="flow-panel">
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> {t('Back')}</button>
      <p className="kicker">{t('Photo record')}</p>
      <h1>{t("{name}'s photos", { name: pet.name })}</h1>
      <p className="lead">{t('Add a photo of anything you want to keep an eye on and watch how it changes over time — handy to show your vet.')}</p>

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
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onFile} />
        <button className="primary-button wide" type="button" disabled={uploading} onClick={() => fileRef.current?.click()}>
          <ImagePlus size={18} /> {uploading ? t('Adding…') : t('Add a photo')}
        </button>
        {error && <p className="ai-error">{error}</p>}
      </div>

      {groups.length === 0 ? (
        <article className="panel">
          <h2>{t('No photos yet')}</h2>
          <p className="muted">{t("Add {name}'s first photo to start a visual record you can compare later.", { name: pet.name })}</p>
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
      <p className="kicker">{t('Food & treats')}</p>
      <h1>{t('Careful food tracking')}</h1>
      <p className="lead">{t("If you're already changing {name}'s food with your vet, you can note when the change started and keep watching how they do.", { name: pet.name })}</p>
      <p className="reassure">{t('Do not change your pet’s diet because of the app. This record only helps track changes you are already making or discussing with your vet.')}</p>

      {formOpen ? (
        <form className="quick-form" onSubmit={submit}>
          <QuickChoices
            label={t('Which ingredient are you leaving out?')}
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
          <div className="field-label">
            {t('Start date')}
            <DateField value={startDate} label={t('Start date')} onChange={setStartDate} />
          </div>
          <label className="field-label">
            {t('Notes')}
            <textarea value={notes} maxLength={500} placeholder={t('What changed, and anything your vet said…')} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <button className="primary-button wide" type="submit"><FlaskConical size={18} /> {t('Start tracking')}</button>
        </form>
      ) : (
        <div className="action-row">
          <button className="secondary-button" type="button" onClick={() => setShowForm(true)}>
            <FlaskConical size={18} /> {t('Track a food change')}
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
      <h2>{t('Leaving out: {protein}', { protein: trial.proteinLabel })}</h2>
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

function AuthScreen({ lang, onLangChange, onLogin, onRegister, onDemo, onCatDemo, onRabbitDemo, demoEnabled = true, googleEnabled = false }) {
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

  async function catDemo() {
    if (!onCatDemo) return
    setError('')
    setBusy(true)
    try {
      await onCatDemo()
    } catch (err) {
      setError(t('Demo could not load. Try again in a moment.'))
      setBusy(false)
    }
  }

  async function rabbitDemo() {
    if (!onRabbitDemo) return
    setError('')
    setBusy(true)
    try {
      await onRabbitDemo()
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
        <h1 className="auth-hero">{t('PetPattern remembers what changed.')}</h1>
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

        <p className="form-title">{mode === 'login' ? t('Welcome back') : mode === 'register' ? t('Create your account') : t('Reset your password')}</p>
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
            <div className="demo-buttons">
              <button className="secondary-button" type="button" onClick={demo} disabled={busy}>
                <Dog size={18} /> {t('Try dog demo')}
              </button>
              {onCatDemo && (
                <button className="secondary-button" type="button" onClick={catDemo} disabled={busy}>
                  <Cat size={18} /> {t('Try cat demo')}
                </button>
              )}
              {onRabbitDemo && (
                <button className="secondary-button" type="button" onClick={rabbitDemo} disabled={busy}>
                  <span className="btn-emoji" aria-hidden="true">🐰</span> {t('Try rabbit demo')}
                </button>
              )}
            </div>
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
      <p className="lead">{t('A simple record of medicines and care notes — handy to show your vet, and to line up against how {name} has been.', { name: pet.name })}</p>

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
          <p className="muted">{t('Add a medicine or care note above when {name} starts one.', { name: pet.name })}</p>
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

// Compact pet picker for the wrapping mobile/tablet bar, where a row of pet tabs
// would overflow once an owner has more than a few. On the desktop spine the
// vertical pet list is used instead (this is hidden by CSS there).
function PetSwitcher({ pets, selectedPetId, onSelect, onAdd, onAddPhoto, canAdd }) {
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const ref = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  const current = pets.find((p) => p.id === selectedPetId) || pets[0]
  const canAddPhoto = Boolean(current && current.owned !== false && onAddPhoto)

  async function onFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !canAddPhoto) return
    setUploading(true)
    try {
      await onAddPhoto(file)
      setOpen(false)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="pet-switcher" ref={ref}>
      <button type="button" className="pet-switcher-trigger" aria-haspopup="listbox" aria-expanded={open}
              aria-label={t('My pets')} onClick={() => setOpen((o) => !o)}>
        {current ? <PetAvatar pet={current} size={22} /> : <PawPrint size={16} />}
        <span className="pet-switcher-name">{current?.name}</span>
        <ChevronDown className="chev" size={15} />
      </button>
      {open && (
        <div className="pet-switcher-list" role="listbox" aria-label={t('My pets')}>
          {canAddPhoto && current && (
            <>
              <button type="button" className="pet-switcher-photo-action"
                      onClick={() => fileRef.current?.click()} disabled={uploading}>
                <PetAvatar pet={current} size={34} />
                <span className="pet-switcher-photo-copy">
                  <strong>{current.avatarImageUrl ? t('Change photo for {name}', { name: current.name }) : t('Add photo for {name}', { name: current.name })}</strong>
                  <span>{t('This becomes the little picture for this pet.')}</span>
                </span>
                <ImagePlus size={16} aria-hidden="true" />
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onFile} />
            </>
          )}
          {pets.map((pet) => (
            <button key={pet.id} type="button" role="option" aria-selected={pet.id === selectedPetId}
                    className={pet.id === selectedPetId ? 'pet-switcher-item active' : 'pet-switcher-item'}
                    onClick={() => { onSelect(pet.id); setOpen(false) }}>
              <PetAvatar pet={pet} size={20} />
              <span>{pet.name}</span>
              {pet.id === selectedPetId && <Check className="check" size={15} />}
            </button>
          ))}
          {canAdd && (
            <button type="button" className="pet-switcher-item add" onClick={() => { onAdd(); setOpen(false) }}>
              <Plus size={15} /> {t('Add pet')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

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

function AccountView({ owner, pets = [], onDeletePet, onBack, onDeleted }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const ownedPets = pets.filter((pet) => pet.owned)

  async function deletePet(pet) {
    if (!window.confirm(t("Delete {name}? This permanently removes all of {name}'s logs and photos, and cannot be undone.", { name: pet.name }))) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await onDeletePet(pet.id)
      setMessage(t('{name} was deleted.', { name: pet.name }))
    } catch (err) {
      setError(err.message || t('Something went wrong. Try again.'))
    } finally {
      setBusy(false)
    }
  }

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

        {ownedPets.length > 0 && (
          <div className="account-section">
            <h2>{t('Your pets')}</h2>
            <p className="muted">{t('Remove a pet and all of its logs. This cannot be undone.')}</p>
            <ul className="account-pet-list">
              {ownedPets.map((pet) => (
                <li key={pet.id}>
                  <span>{pet.name}</span>
                  <button className="chip-button subtle danger" type="button" onClick={() => deletePet(pet)} disabled={busy}>
                    <Trash2 size={15} /> {t('Delete')}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

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


export default App
