// __tests__/investments.test.js
process.env.JWT_SECRET = 'test-secret'

const request = require('supertest')
const app = require('../src/app')
const { prismaMock } = require('@prisma/client')
const { makeToken, authHeader } = require('./helpers/auth')

beforeEach(() => jest.clearAllMocks())

const TOKEN = makeToken({ id: 'user-1' })

const makeCharacter = (overrides = {}) => ({
  id: 'char-1', cash: 10000, userId: 'user-1', roomId: 'room-1',
  room: { id: 'room-1', currentTurn: 3, maxTurns: 12 },
  positions: [],
  ...overrides,
})

// ─── GET /fixed/:id ───────────────────────────────────────────────────────────

describe('GET /api/v1/investments/fixed/:id', () => {
  it('retorna investimentos de renda fixa', async () => {
    prismaMock.fixedIncomeInvestment.findMany.mockResolvedValue([
      { id: 'fi-1', amount: 5000, monthlyRate: 0.0075, redeemedAt: null },
    ])
    const res = await request(app).get('/api/v1/investments/fixed/char-1').set(authHeader(TOKEN))
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })

  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/v1/investments/fixed/char-1')
    expect(res.status).toBe(401)
  })
})

// ─── POST /fixed/:id ─────────────────────────────────────────────────────────

describe('POST /api/v1/investments/fixed/:id', () => {
  it('investe com saldo suficiente', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.$transaction.mockResolvedValue([{ id: 'fi-1', amount: 3000, monthlyRate: 0.0075 }, {}])

    const res = await request(app)
      .post('/api/v1/investments/fixed/char-1')
      .set(authHeader(TOKEN))
      .send({ amount: 3000 })

    expect(res.status).toBe(201)
  })

  it('guarda na caixinha: desconta da conta, usa a taxa do tipo e registra no extrato', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.$transaction.mockResolvedValue([{ id: 'fi-1' }, {}, {}])

    const res = await request(app)
      .post('/api/v1/investments/fixed/char-1')
      .set(authHeader(TOKEN))
      .send({ amount: 1500, type: 'LCA' })

    expect(res.status).toBe(201)
    expect(prismaMock.fixedIncomeInvestment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ amount: 1500, type: 'LCA', investedAt: 3, monthlyRate: expect.closeTo(Math.pow(1.131, 1 / 12) - 1, 12) }),
    })
    expect(prismaMock.character.update).toHaveBeenCalledWith({ where: { id: 'char-1' }, data: { cash: { decrement: 1500 } } })
    expect(prismaMock.characterEventLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ cashImpact: -1500, description: 'Caixinha: Guardado em LCA' }),
    })
  })

  it('arredonda o valor guardado para centavos', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.$transaction.mockResolvedValue([{ id: 'fi-1' }, {}, {}])

    await request(app).post('/api/v1/investments/fixed/char-1').set(authHeader(TOKEN)).send({ amount: 0.1 + 0.2, type: 'CDB' })

    expect(prismaMock.fixedIncomeInvestment.create).toHaveBeenCalledWith({ data: expect.objectContaining({ amount: 0.3 }) })
    expect(prismaMock.character.update).toHaveBeenCalledWith({ where: { id: 'char-1' }, data: { cash: { decrement: 0.3 } } })
  })

  it('recusa valor que não é número', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    const res = await request(app).post('/api/v1/investments/fixed/char-1').set(authHeader(TOKEN)).send({ amount: 'abc', type: 'CDB' })
    expect(res.status).toBe(400)
  })

  it('poupança é guardada como reserva de emergência', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.$transaction.mockResolvedValue([{ id: 'fi-1' }, {}, {}])

    await request(app).post('/api/v1/investments/fixed/char-1').set(authHeader(TOKEN)).send({ amount: 100, type: 'POUPANCA' })

    expect(prismaMock.fixedIncomeInvestment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'POUPANCA', isEmergency: true }),
    })
  })

  it('retorna 400 com tipo de investimento desconhecido', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    const res = await request(app)
      .post('/api/v1/investments/fixed/char-1')
      .set(authHeader(TOKEN))
      .send({ amount: 100, type: 'FII' })
    expect(res.status).toBe(400)
  })

  it('retorna 404 se personagem não existe', async () => {
    prismaMock.character.findUnique.mockResolvedValue(null)
    const res = await request(app).post('/api/v1/investments/fixed/char-1').set(authHeader(TOKEN)).send({ amount: 3000 })
    expect(res.status).toBe(404)
  })

  it('retorna 403 ao investir em personagem de outro usuário', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ userId: 'outro-user' }))
    const res = await request(app).post('/api/v1/investments/fixed/char-1').set(authHeader(TOKEN)).send({ amount: 3000 })
    expect(res.status).toBe(403)
  })

  it('retorna 400 com valor inválido', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    const res = await request(app).post('/api/v1/investments/fixed/char-1').set(authHeader(TOKEN)).send({ amount: -100 })
    expect(res.status).toBe(400)
  })

  it('retorna 422 com saldo insuficiente', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ cash: 100 }))
    const res = await request(app).post('/api/v1/investments/fixed/char-1').set(authHeader(TOKEN)).send({ amount: 5000 })
    expect(res.status).toBe(422)
  })

  it('retorna 401 sem token', async () => {
    const res = await request(app).post('/api/v1/investments/fixed/char-1').send({ amount: 3000 })
    expect(res.status).toBe(401)
  })
})

// ─── DELETE /fixed/:id/:investmentId ─────────────────────────────────────────

describe('DELETE /api/v1/investments/fixed/:id/:investmentId', () => {
  it('resgata investimento com sucesso', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.fixedIncomeInvestment.findUnique.mockResolvedValue({
      id: 'fi-1', characterId: 'char-1', amount: 5075, redeemedAt: null, monthlyRate: 0.0075, investedAt: 1,
    })
    prismaMock.$transaction.mockResolvedValue([])

    const res = await request(app)
      .delete('/api/v1/investments/fixed/char-1/fi-1')
      .set(authHeader(TOKEN))

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('redeemedValue')
  })

  it('resgata o valor atual sem contar os juros duas vezes', async () => {
    // amount já inclui os rendimentos mensais aplicados pelo turnEngine
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.fixedIncomeInvestment.findUnique.mockResolvedValue({
      id: 'fi-1', characterId: 'char-1', type: 'POUPANCA', amount: 5075, redeemedAt: null, monthlyRate: 0.0075, investedAt: 1,
    })
    prismaMock.$transaction.mockResolvedValue([])

    const res = await request(app).delete('/api/v1/investments/fixed/char-1/fi-1').set(authHeader(TOKEN))

    expect(res.body.redeemedValue).toBe(5075)
    expect(res.body.incomeTax).toBe(0)
  })

  it('desconta IR de 17,5% sobre o rendimento do CDB', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.fixedIncomeInvestment.findUnique.mockResolvedValue({
      id: 'fi-1', characterId: 'char-1', type: 'CDB', amount: 5075, redeemedAt: null, monthlyRate: 0.0075, investedAt: 1,
    })
    prismaMock.$transaction.mockResolvedValue([])

    const res = await request(app).delete('/api/v1/investments/fixed/char-1/fi-1').set(authHeader(TOKEN))

    // aplicado: 5075 / 1.0075² = 4999,72 → rendimento 75,28 → IR 13,17
    expect(res.body.incomeTax).toBeCloseTo(13.17, 2)
    expect(res.body.redeemedValue).toBeCloseTo(5061.83, 2)
  })

  it('retorna 404 se personagem não existe', async () => {
    prismaMock.character.findUnique.mockResolvedValue(null)
    const res = await request(app).delete('/api/v1/investments/fixed/char-1/fi-1').set(authHeader(TOKEN))
    expect(res.status).toBe(404)
  })

  it('retorna 403 ao resgatar investimento de outro usuário', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ userId: 'outro-user' }))
    const res = await request(app).delete('/api/v1/investments/fixed/char-1/fi-1').set(authHeader(TOKEN))
    expect(res.status).toBe(403)
  })

  it('retorna 404 se investimento não existe', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.fixedIncomeInvestment.findUnique.mockResolvedValue(null)
    const res = await request(app).delete('/api/v1/investments/fixed/char-1/fi-1').set(authHeader(TOKEN))
    expect(res.status).toBe(404)
  })

  it('retorna 400 se já resgatado', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.fixedIncomeInvestment.findUnique.mockResolvedValue({
      id: 'fi-1', characterId: 'char-1', amount: 5000, redeemedAt: 2,
    })
    const res = await request(app).delete('/api/v1/investments/fixed/char-1/fi-1').set(authHeader(TOKEN))
    expect(res.status).toBe(400)
  })

  it('retorna 401 sem token', async () => {
    const res = await request(app).delete('/api/v1/investments/fixed/char-1/fi-1')
    expect(res.status).toBe(401)
  })
})

// ─── POST /fixed/:id/withdraw ─────────────────────────────────────────────────

describe('POST /api/v1/investments/fixed/:id/withdraw', () => {
  const withdraw = (body) => request(app)
    .post('/api/v1/investments/fixed/char-1/withdraw')
    .set(authHeader(TOKEN))
    .send(body)

  it('resgata parte da caixinha começando pelo investimento mais antigo', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.fixedIncomeInvestment.findMany.mockResolvedValue([
      { id: 'old', type: 'CDB', amount: 1000, monthlyRate: 0.01, investedAt: 1 },
      { id: 'new', type: 'CDB', amount: 2000, monthlyRate: 0.01, investedAt: 2 },
    ])
    prismaMock.$transaction.mockResolvedValue([])

    const res = await withdraw({ type: 'CDB', amount: 1500 })

    expect(res.status).toBe(200)
    // old: rendimento 19,70 → IR 3,45; new (1/4): rendimento 4,95 → IR 0,87
    expect(res.body.incomeTax).toBeCloseTo(4.31, 1)
    expect(res.body.net).toBeCloseTo(1500 - res.body.incomeTax, 2)
    expect(prismaMock.fixedIncomeInvestment.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'old' }, data: expect.objectContaining({ redeemedAt: 3 }) })
    )
    expect(prismaMock.fixedIncomeInvestment.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'new' }, data: { amount: { decrement: 500 } } })
    )
  })

  it('cobra 22,5% de IR no Tesouro resgatado antes de 6 meses', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.fixedIncomeInvestment.findMany.mockResolvedValue([
      { id: 't', type: 'TESOURO_SELIC', amount: 1020.1, monthlyRate: 0.01, investedAt: 1 },
    ])
    prismaMock.$transaction.mockResolvedValue([])

    const res = await withdraw({ type: 'TESOURO_SELIC', amount: 1020.1 })

    expect(res.body.incomeTax).toBeCloseTo(20.1 * 0.225, 2)
  })

  it('cobra 15% de IR no Tesouro depois de 6 meses', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ room: { id: 'room-1', currentTurn: 8, maxTurns: 12 } }))
    prismaMock.fixedIncomeInvestment.findMany.mockResolvedValue([
      { id: 't', type: 'TESOURO_SELIC', amount: 1000 * Math.pow(1.01, 7), monthlyRate: 0.01, investedAt: 1 },
    ])
    prismaMock.$transaction.mockResolvedValue([])

    const res = await withdraw({ type: 'TESOURO_SELIC', amount: 1000 * Math.pow(1.01, 7) })

    expect(res.body.incomeTax).toBeCloseTo((Math.pow(1.01, 7) - 1) * 1000 * 0.15, 1)
  })

  it('não cobra IR da Reserva de Emergência (poupança)', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.fixedIncomeInvestment.findMany.mockResolvedValue([
      { id: 'p', type: 'POUPANCA', amount: 1100, monthlyRate: 0.05, investedAt: 1 },
    ])
    prismaMock.$transaction.mockResolvedValue([])

    const res = await withdraw({ type: 'POUPANCA', amount: 500 })

    expect(res.body).toMatchObject({ incomeTax: 0, net: 500 })
  })

  it('retorna 422 quando a caixinha não tem o valor pedido', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.fixedIncomeInvestment.findMany.mockResolvedValue([
      { id: 'p', type: 'POUPANCA', amount: 300, monthlyRate: 0.005, investedAt: 3 },
    ])

    const res = await withdraw({ type: 'POUPANCA', amount: 500 })

    expect(res.status).toBe(422)
  })

  it('credita o líquido na conta e registra o resgate com IR no extrato', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ room: { id: 'room-1', currentTurn: 4, maxTurns: 12 } }))
    prismaMock.fixedIncomeInvestment.findMany.mockResolvedValue([
      { id: 'c', type: 'CDB', amount: 1030.301, monthlyRate: 0.01, investedAt: 1 },
    ])
    prismaMock.$transaction.mockResolvedValue([])

    const res = await withdraw({ type: 'CDB', amount: 1030.301 })

    // rendimento 30,30 → IR 5,30 → líquido 1025,00
    expect(res.body).toMatchObject({ gross: 1030.3, incomeTax: 5.3, net: 1025 })
    expect(prismaMock.character.update).toHaveBeenCalledWith({ where: { id: 'char-1' }, data: { cash: { increment: 1025 } } })
    expect(prismaMock.characterEventLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ turn: 4, cashImpact: 1025, description: 'Caixinha: Resgate de CDB (IR de R$ 5.30)' }),
    })
  })

  it('busca só investimentos ativos do tipo pedido, do mais antigo ao mais novo', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.fixedIncomeInvestment.findMany.mockResolvedValue([
      { id: 'p', type: 'LCI', amount: 1000, monthlyRate: 0.009, investedAt: 3 },
    ])
    prismaMock.$transaction.mockResolvedValue([])

    await withdraw({ type: 'LCI', amount: 100 })

    expect(prismaMock.fixedIncomeInvestment.findMany).toHaveBeenCalledWith({
      where: { characterId: 'char-1', type: 'LCI', redeemedAt: null },
      orderBy: { investedAt: 'asc' },
    })
  })

  it('retorna 400 com tipo ou valor inválido', async () => {
    expect((await withdraw({ type: 'FII', amount: 100 })).status).toBe(400)
    expect((await withdraw({ type: 'CDB', amount: 0 })).status).toBe(400)
  })

  it('resgatar "tudo" com centavos quebrados fecha o investimento', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.fixedIncomeInvestment.findMany.mockResolvedValue([
      { id: 'p', type: 'POUPANCA', amount: 1030.3014, monthlyRate: 0.005, investedAt: 3 },
    ])
    prismaMock.$transaction.mockResolvedValue([])

    const res = await withdraw({ type: 'POUPANCA', amount: 1030.30 })

    expect(res.status).toBe(200)
    expect(prismaMock.fixedIncomeInvestment.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p' }, data: expect.objectContaining({ redeemedAt: 3 }) })
    )
  })

  it('retorna 403 para personagem de outro usuário', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ userId: 'outro-user' }))
    const res = await withdraw({ type: 'CDB', amount: 100 })
    expect(res.status).toBe(403)
  })
})

// ─── GET /market/:roomId ──────────────────────────────────────────────────────

describe('GET /api/v1/investments/market/:roomId', () => {
  it('retorna mercado com preços do turno atual', async () => {
    prismaMock.room.findUnique.mockResolvedValue({ id: 'room-1', currentTurn: 3 })
    prismaMock.marketAsset.findMany.mockResolvedValue([
      { id: 'asset-1', ticker: 'PETR4', name: 'Petrobras', type: 'stock', riskLevel: 'medium', basePrice: 30 },
    ])
    prismaMock.assetPrice.findUnique
      .mockResolvedValueOnce({ price: 31.5 })  // current
      .mockResolvedValueOnce({ price: 30 })    // prev

    const res = await request(app).get('/api/v1/investments/market/room-1').set(authHeader(TOKEN))

    expect(res.status).toBe(200)
    expect(res.body[0].ticker).toBe('PETR4')
    expect(res.body[0].currentPrice).toBe(31.5)
    expect(res.body[0].changePct).toBe(5)
  })

  it('usa basePrice como fallback quando não há preço registrado', async () => {
    prismaMock.room.findUnique.mockResolvedValue({ id: 'room-1', currentTurn: 1 })
    prismaMock.marketAsset.findMany.mockResolvedValue([
      { id: 'asset-1', ticker: 'VALE3', name: 'Vale', type: 'stock', riskLevel: 'high', basePrice: 50 },
    ])
    prismaMock.assetPrice.findUnique.mockResolvedValue(null)

    const res = await request(app).get('/api/v1/investments/market/room-1').set(authHeader(TOKEN))

    expect(res.status).toBe(200)
    expect(res.body[0].currentPrice).toBe(50)
    expect(res.body[0].changePct).toBe(0)
  })

  it('retorna 404 se sala não existe', async () => {
    prismaMock.room.findUnique.mockResolvedValue(null)
    const res = await request(app).get('/api/v1/investments/market/naoexiste').set(authHeader(TOKEN))
    expect(res.status).toBe(404)
  })

  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/v1/investments/market/room-1')
    expect(res.status).toBe(401)
  })
})

// ─── GET /portfolio/:id ───────────────────────────────────────────────────────

describe('GET /api/v1/investments/portfolio/:id', () => {
  it('retorna carteira com posições e P&L', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({
      positions: [{
        id: 'pos-1', assetId: 'asset-1', quantity: 10, avgPrice: 30,
        asset: { ticker: 'PETR4', name: 'Petrobras', type: 'stock', basePrice: 30 }
      }]
    }))
    prismaMock.assetPrice.findUnique.mockResolvedValue({ price: 35 })

    const res = await request(app).get('/api/v1/investments/portfolio/char-1').set(authHeader(TOKEN))

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].totalValue).toBe(350)
    expect(res.body[0].profitLoss).toBe(50)
  })

  it('usa basePrice quando não há preço registrado', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({
      positions: [{
        id: 'pos-1', assetId: 'asset-1', quantity: 5, avgPrice: 20,
        asset: { ticker: 'VALE3', name: 'Vale', type: 'stock', basePrice: 20 }
      }]
    }))
    prismaMock.assetPrice.findUnique.mockResolvedValue(null)

    const res = await request(app).get('/api/v1/investments/portfolio/char-1').set(authHeader(TOKEN))

    expect(res.status).toBe(200)
    expect(res.body[0].profitLoss).toBe(0)
  })

  it('retorna 404 se personagem não existe', async () => {
    prismaMock.character.findUnique.mockResolvedValue(null)
    const res = await request(app).get('/api/v1/investments/portfolio/char-1').set(authHeader(TOKEN))
    expect(res.status).toBe(404)
  })

  it('retorna 403 para personagem de outro usuário', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ userId: 'outro-user', positions: [] }))
    const res = await request(app).get('/api/v1/investments/portfolio/char-1').set(authHeader(TOKEN))
    expect(res.status).toBe(403)
  })

  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/v1/investments/portfolio/char-1')
    expect(res.status).toBe(401)
  })
})

// ─── POST /trade/:id — compra ─────────────────────────────────────────────────

describe('POST /api/v1/investments/trade/:id — compra', () => {
  it('compra ativo novo (sem posição existente)', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.marketAsset.findUnique.mockResolvedValue({ id: 'asset-1', basePrice: 30 })
    prismaMock.assetPrice.findUnique.mockResolvedValue({ price: 30 })
    prismaMock.variableIncomePosition.findFirst.mockResolvedValue(null)
    prismaMock.$transaction.mockResolvedValue([])

    const res = await request(app)
      .post('/api/v1/investments/trade/char-1')
      .set(authHeader(TOKEN))
      .send({ assetId: 'asset-1', operation: 'buy', quantity: 10 })

    expect(res.status).toBe(201)
    expect(res.body.operation).toBe('buy')
    expect(res.body.total).toBe(300)
  })

  it('compra ativo já existente na carteira (média ponderada)', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.marketAsset.findUnique.mockResolvedValue({ id: 'asset-1', basePrice: 30 })
    prismaMock.assetPrice.findUnique.mockResolvedValue({ price: 35 })
    prismaMock.variableIncomePosition.findFirst.mockResolvedValue({ id: 'pos-1', quantity: 10, avgPrice: 30 })
    prismaMock.$transaction.mockResolvedValue([])

    const res = await request(app)
      .post('/api/v1/investments/trade/char-1')
      .set(authHeader(TOKEN))
      .send({ assetId: 'asset-1', operation: 'buy', quantity: 5 })

    expect(res.status).toBe(201)
    // (10 × 30 + 5 × 35) / 15 = 31,67
    expect(prismaMock.variableIncomePosition.update).toHaveBeenCalledWith({
      where: { id: 'pos-1' },
      data: { quantity: { increment: 5 }, avgPrice: expect.closeTo(475 / 15, 10) },
    })
  })

  it('compra registra no extrato com o total pago', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.marketAsset.findUnique.mockResolvedValue({ id: 'asset-1', ticker: 'VALE3', name: 'Vale', basePrice: 83.79 })
    prismaMock.assetPrice.findUnique.mockResolvedValue({ price: 83.79 })
    prismaMock.variableIncomePosition.findFirst.mockResolvedValue(null)
    prismaMock.$transaction.mockResolvedValue([])

    await request(app).post('/api/v1/investments/trade/char-1').set(authHeader(TOKEN)).send({ assetId: 'asset-1', operation: 'buy', quantity: 10 })

    expect(prismaMock.character.update).toHaveBeenCalledWith({ where: { id: 'char-1' }, data: { cash: { decrement: 837.9 } } })
    expect(prismaMock.characterEventLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ cashImpact: -837.9, description: 'Ações: Compra de 10 VALE3 (Vale)' }),
    })
  })

  it('usa basePrice como fallback quando não há preço registrado', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.marketAsset.findUnique.mockResolvedValue({ id: 'asset-1', basePrice: 25 })
    prismaMock.assetPrice.findUnique.mockResolvedValue(null)
    prismaMock.variableIncomePosition.findFirst.mockResolvedValue(null)
    prismaMock.$transaction.mockResolvedValue([])

    const res = await request(app)
      .post('/api/v1/investments/trade/char-1')
      .set(authHeader(TOKEN))
      .send({ assetId: 'asset-1', operation: 'buy', quantity: 2 })

    expect(res.status).toBe(201)
    expect(res.body.total).toBe(50)
  })

  it('retorna 422 com saldo insuficiente', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ cash: 10 }))
    prismaMock.marketAsset.findUnique.mockResolvedValue({ id: 'asset-1', basePrice: 30 })
    prismaMock.assetPrice.findUnique.mockResolvedValue({ price: 30 })

    const res = await request(app)
      .post('/api/v1/investments/trade/char-1')
      .set(authHeader(TOKEN))
      .send({ assetId: 'asset-1', operation: 'buy', quantity: 10 })

    expect(res.status).toBe(422)
  })

  it('retorna 400 com operação inválida', async () => {
    const res = await request(app)
      .post('/api/v1/investments/trade/char-1')
      .set(authHeader(TOKEN))
      .send({ assetId: 'asset-1', operation: 'hold', quantity: 10 })
    expect(res.status).toBe(400)
  })

  it('retorna 400 com quantidade inválida', async () => {
    const res = await request(app)
      .post('/api/v1/investments/trade/char-1')
      .set(authHeader(TOKEN))
      .send({ assetId: 'asset-1', operation: 'buy', quantity: 0 })
    expect(res.status).toBe(400)
  })

  it('retorna 404 se personagem não existe', async () => {
    prismaMock.character.findUnique.mockResolvedValue(null)
    const res = await request(app)
      .post('/api/v1/investments/trade/char-1')
      .set(authHeader(TOKEN))
      .send({ assetId: 'asset-1', operation: 'buy', quantity: 1 })
    expect(res.status).toBe(404)
  })

  it('retorna 403 para personagem de outro usuário', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ userId: 'outro-user' }))
    const res = await request(app)
      .post('/api/v1/investments/trade/char-1')
      .set(authHeader(TOKEN))
      .send({ assetId: 'asset-1', operation: 'buy', quantity: 1 })
    expect(res.status).toBe(403)
  })

  it('retorna 404 se ativo não existe', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.marketAsset.findUnique.mockResolvedValue(null)
    const res = await request(app)
      .post('/api/v1/investments/trade/char-1')
      .set(authHeader(TOKEN))
      .send({ assetId: 'naoexiste', operation: 'buy', quantity: 1 })
    expect(res.status).toBe(404)
  })

  it('retorna 401 sem token', async () => {
    const res = await request(app).post('/api/v1/investments/trade/char-1').send({ assetId: 'asset-1', operation: 'buy', quantity: 1 })
    expect(res.status).toBe(401)
  })
})

// ─── POST /trade/:id — venda ──────────────────────────────────────────────────

describe('POST /api/v1/investments/trade/:id — venda', () => {
  it('vende quantidade parcial', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.marketAsset.findUnique.mockResolvedValue({ id: 'asset-1', basePrice: 30 })
    prismaMock.assetPrice.findUnique.mockResolvedValue({ price: 35 })
    prismaMock.variableIncomePosition.findFirst.mockResolvedValue({ id: 'pos-1', quantity: 10, avgPrice: 30 })
    prismaMock.$transaction.mockResolvedValue([])

    const res = await request(app)
      .post('/api/v1/investments/trade/char-1')
      .set(authHeader(TOKEN))
      .send({ assetId: 'asset-1', operation: 'sell', quantity: 5 })

    expect(res.status).toBe(200)
    expect(res.body.operation).toBe('sell')
    expect(res.body.total).toBe(175)
    expect(prismaMock.character.update).toHaveBeenCalledWith({ where: { id: 'char-1' }, data: { cash: { increment: 175 } } })
    expect(prismaMock.characterEventLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ cashImpact: 175 }),
    })
  })

  it('vende quantidade total (apaga posição)', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.marketAsset.findUnique.mockResolvedValue({ id: 'asset-1', basePrice: 30 })
    prismaMock.assetPrice.findUnique.mockResolvedValue({ price: 30 })
    prismaMock.variableIncomePosition.findFirst.mockResolvedValue({ id: 'pos-1', quantity: 10, avgPrice: 30 })
    prismaMock.$transaction.mockResolvedValue([])

    const res = await request(app)
      .post('/api/v1/investments/trade/char-1')
      .set(authHeader(TOKEN))
      .send({ assetId: 'asset-1', operation: 'sell', quantity: 10 })

    expect(res.status).toBe(200)
  })

  it('retorna 422 sem posição ou quantidade insuficiente', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.marketAsset.findUnique.mockResolvedValue({ id: 'asset-1', basePrice: 30 })
    prismaMock.assetPrice.findUnique.mockResolvedValue({ price: 30 })
    prismaMock.variableIncomePosition.findFirst.mockResolvedValue(null)

    const res = await request(app)
      .post('/api/v1/investments/trade/char-1')
      .set(authHeader(TOKEN))
      .send({ assetId: 'asset-1', operation: 'sell', quantity: 5 })

    expect(res.status).toBe(422)
  })
})

// ─── GET /companies ───────────────────────────────────────────────────────────

describe('GET /api/v1/investments/companies', () => {
  it('retorna lista de empresas sem autenticação', async () => {
    prismaMock.company.findMany.mockResolvedValue([
      { id: 'co-1', name: 'TechCorp', defaultProbability: 0.1, annualRate: 0.12 },
    ])
    const res = await request(app).get('/api/v1/investments/companies')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })
})

// ─── GET /debentures/:id ─────────────────────────────────────────────────────

describe('GET /api/v1/investments/debentures/:id', () => {
  it('retorna debêntures do personagem', async () => {
    prismaMock.character.findUnique.mockResolvedValue({ id: 'char-1', userId: 'user-1' })
    prismaMock.debentureInvestment.findMany.mockResolvedValue([
      { id: 'deb-1', amount: 10000, status: 'active', company: { name: 'TechCorp' } },
    ])
    const res = await request(app).get('/api/v1/investments/debentures/char-1').set(authHeader(TOKEN))
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })

  it('retorna 404 se personagem não existe', async () => {
    prismaMock.character.findUnique.mockResolvedValue(null)
    const res = await request(app).get('/api/v1/investments/debentures/char-1').set(authHeader(TOKEN))
    expect(res.status).toBe(404)
  })

  it('retorna 403 para personagem de outro usuário', async () => {
    prismaMock.character.findUnique.mockResolvedValue({ id: 'char-2', userId: 'outro-user' })
    const res = await request(app).get('/api/v1/investments/debentures/char-2').set(authHeader(TOKEN))
    expect(res.status).toBe(403)
  })

  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/v1/investments/debentures/char-1')
    expect(res.status).toBe(401)
  })
})

// ─── POST /debentures/:id ─────────────────────────────────────────────────────

describe('POST /api/v1/investments/debentures/:id', () => {
  it('investe em debênture com sucesso', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.company.findUnique.mockResolvedValue({ id: 'co-1', annualRate: 0.12 })
    prismaMock.$transaction.mockResolvedValue([{ id: 'deb-1', amount: 5000 }, {}])

    const res = await request(app)
      .post('/api/v1/investments/debentures/char-1')
      .set(authHeader(TOKEN))
      .send({ companyId: 'co-1', amount: 5000 })

    expect(res.status).toBe(201)
  })

  it('recusa debênture com valor inválido', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    const res = await request(app).post('/api/v1/investments/debentures/char-1').set(authHeader(TOKEN)).send({ companyId: 'co-1', amount: -50 })
    expect(res.status).toBe(400)
  })

  it('vence em 10 meses, limitado ao fim da partida', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ room: { id: 'room-1', currentTurn: 1, maxTurns: 12 } }))
    prismaMock.company.findUnique.mockResolvedValue({ id: 'co-1', name: 'Milhas Fácil', annualRate: 0.18 })
    prismaMock.$transaction.mockResolvedValue([{ id: 'deb-1' }, {}, {}])

    await request(app).post('/api/v1/investments/debentures/char-1').set(authHeader(TOKEN)).send({ companyId: 'co-1', amount: 1000 })
    expect(prismaMock.debentureInvestment.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ maturesAt: 11 }) })
    )

    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ room: { id: 'room-1', currentTurn: 5, maxTurns: 12 } }))
    await request(app).post('/api/v1/investments/debentures/char-1').set(authHeader(TOKEN)).send({ companyId: 'co-1', amount: 1000 })
    expect(prismaMock.debentureInvestment.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ maturesAt: 12 }) })
    )
  })

  it('retorna 404 se personagem não existe', async () => {
    prismaMock.character.findUnique.mockResolvedValue(null)
    const res = await request(app).post('/api/v1/investments/debentures/char-1').set(authHeader(TOKEN)).send({ companyId: 'co-1', amount: 5000 })
    expect(res.status).toBe(404)
  })

  it('retorna 403 para personagem de outro usuário', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ userId: 'outro-user' }))
    const res = await request(app).post('/api/v1/investments/debentures/char-1').set(authHeader(TOKEN)).send({ companyId: 'co-1', amount: 5000 })
    expect(res.status).toBe(403)
  })

  it('retorna 422 com saldo insuficiente', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ cash: 100 }))
    const res = await request(app).post('/api/v1/investments/debentures/char-1').set(authHeader(TOKEN)).send({ companyId: 'co-1', amount: 5000 })
    expect(res.status).toBe(422)
  })

  it('retorna 404 se empresa não existe', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.company.findUnique.mockResolvedValue(null)
    const res = await request(app).post('/api/v1/investments/debentures/char-1').set(authHeader(TOKEN)).send({ companyId: 'naoexiste', amount: 5000 })
    expect(res.status).toBe(404)
  })

  it('retorna 401 sem token', async () => {
    const res = await request(app).post('/api/v1/investments/debentures/char-1').send({ companyId: 'co-1', amount: 5000 })
    expect(res.status).toBe(401)
  })
})