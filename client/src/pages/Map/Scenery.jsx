import { motion } from 'framer-motion'
import { HORIZON } from './geometry'

// Paisagem do horizonte e do céu (montanhas, cidade ao longe, turbinas, balão, avião, pássaros).
// Tudo em coordenadas da viewBox do CityScene; vai além de 0..1600 para
// cobrir telas largas.

const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}


const PALETTE = {
  day: { mountain: '#A5BCD8', snow: '#F8FAFC', skyline: '#9FB4CF', window: null },
  dusk: { mountain: '#8E7FB0', snow: '#F5D0C5', skyline: '#7D6C9C', window: '#FDE68A' },
  night: { mountain: '#1F2C57', snow: '#94A3B8', skyline: '#141D42', window: '#FDE68A' },
}

const SKYLINE = (() => {
  const r = rng(7)
  const list = []
  for (let x = -900; x < 2500;) {
    const w = 22 + Math.round(r() * 30)
    const h = 28 + Math.round(r() * 62)
    // janelas acesas espalhadas e com brilho variado; alguns prédios ficam apagados
    const windows = []
    if (r() > 0.25) {
      for (let wy = 8; wy < h - 6; wy += 10) {
        for (let wx = 5; wx < w - 5; wx += 8) {
          if (r() < 0.16) windows.push([wx, wy, 0.45 + r() * 0.5])
        }
      }
    }
    list.push({ x, w, h, windows })
    x += w + Math.round(r() * 10)
  }
  return list
})()

const SKYLINE_BASE = HORIZON

export function Mountains({ phase }) {
  const c = PALETTE[phase]
  const peaks = [[-700, 70, 340], [-150, 95, 280], [420, 80, 300], [1200, 65, 320], [1750, 90, 280], [2300, 75, 340]]
    .map(([x, rise, w]) => [x, SKYLINE_BASE - rise - 40, w])
  return (
    <g>
      {peaks.map(([x, top, w]) => (
        <g key={x}>
          <polygon points={`${x - w / 2},${SKYLINE_BASE} ${x},${top} ${x + w / 2},${SKYLINE_BASE}`} fill={c.mountain} />
          <polygon points={`${x - w * 0.09},${top + 22} ${x},${top} ${x + w * 0.09},${top + 22} ${x + w * 0.03},${top + 18} ${x - w * 0.02},${top + 25}`} fill={c.snow} opacity="0.9" />
        </g>
      ))}
    </g>
  )
}

export function Skyline({ phase }) {
  const c = PALETTE[phase]
  return (
    <g>
      {SKYLINE.map((b) => (
        <g key={b.x}>
          <rect x={b.x} y={SKYLINE_BASE - b.h} width={b.w} height={b.h + 60} fill={c.skyline} />
          {c.window && b.windows.map(([wx, wy, glow]) => (
            <rect key={`${wx}-${wy}`} x={b.x + wx} y={SKYLINE_BASE - b.h + wy} width="3" height="4" fill={c.window} opacity={phase === 'night' ? glow : glow * 0.6} />
          ))}
        </g>
      ))}
    </g>
  )
}

export function WindTurbine({ x, y, scale = 1, still }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <polygon points="-3,0 3,0 1.5,-90 -1.5,-90" fill="#F1F5F9" />
      <g transform="translate(0 -90)">
        <g>
          {[0, 120, 240].map((a) => (
            <path key={a} d="M0 0 C 4 -14 3 -40 0 -52 C -3 -40 -4 -14 0 0Z" fill="#F8FAFC" transform={`rotate(${a})`} />
          ))}
          {!still && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="7s" repeatCount="indefinite" />}
        </g>
        <circle r="4" fill="#CBD5E1" />
      </g>
    </g>
  )
}

export function Balloon({ still }) {
  return (
    <motion.g
      initial={{ x: 1260, y: 250 }}
      animate={still ? undefined : { x: [1260, 1320, 1260], y: [250, 190, 250] }}
      transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
    >
      <path d="M0 -60 C 34 -60 40 -20 22 6 L 8 24 L -8 24 L -22 6 C -40 -20 -34 -60 0 -60Z" fill="#F472B6" />
      <path d="M0 -60 C 12 -60 14 -20 8 6 L 4 24 L -4 24 L -8 6 C -14 -20 -12 -60 0 -60Z" fill="#FDE047" />
      <line x1="-7" y1="24" x2="-6" y2="36" stroke="#78350F" strokeWidth="1.5" />
      <line x1="7" y1="24" x2="6" y2="36" stroke="#78350F" strokeWidth="1.5" />
      <rect x="-8" y="36" width="16" height="12" rx="2" fill="#92400E" />
    </motion.g>
  )
}

export function Plane({ still }) {
  return (
    <motion.g
      initial={{ x: 2200, y: 20 }}
      animate={still ? undefined : { x: [2200, -900] }}
      transition={{ duration: 34, repeat: Infinity, repeatDelay: 12, ease: 'linear' }}
    >
      <path d="M0 0 L 40 -6 L 52 -18 L 58 -18 L 54 -4 L 70 -2 L 70 4 L 54 6 L 58 18 L 52 18 L 40 6 Z" fill="#F8FAFC" transform="scale(-1 1)" />
      <line x1="10" y1="0" x2="60" y2="0" stroke="#CBD5E1" strokeWidth="1.5" />
      <rect x="60" y="-16" width="250" height="32" rx="4" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2" />
      <text x="185" y="6" textAnchor="middle" fontSize="18" fontWeight="900" fill="#92400E">Invista no seu futuro!</text>
    </motion.g>
  )
}

export function Birds({ still }) {
  return (
    <motion.g
      initial={{ x: -900, y: 60 }}
      animate={still ? undefined : { x: [-900, 2500], y: [60, 30, 70] }}
      transition={{ duration: 46, repeat: Infinity, repeatDelay: 6, ease: 'linear' }}
    >
      {[[0, 0], [-26, -12], [-30, 14], [-56, -2]].map(([x, y], i) => (
        <motion.path
          key={i}
          d={`M${x - 9} ${y} Q ${x - 4} ${y - 7} ${x} ${y} Q ${x + 4} ${y - 7} ${x + 9} ${y}`}
          fill="none"
          stroke="#334155"
          strokeWidth="2.2"
          strokeLinecap="round"
          animate={still ? undefined : { scaleY: [1, -0.6, 1] }}
          transition={{ duration: 0.5, delay: i * 0.12, repeat: Infinity }}
        />
      ))}
    </motion.g>
  )
}
