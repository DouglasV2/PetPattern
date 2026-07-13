// Species predicates + reference data that lived directly in App.jsx, as
// opposed to the fuller per-species profile data in ../speciesProfiles.js.

export function isCat(pet) {
  return (pet?.species || 'DOG') === 'CAT'
}

// Breed suggestions for the onboarding autocomplete (a native <datalist>, so it
// only suggests — the owner can still type anything, incl. a Croatian name).
export const DOG_BREEDS = [
  'Mixed breed', 'Labrador Retriever', 'Golden Retriever', 'German Shepherd', 'French Bulldog',
  'Bulldog', 'Poodle', 'Beagle', 'Rottweiler', 'Dachshund', 'Yorkshire Terrier', 'Boxer',
  'Cavalier King Charles Spaniel', 'Australian Shepherd', 'Siberian Husky', 'Cane Corso',
  'Great Dane', 'Miniature Schnauzer', 'Doberman Pinscher', 'Shih Tzu', 'Boston Terrier',
  'Bernese Mountain Dog', 'Pomeranian', 'Havanese', 'Cocker Spaniel', 'Border Collie', 'Maltese',
  'Chihuahua', 'Shiba Inu', 'Vizsla', 'Pembroke Welsh Corgi', 'Australian Cattle Dog',
  'Basset Hound', 'Bichon Frise', 'Belgian Malinois', 'Jack Russell Terrier', 'Weimaraner',
  'Pug', 'Samoyed', 'Akita', 'Whippet', 'German Shorthaired Pointer'
]
export const CAT_BREEDS = [
  'Mixed breed', 'Domestic Shorthair', 'Domestic Longhair', 'Maine Coon', 'Persian', 'Ragdoll',
  'British Shorthair', 'Siamese', 'Sphynx', 'Bengal', 'Scottish Fold', 'Abyssinian',
  'American Shorthair', 'Norwegian Forest Cat', 'Russian Blue', 'Birman', 'Oriental Shorthair',
  'Devon Rex', 'Burmese', 'Exotic Shorthair'
]

// Species shapes what we track and how we talk about it. Copy is translated at
// render time via t(); these are the English keys.
// NOTE: not currently referenced anywhere (superseded by SPECIES_PROFILES in
// ../speciesProfiles.js) — moved as-is, unused, to avoid a behavior change.
export const SPECIES = {
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
