import { Link } from 'react-router-dom'
import Logo from '../components/Logo'

// Главная страница-визитка: логотип, описание и две большие кнопки-входа в игры.
export default function Home() {
  return (
    <main className="page">
      <section className="hero card">
        <div className="hero-logo"><Logo size={200} /></div>
        <h1 className="hero-title">АРЕС</h1>
        <p className="hero-sub">Настольный Сайт-Хаб</p>
        <p className="hero-text">
          Дипломный проект на Django 5.2 + React. Два классических настольных сражения —
          шахматы и крестики-нолики, честный лидерборд, учётная система и панель
          администратора. Тема оформления выбирается в профиле.
        </p>
        <div className="hero-actions">
          <Link to="/chess" className="btn btn-primary big">Играть в шахматы</Link>
          <Link to="/tictactoe" className="btn btn-outline big">Играть в крестики-нолики</Link>
        </div>
      </section>
    </main>
  )
}
