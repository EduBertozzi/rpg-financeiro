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
// por padrão o personagem acabou de encerrar o mês: o dilema está aberto
// (os testes de lazer usam um personagem com o mês ainda aberto)
const makeChar = (overrides = {}) => ({
  id: 'char-1', userId: 'user-1', cash: 5000, housingCost: 1500, readyAt: new Date(), turnReady: true,
  room: { status: 'active', currentTurn: 2 }, unlockedSkills: [],
  ...overrides,
})
const openMonth = (overrides = {}) => makeChar({ readyAt: null, turnReady: false, ...overrides })

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
    expect(res.body.dilemma.options.map((o) => [o.label, o.price])).toEqual([['A', 750], ['B', 0]])
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

    expect(res.body.dilemma.options[0].price).toBe(2413.44) // 40% de 12 × 502,80
  })

  it('com Trabalho em Equipe o preço mostrado já vem com 15% a menos', async () => {
    setup({ character: makeChar({ unlockedSkills: [skill('communication', 2)] }) })
    const res = await request(app).get('/api/v1/characters/char-1/dilemma/2').set(authHeader(TOKEN))

    expect(res.body.dilemma.options[0].price).toBe(637.5)
  })

  it('mostra o resultado quando já respondeu', async () => {
    setup({ answered: { option: 0, amount: 750 } })
    const res = await request(app).get('/api/v1/characters/char-1/dilemma/2').set(authHeader(TOKEN))

    expect(res.body.alreadyAnswered).toBe(true)
    expect(res.body.previousResult).toEqual(expect.objectContaining({ label: 'A', cashImpact: -750 }))
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
  it('emprestar: sai R$ 750 agora e marca a devolução de R$ 810 em maio', async () => {
    setup()
    const res = await choose(2, 0)

    expect(res.status).toBe(200)
    expect(res.body.cashImpact).toBe(-750)
    expect(cashIncrement()).toBe(-750)
    expect(createdEffects()).toEqual([
      expect.objectContaining({ characterId: 'char-1', sourceTurn: 2, turn: 5, kind: 'cash', amount: 810 }),
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
      data: { characterId: 'char-1', turn: 2, kind: 'dilemma', option: 0, amount: 750 },
    })
  })

  it('registra no extrato com o prefixo Dilema e dá 1 ponto de habilidade', async () => {
    setup()
    await choose(2, 0)

    expect(lastLog()).toEqual(expect.objectContaining({ turn: 2, cashImpact: -750 }))
    expect(lastLog().description).toMatch(/^Dilema "Empréstimo para o amigo" — Opção A: /)
    expect(prismaMock.characterSkillPoints.update).toHaveBeenCalledWith({
      where: { characterId: 'char-1' }, data: { totalPoints: { increment: 1 } },
    })
  })

  it('a resposta não revela a consequência', async () => {
    setup()
    const res = await choose(2, 0)
    expect(res.body.result).not.toMatch(/810|maio/i)
  })

  it('parcelar a máquina: 1ª parcela agora e 11 parcelas marcadas de maio em diante', async () => {
    setup({ character: makeChar({ room: { status: 'active', currentTurn: 4 } }) })
    await choose(4, 0)

    expect(cashIncrement()).toBe(-502.8)
    const effects = createdEffects()
    expect(effects).toHaveLength(11)
    expect(effects.map((e) => e.turn)).toEqual([5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
    expect(effects.every((e) => e.kind === 'installment' && e.amount === -502.8)).toBe(true)
    expect(effects[0].label).toBe('Parcela: Máquina de lavar (2/12)')
  })

  it('parcela não ganha desconto do Trabalho em Equipe', async () => {
    setup({ character: makeChar({ room: { status: 'active', currentTurn: 4 }, unlockedSkills: [skill('communication', 2)] }) })
    await choose(4, 0)

    expect(cashIncrement()).toBe(-502.8)
  })

  it('Trabalho em Equipe: à vista sai 15% mais barato (5.430 → 4.615,50)', async () => {
    setup({ character: makeChar({ room: { status: 'active', currentTurn: 4 }, unlockedSkills: [skill('communication', 2)] }) })
    const res = await choose(4, 1)

    expect(cashIncrement()).toBe(-4615.5)
    expect(res.body.result).toContain('15% a menos com Trabalho em Equipe')
  })

  it('ir a pé em agosto trava a tela por 2 minutos', async () => {
    setup({ character: makeChar({ room: { status: 'active', currentTurn: 8 } }) })
    const res = await choose(8, 1)

    expect(res.body.lockSeconds).toBe(120)
  })

  it('aplicativo em agosto não trava', async () => {
    setup({ character: makeChar({ room: { status: 'active', currentTurn: 8 } }) })
    const res = await choose(8, 0)

    expect(res.body.lockSeconds).toBe(0)
    expect(cashIncrement()).toBe(-70)
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

  it('foi à TV: promoção de 15% de outubro a dezembro', async () => {
    setup({ character: makeChar({ room: { status: 'active', currentTurn: 9 } }), choices: [{ turn: 5, option: 0 }] })
    await choose(9, 0)

    expect(createdEffects().map((e) => [e.turn, e.kind, e.amount])).toEqual([
      [10, 'salary_raise', 1050], [11, 'salary_raise', 1050], [12, 'salary_raise', 1050],
    ])
  })

  it('quem perdeu a reunião de maio ganha só 7,5%', async () => {
    setup({ character: makeChar({ room: { status: 'active', currentTurn: 9 } }), choices: [{ turn: 5, option: 1 }] })
    await choose(9, 0)

    expect(createdEffects().map((e) => e.amount)).toEqual([525, 525, 525])
  })

  it('incêndio, casa mais cara: aluguel sobe 50% e a mobília chega em novembro', async () => {
    setup({ character: makeChar({ housingCost: 1500, room: { status: 'active', currentTurn: 10 } }) })
    await choose(10, 1)

    expect(prismaMock.character.update.mock.calls[0][0].data).toEqual({ cash: { increment: 0 }, housingCost: 2250 })
    expect(createdEffects()).toEqual([
      expect.objectContaining({ turn: 11, kind: 'notice' }),
      expect.objectContaining({ turn: 11, kind: 'cash', amount: -3000 }),
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

    expect(cashIncrement()).toBe(-3746.25) // 1.387,50 (1.500 com 7,5% de Negociação) × 3 × 0,9
  })

  it('advogado: 40% do que pagou e R$ 7.500 em dezembro', async () => {
    setup({ character: makeChar({ room: { status: 'active', currentTurn: 11 } }), choices: [{ turn: 4, option: 1 }] })
    await choose(11, 0)

    expect(cashIncrement()).toBe(-2172)
    expect(createdEffects()).toEqual([expect.objectContaining({ turn: 12, kind: 'cash', amount: 7500 })])
  })

  it('tudo acontece numa transação só', async () => {
    setup()
    await choose(2, 0)
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
  })

  it('o dilema só abre depois de encerrar o mês', async () => {
    setup({ character: openMonth({ room: { status: 'active', currentTurn: 2, turnStartedAt: new Date(), monthMinutes: 10, dilemmaMinutes: 5 } }) })
    const res = await choose(2, 0)
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Encerre o mês para abrir o dilema')
    expect(prismaMock.characterChoice.create).not.toHaveBeenCalled()
  })

  it('o tempo do mês acabou: o dilema abre mesmo sem clicar em encerrar', async () => {
    const started = new Date(Date.now() - 11 * 60 * 1000)
    setup({ character: openMonth({ room: { status: 'active', currentTurn: 2, turnStartedAt: started, monthMinutes: 10, dilemmaMinutes: 5 } }) })
    expect((await choose(2, 1)).status).toBe(200)
  })

  it('o tempo do dilema acabou: não dá mais para responder (vai pela inércia na virada)', async () => {
    setup({ character: makeChar({ readyAt: new Date(Date.now() - 6 * 60 * 1000), room: { status: 'active', currentTurn: 2, dilemmaMinutes: 5 } }) })
    const res = await choose(2, 0)
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('O tempo do dilema acabou')
  })

  it('com a sala pausada o tempo não corre', async () => {
    const pausedAt = new Date(Date.now() - 20 * 60 * 1000)
    setup({ character: makeChar({ readyAt: new Date(pausedAt.getTime() - 60 * 1000), room: { status: 'active', currentTurn: 2, dilemmaMinutes: 5, pausedAt } }) })
    expect((await choose(2, 0)).status).toBe(200)
  })
})

describe('POST chooseDilemma — erros', () => {
  it('400 se já respondeu', async () => {
    setup({ answered: { option: 0, amount: 750 } })
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
    expect(res.body.leisure.price).toBe(450)
    expect(res.body.leisure.options.map((o) => o.title)).toEqual(['Carnaval de rua', 'Festa de carnaval'])
    expect(res.body.chosen).toBeNull()
  })

  it('Trabalho em Equipe: preço 15% menor e o desconto aparece', async () => {
    setup({ character: makeChar({ unlockedSkills: [skill('communication', 2)] }) })
    const res = await request(app).get('/api/v1/characters/char-1/leisure/12').set(authHeader(TOKEN))

    expect(res.body.leisure).toEqual(expect.objectContaining({ price: 1275, basePrice: 1500, discount: 225 }))
  })

  it('mostra o que foi escolhido', async () => {
    setup({ answered: { option: 1, amount: 450 } })
    const res = await request(app).get('/api/v1/characters/char-1/leisure/2').set(authHeader(TOKEN))

    expect(res.body.chosen).toEqual({ option: 1, title: 'Festa de carnaval', amount: 450 })
  })

  it('mês fora do ano não tem lazer', async () => {
    const res = await request(app).get('/api/v1/characters/char-1/leisure/13').set(authHeader(TOKEN))
    expect(res.body).toEqual({ leisure: null })
  })
})

describe('POST chooseLeisure', () => {
  it('cobra o preço do mês e registra no extrato', async () => {
    setup({ character: openMonth() })
    const res = await chooseLeisure(2, 0)

    expect(res.status).toBe(200)
    expect(cashIncrement()).toBe(-450)
    expect(lastLog()).toEqual({ characterId: 'char-1', turn: 2, cashImpact: -450, description: 'Lazer: Carnaval de rua (-R$ 450.00)' })
  })

  it('as duas opções custam igual', async () => {
    setup({ character: openMonth() })
    await chooseLeisure(2, 1)
    expect(cashIncrement()).toBe(-450)
  })

  it('guarda a escolha', async () => {
    setup({ character: openMonth() })
    await chooseLeisure(2, 1)
    expect(prismaMock.characterChoice.create).toHaveBeenCalledWith({
      data: { characterId: 'char-1', turn: 2, kind: 'leisure', option: 1, amount: 450 },
    })
  })

  it('Trabalho em Equipe: 15% a menos e o extrato avisa', async () => {
    setup({ character: openMonth({ unlockedSkills: [skill('communication', 2)] }) })
    await chooseLeisure(2, 0)

    expect(cashIncrement()).toBe(-382.5)
    expect(lastLog().description).toBe('Lazer: Carnaval de rua (-R$ 382.50) com 15% de desconto')
  })

  it('lazer não dá ponto de habilidade (o ponto é do dilema)', async () => {
    setup({ character: openMonth() })
    await chooseLeisure(2, 0)
    expect(prismaMock.characterSkillPoints.update).not.toHaveBeenCalled()
  })

  it('400 se já escolheu', async () => {
    setup({ character: openMonth(), answered: { option: 0, amount: 450 } })
    const res = await chooseLeisure(2, 1)

    expect(res.status).toBe(400)
    expect(prismaMock.character.update).not.toHaveBeenCalled()
  })

  it('400 fora do mês atual', async () => {
    setup({ character: openMonth({ room: { status: 'active', currentTurn: 5 } }) })
    expect((await chooseLeisure(2, 0)).status).toBe(400)
  })

  it('400 para opção inválida', async () => {
    setup({ character: openMonth() })
    expect((await chooseLeisure(2, 2)).status).toBe(400)
  })

  it('403 para personagem de outro usuário', async () => {
    setup({ character: openMonth({ userId: 'outro' }) })
    expect((await chooseLeisure(2, 0)).status).toBe(403)
  })

  it('dezembro também tem lazer', async () => {
    setup({ character: openMonth({ room: { status: 'active', currentTurn: 12 } }) })
    await chooseLeisure(12, 1)
    expect(cashIncrement()).toBe(-1500)
  })

  it('mês encerrado: a cidade travou e o lazer não muda mais', async () => {
    setup({ character: makeChar() })
    const res = await request(app).post('/api/v1/characters/char-1/leisure/2/choose').set(authHeader(TOKEN)).send({ optionIndex: 0 })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('O mês já foi encerrado')
    expect(prismaMock.characterChoice.create).not.toHaveBeenCalled()
  })
})
