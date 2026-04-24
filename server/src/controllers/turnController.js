const { processTurn, DILEMMAS } = require('../utils/turnEngine')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

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

exports.getDilemma = async (req, res) => {
  try {
    const turn = parseInt(req.params.turn)
    const dilemma = DILEMMAS[turn] ?? null
    if (!dilemma) return res.json({ dilemma: null })
    res.json({ dilemma })
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

exports.chooseDilemma = async (req, res) => {
  try {
    const { optionIndex } = req.body
    const { id: characterId, dilemmaId } = req.params
    const turn = parseInt(dilemmaId)

    const dilemma = DILEMMAS[turn]
    if (!dilemma) return res.status(404).json({ error: 'Dilema não encontrado' })

    const option = dilemma.options[optionIndex]
    if (!option) return res.status(400).json({ error: 'Opção inválida' })

    const character = await prisma.character.findUnique({ where: { id: characterId } })
    if (!character) return res.status(404).json({ error: 'Personagem não encontrado' })
    if (character.userId !== req.user.id) return res.status(403).json({ error: 'Sem permissão' })

    let cashImpact = 0
    let resultMessage = option.text

    if (option.effectType === 'immediate_cash') {
      cashImpact = option.effectValue
      await prisma.character.update({
        where: { id: characterId },
        data: { cash: { increment: cashImpact } }
      })
      resultMessage = `Você recebeu R$ ${cashImpact}!`
    }

    if (option.effectType === 'inheritance') {
      cashImpact = option.effectValue
      await prisma.character.update({
        where: { id: characterId },
        data: { cash: { increment: cashImpact } }
      })
      resultMessage = `Após pagar o inventário, você recebeu R$ ${cashImpact} líquidos!`
    }

    if (option.effectType === 'loan_friend') {
      const paid = Math.random() < option.probability
      if (paid) {
        cashImpact = 1500
        await prisma.character.update({
          where: { id: characterId },
          data: { cash: { increment: cashImpact } }
        })
        resultMessage = 'Seu amigo pagou de volta com juros! +R$ 1.500'
      } else {
        cashImpact = option.effectValue
        await prisma.character.update({
          where: { id: characterId },
          data: { cash: { increment: cashImpact } }
        })
        resultMessage = 'Seu amigo sumiu com seu dinheiro. -R$ 1.000'
      }
    }

    await prisma.characterEventLog.create({
      data: {
        characterId,
        turn,
        cashImpact,
        description: `Dilema "${dilemma.title}" — Opção ${option.label}: ${resultMessage}`
      }
    })

    // ganha 1 ponto de habilidade por resolver dilema
    await prisma.characterSkillPoints.update({
      where: { characterId },
      data: { totalPoints: { increment: 1 } }
    })

    res.json({ result: resultMessage, cashImpact })
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}