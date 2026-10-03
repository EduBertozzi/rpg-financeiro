// Contas da barra lateral (funções puras): tarefas do mês, patrimônio mês a
// mês, desenho do gráfico pequeno e pontos de habilidade sobrando.

// a barra pede para o mapa abrir uma tarefa: detail = { id }
export const TASK_EVENT = 'fecha:task'

export const LAST_DILEMMA_MONTH = 11 // dezembro não tem dilema

// As tarefas obrigatórias do mês, na ordem da lista do mapa.
export const TASKS = [
  { id: 'dilemma', label: 'Dilema do mês', prefix: 'Dilema' },
  { id: 'leisure', label: 'Lazer', prefix: 'Lazer:' },
  { id: 'food', label: 'Mercadinho', prefix: 'Conta: Mercadinho' },
  { id: 'utilities', label: 'Água e Luz', prefix: 'Conta: Água e Luz' },
  { id: 'internet', label: 'Internet e Celular', prefix: 'Conta: Internet e Celular' },
]

// [{ ...task, done }] do mês `turn`. Fora de jogo (turn 0) não há tarefas.
export function monthTasks(eventLog, turn) {
  if (!turn || turn < 1) return []
  const logs = (eventLog ?? []).filter((l) => Number(l.turn) === Number(turn))
  return TASKS
    .filter((t) => t.id !== 'dilemma' || turn <= LAST_DILEMMA_MONTH)
    .map((t) => ({ ...t, done: logs.some((l) => String(l.description).startsWith(t.prefix)) }))
}

// Patrimônio no fim de cada mês já fechado, em ordem: [{ turn, value }].
// O retrato da virada é gravado com o mês que começa (turn 2 = fim de
// janeiro), então aqui turn vira o mês que fechou.
export function worthSeries(snapshots) {
  return (snapshots ?? [])
    .filter((s) => s.netWorth !== null && s.netWorth !== undefined)
    .map((s) => ({ turn: Number(s.turn) - 1, value: Number(s.netWorth) }))
    .filter((p) => p.turn >= 1)
    .sort((a, b) => a.turn - b.turn)
}

// Patrimônio de agora e quanto mudou na última virada (null se só há um mês).
export function worthNow(series, cash) {
  if (!series.length) return { value: Number(cash ?? 0), delta: null }
  const last = series[series.length - 1].value
  const prev = series.length > 1 ? series[series.length - 2].value : null
  return { value: last, delta: prev === null ? null : Math.round((last - prev) * 100) / 100 }
}

// Pontos da linha do gráfico pequeno num quadro w×h, com 12 meses no eixo x.
// Devolve { line, area, last: { x, y } } prontos para <polyline>/<polygon>.
export function sparkPoints(series, { w = 240, h = 40, pad = 4, months = 12 } = {}) {
  if (!series.length) return null
  const values = series.map((p) => p.value)
  let min = Math.min(...values)
  let max = Math.max(...values)
  // altura mínima de 20% do valor: R$ 200 de diferença não vira um penhasco
  const floor = Math.abs(max) * 0.2 || 2
  if (max - min < floor) {
    const mid = (max + min) / 2
    max = mid + floor / 2
    min = mid - floor / 2
  }
  const x = (turn) => pad + ((turn - 1) * (w - pad * 2)) / (months - 1)
  const y = (v) => pad + (1 - (v - min) / (max - min)) * (h - pad * 2)
  const pts = series.map((p) => [Math.round(x(p.turn) * 10) / 10, Math.round(y(p.value) * 10) / 10])
  const line = pts.map(([px, py]) => `${px},${py}`).join(' ')
  const first = pts[0]
  const end = pts[pts.length - 1]
  const area = `${first[0]},${h} ${line} ${end[0]},${h}`
  return { line, area, last: { x: end[0], y: end[1] } }
}

// Pontos de habilidade que ainda dá para gastar.
export function pointsLeft(skillPoints) {
  if (!skillPoints) return 0
  const left = Number(skillPoints.totalPoints ?? 0) - Number(skillPoints.usedPoints ?? 0)
  return Math.max(0, left)
}
