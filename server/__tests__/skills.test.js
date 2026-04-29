// __tests__/skills.test.js
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
  gift: 'frugal',
  room: { currentTurn: 3 },
  skillPoints: { totalPoints: 5, usedPoints: 1, maxPoints: 8 },
  unlockedSkills: [],
  ...overrides,
})

// ─── GET /api/v1/skills ───────────────────────────────────────────────────────

describe('GET /api/v1/skills', () => {
  it('retorna todas as habilidades sem autenticação', async () => {
    prismaMock.skillNode.findMany.mockResolvedValue([
      { id: 1, name: 'Poupador', path: 'economy', level: 1, costPoints: 1 },
      { id: 2, name: 'Investidor', path: 'investment', level: 1, costPoints: 2 },
    ])

    const res = await request(app).get('/api/v1/skills')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })

  it('retorna array vazio se não há habilidades', async () => {
    prismaMock.skillNode.findMany.mockResolvedValue([])

    const res = await request(app).get('/api/v1/skills')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

// ─── GET /api/v1/skills/character/:id ────────────────────────────────────────

describe('GET /api/v1/skills/character/:id', () => {
  it('retorna pontos e habilidades desbloqueadas', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({
      unlockedSkills: [{
        skillNodeId: 1,
        unlockedAt: 2,
        skillNode: { id: 1, path: 'economy', level: 1, name: 'Poupador' }
      }]
    }))

    const res = await request(app)
      .get('/api/v1/skills/character/char-1')
      .set(authHeader(TOKEN))

    expect(res.status).toBe(200)
    expect(res.body.totalPoints).toBe(5)
    expect(res.body.usedPoints).toBe(1)
    expect(res.body.unlocked).toHaveLength(1)
    expect(res.body.unlocked[0].name).toBe('Poupador')
  })

  it('retorna 404 para personagem inexistente', async () => {
    prismaMock.character.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .get('/api/v1/skills/character/naoexiste')
      .set(authHeader(TOKEN))

    expect(res.status).toBe(404)
  })

  it('retorna 403 para personagem de outro usuário', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ userId: 'outro-user' }))

    const res = await request(app)
      .get('/api/v1/skills/character/char-1')
      .set(authHeader(TOKEN))

    expect(res.status).toBe(403)
  })

  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/v1/skills/character/char-1')
    expect(res.status).toBe(401)
  })
})

// ─── POST /api/v1/skills/character/:id/unlock/:skillId ───────────────────────

describe('POST /api/v1/skills/character/:id/unlock/:skillId', () => {
  it('desbloqueia habilidade de nível 1 com pontos suficientes', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.skillNode.findUnique.mockResolvedValue({
      id: 1, name: 'Poupador', path: 'economy', level: 1, costPoints: 2
    })
    prismaMock.characterSkill.create.mockResolvedValue({})
    prismaMock.characterSkillPoints.update.mockResolvedValue({})

    const res = await request(app)
      .post('/api/v1/skills/character/char-1/unlock/1')
      .set(authHeader(TOKEN))

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('unlockedSkill')
    expect(res.body.remainingPoints).toBe(2) // 5 - 1 - 2
  })

  it('retorna 400 se habilidade já foi desbloqueada', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({
      unlockedSkills: [{ skillNodeId: 1 }]
    }))
    prismaMock.skillNode.findUnique.mockResolvedValue({
      id: 1, name: 'Poupador', path: 'economy', level: 1, costPoints: 2
    })

    const res = await request(app)
      .post('/api/v1/skills/character/char-1/unlock/1')
      .set(authHeader(TOKEN))

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Habilidade já desbloqueada')
  })

  it('retorna 400 com pontos insuficientes', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({
      skillPoints: { totalPoints: 2, usedPoints: 1, maxPoints: 8 }
    }))
    prismaMock.skillNode.findUnique.mockResolvedValue({
      id: 1, name: 'Poupador', path: 'economy', level: 1, costPoints: 3
    })

    const res = await request(app)
      .post('/api/v1/skills/character/char-1/unlock/1')
      .set(authHeader(TOKEN))

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Pontos insuficientes')
  })

  it('retorna 400 se pré-requisito de nível não atendido', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    // skill de nível 2 sem ter nível 1
    prismaMock.skillNode.findUnique
      .mockResolvedValueOnce({ id: 2, name: 'Mestre Poupador', path: 'economy', level: 2, costPoints: 2 })
      .mockResolvedValueOnce({ id: 1, path: 'economy', level: 1 }) // prevSkill

    const res = await request(app)
      .post('/api/v1/skills/character/char-1/unlock/2')
      .set(authHeader(TOKEN))

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Pré-requisito não atendido')
  })

  it('aplica desconto de 20% para personagem com dom smart', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ gift: 'smart' }))
    prismaMock.skillNode.findUnique.mockResolvedValue({
      id: 1, name: 'Poupador', path: 'economy', level: 1, costPoints: 5
    })
    prismaMock.characterSkill.create.mockResolvedValue({})
    prismaMock.characterSkillPoints.update.mockResolvedValue({})

    const res = await request(app)
      .post('/api/v1/skills/character/char-1/unlock/1')
      .set(authHeader(TOKEN))

    expect(res.status).toBe(200)
    // custo original=5, com 20% desconto=4 (ceil(5*0.8)), remainingPoints = 5-1-4=0
    expect(res.body.remainingPoints).toBe(0)
  })

  it('retorna 404 para personagem inexistente', async () => {
    prismaMock.character.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .post('/api/v1/skills/character/char-1/unlock/1')
      .set(authHeader(TOKEN))

    expect(res.status).toBe(404)
  })

  it('retorna 404 para habilidade inexistente', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.skillNode.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .post('/api/v1/skills/character/char-1/unlock/99')
      .set(authHeader(TOKEN))

    expect(res.status).toBe(404)
  })

  it('retorna 403 para personagem de outro usuário', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ userId: 'outro-user' }))
    prismaMock.skillNode.findUnique.mockResolvedValue({
      id: 1, name: 'Poupador', path: 'economy', level: 1, costPoints: 2
    })

    const res = await request(app)
      .post('/api/v1/skills/character/char-1/unlock/1')
      .set(authHeader(TOKEN))

    expect(res.status).toBe(403)
  })

  it('retorna 401 sem token', async () => {
    const res = await request(app).post('/api/v1/skills/character/char-1/unlock/1')
    expect(res.status).toBe(401)
  })
})