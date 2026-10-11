import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/Header'
import { useAuth } from './auth'
import Home from './pages/Home'
import Chess from './pages/Chess'
import TicTacToe from './pages/TicTacToe'
import Leaderboard from './pages/Leaderboard'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import AdminPanel from './pages/AdminPanel'

function RequireAuth({ children, staffOnly = false }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  if (staffOnly && !user.is_staff) {
    return (
      <main className="page">
        <div className="card narrow">
          <h2>Доступ запрещён</h2>
          <p className="muted">Админ-панель доступна только администраторам сайта.</p>
        </div>
      </main>
    )
  }
  return children
}

export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chess" element={<Chess />} />
        <Route path="/tictactoe" element={<TicTacToe />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/profile"
          element={<RequireAuth><Profile /></RequireAuth>}
        />
        <Route
          path="/admin-panel"
          element={<RequireAuth staffOnly><AdminPanel /></RequireAuth>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <footer className="site-footer">
        <span>Арес — Настольный Сайт-Хаб · шахматы и крестики-нолики · {new Date().getFullYear()}</span>
      </footer>
    </div>
  )
}
