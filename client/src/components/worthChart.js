// Contas do gráfico grande do patrimônio (funções puras, testadas em
// worthChart.test.js): os pontos mês a mês e a escala do eixo.

// Pontos do ano: um por virada (o fim de cada mês fechado) e, por último, o
// patrimônio de agora no mês que está rolando. Cada ponto traz a variação
// em relação ao anterior.
export function chartPoints(series = [], now = null, currentTurn = 0) {
  const pts = series.map((p) => ({ turn: p.turn, value: p.value, cash: p.cash ?? 0, live: false }))
  const last = pts[pts.length - 1]
  if (now && currentTurn > 0 && (!last || currentTurn > last.turn)) {
    pts.push({ turn: currentTurn, value: now.value, cash: now.cash, live: true })
  }
  return pts.map((p, i) => ({ ...p, delta: i === 0 ? null : Math.round((p.value - pts[i - 1].value) * 100) / 100 }))
}

// Escala "redonda" do eixo y que cabe todos os valores (patrimônio e saldo),
// incluindo o zero: { min, max, step, ticks }.
export function chartScale(values = []) {
  const all = [0, ...values.filter((v) => Number.isFinite(v))]
  const lo = Math.min(...all)
  const hi = Math.max(...all)
  const span = hi - lo || 1000
  const raw = span / 4
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)
  const min = Math.floor(lo / step) * step
  const max = Math.ceil(hi / step) * step
  const ticks = []
  for (let v = min; v <= max + step / 2; v += step) ticks.push(Math.round(v))
  return { min, max: max === min ? min + step : max, step, ticks }
}
