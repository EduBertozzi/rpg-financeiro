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

  const created = () => prismaMock.character.create.mock.calls[0][0].data
  const janLogs = () => prismaMock.characterEventLog.createMany.mock.calls[0][0].data
  const createWith = async (body) => {
    prismaMock.room.findUnique.mockResolvedValue({ id: 'room-1', status: 'waiting' })
    prismaMock.character.findUnique.mockResolvedValue(null)
    prismaMock.character.create.mockResolvedValue({ id: 'char-1', name: 'Dudu' })
    prismaMock.characterSkillPoints.create.mockResolvedValue({})
    return request(app).post('/api/v1/characters').set(authHeader(TOKEN)).send(body)
  }

  it('janeiro: entra o salário líquido e já sai o aluguel (sem PIX da família)', async () => {
    await createWith({ ...validBody, gift: 'smart' })

    // líquido de R$ 7.000 brutos (5.463,74) menos o aluguel de R$ 2.100
    expect(created().cash).toBe(3363.74)
    expect(created().cash).toBeCloseTo(5463.74 - 2100, 2)
    expect(janLogs()).toEqual([
      { characterId: 'char-1', turn: 1, cashImpact: 7000, description: 'Salário (bruto): Depósito do mês (+R$ 7000.00)' },
      { characterId: 'char-1', turn: 1, cashImpact: -781.51, description: 'INSS: Desconto da Previdência Social (-R$ 781.51)' },
      { characterId: 'char-1', turn: 1, cashImpact: -754.75, description: 'Imposto de Renda na fonte: Desconto do mês (-R$ 754.75)' },
      { characterId: 'char-1', turn: 1, cashImpact: -2100, description: 'Aluguel: Casa — Pago (-R$ 2100)' },
    ])
    expect(janLogs().some((l) => /PIX|boas-vindas/i.test(l.description))).toBe(false)
  })

  it('janeiro: a soma das linhas do extrato é o caixa inicial', async () => {
    for (const gift of ['smart', 'frugal', 'agile']) {
      jest.clearAllMocks()
      await createWith({ ...validBody, gift })
      const sum = janLogs().reduce((acc, l) => acc + l.cashImpact, 0)
      expect(Math.round(sum * 100) / 100).toBe(created().cash)
    }
  })

  it('janeiro: o holerite mostra INSS e IR sobre o bruto de R$ 7.000 para todos os dons', async () => {
    for (const gift of ['smart', 'frugal', 'agile']) {
      jest.clearAllMocks()
      await createWith({ ...validBody, gift })
      const byDesc = (re) => janLogs().filter((l) => re.test(l.description))
      expect(byDesc(/^Salário \(bruto\):/).map((l) => l.cashImpact)).toEqual([7000])
      expect(byDesc(/^INSS:/).map((l) => l.cashImpact)).toEqual([-781.51])
      expect(byDesc(/^Imposto de Renda na fonte:/).map((l) => l.cashImpact)).toEqual([-754.75])
      expect(byDesc(/^Salário:/)).toEqual([]) // o texto antigo não é mais gravado
    }
  })

  it('Mão de Vaca paga o aluguel de janeiro com 5% de desconto', async () => {
    await createWith(validBody)
    expect(created().cash).toBe(3468.74) // 5.463,74 − 1.995
    expect(janLogs().at(-1)).toEqual(expect.objectContaining({ cashImpact: -1995, description: 'Aluguel: Casa — Pago (-R$ 1995)' }))
  })

  it('Desenrolado recebe o freela já em janeiro', async () => {
    await createWith({ ...validBody, gift: 'agile' })
    expect(created().cash).toBe(3483.74) // 5.463,74 + 120 − 2.100
    expect(janLogs().map((l) => l.description)).toContain('Trabalho extra: Desenrolado (+R$ 120.00)')
    // o freela do dom não paga INSS nem IR: os descontos são só do salário
    expect(janLogs().find((l) => /^INSS:/.test(l.description)).cashImpact).toBe(-781.51)
    expect(janLogs().find((l) => /^Imposto de Renda/.test(l.description)).cashImpact).toBe(-754.75)
  })

  it('quem entra com a partida andando recebe e paga no mês atual', async () => {
    prismaMock.room.findUnique.mockResolvedValue({ id: 'room-1', status: 'active', currentTurn: 4 })
    prismaMock.character.findUnique.mockResolvedValue(null)
    prismaMock.character.create.mockResolvedValue({ id: 'char-1', name: 'Dudu' })
    prismaMock.characterSkillPoints.create.mockResolvedValue({})
    await request(app).post('/api/v1/characters').set(authHeader(TOKEN)).send({ ...validBody, gift: 'smart' })
    expect(janLogs().every((l) => l.turn === 4)).toBe(true)
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

  it('Mão de Vaca (frugal) começa com custos fixos 5% mais baratos', async () => {
    const res = await create({ ...validBody, gift: 'frugal' })

    expect(res.status).toBe(201)
    expect(createdData()).toMatchObject({ housingCost: 1995, foodCost: 950, utilitiesCost: 237.5, transportCost: 237.5 })
  })

  it('frugal economiza exatamente R$ 180 por mês nos custos fixos', async () => {
    await create({ ...validBody, gift: 'frugal' })
    const d = createdData()

    expect(d.housingCost + d.foodCost + d.utilitiesCost + d.transportCost).toBe(3420)
  })

  it.each(['agile', 'smart'])('dom %s começa com os custos cheios', async (gift) => {
    const res = await create({ ...validBody, gift })

    expect(res.status).toBe(201)
    expect(createdData()).toMatchObject({ housingCost: 2100, foodCost: 1000, utilitiesCost: 250, transportCost: 250 })
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

  const activeRoom = (currentTurn) => ({ status: 'active', currentTurn })
  const paidBills = (turn) => ['Mercadinho', 'Água e Luz', 'Internet e Celular'].map((label) => ({ turn, description: `Conta: ${label} — Pago (-R$ 100)` }))
  const ready = () => request(app).patch('/api/v1/characters/char-1/ready').set(authHeader(TOKEN))

  it('encerra mesmo com coisa em aberto e devolve o que ficou (vira atraso na virada)', async () => {
    prismaMock.character.findUnique.mockResolvedValue({ id: 'char-1', userId: 'user-1', room: activeRoom(3), choices: [] })
    prismaMock.character.update.mockImplementation(async ({ data }) => ({ ...data }))

    const res = await ready()

    expect(res.status).toBe(200)
    expect(res.body.missing).toEqual(['Lazer', 'Mercadinho', 'Água e Luz', 'Internet e Celular'])
    expect(prismaMock.character.update).toHaveBeenCalled()
  })

  it('conta paga em outro mês não vale', async () => {
    prismaMock.character.findUnique.mockResolvedValue({
      id: 'char-1', userId: 'user-1', room: activeRoom(3),
      choices: [{ turn: 3, kind: 'leisure' }],
      eventLog: paidBills(2),
    })
    prismaMock.character.update.mockImplementation(async ({ data }) => ({ ...data }))

    expect((await ready()).body.missing).toEqual(['Mercadinho', 'Água e Luz', 'Internet e Celular'])
  })

  it('escolhas de outro mês não contam', async () => {
    prismaMock.character.findUnique.mockResolvedValue({
      id: 'char-1', userId: 'user-1', room: activeRoom(3),
      choices: [{ turn: 2, kind: 'leisure' }],
      eventLog: paidBills(3),
    })
    prismaMock.character.update.mockImplementation(async ({ data }) => ({ ...data }))

    expect((await ready()).body.missing).toEqual(['Lazer'])
  })

  it('tudo feito: nada em aberto', async () => {
    prismaMock.character.findUnique.mockResolvedValue({
      id: 'char-1', userId: 'user-1', room: activeRoom(3), choices: [{ turn: 3, kind: 'leisure' }], eventLog: paidBills(3),
    })
    prismaMock.character.update.mockImplementation(async ({ data }) => ({ ...data }))

    expect((await ready()).body.missing).toEqual([])
  })

  it('com lazer e dilema do mês, fecha', async () => {
    prismaMock.character.findUnique.mockResolvedValue({
      id: 'char-1', userId: 'user-1', room: activeRoom(3),
      choices: [{ turn: 3, kind: 'leisure' }, { turn: 3, kind: 'dilemma' }],
      eventLog: paidBills(3),
    })
    prismaMock.character.update.mockResolvedValue({ turnReady: true })

    expect((await ready()).status).toBe(200)
  })

  it('dezembro não tem dilema: só o lazer é obrigatório', async () => {
    prismaMock.character.findUnique.mockResolvedValue({
      id: 'char-1', userId: 'user-1', room: activeRoom(12), choices: [{ turn: 12, kind: 'leisure' }], eventLog: paidBills(12),
    })
    prismaMock.character.update.mockResolvedValue({ turnReady: true })

    expect((await ready()).status).toBe(200)
  })

  it('sala esperando ou encerrada não cobra nada', async () => {
    prismaMock.character.findUnique.mockResolvedValue({
      id: 'char-1', userId: 'user-1', room: { status: 'waiting', currentTurn: 0 }, choices: [],
    })
    prismaMock.character.update.mockResolvedValue({ turnReady: true })

    expect((await ready()).status).toBe(200)
  })
})
// ─── cupons escondidos na criação ─────────────────────────────────────────────

describe('POST /api/v1/characters — cupons escondidos', () => {
  const create = () => request(app).post('/api/v1/characters').set(authHeader(TOKEN)).send(validBody)

  beforeEach(() => {
    prismaMock.room.findUnique.mockResolvedValue({ id: 'room-1', status: 'waiting' })
    prismaMock.character.findUnique.mockResolvedValue(null)
    prismaMock.character.create.mockResolvedValue({ id: 'char-1', name: 'Dudu' })
    prismaMock.characterSkillPoints.create.mockResolvedValue({})
    prismaMock.characterCoupon.createMany.mockReset()
  })

  it('cria o plano de 3 cupons do personagem', async () => {
    const res = await create()

    expect(res.status).toBe(201)
    expect(prismaMock.characterCoupon.createMany).toHaveBeenCalledTimes(1)
    const { data } = prismaMock.characterCoupon.createMany.mock.calls[0][0]
    expect(data).toHaveLength(3)
    for (const c of data) expect(c.characterId).toBe('char-1')
    expect(data.map(c => c.reward).sort()).toEqual(['cashback', 'food_discount', 'skill_point'])
    expect(data[0].turn).toBeGreaterThanOrEqual(2)
    expect(data[0].turn).toBeLessThanOrEqual(4)
    expect(data[1].turn).toBeGreaterThanOrEqual(5)
    expect(data[1].turn).toBeLessThanOrEqual(8)
    expect(data[2].turn).toBeGreaterThanOrEqual(9)
    expect(data[2].turn).toBeLessThanOrEqual(12)
  })

  it('o plano é o do personagem com os meses da sala, igual ao que a consulta criaria depois', async () => {
    const { planForCharacter } = require('../src/utils/coupons')
    await create()
    const { data } = prismaMock.characterCoupon.createMany.mock.calls[0][0]
    expect(data.map(({ characterId, ...c }) => c)).toEqual(planForCharacter('char-1', 'test-secret', 'room-1'))
  })

  it('criar o mesmo personagem de novo daria o mesmo plano (estável)', async () => {
    await create()
    prismaMock.character.findUnique.mockResolvedValue(null)
    await create()
    const [first, second] = prismaMock.characterCoupon.createMany.mock.calls.map(([args]) => args.data)
    expect(second).toEqual(first)
  })

  it('jogadores da mesma sala: cupons nos mesmos meses, mas cada um o seu', async () => {
    const plans = []
    for (let i = 1; i <= 12; i++) {
      prismaMock.character.findUnique.mockResolvedValue(null)
      prismaMock.character.create.mockResolvedValue({ id: `char-${i}`, name: `Jogador ${i}` })
      await create()
      const { data } = prismaMock.characterCoupon.createMany.mock.calls.at(-1)[0]
      expect(data.every((c) => c.characterId === `char-${i}`)).toBe(true)
      plans.push(JSON.stringify(data.map(({ characterId, ...c }) => c)))
    }
    expect(new Set(plans).size).toBeGreaterThanOrEqual(8)
    expect(new Set(plans.map((p) => JSON.stringify(JSON.parse(p).map((c) => c.turn)))).size).toBe(1)
  })

  it('o prêmio dos cupons não vai na resposta da criação', async () => {
    const res = await create()
    expect(JSON.stringify(res.body)).not.toMatch(/cashback|food_discount|skill_point/)
  })

  it('se criar os cupons falhar, o personagem é criado mesmo assim', async () => {
    prismaMock.characterCoupon.createMany.mockRejectedValue(new Error('tabela não existe'))
    const res = await create()
    expect(res.status).toBe(201)
  })

  it('não cria cupons quando a criação do personagem é recusada', async () => {
    prismaMock.character.findUnique.mockResolvedValue({ id: 'existente' })
    const res = await create()
    expect(res.status).toBe(409)
    expect(prismaMock.characterCoupon.createMany).not.toHaveBeenCalled()
  })
})
