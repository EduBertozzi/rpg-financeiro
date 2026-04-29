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