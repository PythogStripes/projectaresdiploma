import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'

const TABS = [
  { id: 'overall', title: 'Общий зачёт' },
  { id: 'chess', title: 'Шахматы' },
  { id: 'tictactoe', title: 'Крестики-нолики' },
]

export default function Leaderboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('overall')
  const [error, setError] = useState('')

  useEffect(() => {
    api('/api/leaderboard/')
      .then(setData)
      .catch((e) => setError(e.message))
  }, [])

  const rows = data ? data[tab] : []

  return (
    <main className="page">
      <h1 className="page-title">Лидерборд</h1>
      <p className="muted">
        Очки: победа — 3, ничья — 1, поражение — 0. Учитываются партии против
        компьютера, сыгранные под своим аккаунтом.
      </p>

      <div className="seg tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'seg-btn active' : 'seg-btn'}
            onClick={() => setTab(t.id)}
          >
            {t.title}
          </button>
        ))}
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="card table-card">
        {data && rows.length === 0 ? (
          <p className="muted center pad">
            Пока никто не играл. {user ? 'Сыграйте партию — и вы первый!' : (
              <>Сыграйте партию — и вы первый! <Link to="/register">Регистрация</Link></>
            )}
          </p>
        ) : (
          <table className="lb-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Игрок</th>
                <th>Игры</th>
                <th>Победы</th>
                <th>Ничьи</th>
                <th>Поражения</th>
                <th>Очки</th>
              </tr>
            </thead>
            <tbody>
              {(rows || []).map((r) => (
                <tr key={r.username} className={user?.username === r.username ? 'me-row' : ''}>
                  <td>
                    <span className={`place p${r.place <= 3 ? r.place : 'rest'}`}>{r.place}</span>
                  </td>
                  <td className="lb-name">{r.username}</td>
                  <td>{r.games}</td>
                  <td className="good">{r.wins}</td>
                  <td>{r.draws}</td>
                  <td className="bad">{r.losses}</td>
                  <td><b>{r.points}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  )
}
