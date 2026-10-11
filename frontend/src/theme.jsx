// Управление темами оформления.
// Тема выбирается в профиле, хранится в аккаунте на сервере и применяется
// ко всему сайту. Гостям (без аккаунта) всегда показывается «Оригинал».
import { createContext, useCallback, useContext, useLayoutEffect } from 'react'
import { api } from './api'
import { useAuth } from './auth'

const ThemeContext = createContext(null)

// Список доступных тем. swatch — цветной кружок для кнопок выбора.
export const THEMES = [
  { id: 'classic', title: 'Оригинал', hint: 'чёрный и белый', swatch: '#f2f2f2' },
  { id: 'sapphire', title: 'Сапфир', hint: 'тёмный сапфир', swatch: '#4f8ef7' },
  { id: 'gold', title: 'Золото', hint: 'тёмное золото', swatch: '#d4af37' },
]

// Тема по умолчанию — для гостей и на случай неизвестного значения.
const DEFAULT_THEME = 'classic'

export function ThemeProvider({ children }) {
  const { user, updateUser } = useAuth()

  // Какую тему показывать: если у пользователя есть валидная тема — её,
  // иначе тему по умолчанию.
  const theme = THEMES.some((t) => t.id === user?.theme) ? user.theme : DEFAULT_THEME

  // Вешаем тему на <html data-theme="..."> — от неё зависит вся палитра в CSS.
  // useLayoutEffect срабатывает до отрисовки, чтобы не «мигать» старой темой.
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.removeItem('ares_theme') // чистим старый локальный ключ, если был
  }, [theme])

  // Смена темы. Сразу меняем интерфейс (оптимистично), затем сохраняем на сервере.
  const setTheme = useCallback(
    async (id) => {
      // Гостям тему менять нельзя, и неизвестную тему тоже игнорируем.
      if (!user || !THEMES.some((t) => t.id === id)) return
      const previous = user
      updateUser({ ...user, theme: id }) // мгновенно красим интерфейс
      try {
        // Сохраняем на сервере; ответ содержит актуального пользователя.
        updateUser(await api('/api/auth/me/', { method: 'PATCH', body: { theme: id } }))
      } catch {
        // Если сервер не принял — откатываемся к прежней теме.
        updateUser(previous)
      }
    },
    [user, updateUser],
  )

  // canChange — можно ли менять тему (только вошедшим).
  return (
    <ThemeContext.Provider value={{ theme, setTheme, canChange: Boolean(user) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
