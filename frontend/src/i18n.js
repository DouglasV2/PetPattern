// Lightweight i18n. English strings are their own keys and the default, so any
// string not yet translated for a locale falls back to English gracefully —
// never a missing key, never broken. Each locale lives in ./locales/<code>.js
// as { "<English key>": "<translation>" }.
//
// Scope note: this covers the static frontend copy. Backend-generated content
// (pattern cards, timeline, vet summary, recap, AI note) is localised server-side
// via Accept-Language. For v0.1.0-beta only English + Croatian are offered here
// (see LANGUAGES); the backend is likewise gated to serve only HR + EN. The other
// locale maps stay in the codebase as future work. See docs/i18n.md.

import hr from './locales/hr'
import de from './locales/de'
import es from './locales/es'
import fr from './locales/fr'
import it from './locales/it'
import no from './locales/no'
import pl from './locales/pl'
import nl from './locales/nl'
import sv from './locales/sv'
import da from './locales/da'
import pt from './locales/pt'
import ro from './locales/ro'
import cs from './locales/cs'
import sk from './locales/sk'
import el from './locales/el'

let currentLang = 'en'

// Public, user-selectable languages for v0.1.0-beta. English and Croatian are the
// only languages localized end-to-end (UI + backend-generated text, legal, vet
// summary, pattern explanations, email). This is the ONLY list the picker shows,
// and the only set treated as supported for fallback.
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hr', label: 'Hrvatski' }
]

// Translated in the codebase (see ./locales/*) but HIDDEN from the UI until each
// is complete end-to-end. Kept as future work — nothing here is deleted. To
// re-enable a language once it's fully localized, move its entry into LANGUAGES.
export const HIDDEN_LANGUAGES = [
  { code: 'de', label: 'Deutsch' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
  { code: 'ro', label: 'Română' },
  { code: 'no', label: 'Norsk' },
  { code: 'sv', label: 'Svenska' },
  { code: 'da', label: 'Dansk' },
  { code: 'pl', label: 'Polski' },
  { code: 'cs', label: 'Čeština' },
  { code: 'sk', label: 'Slovenčina' },
  { code: 'el', label: 'Ελληνικά' }
]

// English is the base (keys are English), so it has no map.
const LOCALES = { hr, de, es, fr, it, no, pl, nl, sv, da, pt, ro, cs, sk, el }
const SUPPORTED = new Set(LANGUAGES.map((l) => l.code))
const STORAGE_KEY = 'petpattern.lang'

export function getLang() {
  return currentLang
}

export function setLang(lang) {
  currentLang = SUPPORTED.has(lang) ? lang : 'en'
}

export function loadLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && SUPPORTED.has(saved)) {
      currentLang = saved
    } else if (saved) {
      // A previously-saved locale that is no longer public (an older build, or a
      // now-hidden language) safely falls back to English, and the stale value is
      // rewritten so it doesn't linger. currentLang stays 'en' (the default).
      persistLang('en')
    }
  } catch (err) {
    // Blocked/unavailable storage — stay on the English default, never throw.
  }
  return currentLang
}

export function persistLang(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch (err) {
    // ignore blocked storage
  }
}

export function t(text, vars) {
  const map = LOCALES[currentLang]
  let out = map && Object.prototype.hasOwnProperty.call(map, text) ? map[text] : text
  if (vars) {
    for (const key of Object.keys(vars)) {
      out = out.split(`{${key}}`).join(String(vars[key]))
    }
  }
  return out
}
