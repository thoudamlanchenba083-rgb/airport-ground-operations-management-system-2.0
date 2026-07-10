import { createContext, useContext, useState, useEffect } from 'react'
import axiosClient, { setCsrfToken } from '../api/axiosClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })

  // The CSRF token lives only in JS memory (see axiosClient.js), which is
  // wiped on every page refresh. A returning visitor still has valid auth
  // cookies at that point, just no CSRF token to submit with - so fetch a
  // fresh one on mount to cover that case (not just the login() case below).
  useEffect(() => {
    axiosClient.get('/accounts/csrf/')
      .then((res) => setCsrfToken(res.data?.csrftoken))
      .catch(() => {
        // Not logged in / network hiccup - fine, login() below will pick
        // up a token when the user actually logs in.
      })
  }, [])

  const login = async (username, password) => {
    // The access/refresh tokens are set as httpOnly cookies by the server -
    // never touched here, so frontend JS never has direct access to them.
    const loginRes = await axiosClient.post('/token/', { username, password })
    if (loginRes.data?.csrftoken) {
      setCsrfToken(loginRes.data.csrftoken)
    }

    const profileRes = await axiosClient.get('/accounts/profile/')
    // The cached profile itself isn't a credential, so it's fine in
    // localStorage - it's just used to avoid a flash of "logged out" UI
    // before the profile call above resolves on next page load.
    localStorage.setItem('user', JSON.stringify(profileRes.data))
    setUser(profileRes.data)
    return profileRes.data
  }

  const logout = async () => {
    try {
      // Blacklists the refresh token server-side and clears the httpOnly
      // cookies - these can't be cleared from JS directly since they're
      // httpOnly, so this call is required, not just a nice-to-have.
      await axiosClient.post('/accounts/logout/')
    } catch {
      // Even if the server call fails (e.g. already-expired token), still
      // clear local state below so the UI reflects a logged-out state.
    }
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}