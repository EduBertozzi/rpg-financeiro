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

// O snapshot do mês N é tirado na virada para N (ou seja, no fim de N-1).
// O gráfico mostra o patrimônio no fim de cada mês: turn 2 → fim de janeiro,
// turn 13 → fim de dezembro.
export function endOfMonthSeries(series = []) {
  return series
    .map((p) => ({ ...p, turn: Number(p.turn) - 1 }))
    .filter((p) => p.turn >= 1 && p.turn <= 12)
}

const MONTH_NAMES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

// "em junho" para a virada que abre o mês (turn 6 → junho).
export const monthName = (turn) => MONTH_NAMES[Number(turn) - 1] ?? ''

// Texto curto de uma consequência na linha do tempo do fim de ano.
// Parcelas: "8 de 11 pagas"; o resto: o valor que já caiu (ou "ainda não chegou").
export function consequenceNote(c) {
  if (c.count > 1) {
    const left = c.count - c.applied
    return left > 0 ? `${c.applied} de ${c.count} pagas, ${left} ficam como dívida` : `${c.applied} de ${c.count} pagas`
  }
  if (!c.applied) return 'ainda não chegou'
  return `em ${monthName(c.turn)}`
}
