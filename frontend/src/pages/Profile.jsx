import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import { THEMES, useTheme } from '../theme'

// Страница профиля: данные игрока, выбор темы оформления, выход из аккаунта
// и личная статистика с последними партиями.
export default function Profile() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const [summary, setSummary] = useState(null)

  // Загружаем сводку по играм при открытии страницы.
  useEffect(() => {
    api('/api/auth/me/summary/').then(setSummary).catch(() => {})
  }, [])

  // Человекочитаемая роль: главный админ > админ сайта > обычный игрок.
  const role = user.is_superuser
    ? 'Главный администратор'
    : user.is_staff
      ? 'Администратор сайта'
      : 'Игрок'

  return (
    <main className="page">
      <h1 className="page-title">Профиль</h1>
      <div className="profile-layout">
        {/* Левая колонка: кто вы, тема, выход */}
        <div className="card">
          <h2>{user.username}</h2>
          <p className="muted">
            {role} · на сайте с {user.date_joined}
          </p>
          <h3>Тема оформления</h3>
          <div className="seg">
            {THEMES.map((t) => (
              <button
                key={t.id}
                className={theme === t.id ? 'seg-btn active' : 'seg-btn'}
                onClick={() => setTheme(t.id)}
              >
                <span className="swatch" style={{ background: t.swatch }} />
                {t.title}
              </button>
            ))}
          </div>
          <p className="muted small-note">
            Тема меняет цвет рамок и шрифта; фон остаётся чёрным. Выбор хранится
            в вашем аккаунте и применяется на любом устройстве после входа.
          </p>
          <div className="btn-row">
            <button className="btn btn-outline" onClick={logout}>Выйти из аккаунта</button>
          </div>
        </div>

        {/* Правая колонка: статистика */}
        <div className="card">
          <h3>Моя статистика</h3>
          {!summary ? (
            <p className="muted">Загружаем…</p>
          ) : (
            <>
              <div className="stat-grid">
                {Object.entries(summary.games).map(([code, g]) => (
                  <div key={code} className="stat-box">
                    <h4>{g.title}</h4>
                    <div>Игр: <b>{g.total}</b></div>
                    <div className="good">Побед: <b>{g.wins}</b></div>
                    <div>Ничьих: <b>{g.draws}</b></div>
                    <div className="bad">Поражений: <b>{g.losses}</b></div>
                    <div className="stat-points">Очки: <b>{g.points}</b></div>
                  </div>
                ))}
              </div>
              {summary.recent.length > 0 && (
                <>
                  <h3>Последние партии</h3>
                  <table className="lb-table">
                    <thead>
                      <tr><th>Игра</th><th>Результат</th><th>Режим</th><th>Сложность</th><th>Ходов</th><th>Дата</th></tr>
                    </thead>
                    <tbody>
                      {summary.recent.map((r, i) => (
                        <tr key={i}>
                          <td>{r.game}</td>
                          <td className={r.result === 'Победа' ? 'good' : r.result === 'Поражение' ? 'bad' : ''}>
                            {r.result}
                          </td>
                          <td>{r.mode}</td>
                          <td>{r.difficulty ?? '—'}</td>
                          <td>{r.moves ?? '—'}</td>
                          <td>{r.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
