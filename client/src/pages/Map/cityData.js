import { HORIZON, PLOT, iso, plotCenter, plotStart, roadStart } from './geometry'

// Dados da cidade ao redor dos 6 prédios do jogo: a grade de ruas continua em
// todas as direções e cada lote ganha um tipo (casas, prédios, praça, fazenda…).
// Tudo é determinístico: a mesma cidade a cada visita.

// Um anel de casinhas ao redor do centro e, além dele, só campo calmo
// (matas e plantações) até as bordas da tela e o horizonte.
const K_MIN = -5
const K_MAX = 7

export const GRID_ROADS = Array.from({ length: K_MAX - K_MIN }, (_, n) => roadStart(K_MIN + n))
// as duas ruas do centro são avenidas; as demais são calçadões claros
export const MAIN_ROADS = [roadStart(0), roadStart(1)]
export const RING_START = plotStart(K_MIN)
export const RING_END = plotStart(K_MAX) + PLOT

export const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
export const pick = (r, list) => list[Math.floor(r() * list.length)]

export const CAR_COLORS = [
  ['#F87171', '#DC2626', '#B91C1C'],
  ['#FCD34D', '#EAB308', '#A16207'],
  ['#93C5FD', '#3B82F6', '#1D4ED8'],
  ['#F9A8D4', '#EC4899', '#BE185D'],
  ['#E5E7EB', '#9CA3AF', '#6B7280'],
]

function plotType(i, j, r) {
  const backY = iso(plotStart(i), plotStart(j))[1]
  if (backY < HORIZON + 8) return 'forest'
  const d = Math.max(Math.abs(i - 1), Math.abs(j - 1))
  if (d >= 3) return pick(r, ['forest', 'field', 'forest', 'field', 'park'])
  return i + j < 2 ? pick(r, ['park', 'forest', 'houses']) : pick(r, ['houses', 'park', 'houses', 'forest'])
}

function visible(i, j) {
  const [cx, cy] = iso(...plotCenter(i, j))
  // lotes que cruzam o horizonte são recortados nele (clip no CityScene)
  return cy < 1250 && cx > -1600 && cx < 3200 && iso(plotStart(i) + PLOT, plotStart(j) + PLOT)[1] > HORIZON + 30
}

const isMain = (i, j) => i >= 0 && i <= 2 && j >= 0 && j <= 2

export const BLOCKS = (() => {
  const list = []
  for (let i = K_MIN; i <= K_MAX; i++) {
    for (let j = K_MIN; j <= K_MAX; j++) {
      if (isMain(i, j) || !visible(i, j)) continue
      const r = rng(i * 131 + j * 977 + 7)
      list.push({ i, j, type: plotType(i, j, r), seed: i * 131 + j * 977 })
    }
  }
  return list
})()

