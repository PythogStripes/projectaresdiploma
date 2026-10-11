import KnightArt from './KnightArt'

/**
 * Логотип «Арес» — шахматный конь с лавровым венком в восьмиугольной рамке.
 * Цвета берутся из темы (--logo, --accent2); перекрашивается вместе с темой.
 */
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
      <path d="M17 4H83L96 17V83L83 96H17L4 83V17Z" fill="none" style={{ stroke: 'var(--logo)' }} strokeWidth="3.6" strokeLinejoin="miter" />
      <KnightArt />
    </svg>
  )
}
