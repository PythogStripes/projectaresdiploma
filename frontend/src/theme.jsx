import { createContext, useCallback, useContext, useLayoutEffect } from 'react'
import { api } from './api'
import { useAuth } from './auth'

const ThemeContext = createContext(null)

/**
 * Темы меняют только цвет рамок и шрифта — фон всегда чёрный.
 * Тема хранится в аккаунте пользователя (поле user.theme на сервере),
 * поэтому менять её можно только в профиле, а у гостя всегда «Оригинал».
 */
export const THEMES = [
  { id: 'classic', title: 'Оригинал', hint: 'чёрный и белый', swatch: '#f2f2f2' },
  { id: 'sapphire', title: 'Сапфир', hint: 'тёмный сапфир', swatch: '#4f8ef7' },
  { id: 'gold', title: 'Золото', hint: 'тёмное золото', swatch: '#d4af37' },
]

const DEFAULT_THEME = 'classic'

export function ThemeProvider({ children }) {
  const { user, updateUser } = useAuth()

  const theme = THEMES.some((t) => t.id === user?.theme) ? user.theme : DEFAULT_THEME

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    // Старый ключ из версии, где тему можно было менять без аккаунта.
    localStorage.removeItem('ares_theme')
  }, [theme])

  const setTheme = useCallback(
    async (id) => {
      if (!user || !THEMES.some((t) => t.id === id)) return
      const previous = user
      updateUser({ ...user, theme: id }) // сразу показываем выбор
      try {
        updateUser(await api('/api/auth/me/', { method: 'PATCH', body: { theme: id } }))
      } catch {
        updateUser(previous) // сервер не принял — откатываем
      }
    },
    [user, updateUser],
  )

  return (
    <ThemeContext.Provider value={{ theme, setTheme, canChange: Boolean(user) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
