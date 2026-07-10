// Species profile layer — the single source of truth for what each pet type looks
// like in the product. Dogs and cats keep FULL support (explicit check-in fields
// and their existing guided forms in App.jsx). Every other species gets honest
// STARTER support: species-specific guided categories whose values are saved into
// the flexible observations model (DailyCheckIn.observationsJson), so a rabbit, a
// bird and a fish never see the same generic dog form.
//
// Keep this in sync with the backend Species enum + pets_species_check (V11).
//
// A guided category is { key, label, options?, cta? }:
//   - options: the value chips shown for a starter-species signal.
//   - cta: 'food' | 'medication' routes to that existing flow instead of a field.
//   - dog/cat categories live in App.jsx (CHANGED_CATEGORIES) with mapped fields.

export const SPECIES_ORDER = [
  'DOG', 'CAT', 'RABBIT', 'HAMSTER', 'GUINEA_PIG',
  'BIRD', 'REPTILE', 'TURTLE', 'FISH_AQUARIUM', 'OTHER_SMALL_PET'
]

// Default value chips for any starter signal without an explicit option list.
const BASIC = ['Normal', 'Changed', 'More', 'Less', 'Noticed']

export const SPECIES_PROFILES = {
  DOG: {
    label: 'Dog', emoji: '🐶', support: 'FULL', detectiveMode: 'FOOD',
    description: 'Skin, stool, food, energy and recurring changes.',
    notePlaceholder: 'e.g. {name} scratched more today, stool was softer, and we gave a new chicken treat yesterday.'
  },
  CAT: {
    label: 'Cat', emoji: '🐱', support: 'FULL', detectiveMode: 'FOOD',
    description: 'Litter box, appetite, hiding, water and recurring changes.',
    notePlaceholder: 'e.g. {name} used the litter box less today, hid under the bed, and ate about half a meal.'
  },
  RABBIT: {
    label: 'Rabbit', emoji: '🐰', support: 'STARTER', detectiveMode: 'FOOD',
    description: 'Appetite, hay, poop, water, hiding, teeth and weight notes.',
    notePlaceholder: 'e.g. {name} ate less hay today, had fewer droppings, and hid more than usual.',
    guidedCategories: [
      { key: 'appetite_hay', label: 'Appetite / hay', options: ['Normal', 'Eating less', 'Refused food', 'Hay intake changed'] },
      { key: 'poop', label: 'Poop', options: ['Normal', 'Less', 'Softer', 'Smaller', 'Noticed change'] },
      { key: 'water', label: 'Water', options: ['Normal', 'Less', 'More'] },
      { key: 'energy', label: 'Energy', options: ['Normal', 'Lower', 'Restless'] },
      { key: 'hiding', label: 'Hiding', options: ['Normal', 'More'] },
      { key: 'teeth', label: 'Teeth / chewing', options: ['Normal', 'Chewing less', 'Drooling noticed', 'Other note'] },
      { key: 'weight', label: 'Weight', options: ['Normal', 'Noticed change'] },
      { key: 'food', label: 'Food change', cta: 'food' },
      { key: 'medication', label: 'Medication', cta: 'medication' },
      { key: 'other', label: 'Other', options: ['Noticed change'] }
    ]
  },
  HAMSTER: {
    label: 'Hamster', emoji: '🐹', support: 'STARTER', detectiveMode: 'FOOD',
    description: 'Appetite, water, activity, fur, teeth and droppings notes.',
    notePlaceholder: 'e.g. {name} was less active today, ate less, and I noticed a change in droppings.',
    guidedCategories: [
      { key: 'appetite', label: 'Appetite', options: ['Normal', 'Eating less', 'Refused food', 'Hoarding more'] },
      { key: 'water', label: 'Water', options: ['Normal', 'Less', 'More'] },
      { key: 'activity', label: 'Activity', options: ['Normal', 'Less active', 'More active'] },
      { key: 'hiding', label: 'Hiding', options: ['Normal', 'More'] },
      { key: 'fur_skin', label: 'Fur / skin', options: ['Normal', 'Change noticed', 'Scratching'] },
      { key: 'teeth', label: 'Teeth / chewing', options: ['Normal', 'Chewing less', 'Overgrown noticed'] },
      { key: 'weight', label: 'Weight', options: ['Normal', 'Noticed change'] },
      { key: 'droppings', label: 'Droppings', options: ['Normal', 'Changed', 'Watery', 'Less'] },
      { key: 'other', label: 'Other', options: ['Noticed change'] }
    ]
  },
  GUINEA_PIG: {
    label: 'Guinea pig', emoji: '🐹', support: 'STARTER', detectiveMode: 'FOOD',
    description: 'Appetite, hay, poop, water, hiding, teeth and weight notes.',
    notePlaceholder: 'e.g. {name} ate less hay, was quieter, and I noticed softer poop.',
    guidedCategories: [
      { key: 'appetite_hay', label: 'Appetite / hay', options: ['Normal', 'Eating less', 'Refused food', 'Hay intake changed'] },
      { key: 'poop', label: 'Poop', options: ['Normal', 'Less', 'Softer', 'Smaller', 'Noticed change'] },
      { key: 'water', label: 'Water', options: ['Normal', 'Less', 'More'] },
      { key: 'energy', label: 'Energy', options: ['Normal', 'Lower', 'Restless'] },
      { key: 'hiding', label: 'Hiding', options: ['Normal', 'More'] },
      { key: 'teeth', label: 'Teeth / chewing', options: ['Normal', 'Chewing less', 'Drooling noticed'] },
      { key: 'weight', label: 'Weight', options: ['Normal', 'Noticed change'] },
      { key: 'food', label: 'Food change', cta: 'food' },
      { key: 'other', label: 'Other', options: ['Noticed change'] }
    ]
  },
  BIRD: {
    label: 'Bird', emoji: '🐦', support: 'STARTER', detectiveMode: 'ENVIRONMENT',
    description: 'Appetite, droppings, activity, vocalization and perch notes.',
    notePlaceholder: 'e.g. {name} was quieter today, sat lower on the perch, and droppings looked more watery.',
    guidedCategories: [
      { key: 'appetite', label: 'Appetite', options: ['Normal', 'Eating less', 'Refused food'] },
      { key: 'water', label: 'Water', options: ['Normal', 'Less', 'More'] },
      { key: 'droppings', label: 'Droppings', options: ['Normal', 'Changed', 'Watery', 'Less than usual'] },
      { key: 'activity', label: 'Activity', options: ['Normal', 'Less active', 'More active'] },
      { key: 'vocalization', label: 'Vocalization', options: ['Normal', 'Quieter', 'Louder', 'Different sound'] },
      { key: 'feathers', label: 'Feathers', options: ['Normal', 'Change noticed', 'Plucking noticed'] },
      { key: 'perch', label: 'Perch behavior', options: ['Normal', 'Sitting lower', 'Less active', 'Other note'] },
      { key: 'breathing', label: 'Breathing observation', options: ['Normal', 'Noticed change'] },
      { key: 'other', label: 'Other', options: ['Noticed change'] }
    ]
  },
  REPTILE: {
    label: 'Reptile', emoji: '🦎', support: 'STARTER', detectiveMode: 'ENVIRONMENT',
    description: 'Feeding, basking, shedding, activity and enclosure notes.',
    notePlaceholder: 'e.g. {name} skipped feeding, basked less, and the enclosure ran cooler than usual.',
    guidedCategories: [
      { key: 'feeding', label: 'Feeding', options: ['Normal', 'Ate less', 'Refused food'] },
      { key: 'basking', label: 'Basking', options: ['Normal', 'More', 'Less', 'Avoiding basking'] },
      { key: 'shedding', label: 'Shedding', options: ['Normal', 'Started', 'Incomplete', 'Concern noted'] },
      { key: 'activity', label: 'Activity', options: ['Normal', 'Less active', 'More active'] },
      { key: 'stool_urate', label: 'Stool / urate', options: ['Normal', 'Changed', 'None noticed'] },
      { key: 'temperature', label: 'Enclosure temperature', options: ['Normal', 'Lower than usual', 'Higher than usual', 'Changed setup'] },
      { key: 'humidity', label: 'Humidity', options: ['Normal', 'Lower', 'Higher', 'Changed setup'] },
      { key: 'skin', label: 'Skin', options: ['Normal', 'Change noticed'] },
      { key: 'other', label: 'Other', options: ['Noticed change'] }
    ]
  },
  TURTLE: {
    label: 'Turtle', emoji: '🐢', support: 'STARTER', detectiveMode: 'ENVIRONMENT',
    description: 'Feeding, basking, activity, shell and enclosure notes.',
    notePlaceholder: 'e.g. {name} basked less, ate little, and the water looked cloudy today.',
    guidedCategories: [
      { key: 'feeding', label: 'Feeding', options: ['Normal', 'Ate less', 'Refused food'] },
      { key: 'basking', label: 'Basking', options: ['Normal', 'More', 'Less', 'Avoiding basking'] },
      { key: 'activity', label: 'Activity', options: ['Normal', 'Less active', 'More active'] },
      { key: 'shell', label: 'Shell', options: ['Normal', 'Mark noticed', 'Soft spot concern', 'Other note'] },
      { key: 'shedding_skin', label: 'Shedding / skin', options: ['Normal', 'Started', 'Concern noted'] },
      { key: 'water_enclosure', label: 'Water / enclosure', options: ['Normal', 'Water changed', 'Cloudy', 'Setup changed'] },
      { key: 'stool', label: 'Stool', options: ['Normal', 'Changed', 'None noticed'] },
      { key: 'eyes', label: 'Eyes', options: ['Normal', 'Change noticed'] },
      { key: 'other', label: 'Other', options: ['Noticed change'] }
    ]
  },
  FISH_AQUARIUM: {
    label: 'Fish / Aquarium', emoji: '🐠', support: 'STARTER', detectiveMode: 'ENVIRONMENT',
    description: 'Feeding, swimming, water clarity, temperature and fin/scale notes.',
    notePlaceholder: 'e.g. after a water change the fish were less active and the water looked cloudy.',
    guidedCategories: [
      { key: 'feeding', label: 'Feeding', options: ['Normal', 'Ate less', 'Refused food'] },
      { key: 'swimming', label: 'Swimming / activity', options: ['Normal', 'Less active', 'Hiding', 'Unusual swimming'] },
      { key: 'appetite', label: 'Appetite', options: ['Normal', 'Lower', 'Refused'] },
      { key: 'water_change', label: 'Water change', options: ['None', 'Partial change', 'Full change'] },
      { key: 'water_clarity', label: 'Water clarity', options: ['Clear', 'Cloudy', 'Changed'] },
      { key: 'spots_fins', label: 'Spots / fins / scales', options: ['Normal', 'Spot noticed', 'Fin concern', 'Scale concern'] },
      { key: 'temperature', label: 'Tank temperature', options: ['Normal', 'Lower', 'Higher', 'Changed'] },
      { key: 'behavior', label: 'Behavior change', options: ['Normal', 'Noticed change'] },
      { key: 'other', label: 'Other', options: ['Noticed change'] }
    ]
  },
  OTHER_SMALL_PET: {
    label: 'Other small pet', emoji: '🐾', support: 'STARTER', detectiveMode: 'BASIC',
    description: 'Appetite, water, activity, droppings and behavior notes.',
    notePlaceholder: 'e.g. {name} was quieter today, ate a little less, and I noticed a small change.',
    guidedCategories: [
      { key: 'appetite', label: 'Appetite', options: ['Normal', 'Eating less', 'Refused food'] },
      { key: 'water', label: 'Water', options: ['Normal', 'Less', 'More'] },
      { key: 'activity', label: 'Activity', options: ['Normal', 'Less active', 'More active'] },
      { key: 'hiding', label: 'Hiding', options: ['Normal', 'More'] },
      { key: 'droppings', label: 'Droppings', options: ['Normal', 'Changed', 'Watery', 'Less'] },
      { key: 'weight', label: 'Weight', options: ['Normal', 'Noticed change'] },
      { key: 'behavior', label: 'Behavior change', options: ['Normal', 'Noticed change'] },
      { key: 'other', label: 'Other', options: ['Noticed change'] }
    ]
  }
}

// Universal Visible Change / Wound tracking. This is NOT a diagnosis or a wound
// detector — owners note only what they can see and track how it looks over time
// for a vet conversation. Every option maps to a photo area so photos of the same
// kind line up in the progression view (PhotosView groups by area). Values are
// stored as a `visible_change` signal in the same observations model as everything
// else, so a repeated visible change becomes a case file for free.
const VC_MAMMAL = [
  { value: 'Redness noticed', area: 'SKIN' },
  { value: 'Swelling noticed', area: 'SWELLING' },
  { value: 'Scratch or cut noticed', area: 'WOUND' },
  { value: 'Bleeding noticed', area: 'WOUND' },
  { value: 'Licking or bothering the area', area: 'SKIN' },
  { value: 'Spot or mark noticed', area: 'SKIN' }
]
const VC_SMALL = [
  { value: 'Spot noticed', area: 'SKIN' },
  { value: 'Redness noticed', area: 'SKIN' },
  { value: 'Swelling noticed', area: 'SWELLING' },
  { value: 'Skin change', area: 'SKIN' },
  { value: 'Wound noticed', area: 'WOUND' }
]

const VISIBLE_CHANGE = {
  DOG: { label: 'Visible change / wound', options: VC_MAMMAL },
  CAT: { label: 'Visible change / wound', options: VC_MAMMAL },
  RABBIT: { label: 'Skin / wound', options: VC_SMALL },
  HAMSTER: { label: 'Skin / wound', options: VC_SMALL },
  GUINEA_PIG: { label: 'Skin / wound', options: VC_SMALL },
  BIRD: {
    label: 'Visible change / feathers / skin',
    options: [
      { value: 'Spot noticed', area: 'SKIN' },
      { value: 'Redness noticed', area: 'SKIN' },
      { value: 'Swelling noticed', area: 'SWELLING' },
      { value: 'Skin change', area: 'SKIN' },
      { value: 'Feather change', area: 'FEATHER' },
      { value: 'Wound noticed', area: 'WOUND' }
    ]
  },
  REPTILE: {
    label: 'Visible change / skin',
    options: [
      { value: 'Spot noticed', area: 'SKIN' },
      { value: 'Redness noticed', area: 'SKIN' },
      { value: 'Swelling noticed', area: 'SWELLING' },
      { value: 'Skin change', area: 'SKIN' },
      { value: 'Shedding concern', area: 'SKIN' },
      { value: 'Wound noticed', area: 'WOUND' }
    ]
  },
  TURTLE: {
    label: 'Shell / skin change',
    options: [
      { value: 'Shell mark noticed', area: 'SHELL' },
      { value: 'Shell soft spot noticed', area: 'SHELL' },
      { value: 'Spot noticed', area: 'SKIN' },
      { value: 'Swelling noticed', area: 'SWELLING' },
      { value: 'Skin change', area: 'SKIN' },
      { value: 'Wound noticed', area: 'WOUND' }
    ]
  },
  FISH_AQUARIUM: {
    label: 'Visible change / fins / scales',
    options: [
      { value: 'Spot noticed', area: 'SKIN' },
      { value: 'Fin change', area: 'FIN_SCALE' },
      { value: 'Scale change', area: 'FIN_SCALE' },
      { value: 'Redness noticed', area: 'SKIN' },
      { value: 'Wound noticed', area: 'WOUND' }
    ]
  },
  OTHER_SMALL_PET: { label: 'Visible change / wound', options: VC_SMALL }
}

// better/same/worse — how the change compares to before. Stored as the signal's
// `status`. Owner-observed only; never an assessment of severity or a diagnosis.
export const VISIBLE_CHANGE_STATUSES = [
  { value: 'better', label: 'Better' },
  { value: 'same', label: 'Same' },
  { value: 'worse', label: 'Worse' }
]

/** Species-specific Visible Change / Wound config, falling back to small-pet. */
export function visibleChangeConfig(species) {
  return VISIBLE_CHANGE[species] || VISIBLE_CHANGE.OTHER_SMALL_PET
}

/** Profile for a species, always falling back to the small-pet profile. */
export function speciesProfile(species) {
  return SPECIES_PROFILES[species] || SPECIES_PROFILES.OTHER_SMALL_PET
}

export function isFullSupport(species) {
  return species === 'DOG' || species === 'CAT'
}

export function isStarterSpecies(species) {
  return !isFullSupport(species)
}

/** Options for a starter guided category (or a sensible default). */
export function categoryOptions(category) {
  return category.options && category.options.length > 0 ? category.options : BASIC
}

/** A value counts as "changed" unless it is an explicit normal/clear value. */
export function isChangedValue(value) {
  if (!value) return false
  const v = String(value).trim().toLowerCase()
  return !['normal', 'clear', 'unknown', 'none'].includes(v)
}
