const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const SELIC_MONTHLY = 0.0075 // 0,75% ao mês (simulado)

// ── RENDA FIXA ────────────────────────────────────────────────────────────────

exports.getFixedIncome = async (req, res) => {
  try {
    const investments = await prisma.fixedIncomeInvestment.findMany({
      where: { characterId: req.params.id, redeemedAt: null }
    })
    res.json(investments)
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

exports.investFixed = async (req, res) => {
  try {
    const { amount, isEmergency = false } = req.body
    const character = await prisma.character.findUnique({
      where: { id: req.params.id },
      include: { room: true }
    })

    if (!character) return res.status(404).json({ error: 'Personagem não encontrado' })
    if (character.userId !== req.user.id) return res.status(403).json({ error: 'Sem permissão' })
    if (amount <= 0) return res.status(400).json({ error: 'Valor inválido' })
    if (Number(character.cash) < amount) return res.status(422).json({ error: 'Saldo insuficiente' })

    const [investment] = await prisma.$transaction([
      prisma.fixedIncomeInvestment.create({
        data: {
          characterId: character.id,
          amount,
          monthlyRate: SELIC_MONTHLY,
          investedAt: character.room.currentTurn,
          isEmergency
        }
      }),
      prisma.character.update({
        where: { id: character.id },
        data: { cash: { decrement: amount } }
      })
    ])

    res.status(201).json(investment)
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

exports.redeemFixed = async (req, res) => {
  try {
    const character = await prisma.character.findUnique({
      where: { id: req.params.id },
      include: { room: true }
    })
    if (!character) return res.status(404).json({ error: 'Personagem não encontrado' })
    if (character.userId !== req.user.id) return res.status(403).json({ error: 'Sem permissão' })

    const investment = await prisma.fixedIncomeInvestment.findUnique({
      where: { id: req.params.investmentId }
    })
    if (!investment || investment.characterId !== character.id)
      return res.status(404).json({ error: 'Investimento não encontrado' })
    if (investment.redeemedAt !== null)
      return res.status(400).json({ error: 'Investimento já resgatado' })

    const turns = character.room.currentTurn - investment.investedAt
    const redeemedValue = Number(investment.amount) * Math.pow(1 + Number(investment.monthlyRate), Math.max(turns, 0))
    const rounded = Math.round(redeemedValue * 100) / 100

    await prisma.$transaction([
      prisma.fixedIncomeInvestment.update({
        where: { id: investment.id },
        data: { redeemedAt: character.room.currentTurn, redeemedValue: rounded }
      }),
      prisma.character.update({
        where: { id: character.id },
        data: { cash: { increment: rounded } }
      })
    ])

    res.json({ redeemedValue: rounded, cashAfter: Number(character.cash) + rounded })
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

// ── RENDA VARIÁVEL ────────────────────────────────────────────────────────────

exports.getMarket = async (req, res) => {
  try {
    const room = await prisma.room.findUnique({ where: { id: req.params.roomId } })
    if (!room) return res.status(404).json({ error: 'Sala não encontrada' })

    const assets = await prisma.marketAsset.findMany()

    const result = await Promise.all(assets.map(async (asset) => {
      const current = await prisma.assetPrice.findUnique({
        where: { assetId_turn_roomId: { assetId: asset.id, turn: room.currentTurn, roomId: room.id } }
      })
      const prev = await prisma.assetPrice.findUnique({
        where: { assetId_turn_roomId: { assetId: asset.id, turn: room.currentTurn - 1, roomId: room.id } }
      })

      const currentPrice = current ? Number(current.price) : Number(asset.basePrice)
      const prevPrice = prev ? Number(prev.price) : Number(asset.basePrice)
      const changePct = ((currentPrice - prevPrice) / prevPrice) * 100

      return {
        id: asset.id, ticker: asset.ticker, name: asset.name,
        type: asset.type, riskLevel: asset.riskLevel,
        currentPrice, prevPrice, changePct: Math.round(changePct * 100) / 100
      }
    }))

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

exports.getPortfolio = async (req, res) => {
  try {
    const character = await prisma.character.findUnique({
      where: { id: req.params.id },
      include: { positions: { include: { asset: true } }, room: true }
    })
    if (!character) return res.status(404).json({ error: 'Personagem não encontrado' })
    if (character.userId !== req.user.id) return res.status(403).json({ error: 'Sem permissão' })

    const portfolio = await Promise.all(character.positions.map(async (pos) => {
      const current = await prisma.assetPrice.findUnique({
        where: { assetId_turn_roomId: { assetId: pos.assetId, turn: character.room.currentTurn, roomId: character.roomId } }
      })
      const currentPrice = current ? Number(current.price) : Number(pos.asset.basePrice)
      const totalValue = currentPrice * pos.quantity
      const totalCost = Number(pos.avgPrice) * pos.quantity
      const profitLoss = totalValue - totalCost

      return {
        id: pos.id, ticker: pos.asset.ticker, name: pos.asset.name,
        type: pos.asset.type, quantity: pos.quantity,
        avgPrice: Number(pos.avgPrice), currentPrice, totalValue,
        profitLoss: Math.round(profitLoss * 100) / 100
      }
    }))

    res.json(portfolio)
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

exports.trade = async (req, res) => {
  try {
    const { assetId, operation, quantity } = req.body
    if (!['buy', 'sell'].includes(operation)) return res.status(400).json({ error: 'Operação inválida' })
    if (quantity <= 0) return res.status(400).json({ error: 'Quantidade inválida' })

    const character = await prisma.character.findUnique({
      where: { id: req.params.id },
      include: { room: true }
    })
    if (!character) return res.status(404).json({ error: 'Personagem não encontrado' })
    if (character.userId !== req.user.id) return res.status(403).json({ error: 'Sem permissão' })

    const asset = await prisma.marketAsset.findUnique({ where: { id: assetId } })
    if (!asset) return res.status(404).json({ error: 'Ativo não encontrado' })

    const priceRecord = await prisma.assetPrice.findUnique({
      where: { assetId_turn_roomId: { assetId, turn: character.room.currentTurn, roomId: character.roomId } }
    })
    const price = priceRecord ? Number(priceRecord.price) : Number(asset.basePrice)
    const total = price * quantity

    if (operation === 'buy') {
      if (Number(character.cash) < total) return res.status(422).json({ error: 'Saldo insuficiente' })

      const existing = await prisma.variableIncomePosition.findFirst({
        where: { characterId: character.id, assetId }
      })

      await prisma.$transaction([
        existing
          ? prisma.variableIncomePosition.update({
              where: { id: existing.id },
              data: {
                quantity: { increment: quantity },
                avgPrice: ((Number(existing.avgPrice) * existing.quantity) + total) / (existing.quantity + quantity)
              }
            })
          : prisma.variableIncomePosition.create({
              data: { characterId: character.id, assetId, quantity, avgPrice: price, boughtAt: character.room.currentTurn }
            }),
        prisma.character.update({ where: { id: character.id }, data: { cash: { decrement: total } } }),
        prisma.tradeHistory.create({
          data: { characterId: character.id, assetId, operation, quantity, price, total, turn: character.room.currentTurn }
        })
      ])

      res.status(201).json({ operation: 'buy', total, cashAfter: Number(character.cash) - total })

    } else {
      const position = await prisma.variableIncomePosition.findFirst({
        where: { characterId: character.id, assetId }
      })
      if (!position || position.quantity < quantity)
        return res.status(422).json({ error: 'Quantidade insuficiente na carteira' })

      await prisma.$transaction([
        position.quantity === quantity
          ? prisma.variableIncomePosition.delete({ where: { id: position.id } })
          : prisma.variableIncomePosition.update({ where: { id: position.id }, data: { quantity: { decrement: quantity } } }),
        prisma.character.update({ where: { id: character.id }, data: { cash: { increment: total } } }),
        prisma.tradeHistory.create({
          data: { characterId: character.id, assetId, operation, quantity, price, total, turn: character.room.currentTurn }
        })
      ])

      res.json({ operation: 'sell', total, cashAfter: Number(character.cash) + total })
    }
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

// ── DEBÊNTURES ────────────────────────────────────────────────────────────────

exports.getCompanies = async (req, res) => {
  try {
    const companies = await prisma.company.findMany()
    res.json(companies)
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

exports.getDebentures = async (req, res) => {
  try {
    const character = await prisma.character.findUnique({ where: { id: req.params.id } })
    if (!character) return res.status(404).json({ error: 'Personagem não encontrado' })
    if (character.userId !== req.user.id) return res.status(403).json({ error: 'Sem permissão' })

    const debentures = await prisma.debentureInvestment.findMany({
      where: { characterId: req.params.id },
      include: { company: true }
    })
    res.json(debentures)
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

exports.investDebenture = async (req, res) => {
  try {
    const { companyId, amount } = req.body
    const character = await prisma.character.findUnique({
      where: { id: req.params.id },
      include: { room: true }
    })
    if (!character) return res.status(404).json({ error: 'Personagem não encontrado' })
    if (character.userId !== req.user.id) return res.status(403).json({ error: 'Sem permissão' })
    if (Number(character.cash) < amount) return res.status(422).json({ error: 'Saldo insuficiente' })

    const company = await prisma.company.findUnique({ where: { id: companyId } })
    if (!company) return res.status(404).json({ error: 'Empresa não encontrada' })

    const maturesAt = Math.min(character.room.currentTurn + 3, character.room.maxTurns)

    const [debenture] = await prisma.$transaction([
      prisma.debentureInvestment.create({
        data: {
          characterId: character.id,
          companyId,
          amount,
          annualRate: company.annualRate,
          investedAt: character.room.currentTurn,
          maturesAt
        }
      }),
      prisma.character.update({
        where: { id: character.id },
        data: { cash: { decrement: amount } }
      })
    ])

    res.status(201).json(debenture)
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}