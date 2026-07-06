import axios from 'axios'

const axiosClient = axios.create({
  baseURL: 'http://localhost:8000/api',
  // Without this, a slow/hung backend call (e.g. the AI dashboard endpoint
  // waiting on an external weather API) leaves the UI spinning forever with
  // no feedback. 20s is generous enough for real requests but still bails
  // out instead of hanging indefinitely.
  timeout: 20000,
})

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Plain axios instance for the refresh call itself, so it never
// carries a (possibly expired) Authorization header and never
// re-triggers this same interceptor.
const refreshClient = axios.create({
  baseURL: 'http://localhost:8000/api',
})

let isRefreshing = false
let pendingQueue = []

const resolvePending = (error, token = null) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  pendingQueue = []
}

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // The backend's custom_exception_handler wraps every DRF error response
    // as { error: true, status_code, message: <the real DRF error body> }.
    // Every component across the app (FlightsTab, GatesTab, etc.) was
    // written expecting the raw DRF shape directly on error.response.data
    // (e.g. { flight_number: ["..."] }), so without this, every validation
    // error in the app rendered as literal "true 400 [object Object]"
    // instead of the actual message. Unwrap it once, here, so every
    // existing err.response.data usage across the app just works.
    if (error.response?.data && typeof error.response.data === 'object' && 'message' in error.response.data && 'status_code' in error.response.data) {
      error.response.data = error.response.data.message
    }

    const originalRequest = error.config
    const status = error.response?.status
    const isAuthEndpoint =
      originalRequest?.url?.includes('/token/') // login or refresh call itself

    if (status !== 401 || isAuthEndpoint || originalRequest._retry) {
      return Promise.reject(error)
    }

    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      // Queue this request until the in-flight refresh finishes.
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject })
      }).then((newToken) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return axiosClient(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const { data } = await refreshClient.post('/token/refresh/', {
        refresh: refreshToken,
      })
      localStorage.setItem('access_token', data.access)
      // ROTATE_REFRESH_TOKENS is on server-side, so store the new refresh token too.
      if (data.refresh) {
        localStorage.setItem('refresh_token', data.refresh)
      }
      resolvePending(null, data.access)
      originalRequest.headers.Authorization = `Bearer ${data.access}`
      return axiosClient(originalRequest)
    } catch (refreshError) {
      resolvePending(refreshError, null)
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export default axiosClient