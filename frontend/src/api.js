import axios from 'axios'

// Invariant: VITE_API_BASE est un chemin relatif (ex: "/api")
const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '')
const instance = axios.create({ baseURL: `${API_BASE}/` })

function getAccess(){ return localStorage.getItem('access') }
function setTokens({ access, refresh }){ localStorage.setItem('access', access); localStorage.setItem('refresh', refresh) }
function clearTokens(){ localStorage.removeItem('access'); localStorage.removeItem('refresh') }

instance.interceptors.request.use((config) => {
  const token = getAccess()
  if (token) {
    if (config.headers?.set) config.headers.set('Authorization', `Bearer ${token}`)
    else config.headers = { ...(config.headers||{}), Authorization: `Bearer ${token}` }
  }
  return config
})

// Auto-refresh sur 401 si un refresh token est présent
let refreshing = null
instance.interceptors.response.use(
  (r) => r,
  async (error) => {
    const status = error?.response?.status
    const original = error?.config
    if (status === 401 && !original?._retry) {
      const refresh = localStorage.getItem('refresh')
      if (!refresh) { clearTokens(); return Promise.reject(error) }
      try {
        if (!refreshing) {
          refreshing = instance.post('auth/jwt/refresh/', { refresh })
        }
        const { data } = await refreshing
        refreshing = null
        if (!data?.access) { clearTokens(); return Promise.reject(error) }
        setTokens({ access: data.access, refresh })
        original._retry = true
        original.headers = original.headers || {}
        if (original.headers.set) original.headers.set('Authorization', `Bearer ${data.access}`)
        else original.headers.Authorization = `Bearer ${data.access}`
        return instance.request(original)
      } catch (e) {
        refreshing = null
        clearTokens()
        return Promise.reject(error)
      }
    }
    return Promise.reject(error)
  }
)

export const api = {
  auth: {
    login: async (username, password) => {
      const { data } = await instance.post('auth/jwt/create/', { username, password })
      setTokens(data)
      return data
    },
    logout: () => {
      clearTokens()
      window.dispatchEvent(new Event('storage'))
    }
  },
  calendars: {
    list: async () => (await instance.get('calendars/')).data,
    create: async (payload) => (await instance.post('calendars/', payload)).data,
    update: async (id, payload) => (await instance.patch(`calendars/${id}/`, payload)).data,
    remove: async (id) => (await instance.delete(`calendars/${id}/`)).data,
  },
  events: {
    list: async () => (await instance.get('events/')).data,
    create: async (payload) => (await instance.post('events/', payload)).data,
    update: async (id, payload) => (await instance.put(`events/${id}/`, payload)).data,
    remove: async (id) => (await instance.delete(`events/${id}/`)).data,
  }
}
