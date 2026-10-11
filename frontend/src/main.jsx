import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './auth'
import { ThemeProvider } from './theme'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Роутер — чтобы работали ссылки вида /chess, /profile и т.д. */}
    <BrowserRouter>
      {/* Auth знает, кто сейчас вошёл; Theme — какую тему показывать.
          Theme внутри Auth, потому что берёт тему из данных пользователя. */}
      <AuthProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
