const prisma = require('../lib/prisma')
const { cents } = require('../utils/finance')

const BILL_TYPES = {
  food: { field: 'foodCost', label: 'Mercadinho' },
  utilities: { field: 'utilitiesCost', label: 'Água e Luz' },
  transport: { field: 'transportCost', label: 'Internet e Celular' },
}

exports.getBills = async (req, res) => {
  try {
    const { id: characterId, turn } = req.params
    const parsedTurn = parseInt(turn)

    const character = await prisma.character.findUnique({ where: { id: characterId } })
    if (!character) return res.status(404).json({ error: 'Personagem não encontrado' })
    if (character.userId !== req.user.id) return res.status(403).json({ error: 'Sem permissão' })

    const bills = await Promise.all(
      Object.entries(BILL_TYPES).map(async ([type, config]) => {
        const paidEntry = await prisma.characterEventLog.findFirst({
          where: {
            characterId,
            turn: parsedTurn,
            description: { startsWith: `Conta: ${config.label}` }
          }
        })

        return {
          type,
          label: config.label,
          amount: Number(character[config.field]),
          paid: Boolean(paidEntry)
        }
      })
    )

    res.json(bills)
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

exports.payBill = async (req, res) => {
  try {
    const { id: characterId, turn } = req.params
    const { type } = req.body
    const parsedTurn = parseInt(turn)

    const config = BILL_TYPES[type]
    if (!config) return res.status(400).json({ error: 'Tipo de conta inválido' })

    const character = await prisma.character.findUnique({ where: { id: characterId }, include: { room: true } })
    if (!character) return res.status(404).json({ error: 'Personagem não encontrado' })
    if (character.userId !== req.user.id) return res.status(403).json({ error: 'Sem permissão' })
    if (character.room && parsedTurn !== character.room.currentTurn) {
      return res.status(400).json({ error: 'Só dá para pagar as contas do mês atual' })
    }

    const alreadyPaid = await prisma.characterEventLog.findFirst({
      where: {
        characterId,
        turn: parsedTurn,
        description: { startsWith: `Conta: ${config.label}` }
      }
    })
    if (alreadyPaid) return res.status(400).json({ error: 'Conta já paga' })

    const amount = cents(Number(character[config.field]))

    // débito e registro juntos: ou a conta fica paga e descontada, ou nada muda
    await prisma.$transaction([
      prisma.character.update({
        where: { id: characterId },
        data: { cash: { decrement: amount } }
      }),
      prisma.characterEventLog.create({
        data: {
          characterId,
          turn: parsedTurn,
          cashImpact: -amount,
          description: `Conta: ${config.label} — Pago (-R$ ${amount})`
        }
      })
    ])

    res.json({ label: config.label, amount, cashAfter: cents(Number(character.cash) - amount) })
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}
