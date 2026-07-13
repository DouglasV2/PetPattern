// Protective tests for the i18n fallback contract in i18n.js: English strings
// are their own keys, so an untranslated (or unrecognised) key must render as
// itself rather than throwing or going blank — see the file header comment in
// i18n.js. These run with the module's default language (English; i18n.js
// never changes currentLang except via setLang/loadLang, neither of which is
// called here), so t() exercises the "no map for this locale" fallback path.

import { describe, expect, it } from 'vitest'
import { t } from './i18n'

describe('i18n t()', () => {
  it('returns an unknown English key unchanged', () => {
    const key = 'some unknown english key that has no translation entry'
    expect(t(key)).toBe(key)
  })

  it('interpolates {vars} into the string', () => {
    expect(t('Hello {name}, this is a test', { name: 'Luna' })).toBe('Hello Luna, this is a test')
  })

  it('interpolates multiple {vars}, including non-string values', () => {
    expect(t('{name} has {count} logs', { name: 'Luna', count: 3 })).toBe('Luna has 3 logs')
  })
})
