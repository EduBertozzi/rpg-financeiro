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

  it('começa com o salário de janeiro (R$ 7.000) na conta', async () => {
    prismaMock.room.findUnique.mockResolvedValue({ id: 'room-1', status: 'waiting' })
    prismaMock.character.findUnique.mockResolvedValue(null)
    prismaMock.character.create.mockResolvedValue({ id: 'char-1', name: 'Dudu' })
    prismaMock.characterSkillPoints.create.mockResolvedValue({})

    await request(app).post('/api/v1/characters').set(authHeader(TOKEN)).send(validBody)

    expect(prismaMock.character.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ cash: 7000 }),
    }))
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

// ─── dons e gênero na criação ─────────────────────────────────────────────────

describe('POST /api/v1/characters — dons', () => {
  const create = (body) => request(app).post('/api/v1/characters').set(authHeader(TOKEN)).send(body)
  const createdData = () => prismaMock.character.create.mock.calls[0][0].data
  const pointsData = () => prismaMock.characterSkillPoints.create.mock.calls[0][0].data

  beforeEach(() => {
    prismaMock.room.findUnique.mockResolvedValue({ id: 'room-1', status: 'waiting' })
    prismaMock.character.findUnique.mockResolvedValue(null)
    prismaMock.character.create.mockResolvedValue({ id: 'char-1', name: 'Dudu' })
    prismaMock.characterSkillPoints.create.mockResolvedValue({})
  })

  it('Mão de Vaca (frugal) começa com custos fixos 10% mais baratos', async () => {
    const res = await create({ ...validBody, gift: 'frugal' })

    expect(res.status).toBe(201)
    expect(createdData()).toMatchObject({ housingCost: 1350, foodCost: 900, utilitiesCost: 225, transportCost: 225 })
  })

  it('frugal economiza exatamente R$ 300 por mês nos custos fixos', async () => {
    await create({ ...validBody, gift: 'frugal' })
    const d = createdData()

    expect(d.housingCost + d.foodCost + d.utilitiesCost + d.transportCost).toBe(2700)
  })

  it.each(['agile', 'smart'])('dom %s começa com os custos cheios', async (gift) => {
    const res = await create({ ...validBody, gift })

    expect(res.status).toBe(201)
    expect(createdData()).toMatchObject({ housingCost: 1500, foodCost: 1000, utilitiesCost: 250, transportCost: 250 })
  })

  it('Inteligente (smart) começa com 2 pontos e limite 10', async () => {
    await create({ ...validBody, gift: 'smart' })

    expect(pointsData()).toEqual({ characterId: 'char-1', totalPoints: 2, maxPoints: 10 })
  })

  it.each(['frugal', 'agile'])('dom %s começa com 0 pontos e limite 8', async (gift) => {
    await create({ ...validBody, gift })

    expect(pointsData()).toEqual({ characterId: 'char-1', totalPoints: 0, maxPoints: 8 })
  })

  it('o dom escolhido é salvo no personagem', async () => {
    await create({ ...validBody, gift: 'agile' })

    expect(createdData().gift).toBe('agile')
  })

  it('cria sem gênero (201) e guarda o valor neutro "none"', async () => {
    const { gender, ...body } = validBody
    const res = await create(body)

    expect(res.status).toBe(201)
    expect(createdData().gender).toBe('none')
  })

  it('gênero vazio também vira "none"', async () => {
    const res = await create({ ...validBody, gender: '' })

    expect(res.status).toBe(201)
    expect(createdData().gender).toBe('none')
  })

  it('se o gênero vier, continua sendo salvo', async () => {
    await create({ ...validBody, gender: 'female' })

    expect(createdData().gender).toBe('female')
  })

  it('a profissão vai no campo course', async () => {
    await create({ ...validBody, course: 'Desenvolvedora' })

    expect(createdData().course).toBe('Desenvolvedora')
  })

  it.each(['name', 'roomId', 'course', 'gift'])('sem %s continua dando 400', async (field) => {
    const body = { ...validBody }
    delete body[field]
    const res = await create(body)

    expect(res.status).toBe(400)
    expect(prismaMock.character.create).not.toHaveBeenCalled()
  })

  it.each(['toString', 'constructor', '__proto__', 'FRUGAL'])('dom "%s" é inválido', async (gift) => {
    const res = await create({ ...validBody, gift })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Dom inválido')
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