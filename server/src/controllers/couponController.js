// Cupons escondidos no mapa (easter egg). O GET só diz ONDE está o cupom do mês
// atual (nunca o prêmio nem os outros meses); o prêmio só aparece no resgate.
//
// Cupom do Mercadinho (food_discount) — 20% sobre a conta do Mercadinho do mês:
// - se a conta do mês ainda NÃO foi paga, o resgate só marca o cupom; o
//   desconto entra quando a conta for paga (billController: o GET das contas já
//   mostra o valor com o cupom e o pagamento cobra o valor com o cupom);
// - se a conta JÁ foi paga, devolve na hora 20% do que foi pago, em dinheiro.
const prisma = require('../lib/prisma')
const { cents } = require('../utils/finance')
const { perksOf, billAmount } = require('../utils/skills')
const { startingSkillPoints } = require('../utils/gifts')
const {
  planCoupons, seededRandom, seedFrom, rewardInfo, foodCouponDiscount, CASHBACK_AMOUNT,
} = require('../utils/coupons')

const FOOD_BILL = 'Conta: Mercadinho' // linha do extrato da conta paga (billController)

// Cria o plano de cupons de um personagem novo (sorteio normal).
async function createCouponPlan(characterId, random = Math.random) {
  return prisma.characterCoupon.createMany({
    data: planCoupons(random).map((c) => ({ characterId, ...c })),
  })
}

// Garante que o personagem tem o plano de cupons (personagens criados antes dos
// cupons ganham o plano aqui, na primeira consulta). O sorteio usa uma semente
// fixa por personagem e o upsert não sobrescreve nada, então chamar de novo — ou
// duas vezes ao mesmo tempo — não cria cupons a mais nem muda o plano.
async function ensureCouponPlan(characterId) {
  const existing = (await prisma.characterCoupon.findMany({ where: { characterId }, orderBy: { turn: 'asc' } })) ?? []
  if (existing.length > 0) return existing

  const random = seededRandom(seedFrom(`${characterId}:${process.env.JWT_SECRET ?? ''}`))
  try {
    await prisma.$transaction(planCoupons(random).map((c) =>
      prisma.characterCoupon.upsert({
        where: { characterId_turn: { characterId, turn: c.turn } },
        update: {},
        create: { characterId, ...c },
      })
    ))
  } catch (err) {
    // outra requisição criou o mesmo plano ao mesmo tempo
    if (err?.code !== 'P2002') throw err
  }
  return (await prisma.characterCoupon.findMany({ where: { characterId }, orderBy: { turn: 'asc' } })) ?? []
}

async function loadOwnCharacter(req, res, include = {}) {
  const character = await prisma.character.findUnique({ where: { id: req.params.id }, include: { room: true, ...include } })
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

const isPlayable = (room) => Boolean(room) && room.status !== 'finished'

exports.getCoupon = async (req, res) => {
  try {
    const turn = parseInt(req.params.turn)
    const character = await loadOwnCharacter(req, res)
    if (!character) return

    const coupons = await ensureCouponPlan(character.id)
    const room = character.room
    if (!isPlayable(room) || turn !== room.currentTurn) return res.json({ coupon: null })

    const coupon = coupons.find((c) => c.turn === turn && c.claimedAt == null)
    // só o lugar do mapa — o prêmio fica em segredo até o resgate
    res.json({ coupon: coupon ? { id: coupon.id, spot: coupon.spot } : null })
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

exports.claimCoupon = async (req, res) => {
  try {
    const turn = parseInt(req.params.turn)
    const character = await loadOwnCharacter(req, res, { unlockedSkills: { include: { skillNode: true } } })
    if (!character) return

    const room = character.room
    if (!room || turn !== room.currentTurn) {
      const error = room && turn > room.currentTurn ? 'Esse cupom ainda não apareceu' : 'Esse cupom já expirou'
      return res.status(400).json({ error })
    }
    if (!isPlayable(room)) return res.status(400).json({ error: 'A partida já acabou' })

    const coupons = await ensureCouponPlan(character.id)
    const coupon = coupons.find((c) => c.turn === turn)
    if (!coupon) return res.status(404).json({ error: 'Nenhum cupom escondido neste mês' })
    if (coupon.claimedAt != null) return res.status(409).json({ error: 'Cupom já resgatado' })

    const cash = Number(character.cash)
    const claimedAt = new Date()
    const log = (cashImpact, description) =>
      prisma.characterEventLog.create({ data: { characterId: character.id, turn, cashImpact, description } })
    const markClaimed = (value) =>
      prisma.characterCoupon.update({ where: { id: coupon.id }, data: { claimedAt, value } })

    if (coupon.reward === 'cashback') {
      const amount = CASHBACK_AMOUNT
      await prisma.$transaction([
        prisma.character.update({ where: { id: character.id }, data: { cash: { increment: amount } } }),
        markClaimed(amount),
        log(amount, `Cupom: Cashback do Maré (+R$ ${amount.toFixed(2)})`),
      ])
      return res.json({ reward: rewardInfo('cashback', amount), cashAfter: cents(cash + amount) })
    }

    if (coupon.reward === 'skill_point') {
      const start = startingSkillPoints(character.gift)
      await prisma.$transaction([
        prisma.characterSkillPoints.upsert({
          where: { characterId: character.id },
          update: { totalPoints: { increment: 1 } },
          create: { characterId: character.id, ...start, totalPoints: start.totalPoints + 1 },
        }),
        markClaimed(null),
        log(0, 'Cupom: Bilhete da Universidade (+1 ponto de habilidade)'),
      ])
      return res.json({ reward: rewardInfo('skill_point', 0), cashAfter: cents(cash) })
    }

    if (coupon.reward === 'food_discount') {
      const paidEntry = await prisma.characterEventLog.findFirst({
        where: { characterId: character.id, turn, description: { startsWith: FOOD_BILL } },
      })

      if (paidEntry) {
        // conta já paga: devolve 20% do que foi pago
        const paid = paidEntry.cashImpact != null
          ? Math.abs(Number(paidEntry.cashImpact))
          : billAmount('food', character.foodCost, perksOf(character.unlockedSkills))
        const refund = foodCouponDiscount(paid)
        await prisma.$transaction([
          prisma.character.update({ where: { id: character.id }, data: { cash: { increment: refund } } }),
          markClaimed(refund),
          log(refund, `Cupom: Desconto no Mercadinho (+R$ ${refund.toFixed(2)} de volta da conta paga)`),
        ])
        return res.json({ reward: rewardInfo('food_discount', refund), cashAfter: cents(cash + refund) })
      }

      // conta ainda aberta: o desconto entra quando ela for paga
      const discount = foodCouponDiscount(billAmount('food', character.foodCost, perksOf(character.unlockedSkills)))
      await prisma.$transaction([
        markClaimed(discount),
        log(0, `Cupom: Desconto no Mercadinho (20% na conta do mês, -R$ ${discount.toFixed(2)})`),
      ])
      return res.json({ reward: rewardInfo('food_discount', discount), cashAfter: cents(cash) })
    }

    res.status(500).json({ error: 'Cupom com prêmio desconhecido' })
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

exports.createCouponPlan = createCouponPlan
exports.ensureCouponPlan = ensureCouponPlan
