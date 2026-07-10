import { createContext, useContext, useState } from 'react'
import axiosClient from '../api/axiosClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })

  const login = async (username, password) => {
    // The access/refresh tokens are set as httpOnly cookies by the server -
    // never touched here, so frontend JS never has direct access to them.
    await axiosClient.post('/token/', { username, password })

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