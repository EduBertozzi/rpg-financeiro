// __tests__/turns.test.js
process.env.JWT_SECRET = 'test-secret'

jest.mock('../src/utils/turnEngine', () => ({
  processTurn: jest.fn(),
  DILEMMAS: [
    null,
    { title: 'Reserva ou Investimento?', options: [
      { label: 'A', text: 'Guarda em renda fixa', effectType: 'none', effectValue: 0, probability: 1.0 },
      { label: 'B', text: 'Aplica em variável', effectType: 'immediate_cash', effectValue: 300, probability: 0.5 },
    ]},
    { title: 'Cartão de Crédito', options: [
      { label: 'A', text: 'Recusa a viagem', effectType: 'none', effectValue: 0, probability: 1.0 },
      { label: 'B', text: 'Vai na viagem', effectType: 'immediate_cash', effectValue: -600, probability: 1.0 },
    ]},
    null,
    { title: 'Amigo Caloteiro', options: [
      { label: 'A', text: 'Empresta', effectType: 'loan_friend', effectValue: -1000, probability: 0.5 },
    ]},
    null, null, null, null,
    { title: 'Herança', options: [
      { label: 'A', text: 'Paga inventário', effectType: 'inheritance', effectValue: 6000, probability: 1.0 },
      { label: 'B', text: 'Abre mão', effectType: 'none', effectValue: 0, probability: 1.0 },
    ]},
    null, null, null, null,
  ]
}))

const request = require('supertest')
const app = require('../src/app')
const { prismaMock } = require('@prisma/client')
const { makeToken, makeAdminToken, authHeader } = require('./helpers/auth')
const { processTurn } = require('../src/utils/turnEngine')

beforeEach(() => jest.clearAllMocks())

const TOKEN = makeToken({ id: 'user-1' })
const ADMIN_TOKEN = makeAdminToken({ id: 'admin-1' })

// ─── POST /api/v1/rooms/:id/next-turn ─────────────────────────────────────────

describe('POST /api/v1/rooms/:id/next-turn', () => {
  it('admin processa próximo turno', async () => {
    prismaMock.room.findUnique.mockResolvedValue({ id: 'room-1', adminId: 'admin-1', status: 'active' })
    processTurn.mockResolvedValue({ turn: 4, isFinished: false, results: [], dilemma: null })

    const res = await request(app)
      .post('/api/v1/rooms/room-1/next-turn')
      .set(authHeader(ADMIN_TOKEN))

    expect(res.status).toBe(200)
    expect(res.body.turn).toBe(4)
  })

  it('retorna isFinished true no turno final', async () => {
    prismaMock.room.findUnique.mockResolvedValue({ id: 'room-1', adminId: 'admin-1', status: 'active' })
    processTurn.mockResolvedValue({ turn: 12, isFinished: true, results: [], dilemma: null })

    const res = await request(app)
      .post('/api/v1/rooms/room-1/next-turn')
      .set(authHeader(ADMIN_TOKEN))

    expect(res.status).toBe(200)
    expect(res.body.isFinished).toBe(true)
  })

  it('retorna 403 se não é o admin da sala', async () => {
    prismaMock.room.findUnique.mockResolvedValue({ id: 'room-1', adminId: 'outro-admin' })
    const res = await request(app).post('/api/v1/rooms/room-1/next-turn').set(authHeader(TOKEN))
    expect(res.status).toBe(403)
  })

  it('retorna 404 se sala não existe', async () => {
    prismaMock.room.findUnique.mockResolvedValue(null)
    const res = await request(app).post('/api/v1/rooms/naoexiste/next-turn').set(authHeader(ADMIN_TOKEN))
    expect(res.status).toBe(404)
  })

  it('retorna 500 se processTurn lança erro', async () => {
    prismaMock.room.findUnique.mockResolvedValue({ id: 'room-1', adminId: 'admin-1' })
    processTurn.mockRejectedValue(new Error('Erro no engine'))
    const res = await request(app).post('/api/v1/rooms/room-1/next-turn').set(authHeader(ADMIN_TOKEN))
    expect(res.status).toBe(500)
  })

  it('retorna 401 sem token', async () => {
    const res = await request(app).post('/api/v1/rooms/room-1/next-turn')
    expect(res.status).toBe(401)
  })
})

// ─── GET /api/v1/characters/:id/dilemma/:turn ─────────────────────────────────

describe('GET /api/v1/characters/:id/dilemma/:turn', () => {
  it('retorna dilema do turno 1', async () => {
    const res = await request(app)
      .get('/api/v1/characters/char-1/dilemma/1')
      .set(authHeader(TOKEN))
    expect(res.status).toBe(200)
    expect(res.body.dilemma.title).toBe('Reserva ou Investimento?')
  })

  it('retorna dilemma null para turno sem dilema', async () => {
    const res = await request(app)
      .get('/api/v1/characters/char-1/dilemma/0')
      .set(authHeader(TOKEN))
    expect(res.status).toBe(200)
    expect(res.body.dilemma).toBeNull()
  })

  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/v1/characters/char-1/dilemma/1')
    expect(res.status).toBe(401)
  })
})

// ─── POST chooseDilemma — effectType: none ────────────────────────────────────

describe('POST chooseDilemma — effectType: none', () => {
  it('opção none não altera caixa', async () => {
    prismaMock.characterEventLog.findFirst.mockResolvedValue(null)
    prismaMock.character.findUnique.mockResolvedValue({ id: 'char-1', userId: 'user-1', cash: 5000 })
    prismaMock.characterEventLog.create.mockResolvedValue({})
    prismaMock.characterSkillPoints.update.mockResolvedValue({})

    const res = await request(app)
      .post('/api/v1/characters/char-1/dilemma/2/choose')
      .set(authHeader(TOKEN))
      .send({ optionIndex: 0 })

    expect(res.status).toBe(200)
    expect(res.body.cashImpact).toBe(0)
    expect(prismaMock.character.update).not.toHaveBeenCalled()
  })
})

// ─── POST chooseDilemma — effectType: immediate_cash ──────────────────────────

describe('POST chooseDilemma — effectType: immediate_cash', () => {
  it('impacto negativo atualiza caixa e retorna mensagem correta', async () => {
    prismaMock.characterEventLog.findFirst.mockResolvedValue(null)
    prismaMock.character.findUnique.mockResolvedValue({ id: 'char-1', userId: 'user-1', cash: 5000 })
    prismaMock.character.update.mockResolvedValue({})
    prismaMock.characterEventLog.create.mockResolvedValue({})
    prismaMock.characterSkillPoints.update.mockResolvedValue({})

    const res = await request(app)
      .post('/api/v1/characters/char-1/dilemma/2/choose')
      .set(authHeader(TOKEN))
      .send({ optionIndex: 1 }) // -600

    expect(res.status).toBe(200)
    expect(res.body.cashImpact).toBe(-600)
    expect(res.body.result).toContain('600')
  })

  it('impacto positivo retorna mensagem de recebimento', async () => {
    prismaMock.characterEventLog.findFirst.mockResolvedValue(null)
    prismaMock.character.findUnique.mockResolvedValue({ id: 'char-1', userId: 'user-1', cash: 5000 })
    prismaMock.character.update.mockResolvedValue({})
    prismaMock.characterEventLog.create.mockResolvedValue({})
    prismaMock.characterSkillPoints.update.mockResolvedValue({})

    const res = await request(app)
      .post('/api/v1/characters/char-1/dilemma/1/choose')
      .set(authHeader(TOKEN))
      .send({ optionIndex: 1 }) // +300

    expect(res.status).toBe(200)
    expect(res.body.cashImpact).toBe(300)
    expect(res.body.result).toContain('300')
  })
})

// ─── POST chooseDilemma — effectType: inheritance ─────────────────────────────

describe('POST chooseDilemma — effectType: inheritance', () => {
  it('herança crédita valor e retorna mensagem correta', async () => {
    prismaMock.characterEventLog.findFirst.mockResolvedValue(null)
    prismaMock.character.findUnique.mockResolvedValue({ id: 'char-1', userId: 'user-1', cash: 5000 })
    prismaMock.character.update.mockResolvedValue({})
    prismaMock.characterEventLog.create.mockResolvedValue({})
    prismaMock.characterSkillPoints.update.mockResolvedValue({})

    const res = await request(app)
      .post('/api/v1/characters/char-1/dilemma/9/choose')
      .set(authHeader(TOKEN))
      .send({ optionIndex: 0 }) // inheritance +6000

    expect(res.status).toBe(200)
    expect(res.body.cashImpact).toBe(6000)
    expect(res.body.result).toContain('inventário')
  })
})

// ─── POST chooseDilemma — effectType: loan_friend ─────────────────────────────

describe('POST chooseDilemma — effectType: loan_friend', () => {
  it('amigo paga de volta quando Math.random < probability', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.1) // 0.1 < 0.5 → paid

    prismaMock.characterEventLog.findFirst.mockResolvedValue(null)
    prismaMock.character.findUnique.mockResolvedValue({ id: 'char-1', userId: 'user-1', cash: 5000 })
    prismaMock.character.update.mockResolvedValue({})
    prismaMock.characterEventLog.create.mockResolvedValue({})
    prismaMock.characterSkillPoints.update.mockResolvedValue({})

    const res = await request(app)
      .post('/api/v1/characters/char-1/dilemma/4/choose')
      .set(authHeader(TOKEN))
      .send({ optionIndex: 0 })

    expect(res.status).toBe(200)
    expect(res.body.cashImpact).toBe(1500)
    expect(res.body.result).toContain('juros')

    jest.spyOn(Math, 'random').mockRestore()
  })

  it('amigo caloteiro quando Math.random >= probability', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.9) // 0.9 >= 0.5 → calote

    prismaMock.characterEventLog.findFirst.mockResolvedValue(null)
    prismaMock.character.findUnique.mockResolvedValue({ id: 'char-1', userId: 'user-1', cash: 5000 })
    prismaMock.character.update.mockResolvedValue({})
    prismaMock.characterEventLog.create.mockResolvedValue({})
    prismaMock.characterSkillPoints.update.mockResolvedValue({})

    const res = await request(app)
      .post('/api/v1/characters/char-1/dilemma/4/choose')
      .set(authHeader(TOKEN))
      .send({ optionIndex: 0 })

    expect(res.status).toBe(200)
    expect(res.body.cashImpact).toBe(-1000)
    expect(res.body.result).toContain('sumiu')

    jest.spyOn(Math, 'random').mockRestore()
  })
})

// ─── POST chooseDilemma — erros ───────────────────────────────────────────────

describe('POST chooseDilemma — erros', () => {
  it('retorna 400 se dilema já foi respondido', async () => {
    prismaMock.characterEventLog.findFirst.mockResolvedValue({ id: 'log-1' })
    const res = await request(app)
      .post('/api/v1/characters/char-1/dilemma/2/choose')
      .set(authHeader(TOKEN))
      .send({ optionIndex: 0 })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Dilema já respondido')
  })

  it('retorna 404 se dilema não existe para o turno', async () => {
    prismaMock.characterEventLog.findFirst.mockResolvedValue(null)
    const res = await request(app)
      .post('/api/v1/characters/char-1/dilemma/99/choose')
      .set(authHeader(TOKEN))
      .send({ optionIndex: 0 })
    expect(res.status).toBe(404)
  })

  it('retorna 400 para opção inválida', async () => {
    prismaMock.characterEventLog.findFirst.mockResolvedValue(null)
    const res = await request(app)
      .post('/api/v1/characters/char-1/dilemma/1/choose')
      .set(authHeader(TOKEN))
      .send({ optionIndex: 99 })
    expect(res.status).toBe(400)
  })

  it('retorna 404 se personagem não existe', async () => {
    prismaMock.characterEventLog.findFirst.mockResolvedValue(null)
    prismaMock.character.findUnique.mockResolvedValue(null)
    const res = await request(app)
      .post('/api/v1/characters/char-1/dilemma/2/choose')
      .set(authHeader(TOKEN))
      .send({ optionIndex: 0 })
    expect(res.status).toBe(404)
  })

  it('retorna 403 para personagem de outro usuário', async () => {
    prismaMock.characterEventLog.findFirst.mockResolvedValue(null)
    prismaMock.character.findUnique.mockResolvedValue({ id: 'char-1', userId: 'outro-user' })
    const res = await request(app)
      .post('/api/v1/characters/char-1/dilemma/2/choose')
      .set(authHeader(TOKEN))
      .send({ optionIndex: 0 })
    expect(res.status).toBe(403)
  })

  it('retorna 401 sem token', async () => {
    const res = await request(app)
      .post('/api/v1/characters/char-1/dilemma/2/choose')
      .send({ optionIndex: 0 })
    expect(res.status).toBe(401)
  })
})