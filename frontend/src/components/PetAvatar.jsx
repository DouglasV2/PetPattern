import { useEffect, useState } from 'react'
import { isCat } from '../lib/species'

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

export { PetAvatar }
