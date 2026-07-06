import { getLang } from './i18n'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

// Called whenever the API returns 401, so the app can drop back to the login
// screen if a session expires mid-use.
let onUnauthorized = null
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'same-origin',
    // Spread options FIRST so a caller's headers can never clobber the merged
    // headers object below (sharedVetSummary passes X-Share-Token and must still
    // send Accept-Language).
    ...options,
    headers: {
      'Content-Type': 'application/json',
      // Backend-generated text (patterns, vet summary, recap…) follows the UI language.
      'Accept-Language': getLang(),
      ...(options.headers ?? {})
    }
  })

  if (!response.ok) {
    if (response.status === 401 && onUnauthorized) onUnauthorized()
    const raw = await response.text()
    let message = raw
    try {
      const body = JSON.parse(raw)
      message = body.message || body.error || raw
    } catch (err) {
      // not JSON — use the raw text
    }
    throw new Error(message || `Request failed: ${response.status}`)
  }

  if (response.status === 204) return null
  return response.json()
}

export const api = {
  // Public, unauthenticated: currently just { demoEnabled }.
  config: () => request('/config'),
  me: () => request('/auth/me'),
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token, password) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  listPets: () => request('/pets'),
  createPet: (payload) => request('/pets', { method: 'POST', body: JSON.stringify(payload) }),
  deletePet: (petId) => request(`/pets/${petId}`, { method: 'DELETE' }),
  getOverview: (petId) => request(`/pets/${petId}/overview`),
  listCheckIns: (petId) => request(`/pets/${petId}/check-ins`),
  latestCheckIn: (petId) => request(`/pets/${petId}/check-ins/latest`),
  saveCheckIn: (petId, payload) => request(`/pets/${petId}/check-ins`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteCheckIn: (petId, checkInId) => request(`/pets/${petId}/check-ins/${checkInId}`, { method: 'DELETE' }),
  listFoodLogs: (petId) => request(`/pets/${petId}/food-logs`),
  currentFood: (petId) => request(`/pets/${petId}/food-logs/current`),
  saveFoodLog: (petId, payload) => request(`/pets/${petId}/food-logs`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteFoodLog: (petId, foodLogId) => request(`/pets/${petId}/food-logs/${foodLogId}`, { method: 'DELETE' }),
  listPatterns: (petId) => request(`/pets/${petId}/patterns`),
  setPatternStatus: (petId, patternKey, status) =>
    request(`/pets/${petId}/patterns/${encodeURIComponent(patternKey)}/status`, {
      method: 'POST',
      body: JSON.stringify({ status })
    }),
  patternTimeline: (petId, patternId) =>
    request(`/pets/${petId}/patterns/${encodeURIComponent(patternId)}/timeline`),
  patternTimelineByType: (petId, type) =>
    request(`/pets/${petId}/patterns/timeline?type=${encodeURIComponent(type)}`),
  vetSummary: (petId, days) =>
    request(`/pets/${petId}/vet-summary${days ? `?days=${days}` : ''}`),
  parseDailyNote: (payload) =>
    request('/ai/parse-daily-note', { method: 'POST', body: JSON.stringify(payload) }),
  listPhotos: (petId) => request(`/pets/${petId}/photos`),
  // Multipart upload: must NOT set Content-Type so the browser adds the boundary,
  // so this bypasses the JSON `request` helper.
  uploadPhoto: async (petId, formData) => {
    const response = await fetch(`${API_BASE}/pets/${petId}/photos`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Accept-Language': getLang() },
      body: formData
    })
    if (!response.ok) {
      if (response.status === 401 && onUnauthorized) onUnauthorized()
      const text = await response.text()
      throw new Error(text || `Upload failed: ${response.status}`)
    }
    return response.json()
  },
  deletePhoto: (petId, photoId) => request(`/pets/${petId}/photos/${photoId}`, { method: 'DELETE' }),
  listFoodTrials: (petId) => request(`/pets/${petId}/food-trials`),
  createFoodTrial: (petId, payload) => request(`/pets/${petId}/food-trials`, { method: 'POST', body: JSON.stringify(payload) }),
  reintroduceTrial: (petId, trialId, payload) =>
    request(`/pets/${petId}/food-trials/${trialId}/reintroduce`, { method: 'POST', body: JSON.stringify(payload ?? {}) }),
  completeTrial: (petId, trialId) => request(`/pets/${petId}/food-trials/${trialId}/complete`, { method: 'POST' }),
  abandonTrial: (petId, trialId) => request(`/pets/${petId}/food-trials/${trialId}/abandon`, { method: 'POST' }),
  deleteFoodTrial: (petId, trialId) => request(`/pets/${petId}/food-trials/${trialId}`, { method: 'DELETE' }),
  getRecap: (petId, days) => request(`/pets/${petId}/recap${days ? `?days=${days}` : ''}`),
  listMedications: (petId) => request(`/pets/${petId}/medications`),
  createMedication: (petId, payload) => request(`/pets/${petId}/medications`, { method: 'POST', body: JSON.stringify(payload) }),
  stopMedication: (petId, medId) => request(`/pets/${petId}/medications/${medId}/stop`, { method: 'POST' }),
  deleteMedication: (petId, medId) => request(`/pets/${petId}/medications/${medId}`, { method: 'DELETE' }),
  getVetShare: (petId) => request(`/pets/${petId}/share`),
  createVetShare: (petId) => request(`/pets/${petId}/share`, { method: 'POST' }),
  revokeVetShare: (petId) => request(`/pets/${petId}/share`, { method: 'DELETE' }),
  listCaregivers: (petId) => request(`/pets/${petId}/caregivers`),
  inviteCaregiver: (petId, email) => request(`/pets/${petId}/caregivers/invite`, { method: 'POST', body: JSON.stringify({ email }) }),
  removeCaregiver: (petId, ownerId) => request(`/pets/${petId}/caregivers/${ownerId}`, { method: 'DELETE' }),
  cancelInvite: (petId, inviteId) => request(`/pets/${petId}/invites/${inviteId}`, { method: 'DELETE' }),
  leavePet: (petId) => request(`/pets/${petId}/caregivers/me`, { method: 'DELETE' }),
  myInvites: () => request('/invites'),
  acceptInvite: (inviteId) => request(`/invites/${inviteId}/accept`, { method: 'POST' }),
  declineInvite: (inviteId) => request(`/invites/${inviteId}/decline`, { method: 'POST' }),
  exportMyData: () => request('/account/export'),
  deleteAccount: () => request('/account', { method: 'DELETE' }),
  // Token goes in a header, not the URL, so it stays out of server/access logs.
  sharedVetSummary: (token) => request('/shared/vet-summary', { headers: { 'X-Share-Token': token } }),
  seedDemo: () => request('/dev/seed', { method: 'POST' })
}
