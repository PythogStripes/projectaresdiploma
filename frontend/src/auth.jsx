// «Круг» данных об аккаунте, доступный всем компонентам.
// Держит текущего пользователя и умеет логинить/регистрировать/выходить.
import { createContext, useContext, useState } from 'react'
import { api, clearSession, getStoredUser, storeSession } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Начинаем с пользователя, сохранённого в браузере (если он там есть),
  // чтобы после перезагрузки страницы человек оставался «внутри».
  const [user, setUser] = useState(getStoredUser)

  // Общая процедура: запомнить токен+пользователя и обновить состояние.
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
    // Сначала пробуем сообщить серверу (чтобы он удалил токен).
    // Если сети нет — не страшно, просто чистим локальную сессию.
    try {
      await api('/api/auth/logout/', { method: 'POST' })
    } catch {
    }
    clearSession()
    setUser(null)
  }

  // Обновить данные пользователя (например, сменилась тема).
  // Токен уже на месте, поэтому просто перезаписываем объект пользователя.
  const updateUser = (userData) => {
    storeSession(localStorage.getItem('ares_token'), userData)
    setUser(userData)
  }

  // Отдаём наружу всё, чем могут пользоваться компоненты.
  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// Удобный хук: `const { user } = useAuth()` в любом компоненте.
export function useAuth() {
  return useContext(AuthContext)
}
