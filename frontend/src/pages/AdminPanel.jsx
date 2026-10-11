import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'

// Админ-панель сайта. Показывает статистику и позволяет управлять
// пользователями. Какие действия доступны, зависит от роли:
// админ сайта видит всё, но выдавать/снимать админов и удалять людей
// может только главный администратор.
export default function AdminPanel() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [note, setNote] = useState('')  // зелёная плашка «готово»
  const [error, setError] = useState('') // красная плашка «ошибка»

  // Загружаем сразу два набора данных: пользователей и статистику.
  const load = useCallback(async () => {
    try {
      const [u, s] = await Promise.all([
        api('/api/panel/users/'),
        api('/api/panel/stats/'),
      ])
      setUsers(u.users)
      setStats(s)
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }, [])

  // Грузим при первом появлении страницы.
  useEffect(() => {
    load()
  }, [load])

  // Показать короткое сообщение и убрать его через 4 секунды.
  const flash = (msg) => {
    setNote(msg)
    setTimeout(() => setNote(''), 4000)
  }

  // Выдать/снять права администратора, затем обновить список.
  const setStaff = async (target, flag) => {
    try {
      const res = await api(`/api/panel/users/${target.id}/staff/`, {
        method: 'POST',
        body: { is_staff: flag },
      })
      flash(res.detail)
      await load()
    } catch (e) {
      flash(e.message)
    }
  }

  // Удалить пользователя (с подтверждением), затем обновить список.
  const removeUser = async (target) => {
    if (!window.confirm(`Удалить пользователя «${target.username}»?`)) return
    try {
      const res = await api(`/api/panel/users/${target.id}/delete/`, { method: 'POST' })
      flash(res.detail)
      await load()
    } catch (e) {
      flash(e.message)
    }
  }

  // Является ли текущий пользователь главным админом.
  const isSuper = user.is_superuser

  return (
    <main className="page">
      <h1 className="page-title">Админ-панель</h1>

      {note && <div className="alert ok">{note}</div>}
      {error && <div className="alert">{error}</div>}

      {/* Плитки со сводной статистикой */}
      {stats && (
        <div className="stat-grid wide">
          <div className="stat-box">
            <h4>Пользователей</h4>
            <div className="stat-big">{stats.users}</div>
          </div>
          <div className="stat-box">
            <h4>Админов сайта</h4>
            <div className="stat-big">{stats.admins}</div>
          </div>
          <div className="stat-box">
            <h4>Партий всего</h4>
            <div className="stat-big">{stats.games.overall.total}</div>
          </div>
          <div className="stat-box">
            <h4>Шахматы / Крестики</h4>
            <div className="stat-big">
              {stats.games.chess.total} / {stats.games.tictactoe.total}
            </div>
          </div>
        </div>
      )}

      {/* Таблица пользователей */}
      <div className="card table-card">
        <div className="card-head-row">
          <h3>Пользователи</h3>
          {/* Ссылку на Django-админку видит только главный админ */}
          {isSuper ? (
            <a className="btn btn-outline small" href="/admin/" target="_blank" rel="noreferrer">
              Открыть Django-админку
            </a>
          ) : (
            <span className="muted small-note">
              Выдавать/снимать администраторов может только главный админ.
            </span>
          )}
        </div>
        <table className="lb-table">
          <thead>
            <tr>
              <th>Имя</th>
              <th>E-mail</th>
              <th>Игр</th>
              <th>Роль</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="lb-name">
                  {u.username}
                  {u.is_you && <span className="muted"> (вы)</span>}
                </td>
                <td>{u.email || '—'}</td>
                <td>{u.games}</td>
                <td>
                  {u.is_superuser ? (
                    <span className="badge badge-super">главный админ</span>
                  ) : u.is_staff ? (
                    <span className="badge badge-staff">админ</span>
                  ) : (
                    <span className="badge">игрок</span>
                  )}
                </td>
                <td>
                  {/* Кнопки действий — только для главного админа и не для других суперов */}
                  {isSuper && !u.is_superuser && (
                    <div className="btn-row">
                      {u.is_staff ? (
                        <button className="btn btn-outline small" onClick={() => setStaff(u, false)}>
                          Снять админа
                        </button>
                      ) : (
                        <button className="btn btn-primary small" onClick={() => setStaff(u, true)}>
                          Назначить админом
                        </button>
                      )}
                      <button className="btn btn-danger small" onClick={() => removeUser(u)}>
                        Удалить
                      </button>
                    </div>
                  )}
                  {u.is_superuser && <span className="muted small-note">роль неизменна</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
