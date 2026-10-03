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

  // ─── dom Inteligente: pontos extras, sem desconto ───────────────────────────

  const unlock = (id = 1) => request(app).post(`/api/v1/skills/character/char-1/unlock/${id}`).set(authHeader(TOKEN))
  const node = (costPoints) => ({ id: 1, name: 'Poupador', path: 'economy', level: 1, costPoints })
  const allowUnlock = () => {
    prismaMock.characterSkill.create.mockResolvedValue({})
    prismaMock.characterSkillPoints.update.mockResolvedValue({})
  }
  const usedIncrement = () => prismaMock.characterSkillPoints.update.mock.calls[0][0].data.usedPoints.increment

  it('smart não tem mais desconto: nó de 2 pontos custa 2', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ gift: 'smart', skillPoints: { totalPoints: 2, usedPoints: 0, maxPoints: 10 } }))
    prismaMock.skillNode.findUnique.mockResolvedValue(node(2))
    allowUnlock()

    const res = await unlock()

    expect(res.status).toBe(200)
    expect(res.body.remainingPoints).toBe(0)
    expect(usedIncrement()).toBe(2)
  })

  it.each([1, 2, 3, 5])('smart paga o custo cheio de um nó de %i ponto(s)', async (cost) => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ gift: 'smart', skillPoints: { totalPoints: 10, usedPoints: 0, maxPoints: 10 } }))
    prismaMock.skillNode.findUnique.mockResolvedValue(node(cost))
    allowUnlock()

    const res = await unlock()

    expect(res.status).toBe(200)
    expect(usedIncrement()).toBe(cost)
    expect(res.body.remainingPoints).toBe(10 - cost)
  })

  it('smart com 5 pontos e nó de 5 não ganha desconto (antes ceil(5*0,8)=4)', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ gift: 'smart' })) // 5 total, 1 usado
    prismaMock.skillNode.findUnique.mockResolvedValue(node(5))

    const res = await unlock()

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Pontos insuficientes')
    expect(prismaMock.characterSkill.create).not.toHaveBeenCalled()
  })

  it('smart com limite 10 pode chegar a 10 pontos usados', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ gift: 'smart', skillPoints: { totalPoints: 10, usedPoints: 8, maxPoints: 10 } }))
    prismaMock.skillNode.findUnique.mockResolvedValue(node(2))
    allowUnlock()

    const res = await unlock()

    expect(res.status).toBe(200)
    expect(res.body.remainingPoints).toBe(0)
  })

  it('smart não passa de 10 pontos usados', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ gift: 'smart', skillPoints: { totalPoints: 12, usedPoints: 9, maxPoints: 10 } }))
    prismaMock.skillNode.findUnique.mockResolvedValue(node(2))

    const res = await unlock()

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Limite de pontos atingido')
  })

  it('sem o dom Inteligente o limite continua 8', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ gift: 'agile', skillPoints: { totalPoints: 10, usedPoints: 7, maxPoints: 8 } }))
    prismaMock.skillNode.findUnique.mockResolvedValue(node(2))

    const res = await unlock()

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Limite de pontos atingido')
  })

  it.each(['frugal', 'agile', null])('dom %s também paga o custo cheio', async (gift) => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ gift, skillPoints: { totalPoints: 5, usedPoints: 0, maxPoints: 8 } }))
    prismaMock.skillNode.findUnique.mockResolvedValue(node(3))
    allowUnlock()

    const res = await unlock()

    expect(res.status).toBe(200)
    expect(usedIncrement()).toBe(3)
  })

  it('GET da árvore devolve o limite 10 do Inteligente', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ gift: 'smart', skillPoints: { totalPoints: 2, usedPoints: 0, maxPoints: 10 } }))

    const res = await request(app).get('/api/v1/skills/character/char-1').set(authHeader(TOKEN))

    expect(res.body).toMatchObject({ totalPoints: 2, usedPoints: 0, maxPoints: 10 })
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
// ─── vantagens e dicas no GET da árvore ──────────────────────────────────────

describe('GET /api/v1/skills/character/:id — vantagens', () => {
  const skill = (path, level, name = `${path}-${level}`) => ({ skillNodeId: `${path}-${level}`, unlockedAt: 1, skillNode: { path, level, name } })
  const get = () => request(app).get('/api/v1/skills/character/char-1').set(authHeader(TOKEN))

  it('busca o personagem com a sala (para o turno das dicas)', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    await get()

    expect(prismaMock.character.findUnique).toHaveBeenCalledWith({
      where: { id: 'char-1' },
      include: { skillPoints: true, unlockedSkills: { include: { skillNode: true } }, room: true },
    })
  })

  it('sem habilidades devolve vantagens neutras e nenhuma dica', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    const res = await get()

    expect(res.body.perks).toMatchObject({
      salaryBonus: 0, extraIncome: 0, rentDiscount: 0, foodDiscount: 0, utilitiesDiscount: 0,
      leisureDiscount: 0, repairDiscount: 0, overdraftRate: 0.08, savingsBonusRate: 0, stockTips: false,
    })
    expect(res.body.tips).toEqual([])
  })

  it('cada habilidade desbloqueada vem com o texto da vantagem', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({
      unlockedSkills: [skill('technical', 1, 'Fundamentos e Lógica'), skill('communication', 3, 'Negociação e Liderança')],
    }))
    const res = await get()

    expect(res.body.unlocked.map(s => s.perk)).toEqual(['+R$ 200 por mês (freela)', 'Aluguel 15% mais barato'])
    expect(res.body.perks).toMatchObject({ extraIncome: 200, rentDiscount: 0.15 })
  })

  it('nó desconhecido vem com perk null', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ unlockedSkills: [skill('economy', 1)] }))
    const res = await get()

    expect(res.body.unlocked[0].perk).toBeNull()
  })

  it('Gestão até L2 mostra cheque especial a 4% e 0,8% nas caixinhas, sem dicas', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ unlockedSkills: [skill('management', 1), skill('management', 2)] }))
    const res = await get()

    expect(res.body.perks).toMatchObject({ overdraftRate: 0.04, savingsBonusRate: 0.008, foodDiscount: 0.15, stockTips: false })
    expect(res.body.tips).toEqual([])
  })

  it('Visão de Mercado no turno 2 avisa da alta da VALE3 no turno 3', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({
      room: { currentTurn: 2 },
      unlockedSkills: [skill('management', 1), skill('management', 2), skill('management', 3)],
    }))
    const res = await get()

    expect(res.body.perks.stockTips).toBe(true)
    expect(res.body.perks.savingsBonusRate).toBe(0.021)
    expect(res.body.tips).toEqual([{
      ticker: 'VALE3', turn: 3, direction: 'up', change: 0.4, text: 'VALE3 deve subir cerca de 40% no próximo mês',
    }])
  })

  it('Visão de Mercado no turno 9 avisa da queda da PETR4', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ room: { currentTurn: 9 }, unlockedSkills: [skill('management', 3)] }))
    const res = await get()

    expect(res.body.tips).toEqual([expect.objectContaining({ ticker: 'PETR4', direction: 'down', change: -0.35 })])
  })

  it('Visão de Mercado em mês sem evento não tem dica', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ room: { currentTurn: 5 }, unlockedSkills: [skill('management', 3)] }))
    const res = await get()

    expect(res.body.tips).toEqual([])
  })

  it('sem Visão de Mercado não há dica nem no mês do evento', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ room: { currentTurn: 2 }, unlockedSkills: [skill('management', 2)] }))
    const res = await get()

    expect(res.body.tips).toEqual([])
  })

  it('Gestão completa soma 3,8%', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({
      unlockedSkills: [1, 2, 3, 4].map(l => skill('management', l)),
    }))
    const res = await get()

    expect(res.body.perks.savingsBonusRate).toBe(0.038)
  })
})
