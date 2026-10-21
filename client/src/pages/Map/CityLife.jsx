import { motion } from 'framer-motion'
import { IsoBox } from './CityBlocks'
import { HORIZON, PLOT, ROAD, ROAD_FRONT, iso, plotCenter, plotStart, roadBack, roadStart } from './geometry'

// Vida nas ruas do mapa: gente com sacola, ciclista, ônibus que para no ponto,
// bancos e banca de jornal na praça, e os enfeites da praça conforme o mês.

// Pessoa andando de um ponto a outro (vai e volta), com ou sem sacola.
export function Walker({ from, to, color, bag, duration, delay = 0, still }) {
  const [x0, y0] = iso(...from)
  const [x1, y1] = iso(...to)
  return (
    <motion.g
      initial={{ x: x0, y: y0 }}
      animate={still ? undefined : { x: [x0, x1], y: [y0, y1] }}
      transition={{ duration, delay, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
    >
      <ellipse cx="0" cy="1" rx="6" ry="3" fill="rgba(0,0,0,0.25)" />
      <motion.g animate={still ? undefined : { y: [0, -2, 0] }} transition={{ duration: 0.5, repeat: Infinity }}>
        <rect x="-3.5" y="-6" width="3" height="6" rx="1.2" fill="#3B4A5E" />
        <rect x="0.5" y="-6" width="3" height="6" rx="1.2" fill="#3B4A5E" />
        <rect x="-4.5" y="-17" width="9" height="12" rx="4" fill={color} />
        <circle cx="0" cy="-21" r="4.5" fill="#FCD9B6" />
        <path d="M-4.4 -22.5 a4.5 4.5 0 0 1 8.8 0 z" fill="#5C3A21" />
        {bag && (
          <g>
            <rect x="4" y="-11" width="7" height="8" rx="1.5" fill={bag} stroke="#FFFFFF" strokeWidth="1" />
            <path d="M5.5 -11 q2 -4 4 0" stroke={bag} strokeWidth="1.2" fill="none" />
          </g>
        )}
      </motion.g>
    </motion.g>
  )
}

// Ciclista ao longo da avenida (eixo v), indo e voltando.
export function Cyclist({ lane, still }) {
  const [x0, y0] = iso(lane, roadStart(0) - 30)
  const [x1, y1] = iso(lane, roadStart(2) + ROAD + 40)
  return (
    <motion.g
      initial={{ x: x0, y: y0 }}
      animate={still ? undefined : { x: [x0, x1], y: [y0, y1] }}
      transition={{ duration: 16, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
    >
      <ellipse cx="0" cy="2" rx="12" ry="4" fill="rgba(0,0,0,0.22)" />
      <circle cx="-7" cy="-4" r="5" fill="none" stroke="#24331F" strokeWidth="1.8" />
      <circle cx="7" cy="-1" r="5" fill="none" stroke="#24331F" strokeWidth="1.8" />
      <path d="M-7 -4 L0 -6 L7 -1 M0 -6 L-2 -12 M-3 -12 h4" stroke="#EF4E3E" strokeWidth="2" fill="none" strokeLinecap="round" />
      <motion.g animate={still ? undefined : { y: [0, -1, 0] }} transition={{ duration: 0.4, repeat: Infinity }}>
        <rect x="-5" y="-23" width="8" height="11" rx="3.5" fill="#2BB8D2" />
        <circle cx="-1" cy="-27" r="4" fill="#FCD9B6" />
        <path d="M-5 -28 a4.2 4.2 0 0 1 8.4 0 z" fill="#F5BC42" />
      </motion.g>
    </motion.g>
  )
}

// Ponto de ônibus na calçada da praça.
const STOP_U = () => plotCenter(1, 2)[0] - 20
const BUS_LANE = () => roadStart(1) + ROAD * 0.72

export function BusStop() {
  const [x, y] = iso(STOP_U(), plotStart(2) + 6)
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
      <ellipse cx="0" cy="2" rx="20" ry="7" fill="rgba(0,0,0,0.18)" />
      <rect x="-15" y="-30" width="2.5" height="30" fill="#3B4A5E" />
      <rect x="12.5" y="-30" width="2.5" height="30" fill="#3B4A5E" />
      <rect x="-17" y="-34" width="34" height="6" rx="2" fill="#2F7FE0" />
      <rect x="-12" y="-28" width="24" height="16" rx="2" fill="#CFEAF6" opacity=".7" />
      <rect x="-11" y="-9" width="22" height="3" rx="1.5" fill="#A9693A" />
      <circle cx="20" cy="-36" r="5" fill="#F5BC42" stroke="#FFFFFF" strokeWidth="1.5" />
    </g>
  )
}

// Ônibus amarelo que passa e para um pouco no ponto da praça.
export function Bus({ still }) {
  const lane = BUS_LANE()
  const a = iso(roadBack(lane), lane)
  const s = iso(STOP_U(), lane)
  const b = iso(ROAD_FRONT, lane)
  return (
    <motion.g
      initial={{ x: a[0], y: a[1] }}
      animate={still ? undefined : { x: [a[0], s[0], s[0], b[0]], y: [a[1], s[1], s[1], b[1]] }}
      transition={{ duration: 30, times: [0, 0.38, 0.52, 1], repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
    >
      <ellipse cx="0" cy="4" rx="40" ry="13" fill="rgba(0,0,0,0.22)" />
      <IsoBox du={56} dv={22} h={20} top="#FFD978" left="#F5BC42" right="#D99A12" />
      <IsoBox du={50} dv={23} h={6} z={10} top="#FFD978" left="#CFEAF6" right="#9FD8F0" />
      <IsoBox du={56} dv={22} h={2} z={20} top="#FFFFFF" left="#E8E2D2" right="#D6CDBB" />
    </motion.g>
  )
}

// Banco de praça (em pixels, já no lugar).
export function Bench({ u, v }) {
  const [x, y] = iso(u, v)
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
      <ellipse cx="0" cy="2" rx="15" ry="5" fill="rgba(0,0,0,0.16)" />
      <rect x="-12" y="-7" width="2" height="7" fill="#3B4A5E" />
      <rect x="10" y="-7" width="2" height="7" fill="#3B4A5E" />
      <rect x="-14" y="-9" width="28" height="3.5" rx="1.5" fill="#C08A55" />
      <rect x="-14" y="-16" width="28" height="3.5" rx="1.5" fill="#A9733F" />
    </g>
  )
}

// Banca de jornal no canto da praça.
export function Newsstand({ u, v }) {
  const [x, y] = iso(u, v)
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
      <IsoBox du={22} dv={18} h={20} top="#7DCB55" left="#3E8A39" right="#2F6E2B" />
      <IsoBox du={26} dv={22} h={3} z={20} top="#F5BC42" left="#D99A12" right="#C98A12" />
      {['#EF4E3E', '#2F7FE0', '#F5BC42', '#F06AAE'].map((c, k) => <rect key={k} x={-14 + k * 5} y={-12} width="4" height="6" rx=".8" fill={c} />)}
    </g>
  )
}

// Enfeites da praça que dependem do mês (as bandeirinhas e luzinhas ficam no PlazaDeco).
export function PlazaMonth({ month, still }) {
  const [cx, cy] = iso(...plotCenter(1, 2))
  const corner = (fu, fv) => iso(plotStart(1) + fu * PLOT, plotStart(2) + fv * PLOT)
  if (month === 4) {
    // Páscoa: ovos espalhados pela grama
    return (
      <g pointerEvents="none">
        {[[0.18, 0.3, '#F06AAE'], [0.25, 0.78, '#7DCB55'], [0.8, 0.22, '#5B8EEB'], [0.75, 0.82, '#F5BC42'], [0.5, 0.88, '#B07CE8']].map(([fu, fv, c], k) => {
          const [x, y] = corner(fu, fv)
          return (
            <g key={k}>
              <ellipse cx={x} cy={y - 8} rx="6.5" ry="9" fill={c} stroke="#FFFFFF" strokeWidth="1.5" />
              <path d={`M${x - 6} ${y - 8} q3 -3 6 0 q3 3 6 0`} stroke="#FFFFFF" strokeWidth="1.6" fill="none" />
            </g>
          )
        })}
      </g>
    )
  }
  if (month === 10) {
    // Halloween: abóboras em volta da fonte
    return (
      <g pointerEvents="none">
        {[[0.2, 0.25], [0.8, 0.3], [0.25, 0.8], [0.82, 0.8]].map(([fu, fv], k) => {
          const [x, y] = corner(fu, fv)
          return (
            <g key={k} transform={`translate(${x} ${y - 9})`}>
              <ellipse rx="11" ry="9" fill="#FF8A1F" stroke="#B85A0A" strokeWidth="1.5" />
              <rect x="-1.5" y="-13" width="3" height="5" rx="1" fill="#4C982A" />
              <path d="M-6 -2 l2.5 -3 l2.5 3z M1 -2 l2.5 -3 l2.5 3z M-5 3 q5 3 10 0" fill="#5C2A00" />
            </g>
          )
        })}
      </g>
    )
  }
  if (month === 12) {
    // Natal: um pinheiro grande enfeitado no canto da praça
    const [x, y] = corner(0.82, 0.2)
    return (
      <g transform={`translate(${x} ${y})`} pointerEvents="none">
        <ellipse cx="0" cy="2" rx="22" ry="8" fill="rgba(0,0,0,0.2)" />
        <rect x="-4" y="-12" width="8" height="12" fill="#8A5A33" />
        <path d="M0 -84 L22 -50 H12 L28 -28 H16 L32 -10 H-32 L-16 -28 H-28 L-12 -50 H-22 Z" fill="#3E8A39" />
        {[[-10, -24, '#EF4E3E'], [12, -18, '#F5BC42'], [-4, -40, '#2BB8D2'], [10, -46, '#F06AAE'], [-14, -14, '#5B8EEB'], [4, -62, '#EF4E3E']].map(([bx, by, c], k) => (
          <circle key={k} cx={bx} cy={by} r="3.4" fill={c}>
            {!still && <animate attributeName="opacity" values="1;.4;1" dur={`${1.1 + k * 0.2}s`} repeatCount="indefinite" />}
          </circle>
        ))}
        <path d="M0 -94 l3 6 7 .7 -5 4.6 1.4 6.8 -6.4 -3.6 -6.4 3.6 1.4 -6.8 -5 -4.6 7 -.7z" fill="#F5BC42" stroke="#C98A12" strokeWidth="1" />
      </g>
    )
  }
  if (month === 2) {
    // Carnaval: confete caindo sobre a praça
    return (
      <g pointerEvents="none">
        {Array.from({ length: 18 }, (_, k) => {
          const x = cx - 120 + (k * 97) % 240
          const c = ['#F06AAE', '#2BB8D2', '#F5BC42', '#7DCB55', '#8A5CF6', '#EF4E3E'][k % 6]
          return (
            <motion.rect key={k} x={x} width="5" height="5" rx="1" fill={c}
              initial={{ y: cy - 150, rotate: 0, opacity: 0 }}
              animate={still ? undefined : { y: [cy - 150, cy + 20], rotate: [0, 360], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 3.4, delay: (k % 6) * 0.55, repeat: Infinity, ease: 'linear' }} />
          )
        })}
      </g>
    )
  }
  return null
}

// Ano Novo: fogos estourando no céu, em cima da praça.
export function Fireworks({ still }) {
  // no céu, logo acima do horizonte, espalhados sobre a cidade
  const [cx] = iso(...plotCenter(1, 1))
  const cy = HORIZON
  const bursts = [[-260, -40, '#F5BC42', 0], [-80, -90, '#F06AAE', 0.9], [140, -55, '#2BB8D2', 1.7], [320, -100, '#7DCB55', 2.4]]
  if (still) return null
  return (
    <g pointerEvents="none">
      {bursts.map(([dx, dy, c, d], k) => (
        <motion.g key={k} style={{ x: cx + dx, y: cy + dy }}
          initial={{ scale: 0.1, opacity: 0 }}
          animate={{ scale: [0.1, 1, 1.15], opacity: [0, 1, 0] }}
          transition={{ duration: 1.6, delay: d, repeat: Infinity, repeatDelay: 1.6, ease: 'easeOut' }}>
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2
            return <line key={i} x1={Math.cos(a) * 8} y1={Math.sin(a) * 8} x2={Math.cos(a) * 30} y2={Math.sin(a) * 30} stroke={c} strokeWidth="3" strokeLinecap="round" />
          })}
          <circle r="4" fill="#FFFFFF" />
        </motion.g>
      ))}
    </g>
  )
}
