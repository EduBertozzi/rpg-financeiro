const prisma = require('../lib/prisma')
const bcrypt = require('bcryptjs')
const { cleanRoomName, playerProgress, roomSummary, CHARACTER_CHILD_MODELS, temporaryPassword } = require('../utils/roomAdmin')

const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

exports.createRoom = async (req, res) => {
  try {
    const { maxTurns = 12 } = req.body
    const name = cleanRoomName(req.body?.name) ?? ''

    let code, exists
    do {
      code = generateCode()
      exists = await prisma.room.findUnique({ where: { code } })
    } while (exists)

    const room = await prisma.room.create({
      data: { code, name, adminId: req.user.id, maxTurns }
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
      data: { status: 'active', currentTurn: 1, startedAt: new Date() }
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
    res.json({
      room: roomSummary({ ...room, characters }),
      players: (characters ?? []).map((c) => playerProgress(c, turn))
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
