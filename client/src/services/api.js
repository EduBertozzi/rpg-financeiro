import axios from 'axios'
import { requestEnded, requestStarted } from './loading'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'
})

api.interceptors.request.use((config) => {
  requestStarted()
  try {
    const storage = localStorage.getItem('rpg-storage')
    if (storage) {
      const { state } = JSON.parse(storage)
      if (state?.token) config.headers.Authorization = `Bearer ${state.token}`
    }
  } catch (e) {
    console.error('Erro ao ler token:', e)
  }
  return config
})

api.interceptors.response.use(
  (response) => {
    requestEnded()
    return response
  },
  (error) => {
    requestEnded()
    if (error.response?.status === 401) {
      localStorage.removeItem('rpg-storage')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api