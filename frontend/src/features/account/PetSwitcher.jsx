import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, ImagePlus, PawPrint, Plus } from 'lucide-react'
import { t } from '../../i18n'
import { PetAvatar } from '../../components/PetAvatar'

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

export { PetSwitcher }
