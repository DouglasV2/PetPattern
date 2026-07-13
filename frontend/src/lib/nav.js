// URL-hash routing helpers. This app has no router dependency — the hash IS
// the route, read once at mount and on 'hashchange'.

export function hashView() {
  const value = window.location.hash.replace('#', '')
  return ['today', 'check-in', 'food', 'food-detective', 'patterns', 'timeline', 'photos', 'trial', 'recap', 'medications', 'vet', 'caregivers', 'add-pet', 'account'].includes(value) ? value : 'today'
}

export function sharedTokenFromHash() {
  const match = (window.location.hash || '').match(/^#shared=(.+)$/)
  return match ? decodeURIComponent(match[1]) : null
}

export function resetTokenFromHash() {
  const match = (window.location.hash || '').match(/^#reset=(.+)$/)
  return match ? decodeURIComponent(match[1]) : null
}

export function legalFromHash() {
  const value = (window.location.hash || '').replace('#', '')
  return ['privacy', 'terms', 'disclaimer'].includes(value) ? value : null
}
