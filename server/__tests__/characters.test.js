// __tests__/characters.test.js
process.env.JWT_SECRET = 'test-secret'

const request = require('supertest')
const app = require('../src/app')
const { prismaMock } = require('@prisma/client')
const { makeToken, authHeader } = require('./helpers/auth')

beforeEach(() => jest.clearAllMocks())

const TOKEN = makeToken({ id: 'user-1' })

// Body válido para createCharacter — controller exige todos esses campos
const validBody = {
  name: 'Dudu',
  roomId: 'room-1',
  gender: 'male',
  course: 'Engenharia',
  gift: 'frugal',
  avatarId: 1,
}

// ─── POST /api/v1/characters ──────────────────────────────────────────────────

describe('POST /api/v1/characters', () => {
  it('cria personagem com sucesso', async () => {
    prismaMock.room.findUnique.mockResolvedValue({ id: 'room-1', status: 'waiting' })
    prismaMock.character.findUnique.mockResolvedValue(null) // userId_roomId unique
    prismaMock.character.create.mockResolvedValue({
      id: 'char-1', name: 'Dudu', cash: 10000, userId: 'user-1', roomId: 'room-1',
    })
    prismaMock.characterSkillPoints.create.mockResolvedValue({})

    const res = await request(app)
      .post('/api/v1/characters')
      .set(authHeader(TOKEN))
      .send(validBody)

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Dudu')
  })

  it('retorna 409 se usuário já tem personagem na sala', async () => {
    prismaMock.room.findUnique.mockResolvedValue({ id: 'room-1', status: 'waiting' })
    prismaMock.character.findUnique.mockResolvedValue({ id: 'char-existente' })

    const res = await request(app)
      .post('/api/v1/characters')
      .set(authHeader(TOKEN))
      .send(validBody)

    expect(res.status).toBe(409)
  })

  it('retorna 400 sem campos obrigatórios', async () => {
    const res = await request(app)
      .post('/api/v1/characters')
      .set(authHeader(TOKEN))
      .send({ name: 'Dudu', roomId: 'room-1' }) // sem gender, course, gift

    expect(res.status).toBe(400)
  })

  it('retorna 400 com dom inválido', async () => {
    const res = await request(app)
      .post('/api/v1/characters')
      .set(authHeader(TOKEN))
      .send({ ...validBody, gift: 'invalido' })

    expect(res.status).toBe(400)
  })

  it('retorna 404 se sala não existe', async () => {
    prismaMock.room.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .post('/api/v1/characters')
      .set(authHeader(TOKEN))
      .send(validBody)

    expect(res.status).toBe(404)
  })

  it('retorna 401 sem token', async () => {
    const res = await request(app).post('/api/v1/characters').send(validBody)
    expect(res.status).toBe(401)
  })
})

// ─── GET /api/v1/characters/me ────────────────────────────────────────────────

describe('GET /api/v1/characters/me', () => {
  it('retorna o personagem mais recente do usuário', async () => {
    prismaMock.character.findFirst.mockResolvedValue({
      id: 'char-1', name: 'Dudu', cash: 8000, userId: 'user-1',
      room: { id: 'room-1', status: 'active' },
    })

    const res = await request(app)
      .get('/api/v1/characters/me')
      .set(authHeader(TOKEN))

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Dudu')
  })

  it('retorna 404 se usuário não tem personagem', async () => {
    prismaMock.character.findFirst.mockResolvedValue(null)

    const res = await request(app)
      .get('/api/v1/characters/me')
      .set(authHeader(TOKEN))

    expect(res.status).toBe(404)
  })

  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/v1/characters/me')
    expect(res.status).toBe(401)
  })
})

// ─── GET /api/v1/characters/:id ───────────────────────────────────────────────

describe('GET /api/v1/characters/:id', () => {
  it('retorna personagem por id', async () => {
    prismaMock.character.findUnique.mockResolvedValue({
      id: 'char-1', name: 'Dudu', cash: 8000, userId: 'user-1',
      skillPoints: {}, unlockedSkills: [], fixedInvestments: [],
      positions: [], debentures: [], snapshots: [],
    })

    const res = await request(app)
      .get('/api/v1/characters/char-1')
      .set(authHeader(TOKEN))

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Dudu')
  })

  it('retorna 403 ao acessar personagem de outro usuário', async () => {
    prismaMock.character.findUnique.mockResolvedValue({
      id: 'char-2', name: 'Maria', cash: 5000, userId: 'outro-user',
      skillPoints: {}, unlockedSkills: [], fixedInvestments: [],
      positions: [], debentures: [], snapshots: [],
    })

    const res = await request(app)
      .get('/api/v1/characters/char-2')
      .set(authHeader(TOKEN))

    expect(res.status).toBe(403)
  })

  it('retorna 404 para personagem inexistente', async () => {
    prismaMock.character.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .get('/api/v1/characters/naoexiste')
      .set(authHeader(TOKEN))

    expect(res.status).toBe(404)
  })

  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/v1/characters/char-1')
    expect(res.status).toBe(401)
  })
})

// ─── PATCH /api/v1/characters/:id/ready ──────────────────────────────────────

describe('PATCH /api/v1/characters/:id/ready', () => {
  it('marca personagem como pronto', async () => {
    prismaMock.character.findUnique.mockResolvedValue({
      id: 'char-1', userId: 'user-1', turnReady: false,
    })
    prismaMock.character.update.mockResolvedValue({ id: 'char-1', turnReady: true })

    const res = await request(app)
      .patch('/api/v1/characters/char-1/ready')
      .set(authHeader(TOKEN))

    expect(res.status).toBe(200)
    expect(res.body.turnReady).toBe(true)
  })

  it('retorna 404 para personagem inexistente', async () => {
    prismaMock.character.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .patch('/api/v1/characters/naoexiste/ready')
      .set(authHeader(TOKEN))

    expect(res.status).toBe(404)
  })

  it('retorna 403 ao marcar personagem de outro usuário', async () => {
    prismaMock.character.findUnique.mockResolvedValue({
      id: 'char-2', userId: 'outro-user', turnReady: false,
    })

    const res = await request(app)
      .patch('/api/v1/characters/char-2/ready')
      .set(authHeader(TOKEN))

    expect(res.status).toBe(403)
  })

  it('retorna 401 sem token', async () => {
    const res = await request(app).patch('/api/v1/characters/char-1/ready')
    expect(res.status).toBe(401)
  })
})