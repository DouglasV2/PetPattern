// Pet weight is always stored in kilograms; the onboarding form lets an owner
// type the number in either kg or lb, converting between the two so the same
// real weight is shown after switching units (see PetOnboarding in App.jsx).
export function kgToLb(kg) {
  return kg * 2.2046226
}

export function lbToKg(lb) {
  return lb * 0.45359237
}
