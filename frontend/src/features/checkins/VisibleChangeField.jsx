import { useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { t } from '../../i18n'
import { visibleChangeConfig, VISIBLE_CHANGE_STATUSES } from '../../speciesProfiles'

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

export { VisibleChangeField }
