import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react'
import {
  Activity,
  Check,
  ClipboardList,
  LogOut,
  PawPrint,
  Plus,
  Settings,
  Stethoscope,
  Utensils
} from 'lucide-react'
import { api, setUnauthorizedHandler } from './api'
import { t, setLang, loadLang, persistLang } from './i18n'
import { track, trackServer, consumeNotificationConversion } from './analytics'
import { initReminderTapHandler } from './lib/nativeNotifications'
import { isStarterSpecies } from './speciesProfiles'
import { today } from './lib/date'
import { isCat } from './lib/species'
import { emptyCheckIn, emptyCheckInFor, keep, toObservationsJson, parseObservations, quickCheckInPayload } from './lib/checkins'
import { saveDraft, loadDraft, clearDraft, isMeaningfulDraft } from './lib/draft'
import { emptyFood } from './lib/food'
import { isDismissedStatus } from './lib/patterns'
import { hashView, sharedTokenFromHash, resetTokenFromHash, legalFromHash } from './lib/nav'
import { isProfilePhoto, resizeImage } from './lib/photos'
import { BrandMark } from './components/BrandMark'
import { PetAvatar } from './components/PetAvatar'
import { PetIdentityCard } from './components/PetIdentityCard'
import { Toast } from './components/Toast'
import { LangToggle } from './components/LangToggle'
import { Tab } from './components/Tab'
import { ChunkErrorBoundary, ViewFallback } from './components/ChunkErrorBoundary'
// Primary flow — kept in the initial bundle so Today and check-in stay instant.
import { TodayView } from './features/today/TodayView'
import { CheckInView } from './features/checkins/CheckInView'
import { SharedVetView } from './features/vet/SharedVetView'
import { InvitesBanner } from './features/caregivers/InvitesBanner'
import { AuthScreen } from './features/auth/AuthScreen'
import { ResetPasswordView } from './features/auth/ResetPasswordView'
import { PetOnboarding } from './features/onboarding/PetOnboarding'
import { PetSwitcher } from './features/account/PetSwitcher'
// Secondary feature views — lazily loaded (their modules use named exports) so they leave the
// initial chunk. Each is rendered inside a Suspense boundary with a loading fallback.
const PatternsView = lazy(() => import('./features/patterns/PatternsView').then((m) => ({ default: m.PatternsView })))
const TimelineView = lazy(() => import('./features/patterns/TimelineView').then((m) => ({ default: m.TimelineView })))
const FoodView = lazy(() => import('./features/food/FoodView').then((m) => ({ default: m.FoodView })))
const FoodDetectiveView = lazy(() => import('./features/food/FoodDetectiveView').then((m) => ({ default: m.FoodDetectiveView })))
const TrialsView = lazy(() => import('./features/food/TrialsView').then((m) => ({ default: m.TrialsView })))
const PhotosView = lazy(() => import('./features/photos/PhotosView').then((m) => ({ default: m.PhotosView })))
const VetSummaryView = lazy(() => import('./features/vet/VetSummaryView').then((m) => ({ default: m.VetSummaryView })))
const RecapView = lazy(() => import('./features/vet/RecapView').then((m) => ({ default: m.RecapView })))
const CaregiversView = lazy(() => import('./features/caregivers/CaregiversView').then((m) => ({ default: m.CaregiversView })))
const AccountView = lazy(() => import('./features/account/AccountView').then((m) => ({ default: m.AccountView })))
const MedicationsView = lazy(() => import('./features/account/MedicationsView').then((m) => ({ default: m.MedicationsView })))
const LegalView = lazy(() => import('./features/legal/LegalView').then((m) => ({ default: m.LegalView })))

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
  // A recovered check-in draft to offer the owner (Part 3), or null.
  const [draftPrompt, setDraftPrompt] = useState(null)
  // True while editing an EXISTING check-in — such a form must never be saved as a
  // new-check-in draft (it would later be offered with the wrong, past date).
  const [editingCheckIn, setEditingCheckIn] = useState(false)
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
  // The current-food panel is the active MAIN_FOOD, never the newest treat/supplement (Part 1).
  const currentFood = overview?.currentFood ?? foodLogs.find((f) => (f.foodKind ?? 'MAIN_FOOD') === 'MAIN_FOOD')
  // The overview list is already active-only; never let a dismissed pattern
  // surface on Bella today.
  const topPattern = overview?.patterns?.[0] ?? patterns.find((pattern) => !isDismissedStatus(pattern.status))

  useEffect(() => {
    const onHashChange = () => {
      // A #reset= link can arrive at runtime (a native deep link sets the hash after
      // mount), so capture the token here too — not only at mount. Held in state so the
      // reset view survives the URL being stripped, exactly like the load-time capture.
      const token = resetTokenFromHash()
      if (token) setResetToken(token)
      setView(hashView())
    }
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

  // Draft protection (Part 3): while a meaningful check-in is being filled, keep a
  // local, pet-scoped copy so Back / navigation / backgrounding / WebView
  // recreation never lose it. It is never auto-submitted (no duplicate).
  useEffect(() => {
    if (view === 'check-in' && selectedPet && !editingCheckIn && isMeaningfulDraft(checkInForm)) {
      saveDraft(selectedPet.id, checkInForm)
    }
  }, [checkInForm, view, selectedPet?.id, editingCheckIn])

  // On opening a fresh check-in, offer to restore a meaningful draft (but never
  // over an active edit, and never for an untouched form).
  useEffect(() => {
    if (view !== 'check-in' || !selectedPet) {
      setDraftPrompt(null)
      return
    }
    const draft = loadDraft(selectedPet.id)
    setDraftPrompt(draft && isMeaningfulDraft(draft.form) && !isMeaningfulDraft(checkInForm) ? draft : null)
    // Intentionally not keyed on checkInForm: re-evaluate only on an explicit open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedPet?.id, checkInOpenSeq])

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

  // Native: a tapped daily reminder deep-links to that pet's Today (a safe, non-sensitive
  // destination where the check-in actions live). Registered once; the notification->check-in
  // conversion is attributed when the next check-in follows within the window.
  useEffect(() => {
    const cleanup = initReminderTapHandler((petId) => {
      if (petId) setSelectedPetId(petId)
      go('today')
    })
    return cleanup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    setEditingCheckIn(true)
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
    setEditingCheckIn(false)
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
    setEditingCheckIn(false)
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
      trackServer('changed_day_checkin', { species: selectedPet.species })
      if (consumeNotificationConversion()) trackServer('notification_to_checkin')
      clearDraft(selectedPet.id)
      setDraftPrompt(null)
      setCheckInForm(emptyCheckInFor(selectedPet.species))
      await loadPetData(selectedPet.id)
      go('today')
    } catch (err) {
      setError("Could not save today's check-in.")
    } finally {
      setSaving(false)
    }
  }

  // "No change since last check-in" — carry the last state forward (mode 'carry')
  // or "Back to usual" — write the normal baseline (mode 'usual'). See Part 2.
  async function quickCheckIn(mode, date = today, toastMsg) {
    if (!selectedPet) return
    // Guard: onClick passes a DOM event, and a future date is never valid — so a
    // non-string or out-of-range value falls back to today. A past date lets the
    // Today "fill the last few days" rows save that day.
    const day = typeof date === 'string' && date <= today ? date : today
    setError('')
    setSaving(true)
    try {
      const payload = quickCheckInPayload(selectedPet.species, latestCheckIn, day, mode)
      await api.saveCheckIn(selectedPet.id, payload)
      track('checkin_created')
      trackServer('same_as_usual_checkin', { species: selectedPet.species })
      if (consumeNotificationConversion()) trackServer('notification_to_checkin')
      setCheckInForm(emptyCheckInFor(selectedPet.species))
      await loadPetData(selectedPet.id)
      showToast(toastMsg)
      // Works from both the Today nudge and the Daily Log form — a no-op if
      // already on Today, and returns to Today when saved from the form.
      go('today')
    } catch (err) {
      setError("Couldn't save today's quick log. Try again in a moment.")
    } finally {
      setSaving(false)
    }
  }

  // Carries the last check-in forward unchanged — including anything still off.
  function quickLog(date = today) {
    return quickCheckIn('carry', date, t('Saved — nothing changed since the last check-in.'))
  }

  // Records that the pet is back at its normal baseline (distinct from "no change").
  function backToUsual(date = today) {
    return quickCheckIn('usual', date, t('Saved — {name} is back to usual.', { name: selectedPet?.name || '' }))
  }

  function restoreDraft() {
    if (draftPrompt) {
      setCheckInForm(draftPrompt.form)
      // Remount CheckInView (key={checkInOpenSeq}) so its local note state
      // re-initializes from the restored form instead of staying empty.
      setEditingCheckIn(false)
      setCheckInOpenSeq((n) => n + 1)
    }
    setDraftPrompt(null)
  }

  function discardDraft() {
    if (selectedPet) clearDraft(selectedPet.id)
    setDraftPrompt(null)
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
      <ChunkErrorBoundary viewKey="legal">
      <Suspense fallback={<ViewFallback />}>
      <LegalView
        section={legalSection}
        lang={lang}
        onLangChange={switchLang}
        onBack={() => { if (window.history.length > 1) window.history.back(); else { window.location.hash = '' } }}
      />
      </Suspense>
      </ChunkErrorBoundary>
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
    return (
      <ChunkErrorBoundary viewKey={view}>
        <Suspense fallback={<ViewFallback />}>
          <AccountView owner={owner} pets={pets} onDeletePet={removePet} onBack={() => go('today')} onDeleted={afterAccountDeleted} />
        </Suspense>
      </ChunkErrorBoundary>
    )
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
      <a className="skip-link" href="#main-content">{t('Skip to content')}</a>
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

      <main className="screen" id="main-content" tabIndex={-1}>
        {error && <div className="error-box" role="alert">{error}</div>}

        <ChunkErrorBoundary viewKey={view}>
        <Suspense fallback={<ViewFallback />}>
        {view === 'check-in' && (
          <CheckInView
            key={checkInOpenSeq}
            pet={selectedPet}
            form={checkInForm}
            setForm={setCheckInForm}
            saving={saving}
            aiSuggestEnabled={aiSuggestEnabled}
            startMode={checkInStartMode}
            draftPrompt={draftPrompt}
            onRestoreDraft={restoreDraft}
            onDiscardDraft={discardDraft}
            onBack={() => go('today')}
            onSave={saveCheckIn}
            onQuickLog={quickLog}
            onBackToUsual={backToUsual}
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
            onBackToUsual={backToUsual}
            onCaregivers={() => go('caregivers')}
            onLogDay={openCheckInForDate}
            activities={activities}
            onAddActivity={addActivity}
            onRemoveActivity={removeActivity}
          />
        )}
        </Suspense>
        </ChunkErrorBoundary>
      </main>
      </div>
      {toast && <Toast key={toast.key} message={toast.message} onDismiss={() => setToast(null)} />}
    </div>
  )
}

export default App
