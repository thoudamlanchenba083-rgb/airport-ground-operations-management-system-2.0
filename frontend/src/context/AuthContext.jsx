import { createContext, useContext, useState } from 'react'
import axiosClient from '../api/axiosClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })

  const login = async (username, password) => {
    const res = await axiosClient.post('/token/', { username, password })
    localStorage.setItem('access_token', res.data.access)
    localStorage.setItem('refresh_token', res.data.refresh)

    const profileRes = await axiosClient.get('/accounts/profile/')
    localStorage.setItem('user', JSON.stringify(profileRes.data))
    setUser(profileRes.data)
    return profileRes.data
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
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