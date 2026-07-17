import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ImagePlus, Trash2, X } from 'lucide-react'
import { api } from '../../api'
import { t } from '../../i18n'
import { trackServer } from '../../analytics'
import { formatDate, today } from '../../lib/date'
import { PHOTO_AREAS, byCapturedDateAsc, isProfilePhoto, photoAreaLabel, resizeImage } from '../../lib/photos'

function PhotosView({ pet, photos, onBack, onUploaded, onDeletePhoto }) {
  const [area, setArea] = useState('EAR')
  const [date, setDate] = useState(today)
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [lightbox, setLightbox] = useState(null)
  const fileRef = useRef(null)
  const lightboxCloseRef = useRef(null)
  const lastFocusedRef = useRef(null)

  // Lightbox is the app's one modal dialog: trap focus inside it, move focus to Close on open,
  // keep Tab within the dialog, close on Escape, and restore focus to the opening thumbnail.
  useEffect(() => {
    if (!lightbox) return undefined
    lastFocusedRef.current = document.activeElement
    lightboxCloseRef.current?.focus()
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setLightbox(null)
        return
      }
      if (event.key === 'Tab') {
        // The dialog exposes a single focusable control (Close), so keep focus on it.
        event.preventDefault()
        lightboxCloseRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (lastFocusedRef.current && typeof lastFocusedRef.current.focus === 'function') {
        lastFocusedRef.current.focus()
      }
    }
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

  // Funnel analytics: record that the owner viewed their visual photo timeline — only once a real
  // timeline exists (at least one saved health photo), fired on first appearance / pet switch.
  const hasTimeline = healthPhotos.length > 0
  useEffect(() => {
    if (hasTimeline) trackServer('photo_timeline_used', { species: pet.species })
  }, [pet.id, pet.species, hasTimeline])

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
        <div className="lightbox" role="dialog" aria-modal="true"
             aria-label={lightbox.caption || photoAreaLabel(lightbox.area)}
             onClick={() => setLightbox(null)}>
          <button ref={lightboxCloseRef} className="lightbox-close" type="button" aria-label={t('Close')} onClick={() => setLightbox(null)}><X size={22} /></button>
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

export { PhotosView }
