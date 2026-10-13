const prisma = require('../lib/prisma')
const bcrypt = require('bcryptjs')
const { roomCsv } = require('../utils/roomExport')
const { cleanRoomName, playerProgress, roomSummary, CHARACTER_CHILD_MODELS, temporaryPassword } = require('../utils/roomAdmin')
const { roomClock, emit } = require('../realtime')
const { DEFAULT_MONTH_MINUTES, DEFAULT_DILEMMA_MINUTES } = require('../utils/monthClock')

// minutos do relógio do mês: inteiro entre 1 e 60, ou o padrão
const minutesOr = (value, fallback) => {
  const n = Number(value)
  return Number.isInteger(n) && n >= 1 && n <= 60 ? n : fallback
}

const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

exports.createRoom = async (req, res) => {
  try {
    const { maxTurns = 12 } = req.body
    const name = cleanRoomName(req.body?.name) ?? ''
    const monthMinutes = minutesOr(req.body?.monthMinutes, DEFAULT_MONTH_MINUTES)
    const dilemmaMinutes = minutesOr(req.body?.dilemmaMinutes, DEFAULT_DILEMMA_MINUTES)

    let code, exists
    do {
      code = generateCode()
      exists = await prisma.room.findUnique({ where: { code } })
    } while (exists)

    const room = await prisma.room.create({
      data: { code, name, adminId: req.user.id, maxTurns, monthMinutes, dilemmaMinutes }
    })

    res.status(201).json(room)
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

exports.getRoom = async (req, res) => {
  try {
    const room = await prisma.room.findUnique({
      where: { code: req.params.code },
      include: {
        characters: {
          select: { id: true, name: true, turnReady: true, userId: true }
        }
      }
    })

    if (!room) return res.status(404).json({ error: 'Sala não encontrada' })
    res.json(room)
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

exports.startRoom = async (req, res) => {
  try {
    const room = await prisma.room.findUnique({ where: { id: req.params.id } })

    if (!room) return res.status(404).json({ error: 'Sala não encontrada' })
    if (room.adminId !== req.user.id) return res.status(403).json({ error: 'Apenas o admin pode iniciar' })
    if (room.status !== 'waiting') return res.status(400).json({ error: 'Sala já iniciada' })

    const updated = await prisma.room.update({
      where: { id: req.params.id },
      data: { status: 'active', currentTurn: 1, startedAt: new Date(), turnStartedAt: new Date() }
    })

    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

exports.getLeaderboard = async (req, res) => {
  try {
    const entries = await prisma.leaderboard.findMany({
      where: { roomId: req.params.id },
      include: { character: { select: { name: true } } },
      orderBy: { netWorth: 'desc' }
    })

    const ranked = entries.map((e, i) => ({
      rank: i + 1,
      characterName: e.character.name,
      netWorth: e.netWorth
    }))

    res.json(ranked)
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}
// Relógio do mês para quem joga na sala: quanto tempo falta, em que fase o
// jogador está e quantos da turma já encerraram. Sem posição no ranking.
exports.getStanding = async (req, res) => {
  try {
    const state = await roomClock(req.params.id)
    if (!state) return res.status(404).json({ error: 'Sala não encontrada' })
    const me = state.players.find((p) => p.userId === req.user.id)
    if (!me) return res.status(403).json({ error: 'Você não joga nesta sala' })
    const { clock } = state
    res.json({
      ...clock,
      ready: clock.closed,
      me: { phase: me.phase, monthEndsAt: me.monthEndsAt, dilemmaEndsAt: me.dilemmaEndsAt },
    })
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

// Pausar ou retomar o relógio da sala (fim da aula, explicação no meio do mês).
// Ao retomar, o tempo parado é devolvido: o começo do mês e os horários de quem
// já tinha encerrado andam para frente.
exports.pauseRoom = async (req, res) => {
  try {
    const room = await ownRoom(req, res)
    if (!room) return
    if (room.status !== 'active') return res.status(400).json({ error: 'A sala não está em andamento' })
    const pause = Boolean(req.body?.paused)
    const now = new Date()

    if (pause && !room.pausedAt) {
      await prisma.room.update({ where: { id: room.id }, data: { pausedAt: now } })
    } else if (!pause && room.pausedAt) {
      const stopped = now.getTime() - new Date(room.pausedAt).getTime()
      const shift = (d) => (d ? new Date(new Date(d).getTime() + stopped) : d)
      const characters = await prisma.character.findMany({ where: { roomId: room.id, readyAt: { not: null } }, select: { id: true, readyAt: true } })
      await prisma.$transaction([
        prisma.room.update({ where: { id: room.id }, data: { pausedAt: null, turnStartedAt: shift(room.turnStartedAt) } }),
        ...(characters ?? []).map((c) => prisma.character.update({ where: { id: c.id }, data: { readyAt: shift(c.readyAt) } })),
      ])
    }

    const state = await roomClock(room.id)
    emit(room.id, 'room:clock', state.clock)
    res.json(state.clock)
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

// Sala do administrador logado, ou responde o erro e devolve null.
async function ownRoom(req, res) {
  const room = await prisma.room.findUnique({ where: { id: req.params.id } })
  if (!room) {
    res.status(404).json({ error: 'Sala não encontrada' })
    return null
  }
  if (room.adminId !== req.user.id) {
    res.status(403).json({ error: 'Só o administrador da sala pode fazer isso' })
    return null
  }
  return room
}

// Minhas salas: todas as salas que o administrador criou, da mais nova à mais antiga.
exports.getMyRooms = async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      where: { adminId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: { characters: { select: { id: true, turnReady: true } } }
    })
    res.json((rooms ?? []).map(roomSummary))
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

// Progresso da sala: o que cada jogador já fez no mês atual.
exports.getRoomProgress = async (req, res) => {
  try {
    const room = await ownRoom(req, res)
    if (!room) return
    const turn = room.status === 'active' ? room.currentTurn : 0
    const characters = await prisma.character.findMany({
      where: { roomId: room.id },
      orderBy: { createdAt: 'asc' },
      include: {
        choices: { where: { turn } },
        eventLog: { where: { turn } },
        snapshots: { orderBy: { turn: 'desc' }, take: 1 }
      }
    })
    const state = await roomClock(room.id)
    const phases = Object.fromEntries((state?.players ?? []).map((p) => [p.characterId, p.phase]))
    res.json({
      room: roomSummary({ ...room, characters }),
      players: (characters ?? []).map((c) => ({ ...playerProgress(c, turn), phase: phases[c.id] ?? null })),
      clock: state?.clock ?? null,
    })
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

// Editar o nome da turma.
exports.updateRoom = async (req, res) => {
  try {
    const name = cleanRoomName(req.body?.name)
    if (!name) return res.status(400).json({ error: 'Dê um nome para a sala' })
    const room = await ownRoom(req, res)
    if (!room) return
    const updated = await prisma.room.update({ where: { id: room.id }, data: { name } })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

// Apagar a sala com tudo dentro: personagens e tudo que é deles, preços e ranking.
exports.deleteRoom = async (req, res) => {
  try {
    const room = await ownRoom(req, res)
    if (!room) return
    const characters = await prisma.character.findMany({ where: { roomId: room.id }, select: { id: true } })
    const ids = (characters ?? []).map((c) => c.id)

    await prisma.$transaction(async (tx) => {
      await tx.leaderboard.deleteMany({ where: { roomId: room.id } })
      for (const model of CHARACTER_CHILD_MODELS) {
        await tx[model].deleteMany({ where: { characterId: { in: ids } } })
      }
      await tx.character.deleteMany({ where: { roomId: room.id } })
      await tx.assetPrice.deleteMany({ where: { roomId: room.id } })
      await tx.room.delete({ where: { id: room.id } })
    })

    res.json({ deleted: room.id, players: ids.length })
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

// Esqueci a senha: o administrador da sala gera uma senha provisória para um
// jogador dela e passa para ele. A senha antiga deixa de valer.
exports.resetPlayerPassword = async (req, res) => {
  try {
    const room = await ownRoom(req, res)
    if (!room) return
    const character = await prisma.character.findUnique({ where: { id: req.params.characterId } })
    if (!character || character.roomId !== room.id) return res.status(404).json({ error: 'Jogador não está nesta sala' })

    const password = temporaryPassword()
    await prisma.user.update({ where: { id: character.userId }, data: { passwordHash: await bcrypt.hash(password, 10) } })
    res.json({ password, name: character.name })
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

// Dados da sala para pesquisa (CSV, jogadores anônimos).
exports.exportRoom = async (req, res) => {
  try {
    const room = await ownRoom(req, res)
    if (!room) return
    const characters = await prisma.character.findMany({
      where: { roomId: room.id },
      orderBy: { createdAt: 'asc' },
      include: { eventLog: true, choices: true, snapshots: true, unlockedSkills: true }
    })
    res.set('Content-Type', 'text/csv; charset=utf-8')
    res.set('Content-Disposition', `attachment; filename="sala-${room.code}.csv"`)
    res.send(roomCsv(characters ?? [], room.maxTurns))
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}
