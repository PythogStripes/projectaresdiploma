import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(username, password)
      navigate(location.state?.from || '/')
    } catch (err) {
      setError(err.message || 'Неверное имя пользователя или пароль.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page">
      <form className="card auth-card" onSubmit={onSubmit}>
        <h2>Вход</h2>
        <p className="muted">Войдите, чтобы попадать в лидерборд.</p>
        {error && <div className="alert" role="alert">{error}</div>}
        <label>
          Имя пользователя
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          Пароль
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button className="btn btn-primary big" disabled={busy}>
          {busy ? 'Входим…' : 'Войти'}
        </button>
        <p className="muted center">
          Нет аккаунта? <Link to="/register">Зарегистрируйтесь</Link>
        </p>
      </form>
    </main>
  )
}
