import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE
const instance = axios.create({ baseURL: `${API_BASE}/api/` })

function getAccess() { return localStorage.getItem('access') }
function setTokens({ access, refresh }) { localStorage.setItem('access', access); localStorage.setItem('refresh', refresh) }

instance.interceptors.request.use((config) => {
  const token = getAccess()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const api = {
  auth: {
    login: async (username, password) => {
      const { data } = await instance.post('auth/jwt/create/', { username, password })
      setTokens(data)
      return data
    }
  },
  calendars: {
    list: async () => (await instance.get('calendars/')).data,
    create: async (payload) => (await instance.post('calendars/', payload)).data,
  },
  events: {
    list: async () => (await instance.get('events/')).data,
    create: async (payload) => (await instance.post('events/', payload)).data,
    update: async (id, payload) => (await instance.put(`events/${id}/`, payload)).data,
    remove: async (id) => (await instance.delete(`events/${id}/`)).data,
  }
}
