// __tests__/turns.test.js
process.env.JWT_SECRET = 'test-secret'

jest.mock('../src/utils/turnEngine', () => ({ processTurn: jest.fn() }))

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
    processTurn.mockResolvedValue({ turn: 13, isFinished: true, results: [], dilemma: null })

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

// ─── dilemas e lazer: personagem e sala de teste ──────────────────────────────

const skill = (path, level) => ({ skillNode: { path, level, name: `${path}-${level}` } })
const makeChar = (overrides = {}) => ({
  id: 'char-1', userId: 'user-1', cash: 5000, housingCost: 1500,
  room: { status: 'active', currentTurn: 2 }, unlockedSkills: [],
  ...overrides,
})

// prepara o personagem, as escolhas já feitas e o que já foi respondido
function setup({ character = makeChar(), choices = [], answered = null } = {}) {
  prismaMock.character.findUnique.mockResolvedValue(character)
  prismaMock.characterChoice.findMany.mockResolvedValue(choices)
  prismaMock.characterChoice.findUnique.mockResolvedValue(answered)
  prismaMock.characterChoice.create.mockResolvedValue({})
  prismaMock.character.update.mockResolvedValue({})
  prismaMock.scheduledEffect.createMany.mockResolvedValue({})
  prismaMock.characterEventLog.create.mockResolvedValue({})
  prismaMock.characterSkillPoints.update.mockResolvedValue({})
}

const choose = (turn, optionIndex, id = 'char-1') =>
  request(app).post(`/api/v1/characters/${id}/dilemma/${turn}/choose`).set(authHeader(TOKEN)).send({ optionIndex })
const cashIncrement = () => prismaMock.character.update.mock.calls[0][0].data.cash.increment
const createdEffects = () => prismaMock.scheduledEffect.createMany.mock.calls[0]?.[0].data ?? []
const lastLog = () => prismaMock.characterEventLog.create.mock.calls[0][0].data

// ─── GET dilema ───────────────────────────────────────────────────────────────

describe('GET /api/v1/characters/:id/dilemma/:turn', () => {
  it('devolve o dilema de fevereiro com os preços das opções', async () => {
    setup()
    const res = await request(app).get('/api/v1/characters/char-1/dilemma/2').set(authHeader(TOKEN))

    expect(res.status).toBe(200)
    expect(res.body.dilemma.title).toBe('Empréstimo para o amigo')
    expect(res.body.dilemma.options.map((o) => [o.label, o.price])).toEqual([['A', 500], ['B', 0]])
    expect(res.body.alreadyAnswered).toBe(false)
  })

  it('não conta as consequências escondidas para o jogador', async () => {
    setup({ character: makeChar({ room: { status: 'active', currentTurn: 3 } }) })
    const res = await request(app).get('/api/v1/characters/char-1/dilemma/3').set(authHeader(TOKEN))

    // deixar o dente para depois vira canal em junho, mas isso é surpresa
    expect(JSON.stringify(res.body)).not.toMatch(/canal|junho/i)
    expect(res.body.dilemma.options[0]).not.toHaveProperty('effects')
  })

  it('dezembro não tem dilema', async () => {
    const res = await request(app).get('/api/v1/characters/char-1/dilemma/12').set(authHeader(TOKEN))
    expect(res.body).toEqual({ dilemma: null })
  })

  it('preço do advogado de novembro depende da máquina de abril', async () => {
    setup({ character: makeChar({ room: { status: 'active', currentTurn: 11 } }), choices: [{ turn: 4, option: 0 }] })
    const res = await request(app).get('/api/v1/characters/char-1/dilemma/11').set(authHeader(TOKEN))

    expect(res.body.dilemma.options[0].price).toBe(1608.96) // 40% de 12 × 335,20
  })

  it('com Trabalho em Equipe o preço mostrado já vem com 30% a menos', async () => {
    setup({ character: makeChar({ unlockedSkills: [skill('communication', 2)] }) })
    const res = await request(app).get('/api/v1/characters/char-1/dilemma/2').set(authHeader(TOKEN))

    expect(res.body.dilemma.options[0].price).toBe(350)
  })

  it('mostra o resultado quando já respondeu', async () => {
    setup({ answered: { option: 0, amount: 500 } })
    const res = await request(app).get('/api/v1/characters/char-1/dilemma/2').set(authHeader(TOKEN))

    expect(res.body.alreadyAnswered).toBe(true)
    expect(res.body.previousResult).toEqual(expect.objectContaining({ label: 'A', cashImpact: -500 }))
  })

  it('403 para personagem de outro usuário', async () => {
    setup({ character: makeChar({ userId: 'outro' }) })
    const res = await request(app).get('/api/v1/characters/char-1/dilemma/2').set(authHeader(TOKEN))
    expect(res.status).toBe(403)
  })

  it('401 sem token', async () => {
    const res = await request(app).get('/api/v1/characters/char-1/dilemma/2')
    expect(res.status).toBe(401)
  })
})

// ─── POST dilema ──────────────────────────────────────────────────────────────

describe('POST chooseDilemma', () => {
  it('emprestar: sai R$ 500 agora e marca a devolução de R$ 537 em maio', async () => {
    setup()
    const res = await choose(2, 0)

    expect(res.status).toBe(200)
    expect(res.body.cashImpact).toBe(-500)
    expect(cashIncrement()).toBe(-500)
    expect(createdEffects()).toEqual([
      expect.objectContaining({ characterId: 'char-1', sourceTurn: 2, turn: 5, kind: 'cash', amount: 537 }),
    ])
  })

  it('não emprestar: nada sai e nada fica marcado', async () => {
    setup()
    const res = await choose(2, 1)

    expect(res.body.cashImpact).toBe(0)
    expect(prismaMock.scheduledEffect.createMany).not.toHaveBeenCalled()
  })

  it('guarda a escolha e o valor pago', async () => {
    setup()
    await choose(2, 0)

    expect(prismaMock.characterChoice.create).toHaveBeenCalledWith({
      data: { characterId: 'char-1', turn: 2, kind: 'dilemma', option: 0, amount: 500 },
    })
  })

  it('registra no extrato com o prefixo Dilema e dá 1 ponto de habilidade', async () => {
    setup()
    await choose(2, 0)

    expect(lastLog()).toEqual(expect.objectContaining({ turn: 2, cashImpact: -500 }))
    expect(lastLog().description).toMatch(/^Dilema "Empréstimo para o amigo" — Opção A: /)
    expect(prismaMock.characterSkillPoints.update).toHaveBeenCalledWith({
      where: { characterId: 'char-1' }, data: { totalPoints: { increment: 1 } },
    })
  })

  it('a resposta não revela a consequência', async () => {
    setup()
    const res = await choose(2, 0)
    expect(res.body.result).not.toMatch(/537|maio/i)
  })

  it('parcelar a máquina: 1ª parcela agora e 11 parcelas marcadas de maio em diante', async () => {
    setup({ character: makeChar({ room: { status: 'active', currentTurn: 4 } }) })
    await choose(4, 0)

    expect(cashIncrement()).toBe(-335.2)
    const effects = createdEffects()
    expect(effects).toHaveLength(11)
    expect(effects.map((e) => e.turn)).toEqual([5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
    expect(effects.every((e) => e.kind === 'installment' && e.amount === -335.2)).toBe(true)
    expect(effects[0].label).toBe('Parcela: Máquina de lavar (2/12)')
  })

  it('parcela não ganha desconto do Trabalho em Equipe', async () => {
    setup({ character: makeChar({ room: { status: 'active', currentTurn: 4 }, unlockedSkills: [skill('communication', 2)] }) })
    await choose(4, 0)

    expect(cashIncrement()).toBe(-335.2)
  })

  it('Trabalho em Equipe: à vista sai 30% mais barato (3.620 → 2.534)', async () => {
    setup({ character: makeChar({ room: { status: 'active', currentTurn: 4 }, unlockedSkills: [skill('communication', 2)] }) })
    const res = await choose(4, 1)

    expect(cashIncrement()).toBe(-2534)
    expect(res.body.result).toContain('30% a menos com Trabalho em Equipe')
  })

  it('ir a pé em agosto trava a tela por 30 segundos', async () => {
    setup({ character: makeChar({ room: { status: 'active', currentTurn: 8 } }) })
    const res = await choose(8, 1)

    expect(res.body.lockSeconds).toBe(30)
  })

  it('aplicativo em agosto não trava', async () => {
    setup({ character: makeChar({ room: { status: 'active', currentTurn: 8 } }) })
    const res = await choose(8, 0)

    expect(res.body.lockSeconds).toBe(0)
    expect(cashIncrement()).toBe(-45)
  })

  it('atrasou em agosto e faltou à TV: demitido em novembro, dezembro sem salário', async () => {
    setup({ character: makeChar({ room: { status: 'active', currentTurn: 9 } }), choices: [{ turn: 8, option: 1 }] })
    await choose(9, 1)

    expect(createdEffects().map((e) => [e.turn, e.kind])).toEqual([[11, 'notice'], [12, 'no_salary']])
  })

  it('faltou à TV sem ter se atrasado: nada acontece', async () => {
    setup({ character: makeChar({ room: { status: 'active', currentTurn: 9 } }), choices: [{ turn: 8, option: 0 }] })
    await choose(9, 1)

    expect(prismaMock.scheduledEffect.createMany).not.toHaveBeenCalled()
  })

  it('foi à TV: promoção de 10% de outubro a dezembro', async () => {
    setup({ character: makeChar({ room: { status: 'active', currentTurn: 9 } }), choices: [{ turn: 5, option: 0 }] })
    await choose(9, 0)

    expect(createdEffects().map((e) => [e.turn, e.kind, e.amount])).toEqual([
      [10, 'salary_raise', 700], [11, 'salary_raise', 700], [12, 'salary_raise', 700],
    ])
  })

  it('quem perdeu a reunião de maio ganha só 5%', async () => {
    setup({ character: makeChar({ room: { status: 'active', currentTurn: 9 } }), choices: [{ turn: 5, option: 1 }] })
    await choose(9, 0)

    expect(createdEffects().map((e) => e.amount)).toEqual([350, 350, 350])
  })

  it('incêndio, casa mais cara: aluguel sobe 50% e a mobília chega em novembro', async () => {
    setup({ character: makeChar({ housingCost: 1500, room: { status: 'active', currentTurn: 10 } }) })
    await choose(10, 1)

    expect(prismaMock.character.update.mock.calls[0][0].data).toEqual({ cash: { increment: 0 }, housingCost: 2250 })
    expect(createdEffects()).toEqual([
      expect.objectContaining({ turn: 11, kind: 'notice' }),
      expect.objectContaining({ turn: 11, kind: 'cash', amount: -2000 }),
    ])
  })

  it('incêndio, adiantar: 3 aluguéis com 10% de desconto e sem aluguel em nov/dez', async () => {
    setup({ character: makeChar({ housingCost: 1500, room: { status: 'active', currentTurn: 10 } }) })
    await choose(10, 0)

    expect(cashIncrement()).toBe(-4050)
    expect(createdEffects().filter((e) => e.kind === 'rent_waived').map((e) => e.turn)).toEqual([11, 12])
  })

  it('adiantar aluguel usa o desconto de Negociação, não o de Trabalho em Equipe', async () => {
    setup({
      character: makeChar({ housingCost: 1500, room: { status: 'active', currentTurn: 10 }, unlockedSkills: [skill('communication', 2), skill('communication', 3)] }),
    })
    await choose(10, 0)

    expect(cashIncrement()).toBe(-3240) // 1200 × 3 × 0,9
  })

  it('advogado: 40% do que pagou e R$ 5.000 em dezembro', async () => {
    setup({ character: makeChar({ room: { status: 'active', currentTurn: 11 } }), choices: [{ turn: 4, option: 1 }] })
    await choose(11, 0)

    expect(cashIncrement()).toBe(-1448)
    expect(createdEffects()).toEqual([expect.objectContaining({ turn: 12, kind: 'cash', amount: 5000 })])
  })

  it('tudo acontece numa transação só', async () => {
    setup()
    await choose(2, 0)
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
  })
})

describe('POST chooseDilemma — erros', () => {
  it('400 se já respondeu', async () => {
    setup({ answered: { option: 0, amount: 500 } })
    const res = await choose(2, 1)

    expect(res.status).toBe(400)
    expect(prismaMock.character.update).not.toHaveBeenCalled()
  })

  it('400 se o mês não é o que está sendo jogado', async () => {
    setup({ character: makeChar({ room: { status: 'active', currentTurn: 3 } }) })
    const res = await choose(2, 0)

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Esse mês não está aberto')
  })

  it('400 se a sala não está ativa', async () => {
    setup({ character: makeChar({ room: { status: 'finished', currentTurn: 2 } }) })
    expect((await choose(2, 0)).status).toBe(400)
  })

  it('404 para mês sem dilema', async () => {
    setup()
    expect((await choose(12, 0)).status).toBe(404)
  })

  it.each([2, -1, 'a', undefined])('400 para opção inválida (%p)', async (option) => {
    setup()
    expect((await choose(2, option)).status).toBe(400)
  })

  it('404 se o personagem não existe', async () => {
    setup()
    prismaMock.character.findUnique.mockResolvedValue(null)
    expect((await choose(2, 0)).status).toBe(404)
  })

  it('403 para personagem de outro usuário', async () => {
    setup({ character: makeChar({ userId: 'outro' }) })
    expect((await choose(2, 0)).status).toBe(403)
  })

  it('401 sem token', async () => {
    const res = await request(app).post('/api/v1/characters/char-1/dilemma/2/choose').send({ optionIndex: 0 })
    expect(res.status).toBe(401)
  })
})

// ─── Lazer ────────────────────────────────────────────────────────────────────

const chooseLeisure = (turn, optionIndex) =>
  request(app).post(`/api/v1/characters/char-1/leisure/${turn}/choose`).set(authHeader(TOKEN)).send({ optionIndex })

describe('GET /api/v1/characters/:id/leisure/:turn', () => {
  it('devolve as duas opções e o preço do mês', async () => {
    setup()
    const res = await request(app).get('/api/v1/characters/char-1/leisure/2').set(authHeader(TOKEN))

    expect(res.status).toBe(200)
    expect(res.body.leisure.price).toBe(300)
    expect(res.body.leisure.options.map((o) => o.title)).toEqual(['Carnaval de rua', 'Festa de carnaval'])
    expect(res.body.chosen).toBeNull()
  })

  it('Trabalho em Equipe: preço 30% menor e o desconto aparece', async () => {
    setup({ character: makeChar({ unlockedSkills: [skill('communication', 2)] }) })
    const res = await request(app).get('/api/v1/characters/char-1/leisure/12').set(authHeader(TOKEN))

    expect(res.body.leisure).toEqual(expect.objectContaining({ price: 700, basePrice: 1000, discount: 300 }))
  })

  it('mostra o que foi escolhido', async () => {
    setup({ answered: { option: 1, amount: 300 } })
    const res = await request(app).get('/api/v1/characters/char-1/leisure/2').set(authHeader(TOKEN))

    expect(res.body.chosen).toEqual({ option: 1, title: 'Festa de carnaval', amount: 300 })
  })

  it('mês fora do ano não tem lazer', async () => {
    const res = await request(app).get('/api/v1/characters/char-1/leisure/13').set(authHeader(TOKEN))
    expect(res.body).toEqual({ leisure: null })
  })
})

describe('POST chooseLeisure', () => {
  it('cobra o preço do mês e registra no extrato', async () => {
    setup()
    const res = await chooseLeisure(2, 0)

    expect(res.status).toBe(200)
    expect(cashIncrement()).toBe(-300)
    expect(lastLog()).toEqual({ characterId: 'char-1', turn: 2, cashImpact: -300, description: 'Lazer: Carnaval de rua (-R$ 300.00)' })
  })

  it('as duas opções custam igual', async () => {
    setup()
    await chooseLeisure(2, 1)
    expect(cashIncrement()).toBe(-300)
  })

  it('guarda a escolha', async () => {
    setup()
    await chooseLeisure(2, 1)
    expect(prismaMock.characterChoice.create).toHaveBeenCalledWith({
      data: { characterId: 'char-1', turn: 2, kind: 'leisure', option: 1, amount: 300 },
    })
  })

  it('Trabalho em Equipe: 30% a menos e o extrato avisa', async () => {
    setup({ character: makeChar({ unlockedSkills: [skill('communication', 2)] }) })
    await chooseLeisure(2, 0)

    expect(cashIncrement()).toBe(-210)
    expect(lastLog().description).toBe('Lazer: Carnaval de rua (-R$ 210.00) com 30% de desconto')
  })

  it('lazer não dá ponto de habilidade (o ponto é do dilema)', async () => {
    setup()
    await chooseLeisure(2, 0)
    expect(prismaMock.characterSkillPoints.update).not.toHaveBeenCalled()
  })

  it('400 se já escolheu', async () => {
    setup({ answered: { option: 0, amount: 300 } })
    const res = await chooseLeisure(2, 1)

    expect(res.status).toBe(400)
    expect(prismaMock.character.update).not.toHaveBeenCalled()
  })

  it('400 fora do mês atual', async () => {
    setup({ character: makeChar({ room: { status: 'active', currentTurn: 5 } }) })
    expect((await chooseLeisure(2, 0)).status).toBe(400)
  })

  it('400 para opção inválida', async () => {
    setup()
    expect((await chooseLeisure(2, 2)).status).toBe(400)
  })

  it('403 para personagem de outro usuário', async () => {
    setup({ character: makeChar({ userId: 'outro' }) })
    expect((await chooseLeisure(2, 0)).status).toBe(403)
  })

  it('dezembro também tem lazer', async () => {
    setup({ character: makeChar({ room: { status: 'active', currentTurn: 12 } }) })
    await chooseLeisure(12, 1)
    expect(cashIncrement()).toBe(-1000)
  })
})
