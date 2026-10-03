// Geometria isométrica compartilhada pela cena do mapa.
// Coordenadas lógicas (u, v) ficam no chão; iso() converte para a viewBox do SVG.
export const VB_W = 1600
export const VB_H = 1000
export const L = 740
export const CX = 800
export const Y0 = 150
export const MARGIN = 30
export const ROAD = 56
export const PLOT = (L - 2 * MARGIN - 2 * ROAD) / 3
export const PITCH = PLOT + ROAD
export const FAR = 5000
export const GRASS = '#7BC96F'

// Linha do horizonte: acima é céu, abaixo é chão contínuo até a borda da tela.
export const HORIZON = 175

export const iso = (u, v) => [CX + (u - v), Y0 + (u + v) / 2]
export const isoAt = (u, v, z = 0) => {
  const [x, y] = iso(u, v)
  return `${x},${y - z}`
}
export const pts = (list) => list.map(([u, v]) => iso(u, v).join(',')).join(' ')
export const rel = (u, v) => [u - v, (u + v) / 2]
export const relPts = (list, dy = 0) => list.map(([u, v]) => { const [x, y] = rel(u, v); return `${x},${y + dy}` }).join(' ')

export const plotStart = (k) => MARGIN + k * PITCH
export const roadStart = (k) => MARGIN + PLOT + k * PITCH
export const plotCenter = (i, j) => [plotStart(i) + PLOT / 2, plotStart(j) + PLOT / 2]
export const plotRect = (i, j, inset = 0) => {
  const u = plotStart(i) + inset
  const v = plotStart(j) + inset
  const s = PLOT - 2 * inset
  return [[u, v], [u + s, v], [u + s, v + s], [u, v + s]]
}

// As ruas vão do horizonte (para trás) até além da borda da tela (para frente).
export const roadBack = (a) => 2 * (HORIZON + 6 - Y0) - a
export const ROAD_FRONT = 1500
