const prisma = require('../lib/prisma')
const { cents } = require('../utils/finance')
const { perksOf, billAmount, billDiscount } = require('../utils/skills')
const { foodBillWithCoupon, foodCouponDiscount, combinedDiscount, FOOD_COUPON_NOTE } = require('../utils/coupons')

// habilidades desbloqueadas, para aplicar os descontos das contas
const withSkills = { unlockedSkills: { include: { skillNode: true } } }

const BILL_TYPES = {
  food: { field: 'foodCost', label: 'Mercadinho' },
  utilities: { field: 'utilitiesCost', label: 'Água e Luz' },
  transport: { field: 'transportCost', label: 'Internet e Celular' },
}

// Cupom do Mercadinho resgatado neste mês (ver couponController). Enquanto a
// conta não foi paga, ele dá 20% de desconto sobre o valor já com as habilidades.
const claimedFoodCoupon = async (characterId, turn) =>
  (await prisma.characterCoupon.findFirst({
    where: { characterId, turn, reward: 'food_discount', claimedAt: { not: null } }
  })) ?? null

exports.getBills = async (req, res) => {
  try {
    const { id: characterId, turn } = req.params
    const parsedTurn = parseInt(turn)

    const character = await prisma.character.findUnique({ where: { id: characterId }, include: withSkills })
    if (!character) return res.status(404).json({ error: 'Personagem não encontrado' })
    if (character.userId !== req.user.id) return res.status(403).json({ error: 'Sem permissão' })

    const perks = perksOf(character.unlockedSkills)
    const foodCoupon = await claimedFoodCoupon(characterId, parsedTurn)
    const bills = await Promise.all(
      Object.entries(BILL_TYPES).map(async ([type, config]) => {
        const paidEntry = await prisma.characterEventLog.findFirst({
          where: {
            characterId,
            turn: parsedTurn,
            description: { startsWith: `Conta: ${config.label}` }
          }
        })

        // cupom do Mercadinho: vale na conta ainda aberta, ou já foi usado nela
        // (quem resgatou depois de pagar recebeu o desconto em dinheiro)
        const coupon = type === 'food' && Boolean(foodCoupon) &&
          (!paidEntry || String(paidEntry.description ?? '').includes(FOOD_COUPON_NOTE))

        // conta já paga mostra o que foi cobrado; senão, o valor com desconto
        let amount = paidEntry?.cashImpact != null
          ? cents(Math.abs(Number(paidEntry.cashImpact)))
          : billAmount(type, character[config.field], perks)
        if (coupon && !paidEntry) amount = foodBillWithCoupon(amount)

        const discount = billDiscount(type, perks)
        return {
          type,
          label: config.label,
          amount,
          baseAmount: cents(Number(character[config.field])),
          discount: coupon ? combinedDiscount(discount) : discount,
          coupon,
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

    const character = await prisma.character.findUnique({ where: { id: characterId }, include: { room: true, ...withSkills } })
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

    let amount = billAmount(type, character[config.field], perksOf(character.unlockedSkills))

    // Mercadinho com cupom resgatado no mês: 20% a menos sobre o valor com as
    // habilidades; o cupom guarda quanto descontou de verdade
    const coupon = type === 'food' ? await claimedFoodCoupon(characterId, parsedTurn) : null
    const couponSteps = []
    if (coupon) {
      const couponDiscount = foodCouponDiscount(amount)
      amount = foodBillWithCoupon(amount)
      couponSteps.push(prisma.characterCoupon.update({ where: { id: coupon.id }, data: { value: couponDiscount } }))
    }

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
          description: `Conta: ${config.label} — Pago (-R$ ${amount})${coupon ? ` ${FOOD_COUPON_NOTE}` : ''}`
        }
      }),
      ...couponSteps
    ])

    res.json({ label: config.label, amount, cashAfter: cents(Number(character.cash) - amount), ...(coupon ? { coupon: true } : {}) })
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}
