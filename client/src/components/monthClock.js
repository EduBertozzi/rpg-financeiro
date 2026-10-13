// Relógio do mês no navegador (o servidor manda os horários; ver
// server/src/utils/monthClock.js). Cada mês tem um tempo para pagar as contas,
// escolher o lazer e mexer no banco. Encerrar o mês (ou o fim do tempo) trava
// a cidade e abre o dilema, que tem o próprio tempo. Depois é esperar a turma.

export const MINUTE = 60 * 1000

// Fase do jogador agora, a partir do último relógio vindo do servidor.
// clock: resposta de /rooms/:id/standing; offset: relógio do servidor menos o
// daqui; answered: já respondeu o dilema deste mês.
export function clockState(clock, { now = Date.now(), offset = 0, answered = false } = {}) {
  // servidor de antes do relógio (sem `me`): sem relógio, o mapa segue sozinho
  if (!clock || clock.status !== 'active' || !clock.me) return null
  const at = clock.paused && clock.pausedAt ? clock.pausedAt : now + offset
  const me = clock.me ?? {}
  const dilemmaMs = (clock.dilemmaMinutes ?? 5) * MINUTE
  const monthEndsAt = clock.monthEndsAt ?? null

  let dilemmaEndsAt = me.dilemmaEndsAt ?? null
  if (!dilemmaEndsAt && me.phase === 'month' && monthEndsAt != null && at >= monthEndsAt) dilemmaEndsAt = monthEndsAt + dilemmaMs
  const closed = me.phase !== 'month' || dilemmaEndsAt != null

  let phase = 'month'
  if (closed) {
    if (!clock.hasDilemma || answered || me.phase === 'done') phase = 'done'
    else if (dilemmaEndsAt != null && at >= dilemmaEndsAt) phase = 'done'
    else phase = 'dilemma'
  }

  const left = (end) => (end == null ? null : Math.max(0, end - at))
  return {
    phase,
    paused: Boolean(clock.paused),
    monthLeft: phase === 'month' ? left(monthEndsAt) : 0,
    dilemmaLeft: phase === 'dilemma' ? left(dilemmaEndsAt) : null,
    turnsIn: left(clock.turnsBy ?? null),
    done: clock.done ?? 0,
    closed: clock.closed ?? clock.ready ?? 0,
    total: clock.total ?? 0,
  }
}

// 7:05, 0:09 — minutos e segundos que faltam (arredonda para cima)
export function formatClock(ms) {
  if (ms == null) return '–:––'
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Últimos 60 segundos: o relógio fica vermelho e pulsa.
export const isUrgent = (ms) => ms != null && ms <= 60 * 1000

// O que o relógio diz agora: { label, time } (time em ms ou null).
export function clockText(clock) {
  if (!clock) return null
  if (clock.paused) return { label: 'Relógio pausado pelo professor', time: null }
  if (clock.phase === 'month') return clock.monthLeft == null ? null : { label: 'para encerrar o mês', time: clock.monthLeft }
  if (clock.phase === 'dilemma') return { label: 'para responder o dilema', time: clock.dilemmaLeft }
  return { label: 'Esperando a turma', time: null }
}
