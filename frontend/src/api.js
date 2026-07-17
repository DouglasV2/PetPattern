import { getLang } from './i18n'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'
const MOBILE_SESSION_KEY = 'petpattern.mobileSessionToken'

function isNativeApp() {
  return Boolean(globalThis.Capacitor?.isNativePlatform?.())
}

function getMobileSessionToken() {
  if (!isNativeApp()) return null
  try {
    return globalThis.localStorage?.getItem(MOBILE_SESSION_KEY) || null
  } catch (err) {
    return null
  }
}

function saveMobileSessionToken(token) {
  if (!isNativeApp() || !token) return
  try {
    globalThis.localStorage?.setItem(MOBILE_SESSION_KEY, token)
  } catch (err) {
    // If storage is unavailable, the next authenticated request will simply 401.
  }
}

function clearMobileSessionToken() {
  try {
    globalThis.localStorage?.removeItem(MOBILE_SESSION_KEY)
  } catch (err) {
    // ignore
  }
}

function mobileHeaders() {
  if (!isNativeApp()) return {}
  const token = getMobileSessionToken()
  return {
    'X-PetPattern-Client': 'mobile',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}

// Called whenever the API returns 401, so the app can drop back to the login
// screen if a session expires mid-use.
let onUnauthorized = null
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

// A network/offline failure of fetch() throws a bare TypeError ("Failed to fetch"). Wrap it in a
// clear, identifiable error so callers can show a graceful "you appear to be offline" state
// instead of a raw stack — mobile connections drop often.
export class NetworkError extends Error {
  constructor() {
    super('You appear to be offline. Check your connection and try again.')
    this.name = 'NetworkError'
    this.isNetworkError = true
  }
}

async function request(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      // Use include rather than same-origin so the web app keeps its HttpOnly
      // cookie behavior, while Capacitor can still call a remote production API.
      credentials: 'include',
      // Spread options FIRST so a caller's headers can never clobber the merged
      // headers object below (sharedVetSummary passes X-Share-Token and must still
      // send Accept-Language).
      ...options,
      headers: {
        'Content-Type': 'application/json',
        // Backend-generated text (patterns, vet summary, recap…) follows the UI language.
        'Accept-Language': getLang(),
        ...mobileHeaders(),
        ...(options.headers ?? {})
      }
    })
  } catch (networkErr) {
    throw new NetworkError()
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearMobileSessionToken()
      if (onUnauthorized) onUnauthorized()
    }
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

  const sessionToken = response.headers.get('X-Session-Token')
  if (sessionToken) saveMobileSessionToken(sessionToken)
  if (path === '/auth/logout' || (path === '/account' && method === 'DELETE')) clearMobileSessionToken()

  // 204/202 carry no body (202 is the analytics ingest's "accepted"); don't try to parse them.
  if (response.status === 204 || response.status === 202) return null
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
    let response
    try {
      response = await fetch(`${API_BASE}/pets/${petId}/photos`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Accept-Language': getLang(), ...mobileHeaders() },
        body: formData
      })
    } catch (networkErr) {
      throw new NetworkError()
    }
    if (!response.ok) {
      if (response.status === 401) {
        clearMobileSessionToken()
        if (onUnauthorized) onUnauthorized()
      }
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
  listActivities: (petId) => request(`/pets/${petId}/activities`),
  addActivity: (petId, payload) => request(`/pets/${petId}/activities`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteActivity: (petId, activityId) => request(`/pets/${petId}/activities/${activityId}`, { method: 'DELETE' }),
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
  // Internal, privacy-safe analytics ingest for client-known events. The server rejects
  // once-per-ref milestone types and unknown types, and strips any disallowed meta.
  trackEvent: (payload) => request('/analytics/events', { method: 'POST', body: JSON.stringify(payload) }),
  seedDemo: () => request('/dev/seed', { method: 'POST' }),
  seedCatDemo: () => request('/dev/seed-cat', { method: 'POST' }),
  seedRabbitDemo: () => request('/dev/seed-rabbit', { method: 'POST' })
}
