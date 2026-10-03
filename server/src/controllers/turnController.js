const { processTurn } = require('../utils/turnEngine')
const prisma = require('../lib/prisma')
const { perksOf, percentLabel } = require('../utils/skills')
const { cents } = require('../utils/finance')
const { dilemmaFor, publicDilemma, resolveDilemma, LABELS } = require('../utils/dilemmas')
const { leisureFor, leisurePrice } = require('../utils/leisure')

const brl = (n) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

exports.nextTurn = async (req, res) => {
  try {
    const room = await prisma.room.findUnique({ where: { id: req.params.id } })
    if (!room) return res.status(404).json({ error: 'Sala não encontrada' })
    if (room.adminId !== req.user.id) return res.status(403).json({ error: 'Apenas o admin pode processar o turno' })

    const result = await processTurn(req.params.id)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

// Personagem do dono da requisição, com sala e habilidades. Responde o erro e
// devolve null quando não pode.
async function ownCharacter(req, res) {
  const character = await prisma.character.findUnique({
    where: { id: req.params.id },
    include: { room: true, unlockedSkills: { include: { skillNode: true } } }
  })
  if (!character) {
    res.status(404).json({ error: 'Personagem não encontrado' })
    return null
  }
  if (character.userId !== req.user.id) {
    res.status(403).json({ error: 'Sem permissão' })
    return null
  }
  return character
}

// Só dá para escolher no mês que está sendo jogado.
function checkCurrentTurn(character, turn, res) {
  if (character.room?.status !== 'active' || character.room.currentTurn !== turn) {
    res.status(400).json({ error: 'Esse mês não está aberto' })
    return false
  }
  return true
}

// escolhas de dilema já feitas: { [turn]: optionIndex }
async function dilemmaChoicesOf(characterId) {
  const rows = await prisma.characterChoice.findMany({ where: { characterId, kind: 'dilemma' } })
  return Object.fromEntries((rows ?? []).map((c) => [c.turn, c.option]))
}

// ─── Dilemas ──────────────────────────────────────────────────────────────────

exports.getDilemma = async (req, res) => {
  try {
    const turn = parseInt(req.params.turn)
    if (!dilemmaFor(turn)) return res.json({ dilemma: null })

    const character = await ownCharacter(req, res)
    if (!character) return

    const ctx = {
      perks: perksOf(character.unlockedSkills),
      choices: await dilemmaChoicesOf(character.id),
      housingCost: character.housingCost,
    }
    const answered = await prisma.characterChoice.findUnique({
      where: { characterId_turn_kind: { characterId: character.id, turn, kind: 'dilemma' } }
    })
    const dilemma = publicDilemma(turn, ctx)
    const option = answered ? dilemmaFor(turn).options[answered.option] : null

    res.json({
      dilemma,
      alreadyAnswered: !!answered,
      previousResult: answered
        ? { label: LABELS[answered.option], text: option.text, result: option.result, cashImpact: -Number(answered.amount) }
        : null
    })
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

exports.chooseDilemma = async (req, res) => {
  try {
    const turn = parseInt(req.params.dilemmaId)
    const optionIndex = Number(req.body?.optionIndex)
    const dilemma = dilemmaFor(turn)
    if (!dilemma) return res.status(404).json({ error: 'Dilema não encontrado' })
    if (!Number.isInteger(optionIndex) || !dilemma.options[optionIndex]) return res.status(400).json({ error: 'Opção inválida' })

    const character = await ownCharacter(req, res)
    if (!character) return
    if (!checkCurrentTurn(character, turn, res)) return

    const already = await prisma.characterChoice.findUnique({
      where: { characterId_turn_kind: { characterId: character.id, turn, kind: 'dilemma' } }
    })
    if (already) return res.status(400).json({ error: 'Dilema já respondido' })

    const perks = perksOf(character.unlockedSkills)
    const outcome = resolveDilemma(turn, optionIndex, {
      perks,
      choices: await dilemmaChoicesOf(character.id),
      housingCost: character.housingCost,
    })
    const discountNote = outcome.discount > 0 ? ` (${percentLabel(perks.leisureDiscount)} a menos com Trabalho em Equipe)` : ''
    const paid = outcome.cash < 0 ? ` Você pagou R$ ${brl(-outcome.cash)}${discountNote}.` : ''

    await prisma.$transaction(async (tx) => {
      await tx.characterChoice.create({
        data: { characterId: character.id, turn, kind: 'dilemma', option: optionIndex, amount: -outcome.cash }
      })
      await tx.character.update({
        where: { id: character.id },
        data: { cash: { increment: outcome.cash }, ...outcome.updates }
      })
      if (outcome.effects.length) {
        await tx.scheduledEffect.createMany({
          data: outcome.effects.map((e) => ({ characterId: character.id, sourceTurn: turn, ...e }))
        })
      }
      await tx.characterEventLog.create({
        data: {
          characterId: character.id,
          turn,
          cashImpact: outcome.cash,
          description: `Dilema "${dilemma.title}" — Opção ${outcome.label}: ${outcome.result}${paid}`
        }
      })
      await tx.characterSkillPoints.update({
        where: { characterId: character.id },
        data: { totalPoints: { increment: 1 } }
      })
    })

    res.json({ result: `${outcome.result}${paid}`, cashImpact: outcome.cash, lockSeconds: outcome.lockSeconds })
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

// ─── Lazer ────────────────────────────────────────────────────────────────────

exports.getLeisure = async (req, res) => {
  try {
    const turn = parseInt(req.params.turn)
    const month = leisureFor(turn)
    if (!month) return res.json({ leisure: null })

    const character = await ownCharacter(req, res)
    if (!character) return

    const perks = perksOf(character.unlockedSkills)
    const price = leisurePrice(turn, perks)
    const chosen = await prisma.characterChoice.findUnique({
      where: { characterId_turn_kind: { characterId: character.id, turn, kind: 'leisure' } }
    })

    res.json({
      leisure: { turn, price, basePrice: month.price, discount: cents(month.price - price), options: month.options },
      chosen: chosen ? { option: chosen.option, title: month.options[chosen.option]?.title, amount: Number(chosen.amount) } : null
    })
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

exports.chooseLeisure = async (req, res) => {
  try {
    const turn = parseInt(req.params.turn)
    const optionIndex = Number(req.body?.optionIndex)
    const month = leisureFor(turn)
    if (!month) return res.status(404).json({ error: 'Lazer não encontrado' })
    if (!Number.isInteger(optionIndex) || !month.options[optionIndex]) return res.status(400).json({ error: 'Opção inválida' })

    const character = await ownCharacter(req, res)
    if (!character) return
    if (!checkCurrentTurn(character, turn, res)) return

    const already = await prisma.characterChoice.findUnique({
      where: { characterId_turn_kind: { characterId: character.id, turn, kind: 'leisure' } }
    })
    if (already) return res.status(400).json({ error: 'Lazer já escolhido' })

    const perks = perksOf(character.unlockedSkills)
    const price = leisurePrice(turn, perks)
    const option = month.options[optionIndex]
    const note = perks.leisureDiscount ? ` com ${percentLabel(perks.leisureDiscount)} de desconto` : ''

    await prisma.$transaction(async (tx) => {
      await tx.characterChoice.create({
        data: { characterId: character.id, turn, kind: 'leisure', option: optionIndex, amount: price }
      })
      await tx.character.update({ where: { id: character.id }, data: { cash: { increment: -price } } })
      await tx.characterEventLog.create({
        data: { characterId: character.id, turn, cashImpact: -price, description: `Lazer: ${option.title} (-R$ ${price.toFixed(2)})${note}` }
      })
    })

    res.json({ title: option.title, cashImpact: -price })
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}
