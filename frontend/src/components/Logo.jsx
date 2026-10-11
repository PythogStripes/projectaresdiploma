import KnightArt from './KnightArt'

// Логотип «Арес»: восьмиугольная рамка с профилем шахматного коня внутри.
// Цвет берётся из темы (CSS-переменная --logo), поэтому логотип
// перекрашивается вместе с оформлением сайта.
export default function Logo({ size = 52, className = '' }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`logo ${className}`}
      role="img"
      aria-label="Логотип Арес — шахматный конь"
    >
      {/* Восьмиугольная рамка (только обводка) */}
      <path d="M17 4H83L96 17V83L83 96H17L4 83V17Z" fill="none" style={{ stroke: 'var(--logo)' }} strokeWidth="3.6" strokeLinejoin="miter" />
      {/* Сам конь */}
      <KnightArt />
    </svg>
  )
}
