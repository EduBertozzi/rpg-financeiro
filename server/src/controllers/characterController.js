const prisma = require('../lib/prisma')
const { SALARY } = require('../utils/finance')
const { isValidGift, startingCosts, startingSkillPoints, giftEventImpact } = require('../utils/gifts')
const { WELCOME_GIFT } = require('../utils/events')
const { leisureFor } = require('../utils/leisure')
const { dilemmaFor } = require('../utils/dilemmas')
const { createCouponPlan } = require('./couponController')

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

    // janeiro não tem virada de mês: o evento dele (PIX da família) entra aqui
    const welcome = giftEventImpact(WELCOME_GIFT.cashImpact, gift)

    const character = await prisma.character.create({
      data: {
        userId: req.user.id,
        roomId,
        name,
        gender: gender || DEFAULT_GENDER,
        avatarId,
        course,
        gift,
        cash: SALARY + welcome, // salário de janeiro + presente de boas-vindas
        ...startingCosts(gift), // aluguel, mercado, contas e transporte (Mão de Vaca: -10%)
      }
    })

    await prisma.characterEventLog.create({
      data: {
        characterId: character.id,
        turn: 1,
        cashImpact: welcome,
        description: `${WELCOME_GIFT.title}: ${WELCOME_GIFT.description}`
      }
    })

    await prisma.characterSkillPoints.create({
      data: { characterId: character.id, ...startingSkillPoints(gift) } // Inteligente: 2 pontos, limite 10
    })

    // cupons escondidos da partida (easter egg). Se falhar, o personagem não
    // fica sem: o plano é criado na primeira consulta de cupom.
    try {
      await createCouponPlan(character.id)
    } catch (_err) { /* ver ensureCouponPlan */ }

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
    const character = await prisma.character.findUnique({
      where: { id: req.params.id },
      include: { room: true, choices: true }
    })
    if (!character) return res.status(404).json({ error: 'Personagem não encontrado' })
    if (character.userId !== req.user.id) return res.status(403).json({ error: 'Sem permissão' })

    // lazer e dilema do mês são obrigatórios para fechar o mês
    const turn = character.room?.status === 'active' ? character.room.currentTurn : 0
    const chose = (kind) => (character.choices ?? []).some((c) => c.turn === turn && c.kind === kind)
    const missing = []
    if (turn > 0 && leisureFor(turn) && !chose('leisure')) missing.push('Lazer')
    if (turn > 0 && dilemmaFor(turn) && !chose('dilemma')) missing.push('Dilema')
    if (missing.length) return res.status(400).json({ error: `Falta resolver: ${missing.join(' e ')}`, missing })

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