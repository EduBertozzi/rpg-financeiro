import { useEffect, useRef, useState } from 'react'
import { WeatherContext } from './weatherContext'
import { weatherFor } from './weather'
import WeatherLayer from './WeatherLayer'
import CouponTicket from './CouponTicket'
import { motion } from 'framer-motion'
import { Balloon, Birds, Mountains, Plane, Skyline, WindTurbine } from './Scenery'
import { BlockContent, BlockGrounds, GridRoads, IsoBox, Tree } from './CityBlocks'
import { BLOCKS, CAR_COLORS } from './cityData'
import ShopArt, { ShopDefs } from './Shops'
import { Bench, Bus, BusStop, Cyclist, Fireworks, Newsstand, PlazaMonth, Walker } from './CityLife'
import { shopFront, shopTop } from './shopLayout'
import {
  FAR, GRASS, HORIZON, L, PLOT, ROAD, ROAD_FRONT, VB_H, VB_W,
  iso, plotCenter, plotRect, plotStart, pts, roadBack, roadStart,
} from './geometry'

// Cena isométrica da cidade: os 6 prédios do jogo no centro, cercados por
// quarteirões decorativos (CityBlocks) e pela paisagem (Scenery).
// prédio central (a Árvore), com aura e partículas
const FEATURED = 'university'
// a plaquinha com o nome fica presa na frente da base do prédio
const plaqueY = (id) => {
  const [i, j] = PLOTS[id]
  return shopFront(plotStart(i), plotStart(j))[1] - 6
}
// cor da borda da plaquinha de cada prédio
const TAG_COLOR = { bank: '#2457C5', mercadinho: '#2B8C41', utilities: '#C98A12', internet: '#0E8FA6', leisure: '#D63F8C', university: '#2B8C41' }
// Área enquadrada na tela: bem fechada nos 6 prédios do jogo; céu e chão vão
// além dela (overflow visível) e o anel de casas aparece cortado nas bordas.
const VIEW = { x: 150, y: 60, w: 1300, h: 870 }

// A Universidade fica no centro da cidade; os demais ao redor.
const PLOTS = {
  bank: [0, 0],
  utilities: [1, 0],
  internet: [2, 0],
  mercadinho: [0, 1],
  university: [1, 1],
  leisure: [2, 1],
}

const SKIES = {
  day: { top: '#5EB8F2', bottom: '#DDF2FF', hillFar: '#A7D9A0', treeline: '#86BE82', overlay: 0 },
  dusk: { top: '#6D4AA8', bottom: '#FDBA74', hillFar: '#9DB98F', treeline: '#7FA57C', overlay: 0.12 },
  night: { top: '#050B24', bottom: '#1E2D64', hillFar: '#5F8A69', treeline: '#4E7A5B', overlay: 0.28 },
}

const STARS = Array.from({ length: 34 }, (_, i) => [
  -900 + ((i * 397) % 3400),
  -40 + ((i * 131) % (HORIZON - 60)),
])

// colinas onduladas ao longo do horizonte
const wavePath = (base, amp, step, close) => {
  let d = `M${-FAR} ${base} L-900 ${base}`
  for (let x = -900; x < 2500; x += step) d += ` Q ${x + step / 2} ${base - amp * (x % (step * 2) === 0 ? 1 : 0.55)} ${x + step} ${base}`
  return `${d} L${VB_W + FAR} ${base} L${VB_W + FAR} ${close} L${-FAR} ${close}Z`
}

const getPhase = () => {
  const h = new Date().getHours()
  if (h >= 6 && h < 17) return 'day'
  if (h >= 17 && h < 19) return 'dusk'
  return 'night'
}

function usePhase() {
  const [phase, setPhase] = useState(getPhase)
  useEffect(() => {
    const id = setInterval(() => setPhase(getPhase()), 60_000)
    return () => clearInterval(id)
  }, [])
  return phase
}

function Car({ axis, lane, reverse, color, duration, delay, still }) {
  const from = axis === 'v' ? iso(lane, roadBack(lane)) : iso(roadBack(lane), lane)
  const to = axis === 'v' ? iso(lane, ROAD_FRONT) : iso(ROAD_FRONT, lane)
  const [start, end] = reverse ? [to, from] : [from, to]
  const [du, dv] = axis === 'v' ? [20, 36] : [36, 20]
  const [top, right, left] = color

  return (
    <motion.g
      initial={{ x: start[0], y: start[1] }}
      animate={still ? undefined : { x: [start[0], end[0]], y: [start[1], end[1]] }}
      transition={{ duration, delay, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
    >
      <ellipse cx="0" cy="4" rx="26" ry="10" fill="rgba(0,0,0,0.22)" />
      <IsoBox du={du} dv={dv} h={10} top={top} left={left} right={right} />
      <IsoBox du={du * 0.7} dv={dv * 0.5} h={7} z={10} top="#E0F2FE" left="#7DD3FC" right="#38BDF8" />
    </motion.g>
  )
}

function Pedestrian({ from, to, color, duration, delay, still }) {
  const [x0, y0] = iso(...from)
  const [x1, y1] = iso(...to)
  return (
    <motion.g
      initial={{ x: x0, y: y0 }}
      animate={still ? undefined : { x: [x0, x1], y: [y0, y1] }}
      transition={{ duration, delay, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
    >
      <ellipse cx="0" cy="1" rx="6" ry="3" fill="rgba(0,0,0,0.25)" />
      <motion.g
        animate={still ? undefined : { y: [0, -2, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
      >
        <rect x="-4" y="-16" width="8" height="14" rx="4" fill={color} />
        <circle cx="0" cy="-20" r="4.5" fill="#FCD9B6" />
      </motion.g>
    </motion.g>
  )
}

// Um cachorro passeando ao lado do dono: vai, vira e volta, abanando o rabo.
function Dog({ from, to, duration, delay, still }) {
  const [x0, y0] = iso(...from)
  const [x1, y1] = iso(...to)
  const walk = { duration: duration * 2, delay, repeat: Infinity, ease: 'linear', times: [0, 0.48, 0.5, 0.98, 1] }
  return (
    <motion.g
      initial={{ x: x0, y: y0 }}
      animate={still ? undefined : { x: [x0, x1, x1, x0, x0], y: [y0, y1, y1, y0, y0] }}
      transition={walk}
    >
      <ellipse cx="0" cy="1" rx="8" ry="3" fill="rgba(0,0,0,0.22)" />
      {/* vira para o lado em que está andando (o desenho olha para a direita) */}
      <motion.g
        initial={{ scaleX: x1 >= x0 ? 1 : -1 }}
        animate={still ? undefined : { scaleX: x1 >= x0 ? [1, 1, -1, -1, 1] : [-1, -1, 1, 1, -1] }}
        transition={walk}
      >
        <motion.g animate={still ? undefined : { y: [0, -1.5, 0] }} transition={{ duration: 0.3, repeat: Infinity }}>
          <rect x="-6" y="-4" width="2.5" height="5" rx="1" fill="#8A5A34" />
          <rect x="3" y="-4" width="2.5" height="5" rx="1" fill="#8A5A34" />
          <ellipse cx="0" cy="-6" rx="8" ry="4.5" fill="#C9874B" />
          <ellipse cx="-1" cy="-7.5" rx="4" ry="1.6" fill="#E3A96A" />
          <circle cx="8" cy="-10" r="4" fill="#C9874B" />
          <ellipse cx="11.2" cy="-9" rx="2" ry="1.4" fill="#E3A96A" />
          <circle cx="12.6" cy="-9.4" r="0.9" fill="#24331F" />
          <circle cx="8.6" cy="-11" r="0.8" fill="#24331F" />
          <path d="M6 -13 q-1 4 1 5" fill="#8A5A34" />
          <motion.path
            d="M-7.5 -7 q-4 -3 -3 -7"
            stroke="#C9874B" strokeWidth="2.2" strokeLinecap="round" fill="none"
            style={{ originX: '-7.5px', originY: '-7px' }}
            animate={still ? undefined : { rotate: [-18, 18, -18] }}
            transition={{ duration: 0.35, repeat: Infinity }}
          />
        </motion.g>
      </motion.g>
    </motion.g>
  )
}

// poste: haste, braço e a luminária; de noite acende forte
function Lamp({ u, v, lit }) {
  const [x, y] = iso(u, v)
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="1" rx="5" ry="2.5" fill="rgba(0,0,0,0.2)" />
      <rect x="-2" y="-50" width="4" height="50" rx="1.5" fill="#3B4A5E" />
      <path d="M0 -50 q0 -6 7 -6" stroke="#3B4A5E" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M3 -58 h9 l-2 5 h-5 z" fill="#3B4A5E" />
      <ellipse cx="7.5" cy="-52.5" rx="3.5" ry="2" fill={lit ? '#FFF3B0' : '#CBD5E1'} />
    </g>
  )
}

// a luz do poste: brilho em volta da lâmpada e uma poça de luz no chão
function LampGlow({ u, v }) {
  const [x, y] = iso(u, v)
  return (
    <g pointerEvents="none" style={{ mixBlendMode: 'screen' }}>
      <ellipse cx={x + 6} cy={y + 4} rx="46" ry="20" fill="url(#lamp-glow)" opacity="0.55" />
      <circle cx={x + 7.5} cy={y - 52} r="40" fill="url(#lamp-glow)" />
    </g>
  )
}

function Fountain({ still }) {
  const [x, y] = iso(...plotCenter(1, 2))
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="6" rx="78" ry="38" fill="#94A3B8" />
      <ellipse cx="0" cy="0" rx="72" ry="34" fill="#CBD5E1" />
      <ellipse cx="0" cy="2" rx="60" ry="27" fill="#38BDF8" />
      <rect x="-6" y="-38" width="12" height="40" rx="3" fill="#E2E8F0" />
      <ellipse cx="0" cy="-38" rx="18" ry="7" fill="#E2E8F0" />
      {[-1, 1, -0.5, 0.5].map((dir, i) => (
        <motion.circle
          key={i}
          r="3.5"
          fill="#BAE6FD"
          initial={{ cx: 0, cy: -42, opacity: 0 }}
          animate={still ? undefined : { cx: [0, dir * 34], cy: [-42, -64, -4], opacity: [1, 1, 0] }}
          transition={{ duration: 1.4, delay: i * 0.35, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}
    </g>
  )
}

function Lake({ still }) {
  const [x, y] = iso(...plotCenter(2, 2))
  return (
    <g>
      <polygon points={pts(plotRect(2, 2, 22))} fill="url(#water)" stroke="#7DD3FC" strokeWidth="4" />
      {[[-60, -6, 0], [40, 18, 0.8], [10, -30, 1.6]].map(([dx, dy, d], i) => (
        <motion.ellipse
          key={i}
          cx={x + dx}
          cy={y + dy}
          rx="26"
          ry="5"
          fill="#E0F2FE"
          initial={{ opacity: 0.2 }}
          animate={still ? undefined : { opacity: [0.15, 0.6, 0.15] }}
          transition={{ duration: 3, delay: d, repeat: Infinity }}
        />
      ))}
      <motion.g
        initial={{ x: x - 30, y: y + 6 }}
        animate={still ? undefined : { x: [x - 30, x + 40, x - 30], y: [y + 6, y - 14, y + 6] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      >
        <ellipse cx="0" cy="0" rx="10" ry="6" fill="#FDE047" />
        <circle cx="8" cy="-6" r="5" fill="#FDE047" />
        <path d="M12 -6 l5 1 -5 1z" fill="#F97316" />
      </motion.g>
    </g>
  )
}

function Cloud({ x0, y, scale, duration, still }) {
  const [left, right] = [-700, VB_W + 700]
  const t = (right - x0) / (right - left)
  return (
    <motion.g
      initial={{ x: x0, y }}
      animate={still ? undefined : { x: [x0, right, left, x0] }}
      transition={{ duration, times: [0, t, t + 0.0001, 1], repeat: Infinity, ease: 'linear' }}
    >
      <g transform={`scale(${scale})`} fill="white" opacity="0.9">
        <ellipse cx="0" cy="0" rx="60" ry="24" />
        <ellipse cx="-34" cy="6" rx="38" ry="18" />
        <ellipse cx="36" cy="8" rx="42" ry="18" />
        <ellipse cx="6" cy="-16" rx="34" ry="22" />
      </g>
    </motion.g>
  )
}

function CloudShadow({ x0, y, duration, still }) {
  const [left, right] = [-900, VB_W + 900]
  const t = (right - x0) / (right - left)
  return (
    <motion.ellipse
      cx="0"
      cy={y}
      rx="190"
      ry="70"
      fill="#0F172A"
      opacity="0.07"
      pointerEvents="none"
      initial={{ x: x0 }}
      animate={still ? undefined : { x: [x0, right, left, x0] }}
      transition={{ duration, times: [0, t, t + 0.0001, 1], repeat: Infinity, ease: 'linear' }}
    />
  )
}

// prédios que o tour aponta (data-tour)
const TOUR_TARGET = { bank: 'banco', university: 'arvore' }

function Building({ b, hovered, setHovered, onSelect, interactive, lit, month }) {
  const [i, j] = PLOTS[b.id]
  const [x, y] = iso(...plotCenter(i, j))
  const top = y - shopTop(b.id)
  const pending = b.required && !b.done

  const select = () => interactive && onSelect(b)

  return (
    <motion.g
      data-tour={TOUR_TARGET[b.id]}
      // fora de jogo (sala esperando) a casinha nem recebe foco: senão o clique
      // desenhava o contorno cinza do navegador em volta dela
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={`${b.name}: ${b.desc}${b.done ? ' (concluído)' : pending ? ' (pendente)' : ''}`}
      className={interactive ? 'cursor-pointer outline-none' : 'outline-none'}
      onMouseEnter={() => setHovered(b.id)}
      onMouseLeave={() => setHovered(null)}
      onFocus={() => setHovered(b.id)}
      onBlur={() => setHovered(null)}
      onClick={select}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          select()
        }
      }}
      animate={{ y: hovered ? -12 : 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
    >
      <motion.ellipse
        cx={x}
        cy={y + 6}
        rx="130"
        ry="62"
        fill={b.glow}
        animate={{ opacity: hovered ? 0.9 : 0 }}
        style={{ filter: 'blur(14px)' }}
      />
      {b.id === FEATURED && (
        <motion.ellipse
          cx={x}
          cy={y - 110}
          rx="105"
          ry="92"
          fill="url(#aura)"
          initial={{ opacity: 0.5, scale: 1 }}
          animate={{ opacity: [0.4, 0.75, 0.4], scale: [0.96, 1.04, 0.96] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          pointerEvents="none"
        />
      )}
      <ShopArt id={b.id} pu={plotStart(i)} pv={plotStart(j)} lit={lit} month={month} state={{ paid: b.required && b.done, invested: b.invested, skills: b.skills }} />
      {b.id === FEATURED && [-60, -36, -12, 14, 38, 62, -48, 52].map((dx, k) => (
        <motion.circle
          key={k}
          cx={x + dx}
          r={k % 3 === 0 ? 3.6 : 2.4}
          fill="#FDE68A"
          initial={{ cy: y - 60, opacity: 0 }}
          animate={{ cy: [y - 60, y - 200], opacity: [0, 1, 0] }}
          transition={{ duration: 2.8, delay: k * 0.37, repeat: Infinity, ease: 'easeOut' }}
          pointerEvents="none"
        />
      ))}
      <polygon points={pts(plotRect(i, j))} fill="transparent" pointerEvents="all" />
      <rect x={x - 70} y={top} width="140" height={y - top} fill="transparent" pointerEvents="all" />

    </motion.g>
  )
}

// "!" (falta fazer) ou "✓" (feito) em cima do prédio. Fica numa camada por
// cima da noite e da chuva (como as plaquinhas), para não ficar apagado.
function StatusBadge({ b }) {
  const pending = b.required && !b.done
  const points = b.points ?? 0 // pontos para gastar na árvore
  if (!pending && !b.done && !points) return null
  const [i, j] = PLOTS[b.id]
  const [x, y] = iso(...plotCenter(i, j))
  // centrado, logo acima do telhado (sem subir até o nome do prédio de trás)
  const top = y - shopTop(b.id) * 0.8
  const bounce = pending || points > 0
  return (
    <motion.g
      pointerEvents="none"
      animate={bounce ? { y: [0, -8, 0] } : undefined}
      transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
    >
      <g transform={`translate(${x} ${top})`}>
        {points > 0 ? (
          <>
            <circle r="32" fill="#B197FC" opacity=".3" />
            <path d="M0 24 -9 9 9 9z" fill="#6538C9" />
            <circle r="22" fill="#8A5CF6" stroke="#FFFFFF" strokeWidth="4" />
            <text y="9" textAnchor="middle" fontSize="26" fontWeight="900" fill="#FFFFFF" fontFamily="'Baloo 2', Outfit, sans-serif">{points}</text>
          </>
        ) : (
          <>
            {pending && <circle r="32" fill="#FFD43B" opacity=".28" />}
            <path d="M0 24 -9 9 9 9z" fill={pending ? '#E67700' : '#2B8A3E'} />
            <circle r="22" fill={pending ? '#FFC21A' : '#2FB344'} stroke="#FFFFFF" strokeWidth="4" />
            {pending
              ? <text y="10" textAnchor="middle" fontSize="30" fontWeight="900" fill="#5C2A00" fontFamily="'Baloo 2', Outfit, sans-serif">!</text>
              : <path d="m-9 0 6 6 12-12" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />}
          </>
        )}
      </g>
    </motion.g>
  )
}

function NameTag({ b, hovered }) {
  const [i, j] = PLOTS[b.id]
  const [x] = iso(...plotCenter(i, j))

  // no hover a etiqueta vira um balão com a descrição, no mesmo lugar
  // (abaixo do prédio), para não cobrir o prédio de trás
  if (hovered) {
    const dw = Math.max(b.name.length * 13, b.desc.length * 9) + 40
    const top = plaqueY(b.id) - 17
    return (
      <g pointerEvents="none">
        <rect x={x - dw / 2} y={top + 6} width={dw} height="62" rx="18" fill="#E2D6BE" />
        <rect x={x - dw / 2} y={top} width={dw} height="62" rx="18" fill="#FFFDF7" />
        <text x={x} y={top + 27} textAnchor="middle" fontSize="23" fontWeight="800" fill="#24331F" fontFamily="'Baloo 2', Outfit, sans-serif">{b.name}</text>
        <text x={x} y={top + 48} textAnchor="middle" fontSize="15" fill="#6B7A62">{b.desc}</text>
      </g>
    )
  }

  const color = TAG_COLOR[b.id] ?? '#24331F'
  const w = Math.round(b.name.length * 10.6 + 34)
  const top = plaqueY(b.id) - 17
  return (
    <g pointerEvents="none">
      <rect x={x - w / 2} y={top + 4} width={w} height="34" rx="17" fill={color} />
      <rect x={x - w / 2} y={top} width={w} height="34" rx="17" fill="#FFFDF7" stroke={color} strokeWidth="3" />
      <text x={x} y={top + 23} textAnchor="middle" fontSize="18" fontWeight="800" fill="#24331F" fontFamily="'Baloo 2', Outfit, sans-serif">
        {b.name}
      </text>
    </g>
  )
}

// Bandeirinhas de Festa Junina ou luzinhas de Natal cruzando a praça.
function PlazaDeco({ kind }) {
  const a = plotStart(1) + 14, b = plotStart(1) + PLOT - 14, c = plotStart(2) + 14, d = plotStart(2) + PLOT - 14
  // duas cordas atravessando a praça, uma mais ao fundo e outra mais à frente
  const strings = [[iso(a - 10, d - 40), iso(b - 40, c - 10)], [iso(a + 30, d + 10), iso(b + 10, c + 30)]]
  const COLORS = ['#FF5C8A', '#FFC857', '#3DBE5A', '#5AA2FF', '#B884FF']
  return (
    <g pointerEvents="none">
      {strings.map(([[x1, y1], [x2, y2]], si) => {
        const top = 70
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - top + 34
        const at = (t) => [(1 - t) ** 2 * x1 + 2 * (1 - t) * t * mx + t ** 2 * x2, (1 - t) ** 2 * (y1 - top) + 2 * (1 - t) * t * my + t ** 2 * (y2 - top)]
        return (
          <g key={si}>
            <line x1={x1} y1={y1} x2={x1} y2={y1 - top} stroke="#7A5232" strokeWidth="3" />
            <line x1={x2} y1={y2} x2={x2} y2={y2 - top} stroke="#7A5232" strokeWidth="3" />
            <path d={`M${x1} ${y1 - top} Q${mx} ${my} ${x2} ${y2 - top}`} fill="none" stroke={kind === 'lights' ? '#2B3B2B' : '#7A5232'} strokeWidth="1.5" />
            {Array.from({ length: 11 }, (_, i) => {
              const [x, y] = at((i + 0.5) / 11)
              const color = COLORS[(i + si) % COLORS.length]
              return kind === 'lights'
                ? <circle key={i} cx={x} cy={y + 5} r="4.5" fill={color}><animate attributeName="opacity" values="1;.35;1" dur={`${1.2 + (i % 3) * 0.4}s`} repeatCount="indefinite" /></circle>
                : <path key={i} d={`M${x - 7} ${y} h14 l-7 14z`} fill={color} />
            })}
          </g>
        )
      })}
    </g>
  )
}

export default function CityScene({ buildings, onSelect, interactive = true, month = 0, coupon = null, onCoupon }) {
  const weather = weatherFor(month)
  const phase = usePhase()
  const sky = SKIES[phase]
  const [hovered, setHovered] = useState(null)
  const [zoomTo, setZoomTo] = useState(null)
  const rootRef = useRef(null)
  const lit = phase !== 'day'

  const handleSelect = (b) => {
    // o SVG usa "meet": converte o ponto da viewBox para pixels do elemento
    const { width, height } = rootRef.current.getBoundingClientRect()
    const scale = Math.min(width / VIEW.w, height / VIEW.h)
    const [x, y] = iso(...plotCenter(...PLOTS[b.id]))
    const ox = width / 2 + (x - (VIEW.x + VIEW.w / 2)) * scale
    const oy = height / 2 + (y - 70 - (VIEW.y + VIEW.h / 2)) * scale
    setHovered(null)
    setZoomTo({ b, origin: `${ox}px ${oy}px` })
  }

  const roads = [0, 1].map(roadStart)
  // Cada cruzamento do centro é a frente de um prédio do jogo (onde fica a
  // etiqueta), então os postes ficam nos cruzamentos da frente da praça,
  // do parque e do lago, onde não há etiqueta.
  const frontRoad = roadStart(2)
  const lamps = [roads[0], roads[1], frontRoad].flatMap((a) => [[a - 8, frontRoad + ROAD + 8], [a + ROAD + 8, frontRoad - 8]])

  // poucos carros, só nas duas ruas principais
  const cars = [
    { axis: 'v', lane: roads[0] + ROAD * 0.3, reverse: false, duration: 24, delay: 0 },
    { axis: 'v', lane: roads[1] + ROAD * 0.7, reverse: true, duration: 28, delay: 4 },
    { axis: 'u', lane: roads[0] + ROAD * 0.7, reverse: false, duration: 26, delay: 2 },
    { axis: 'u', lane: roads[1] + ROAD * 0.3, reverse: true, duration: 22, delay: 7 },
  ]


  const trees = [
    ...[[0.2, 0.25], [0.55, 0.15], [0.8, 0.4], [0.3, 0.6], [0.65, 0.65], [0.2, 0.85], [0.85, 0.85]]
      .map(([fu, fv]) => [plotStart(0) + fu * PLOT, plotStart(2) + fv * PLOT, 1]),
    ...Object.values(PLOTS).map(([i, j]) => [plotStart(i) + 16, plotStart(j) + 16, 0.7]),
    [L - 14, plotStart(2) + 20, 0.8],
    [plotStart(2) + 20, L - 14, 0.8],
  ].sort((a, b) => a[0] + a[1] - (b[0] + b[1]))

  // Profundidade: o que está mais "à frente" (u + v maior) é desenhado por último.
  const props = [
    ...BLOCKS.map((blk) => ({
      depth: plotCenter(blk.i, blk.j).reduce((a, c) => a + c),
      key: `b${blk.i},${blk.j}`,
      el: <BlockContent {...blk} lit={lit} />,
    })),
    ...trees.map(([u, v, s]) => ({ depth: u + v, key: `t${u}-${v}`, el: <Tree u={u} v={v} scale={s} /> })),
    ...lamps.map(([u, v]) => ({ depth: u + v, key: `l${u}-${v}`, el: <Lamp u={u} v={v} lit={lit} /> })),
    { depth: plotCenter(1, 2).reduce((a, b) => a + b), key: 'fountain', el: <Fountain /> },
    // praça: ponto de ônibus, bancos, banca de jornal e o enfeite do mês
    { depth: plotStart(1) + plotStart(2), key: 'busstop', el: <BusStop /> },
    { depth: plotStart(1) + plotStart(2) + 60, key: 'bench1', el: <Bench u={plotStart(1) + 30} v={plotStart(2) + 42} /> },
    { depth: plotStart(1) + plotStart(2) + PLOT * 1.6, key: 'bench2', el: <Bench u={plotStart(1) + PLOT - 30} v={plotStart(2) + PLOT - 40} /> },
    { depth: plotStart(1) + plotStart(2) + PLOT, key: 'kiosk', el: <Newsstand u={plotStart(1) + 24} v={plotStart(2) + PLOT - 34} /> },
    { depth: plotCenter(1, 2).reduce((a, b) => a + b) + 1, key: 'plaza-month', el: <PlazaMonth month={month} /> },
    ...buildings.filter((b) => PLOTS[b.id]).map((b) => ({
      depth: plotCenter(...PLOTS[b.id]).reduce((a, c) => a + c),
      key: b.id,
      el: (
        <Building
          b={b}
          hovered={hovered === b.id}
          setHovered={interactive ? setHovered : () => {}}
          onSelect={handleSelect}
          interactive={interactive}
          lit={lit}
          month={month}
        />
      ),
    })),
  ].sort((a, b) => a.depth - b.depth)

  return (
    // o zoom fica preso aqui dentro para não gerar barra de rolagem
    <WeatherContext.Provider value={weather}>
    <div ref={rootRef} className="relative h-full w-full overflow-hidden">
    <motion.div
      className="relative h-full w-full"
      style={{ transformOrigin: zoomTo?.origin ?? '50% 50%' }}
      animate={zoomTo ? { scale: 2.2, opacity: 0.4 } : { scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.65, 0, 0.35, 1] }}
      onAnimationComplete={() => {
        if (!zoomTo) return
        const { b } = zoomTo
        setZoomTo(null)
        onSelect(b)
      }}
    >
      <svg
        viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
        className="absolute inset-0 h-full w-full select-none overflow-visible"
        role="group"
        aria-label="Mapa da cidade"
      >
        <defs>
          <linearGradient id="sky" gradientUnits="userSpaceOnUse" x1="0" y1="-200" x2="0" y2={HORIZON}>
            <stop offset="0" stopColor={sky.top} />
            <stop offset="1" stopColor={sky.bottom} />
          </linearGradient>
          <linearGradient id="water" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#38BDF8" />
            <stop offset="1" stopColor="#0369A1" />
          </linearGradient>
          <linearGradient id="haze" gradientUnits="userSpaceOnUse" x1="0" y1={HORIZON - 20} x2="0" y2={HORIZON + 120}>
            <stop offset="0" stopColor={sky.bottom} stopOpacity="0.85" />
            <stop offset="1" stopColor={sky.bottom} stopOpacity="0" />
          </linearGradient>
          <radialGradient id="aura">
            <stop offset="0" stopColor="#FDE68A" stopOpacity="0.75" />
            <stop offset="0.6" stopColor="#C084FC" stopOpacity="0.25" />
            <stop offset="1" stopColor="#C084FC" stopOpacity="0" />
          </radialGradient>
          <ShopDefs />
          <radialGradient id="window-glow">
            <stop offset="0" stopColor="#FFD98A" stopOpacity="0.55" />
            <stop offset="0.55" stopColor="#FFC56B" stopOpacity="0.22" />
            <stop offset="1" stopColor="#FFC56B" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="lamp-glow">
            <stop offset="0" stopColor="#FEF08A" stopOpacity="0.85" />
            <stop offset="1" stopColor="#FEF08A" stopOpacity="0" />
          </radialGradient>
          <clipPath id="below-horizon">
            <rect x={-FAR} y={HORIZON + 4} width={VB_W + 2 * FAR} height={FAR} />
          </clipPath>
        </defs>

        <rect x={-FAR} y={-FAR} width={VB_W + 2 * FAR} height={VB_H + 2 * FAR} fill="url(#sky)" />

        {phase === 'night' && STARS.map(([x, y], i) => (
          <motion.circle
            key={i}
            cx={x}
            cy={y}
            r="2.5"
            fill="white"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2 + (i % 3), repeat: Infinity }}
          />
        ))}
        {phase !== 'night' && <circle cx="1180" cy={phase === 'day' ? 40 : 120} r="44" fill={phase === 'day' ? '#FDE68A' : '#FB923C'} opacity="0.95" />}
        {phase === 'night' && <circle cx="1180" cy="50" r="32" fill="#F1F5F9" />}

        <Mountains phase={phase} />
        <Skyline phase={phase} />
        <path d={wavePath(HORIZON - 4, 34, 180, HORIZON + 40)} fill={sky.hillFar} />
        {[[1420, 0.45], [1490, 0.4], [1560, 0.45], [140, 0.45], [70, 0.4], [-220, 0.45], [1900, 0.4]].map(([x, sc]) => (
          <WindTurbine key={x} x={x} y={HORIZON - 8} scale={sc} />
        ))}
        <path d={wavePath(HORIZON + 10, 10, 140, VB_H + FAR)} fill={GRASS} />
        {/* mata distante ao longo do horizonte: esconde a emenda entre chão e céu */}
        <path d={wavePath(HORIZON + 14, 14, 34, HORIZON + 26)} fill={sky.treeline} />

        <Balloon />
        <Plane />
        <Birds />

        {[[200, 30, 1, 90], [760, -5, 0.8, 110], [1050, 75, 0.6, 130], [-400, 50, 0.9, 100], [1750, 10, 0.7, 120]].map(([x, y, s, d], i) => (
          <Cloud key={i} x0={x} y={y} scale={s} duration={d} />
        ))}

        <BlockGrounds />
        <GridRoads />

        {/* lotes */}
        {[0, 1, 2].flatMap((i) => [0, 1, 2].map((j) => (
          <g key={`p${i}${j}`}>
            <polygon points={pts(plotRect(i, j))} fill="#D6D3D1" />
            <polygon points={pts(plotRect(i, j, 10))} fill={i === 1 && j === 2 ? '#E7E5E4' : '#86D47A'} />
          </g>
        )))}
        <Lake />


        {/* névoa de distância: o chão some suavemente perto do horizonte */}
        <rect x={-FAR} y={HORIZON - 20} width={VB_W + 2 * FAR} height="140" fill="url(#haze)" pointerEvents="none" />

        <g clipPath="url(#below-horizon)">
          {cars.map((c, idx) => (
            <Car key={idx} {...c} color={CAR_COLORS[idx % CAR_COLORS.length]} />
          ))}
          <Pedestrian from={[plotStart(0) + 8, roads[0] - 6]} to={[plotStart(0) + PLOT - 8, roads[0] - 6]} color="#A855F7" duration={9} delay={0} />
          <Dog from={[plotStart(1) + 10, plotStart(2) + PLOT - 22]} to={[plotStart(1) + PLOT - 18, plotStart(2) + PLOT - 22]} duration={9} delay={0.6} />
          <Pedestrian from={[roads[1] + ROAD + 6, plotStart(1) + 10]} to={[roads[1] + ROAD + 6, plotStart(1) + PLOT - 10]} color="#F97316" duration={8} delay={2} />
          <Pedestrian from={[plotStart(1) + 14, plotStart(2) + PLOT - 12]} to={[plotStart(1) + PLOT - 14, plotStart(2) + PLOT - 12]} color="#0EA5E9" duration={10} delay={1} />
          {/* gente com sacola saindo do mercadinho e do banco, ciclista e o ônibus */}
          <Walker from={[plotStart(0) + 12, roads[1] - 8]} to={[plotStart(0) + PLOT - 12, roads[1] - 8]} color="#EF4E3E" bag="#7DCB55" duration={11} delay={0.5} />
          <Walker from={[roads[0] + ROAD + 8, plotStart(0) + 12]} to={[roads[0] + ROAD + 8, plotStart(0) + PLOT - 12]} color="#5B8EEB" bag="#F5BC42" duration={10} delay={1.5} />
          <Walker from={[plotStart(2) + 10, roads[1] + ROAD + 8]} to={[plotStart(2) + PLOT - 10, roads[1] + ROAD + 8]} color="#F06AAE" bag="#FFFFFF" duration={12} delay={3} />
          <Cyclist lane={roads[0] + ROAD * 0.88} />
          <Bus />
        </g>

        {props.map((p) => <g key={p.key}>{p.el}</g>)}

        {phase === 'day' && [[100, 420, 120], [900, 820, 150], [-300, 650, 135]].map(([x, y, d], i) => (
          <CloudShadow key={i} x0={x} y={y} duration={d} />
        ))}

        {weather?.deco && <PlazaDeco kind={weather.deco} />}
        {month === 1 && <Fireworks />}
        {weather?.tint && <rect x={-FAR} y={-FAR} width={VB_W + 2 * FAR} height={VB_H + 2 * FAR} fill={weather.tint} pointerEvents="none" />}
        {sky.overlay > 0 && <rect x={-FAR} y={-FAR} width={VB_W + 2 * FAR} height={VB_H + 2 * FAR} fill="#0B1638" opacity={sky.overlay} pointerEvents="none" />}
        {lit && lamps.map(([u, v]) => <LampGlow key={`g${u}-${v}`} u={u} v={v} />)}
        {/* de noite os prédios do jogo ficam acesos: luz quente das janelas */}
        {lit && buildings.filter((b) => PLOTS[b.id]).map((b) => {
          const [bx, by] = iso(...plotCenter(...PLOTS[b.id]))
          return <ellipse key={`l${b.id}`} cx={bx} cy={by - 50} rx="130" ry="100" fill="url(#window-glow)" style={{ mixBlendMode: 'screen' }} pointerEvents="none" />
        })}

        {/* etiqueta em destaque por último, para ficar por cima das outras */}
        {buildings.filter((b) => PLOTS[b.id])
          .sort((a, b) => (a.id === hovered) - (b.id === hovered))
          .map((b) => <NameTag key={`n${b.id}`} b={b} hovered={hovered === b.id} />)}
        {buildings.filter((b) => PLOTS[b.id]).map((b) => <StatusBadge key={`s${b.id}`} b={b} />)}

        {/* o cupom fica por cima de tudo, até do clima */}
        {coupon && interactive && <CouponTicket spot={coupon.spot} onClaim={onCoupon} />}
      </svg>
    </motion.div>
    <WeatherLayer fx={weather?.fx} />
    </div>
    </WeatherContext.Provider>
  )
}
