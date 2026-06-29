const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {})
    },
    ...options
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed: ${response.status}`)
  }

  if (response.status === 204) return null
  return response.json()
}

export const api = {
  listPets: () => request('/pets'),
  createPet: (payload) => request('/pets', { method: 'POST', body: JSON.stringify(payload) }),
  getOverview: (petId) => request(`/pets/${petId}/overview`),
  listCheckIns: (petId) => request(`/pets/${petId}/check-ins`),
  latestCheckIn: (petId) => request(`/pets/${petId}/check-ins/latest`),
  saveCheckIn: (petId, payload) => request(`/pets/${petId}/check-ins`, { method: 'POST', body: JSON.stringify(payload) }),
  listFoodLogs: (petId) => request(`/pets/${petId}/food-logs`),
  currentFood: (petId) => request(`/pets/${petId}/food-logs/current`),
  saveFoodLog: (petId, payload) => request(`/pets/${petId}/food-logs`, { method: 'POST', body: JSON.stringify(payload) }),
  listPatterns: (petId) => request(`/pets/${petId}/patterns`),
  seedDemo: () => request('/dev/seed', { method: 'POST' })
}
