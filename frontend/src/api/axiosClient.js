import axios from 'axios'

const axiosClient = axios.create({
  baseURL: 'http://localhost:8000/api',
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