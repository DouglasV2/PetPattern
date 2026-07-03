// Lightweight i18n. English strings are their own keys and the default, so any
// string not yet translated for a locale falls back to English gracefully —
// never a missing key, never broken. Each locale lives in ./locales/<code>.js
// as { "<English key>": "<translation>" }.
//
// Scope note: this covers the static frontend copy. Backend-generated content
// (pattern cards, timeline, vet summary, recap, AI note) is localised server-side
// via Accept-Language; the backend currently ships English + Croatian, so the
// other locales see English backend text until those maps are added. The UI
// shell is fully translated regardless. See docs/i18n.md.

import hr from './locales/hr'
import de from './locales/de'
import es from './locales/es'
import fr from './locales/fr'
import it from './locales/it'
import no from './locales/no'
import pl from './locales/pl'

let currentLang = 'en'

// Order shown in the language picker. `label` is each language's own name.
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hr', label: 'Hrvatski' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
  { code: 'no', label: 'Norsk' },
  { code: 'pl', label: 'Polski' }
]

// English is the base (keys are English), so it has no map.
const LOCALES = { hr, de, es, fr, it, no, pl }
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
    }
  } catch (err) {
    // ignore blocked storage
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
