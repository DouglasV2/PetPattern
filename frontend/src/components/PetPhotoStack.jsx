import { useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { t } from '../i18n'
import { isProfilePhoto } from '../lib/photos'
import { PetAvatar } from './PetAvatar'

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

export { PetPhotoStack }
