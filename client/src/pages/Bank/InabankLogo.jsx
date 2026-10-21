// Logo do Inabank: monograma "ib" azul num quadrado branco arredondado, com o
// pingo do "i" laranja.
export default function InabankLogo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="#fff" />
      <g transform="translate(0.4 2)">
      <rect x="8.6" y="15.2" width="5.4" height="15.6" rx="2.7" fill="#1F5FB8" />
      <circle cx="11.3" cy="9.6" r="3.1" fill="#F7931E" />
      <path d="M17.4 8.6 a2.7 2.7 0 0 1 5.4 0 v7.7 a7.4 7.4 0 1 1 -5.4 7.1 Z M22.8 23.4 a3.2 3.2 0 1 0 6.4 0 a3.2 3.2 0 1 0 -6.4 0 Z" fill="#1F5FB8" fillRule="evenodd" />
      </g>
    </svg>
  )
}
