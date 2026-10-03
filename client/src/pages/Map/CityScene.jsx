import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Balloon, Birds, Mountains, Plane, Skyline, WindTurbine } from './Scenery'
import { BlockContent, BlockGrounds, GridRoads, IsoBox, Tree } from './CityBlocks'
import { BLOCKS, CAR_COLORS } from './cityData'
import {
  FAR, GRASS, HORIZON, L, PLOT, ROAD, ROAD_FRONT, VB_H, VB_W,
  iso, plotCenter, plotRect, plotStart, pts, roadBack, roadStart,
} from './geometry'

// Cena isométrica da cidade: os 6 prédios do jogo no centro, cercados por
// quarteirões decorativos (CityBlocks) e pela paisagem (Scenery).
const ART = 270
const ART_ANCHOR = 0.66
// prédio central (Universidade) aparece maior e com aura
const FEATURED = 'university'
const artSize = (id) => (id === FEATURED ? ART * 1.22 : ART)
// onde o desenho de cada PNG termina (fração da altura, medido pelo alfa);
// a etiqueta fica logo abaixo disso, à mesma distância em todos os prédios
const ART_BOTTOM = { bank: 0.884, leisure: 0.802, university: 0.806, mercadinho: 0.759, utilities: 0.798, internet: 0.786 }
const labelY = (id, y) => y + artSize(id) * ((ART_BOTTOM[id] ?? 0.8) - ART_ANCHOR) + 30
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
  dusk: { top: '#6D4AA8', bottom: '#FDBA74', hillFar: '#9DB98F', treeline: '#7FA57C', overlay: 0.18 },
  night: { top: '#050B24', bottom: '#1E2D64', hillFar: '#5F8A69', treeline: '#4E7A5B', overlay: 0.42 },
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

function Lamp({ u, v, lit }) {
  const [x, y] = iso(u, v)
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-1.5" y="-46" width="3" height="46" fill="#334155" />
      <circle cx="0" cy="-48" r="5" fill={lit ? '#FEF08A' : '#CBD5E1'} />
    </g>
  )
}

function LampGlow({ u, v }) {
  const [x, y] = iso(u, v)
  return <circle cx={x} cy={y - 48} r="26" fill="url(#lamp-glow)" opacity="0.8" />
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

function Building({ b, hovered, setHovered, onSelect, interactive, reduced }) {
  const [i, j] = PLOTS[b.id]
  const [x, y] = iso(...plotCenter(i, j))
  const size = artSize(b.id)
  const imgY = y - size * ART_ANCHOR
  const pending = b.required && !b.done

  const select = () => interactive && onSelect(b)

  return (
    <motion.g
      role="button"
      tabIndex={interactive ? 0 : -1}
      aria-label={`${b.name}: ${b.desc}${b.done ? ' (concluído)' : pending ? ' (pendente)' : ''}`}
      className={interactive ? 'cursor-pointer outline-none' : ''}
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
          cy={imgY + size * 0.4}
          rx={size * 0.5}
          ry={size * 0.42}
          fill="url(#aura)"
          initial={{ opacity: 0.5, scale: 1 }}
          animate={reduced ? undefined : { opacity: [0.45, 0.85, 0.45], scale: [0.96, 1.04, 0.96] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          pointerEvents="none"
        />
      )}
      <image href={b.art} x={x - size / 2} y={imgY} width={size} height={size} pointerEvents="none" />
      {b.id === FEATURED && !reduced && [-70, -40, -12, 18, 46, 74, -55, 60].map((dx, k) => (
        <motion.circle
          key={k}
          cx={x + dx}
          r={k % 3 === 0 ? 4 : 2.6}
          fill="#FDE68A"
          initial={{ cy: imgY + size * 0.62, opacity: 0 }}
          animate={{ cy: [imgY + size * 0.62, imgY + size * 0.05], opacity: [0, 1, 0] }}
          transition={{ duration: 2.8, delay: k * 0.37, repeat: Infinity, ease: 'easeOut' }}
          pointerEvents="none"
        />
      ))}
      <polygon points={pts(plotRect(i, j))} fill="transparent" pointerEvents="all" />
      <rect x={x - size * 0.32} y={imgY + size * 0.12} width={size * 0.64} height={size * 0.6} fill="transparent" pointerEvents="all" />

      {(pending || b.done) && (
        <motion.g
          animate={pending && !reduced ? { y: [0, -10, 0] } : undefined}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
        >
          <g transform={`translate(${x} ${imgY + size * 0.15})`}>
            <path d="M0 18 -8 6 8 6z" fill={pending ? '#F59E0B' : '#16A34A'} />
            <circle r="18" fill={pending ? '#FBBF24' : '#22C55E'} stroke="white" strokeWidth="3" />
            {pending
              ? <text y="8" textAnchor="middle" fontSize="24" fontWeight="900" fill="#78350F">!</text>
              : <path d="m-8 0 5 5 10-10" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
          </g>
        </motion.g>
      )}
    </motion.g>
  )
}

function NameTag({ b, hovered }) {
  const [i, j] = PLOTS[b.id]
  const [x, y] = iso(...plotCenter(i, j))

  // no hover a etiqueta vira um balão com a descrição, no mesmo lugar
  // (abaixo do prédio), para não cobrir o prédio de trás
  if (hovered) {
    const dw = Math.max(b.name.length * 13, b.desc.length * 9) + 40
    const top = labelY(b.id, y) - 26
    return (
      <g pointerEvents="none">
        <rect x={x - dw / 2} y={top} width={dw} height="62" rx="16" fill="rgba(7,17,31,0.92)" stroke="rgba(255,255,255,0.25)" />
        <text x={x} y={top + 26} textAnchor="middle" fontSize="21" fontWeight="900" fill="white">{b.name}</text>
        <text x={x} y={top + 48} textAnchor="middle" fontSize="15" fill="#CBD5E1">{b.desc}</text>
      </g>
    )
  }

  return (
    <g pointerEvents="none">
      <text
        x={x}
        y={labelY(b.id, y)}
        textAnchor="middle"
        fontSize="19"
        fontWeight="900"
        fill="white"
        stroke="rgba(7,17,31,0.85)"
        strokeWidth="5"
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        {b.name}
      </text>
    </g>
  )
}

export default function CityScene({ buildings, onSelect, interactive = true }) {
  const phase = usePhase()
  const sky = SKIES[phase]
  const reduced = useReducedMotion()
  const [hovered, setHovered] = useState(null)
  const [zoomTo, setZoomTo] = useState(null)
  const rootRef = useRef(null)
  const lit = phase !== 'day'

  const handleSelect = (b) => {
    if (reduced) return onSelect(b)
    // o SVG usa "meet": converte o ponto da viewBox para pixels do elemento
    const { width, height } = rootRef.current.getBoundingClientRect()
    const scale = Math.min(width / VIEW.w, height / VIEW.h)
    const [x, y] = iso(...plotCenter(...PLOTS[b.id]))
    const ox = width / 2 + (x - (VIEW.x + VIEW.w / 2)) * scale
    const oy = height / 2 + (y - artSize(b.id) * 0.3 - (VIEW.y + VIEW.h / 2)) * scale
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
    { depth: plotCenter(1, 2).reduce((a, b) => a + b), key: 'fountain', el: <Fountain still={reduced} /> },
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
          reduced={reduced}
        />
      ),
    })),
  ].sort((a, b) => a.depth - b.depth)

  return (
    // o zoom fica preso aqui dentro para não gerar barra de rolagem
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
            animate={reduced ? undefined : { opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2 + (i % 3), repeat: Infinity }}
          />
        ))}
        {phase !== 'night' && <circle cx="1180" cy={phase === 'day' ? 40 : 120} r="44" fill={phase === 'day' ? '#FDE68A' : '#FB923C'} opacity="0.95" />}
        {phase === 'night' && <circle cx="1180" cy="50" r="32" fill="#F1F5F9" />}

        <Mountains phase={phase} />
        <Skyline phase={phase} />
        <path d={wavePath(HORIZON - 4, 34, 180, HORIZON + 40)} fill={sky.hillFar} />
        {[[1420, 0.45], [1490, 0.4], [1560, 0.45], [140, 0.45], [70, 0.4], [-220, 0.45], [1900, 0.4]].map(([x, sc]) => (
          <WindTurbine key={x} x={x} y={HORIZON - 8} scale={sc} still={reduced} />
        ))}
        <path d={wavePath(HORIZON + 10, 10, 140, VB_H + FAR)} fill={GRASS} />
        {/* mata distante ao longo do horizonte: esconde a emenda entre chão e céu */}
        <path d={wavePath(HORIZON + 14, 14, 34, HORIZON + 26)} fill={sky.treeline} />

        <Balloon still={reduced} />
        <Plane still={reduced} />
        <Birds still={reduced} />

        {[[200, 30, 1, 90], [760, -5, 0.8, 110], [1050, 75, 0.6, 130], [-400, 50, 0.9, 100], [1750, 10, 0.7, 120]].map(([x, y, s, d], i) => (
          <Cloud key={i} x0={x} y={y} scale={s} duration={d} still={reduced} />
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
        <Lake still={reduced} />


        {/* névoa de distância: o chão some suavemente perto do horizonte */}
        <rect x={-FAR} y={HORIZON - 20} width={VB_W + 2 * FAR} height="140" fill="url(#haze)" pointerEvents="none" />

        <g clipPath="url(#below-horizon)">
          {cars.map((c, idx) => (
            <Car key={idx} {...c} color={CAR_COLORS[idx % CAR_COLORS.length]} still={reduced} />
          ))}
          <Pedestrian from={[plotStart(0) + 8, roads[0] - 6]} to={[plotStart(0) + PLOT - 8, roads[0] - 6]} color="#A855F7" duration={9} delay={0} still={reduced} />
          <Pedestrian from={[roads[1] + ROAD + 6, plotStart(1) + 10]} to={[roads[1] + ROAD + 6, plotStart(1) + PLOT - 10]} color="#F97316" duration={8} delay={2} still={reduced} />
          <Pedestrian from={[plotStart(1) + 14, plotStart(2) + PLOT - 12]} to={[plotStart(1) + PLOT - 14, plotStart(2) + PLOT - 12]} color="#0EA5E9" duration={10} delay={1} still={reduced} />
        </g>

        {props.map((p) => <g key={p.key}>{p.el}</g>)}

        {phase === 'day' && [[100, 420, 120], [900, 820, 150], [-300, 650, 135]].map(([x, y, d], i) => (
          <CloudShadow key={i} x0={x} y={y} duration={d} still={reduced} />
        ))}

        {sky.overlay > 0 && <rect x={-FAR} y={-FAR} width={VB_W + 2 * FAR} height={VB_H + 2 * FAR} fill="#0B1638" opacity={sky.overlay} pointerEvents="none" />}
        {lit && lamps.map(([u, v]) => <LampGlow key={`g${u}-${v}`} u={u} v={v} />)}

        {/* etiqueta em destaque por último, para ficar por cima das outras */}
        {buildings.filter((b) => PLOTS[b.id])
          .sort((a, b) => (a.id === hovered) - (b.id === hovered))
          .map((b) => <NameTag key={`n${b.id}`} b={b} hovered={hovered === b.id} />)}
      </svg>
    </motion.div>
    </div>
  )
}
