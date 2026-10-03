import { motion } from 'framer-motion'
import { HORIZON, PLOT, iso, plotCenter, plotStart } from './geometry'

// Bilhete dourado: pequeno, só com um "%", sempre o mesmo desenho, para quem
// achou um reconhecer os próximos. Ao passar o mouse ele brilha e cresce um pouco.
function Ticket({ onClaim }) {
  // bilhete de 60×36 com os dois recortes redondos nas laterais
  const edge = 'M5 1h50a4 4 0 0 1 4 4v8a5 5 0 0 0 0 10v8a4 4 0 0 1-4 4H5a4 4 0 0 1-4-4v-8a5 5 0 0 0 0-10V5a4 4 0 0 1 4-4z'
  return (
    <g
      className="coupon-ticket"
      role="button"
      tabIndex={0}
      aria-label="Tem algo diferente aqui"
      onClick={onClaim}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClaim() } }}
    >
      <circle className="coupon-spark" cx="30" cy="18" r="46" fill="url(#coupon-glow)" />
      <path d={edge} transform="translate(0 3)" fill="#B97E00" opacity="0.35" />
      <clipPath id="coupon-clip"><path d={edge} /></clipPath>
      <g clipPath="url(#coupon-clip)">
        <rect width="60" height="36" fill="url(#coupon-gold)" />
        <rect className="coupon-shine" x="0" y="-14" width="12" height="70" fill="#fff" opacity="0.6" transform="skewX(-20)" />
      </g>
      <path d={edge} fill="none" stroke="#B97E00" strokeWidth="2" />
      <rect x="9" y="6" width="42" height="24" rx="4" fill="none" stroke="#B97E00" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.7" />
      <text x="30" y="26" textAnchor="middle" fontSize="20" fontWeight="900" fill="#7A5200" fontFamily="Arial Black, Arial, sans-serif">%</text>
    </g>
  )
}

const TREE_SPOT = [plotStart(0) + 0.2 * PLOT, plotStart(2) + 0.25 * PLOT]

// Onde o bilhete fica escondido em cada lugar (em coordenadas do desenho).
export default function CouponTicket({ spot, onClaim, still }) {
  const defs = (
    <defs>
      <linearGradient id="coupon-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFE38A" /><stop offset="1" stopColor="#F2B53A" /></linearGradient>
      <radialGradient id="coupon-glow"><stop offset="0" stopColor="#FFF0AA" stopOpacity="0.9" /><stop offset="1" stopColor="#FFF0AA" stopOpacity="0" /></radialGradient>
    </defs>
  )

  if (spot === 'balloon') {
    const y = HORIZON - 150
    return (
      <motion.g
        initial={{ x: -260 }}
        animate={still ? { x: 500 } : { x: [-260, 1800] }}
        transition={{ duration: 46, repeat: Infinity, ease: 'linear' }}
      >
        {defs}
        <g transform={`translate(0 ${y})`}>
          <ellipse cx="30" cy="-62" rx="26" ry="30" fill="#FF5C8A" />
          <ellipse cx="21" cy="-72" rx="8" ry="10" fill="#fff" opacity="0.4" />
          <path d="M30 -32 q-6 16 0 32" stroke="#7A5232" strokeWidth="2" fill="none" />
          <Ticket onClaim={onClaim} />
        </g>
      </motion.g>
    )
  }

  let at
  if (spot === 'lake') { const [x, y] = iso(...plotCenter(2, 2)); at = [x + 30, y - 50] }
  else if (spot === 'fountain') { const [x, y] = iso(...plotCenter(1, 2)); at = [x + 40, y - 40] }
  else { const [x, y] = iso(...TREE_SPOT); at = [x - 45, y - 90] }

  return (
    <g transform={`translate(${at[0] - 30} ${at[1] - 18})`}>
      {defs}
      <motion.g
        animate={still ? undefined : spot === 'lake' ? { y: [0, -5, 0], rotate: [-2, 2, -2] } : { rotate: [-12, -8, -12] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        {spot === 'lake' && <path d="M-6 34h72l-12 14H6z" fill="#fff" stroke="#9FB3C8" strokeWidth="2.5" />}
        <Ticket onClaim={onClaim} />
      </motion.g>
    </g>
  )
}
