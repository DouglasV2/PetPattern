import { useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { t } from '../i18n'
import { isProfilePhoto } from '../lib/photos'
import { petSubtitle } from '../lib/pets'
import { PetAvatar } from './PetAvatar'

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

export { PetIdentityCard }
