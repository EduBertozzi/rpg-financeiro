const prisma = require('../lib/prisma')
const { SALARY } = require('../utils/finance')
const { isValidGift, startingCosts, startingSkillPoints } = require('../utils/gifts')

// gênero saiu da criação de personagem; a coluna continua obrigatória no
// banco, então guardamos um valor neutro quando não vem
const DEFAULT_GENDER = 'none'

exports.createCharacter = async (req, res) => {
  try {
    const { roomId, name, gender, avatarId = 1, course, gift } = req.body

    if (!roomId || !name || !course || !gift)
      return res.status(400).json({ error: 'Preencha todos os campos' })

    if (!isValidGift(gift))
      return res.status(400).json({ error: 'Dom inválido' })

    const room = await prisma.room.findUnique({ where: { id: roomId } })
    if (!room) return res.status(404).json({ error: 'Sala não encontrada' })
    if (room.status === 'finished') return res.status(400).json({ error: 'Sala encerrada' })

    const existing = await prisma.character.findUnique({
      where: { userId_roomId: { userId: req.user.id, roomId } }
    })
    if (existing) return res.status(409).json({ error: 'Personagem já criado nessa sala' })

    const character = await prisma.character.create({
      data: {
        userId: req.user.id,
        roomId,
        name,
        gender: gender || DEFAULT_GENDER,
        avatarId,
        course,
        gift,
        cash: SALARY, // começa com o salário de janeiro na conta
        ...startingCosts(gift), // aluguel, mercado, contas e transporte (Mão de Vaca: -10%)
      }
    })

    await prisma.characterSkillPoints.create({
      data: { characterId: character.id, ...startingSkillPoints(gift) } // Inteligente: 2 pontos, limite 10
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