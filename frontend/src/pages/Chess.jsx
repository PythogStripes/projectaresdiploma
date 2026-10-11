import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { api } from '../api'
import { useAuth } from '../auth'

const GLYPHS = { k: '♚\uFE0E', q: '♛\uFE0E', r: '♜\uFE0E', b: '♝\uFE0E', n: '♞\uFE0E', p: '♟\uFE0E' }
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

const woodGrain = ({ fx, fy, seed, alpha }) =>
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'>` +
    `<filter id='w'><feTurbulence type='fractalNoise' baseFrequency='${fx} ${fy}' numOctaves='4' seed='${seed}' stitchTiles='stitch'/>` +
    `<feColorMatrix type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${alpha} ${alpha} ${alpha} 0 0'/></filter>` +
    `<rect width='260' height='260' filter='url(#w)'/></svg>`,
  )

const GRAIN_VARS = {
  '--grain-light': `url("${woodGrain({ fx: 0.006, fy: 0.05, seed: 5, alpha: 0.2 })}")`,
  '--grain-dark': `url("${woodGrain({ fx: 0.008, fy: 0.07, seed: 11, alpha: 0.34 })}")`,
  '--grain-frame': `url("${woodGrain({ fx: 0.004, fy: 0.045, seed: 23, alpha: 0.3 })}")`,
}

const VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 }

function evaluate(game) {
  let score = 0
  const board = game.board()
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = board[r][c]
      if (!sq) continue
      let v = VALUE[sq.type]
      v += (3.5 - Math.abs(3.5 - r)) * 3 + (3.5 - Math.abs(3.5 - c)) * 3
      if (sq.type === 'p') v += sq.color === 'w' ? (6 - r) * 5 : (r - 1) * 5
      score += sq.color === 'w' ? v : -v
    }
  }
  return score
}

function orderMoves(moves) {
  return [...moves].sort(
    (a, b) => (b.captured ? VALUE[b.captured] : 0) - (a.captured ? VALUE[a.captured] : 0),
  )
}

function minimax(game, depth, alpha, beta) {
  if (game.isGameOver()) {
    if (game.isCheckmate()) {
      return game.turn() === 'w' ? -99999 : 99999
    }
    return 0
  }
  if (depth === 0) return evaluate(game)

  const moves = orderMoves(game.moves({ verbose: true }))
  if (game.turn() === 'w') {
    let best = -Infinity
    for (const m of moves) {
      game.move(m)
      best = Math.max(best, minimax(game, depth - 1, alpha, beta))
      game.undo()
      alpha = Math.max(alpha, best)
      if (beta <= alpha) break
    }
    return best
  }
  let best = Infinity
  for (const m of moves) {
    game.move(m)
    best = Math.min(best, minimax(game, depth - 1, alpha, beta))
    game.undo()
    beta = Math.min(beta, best)
    if (beta <= alpha) break
  }
  return best
}

function bestMove(game, depth) {
  const color = game.turn()
  const moves = orderMoves(game.moves({ verbose: true }))
  let best = null
  let bestScore = color === 'w' ? -Infinity : Infinity
  for (const m of moves) {
    game.move(m)
    const score = minimax(game, depth - 1, -Infinity, Infinity)
    game.undo()
    if (color === 'w' ? score > bestScore : score < bestScore) {
      bestScore = score
      best = m
    }
  }
  return best || moves[0]
}

export default function ChessPage() {
  const { user } = useAuth()
  const gameRef = useRef(new Chess())
  const [, forceTick] = useState(0)
  const rerender = useCallback(() => forceTick((x) => x + 1), [])

  const [mode, setMode] = useState('ai')
  const [level, setLevel] = useState('medium')
  const [playerColor, setPlayerColor] = useState('w')
  const [selected, setSelected] = useState(null)
  const [targets, setTargets] = useState([])
  const [lastMove, setLastMove] = useState(null)
  const [thinking, setThinking] = useState(false)
  const [saveNote, setSaveNote] = useState('')
  const [finished, setFinished] = useState(null)

  const game = gameRef.current

  const legalTargetsFrom = useMemo(() => {
    if (!selected) return []
    return game
      .moves({ square: selected, verbose: true })
      .map((m) => m.to)
  }, [selected, game])

  const statusText = useMemo(() => {
    const turnName = game.turn() === 'w' ? 'белых' : 'чёрных'
    if (game.isGameOver()) {
      if (game.isCheckmate()) {
        const winner = game.turn() === 'w' ? 'чёрные' : 'белые'
        return `Мат! Победа ${winner}.`
      }
      if (game.isStalemate()) return 'Пат — ничья.'
      return 'Ничья.'
    }
    if (thinking) return 'Компьютер думает…'
    if (mode === 'ai') {
      const yours = game.turn() === playerColor
      const base = `Ход ${turnName}`
      if (game.inCheck()) return `${base} — шах${yours ? ', ваш король под боем!' : '!'}`
      return yours ? `${base} — ваш ход` : `${base} (компьютер)`
    }
    return game.inCheck() ? `Ход ${turnName} — шах!` : `Ход ${turnName}`
  }, [game, mode, playerColor, thinking])

  const saveResult = useCallback(
    async (result, moves) => {
      if (!user) return
      try {
        const res = await api('/api/results/', {
          method: 'POST',
          body: { game: 'chess', result, mode, moves, difficulty: level },
        })
        setSaveNote(res.detail || 'Результат сохранён.')
      } catch {
        setSaveNote('Не удалось сохранить результат.')
      }
    },
    [user, mode, level],
  )

  const checkEnd = useCallback(
    (g) => {
      if (!g.isGameOver()) return false
      let result = 'draw'
      if (g.isCheckmate()) {
        const loser = g.turn()
        if (mode === 'ai') result = loser === playerColor ? 'loss' : 'win'
        else result = 'draw'
      }
      if (mode === 'ai') {
        setFinished(result)
        saveResult(result, g.history().length)
      } else {
        setFinished('done')
      }
      return true
    },
    [mode, playerColor, saveResult],
  )

  const aiMove = useCallback(
    (g, lvl) => {
      setThinking(true)
      setTimeout(() => {
        try {
          const move =
            lvl === 'easy'
              ? (() => {
                  const ms = g.moves({ verbose: true })
                  const caps = ms.filter((m) => m.captured)
                  const pool = caps.length && Math.random() < 0.5 ? caps : ms
                  return pool[Math.floor(Math.random() * pool.length)]
                })()
              : lvl === 'medium'
                ?
                  (Math.random() < 0.18
                    ? g.moves({ verbose: true })[
                        Math.floor(Math.random() * g.moves({ verbose: true }).length)
                      ]
                    : bestMove(g, 2))
                :
                  bestMove(g, 3)
          if (move) {
            g.move(move)
            setLastMove({ from: move.from, to: move.to })
          }
        } finally {
          setThinking(false)
          rerender()
          checkEnd(g)
        }
      }, 300)
    },
    [checkEnd, rerender],
  )

  const newGame = useCallback(
    (nextMode = mode, nextColor = playerColor, nextLevel = level) => {
      gameRef.current = new Chess()
      setSelected(null)
      setTargets([])
      setLastMove(null)
      setFinished(null)
      setSaveNote('')
      rerender()
      setMode(nextMode)
      setPlayerColor(nextColor)
      setLevel(nextLevel)
      if (nextMode === 'ai' && nextColor === 'b') {
        aiMove(gameRef.current, nextLevel)
      }
    },
    [mode, playerColor, level, aiMove, rerender],
  )

  const onSquare = (sq) => {
    if (finished || thinking) return
    if (mode === 'ai' && game.turn() !== playerColor) return
    const g = game

    if (selected && legalTargetsFrom.includes(sq)) {
      try {
        const move = g.move({ from: selected, to: sq, promotion: 'q' })
        setLastMove({ from: move.from, to: move.to })
        setSelected(null)
        setTargets([])
        rerender()
        if (!checkEnd(g) && mode === 'ai') {
          aiMove(g, level)
        }
      } catch {
      }
      return
    }

    const moves = g.moves({ square: sq, verbose: true })
    if (moves.length) {
      setSelected(sq)
      setTargets(moves.map((m) => m.to))
    } else {
      setSelected(null)
      setTargets([])
    }
  }

  const undo = () => {
    if (thinking) return
    const g = gameRef.current
    if (!g.history().length) return
    g.undo()
    if (mode === 'ai' && g.history().length && g.turn() !== playerColor) g.undo()
    setFinished(null)
    setSaveNote('')
    setSelected(null)
    setTargets([])
    setLastMove(null)
    rerender()
  }

  const board = game.board()
  const historySan = game.history()
  const rows = []

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sqName = FILES[c] + (8 - r)
      const piece = board[r][c]
      const isLight = (r + c) % 2 === 0
      const classes = [
        'sq',
        isLight ? 'light' : 'dark',
        selected === sqName ? 'selected' : '',
        targets.includes(sqName) ? 'target' : '',
        lastMove && (lastMove.from === sqName || lastMove.to === sqName) ? 'last-move' : '',
      ]
      if (piece && targets.includes(sqName)) classes.push('capture')
      if (piece && piece.type === 'k' && game.inCheck() && piece.color === game.turn()) {
        classes.push('in-check')
      }
      rows.push(
        <div
          key={sqName}
          className={classes.filter(Boolean).join(' ')}
          style={{ '--gx': `${80 + ((c * 53 + r * 97) % 180)}px`, '--gy': `${80 + ((c * 131 + r * 29) % 180)}px` }}
          onClick={() => onSquare(sqName)}
        >
          {piece && (
            <span className={`pc ${piece.color === 'w' ? 'w' : 'b'}`}>
              {GLYPHS[piece.type]}
            </span>
          )}
        </div>,
      )
    }
  }

  const movePairs = []
  for (let i = 0; i < historySan.length; i += 2) {
    movePairs.push({
      n: Math.floor(i / 2) + 1,
      w: historySan[i],
      b: historySan[i + 1] || '',
    })
  }

  return (
    <main className="page">
      <h1 className="page-title">Шахматы</h1>
      <div className="game-layout">
        <div className="board-zone">
          <div className="status-bar card">
            <span className={game.isGameOver() ? 'status-final' : ''}>{statusText}</span>
            {saveNote && <span className="save-note">{saveNote}</span>}
          </div>
          <div className="board-frame" style={GRAIN_VARS}>
            <div className="board-wrap">
              <div className="rank-labels" aria-hidden="true">
                {[8, 7, 6, 5, 4, 3, 2, 1].map((n) => <span key={n}>{n}</span>)}
              </div>
              <div className="board">{rows}</div>
              <div className="file-labels" aria-hidden="true">
                {FILES.map((f) => <span key={f}>{f}</span>)}
              </div>
            </div>
          </div>
        </div>

        <aside className="game-side">
          <div className="card controls">
            <h3>Новая партия</h3>
            <div className="seg">
              <button
                className={mode === 'ai' ? 'seg-btn active' : 'seg-btn'}
                onClick={() => newGame('ai', playerColor, level)}
              >
                Против компьютера
              </button>
              <button
                className={mode === 'hotseat' ? 'seg-btn active' : 'seg-btn'}
                onClick={() => newGame('hotseat')}
              >
                Два игрока
              </button>
            </div>

            {mode === 'ai' && (
              <>
                <div className="seg small-seg">
                  <button
                    className={level === 'easy' ? 'seg-btn active' : 'seg-btn'}
                    onClick={() => { setLevel('easy'); if (!finished) newGame('ai', playerColor, 'easy') }}
                  >
                    Лёгкий
                  </button>
                  <button
                    className={level === 'medium' ? 'seg-btn active' : 'seg-btn'}
                    onClick={() => { setLevel('medium'); if (!finished) newGame('ai', playerColor, 'medium') }}
                  >
                    Средний
                  </button>
                  <button
                    className={level === 'hard' ? 'seg-btn active' : 'seg-btn'}
                    onClick={() => { setLevel('hard'); if (!finished) newGame('ai', playerColor, 'hard') }}
                  >
                    Сложный
                  </button>
                </div>
                <div className="seg small-seg">
                  <button
                    className={playerColor === 'w' ? 'seg-btn active' : 'seg-btn'}
                    onClick={() => newGame('ai', 'w', level)}
                  >
                    Играть белыми
                  </button>
                  <button
                    className={playerColor === 'b' ? 'seg-btn active' : 'seg-btn'}
                    onClick={() => newGame('ai', 'b', level)}
                  >
                    Играть чёрными
                  </button>
                </div>
              </>
            )}

            <div className="btn-row">
              <button className="btn btn-outline" onClick={undo} disabled={thinking}>
                Отменить ход
              </button>
              <button
                className="btn btn-primary"
                onClick={() => newGame(mode, playerColor, level)}
              >
                Заново
              </button>
            </div>
            {!user && (
              <p className="muted small-note">
                Войдите в аккаунт, чтобы результаты партий против компьютера
                попадали в лидерборд.
              </p>
            )}
            {mode === 'hotseat' && (
              <p className="muted small-note">
                В режиме «два игрока» результаты в лидерборд не записываются.
              </p>
            )}
          </div>

          <div className="card moves-card">
            <h3>Ходы</h3>
            {movePairs.length === 0 ? (
              <p className="muted">Партия ещё не начата.</p>
            ) : (
              <div className="moves-list">
                {movePairs.map((p) => (
                  <div key={p.n} className="move-row">
                    <span className="move-n">{p.n}.</span>
                    <span>{p.w}</span>
                    <span>{p.b}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  )
}
