import axios from 'axios'
import { API_BASE_URL } from './config'

// Browsers never let JS on one origin read a cookie set by a different
// origin - so when the frontend (Vercel) and API (Railway) are on
// different domains, axios's built-in xsrfCookieName/xsrfHeaderName
// mechanism can never find the 'csrftoken' cookie to echo back, even
// though withCredentials correctly sends it to the server automatically.
// Instead, the backend hands the token to us directly in the JSON body of
// /token/, /token/refresh/, and /accounts/csrf/ (see accounts/views.py),
// and we keep it here in memory and attach it manually.
let csrfToken = null
export const setCsrfToken = (token) => {
  csrfToken = token
}

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  // Send/receive the httpOnly JWT cookies on every request - required now
  // that tokens live in cookies, not JS.
  withCredentials: true,
  // Without this, a slow/hung backend call (e.g. the AI dashboard endpoint
  // waiting on an external weather API) leaves the UI spinning forever with
  // no feedback. 20s is generous enough for real requests but still bails
  // out instead of hanging indefinitely.
  timeout: 20000,
})

axiosClient.interceptors.request.use((requestConfig) => {
  if (csrfToken) {
    requestConfig.headers['X-CSRFToken'] = csrfToken
  }
  return requestConfig
})

// Plain axios instance for the refresh call itself, so it never
// re-triggers this same interceptor. Needs the same cookie config since
// the refresh token now lives in a cookie too.
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
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

    // The cookie carries the refresh token automatically - nothing to read
    // or check here manually. If there's no valid refresh cookie, the
    // request below will simply come back 401 and we fall through to the
    // catch block, same as before.
    if (isRefreshing) {
      // Queue this request until the in-flight refresh finishes.
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject })
      }).then(() => axiosClient(originalRequest))
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const refreshRes = await refreshClient.post('/token/refresh/')
      // New access/refresh cookies were set by the Set-Cookie response
      // headers already - nothing to store manually for those. The CSRF
      // token rotates too though, and that one we DO need to store
      // manually (see the top of this file for why).
      if (refreshRes.data?.csrftoken) {
        setCsrfToken(refreshRes.data.csrftoken)
      }
      resolvePending(null)
      return axiosClient(originalRequest)
    } catch (refreshError) {
      resolvePending(refreshError)
      window.location.href = '/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export default axiosClient