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
  FlaskConical,
  HeartPulse,
  ImagePlus,
  Leaf,
  LogOut,
  Mail,
  PawPrint,
  Pencil,
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
import { t, setLang, getLang, loadLang, persistLang, LANGUAGES } from './i18n'
import { LEGAL } from './legal'
import { track } from './analytics'
import { SPECIES_PROFILES, SPECIES_ORDER, speciesProfile, isStarterSpecies, categoryOptions, isChangedValue, visibleChangeConfig, VISIBLE_CHANGE_STATUSES } from './speciesProfiles'

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
      <circle cx="16.55" cy="10.65" r="1.75" fill="#bf5a46" />
      <path d="M12 12.2c2.15 0 3.75 1.55 3.75 3.4 0 1.55-1.5 2.4-3.75 2.4s-3.75-.85-3.75-2.4c0-1.85 1.6-3.4 3.75-3.4z" fill="currentColor" />
    </svg>
  )
}

// A quiet botanical sprig for the Today hero — the "health notebook garden"
// accent. Drawn in currentColor (set to a soft sage) at low opacity so it reads
// as an ambient pressed-leaf in the corner, never a focal illustration. Hidden
// from assistive tech; purely decorative.
function HeroSprig() {
  return (
    <svg className="hero-sprig" width="132" height="120" viewBox="0 0 132 120" fill="none" aria-hidden="true" focusable="false">
      <path d="M104 116 C 104 82, 92 54, 56 32" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M96 84 c -15 -7 -28 -2 -33 10 c 16 6 29 2 33 -10 z" fill="currentColor" opacity="0.5" />
      <path d="M92 60 c 13 -10 27 -9 36 2 c -13 10 -27 9 -36 -2 z" fill="currentColor" opacity="0.68" />
      <path d="M74 42 c -13 -8 -26 -3 -31 9 c 14 6 27 2 31 -9 z" fill="currentColor" opacity="0.56" />
      <circle cx="56" cy="32" r="4.6" fill="currentColor" opacity="0.85" />
    </svg>
  )
}

// A small round pet avatar: the pet's most-recent photo thumbnail when there is
// one, otherwise an original initials placeholder tinted by species. No stock art
// or downloaded assets — the fallback is just a letter on a soft disc.
function PetAvatar({ pet, size = 26 }) {
  const [failed, setFailed] = useState(false)
  // A new photo gives the same pet a fresh avatarImageUrl; clear a past load
  // failure so the new (loadable) image gets a chance instead of sticking on
  // the initials placeholder for the life of this reused component instance.
  useEffect(() => { setFailed(false) }, [pet?.avatarImageUrl])
  const initial = (pet?.name || '').trim().charAt(0).toUpperCase() || '·'
  const showImage = pet?.avatarImageUrl && !failed
  return (
    <span className={`pet-avatar ${isCat(pet) ? 'is-cat' : 'is-dog'}`}
          style={{ width: size, height: size, fontSize: Math.round(size * 0.46) }} aria-hidden="true">
      {showImage
        ? <img className="pet-avatar-img" src={pet.avatarImageUrl} alt="" loading="lazy" onError={() => setFailed(true)} />
        : <span className="pet-avatar-initial">{initial}</span>}
    </span>
  )
}

// The selected pet's two-or-three most-recent photos as gently rotated snapshot
// cards — a quiet "this is their notebook" moment at the top of the sidebar, and
// also the simplest place to ADD a photo (tap it to pick one from the device).
// Desktop only (CSS hides it on narrow screens so it never crowds the header);
// shows a soft placeholder that invites a first photo when there are none yet.
function PetPhotoStack({ pet, photos, onAddPhoto }) {
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)
  const shots = (photos || []).filter(isProfilePhoto).slice(0, 3)
  const hasPhotos = shots.length > 0

  async function onFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      await onAddPhoto(file)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pet-photo-stack">
      <button type="button" className="pet-photo-stack-btn" disabled={busy}
              onClick={() => fileRef.current?.click()}
              aria-label={hasPhotos
                ? t('Add another photo of {name}', { name: pet.name })
                : t('Add a photo of {name}', { name: pet.name })}>
        <span className="snap-set" aria-hidden="true">
          {hasPhotos
            ? shots.map((photo, i) => (
                <span className={`snap snap-${i}`} key={photo.id}>
                  <img src={`${photo.imageUrl}?w=320`} alt="" loading="lazy" />
                </span>
              ))
            : (
              <span className="snap snap-placeholder">
                <PetAvatar pet={pet} size={58} />
              </span>
            )}
        </span>
        <span className="pet-photo-hint">
          <ImagePlus size={13} />
          {busy ? t('Adding…') : (hasPhotos ? t('Add another') : t('Add a photo of {name}', { name: pet.name }))}
        </span>
      </button>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onFile} />
    </div>
  )
}

// A short, plural-safe age derived from a pet's birth date ("5 yr" / "3 mo"), or
// '' when the birthday is unknown. The abbreviations sidestep per-language plural
// forms (Croatian uses "god." / "mj."), so this needs no extra translations
// beyond the two count keys.
function petAgeLabel(birthDate) {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return ''
  const [y, m, d] = birthDate.split('-').map(Number)
  const now = new Date()
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m)
  if (now.getDate() < d) months -= 1
  if (months < 0) return ''
  return months < 12 ? t('{count} mo', { count: months }) : t('{count} yr', { count: Math.floor(months / 12) })
}

// The quiet line under a pet's name on the sidebar "record cover": the breed the
// owner typed (kept verbatim — their words), or the species when there's no breed,
// plus the age when we know the birthday.
function petSubtitle(pet) {
  if (!pet) return ''
  const breed = (pet.breed || '').trim()
  const parts = [breed || t(speciesProfile(pet.species).label)]
  const age = petAgeLabel(pet.birthDate)
  if (age) parts.push(age)
  return parts.join(' · ')
}

// The active pet presented as the cover of their record at the top of the
// sidebar: a real photo when there is one (else the species-tinted initial), the
// name in the display serif, and a breed · age line. The photo doubles as the
// add/change-photo control — the one pet edit the app actually supports — so there
// is no dead "edit profile" link for details that can't be changed yet.
function PetIdentityCard({ pet, photos, onAddPhoto }) {
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)
  const canPhoto = Boolean(pet && pet.owned !== false && onAddPhoto)
  const shot = (photos || []).find(isProfilePhoto)
  const src = shot ? `${shot.imageUrl}?w=240` : (pet?.avatarImageUrl || null)
  const openPicker = () => fileRef.current?.click()

  async function onFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !canPhoto) return
    setBusy(true)
    try { await onAddPhoto(file) } finally { setBusy(false) }
  }

  return (
    <div className="pet-identity">
      <div className="pet-identity-photo">
        {src ? <img src={src} alt="" /> : <PetAvatar pet={pet} size={56} />}
        {canPhoto && (
          <button type="button" className="pet-identity-cam" onClick={openPicker} disabled={busy}
                  aria-label={src ? t('Change photo for {name}', { name: pet.name }) : t('Add a photo of {name}', { name: pet.name })}>
            <ImagePlus size={13} />
          </button>
        )}
      </div>
      <div className="pet-identity-copy">
        <strong className="pet-identity-name">{pet?.name}</strong>
        <span className="pet-identity-sub">{petSubtitle(pet)}</span>
        {canPhoto && (
          <button type="button" className="pet-identity-action" onClick={openPicker} disabled={busy}>
            {busy ? t('Adding…') : (src ? t('Change photo') : t('Add a photo'))}
          </button>
        )}
      </div>
      {canPhoto && <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onFile} />}
    </div>
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
    case 'nl': return (<svg {...box}><rect width="24" height="5.33" fill="#ae1c28"/><rect y="5.33" width="24" height="5.33" fill="#fff"/><rect y="10.66" width="24" height="5.34" fill="#21468b"/></svg>)
    case 'sv': return (<svg {...box}><rect width="24" height="16" fill="#006aa7"/><rect x="7" width="3" height="16" fill="#fecc00"/><rect y="6.5" width="24" height="3" fill="#fecc00"/></svg>)
    case 'da': return (<svg {...box}><rect width="24" height="16" fill="#c8102e"/><rect x="7" width="3" height="16" fill="#fff"/><rect y="6.5" width="24" height="3" fill="#fff"/></svg>)
    case 'pt': return (<svg {...box}><rect width="24" height="16" fill="#da291c"/><rect width="9.6" height="16" fill="#046a38"/><circle cx="9.6" cy="8" r="2.4" fill="#ffcc00" stroke="#fff" strokeWidth="0.4"/></svg>)
    case 'ro': return (<svg {...box}><rect width="8" height="16" fill="#002b7f"/><rect x="8" width="8" height="16" fill="#fcd116"/><rect x="16" width="8" height="16" fill="#ce1126"/></svg>)
    case 'cs': return (<svg {...box}><rect width="24" height="8" fill="#fff"/><rect y="8" width="24" height="8" fill="#d7141a"/><path d="M0 0 L12 8 L0 16 Z" fill="#11457e"/></svg>)
    case 'sk': return (<svg {...box}><rect width="24" height="5.33" fill="#fff"/><rect y="5.33" width="24" height="5.33" fill="#0b4ea2"/><rect y="10.66" width="24" height="5.34" fill="#ee1c25"/><path d="M3.4 4 h4 v3.6 q0 2.2 -2 3 q-2 -0.8 -2 -3 z" fill="#fff" stroke="#ee1c25" strokeWidth="0.5"/></svg>)
    case 'el': return (<svg {...box}><rect width="24" height="16" fill="#004c98"/><rect y="1.78" width="24" height="1.78" fill="#fff"/><rect y="5.33" width="24" height="1.78" fill="#fff"/><rect y="8.89" width="24" height="1.78" fill="#fff"/><rect y="12.44" width="24" height="1.78" fill="#fff"/><rect width="8.9" height="8.9" fill="#004c98"/><rect x="3.5" width="1.9" height="8.9" fill="#fff"/><rect y="3.5" width="8.9" height="1.9" fill="#fff"/></svg>)
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
  pawLicking: false,
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

// Breed suggestions for the onboarding autocomplete (a native <datalist>, so it
// only suggests — the owner can still type anything, incl. a Croatian name).
const DOG_BREEDS = [
  'Mixed breed', 'Labrador Retriever', 'Golden Retriever', 'German Shepherd', 'French Bulldog',
  'Bulldog', 'Poodle', 'Beagle', 'Rottweiler', 'Dachshund', 'Yorkshire Terrier', 'Boxer',
  'Cavalier King Charles Spaniel', 'Australian Shepherd', 'Siberian Husky', 'Cane Corso',
  'Great Dane', 'Miniature Schnauzer', 'Doberman Pinscher', 'Shih Tzu', 'Boston Terrier',
  'Bernese Mountain Dog', 'Pomeranian', 'Havanese', 'Cocker Spaniel', 'Border Collie', 'Maltese',
  'Chihuahua', 'Shiba Inu', 'Vizsla', 'Pembroke Welsh Corgi', 'Australian Cattle Dog',
  'Basset Hound', 'Bichon Frise', 'Belgian Malinois', 'Jack Russell Terrier', 'Weimaraner',
  'Pug', 'Samoyed', 'Akita', 'Whippet', 'German Shorthaired Pointer'
]
const CAT_BREEDS = [
  'Mixed breed', 'Domestic Shorthair', 'Domestic Longhair', 'Maine Coon', 'Persian', 'Ragdoll',
  'British Shorthair', 'Siamese', 'Sphynx', 'Bengal', 'Scottish Fold', 'Abyssinian',
  'American Shorthair', 'Norwegian Forest Cat', 'Russian Blue', 'Birman', 'Oriental Shorthair',
  'Devon Rex', 'Burmese', 'Exotic Shorthair'
]

const PHOTO_AREAS = ['EAR', 'PAW', 'SKIN', 'COAT', 'EYE', 'STOOL', 'WOUND', 'SWELLING', 'SHELL', 'FEATHER', 'FIN_SCALE', 'OTHER']

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
  // Starter species (rabbit, bird, …) track via the flexible observations model,
  // not the dog/cat columns. `observations` is a { key: {label,value,severity,note} }
  // map, serialized to observationsJson on save.
  if (species && species !== 'DOG' && species !== 'CAT') {
    return { checkInDate: today, freeTextNote: '', observations: {} }
  }
  // `observations` also carries the universal Visible Change / Wound signal, so
  // dog/cat check-ins can hold one alongside their explicit columns.
  const base = { checkInDate: today, appetiteLevel: 'NORMAL', waterLevel: 'NORMAL', energyLevel: 'NORMAL', vomiting: false, freeTextNote: '', observations: {} }
  if (species === 'CAT') {
    return { ...base, litterBoxUse: 'NORMAL', urinationChange: 'NORMAL', straining: false, hidingBehavior: 'NORMAL', weightConcern: false }
  }
  return { ...base, itchingScore: 2, stoolState: 'NORMAL', earRedness: false, pawLicking: false }
}

// Serialize a starter-species check-in form's observations map to the JSON string
// the backend stores. Returns null when nothing was recorded.
function toObservationsJson(form, species) {
  const obs = form.observations || {}
  const signals = Object.entries(obs)
    .filter(([, v]) => v && (v.value || v.note))
    .map(([key, v]) => {
      const signal = { key, label: v.label || key, value: v.value || '' }
      if (v.severity) signal.severity = v.severity
      if (v.status) signal.status = v.status
      if (v.area) signal.area = v.area
      if (v.note) signal.note = v.note
      return signal
    })
  return signals.length ? JSON.stringify({ species, signals }) : null
}

// Parse a stored observationsJson back into the form's observations map (for edit).
function parseObservations(json) {
  if (!json) return {}
  try {
    const parsed = JSON.parse(json)
    const out = {}
    for (const s of parsed.signals || []) {
      if (s.key) out[s.key] = { label: s.label || s.key, value: s.value || '', severity: s.severity || null, status: s.status || null, area: s.area || null, note: s.note || '' }
    }
    return out
  } catch (err) {
    return {}
  }
}

// Recent starter-species observations for the vet summary — one row per check-in
// that logged a changed signal (owner-observed facts only, never a diagnosis).
function starterObservationRows(checkIns) {
  return (checkIns || [])
    .map((c) => {
      const obs = parseObservations(c.observationsJson)
      // Visible changes get their own "Visible changes over time" section.
      const changed = Object.entries(obs)
        .filter(([key, v]) => key !== 'visible_change' && v && isChangedValue(v.value))
        .map(([, v]) => v)
      if (!changed.length) return null
      const text = changed.map((v) => `${v.label ? `${t(v.label)}: ` : ''}${t(v.value)}`).join(', ')
      return { date: c.checkInDate, text }
    })
    .filter(Boolean)
    .slice(0, 20)
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
          />
        )}
      </main>
      </div>
      {toast && <Toast key={toast.key} message={toast.message} onDismiss={() => setToast(null)} />}
    </div>
  )
}

// A brief, self-dismissing confirmation that floats above the record. Announced
// politely to assistive tech and dismissable early with the close button. It owns
// its own auto-dismiss timer so it can pause while hovered or keyboard-focused —
// otherwise the 3.2s timeout could yank the close button out from under a
// keyboard user and drop their focus to <body>.
function Toast({ message, onDismiss }) {
  const [paused, setPaused] = useState(false)
  const dismissRef = useRef(onDismiss)
  dismissRef.current = onDismiss
  useEffect(() => {
    if (paused) return undefined
    const id = setTimeout(() => dismissRef.current(), 3200)
    return () => clearTimeout(id)
  }, [paused])
  return (
    <div className="toast" role="status" aria-live="polite"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <span className="toast-icon"><Check size={15} /></span>
      <span className="toast-text">{message}</span>
      <button className="toast-close" type="button" aria-label={t('Dismiss')} onClick={onDismiss}>
        <X size={14} />
      </button>
    </div>
  )
}

// Original inline SVG glyph drawn for PetPattern — a small dog-eared note page
// with a soft memory dot. Not from any icon pack, stock set, or external source.
function NoteGlyph({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="M6.5 3.5h6.2l4.8 4.8V19a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5Z"
        fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M12.6 3.7v3.1a1.5 1.5 0 0 0 1.5 1.5h3.2" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8 12h6M8 15h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="14.8" cy="15" r="1.1" fill="currentColor" />
    </svg>
  )
}

// One calm, human note at the top of Today — a single sentence, never a list.
// It surfaces the most reassuring or useful thing there is to say right now, in
// priority order, and is written to sound like a note the owner might keep — not
// a diagnosis, a score, or anything analytical.
function TodayNoteCard({ pet, overview, topPattern, checkIns, loggedToday }) {
  let tone = 'calm'
  let title
  let body
  if (overview?.goodNews) {
    tone = 'good'; title = t('Nice little win'); body = overview.goodNews
  } else if (overview?.watchOut) {
    tone = 'watch'; title = t('Worth keeping an eye on'); body = overview.watchOut
  } else if (topPattern) {
    tone = 'watch'; title = t('Something changed'); body = topPattern.summary
  } else if (!checkIns.length) {
    title = t('Start with one easy note')
    body = t('A few quick logs help PetPattern learn what normal looks like for {name}.', { name: pet.name })
  } else if (!loggedToday) {
    title = t('A quick note keeps the picture clear')
    body = t('No need to write much — just save how {name} seems today.', { name: pet.name })
  } else {
    title = t('Everything looks pretty steady')
    body = t('Nothing unusual stands out from the latest note.')
  }
  return (
    <section className={`today-note tone-${tone}`} aria-label={title}>
      <span className="today-note-mark" aria-hidden="true"><NoteGlyph /></span>
      <div className="today-note-body">
        <p className="today-note-title">{title}</p>
        <p className="today-note-text">{body}</p>
      </div>
    </section>
  )
}

// Latest observed signals for a starter species, read from the flexible
// observations model. A changed value reads "watch"; a quiet day shows a prompt.
function StarterSignals({ latestCheckIn, pet }) {
  const obs = parseObservations(latestCheckIn?.observationsJson)
  const signals = Object.entries(obs).filter(([, v]) => v && (v.value || v.note)).slice(0, 6)
  if (!signals.length) {
    return <p className="muted">{t('Log a day and {name}\'s signals show up here.', { name: pet.name })}</p>
  }
  return (
    <>
      {signals.map(([key, v]) => (
        <Signal key={key} label={t(v.label || key)} value={t(v.value || 'Noticed')} tone={isChangedValue(v.value) ? 'watch' : 'calm'} />
      ))}
    </>
  )
}

// The heart of Today: one calm question, three large choices. "Same as usual" is
// a single tap (and disables once today is logged); "Something changed" opens the
// guided chips; "Add note or photo" opens the one-sentence note. Food + vet stay
// secondary.
function TodayDecisionActions({ pet, loggedToday, onSameAsUsual, onSomethingChanged, onAddNoteOrPhoto, onFoodChange, onVetSummary }) {
  return (
    <section className="today-decision" aria-label={t('How is {name} today?', { name: pet.name })}>
      <div className="today-decision-head">
        <p>{t('Normal days are useful too. PetPattern learns what is normal for {name}.', { name: pet.name })}</p>
      </div>
      <div className="decision-grid">
        <button className="decision-card primary quiet" type="button" onClick={onSameAsUsual} disabled={loggedToday}>
          <span className="decision-icon"><Check size={22} /></span>
          <strong>{t('Same as usual')}</strong>
          <span>{loggedToday ? t('Today is logged') : t('Save a quiet day in one tap.')}</span>
        </button>
        <button className="decision-card changed" type="button" onClick={onSomethingChanged}>
          <span className="decision-icon"><Activity size={22} /></span>
          <strong>{t('Something changed')}</strong>
          <span>{t('Pick just what changed — not the whole form.')}</span>
        </button>
        <button className="decision-card note" type="button" onClick={onAddNoteOrPhoto}>
          <span className="decision-icon"><NoteGlyph size={22} /></span>
          <strong>{t('Add note or photo')}</strong>
          <span>{t('Write one sentence or add a photo.')}</span>
        </button>
      </div>
      <div className="decision-secondary">
        <button className="ghost-button" type="button" onClick={onFoodChange}>
          <Utensils size={18} /> {t('Add food change')}
        </button>
        <button className="ghost-button" type="button" onClick={onVetSummary}>
          <Stethoscope size={18} /> {t('Bring this to your vet')}
        </button>
      </div>
    </section>
  )
}

// A quiet "this looks familiar" nudge — shown ONLY when a real pattern has been
// seen more than once and isn't set aside. Never overclaims similarity.
function SeenBeforeCard({ pet, pattern, onShowTimeline }) {
  if (!pattern) return null
  const qualifies = (pattern.seenBefore === true || pattern.detectionCount > 1) && !isDismissedStatus(pattern.status)
  if (!qualifies) return null
  return (
    <section className="seen-before-card" aria-label={t('This looks familiar')}>
      <div className="seen-before-body">
        <p className="seen-before-kicker">{t('This looks familiar')}</p>
        <p className="seen-before-text">
          {t('This looks similar to something you logged before for {name}.', { name: pet.name })}
          {pattern.firstDetectedAt ? ` ${t("You've seen this a few times since {date}.", { date: formatDate(pattern.firstDetectedAt) })}` : ''}
        </p>
      </div>
      <button className="text-button" type="button" onClick={() => onShowTimeline(pattern)}>
        {t('Open case file')} <ChevronRight size={16} />
      </button>
    </section>
  )
}

// Gentle backfill: if the last log is 2+ days ago and today isn't logged, offer to
// fill up to the last 3 missed days. No guilt, no streaks — every row is skippable.
function BackfillCard({ pet, checkIns, loggedToday, onQuickLog, onLogDay }) {
  const [skipped, setSkipped] = useState([])
  if (!checkIns?.length || loggedToday) return null
  const lastDate = checkIns[0]?.checkInDate
  if (!lastDate) return null
  const daysSince = Math.round((parseLocalDate(today) - parseLocalDate(lastDate)) / 86400000)
  if (daysSince < 2) return null
  const loggedDates = new Set(checkIns.map((c) => c.checkInDate))
  const candidates = [1, 2, 3]
    .map((n) => addDays(today, -n))
    .filter((d) => d > lastDate && !loggedDates.has(d) && !skipped.includes(d))
  if (candidates.length === 0) return null
  const label = (d) => {
    const n = Math.round((parseLocalDate(today) - parseLocalDate(d)) / 86400000)
    return n === 1 ? t('Yesterday') : t('{n} days ago', { n })
  }
  return (
    <section className="backfill-card" aria-label={t('Want to quickly fill the last few days?')}>
      <p className="backfill-title">{t('Want to quickly fill the last few days?')}</p>
      <p className="muted">{t('No pressure — a couple of quiet days help PetPattern learn what is normal for {name}.', { name: pet.name })}</p>
      <div className="backfill-rows">
        {candidates.map((d) => (
          <div className="backfill-row" key={d}>
            <span className="backfill-day">{label(d)}</span>
            <div className="backfill-actions">
              <button className="chip-button" type="button" onClick={() => onQuickLog(d)}>{t('Same as usual')}</button>
              <button className="chip-button" type="button" onClick={() => onLogDay(d)}>{t('Something changed')}</button>
              <button className="chip-button subtle" type="button" onClick={() => setSkipped((s) => [...s, d])}>{t('Skip')}</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function TodayView({ pet, overview, latestCheckIn, currentFood, topPattern, checkIns, onLogToday, onFoodChange, onFoodDetective, onPatterns, onShowTimeline, onVetSummary, onEditCheckIn, onDeleteCheckIn, onQuickLog, onCaregivers, onLogDay, onSomethingChanged, onAddNoteOrPhoto }) {
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

      <RetentionStrip pet={pet} retention={overview?.retention} checkInCount={checkIns.length} onLogToday={onLogToday} onQuickLog={onQuickLog} />

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

// "Something changed" guided flow — species-specific categories. Selecting a chip
// reveals only the fields that category maps to (see guidedTokens), so a changed
// day never means the whole form. Labels are English keys for t(). Keep the field
// controls below in sync with the full form (which stays the canonical copy).
const CHANGED_CATEGORIES = {
  DOG: [
    { key: 'skin', label: 'Scratching / skin' },
    { key: 'stool', label: 'Stool' },
    { key: 'appetite', label: 'Appetite' },
    { key: 'water', label: 'Water' },
    { key: 'energy', label: 'Energy' },
    { key: 'vomiting', label: 'Vomiting' },
    { key: 'ear_paws', label: 'Ear / paws' },
    { key: 'food', label: 'Food or treats' },
    { key: 'medication', label: 'Medication' },
    { key: 'other', label: 'Other' }
  ],
  CAT: [
    { key: 'litter', label: 'Litter box' },
    { key: 'urination', label: 'Urination' },
    { key: 'appetite', label: 'Appetite' },
    { key: 'water', label: 'Water' },
    { key: 'energy', label: 'Energy' },
    { key: 'hiding', label: 'Hiding' },
    { key: 'vomiting', label: 'Vomiting' },
    { key: 'weight', label: 'Weight concern' },
    { key: 'food', label: 'Food' },
    { key: 'medication', label: 'Medication' },
    { key: 'other', label: 'Other' }
  ]
}

// Which fields each "what changed?" category reveals, unioned across the selected
// categories and de-duplicated, so two categories that both touch appetite show
// it once. food/medication/other add CTAs (handled in GuidedFieldsForCategory).
function guidedTokens(categories, cat) {
  const set = new Set()
  const add = (...tokens) => tokens.forEach((tk) => set.add(tk))
  categories.forEach((key) => {
    if (cat) {
      if (key === 'litter') add('litter', 'urination', 'straining')
      else if (key === 'urination') add('urination', 'straining', 'water')
      else if (key === 'hiding') add('hiding', 'appetite', 'energy')
      else if (key === 'appetite') add('appetite', 'water', 'energy')
      else if (key === 'water') add('water', 'appetite')
      else if (key === 'energy') add('energy', 'appetite')
      else if (key === 'vomiting') add('vomiting', 'appetite', 'water')
      else if (key === 'weight') add('weight', 'appetite')
    } else {
      if (key === 'skin') add('itching', 'earRedness', 'pawLicking')
      else if (key === 'stool') add('stool', 'appetite')
      else if (key === 'appetite') add('appetite', 'water', 'energy')
      else if (key === 'water') add('water', 'appetite')
      else if (key === 'energy') add('energy', 'appetite')
      else if (key === 'vomiting') add('vomiting', 'appetite', 'water')
      else if (key === 'ear_paws') add('earRedness', 'pawLicking', 'itching')
    }
  })
  return set
}

// One QuickChoices control per guided token. Option lists mirror the full form's
// (kept here so the guided flow is self-contained); the full form is canonical.
function GuidedChoice({ token, form, setForm }) {
  switch (token) {
    case 'itching':
      return <QuickChoices label={t('Scratching / itching')} value={form.itchingScore} options={[0, 2, 4, 6, 8, 10].map((v) => ({ value: v, label: String(v) }))} onChange={(itchingScore) => setForm({ ...form, itchingScore })} />
    case 'stool':
      return <QuickChoices label={t('Stool')} value={form.stoolState} options={[{ value: 'NORMAL', label: t('Normal') }, { value: 'SOFT', label: t('Soft') }, { value: 'DIARRHEA', label: t('Diarrhea') }, { value: 'NO_STOOL', label: t('No stool') }]} onChange={(stoolState) => setForm({ ...form, stoolState })} />
    case 'litter':
      return <QuickChoices label={t('Litter box')} value={form.litterBoxUse} options={[{ value: 'NORMAL', label: t('Normal') }, { value: 'LESS', label: t('Less') }, { value: 'MORE', label: t('More') }, { value: 'NONE', label: t('Not used') }]} onChange={(litterBoxUse) => setForm({ ...form, litterBoxUse })} />
    case 'urination':
      return <QuickChoices label={t('Urination change')} value={form.urinationChange} options={[{ value: 'NORMAL', label: t('Normal') }, { value: 'LESS', label: t('Less') }, { value: 'MORE', label: t('More') }]} onChange={(urinationChange) => setForm({ ...form, urinationChange })} />
    case 'appetite':
      return <QuickChoices label={t('Appetite')} value={form.appetiteLevel} options={[{ value: 'NORMAL', label: t('Normal') }, { value: 'LOWER', label: t('Lower') }, { value: 'HIGHER', label: t('Higher') }, { value: 'REFUSED', label: t('Refused') }]} onChange={(appetiteLevel) => setForm({ ...form, appetiteLevel })} />
    case 'water':
      return <QuickChoices label={t('Water')} value={form.waterLevel} options={[{ value: 'NORMAL', label: t('Normal') }, { value: 'LOWER', label: t('Lower') }, { value: 'HIGHER', label: t('Higher') }]} onChange={(waterLevel) => setForm({ ...form, waterLevel })} />
    case 'energy':
      return <QuickChoices label={t('Energy')} value={form.energyLevel} options={[{ value: 'NORMAL', label: t('Normal') }, { value: 'LOW', label: t('Low') }, { value: 'RESTLESS', label: t('Restless') }, { value: 'HIGH', label: t('High') }]} onChange={(energyLevel) => setForm({ ...form, energyLevel })} />
    default:
      return null
  }
}

// One ToggleButton per guided flag token.
function GuidedToggle({ token, form, setForm }) {
  switch (token) {
    case 'vomiting':
      return <ToggleButton active={form.vomiting} label={t('Vomiting')} onClick={() => setForm({ ...form, vomiting: !form.vomiting })} />
    case 'earRedness':
      return <ToggleButton active={form.earRedness} label={t('Ear redness')} onClick={() => setForm({ ...form, earRedness: !form.earRedness })} />
    case 'pawLicking':
      return <ToggleButton active={form.pawLicking} label={t('Paw licking')} onClick={() => setForm({ ...form, pawLicking: !form.pawLicking })} />
    case 'straining':
      return <ToggleButton active={form.straining} label={t('Straining')} onClick={() => setForm({ ...form, straining: !form.straining })} />
    case 'hiding':
      return <ToggleButton active={form.hidingBehavior === 'MORE'} label={t('Hiding more')} onClick={() => setForm({ ...form, hidingBehavior: form.hidingBehavior === 'MORE' ? 'NORMAL' : 'MORE' })} />
    case 'weight':
      return <ToggleButton active={form.weightConcern} label={t('Weight concern')} onClick={() => setForm({ ...form, weightConcern: !form.weightConcern })} />
    default:
      return null
  }
}

// Renders just the fields the selected "what changed?" categories map to, plus a
// food / medication CTA when those categories are picked.
function GuidedFieldsForCategory({ categories, cat, form, setForm, onAddFood, onAddMedication, note }) {
  const tokens = guidedTokens(categories, cat)
  const choiceOrder = ['itching', 'stool', 'litter', 'urination', 'appetite', 'water', 'energy']
  const toggleOrder = ['vomiting', 'earRedness', 'pawLicking', 'straining', 'hiding', 'weight']
  const toggles = toggleOrder.filter((tk) => tokens.has(tk))
  return (
    <>
      {choiceOrder.filter((tk) => tokens.has(tk)).map((tk) => (
        <GuidedChoice key={tk} token={tk} form={form} setForm={setForm} />
      ))}
      {toggles.length > 0 && (
        <div className="toggle-grid">
          {toggles.map((tk) => <GuidedToggle key={tk} token={tk} form={form} setForm={setForm} />)}
        </div>
      )}
      {categories.includes('food') && (
        <button type="button" className="ghost-button wide" onClick={() => onAddFood(null, note)}>
          <Utensils size={18} /> {t('Add a food or treat change')}
        </button>
      )}
      {categories.includes('medication') && (
        <button type="button" className="ghost-button wide" onClick={onAddMedication}>
          <Pill size={18} /> {t('Add a medication or care note')}
        </button>
      )}
    </>
  )
}

// Food/treat changes whose start date sits within (or just before) the pattern's
// detected window — real logs only, never invented, capped at 3 (newest first).
function nearbyFoodChanges(pattern, foodLogs) {
  if (!pattern?.firstDetectedAt || !foodLogs?.length) return []
  const start = addDays(pattern.firstDetectedAt, -21)
  const end = pattern.lastDetectedAt || today
  return foodLogs
    .filter((f) => f.dateStarted && f.dateStarted >= start && f.dateStarted <= end)
    .slice()
    .sort((a, b) => (a.dateStarted < b.dateStarted ? 1 : -1))
    .slice(0, 3)
}

// Generic value-selectors for a STARTER species' guided categories. Each choice is
// written into form.observations (serialized to observationsJson on save), so a
// rabbit/bird/reptile logs its own signals — never the dog/cat columns. Categories
// flagged as food/medication route to those existing flows instead of a field.
function StarterGuidedFields({ categories, form, setForm, note, onAddFood, onAddMedication }) {
  function setValue(cat, value) {
    const prev = (form.observations || {})[cat.key] || {}
    setForm({ ...form, observations: { ...(form.observations || {}), [cat.key]: { label: cat.label, ...prev, value } } })
  }
  return (
    <>
      {categories.map((cat) => {
        if (cat.cta === 'food') {
          return (
            <button key={cat.key} type="button" className="ghost-button wide" onClick={() => onAddFood(null, note)}>
              <Utensils size={18} /> {t('Add a food or treat change')}
            </button>
          )
        }
        if (cat.cta === 'medication') {
          return (
            <button key={cat.key} type="button" className="ghost-button wide" onClick={onAddMedication}>
              <Pill size={18} /> {t('Add a medication or care note')}
            </button>
          )
        }
        const current = (form.observations || {})[cat.key] || {}
        return (
          <QuickChoices
            key={cat.key}
            label={t(cat.label)}
            value={current.value || ''}
            options={categoryOptions(cat).map((o) => ({ value: o, label: t(o) }))}
            onChange={(value) => setValue(cat, value)}
          />
        )
      })}
    </>
  )
}

// Universal Visible Change / Wound tracker — one guided entry (what you saw +
// better/same/worse + optional note + optional photo) for every species. It writes
// a single `visible_change` signal into form.observations. NOT a diagnosis or a
// wound detector: it only records what the owner can see, to track it over time.
function VisibleChangeField({ pet, form, setForm, onAddPhoto }) {
  const config = visibleChangeConfig(pet.species)
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const current = (form.observations || {}).visible_change || {}

  function update(patch) {
    const prev = (form.observations || {}).visible_change || {}
    setForm({ ...form, observations: { ...(form.observations || {}), visible_change: { label: 'Visible change', ...prev, ...patch } } })
  }

  async function onFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !onAddPhoto) return
    setUploading(true)
    try {
      // Dated to the check-in day and tagged with the selected area, so it lines up
      // in the area-grouped progression view even before the check-in is saved.
      await onAddPhoto(file, current.area || 'WOUND', form.checkInDate)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="visible-change">
      <p className="form-section-label">{t(config.label)}</p>
      <p className="vc-safe">{t('Track how this looks over time. Useful for your vet conversation. Not a diagnosis.')}</p>
      <div className="guided-chip-grid">
        {config.options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={current.value === opt.value ? 'guided-chip active' : 'guided-chip'}
            aria-pressed={current.value === opt.value}
            onClick={() => update({ value: opt.value, area: opt.area })}
          >
            {t(opt.value)}
          </button>
        ))}
      </div>
      {current.value && (
        <>
          <p className="form-section-label">{t('Compared to before')}</p>
          <div className="chip-row">
            {VISIBLE_CHANGE_STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                className={current.status === s.value ? 'guided-chip active' : 'guided-chip'}
                aria-pressed={current.status === s.value}
                onClick={() => update({ status: s.value })}
              >
                {t(s.label)}
              </button>
            ))}
          </div>
          <label className="field-label">
            {t('Note about this change (optional)')}
            <input
              type="text"
              value={current.note || ''}
              maxLength={300}
              placeholder={t('e.g. small red patch near the left ear')}
              onChange={(e) => update({ note: e.target.value })}
            />
          </label>
          {onAddPhoto && (
            <>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onFile} />
              <button type="button" className="ghost-button wide" disabled={uploading} onClick={() => fileRef.current?.click()}>
                <ImagePlus size={18} /> {uploading ? t('Adding…') : t('Add a photo of this')}
              </button>
            </>
          )}
        </>
      )}
    </div>
  )
}

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

function SuggestionPreview({ suggestion, applied, onApply, onAddFood }) {
  const chips = []
  if (suggestion.itchingScore != null) chips.push(`${t('Itching')} ${suggestion.itchingScore}/10`)
  if (suggestion.stoolState && suggestion.stoolState !== 'UNKNOWN') chips.push(`${t('Stool')} ${stoolLabel({ stoolState: suggestion.stoolState })}`)
  if (suggestion.appetiteLevel && suggestion.appetiteLevel !== 'UNKNOWN') chips.push(`${t('Appetite')} ${levelLabel(suggestion.appetiteLevel)}`)
  if (suggestion.waterLevel && suggestion.waterLevel !== 'UNKNOWN') chips.push(`${t('Water')} ${levelLabel(suggestion.waterLevel)}`)
  if (suggestion.energyLevel && suggestion.energyLevel !== 'UNKNOWN') chips.push(`${t('Energy')} ${levelLabel(suggestion.energyLevel)}`)
  if (suggestion.vomiting) chips.push(t('Vomiting'))
  if (suggestion.earRedness) chips.push(t('Ear redness'))
  // Cat-specific chips.
  if (suggestion.litterBoxUse && suggestion.litterBoxUse !== 'UNKNOWN') chips.push(`${t('Litter box')}: ${litterLabel(suggestion.litterBoxUse)}`)
  if (suggestion.urinationChange && suggestion.urinationChange !== 'UNKNOWN') chips.push(`${t('Urination')}: ${t(titleCase(suggestion.urinationChange))}`)
  if (suggestion.straining) chips.push(t('Straining'))
  if (suggestion.hidingBehavior === 'MORE') chips.push(t('Hiding more'))
  if (suggestion.weightConcern) chips.push(t('Weight concern'))
  // Starter-species generic signals (rabbit, bird, reptile, …) and any visible-change
  // note come back as detectedSignals — show them so the preview isn't empty for them.
  for (const signal of suggestion.detectedSignals || []) {
    if (signal && signal.key) chips.push(`${t(signal.label || signal.key)}: ${t(signal.value || 'Changed')}`)
  }

  const trigger = suggestion.possibleFoodTrigger
  const environment = suggestion.possibleEnvironmentTrigger

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

      {environment && environment.description && (
        <div className="food-callout env-callout">
          <span>{t('Care or environment change mentioned:')} <strong>{environment.description}</strong></span>
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

// Notable (worth-mentioning) signals on a single check-in, species-aware. Only
// flags real changes — never claims a cause. Used by the Food/Environment Detective.
function foodDetectiveSignals(checkIn, species) {
  const out = []
  if (isStarterSpecies(species)) {
    const obs = parseObservations(checkIn.observationsJson)
    Object.values(obs).forEach((v) => {
      if (v && isChangedValue(v.value)) out.push(`${t(v.label)}: ${t(v.value)}`)
    })
    return out
  }
  const cat = species === 'CAT'
  if (cat) {
    if (checkIn.litterBoxUse && !['NORMAL', 'UNKNOWN'].includes(checkIn.litterBoxUse)) out.push(`${t('Litter box')}: ${litterLabel(checkIn.litterBoxUse)}`)
    if (checkIn.urinationChange && !['NORMAL', 'UNKNOWN'].includes(checkIn.urinationChange)) out.push(`${t('Urination')}: ${t(titleCase(checkIn.urinationChange))}`)
    if (checkIn.straining) out.push(t('Straining'))
    if (checkIn.hidingBehavior === 'MORE') out.push(t('Hiding more'))
    if (checkIn.appetiteLevel === 'LOWER' || checkIn.appetiteLevel === 'REFUSED') out.push(`${t('Appetite')}: ${levelLabel(checkIn.appetiteLevel)}`)
    if (checkIn.waterLevel === 'HIGHER' || checkIn.waterLevel === 'LOWER') out.push(`${t('Water')}: ${levelLabel(checkIn.waterLevel)}`)
    if (checkIn.vomiting) out.push(t('Vomiting'))
    if (checkIn.weightConcern) out.push(t('Weight concern'))
  } else {
    if (checkIn.itchingScore != null && checkIn.itchingScore >= 6) out.push(`${t('Scratching')} ${checkIn.itchingScore}/10`)
    if (checkIn.stoolState === 'SOFT' || checkIn.stoolState === 'DIARRHEA') out.push(`${t('Stool')}: ${stoolLabel(checkIn)}`)
    if (checkIn.vomiting) out.push(t('Vomiting'))
    if (checkIn.appetiteLevel === 'LOWER' || checkIn.appetiteLevel === 'REFUSED') out.push(`${t('Appetite')}: ${levelLabel(checkIn.appetiteLevel)}`)
    if (checkIn.energyLevel === 'LOW' || checkIn.energyLevel === 'RESTLESS') out.push(`${t('Energy')}: ${levelLabel(checkIn.energyLevel)}`)
    if (checkIn.earRedness) out.push(t('Ear redness'))
    if (checkIn.pawLicking) out.push(t('Paw licking'))
  }
  return out
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

function PatternsView({ pet, patterns, checkIns, foodLogs, recap, onBack, onShowTimeline, onSetStatus, onRecap, onVetSummary, onFoodDetective }) {
  const active = patterns.filter((pattern) => patternGroup(pattern) === 'active')
  const settled = patterns.filter((pattern) => patternGroup(pattern) === 'settled')
  const dismissed = patterns.filter((pattern) => patternGroup(pattern) === 'dismissed')

  return (
    <section className="flow-panel">
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> {t('Back')}</button>
      <p className="kicker">{t('What changed?')}</p>
      <h1>{t('Changes for {name}', { name: pet.name })}</h1>
      <p className="lead">{t('Small things PetPattern noticed from your notes. Nothing here is a diagnosis — just a calmer way to see what changed.')}</p>

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
            <h2>{t('No changes to show yet. That\'s okay.')}</h2>
            <p className="muted">{t('Keep logging for a few more days. PetPattern will start showing little changes once there\'s enough history.')}</p>
          </article>
        )}
        {active.map((pattern) => (
          <PatternCard key={pattern.id} pattern={pattern} variant="active" checkIns={checkIns} foodLogs={foodLogs} onShowTimeline={onShowTimeline} onSetStatus={onSetStatus} onVetSummary={onVetSummary} onFoodDetective={onFoodDetective} />
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

// For a given pattern, the ONE signal we show over time and how to read a single
// check-in into a calm/watch/changed tone plus a short value for the tooltip.
// Species is implicit in the pattern type, so we never mix dog/cat signals.
function evidenceSignal(pattern) {
  const lvl = (v, calm, watch, changed) =>
    v == null || v === 'UNKNOWN' ? null : { tone: changed.includes(v) ? 'changed' : watch.includes(v) ? 'watch' : 'calm', value: levelLabel(v) }
  switch (pattern.type) {
    case 'ITCHING_ABOVE_BASELINE':
    case 'POSSIBLE_FOOD_TRIGGER':
      return { label: t('Scratching'), read: (c) => c.itchingScore == null ? null
        : { tone: c.itchingScore >= 7 ? 'changed' : c.itchingScore >= 4 ? 'watch' : 'calm', value: `${c.itchingScore}/10` } }
    case 'STOOL_INSTABILITY':
      return { label: t('Stool'), read: (c) => !c.stoolState || c.stoolState === 'UNKNOWN' ? null
        : { tone: c.stoolState === 'DIARRHEA' ? 'changed' : (c.stoolState === 'SOFT' || c.stoolState === 'NO_STOOL') ? 'watch' : 'calm', value: stoolLabel(c.stoolState) } }
    case 'WATER_DROP':
    case 'WATER_CHANGE':
      return { label: t('Water'), read: (c) => lvl(c.waterLevel, [], ['LOWER', 'HIGHER'], []) }
    case 'RECURRING_EAR_REDNESS':
      return { label: t('Ears'), read: (c) => ({ tone: c.earRedness ? 'changed' : 'calm', value: c.earRedness ? t('Redness') : t('Clear') }) }
    case 'APPETITE_LOW':
      return { label: t('Appetite'), read: (c) => lvl(c.appetiteLevel, [], ['LOWER', 'HIGHER'], ['REFUSED']) }
    case 'LITTER_BOX_CHANGE':
      return { label: t('Litter box'), read: (c) => {
        const off = (v) => v && v !== 'NORMAL' && v !== 'UNKNOWN'
        const blank = (v) => v == null || v === 'UNKNOWN'
        if (c.litterBoxUse === 'NONE') return { tone: 'changed', value: litterLabel(c.litterBoxUse) }
        if (c.straining) return { tone: 'watch', value: t('Straining') }
        if (off(c.litterBoxUse) || off(c.urinationChange)) return { tone: 'watch', value: litterLabel(c.litterBoxUse) }
        if (blank(c.litterBoxUse) && blank(c.urinationChange)) return null
        return { tone: 'calm', value: litterLabel(c.litterBoxUse) }
      } }
    case 'HIDING_INCREASED':
      return { label: t('Hiding'), read: (c) => c.hidingBehavior === 'UNKNOWN' || c.hidingBehavior == null ? null
        : { tone: c.hidingBehavior === 'MORE' ? 'watch' : 'calm', value: hidingLabel(c.hidingBehavior) } }
    case 'REPEATED_VOMITING':
      return { label: t('Vomiting'), read: (c) => ({ tone: c.vomiting ? 'changed' : 'calm', value: c.vomiting ? t('Vomiting') : t('None') }) }
    default:
      return null
  }
}

// The last `window` calendar days, oldest first, as { iso, date }.
function lastDays(window) {
  const base = parseLocalDate(today)
  const out = []
  for (let i = window - 1; i >= 0; i--) {
    const d = new Date(base)
    d.setDate(base.getDate() - i)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    out.push({ iso, date: d })
  }
  return out
}

// The word for a signal's notable ("changed") state, for the cell-strip legend.
function changedLabel(type) {
  switch (type) {
    case 'RECURRING_EAR_REDNESS': return t('Redness')
    case 'STOOL_INSTABILITY': return t('Diarrhea')
    case 'REPEATED_VOMITING': return t('Vomiting')
    case 'APPETITE_LOW': return t('Refused')
    case 'HIDING_INCREASED': return t('Hiding more')
    default: return t('Change')
  }
}

// A quiet visual for the pattern: numeric signals (scratching) read best as a
// line over 30 days with food markers; everything else as a 2-week tone strip.
// Both draw only from real logs and never invent data.
function PatternChart({ pattern, checkIns, foodLogs }) {
  if (pattern.type === 'ITCHING_ABOVE_BASELINE' || pattern.type === 'POSSIBLE_FOOD_TRIGGER') {
    return <PatternLineChart pattern={pattern} checkIns={checkIns} foodLogs={foodLogs} />
  }
  const sig = evidenceSignal(pattern)
  if (!sig) return null
  return <PatternCellStrip pattern={pattern} checkIns={checkIns} sig={sig} foodLogs={foodLogs} />
}

function PatternLineChart({ pattern, checkIns, foodLogs }) {
  const WINDOW = 30
  const days = lastDays(WINDOW)
  const scoreByDate = new Map((checkIns || []).map((c) => [c.checkInDate, c.itchingScore]))
  const logged = days.filter((d) => scoreByDate.get(d.iso) != null).length
  if (logged < 3) {
    return <p className="chart-empty muted">{t('A few more logs will make this easier to see.')}</p>
  }
  const relatedFood = (foodLogs || []).find((f) => f.id === pattern.relatedFoodLogId)
  const proteinName = relatedFood ? proteinLabel(relatedFood.primaryProtein) : t('Food')
  const foodDates = new Set((foodLogs || []).map((f) => f.dateStarted))

  const W = 300
  const H = 84
  const padT = 12
  const padB = 6
  const n = days.length
  const xAt = (i) => (i / (n - 1)) * W
  const yAt = (s) => padT + (1 - Math.max(0, Math.min(10, s)) / 10) * (H - padT - padB)
  const pts = days
    .map((d, i) => { const s = scoreByDate.get(d.iso); return s == null ? null : { x: xAt(i), y: yAt(s) } })
    .filter(Boolean)
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const foodMarks = days.map((d, i) => (foodDates.has(d.iso) ? xAt(i) : null)).filter((x) => x != null)
  const tickIdx = [0, Math.round(n * 0.2), Math.round(n * 0.4), Math.round(n * 0.6), Math.round(n * 0.8), n - 1]

  return (
    <div className="pattern-chart">
      <div className="pattern-chart-head">
        <span className="pattern-chart-title">{t('Last {n} days', { n: WINDOW })}</span>
        <span className="pattern-chart-legend">
          <span><i className="chart-key dot" />{proteinName}</span>
          <span><i className="chart-key line" />{t('Scratching')}</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="pattern-chart-svg" role="img" aria-label={t('Scratching')}>
        {[0, 5, 10].map((s) => (
          <line key={`g${s}`} x1="0" x2={W} y1={yAt(s).toFixed(1)} y2={yAt(s).toFixed(1)} className="chart-grid-line" />
        ))}
        {foodMarks.map((x, i) => (
          <line key={i} x1={x.toFixed(1)} x2={x.toFixed(1)} y1={padT} y2={H - padB} className="chart-food-line" />
        ))}
        <path d={linePath} className="chart-line-path" />
        {pts.map((p, i) => (
          <circle key={`d${i}`} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="2.1" className="chart-dot" />
        ))}
        {foodMarks.map((x, i) => (
          <circle key={i} cx={x.toFixed(1)} cy={padT} r="3.4" className="chart-food-dot" />
        ))}
      </svg>
      <div className="pattern-chart-axis">
        {tickIdx.map((i) => <span key={i}>{formatDate(days[i].iso)}</span>)}
      </div>
    </div>
  )
}

function PatternCellStrip({ pattern, checkIns, sig, foodLogs }) {
  const WINDOW = 14
  const days = lastDays(WINDOW)
  const byDate = new Map((checkIns || []).map((c) => [c.checkInDate, c]))
  const foodDates = new Set((foodLogs || []).map((f) => f.dateStarted))
  const cells = days.map((d) => {
    const entry = byDate.get(d.iso)
    const read = entry ? sig.read(entry) : null
    return { iso: d.iso, day: d.date.getDate(), tone: read ? read.tone : 'none', value: read ? read.value : null, food: foodDates.has(d.iso) }
  })
  const logged = cells.filter((c) => c.tone !== 'none').length
  if (logged < 3) {
    return <p className="chart-empty muted">{t('A few more logs will make this easier to see.')}</p>
  }
  return (
    <div className="pattern-chart">
      <div className="pattern-chart-head">
        <span className="pattern-chart-title">{t('Last 2 weeks')}</span>
      </div>
      <div className="cell-days" aria-hidden="true">
        {cells.map((c) => <span key={c.iso}>{c.day}.</span>)}
      </div>
      <div className="cell-strip" role="img" aria-label={sig.label}>
        {cells.map((c) => (
          <span key={c.iso} className={`cell-bar ${c.tone}`}
            title={`${formatDate(c.iso)} · ${c.value ? `${sig.label}: ${c.value}` : t('No check-in')}${c.food ? ` · ${t('food change')}` : ''}`}>
            {c.food ? <Leaf size={11} /> : null}
          </span>
        ))}
      </div>
      <div className="cell-legend muted">
        <span><i className="cell-key calm" />{t('calm')}</span>
        <span><i className="cell-key watch" />{t('mild')}</span>
        <span><i className="cell-key changed" />{changedLabel(pattern.type)}</span>
      </div>
    </div>
  )
}

function PatternCard({ pattern, variant, checkIns, foodLogs, onShowTimeline, onSetStatus, onVetSummary, onFoodDetective }) {
  const meta = statusMeta(pattern.status)

  // Settled / dismissed cards stay compact and unchanged — the case-file layout is
  // for the active variant only.
  if (variant !== 'active') {
    return (
      <article className="panel pattern-card dismissed">
        <div className="pattern-top">
          {variant === 'settled'
            ? <span className="status-chip calm">{t('Settled')}</span>
            : meta.label
              ? <span className={`status-chip ${meta.tone}`}>{meta.label}</span>
              : <span className="pattern-flag">{t('Something to notice')}</span>}
        </div>
        <h2>{pattern.title}</h2>
        {variant === 'settled'
          ? <p className="memory-line">{settledLine(pattern)}</p>
          : (memoryLine(pattern) && <p className="memory-line">{memoryLine(pattern)}</p>)}
        <p>{pattern.summary}</p>
        <div className="pattern-actions">
          {variant === 'dismissed' && (
            <button className="chip-button" type="button" onClick={() => onSetStatus(pattern, 'ACKNOWLEDGED')}>{t('Bring back')}</button>
          )}
          {variant === 'settled' && (
            <button className="chip-button subtle" type="button" onClick={() => onSetStatus(pattern, 'NOT_RELEVANT')}>{t('Hide')}</button>
          )}
        </div>
      </article>
    )
  }

  const nearbyFood = nearbyFoodChanges(pattern, foodLogs)
  const seenBefore = pattern.seenBefore && pattern.detectionCount > 1
  return (
    <article className="panel pattern-card case-file-card">
      <div className="pattern-top">
        <span className="case-file-kicker">{t('Pattern case file')}</span>
        {meta.label && <span className={`status-chip ${meta.tone}`}>{meta.label}</span>}
      </div>
      <h2>{pattern.title}</h2>

      <div className="case-file-section">
        <p className="case-file-label">{t('What PetPattern noticed')}</p>
        <p>{pattern.summary}</p>
        {pattern.evidence?.length > 0 && (
          <ul className="evidence-list">
            {pattern.evidence.map((line) => <li key={line}>{line}</li>)}
          </ul>
        )}
      </div>

      {pattern.firstDetectedAt && (
        <div className="case-file-section">
          <p className="case-file-label">{t('Seen before')}</p>
          <p className="case-file-meta">
            {seenBefore
              ? `${t('PetPattern found similar changes across a few logs.')} ${t('Seen a few times since {date}', { date: formatDate(pattern.firstDetectedAt) })}`
              : t('First noticed {date}', { date: formatDate(pattern.firstDetectedAt) })}
          </p>
        </div>
      )}

      <div className="case-file-section">
        <p className="case-file-label">{t('Related signals')}</p>
        <PatternChart pattern={pattern} checkIns={checkIns} foodLogs={foodLogs} />
      </div>

      {nearbyFood.length > 0 && (
        <div className="case-file-section">
          <p className="case-file-label">{t('Food or treat changes nearby')}</p>
          <ul className="case-file-food">
            {nearbyFood.map((f) => (
              <li key={f.id}>
                {formatDate(f.dateStarted)} · {[f.brand, f.productName].filter(Boolean).join(' - ') || foodKindLabel(f.foodKind)}{f.newFood ? ` · ${t('new')}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {pattern.type === 'POSSIBLE_FOOD_TRIGGER' && (
        <p className="pattern-disclaimer muted">{t('This is not an allergy diagnosis. It is a timeline you can discuss with your vet.')}</p>
      )}
      <p className="pattern-disclaimer muted">{t('This is a case file, not a diagnosis.')}</p>

      <div className="case-file-section">
        <p className="case-file-label">{t('Status')}</p>
        <div className="pattern-actions">
          <button className="chip-button primary-chip" type="button" onClick={() => onSetStatus(pattern, 'SHARED_WITH_VET')}>{t('Add to vet summary')}</button>
          <button className="chip-button subtle" type="button" onClick={() => onSetStatus(pattern, 'NOT_RELEVANT')}>{t('Hide')}</button>
        </div>
      </div>

      <div className="action-row case-file-cta">
        <button className="primary-button" type="button" onClick={() => onShowTimeline(pattern)}>
          {t('Open case file')} <ChevronRight size={16} />
        </button>
        {onFoodDetective && pattern.type === 'POSSIBLE_FOOD_TRIGGER' && (
          <button className="secondary-button" type="button" onClick={onFoodDetective}>
            <Search size={18} /> {t('Open food detective')}
          </button>
        )}
        {onVetSummary && (
          <button className="secondary-button" type="button" onClick={onVetSummary}>
            <Stethoscope size={18} /> {t('Bring this to your vet')}
          </button>
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
  const events = timeline?.events ?? []
  const photosByDate = {}
  ;(photos ?? []).filter((photo) => !isProfilePhoto(photo)).forEach((photo) => {
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
      <h1>{timeline?.title ?? t('What happened before it?')}</h1>
      <p className="lead">{timeline?.subtitle ?? t("PetPattern looks at the days before {name}'s signals changed.", { name: pet.name })}</p>

      {headline && (
        <article className="panel pattern-card">
          <div className="pattern-top">
            <span className="pattern-flag">{t('Something to notice')}</span>
            <Activity size={17} />
          </div>
          <h2>{headline}</h2>
          {pattern?.seenBefore && pattern.detectionCount > 1 && (
            <p className="memory-line">{t("You've seen this a few times since {date}.", { date: formatDate(pattern.firstDetectedAt) })}</p>
          )}
          {timeline?.summary && <p>{timeline.summary}</p>}
          {timeline?.ownerExplanation && <p className="owner-explanation">{timeline.ownerExplanation}</p>}
        </article>
      )}

      {timeline?.empty || events.length === 0 ? (
        <article className="panel">
          <h2>{t('Not much of a story yet — that\'s fine.')}</h2>
          <p className="muted">{timeline?.emptyMessage ?? t('A few more quiet days help too — they teach the app what normal looks like.')}</p>
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

      {(pattern?.type ?? timeline?.type) === 'POSSIBLE_FOOD_TRIGGER' && (
        <p className="pattern-disclaimer muted">{t('This is not an allergy diagnosis. It is a timeline you can discuss with your vet.')}</p>
      )}
      <p className="muted">{t('Going to the vet? Bring the timeline, not your memory.')}</p>
      <div className="action-row">
        <button className="primary-button" type="button" onClick={onVetSummary}>
          <Stethoscope size={18} /> {t('Bring this to your vet')}
        </button>
        {(pattern?.type ?? timeline?.type) === 'POSSIBLE_FOOD_TRIGGER' && onTrial && (
          <button className="secondary-button" type="button" onClick={onTrial}>
            <FlaskConical size={18} /> {t('Track a food change')}
          </button>
        )}
      </div>

      {timeline?.medicalDisclaimer && <p className="disclaimer">{timeline.medicalDisclaimer}</p>}
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

function RetentionStrip({ pet, retention, checkInCount = 0, onLogToday, onQuickLog }) {
  if (!retention) return null
  const { loggedToday, daysSinceLastCheckIn, loggedDaysLast30 } = retention
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
            <ClipboardList size={18} />
            <div><strong>{checkInCount}</strong><span>{t('baseline days')}</span></div>
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
              <span className="muted">{t('A week of quick notes gives PetPattern enough to start spotting what changed.')}</span>
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
          <span><Check size={16} /> {checkInCount > 1 ? t('Logged today — {n} days on record.', { n: checkInCount }) : t("Logged today — that's a start.")}</span>
        ) : (
          <span>{nudgeText(pet, daysSinceLastCheckIn)}</span>
        )}
      </div>

      <ReminderControl pet={pet} loggedToday={loggedToday} />
    </section>
  )
}

function nudgeText(pet, daysSince) {
  if (daysSince == null) return t("Start {name}'s memory with a quick check-in.", { name: pet.name })
  if (daysSince <= 1) return t("Add today's check-in so {name}'s record stays complete.", { name: pet.name })
  return t("It's been {n} days since {name}'s last note — a quick one keeps the picture clear.", { n: daysSince, name: pet.name })
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

function RecentTimeline({ pet, checkIns, onEdit, onDelete, onLogDay }) {
  const cat = isCat(pet)
  const [findDate, setFindDate] = useState('')
  const [query, setQuery] = useState('')
  if (!checkIns.length) return null
  // Search the recent record by the same words the owner sees on each row —
  // signal labels ("Scratching", "Diarrhea"…) and their own note — so typing
  // "scra" surfaces the scratching days. Localised text, so it works in HR too.
  const q = query.trim().toLowerCase()
  const searchable = (c) => `${formatDate(c.checkInDate)} ${timelineSummary(c, cat)} ${timelineFlags(c, cat)} ${c.freeTextNote || ''}`.toLowerCase()
  const matches = q ? checkIns.filter((c) => searchable(c).includes(q)) : []
  const visible = q ? matches : checkIns.slice(0, 8)
  const found = findDate ? checkIns.find((c) => c.checkInDate === findDate) : null
  return (
    <section className="panel timeline-panel">
      <div className="panel-heading">
        <CalendarDays size={18} />
        <h2>{t('Recent memory')}</h2>
      </div>

      {onLogDay && (
        <div className="find-day no-print">
          <div className="find-day-head">
            <Search size={15} />
            <input type="search" className="find-day-search" value={query}
              placeholder={t('Search a signal or note (e.g. scratching)')}
              onChange={(e) => setQuery(e.target.value)} aria-label={t('Search your notes')} />
            <input type="date" className="find-day-input" max={today} value={findDate}
              onChange={(e) => setFindDate(e.target.value)} aria-label={t('Pick a date')} />
          </div>
          {q ? (
            <p className="find-day-hint muted">{matches.length ? t('Days found: {n}', { n: matches.length }) : t('No days match your search.')}</p>
          ) : !findDate ? (
            <p className="find-day-hint muted">{t('Type to search, or pick a date.')}</p>
          ) : found ? (
            <div className="find-day-result">
              <div className="timeline-main">
                <span>{formatDate(found.checkInDate)}</span>
                <strong>{timelineSummary(found, cat)}</strong>
                <small>{timelineFlags(found, cat)}</small>
              </div>
              <button className="chip-button" type="button" onClick={() => onEdit(found)}>{t('Edit')}</button>
            </div>
          ) : (
            <div className="find-day-result empty">
              <span className="muted">{t('No check-in logged for this day.')}</span>
              <button className="chip-button" type="button" onClick={() => onLogDay(findDate)}>{t('Log this day')}</button>
            </div>
          )}
        </div>
      )}

      <div className="timeline">
        {visible.map((item) => (
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
    <button className={active ? 'record-tab active' : 'record-tab'} type="button" onClick={onClick} aria-current={active ? 'page' : undefined}>
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
      <div className="choice-grid" role="group" aria-label={label}>
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
      const converted = unit === 'lbs' ? value * 2.2046226 : value / 2.2046226
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
          ? Math.round(Number(form.currentWeightKg) * (weightUnit === 'lbs' ? 0.45359237 : 1) * 100) / 100
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

function hashView() {
  const value = window.location.hash.replace('#', '')
  return ['today', 'check-in', 'food', 'food-detective', 'patterns', 'timeline', 'photos', 'trial', 'recap', 'medications', 'vet', 'caregivers', 'add-pet', 'account'].includes(value) ? value : 'today'
}

function isProfilePhoto(photo) {
  return String(photo?.area || '').toUpperCase() === 'PROFILE'
}

function photoAreaLabel(area) {
  switch (String(area || 'OTHER').toUpperCase()) {
    case 'PROFILE': return t('Profile photo')
    case 'EAR': return t('Ears')
    case 'PAW': return t('Paw')
    case 'SKIN': return t('Skin')
    case 'COAT': return t('Coat')
    case 'EYE': return t('Eyes')
    case 'STOOL': return t('Stool')
    case 'WOUND': return t('Wound / visible change')
    case 'SWELLING': return t('Swelling')
    case 'SHELL': return t('Shell')
    case 'FEATHER': return t('Feathers')
    case 'FIN_SCALE': return t('Fins / scales')
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
      return { label: t('In vet summary'), tone: 'vet' }
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
    return t('Seen a few times since {date}', { date: formatDate(pattern.firstDetectedAt) })
  }
  return t('First noticed {date}', { date: formatDate(pattern.firstDetectedAt) })
}

function titleCase(value) {
  return String(value).toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function dateLocale() {
  return getLang() === 'hr' ? 'hr' : 'en'
}

// Parse a bare 'YYYY-MM-DD' as a LOCAL calendar date. new Date('YYYY-MM-DD')
// parses as UTC midnight, which renders one day early in negative-UTC-offset
// zones — so date-only strings (check-in dates, food dates) must be built from
// local components to label the right day.
function parseLocalDate(value) {
  if (typeof value === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  }
  return new Date(value)
}

// Shift a bare 'YYYY-MM-DD' by n days and return the same string form (local).
function addDays(isoDate, n) {
  const d = parseLocalDate(isoDate)
  d.setDate(d.getDate() + n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDate(value) {
  if (!value) return ''
  const date = parseLocalDate(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat(dateLocale(), { month: 'short', day: 'numeric' }).format(date)
}

// Friendly date entry: Today / Yesterday one-tap chips (the 95% case for a daily
// log) plus an "Other day" chip that still opens the OS calendar for any date and
// shows the chosen day in words. No date-picker dependency.
function DateField({ value, max = today, onChange, label }) {
  const yesterday = addDays(max, -1)
  const isToday = value === max
  const isYesterday = value === yesterday
  const isOther = !isToday && !isYesterday
  return (
    <div className="date-field">
      <button type="button" className={isToday ? 'date-chip active' : 'date-chip'} aria-pressed={isToday} onClick={() => onChange(max)}>
        {t('Today')}
      </button>
      <button type="button" className={isYesterday ? 'date-chip active' : 'date-chip'} aria-pressed={isYesterday} onClick={() => onChange(yesterday)}>
        {t('Yesterday')}
      </button>
      <label className={isOther ? 'date-chip date-chip-cal active' : 'date-chip date-chip-cal'}>
        <CalendarDays size={15} />
        <span>{isOther ? formatDate(value) : t('Choose a date')}</span>
        <input
          type="date"
          value={value || max}
          max={max}
          aria-label={label || t('Date')}
          onClick={(e) => { try { e.currentTarget.showPicker && e.currentTarget.showPicker() } catch { /* falls back to native click */ } }}
          onChange={(e) => { if (e.target.value) onChange(e.target.value) }}
        />
      </label>
    </div>
  )
}

function formatLongDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat(dateLocale(), { month: 'short', day: 'numeric', year: 'numeric' }).format(parseLocalDate(value))
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
    if (item.pawLicking) flags.push(t('Paw licking'))
  }
  if (item.freeTextNote) flags.push(item.freeTextNote)
  return flags.length ? flags.join(' · ') : t('Nothing unusual noted')
}

export default App
