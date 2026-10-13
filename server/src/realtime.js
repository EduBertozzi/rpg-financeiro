// Tempo real da sala: guarda o Socket.io do servidor e cuida do relógio do mês.
// O mês vira sozinho quando todo mundo terminou (ver utils/monthClock.js); o
// servidor confere a cada poucos segundos e também logo depois de cada
// jogador encerrar o mês ou responder o dilema.
const prisma = require('./lib/prisma')
const { processTurn } = require('./utils/turnEngine')
const { dilemmaFor } = require('./utils/dilemmas')
const { playerPhase, roomCanTurn, roomTurnsBy, monthEndsAt } = require('./utils/monthClock')

const TICK_MS = 5000

let io = null
const turning = new Set() // salas virando agora (não vira duas vezes)

const setIo = (server) => { io = server }
const emit = (roomId, event, payload) => io?.to(roomId).emit(event, payload)

// o relógio parado (pausa do professor) congela o tempo no momento da pausa
const clockNow = (room, now = Date.now()) => (room?.pausedAt ? new Date(room.pausedAt).getTime() : now)

// Relógio da sala e a fase de cada personagem no mês atual.
async function roomClock(roomId, now = Date.now()) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      characters: {
        select: { id: true, userId: true, readyAt: true, turnReady: true, choices: { where: { kind: 'dilemma' }, select: { turn: true } } },
      },
    },
  })
  if (!room) return null
  const at = clockNow(room, now)
  const hasDilemma = room.status === 'active' && Boolean(dilemmaFor(room.currentTurn))
  const players = (room.characters ?? []).map((c) => ({
    characterId: c.id,
    userId: c.userId,
    ...playerPhase({ character: c, room, hasDilemma, answered: (c.choices ?? []).some((x) => x.turn === room.currentTurn), now: at }),
  }))
  return {
    room,
    players,
    clock: {
      turn: room.currentTurn,
      status: room.status,
      paused: Boolean(room.pausedAt),
      pausedAt: room.pausedAt ? new Date(room.pausedAt).getTime() : null,
      serverNow: now,
      monthEndsAt: monthEndsAt(room),
      turnsBy: roomTurnsBy(players, room),
      monthMinutes: room.monthMinutes,
      dilemmaMinutes: room.dilemmaMinutes,
      hasDilemma,
      total: players.length,
      done: players.filter((p) => p.phase === 'done').length,
      closed: players.filter((p) => p.phase !== 'month').length,
    },
  }
}

// Vira o mês da sala e avisa todo mundo. Usado pelo relógio e pelo botão do
// administrador.
async function turnRoom(roomId) {
  if (turning.has(roomId)) return null
  turning.add(roomId)
  try {
    emit(roomId, 'turn:processing')
    const result = await processTurn(roomId)
    emit(roomId, 'turn:result', result)
    if (result.isFinished) emit(roomId, 'room:finished', result)
    return result
  } finally {
    turning.delete(roomId)
  }
}

// Vira o mês se a sala já pode; senão só avisa o placar da turma.
async function checkRoom(roomId, now = Date.now()) {
  const state = await roomClock(roomId, now)
  if (!state || state.room.status !== 'active' || state.room.pausedAt) return null
  if (state.room.turnStartedAt && roomCanTurn(state.players)) return turnRoom(roomId)
  emit(roomId, 'room:clock', state.clock)
  return null
}

async function tick() {
  const rooms = (await prisma.room.findMany({ where: { status: 'active', pausedAt: null, turnStartedAt: { not: null } }, select: { id: true } })) ?? []
  for (const { id } of rooms) {
    try {
      await checkRoom(id)
    } catch (err) {
      console.error('Relógio da sala', id, err.message)
    }
  }
}

let timer = null
function startClock() {
  if (timer) return
  timer = setInterval(() => tick().catch((err) => console.error('Relógio:', err.message)), TICK_MS)
}

// depois de uma ação do jogador, confere a sala sem atrasar a resposta (só
// com o servidor de verdade no ar; nos testes não há Socket.io)
const checkSoon = (roomId) => {
  if (!roomId || !io) return
  setImmediate(() => checkRoom(roomId).catch((err) => console.error('Relógio da sala', roomId, err.message)))
}

module.exports = { setIo, emit, roomClock, turnRoom, checkRoom, checkSoon, startClock, clockNow, TICK_MS }
