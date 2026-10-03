// Ícones dos dons em estilo brinquedo: medalhão colorido com sombra embaixo.
const ICONS = {
  // cofrinho
  frugal: (
    <g>
      <ellipse cx="32" cy="35" rx="17" ry="13" fill="#fff" />
      <circle cx="47" cy="33" r="5" fill="#fff" />
      <rect x="21" y="44" width="5" height="7" rx="2" fill="#fff" />
      <rect x="36" y="44" width="5" height="7" rx="2" fill="#fff" />
      <path d="M22 25 l3 -6 4 5z" fill="#fff" />
      <circle cx="40" cy="31" r="1.8" fill="#24331F" />
      <circle cx="48.5" cy="33" r="1" fill="#24331F" />
      <rect x="27" y="23.5" width="9" height="2.6" rx="1.3" fill="#2B8C41" />
      <circle cx="31.5" cy="15" r="5.5" fill="#FFC857" stroke="#E0A100" strokeWidth="1.5" />
      <text x="31.5" y="18" textAnchor="middle" fontSize="8" fontWeight="900" fill="#8A5A00">$</text>
    </g>
  ),
  // raio + estrelinhas: correria e oportunidade
  agile: (
    <g>
      <path d="M36 10 L20 36 h10 l-4 18 18 -28 h-11z" fill="#fff" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
      <path d="M48 14 l1.6 3.4 3.4 1.6 -3.4 1.6 -1.6 3.4 -1.6 -3.4 -3.4 -1.6 3.4 -1.6z" fill="#FFF3C4" />
      <path d="M15 44 l1.2 2.4 2.4 1.2 -2.4 1.2 -1.2 2.4 -1.2 -2.4 -2.4 -1.2 2.4 -1.2z" fill="#FFF3C4" />
    </g>
  ),
  // lâmpada
  smart: (
    <g>
      <path d="M32 11 a14 14 0 0 1 8.5 25.1 c-1.6 1.2 -2.5 3 -2.5 5 v1.9 h-12 v-1.9 c0 -2 -0.9 -3.8 -2.5 -5 A14 14 0 0 1 32 11z" fill="#fff" />
      <rect x="26" y="45" width="12" height="3.4" rx="1.7" fill="#fff" />
      <rect x="27.5" y="50" width="9" height="3.4" rx="1.7" fill="#fff" />
      <path d="M28 33 l4 -6 4 6" fill="none" stroke="#2F6FD6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 18 l-4 -2 M51 18 l4 -2 M32 4 v-3" stroke="#FFF3C4" strokeWidth="2.6" strokeLinecap="round" />
    </g>
  ),
}

const COLORS = {
  frugal: ['#56D172', '#2E9E48', '#237A38'],
  agile: ['#FFA45C', '#F07A26', '#B9581A'],
  smart: ['#7DB5FF', '#3F84EA', '#2A5FB0'],
}

export default function GiftIcon({ gift, size = 72 }) {
  const [top, bottom, edge] = COLORS[gift] ?? COLORS.frugal
  const id = `gift-${gift}`
  return (
    <svg viewBox="0 0 64 68" width={size} height={size * 68 / 64} aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={top} /><stop offset="1" stopColor={bottom} /></linearGradient>
      </defs>
      <circle cx="32" cy="36" r="29" fill={edge} />
      <circle cx="32" cy="32" r="29" fill={`url(#${id})`} />
      <ellipse cx="24" cy="15" rx="12" ry="5" fill="#fff" opacity=".25" />
      {ICONS[gift]}
    </svg>
  )
}
