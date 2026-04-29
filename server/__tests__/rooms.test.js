// __tests__/rooms.test.js
const request = require('supertest')
const app = require('../src/app')
const { prismaMock } = require('@prisma/client')
const { makeToken, makeAdminToken, authHeader } = require('./helpers/auth')

beforeEach(() => jest.clearAllMocks())

// ─── POST /api/v1/rooms ────────────────────────────────────────────────────────

describe('POST /api/v1/rooms', () => {
  it('cria sala com sucesso', async () => {
    prismaMock.room.findUnique.mockResolvedValue(null)
    prismaMock.room.create.mockResolvedValue({
      id: 'room-1',
      code: 'ABC123',
      adminId: 'admin-1',
      maxTurns: 12,
      status: 'waiting',
    })

    const res = await request(app)
      .post('/api/v1/rooms')
      .set(authHeader(makeAdminToken()))
      .send({ maxTurns: 12 })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('code')
    expect(res.body.maxTurns).toBe(12)
  })

  it('gera código único mesmo com colisão', async () => {
    prismaMock.room.findUnique
      .mockResolvedValueOnce({ id: 'outro' })
      .mockResolvedValueOnce(null)

    prismaMock.room.create.mockResolvedValue({
      id: 'room-2',
      code: 'XYZ999',
      adminId: 'admin-1',
      maxTurns: 12,
      status: 'waiting',
    })

    const res = await request(app)
      .post('/api/v1/rooms')
      .set(authHeader(makeAdminToken()))
      .send({})

    expect(res.status).toBe(201)
    expect(prismaMock.room.findUnique).toHaveBeenCalledTimes(2)
  })

  it('retorna 401 sem token', async () => {
    const res = await request(app).post('/api/v1/rooms').send({})
    expect(res.status).toBe(401)
  })

  it('retorna 500 em erro de banco', async () => {
    prismaMock.room.findUnique.mockResolvedValue(null)
    prismaMock.room.create.mockRejectedValue(new Error('DB error'))

    const res = await request(app)
      .post('/api/v1/rooms')
      .set(authHeader(makeAdminToken()))
      .send({})

    expect(res.status).toBe(500)
  })
})

// ─── GET /api/v1/rooms/:code ───────────────────────────────────────────────────

describe('GET /api/v1/rooms/:code', () => {
  it('retorna a sala com personagens', async () => {
    prismaMock.room.findUnique.mockResolvedValue({
      id: 'room-1',
      code: 'ABC123',
      status: 'waiting',
      characters: [{ id: 'char-1', name: 'Dudu', turnReady: false, userId: 'user-1' }],
    })

    const res = await request(app).get('/api/v1/rooms/ABC123')

    expect(res.status).toBe(200)
    expect(res.body.code).toBe('ABC123')
    expect(res.body.characters).toHaveLength(1)
  })

  it('retorna 404 para sala inexistente', async () => {
    prismaMock.room.findUnique.mockResolvedValue(null)

    const res = await request(app).get('/api/v1/rooms/NAOEX')

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Sala não encontrada')
  })
})

// ─── POST /api/v1/rooms/:id/start ─────────────────────────────────────────────
// Rota é POST, não PATCH

describe('POST /api/v1/rooms/:id/start', () => {
  it('admin inicia sala em estado waiting', async () => {
    prismaMock.room.findUnique.mockResolvedValue({
      id: 'room-1',
      adminId: 'admin-1',
      status: 'waiting',
    })
    prismaMock.room.update.mockResolvedValue({
      id: 'room-1',
      status: 'active',
      currentTurn: 1,
    })

    const res = await request(app)
      .post('/api/v1/rooms/room-1/start')
      .set(authHeader(makeAdminToken()))

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('active')
  })

  it('não-admin recebe 403', async () => {
    prismaMock.room.findUnique.mockResolvedValue({
      id: 'room-1',
      adminId: 'admin-1',
      status: 'waiting',
    })

    const res = await request(app)
      .post('/api/v1/rooms/room-1/start')
      .set(authHeader(makeToken({ id: 'outro-user' })))

    expect(res.status).toBe(403)
  })

  it('retorna 400 se sala já iniciada', async () => {
    prismaMock.room.findUnique.mockResolvedValue({
      id: 'room-1',
      adminId: 'admin-1',
      status: 'active',
    })

    const res = await request(app)
      .post('/api/v1/rooms/room-1/start')
      .set(authHeader(makeAdminToken()))

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Sala já iniciada')
  })

  it('retorna 404 para sala inexistente', async () => {
    prismaMock.room.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .post('/api/v1/rooms/naoexiste/start')
      .set(authHeader(makeAdminToken()))

    expect(res.status).toBe(404)
  })

  it('retorna 401 sem token', async () => {
    const res = await request(app).post('/api/v1/rooms/room-1/start')
    expect(res.status).toBe(401)
  })
})

// ─── GET /api/v1/rooms/:id/leaderboard ────────────────────────────────────────

describe('GET /api/v1/rooms/:id/leaderboard', () => {
  it('retorna ranking ordenado por netWorth', async () => {
    prismaMock.leaderboard.findMany.mockResolvedValue([
      { netWorth: 45000, character: { name: 'Dudu' } },
      { netWorth: 38000, character: { name: 'Maria' } },
      { netWorth: 20000, character: { name: 'João' } },
    ])

    const res = await request(app)
      .get('/api/v1/rooms/room-1/leaderboard')
      .set(authHeader(makeToken()))

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(3)
    expect(res.body[0]).toEqual({ rank: 1, characterName: 'Dudu', netWorth: 45000 })
    expect(res.body[1].rank).toBe(2)
    expect(res.body[2].rank).toBe(3)
  })

  it('retorna array vazio se ninguém jogou ainda', async () => {
    prismaMock.leaderboard.findMany.mockResolvedValue([])

    const res = await request(app)
      .get('/api/v1/rooms/room-1/leaderboard')
      .set(authHeader(makeToken()))

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/v1/rooms/room-1/leaderboard')
    expect(res.status).toBe(401)
  })
})