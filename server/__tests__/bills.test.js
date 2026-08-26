// __tests__/bills.test.js
process.env.JWT_SECRET = 'test-secret'

const request = require('supertest')
const app = require('../src/app')
const { prismaMock } = require('@prisma/client')
const { makeToken, authHeader } = require('./helpers/auth')

beforeEach(() => jest.clearAllMocks())

const TOKEN = makeToken({ id: 'user-1' })

const makeCharacter = (overrides = {}) => ({
  id: 'char-1',
  userId: 'user-1',
  foodCost: 1000,
  utilitiesCost: 250,
  transportCost: 250,
  ...overrides,
})

// ─── GET /api/v1/characters/:id/bills/:turn ───────────────────────────────────

describe('GET /api/v1/characters/:id/bills/:turn', () => {
  it('retorna os 3 tipos de conta com o status de pagamento', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.characterEventLog.findFirst
      .mockResolvedValueOnce({ id: 'log-1' }) // food: pago
      .mockResolvedValueOnce(null) // utilities: não pago
      .mockResolvedValueOnce(null) // transport: não pago

    const res = await request(app)
      .get('/api/v1/characters/char-1/bills/1')
      .set(authHeader(TOKEN))

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(3)
    expect(res.body.find(b => b.type === 'food')).toMatchObject({ label: 'Mercadinho', amount: 1000, paid: true })
    expect(res.body.find(b => b.type === 'utilities')).toMatchObject({ label: 'Água e Luz', amount: 250, paid: false })
    expect(res.body.find(b => b.type === 'transport')).toMatchObject({ label: 'Internet e Celular', amount: 250, paid: false })
  })

  it('retorna 404 para personagem inexistente', async () => {
    prismaMock.character.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .get('/api/v1/characters/naoexiste/bills/1')
      .set(authHeader(TOKEN))

    expect(res.status).toBe(404)
  })

  it('retorna 403 para personagem de outro usuário', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ userId: 'outro-user' }))

    const res = await request(app)
      .get('/api/v1/characters/char-1/bills/1')
      .set(authHeader(TOKEN))

    expect(res.status).toBe(403)
  })

  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/v1/characters/char-1/bills/1')
    expect(res.status).toBe(401)
  })
})

// ─── POST /api/v1/characters/:id/bills/:turn/pay ──────────────────────────────

describe('POST /api/v1/characters/:id/bills/:turn/pay', () => {
  it('paga a conta e desconta do saldo', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.characterEventLog.findFirst.mockResolvedValue(null)
    prismaMock.character.update.mockResolvedValue({})
    prismaMock.characterEventLog.create.mockResolvedValue({})

    const res = await request(app)
      .post('/api/v1/characters/char-1/bills/1/pay')
      .set(authHeader(TOKEN))
      .send({ type: 'food' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ label: 'Mercadinho', amount: 1000 })
    expect(prismaMock.character.update).toHaveBeenCalledWith({
      where: { id: 'char-1' },
      data: { cash: { decrement: 1000 } }
    })
  })

  it('retorna 400 para tipo de conta inválido', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())

    const res = await request(app)
      .post('/api/v1/characters/char-1/bills/1/pay')
      .set(authHeader(TOKEN))
      .send({ type: 'aluguel' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Tipo de conta inválido')
  })

  it('retorna 400 se a conta já foi paga', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.characterEventLog.findFirst.mockResolvedValue({ id: 'log-1' })

    const res = await request(app)
      .post('/api/v1/characters/char-1/bills/1/pay')
      .set(authHeader(TOKEN))
      .send({ type: 'utilities' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Conta já paga')
  })

  it('retorna 404 para personagem inexistente', async () => {
    prismaMock.character.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .post('/api/v1/characters/naoexiste/bills/1/pay')
      .set(authHeader(TOKEN))
      .send({ type: 'food' })

    expect(res.status).toBe(404)
  })

  it('retorna 403 para personagem de outro usuário', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ userId: 'outro-user' }))

    const res = await request(app)
      .post('/api/v1/characters/char-1/bills/1/pay')
      .set(authHeader(TOKEN))
      .send({ type: 'food' })

    expect(res.status).toBe(403)
  })

  it('retorna 401 sem token', async () => {
    const res = await request(app).post('/api/v1/characters/char-1/bills/1/pay').send({ type: 'food' })
    expect(res.status).toBe(401)
  })
})
