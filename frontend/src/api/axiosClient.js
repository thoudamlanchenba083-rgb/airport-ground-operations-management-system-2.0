import axios from 'axios'
import { API_BASE_URL } from './config'

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  // Send/receive the httpOnly JWT cookies (and read the CSRF cookie) on
  // every request - required now that tokens live in cookies, not JS.
  withCredentials: true,
  // Reads the 'csrftoken' cookie and sends it as 'X-CSRFToken' automatically
  // on unsafe (state-changing) requests, matching Django's CSRF cookie/header
  // names. withXSRFToken is needed so this also applies cross-origin
  // (frontend/backend on different domains), not just same-origin.
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
  withXSRFToken: true,
  // Without this, a slow/hung backend call (e.g. the AI dashboard endpoint
  // waiting on an external weather API) leaves the UI spinning forever with
  // no feedback. 20s is generous enough for real requests but still bails
  // out instead of hanging indefinitely.
  timeout: 20000,
})

// Plain axios instance for the refresh call itself, so it never
// re-triggers this same interceptor. Needs the same cookie/CSRF config
// since the refresh token now lives in a cookie too.
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
  withXSRFToken: true,
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
      await refreshClient.post('/token/refresh/')
      // New access/refresh cookies were set by the Set-Cookie response
      // headers already - nothing to store manually.
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