import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]

function winnerOf(board) {
  for (const line of LINES) {
    const [a, b, c] = line
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { player: board[a], line }
    }
  }
  return null
}

function minimax(board, isAiTurn, ai, hu, depth) {
  const win = winnerOf(board)
  if (win) return { score: win.player === ai ? 10 - depth : depth - 10 }
  if (board.every(Boolean)) return { score: 0 }

  const scores = []
  for (let i = 0; i < 9; i++) {
    if (board[i]) continue
    const next = [...board]
    next[i] = isAiTurn ? ai : hu
    const res = minimax(next, !isAiTurn, ai, hu, depth + 1)
    scores.push({ index: i, score: res.score })
  }
  if (isAiTurn) {
    return scores.reduce((best, s) => (s.score > best.score ? s : best))
  }
  return scores.reduce((best, s) => (s.score < best.score ? s : best))
}

function aiPick(board, ai, hu, level) {
  const free = board.map((v, i) => (v ? null : i)).filter((v) => v !== null)
  if (!free.length) return null

  if (level === 'easy' && Math.random() < 0.6) {
    return free[Math.floor(Math.random() * free.length)]
  }

  if (level === 'easy') {
    for (const i of free) {
      const t = [...board]; t[i] = ai
      if (winnerOf(t)) return i
    }
    for (const i of free) {
      const t = [...board]; t[i] = hu
      if (winnerOf(t)) return i
    }
    return free[Math.floor(Math.random() * free.length)]
  }

  if (level === 'medium' && Math.random() < 0.3) {
    return free[Math.floor(Math.random() * free.length)]
  }

  return minimax(board, true, ai, hu, 0).index
}

export default function TicTacToe() {
  const { user } = useAuth()
  const [mode, setMode] = useState('ai')
  const [level, setLevel] = useState('medium')
  const [playerMark, setPlayerMark] = useState('X')
  const [board, setBoard] = useState(Array(9).fill(null))
  const [turn, setTurn] = useState('X')
  const [win, setWin] = useState(null)
  const [note, setNote] = useState('')
  const [score, setScore] = useState({ w: 0, d: 0, l: 0 })

  const gameEnded = win !== null

  const reset = useCallback(
    (nextMode = mode, nextMark = playerMark, nextLevel = level) => {
      setBoard(Array(9).fill(null))
      setTurn('X')
      setWin(null)
      setNote('')
      setMode(nextMode)
      setPlayerMark(nextMark)
      setLevel(nextLevel)
    },
    [mode, playerMark, level],
  )

  useEffect(() => {
    if (!win || mode !== 'ai' || !user) return
    const result = win === 'draw' ? 'draw' : win.player === playerMark ? 'win' : 'loss'
    if (win !== 'draw') {
      setScore((s) => ({
        ...s,
        w: s.w + (result === 'win' ? 1 : 0),
        d: s.d + (result === 'draw' ? 1 : 0),
        l: s.l + (result === 'loss' ? 1 : 0),
      }))
    } else {
      setScore((s) => ({ ...s, d: s.d + 1 }))
    }
    api('/api/results/', {
      method: 'POST',
      body: {
        game: 'tictactoe', result, mode: 'ai',
        moves: board.filter(Boolean).length,
        difficulty: level,
      },
    })
      .then((res) => setNote(res.detail || 'Результат сохранён.'))
      .catch(() => setNote('Не удалось сохранить результат.'))
  }, [win])

  useEffect(() => {
    if (mode !== 'ai' || gameEnded || turn !== (playerMark === 'X' ? 'O' : 'X')) return
    const timer = setTimeout(() => {
      const ai = playerMark === 'X' ? 'O' : 'X'
      const idx = aiPick(board, ai, playerMark, level)
      if (idx === null || idx === undefined) return
      const next = [...board]
      next[idx] = ai
      const w = winnerOf(next)
      setBoard(next)
      if (w) setWin(w)
      else if (next.every(Boolean)) setWin('draw')
      else setTurn(playerMark)
    }, 420)
    return () => clearTimeout(timer)
  }, [board, turn, mode, playerMark, level, gameEnded])

  const onCell = (i) => {
    if (board[i] || gameEnded) return
    if (mode === 'ai' && turn !== playerMark) return
    const next = [...board]
    next[i] = turn
    const w = winnerOf(next)
    setBoard(next)
    if (w) setWin(w)
    else if (next.every(Boolean)) setWin('draw')
    else setTurn(turn === 'X' ? 'O' : 'X')
  }

  const status = (() => {
    if (win === 'draw') return 'Ничья!'
    if (win) {
      if (mode === 'ai') {
        return win.player === playerMark ? 'Победа!' : 'Компьютер победил.'
      }
      return `Победили ${win.player === 'X' ? 'крестики' : 'нолики'}!`
    }
    if (mode === 'ai' && turn !== playerMark) return 'Компьютер думает…'
    return `Ход: ${turn === 'X' ? '✕ крестики' : '◯ нолики'}`
  })()

  const marks = { X: '✕', O: '◯' }

  return (
    <main className="page">
      <h1 className="page-title">Крестики-нолики</h1>
      <div className="game-layout">
        <div className="board-zone">
          <div className="status-bar card">
            <span className={gameEnded ? 'status-final' : ''}>{status}</span>
            {note && <span className="save-note">{note}</span>}
          </div>
          <div className="ttt-wrap card">
            <div className="ttt-board">
              {board.map((cell, i) => (
                <button
                  key={i}
                  className={[
                    'ttt-cell',
                    cell === 'X' ? 'mark-x' : cell === 'O' ? 'mark-o' : '',
                    win && win !== 'draw' && win.line.includes(i) ? 'win-line' : '',
                  ].join(' ')}
                  onClick={() => onCell(i)}
                  aria-label={`Клетка ${i + 1}`}
                >
                  {cell ? marks[cell] : ''}
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="game-side">
          <div className="card controls">
            <h3>Новая партия</h3>
            <div className="seg">
              <button
                className={mode === 'ai' ? 'seg-btn active' : 'seg-btn'}
                onClick={() => reset('ai', playerMark, level)}
              >
                Против компьютера
              </button>
              <button
                className={mode === 'hotseat' ? 'seg-btn active' : 'seg-btn'}
                onClick={() => reset('hotseat')}
              >
                Два игрока
              </button>
            </div>

            {mode === 'ai' && (
              <>
                <div className="seg small-seg">
                  <button
                    className={level === 'easy' ? 'seg-btn active' : 'seg-btn'}
                    onClick={() => { setLevel('easy'); if (!gameEnded) reset('ai', playerMark, 'easy') }}
                  >
                    Лёгкий
                  </button>
                  <button
                    className={level === 'medium' ? 'seg-btn active' : 'seg-btn'}
                    onClick={() => { setLevel('medium'); if (!gameEnded) reset('ai', playerMark, 'medium') }}
                  >
                    Средний
                  </button>
                  <button
                    className={level === 'hard' ? 'seg-btn active' : 'seg-btn'}
                    onClick={() => { setLevel('hard'); if (!gameEnded) reset('ai', playerMark, 'hard') }}
                  >
                    Сложный (непобедимый)
                  </button>
                </div>
                <div className="seg small-seg">
                  <button
                    className={playerMark === 'X' ? 'seg-btn active' : 'seg-btn'}
                    onClick={() => reset('ai', 'X', level)}
                  >
                    Играть крестиками
                  </button>
                  <button
                    className={playerMark === 'O' ? 'seg-btn active' : 'seg-btn'}
                    onClick={() => reset('ai', 'O', level)}
                  >
                    Играть ноликами
                  </button>
                </div>
              </>
            )}

            <div className="btn-row">
              <button className="btn btn-primary" onClick={() => reset()}>
                Заново
              </button>
            </div>
            {!user && (
              <p className="muted small-note">
                Войдите, чтобы результаты против компьютера шли в лидерборд.
              </p>
            )}
          </div>

          {mode === 'ai' && (
            <div className="card">
              <h3>Счёт сессии</h3>
              <div className="score-row">
                <span>Победы: <b>{score.w}</b></span>
                <span>Ничьи: <b>{score.d}</b></span>
                <span>Поражения: <b>{score.l}</b></span>
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  )
}
