const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

exports.createRoom = async (req, res) => {
  try {
    const { maxTurns = 12 } = req.body

    let code, exists
    do {
      code = generateCode()
      exists = await prisma.room.findUnique({ where: { code } })
    } while (exists)

    const room = await prisma.room.create({
      data: { code, adminId: req.user.id, maxTurns }
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