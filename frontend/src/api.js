// Тонкая обёртка над fetch для общения с бэкендом.
// Сама добавляет токен к запросам, аккуратно разбирает ошибки сервера
// и хранит текущую сессию (токен + данные пользователя) в localStorage.

// Ключи, под которыми сессия лежит в localStorage браузера.
const TOKEN_KEY = 'ares_token'
const USER_KEY = 'ares_user'

// Сохранить токен и пользователя после входа/регистрации.
export function storeSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user)) // объект храним как строку
}

// Достать текущего пользователя из localStorage.
// Если токена нет — значит сессии нет, возвращаем null.
export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    const user = raw ? JSON.parse(raw) : null
    if (!localStorage.getItem(TOKEN_KEY)) return null
    return user
  } catch {
    // Если данные повреждены — ведём себя как «никто не вошёл».
    return null
  }
}

// Забыть сессию (используется при выходе).
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

// Достать из ответа сервера понятное сообщение об ошибке.
function extractMessage(data, status) {
  if (data && typeof data === 'object') {
    // DRF часто присылает { detail: "..." } — берём как есть.
    if (typeof data.detail === 'string') return data.detail
    if (typeof data.message === 'string') return data.message
    // А бывает — { поле: ["ошибка1", "ошибка2"] }. Склеиваем в одну строку.
    const parts = Object.values(data)
      .flat()
      .filter((part) => typeof part === 'string')
    if (parts.length) return parts.join(' ')
  }
  // Если ничего не разобрали — показываем код ошибки.
  return `Ошибка сервера (${status}).`
}

// Универсальная функция запроса к API.
export async function api(path, { method = 'GET', body } = {}) {
  const headers = {}

  // Если пользователь вошёл — прикрепляем токен к каждому запросу.
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) headers.Authorization = `Token ${token}`
  // Когда есть тело — говорим, что шлём JSON.
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res
  try {
    res = await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    // fetch «упал» — скорее всего, сервер просто не запущен.
    throw new Error('Нет связи с сервером. Проверьте, что бэкенд запущен.')
  }

  // Разбираем тело ответа. Не всегда это JSON — тогда оставляем null.
  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  // Если ответ не 2xx — бросаем понятную ошибку.
  if (!res.ok) {
    throw new Error(extractMessage(data, res.status))
  }
  return data
}
