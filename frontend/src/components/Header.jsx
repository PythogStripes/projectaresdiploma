import { Link, NavLink, useNavigate } from 'react-router-dom'
import Logo from './Logo'
import { UserIcon } from './Icons'
import { useAuth } from '../auth'

// Шапка сайта: логотип, меню и блок справа (вход/профиль).
// Видна на всех страницах и подстраивается под роль пользователя.
export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const onLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        {/* Логотип + название ведут на главную */}
        <Link to="/" className="brand">
          <Logo size={52} />
          <span className="brand-text">
            <span className="brand-name">АРЕС</span>
            <span className="brand-sub">Настольный Сайт-Хуб</span>
          </span>
        </Link>

        {/* Основное меню. Ссылку на админ-панель видят только админы сайта. */}
        <nav className="main-nav">
          <NavLink to="/" end>Главная</NavLink>
          <NavLink to="/chess">Шахматы</NavLink>
          <NavLink to="/tictactoe">Крестики-нолики</NavLink>
          <NavLink to="/leaderboard">Лидерборд</NavLink>
          {user?.is_staff && <NavLink to="/admin-panel">Админ-панель</NavLink>}
        </nav>

        {/* Правая часть: кто вошёл и кнопка выхода — либо кнопки входа/регистрации */}
        <div className="header-actions">
          {user ? (
            <div className="user-zone">
              <Link to="/profile" className="user-chip">
                <UserIcon />
                <span>{user.username}</span>
                {user.is_superuser && <span className="badge badge-super">главный админ</span>}
                {!user.is_superuser && user.is_staff && <span className="badge badge-staff">админ</span>}
              </Link>
              <button className="btn btn-ghost" onClick={onLogout}>Выйти</button>
            </div>
          ) : (
            <div className="user-zone">
              <Link to="/login" className="btn btn-ghost">Войти</Link>
              <Link to="/register" className="btn btn-primary">Регистрация</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
