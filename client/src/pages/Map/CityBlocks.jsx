import { useContext } from 'react'
import { WeatherContext } from './weatherContext'
import { treeColors } from './weather'
import { HORIZON, PLOT, ROAD, ROAD_FRONT, iso, isoAt, plotRect, plotStart, pts, relPts, roadBack } from './geometry'
import { BLOCKS, GRID_ROADS, MAIN_ROADS, RING_END, RING_START, pick, rng } from './cityData'

// Desenho do anel de quarteirões calmos (casas, praças, matas) e das ruas.

// Cores apagadas de propósito: o anel é cenário, quem chama atenção são os
// 6 prédios do jogo. [topo, face +v (clara), face +u (sombra)]
const WALLS = [
  ['#F1EEE8', '#E7E2D9', '#C2BBAE'],
  ['#EFE8D6', '#E4DAC1', '#BFB294'],
  ['#E6EAEE', '#D8DEE4', '#AEB7C1'],
]
const ROOFS = [['#C98A7E', '#A8706A'], ['#8EA3B8', '#73879B'], ['#9DB59A', '#7F977C'], ['#C9AE84', '#A88F68']]
const RING_GRASS = '#A3CF95'
const PATH = '#E4DFD3'
const FIELDS = [['#C9D6A3', '#B8C78F'], ['#D8D2A6', '#C7BF8E'], ['#B7CF9C', '#A5BF89']]

// Caixa isométrica relativa à origem — usada nos carros em movimento.
export function IsoBox({ du, dv, h, z = 0, top, left, right }) {
  const base = [[0, 0], [du, 0], [du, dv], [0, dv]].map(([u, v]) => [u - du / 2, v - dv / 2])
  const [a, b, c, d] = base
  return (
    <>
      <polygon points={relPts([d, c], -z) + ' ' + relPts([c, d], -z - h)} fill={left} />
      <polygon points={relPts([b, c], -z) + ' ' + relPts([c, b], -z - h)} fill={right} />
      <polygon points={relPts([a, b, c, d], -z - h)} fill={top} />
    </>
  )
}

function House({ u, v, du, dv, h, rh = 14, wall, roof, lit }) {
  const m = v + dv / 2
  const face = (list) => list.map(([uu, vv, z]) => isoAt(uu, vv, z)).join(' ')
  return (
    <g>
      <polygon points={face([[u, v + dv, 0], [u + du, v + dv, 0], [u + du, v + dv, h], [u, v + dv, h]])} fill={wall[1]} />
      <polygon points={face([[u + du, v, 0], [u + du, v + dv, 0], [u + du, v + dv, h], [u + du, v, h]])} fill={wall[2]} />
      <polygon points={face([[u, v, h], [u + du, v, h], [u + du, m, h + rh], [u, m, h + rh]])} fill={roof[1]} />
      <polygon points={face([[u + du, v, h], [u + du, v + dv, h], [u + du, m, h + rh]])} fill={wall[2]} />
      <polygon points={face([[u, v + dv, h], [u + du, v + dv, h], [u + du, m, h + rh], [u, m, h + rh]])} fill={roof[0]} />
      <polygon points={face([[u + du * 0.4, v + dv, 0], [u + du * 0.6, v + dv, 0], [u + du * 0.6, v + dv, h * 0.55], [u + du * 0.4, v + dv, h * 0.55]])} fill="#92400E" />
      <polygon points={face([[u + du, v + dv * 0.3, h * 0.35], [u + du, v + dv * 0.6, h * 0.35], [u + du, v + dv * 0.6, h * 0.75], [u + du, v + dv * 0.3, h * 0.75]])} fill={lit ? '#FDE68A' : '#BAE6FD'} />
    </g>
  )
}

export function Tree({ u, v, scale = 1, muted }) {
  const weather = useContext(WeatherContext)
  const [x, y] = iso(u, v)
  const [dark, light] = treeColors(weather, { muted, u: Math.round(u / 40), v: Math.round(v / 40) })
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="0" cy="2" rx="20" ry="9" fill="rgba(0,0,0,0.22)" />
      <rect x="-3.5" y="-22" width="7" height="24" rx="2" fill="#8B5A2B" />
      <circle cx="0" cy="-38" r="20" fill={dark} />
      <circle cx="-7" cy="-44" r="11" fill={light} opacity="0.9" />
      {weather?.snow && <path d="M-17 -48 a18 12 0 0 1 34 0 q-8 4 -17 2 q-9 2 -17 -2z" fill="#fff" opacity="0.95" />}
    </g>
  )
}

// O chão dos lotes é recortado no horizonte para nada aparecer no céu.
export function BlockGrounds() {
  return (
    <g clipPath="url(#below-horizon)">
      {BLOCKS.map(({ i, j, type, seed }) => {
        if (type === 'field') {
          const [base, row] = pick(rng(seed + 3), FIELDS)
          const [u, v] = [plotStart(i) + 10, plotStart(j) + 10]
          const s = PLOT - 20
          return (
            <g key={`${i},${j}`}>
              <polygon points={pts([[u, v], [u + s, v], [u + s, v + s], [u, v + s]])} fill={base} />
              {Array.from({ length: 7 }).map((_, k) => {
                const vv = v + (k + 0.5) * (s / 7)
                const [a, b] = [iso(u + 4, vv), iso(u + s - 4, vv)]
                return <line key={k} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={row} strokeWidth="5" />
              })}
            </g>
          )
        }
        return (
          <g key={`${i},${j}`}>
            <polygon points={pts(plotRect(i, j, 10))} fill={RING_GRASS} />
            {type === 'park' && <ParkPaths i={i} j={j} />}
          </g>
        )
      })}
    </g>
  )
}

function ParkPaths({ i, j }) {
  const [u, v] = [plotStart(i) + 10, plotStart(j) + 10]
  const s = PLOT - 20
  const [a, b] = [iso(u + s / 2, v), iso(u + s / 2, v + s)]
  const [c, d] = [iso(u, v + s / 2), iso(u + s, v + s / 2)]
  const [cx, cy] = iso(u + s / 2, v + s / 2)
  return (
    <g stroke={PATH} strokeWidth="10" strokeLinecap="round">
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
      <line x1={c[0]} y1={c[1]} x2={d[0]} y2={d[1]} />
      <ellipse cx={cx} cy={cy} rx="30" ry="15" fill="#A5CFE0" stroke={PATH} strokeWidth="5" />
    </g>
  )
}

export function BlockContent({ i, j, type, seed, lit }) {
  const r = rng(seed)
  const [pu, pv] = [plotStart(i), plotStart(j)]
  const S = PLOT
  const items = []

  if (type === 'houses') {
    // 2 ou 3 casas por lote, com árvores nos espaços vazios
    ;[[26, 26], [112, 26], [26, 112], [112, 112]].forEach(([ou, ov], k) => {
      if ((k === 1 || k === 2) && r() < 0.5) {
        items.push({ d: ou + ov + 25, el: <Tree key={k} u={pu + ou + 25} v={pv + ov + 25} scale={0.75} muted /> })
        return
      }
      items.push({
        d: ou + ov,
        el: <House key={k} u={pu + ou} v={pv + ov} du={50} dv={50} h={15 + Math.round(r() * 7)} wall={pick(r, WALLS)} roof={pick(r, ROOFS)} lit={lit} />,
      })
    })
  }

  if (type === 'park') {
    ;[[26, 26], [S - 26, 26], [26, S - 26], [S - 26, S - 26]].forEach(([ou, ov], k) => {
      items.push({ d: ou + ov, el: <Tree key={k} u={pu + ou} v={pv + ov} scale={0.8} muted /> })
    })
  }

  if (type === 'forest') {
    Array.from({ length: 5 }).forEach((_, k) => {
      const [ou, ov] = [20 + r() * (S - 40), 20 + r() * (S - 40)]
      // árvore só nasce abaixo do horizonte
      if (iso(pu + ou, pv + ov)[1] < HORIZON + 30) return
      items.push({ d: ou + ov, el: <Tree key={k} u={pu + ou} v={pv + ov} scale={0.75 + r() * 0.35} muted /> })
    })
  }

  return <g>{items.sort((a, b) => a.d - b.d).map((it) => it.el)}</g>
}

// Avenidas principais: asfalto com faixa, do horizonte até a borda.
// Ruas do anel: calçadão claro, só dentro do anel.
export function GridRoads() {
  const ring = GRID_ROADS.filter((a) => !MAIN_ROADS.includes(a))
  const ringFrom = (a) => Math.max(roadBack(a), RING_START)
  return (
    <g>
      <g fill={PATH}>
        {ring.map((a) => (
          <g key={a}>
            <polygon points={pts([[a, ringFrom(a)], [a + ROAD, ringFrom(a)], [a + ROAD, RING_END], [a, RING_END]])} />
            <polygon points={pts([[ringFrom(a), a], [RING_END, a], [RING_END, a + ROAD], [ringFrom(a), a + ROAD]])} />
          </g>
        ))}
      </g>
      <g fill="#4B5563">
        {MAIN_ROADS.map((a) => {
          const from = roadBack(a)
          return (
            <g key={a}>
              <polygon points={pts([[a, from], [a + ROAD, from], [a + ROAD, ROAD_FRONT], [a, ROAD_FRONT]])} />
              <polygon points={pts([[from, a], [ROAD_FRONT, a], [ROAD_FRONT, a + ROAD], [from, a + ROAD]])} />
            </g>
          )
        })}
      </g>
      <g stroke="#FDE68A" strokeWidth="3" strokeDasharray="16 14" opacity="0.7">
        {MAIN_ROADS.map((a) => {
          const m = a + ROAD / 2
          const from = roadBack(a)
          const [v0, v1] = [iso(m, from), iso(m, ROAD_FRONT)]
          const [u0, u1] = [iso(from, m), iso(ROAD_FRONT, m)]
          return (
            <g key={a}>
              <line x1={v0[0]} y1={v0[1]} x2={v1[0]} y2={v1[1]} />
              <line x1={u0[0]} y1={u0[1]} x2={u1[0]} y2={u1[1]} />
            </g>
          )
        })}
      </g>
    </g>
  )
}
