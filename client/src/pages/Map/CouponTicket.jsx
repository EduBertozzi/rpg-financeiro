import { motion } from 'framer-motion'
import { HORIZON, PLOT, iso, plotCenter, plotStart } from './geometry'

// Bilhete dourado: sempre o mesmo desenho, para quem achou um reconhecer os
// próximos. Cresce ao passar o mouse, para dar para ler antes de clicar.
function Ticket({ onClaim }) {
  const edge = 'M6 2h78a4 4 0 0 1 4 4v14a8 8 0 0 0 0 16v14a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V36a8 8 0 0 0 0-16V6a4 4 0 0 1 4-4z'
  return (
    <g
      className="coupon-ticket"
      role="button"
      tabIndex={0}
      aria-label="Tem algo diferente aqui"
      onClick={onClaim}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClaim() } }}
    >
      <circle className="coupon-spark" cx="45" cy="28" r="70" fill="url(#coupon-glow)" />
      <g transform="translate(0 0)">
        <path d={edge} transform="translate(0 4)" fill="#B97E00" opacity="0.35" />
        <clipPath id="coupon-clip"><path d={edge} /></clipPath>
        <g clipPath="url(#coupon-clip)">
          <rect width="90" height="56" fill="url(#coupon-gold)" />
          <rect className="coupon-shine" x="0" y="-20" width="18" height="100" fill="#fff" opacity="0.55" transform="skewX(-20)" />
        </g>
        <path d={edge} fill="none" stroke="#B97E00" strokeWidth="2.5" />
        <line x1="32" y1="8" x2="32" y2="48" stroke="#B97E00" strokeWidth="2" strokeDasharray="4 4" />
        <circle cx="17" cy="28" r="11" fill="#fff" opacity="0.6" />
        <text x="17" y="34" textAnchor="middle" fontSize="18" fontWeight="900" fill="#7A5200" fontFamily="Arial Black, Arial, sans-serif">%</text>
        <text x="61" y="27" textAnchor="middle" fontSize="13" fontWeight="900" fill="#7A5200" fontFamily="Arial Black, Arial, sans-serif">CUPOM</text>
        <text x="61" y="41" textAnchor="middle" fontSize="9" fontWeight="800" fill="#9A6A00" fontFamily="Arial, sans-serif">clique aqui</text>
      </g>
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
          <ellipse cx="45" cy="-62" rx="26" ry="30" fill="#FF5C8A" />
          <ellipse cx="36" cy="-72" rx="8" ry="10" fill="#fff" opacity="0.4" />
          <path d="M45 -32 q-6 16 0 32" stroke="#7A5232" strokeWidth="2" fill="none" />
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
    <g transform={`translate(${at[0] - 45} ${at[1] - 28})`}>
      {defs}
      <motion.g
        animate={still ? undefined : spot === 'lake' ? { y: [0, -5, 0], rotate: [-2, 2, -2] } : { rotate: [-12, -8, -12] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        {spot === 'lake' && <path d="M-6 50h102l-16 20H10z" fill="#fff" stroke="#9FB3C8" strokeWidth="2.5" />}
        <Ticket onClaim={onClaim} />
      </motion.g>
    </g>
  )
}
