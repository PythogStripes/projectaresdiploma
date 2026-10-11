import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

// Страница регистрации. Сервер проверяет все правила, но совпадение паролей
// проверяем и здесь — чтобы не гонять запрос зря.
export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  // Все поля формы держим в одном объекте — удобно передавать на сервер.
  const [form, setForm] = useState({ username: '', email: '', password: '', password2: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Фабрика обработчиков onChange: set('username') вернёт функцию для нужного поля.
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    // Быстрая проверка до запроса: пароли должны совпасть.
    if (form.password !== form.password2) {
      setError('Пароли не совпадают.')
      return
    }
    setBusy(true)
    try {
      await register(form)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Не удалось зарегистрироваться.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page">
      <form className="card auth-card" onSubmit={onSubmit}>
        <h2>Регистрация</h2>
        <p className="muted">
          Минимум 6 символов в пароле. Роли «администратор» выдаёт только главный админ.
        </p>
        {error && <div className="alert" role="alert">{error}</div>}
        <label>
          Имя пользователя
          <input value={form.username} onChange={set('username')} autoComplete="username" required />
        </label>
        <label>
          E-mail (необязательно)
          <input type="email" value={form.email} onChange={set('email')} autoComplete="email" />
        </label>
        <label>
          Пароль
          <input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" required />
        </label>
        <label>
          Повторите пароль
          <input type="password" value={form.password2} onChange={set('password2')} autoComplete="new-password" required />
        </label>
        <button className="btn btn-primary big" disabled={busy}>
          {busy ? 'Создаём аккаунт…' : 'Создать аккаунт'}
        </button>
        <p className="muted center">
          Уже есть аккаунт? <Link to="/login">Войдите</Link>
        </p>
      </form>
    </main>
  )
}
