const prisma = require('../lib/prisma')

const GIFT_MODIFIERS = {
  frugal:  { housingCost: 0.85, foodCost: 0.85, utilitiesCost: 0.85, transportCost: 0.85 },
  agile:   {},
  smart:   {}
}

exports.createCharacter = async (req, res) => {
  try {
    const { roomId, name, gender, avatarId = 1, course, gift } = req.body

    if (!roomId || !name || !gender || !course || !gift)
      return res.status(400).json({ error: 'Preencha todos os campos' })

    if (!['frugal', 'agile', 'smart'].includes(gift))
      return res.status(400).json({ error: 'Dom inválido' })

    const room = await prisma.room.findUnique({ where: { id: roomId } })
    if (!room) return res.status(404).json({ error: 'Sala não encontrada' })
    if (room.status === 'finished') return res.status(400).json({ error: 'Sala encerrada' })

    const existing = await prisma.character.findUnique({
      where: { userId_roomId: { userId: req.user.id, roomId } }
    })
    if (existing) return res.status(409).json({ error: 'Personagem já criado nessa sala' })

    const mods = GIFT_MODIFIERS[gift]
    const character = await prisma.character.create({
      data: {
        userId: req.user.id,
        roomId,
        name,
        gender,
        avatarId,
        course,
        gift,
        housingCost:   mods.housingCost   ? 1500 * mods.housingCost   : 1500,
        foodCost:      mods.foodCost       ? 1000 * mods.foodCost       : 1000,
        utilitiesCost: mods.utilitiesCost  ? 250  * mods.utilitiesCost  : 250,
        transportCost: mods.transportCost  ? 250  * mods.transportCost  : 250,
      }
    })

    await prisma.characterSkillPoints.create({
      data: { characterId: character.id }
    })

    res.status(201).json(character)
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

exports.getCharacter = async (req, res) => {
  try {
    const character = await prisma.character.findUnique({
      where: { id: req.params.id },
      include: {
        skillPoints: true,
        unlockedSkills: { include: { skillNode: true } },
        fixedInvestments: { where: { redeemedAt: null } },
        positions: { include: { asset: true } },
        debentures: { where: { status: 'active' } },
        snapshots: { orderBy: { turn: 'asc' } },
        eventLog: true
      }
    })

    if (!character) return res.status(404).json({ error: 'Personagem não encontrado' })
    if (character.userId !== req.user.id) return res.status(403).json({ error: 'Sem permissão' })

    res.json(character)
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

exports.setReady = async (req, res) => {
  try {
    const character = await prisma.character.findUnique({ where: { id: req.params.id } })
    if (!character) return res.status(404).json({ error: 'Personagem não encontrado' })
    if (character.userId !== req.user.id) return res.status(403).json({ error: 'Sem permissão' })

    const updated = await prisma.character.update({
      where: { id: req.params.id },
      data: { turnReady: true }
    })

    res.json({ turnReady: updated.turnReady })
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

exports.getMyCharacter = async (req, res) => {
  try {
    const character = await prisma.character.findFirst({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: { room: true }
    })
    if (!character) return res.status(404).json({ error: 'Nenhum personagem encontrado' })
    res.json(character)
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}