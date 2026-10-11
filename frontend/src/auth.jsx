import { createContext, useContext, useState } from 'react'
import { api, clearSession, getStoredUser, storeSession } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser)

  const applySession = (token, userData) => {
    storeSession(token, userData)
    setUser(userData)
  }

  const login = async (username, password) => {
    const data = await api('/api/auth/login/', {
      method: 'POST',
      body: { username, password },
    })
    applySession(data.token, data.user)
    return data.user
  }

  const register = async (payload) => {
    const data = await api('/api/auth/register/', { method: 'POST', body: payload })
    applySession(data.token, data.user)
    return data.user
  }

  const logout = async () => {
    try {
      await api('/api/auth/logout/', { method: 'POST' })
    } catch {
      /* токен уже недействителен — не страшно */
    }
    clearSession()
    setUser(null)
  }

  const updateUser = (userData) => {
    storeSession(localStorage.getItem('ares_token'), userData)
    setUser(userData)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
