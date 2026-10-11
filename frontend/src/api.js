const TOKEN_KEY = 'ares_token'
const USER_KEY = 'ares_user'

export function storeSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    const user = raw ? JSON.parse(raw) : null
    if (!localStorage.getItem(TOKEN_KEY)) return null
    return user
  } catch {
    return null
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

function extractMessage(data, status) {
  if (data && typeof data === 'object') {
    if (typeof data.detail === 'string') return data.detail
    if (typeof data.message === 'string') return data.message
    const parts = Object.values(data)
      .flat()
      .filter((part) => typeof part === 'string')
    if (parts.length) return parts.join(' ')
  }
  return `Ошибка сервера (${status}).`
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = {}

  const token = localStorage.getItem(TOKEN_KEY)
  if (token) headers.Authorization = `Token ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res
  try {
    res = await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Нет связи с сервером. Проверьте, что бэкенд запущен.')
  }

  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok) {
    throw new Error(extractMessage(data, res.status))
  }
  return data
}
