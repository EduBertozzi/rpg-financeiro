// Geometria do gráfico "patrimônio mês a mês" da tela de fim de ano.

// Topo do eixo: o maior valor arredondado para cima num passo "bonito".
export function niceMax(values) {
  const max = Math.max(0, ...values.filter(Number.isFinite))
  if (max <= 0) return 1000
  const step = 10 ** Math.floor(Math.log10(max))
  for (const m of [1, 2, 2.5, 5, 10]) if (m * step >= max) return m * step
  return 10 * step
}

// Converte [{ turn, netWorth }] em pontos "x,y" dentro da área do gráfico.
export function linePoints(series, { x0, x1, y0, y1, maxTurn = 12, max }) {
  return series
    .filter((p) => Number.isFinite(Number(p.netWorth)))
    .map((p) => {
      const x = x0 + ((x1 - x0) * (p.turn - 1)) / Math.max(maxTurn - 1, 1)
      const v = Math.max(Number(p.netWorth), 0)
      const y = y0 - ((y0 - y1) * Math.min(v, max)) / max
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

// Ganho do ano: último patrimônio menos o primeiro.
export function yearGain(series) {
  if (!series.length) return 0
  return Number(series[series.length - 1].netWorth) - Number(series[0].netWorth)
}
