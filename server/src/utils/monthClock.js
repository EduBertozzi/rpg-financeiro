// Relógio do mês, em funções puras. Cada mês tem um tempo (monthMinutes) para
// pagar as contas, escolher o lazer e mexer no banco. Quem encerra o mês (ou
// quando o tempo acaba) trava a cidade e abre o dilema, que tem o próprio
// tempo (dilemmaMinutes). O banco continua aberto até a virada. O mês vira
// sozinho quando todo mundo terminou: respondeu o dilema ou o tempo dele acabou.

const MINUTE = 60 * 1000
const DEFAULT_MONTH_MINUTES = 10
const DEFAULT_DILEMMA_MINUTES = 5

const ms = (d) => (d == null ? null : new Date(d).getTime())

// quando o tempo do mês acaba (null enquanto o relógio não começou)
function monthEndsAt(room) {
  const start = ms(room?.turnStartedAt)
  if (start == null) return null
  return start + (room.monthMinutes ?? DEFAULT_MONTH_MINUTES) * MINUTE
}

// quando o personagem encerrou o mês: o clique dele ou o fim do tempo
function closedAt(character, room, now = Date.now()) {
  const ready = ms(character?.readyAt)
  const deadline = monthEndsAt(room)
  if (ready != null) return deadline != null ? Math.min(ready, deadline) : ready
  if (character?.turnReady) return now // pronto sem horário (salas de antes do relógio)
  return deadline != null && now >= deadline ? deadline : null
}

// Fase do personagem no mês:
// - month: cidade aberta, ainda pode pagar contas e escolher o lazer
// - dilemma: mês encerrado, só falta o dilema (o banco continua aberto)
// - done: terminou; espera a turma para virar o mês
// hasDilemma: o mês tem dilema; answered: o personagem já respondeu
function playerPhase({ character, room, hasDilemma, answered, now = Date.now() }) {
  const monthEnds = monthEndsAt(room)
  const closed = closedAt(character, room, now)
  if (closed == null) return { phase: 'month', monthEndsAt: monthEnds, dilemmaEndsAt: null }
  if (!hasDilemma) return { phase: 'done', monthEndsAt: monthEnds, dilemmaEndsAt: null }
  const dilemmaEnds = closed + (room?.dilemmaMinutes ?? DEFAULT_DILEMMA_MINUTES) * MINUTE
  const phase = answered || now >= dilemmaEnds ? 'done' : 'dilemma'
  return { phase, monthEndsAt: monthEnds, dilemmaEndsAt: dilemmaEnds }
}

// A sala pode virar o mês quando tem gente e todo mundo terminou.
const roomCanTurn = (phases) => phases.length > 0 && phases.every((p) => p.phase === 'done')

// Quando o mês vira no pior caso: o último dilema que ainda pode ser respondido.
function roomTurnsBy(phases, room) {
  const monthEnds = monthEndsAt(room)
  if (monthEnds == null) return null
  const dilemmaMs = (room?.dilemmaMinutes ?? DEFAULT_DILEMMA_MINUTES) * MINUTE
  return phases.reduce((latest, p) => Math.max(latest, p.dilemmaEndsAt ?? (p.phase === 'month' ? monthEnds + dilemmaMs : 0)), monthEnds)
}

module.exports = {
  MINUTE,
  DEFAULT_MONTH_MINUTES,
  DEFAULT_DILEMMA_MINUTES,
  monthEndsAt,
  closedAt,
  playerPhase,
  roomCanTurn,
  roomTurnsBy,
}
