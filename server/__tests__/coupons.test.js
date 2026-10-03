// __tests__/coupons.test.js — cupons escondidos no mapa (easter egg)
process.env.JWT_SECRET = 'test-secret'

const request = require('supertest')
const app = require('../src/app')
const { prismaMock } = require('@prisma/client')
const { makeToken, authHeader } = require('./helpers/auth')
const {
  COUPON_PHASES, COUPON_SPOTS, COUPON_REWARDS, REWARD_KINDS, FOOD_COUPON_RATE, FOOD_COUPON_NOTE, CASHBACK_AMOUNT,
  randomInt, shuffle, planCoupons, seededRandom, seedFrom, isRewardKind,
  foodCouponDiscount, foodBillWithCoupon, combinedDiscount, rewardInfo,
} = require('../src/utils/coupons')
const { cents } = require('../src/utils/finance')

const TOKEN = makeToken({ id: 'user-1' })

// sequência fixa de "sorteios" para o random injetável
const sequence = (...values) => {
  let i = 0
  return () => values[i++ % values.length]
}
const constant = (v) => () => v

// zera os mocks usados aqui (sem apagar a implementação do $transaction)
const resetModels = () => {
  for (const model of ['character', 'characterCoupon', 'characterEventLog', 'characterSkillPoints']) {
    for (const fn of Object.values(prismaMock[model])) fn.mockReset()
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  resetModels()
})

// ─── plano de cupons (puro) ───────────────────────────────────────────────────

describe('randomInt', () => {
  it('random 0 dá o mínimo', () => expect(randomInt(2, 4, constant(0))).toBe(2))
  it('random quase 1 dá o máximo', () => expect(randomInt(2, 4, constant(0.9999999))).toBe(4))
  it('random exatamente 1 (fora do contrato) não passa do máximo', () => expect(randomInt(2, 4, constant(1))).toBe(4))
  it('divide o intervalo em partes iguais', () => {
    expect(randomInt(5, 8, constant(0.24))).toBe(5)
    expect(randomInt(5, 8, constant(0.25))).toBe(6)
    expect(randomInt(5, 8, constant(0.5))).toBe(7)
    expect(randomInt(5, 8, constant(0.75))).toBe(8)
  })
  it('intervalo de um número só sempre devolve ele', () => expect(randomInt(7, 7, Math.random)).toBe(7))
})

describe('shuffle', () => {
  it('não mexe no array original', () => {
    const original = ['a', 'b', 'c']
    shuffle(original, constant(0))
    expect(original).toEqual(['a', 'b', 'c'])
  })
  it('devolve os mesmos itens', () => {
    for (let i = 0; i < 50; i++) expect(shuffle(['a', 'b', 'c'], Math.random).sort()).toEqual(['a', 'b', 'c'])
  })
  it('com random quase 1 mantém a ordem (Fisher-Yates troca cada um com ele mesmo)', () => {
    expect(shuffle(['a', 'b', 'c'], constant(0.9999))).toEqual(['a', 'b', 'c'])
  })
  it('com random 0 gira os itens', () => {
    expect(shuffle(['a', 'b', 'c'], constant(0))).toEqual(['b', 'c', 'a'])
  })
})

describe('planCoupons', () => {
  it('fases oficiais: meses 2–4, 5–8 e 9–11', () => {
    expect(COUPON_PHASES).toEqual([{ from: 2, to: 4 }, { from: 5, to: 8 }, { from: 9, to: 11 }])
  })

  it('lugares oficiais do mapa', () => {
    expect(COUPON_SPOTS).toEqual(['lake', 'balloon', 'tree', 'fountain'])
  })

  it('as listas oficiais não podem ser alteradas por engano', () => {
    expect(Object.isFrozen(REWARD_KINDS)).toBe(true)
    expect(Object.isFrozen(COUPON_SPOTS)).toBe(true)
    expect(Object.isFrozen(COUPON_PHASES)).toBe(true)
  })

  it('3 prêmios: desconto no Mercadinho, cashback e ponto de habilidade', () => {
    expect([...REWARD_KINDS].sort()).toEqual(['cashback', 'food_discount', 'skill_point'])
  })

  it('devolve 3 cupons { turn, spot, reward }', () => {
    const plan = planCoupons()
    expect(plan).toHaveLength(3)
    for (const c of plan) expect(Object.keys(c).sort()).toEqual(['reward', 'spot', 'turn'])
  })

  it('em 2000 sorteios: um cupom por fase, prêmios sem repetir e lugares válidos', () => {
    for (let i = 0; i < 2000; i++) {
      const plan = planCoupons()
      plan.forEach((c, phase) => {
        expect(c.turn).toBeGreaterThanOrEqual(COUPON_PHASES[phase].from)
        expect(c.turn).toBeLessThanOrEqual(COUPON_PHASES[phase].to)
        expect(Number.isInteger(c.turn)).toBe(true)
        expect(COUPON_SPOTS).toContain(c.spot)
      })
      expect(plan.map(c => c.reward).sort()).toEqual(['cashback', 'food_discount', 'skill_point'])
      expect(new Set(plan.map(c => c.turn)).size).toBe(3)
    }
  })

  it('os meses vêm em ordem crescente', () => {
    for (let i = 0; i < 200; i++) {
      const turns = planCoupons().map(c => c.turn)
      expect(turns).toEqual([...turns].sort((a, b) => a - b))
    }
  })

  it('com o tempo, todo mês de cada fase aparece', () => {
    const seen = new Set()
    for (let i = 0; i < 3000; i++) planCoupons().forEach(c => seen.add(c.turn))
    expect([...seen].sort((a, b) => a - b)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  })

  it('com o tempo, os 4 lugares aparecem', () => {
    const seen = new Set()
    for (let i = 0; i < 1000; i++) planCoupons().forEach(c => seen.add(c.spot))
    expect([...seen].sort()).toEqual([...COUPON_SPOTS].sort())
  })

  it('com o tempo, as 6 ordens possíveis de prêmios aparecem', () => {
    const seen = new Set()
    for (let i = 0; i < 3000; i++) seen.add(planCoupons().map(c => c.reward).join(','))
    expect(seen.size).toBe(6)
  })

  it('random 0: primeiro mês de cada fase, sempre no lago', () => {
    const plan = planCoupons(constant(0))
    expect(plan.map(c => c.turn)).toEqual([2, 5, 9])
    expect(plan.map(c => c.spot)).toEqual(['lake', 'lake', 'lake'])
  })

  it('random quase 1: último mês de cada fase, sempre na fonte', () => {
    const plan = planCoupons(constant(0.99999))
    expect(plan.map(c => c.turn)).toEqual([4, 8, 11])
    expect(plan.map(c => c.spot)).toEqual(['fountain', 'fountain', 'fountain'])
  })

  it('é determinístico com o random injetado', () => {
    const values = [0.1, 0.7, 0.3, 0.9, 0.5, 0.2, 0.8, 0.4]
    expect(planCoupons(sequence(...values))).toEqual(planCoupons(sequence(...values)))
  })

  it('resultado exato para uma sequência conhecida', () => {
    // shuffle usa 2 sorteios, depois (mês, lugar) para cada fase
    const plan = planCoupons(sequence(0, 0, 0.5, 0.3, 0.5, 0.6, 0.5, 0.9))
    // shuffle com 0,0: [food_discount, cashback, skill_point] -> [cashback, skill_point, food_discount]
    expect(plan).toEqual([
      { turn: 3, spot: 'balloon', reward: 'cashback' },
      { turn: 7, spot: 'tree', reward: 'skill_point' },
      { turn: 10, spot: 'fountain', reward: 'food_discount' }, // 9 + floor(0,5 × 3)
    ])
  })
})

describe('seededRandom / seedFrom', () => {
  it('mesma semente, mesma sequência', () => {
    const a = seededRandom(42)
    const b = seededRandom(42)
    for (let i = 0; i < 20; i++) expect(a()).toBe(b())
  })
  it('sementes diferentes, sequências diferentes', () => {
    const a = seededRandom(1)
    const b = seededRandom(2)
    expect([a(), a(), a()]).not.toEqual([b(), b(), b()])
  })
  it('sempre entre 0 (inclusive) e 1 (exclusive)', () => {
    const r = seededRandom(123456)
    for (let i = 0; i < 5000; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
  it('seedFrom é determinístico e cabe em 32 bits', () => {
    expect(seedFrom('char-1:x')).toBe(seedFrom('char-1:x'))
    expect(seedFrom('char-1:x')).not.toBe(seedFrom('char-2:x'))
    expect(seedFrom('qualquer')).toBeGreaterThanOrEqual(0)
    expect(seedFrom('qualquer')).toBeLessThan(2 ** 32)
  })
  it('plano com semente fixa é sempre o mesmo e é válido', () => {
    const plan = planCoupons(seededRandom(seedFrom('char-1:segredo')))
    expect(planCoupons(seededRandom(seedFrom('char-1:segredo')))).toEqual(plan)
    expect(plan.map(c => c.reward).sort()).toEqual(['cashback', 'food_discount', 'skill_point'])
  })
})

describe('prêmios (puro)', () => {
  it('títulos oficiais', () => {
    expect(COUPON_REWARDS.food_discount.title).toBe('Cupom do Mercadinho')
    expect(COUPON_REWARDS.cashback.title).toBe('Cashback do Maré')
    expect(COUPON_REWARDS.skill_point.title).toBe('Bilhete da Universidade')
  })
  it('cashback é R$ 150 e o cupom do Mercadinho é 20%', () => {
    expect(CASHBACK_AMOUNT).toBe(150)
    expect(FOOD_COUPON_RATE).toBe(0.2)
  })
  it('isRewardKind', () => {
    expect(isRewardKind('cashback')).toBe(true)
    expect(isRewardKind('toString')).toBe(false)
    expect(isRewardKind('jackpot')).toBe(false)
  })
  it('rewardInfo monta { kind, title, description, amount } em centavos', () => {
    expect(rewardInfo('cashback', 150)).toEqual({
      kind: 'cashback', title: 'Cashback do Maré', description: COUPON_REWARDS.cashback.description, amount: 150,
    })
    expect(rewardInfo('food_discount', 66.666).amount).toBe(66.67)
    expect(rewardInfo('skill_point').amount).toBe(0)
    expect(rewardInfo('jackpot')).toBeNull()
  })

  it.each([
    [1000, 200, 800],
    [900, 180, 720], // Mão de Vaca
    [850, 170, 680], // Organização Financeira
    [765, 153, 612], // Mão de Vaca + Organização Financeira
    [333.33, 66.67, 266.66],
    [0.05, 0.01, 0.04],
    [0, 0, 0],
  ])('Mercadinho de R$ %p: desconto R$ %p, conta R$ %p', (bill, discount, after) => {
    expect(foodCouponDiscount(bill)).toBe(discount)
    expect(foodBillWithCoupon(bill)).toBe(after)
  })

  it('desconto + conta com cupom = conta original, centavo por centavo', () => {
    for (let c = 0; c <= 200000; c += 37) {
      const bill = c / 100
      expect(cents(foodCouponDiscount(bill) + foodBillWithCoupon(bill))).toBe(cents(bill))
    }
  })

  it('aceita valores Decimal em texto', () => {
    expect(foodCouponDiscount('1000')).toBe(200)
    expect(foodBillWithCoupon('850.00')).toBe(680)
  })

  it('desconto combinado: cupom vale sobre o que sobrou da habilidade', () => {
    expect(combinedDiscount(0)).toBe(0.2)
    expect(combinedDiscount(0.15)).toBe(0.32)
    expect(combinedDiscount(0.1)).toBe(0.28)
  })

  it('a marca no extrato da conta paga com cupom', () => {
    expect(FOOD_COUPON_NOTE).toBe('com o Cupom do Mercadinho')
  })
})

// ─── endpoints ────────────────────────────────────────────────────────────────

const makeCharacter = (overrides = {}) => ({
  id: 'char-1',
  userId: 'user-1',
  roomId: 'room-1',
  gift: 'agile',
  cash: 5000,
  foodCost: 1000,
  utilitiesCost: 250,
  transportCost: 250,
  unlockedSkills: [],
  room: { id: 'room-1', currentTurn: 3, status: 'active' },
  ...overrides,
})

const PLAN = [
  { id: 'cup-a', characterId: 'char-1', turn: 3, spot: 'tree', reward: 'cashback', claimedAt: null, value: null },
  { id: 'cup-b', characterId: 'char-1', turn: 6, spot: 'lake', reward: 'food_discount', claimedAt: null, value: null },
  { id: 'cup-c', characterId: 'char-1', turn: 10, spot: 'balloon', reward: 'skill_point', claimedAt: null, value: null },
]
const planWith = (changes = {}) => PLAN.map(c => ({ ...c, ...(changes[c.turn] ?? {}) }))

const getCoupon = (turn, id = 'char-1') =>
  request(app).get(`/api/v1/characters/${id}/coupon/${turn}`).set(authHeader(TOKEN))
const claim = (turn, id = 'char-1') =>
  request(app).post(`/api/v1/characters/${id}/coupon/${turn}/claim`).set(authHeader(TOKEN))

describe('GET /api/v1/characters/:id/coupon/:turn', () => {
  it('mostra só id e lugar do cupom do mês atual', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.characterCoupon.findMany.mockResolvedValue(PLAN)

    const res = await getCoupon(3)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ coupon: { id: 'cup-a', spot: 'tree' } })
  })

  it('nunca revela o prêmio nem os outros meses', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.characterCoupon.findMany.mockResolvedValue(PLAN)

    const res = await getCoupon(3)
    const text = JSON.stringify(res.body)

    for (const kind of REWARD_KINDS) expect(text).not.toContain(kind)
    expect(text).not.toContain('reward')
    expect(text).not.toContain('cup-b')
    expect(text).not.toContain('cup-c')
    expect(text).not.toMatch(/"turn"/)
  })

  it('mês sem cupom: coupon null', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ room: { currentTurn: 4, status: 'active' } }))
    prismaMock.characterCoupon.findMany.mockResolvedValue(PLAN)

    const res = await getCoupon(4)
    expect(res.body).toEqual({ coupon: null })
  })

  it('pedir um mês futuro não revela o cupom dele', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.characterCoupon.findMany.mockResolvedValue(PLAN)

    const res = await getCoupon(6)
    expect(res.body).toEqual({ coupon: null })
  })

  it('pedir um mês passado também não', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ room: { currentTurn: 7, status: 'active' } }))
    prismaMock.characterCoupon.findMany.mockResolvedValue(PLAN)

    const res = await getCoupon(6)
    expect(res.body).toEqual({ coupon: null })
  })

  it('cupom já resgatado some do mapa', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.characterCoupon.findMany.mockResolvedValue(planWith({ 3: { claimedAt: new Date() } }))

    const res = await getCoupon(3)
    expect(res.body).toEqual({ coupon: null })
  })

  it('partida encerrada: sem cupom', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ room: { currentTurn: 3, status: 'finished' } }))
    prismaMock.characterCoupon.findMany.mockResolvedValue(PLAN)

    const res = await getCoupon(3)
    expect(res.body).toEqual({ coupon: null })
  })

  it('mês inválido na URL: coupon null', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.characterCoupon.findMany.mockResolvedValue(PLAN)

    const res = await getCoupon('abc')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ coupon: null })
  })

  it('404 para personagem inexistente', async () => {
    prismaMock.character.findUnique.mockResolvedValue(null)
    const res = await getCoupon(3, 'naoexiste')
    expect(res.status).toBe(404)
    expect(prismaMock.characterCoupon.findMany).not.toHaveBeenCalled()
  })

  it('403 para personagem de outro usuário (e não cria nada)', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ userId: 'outro' }))
    const res = await getCoupon(3)
    expect(res.status).toBe(403)
    expect(prismaMock.characterCoupon.findMany).not.toHaveBeenCalled()
    expect(prismaMock.characterCoupon.upsert).not.toHaveBeenCalled()
  })

  it('401 sem token', async () => {
    const res = await request(app).get('/api/v1/characters/char-1/coupon/3')
    expect(res.status).toBe(401)
  })

  it('500 se o banco falhar', async () => {
    prismaMock.character.findUnique.mockRejectedValue(new Error('boom'))
    const res = await getCoupon(3)
    expect(res.status).toBe(500)
  })
})

describe('plano criado na hora para personagens antigos', () => {
  it('sem cupons: cria os 3 com upsert numa transação e devolve o do mês', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    const created = []
    prismaMock.characterCoupon.upsert.mockImplementation((args) => {
      created.push(args)
      return Promise.resolve(args.create)
    })
    prismaMock.characterCoupon.findMany
      .mockResolvedValueOnce([])
      .mockImplementationOnce(() => Promise.resolve(created.map((a, i) => ({ id: `new-${i}`, claimedAt: null, ...a.create }))))

    const res = await getCoupon(3)

    expect(res.status).toBe(200)
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
    expect(prismaMock.characterCoupon.upsert).toHaveBeenCalledTimes(3)
    for (const args of created) {
      expect(args.update).toEqual({}) // nunca sobrescreve um cupom que já existe
      expect(args.where).toEqual({ characterId_turn: { characterId: 'char-1', turn: args.create.turn } })
      expect(args.create.characterId).toBe('char-1')
    }
    expect(created.map(a => a.create.reward).sort()).toEqual(['cashback', 'food_discount', 'skill_point'])
    const third = created.find(a => a.create.turn === 3)
    expect(res.body).toEqual({ coupon: third ? { id: `new-${created.indexOf(third)}`, spot: third.create.spot } : null })
  })

  it('o plano criado na hora é sempre o mesmo para o mesmo personagem (idempotente)', async () => {
    const plans = []
    for (let i = 0; i < 2; i++) {
      resetModels()
      prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
      prismaMock.characterCoupon.findMany.mockResolvedValue([])
      prismaMock.characterCoupon.upsert.mockImplementation((args) => Promise.resolve(args.create))
      await getCoupon(3)
      plans.push(prismaMock.characterCoupon.upsert.mock.calls.map(([a]) => a.create))
    }
    expect(plans[0]).toHaveLength(3)
    expect(plans[1]).toEqual(plans[0])
  })

  it('personagens diferentes ganham planos independentes (semente pelo id)', async () => {
    const plans = []
    for (const id of ['char-1', 'char-2', 'char-3', 'char-4', 'char-5']) {
      resetModels()
      prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ id }))
      prismaMock.characterCoupon.findMany.mockResolvedValue([])
      prismaMock.characterCoupon.upsert.mockImplementation((args) => Promise.resolve(args.create))
      await getCoupon(3, id)
      plans.push(JSON.stringify(prismaMock.characterCoupon.upsert.mock.calls.map(([a]) => ({ ...a.create, characterId: null }))))
    }
    expect(new Set(plans).size).toBeGreaterThan(1)
  })

  it('com plano já existente não cria nada', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.characterCoupon.findMany.mockResolvedValue(PLAN)

    await getCoupon(3)
    await getCoupon(3)

    expect(prismaMock.characterCoupon.upsert).not.toHaveBeenCalled()
    expect(prismaMock.characterCoupon.createMany).not.toHaveBeenCalled()
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('outra requisição criou ao mesmo tempo (P2002): segue com o plano do banco', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.characterCoupon.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce(PLAN)
    prismaMock.$transaction.mockImplementationOnce(() => Promise.reject(Object.assign(new Error('unique'), { code: 'P2002' })))

    const res = await getCoupon(3)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ coupon: { id: 'cup-a', spot: 'tree' } })
  })

  it('outro erro do banco vira 500', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.characterCoupon.findMany.mockResolvedValueOnce([])
    prismaMock.$transaction.mockImplementationOnce(() => Promise.reject(new Error('disco cheio')))

    const res = await getCoupon(3)
    expect(res.status).toBe(500)
  })

  it('o resgate também cria o plano se faltar', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.characterCoupon.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce(PLAN)

    const res = await claim(3)

    expect(prismaMock.characterCoupon.upsert).toHaveBeenCalledTimes(3)
    expect(res.status).toBe(200)
  })
})

describe('POST /api/v1/characters/:id/coupon/:turn/claim — validações', () => {
  it('400 se o mês já passou', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ room: { currentTurn: 4, status: 'active' } }))
    prismaMock.characterCoupon.findMany.mockResolvedValue(PLAN)

    const res = await claim(3)

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Esse cupom já expirou')
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('400 se o mês ainda não chegou', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.characterCoupon.findMany.mockResolvedValue(PLAN)

    const res = await claim(6)

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Esse cupom ainda não apareceu')
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('400 com mês inválido na URL', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    const res = await claim('abc')
    expect(res.status).toBe(400)
  })

  it('400 se a partida já acabou', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ room: { currentTurn: 3, status: 'finished' } }))
    prismaMock.characterCoupon.findMany.mockResolvedValue(PLAN)

    const res = await claim(3)

    expect(res.status).toBe(400)
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('404 se não tem cupom neste mês', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ room: { currentTurn: 4, status: 'active' } }))
    prismaMock.characterCoupon.findMany.mockResolvedValue(PLAN)

    const res = await claim(4)

    expect(res.status).toBe(404)
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('409 se o cupom já foi resgatado (nada é pago de novo)', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.characterCoupon.findMany.mockResolvedValue(planWith({ 3: { claimedAt: new Date(), value: 150 } }))

    const res = await claim(3)

    expect(res.status).toBe(409)
    expect(prismaMock.character.update).not.toHaveBeenCalled()
    expect(prismaMock.characterEventLog.create).not.toHaveBeenCalled()
  })

  it('404 para personagem inexistente', async () => {
    prismaMock.character.findUnique.mockResolvedValue(null)
    const res = await claim(3, 'naoexiste')
    expect(res.status).toBe(404)
  })

  it('403 para personagem de outro usuário (nada é pago)', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ userId: 'outro' }))
    prismaMock.characterCoupon.findMany.mockResolvedValue(PLAN)

    const res = await claim(3)

    expect(res.status).toBe(403)
    expect(prismaMock.character.update).not.toHaveBeenCalled()
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('401 sem token', async () => {
    const res = await request(app).post('/api/v1/characters/char-1/coupon/3/claim')
    expect(res.status).toBe(401)
  })

  it('500 se a transação falhar', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.characterCoupon.findMany.mockResolvedValue(PLAN)
    prismaMock.$transaction.mockImplementationOnce(() => Promise.reject(new Error('boom')))

    const res = await claim(3)
    expect(res.status).toBe(500)
  })

  it('500 para cupom com prêmio desconhecido no banco', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.characterCoupon.findMany.mockResolvedValue(planWith({ 3: { reward: 'jackpot' } }))

    const res = await claim(3)
    expect(res.status).toBe(500)
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })
})

describe('resgate: Cashback do Maré', () => {
  const setup = (overrides = {}) => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter(overrides))
    prismaMock.characterCoupon.findMany.mockResolvedValue(PLAN)
  }

  it('R$ 150 na conta, com prêmio e saldo depois', async () => {
    setup()
    const res = await claim(3)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      reward: { kind: 'cashback', title: 'Cashback do Maré', description: COUPON_REWARDS.cashback.description, amount: 150 },
      cashAfter: 5150,
    })
    expect(prismaMock.character.update).toHaveBeenCalledWith({ where: { id: 'char-1' }, data: { cash: { increment: 150 } } })
  })

  it('linha no extrato do mês começando com "Cupom:"', async () => {
    setup()
    await claim(3)
    expect(prismaMock.characterEventLog.create).toHaveBeenCalledWith({
      data: { characterId: 'char-1', turn: 3, cashImpact: 150, description: 'Cupom: Cashback do Maré (+R$ 150.00)' }
    })
  })

  it('marca o cupom como resgatado e guarda o valor', async () => {
    setup()
    await claim(3)
    const [args] = prismaMock.characterCoupon.update.mock.calls[0]
    expect(args.where).toEqual({ id: 'cup-a' })
    expect(args.data.value).toBe(150)
    expect(args.data.claimedAt).toBeInstanceOf(Date)
  })

  it('crédito, cupom e extrato juntos numa transação só', async () => {
    setup()
    await claim(3)
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
    expect(prismaMock.$transaction.mock.calls[0][0]).toHaveLength(3)
  })

  it('no cheque especial o cashback abate a dívida', async () => {
    setup({ cash: -100.1 })
    const res = await claim(3)
    expect(res.body.cashAfter).toBe(49.9)
  })

  it('saldo em Decimal (texto) em centavos', async () => {
    setup({ cash: '1234.565' })
    const res = await claim(3)
    expect(res.body.cashAfter).toBe(1384.57)
  })
})

describe('resgate: Bilhete da Universidade', () => {
  const setup = (overrides = {}) => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ room: { currentTurn: 10, status: 'active' }, ...overrides }))
    prismaMock.characterCoupon.findMany.mockResolvedValue(PLAN)
  }

  it('+1 ponto de habilidade, sem mexer no dinheiro', async () => {
    setup()
    const res = await claim(10)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      reward: { kind: 'skill_point', title: 'Bilhete da Universidade', description: COUPON_REWARDS.skill_point.description, amount: 0 },
      cashAfter: 5000,
    })
    expect(prismaMock.character.update).not.toHaveBeenCalled()
  })

  it('soma 1 em totalPoints', async () => {
    setup()
    await claim(10)
    const [args] = prismaMock.characterSkillPoints.upsert.mock.calls[0]
    expect(args.where).toEqual({ characterId: 'char-1' })
    expect(args.update).toEqual({ totalPoints: { increment: 1 } })
  })

  it('se faltar a linha de pontos, cria com os pontos do dom + 1', async () => {
    setup({ gift: 'smart' })
    await claim(10)
    const [args] = prismaMock.characterSkillPoints.upsert.mock.calls[0]
    expect(args.create).toEqual({ characterId: 'char-1', totalPoints: 3, maxPoints: 10 })
  })

  it('sem dom de pontos cria com 1 ponto e limite 8', async () => {
    setup({ gift: 'frugal' })
    await claim(10)
    const [args] = prismaMock.characterSkillPoints.upsert.mock.calls[0]
    expect(args.create).toEqual({ characterId: 'char-1', totalPoints: 1, maxPoints: 8 })
  })

  it('extrato e cupom resgatado (valor null) na mesma transação', async () => {
    setup()
    await claim(10)
    expect(prismaMock.characterEventLog.create).toHaveBeenCalledWith({
      data: { characterId: 'char-1', turn: 10, cashImpact: 0, description: 'Cupom: Bilhete da Universidade (+1 ponto de habilidade)' }
    })
    expect(prismaMock.characterCoupon.update.mock.calls[0][0].data.value).toBeNull()
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
    expect(prismaMock.$transaction.mock.calls[0][0]).toHaveLength(3)
  })
})

describe('resgate: Cupom do Mercadinho', () => {
  const ORG = { skillNode: { path: 'management', level: 1 } } // Mercadinho 15% mais barato
  const setup = (overrides = {}, paidEntry = null) => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ room: { currentTurn: 6, status: 'active' }, ...overrides }))
    prismaMock.characterCoupon.findMany.mockResolvedValue(PLAN)
    prismaMock.characterEventLog.findFirst.mockResolvedValue(paidEntry)
  }

  describe('conta do mês ainda aberta', () => {
    it('não mexe no saldo agora; o desconto fica para a conta', async () => {
      setup()
      const res = await claim(6)

      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        reward: { kind: 'food_discount', title: 'Cupom do Mercadinho', description: COUPON_REWARDS.food_discount.description, amount: 200 },
        cashAfter: 5000,
      })
      expect(prismaMock.character.update).not.toHaveBeenCalled()
    })

    it('procura a conta do Mercadinho deste mês', async () => {
      setup()
      await claim(6)
      expect(prismaMock.characterEventLog.findFirst).toHaveBeenCalledWith({
        where: { characterId: 'char-1', turn: 6, description: { startsWith: 'Conta: Mercadinho' } }
      })
    })

    it('o desconto previsto já considera a habilidade (850 → R$ 170)', async () => {
      setup({ unlockedSkills: [ORG] })
      const res = await claim(6)
      expect(res.body.reward.amount).toBe(170)
    })

    it('Mão de Vaca (R$ 900) → R$ 180', async () => {
      setup({ foodCost: 900 })
      const res = await claim(6)
      expect(res.body.reward.amount).toBe(180)
    })

    it('extrato sem impacto no caixa e cupom marcado, numa transação', async () => {
      setup()
      await claim(6)
      expect(prismaMock.characterEventLog.create).toHaveBeenCalledWith({
        data: { characterId: 'char-1', turn: 6, cashImpact: 0, description: 'Cupom: Desconto no Mercadinho (20% na conta do mês, -R$ 200.00)' }
      })
      expect(prismaMock.characterCoupon.update.mock.calls[0][0]).toMatchObject({ where: { id: 'cup-b' }, data: { value: 200 } })
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
      expect(prismaMock.$transaction.mock.calls[0][0]).toHaveLength(2)
    })
  })

  describe('conta do mês já paga', () => {
    it('devolve 20% do que foi pago, na hora', async () => {
      setup({}, { id: 'log', cashImpact: -1000, description: 'Conta: Mercadinho — Pago (-R$ 1000)' })
      const res = await claim(6)

      expect(res.status).toBe(200)
      expect(res.body.reward).toMatchObject({ kind: 'food_discount', amount: 200 })
      expect(res.body.cashAfter).toBe(5200)
      expect(prismaMock.character.update).toHaveBeenCalledWith({ where: { id: 'char-1' }, data: { cash: { increment: 200 } } })
    })

    it('a devolução é sobre o valor pago (já com a habilidade): 850 → R$ 170', async () => {
      setup({ unlockedSkills: [ORG] }, { cashImpact: '-850', description: 'Conta: Mercadinho — Pago (-R$ 850)' })
      const res = await claim(6)
      expect(res.body.reward.amount).toBe(170)
      expect(res.body.cashAfter).toBe(5170)
    })

    it('em centavos: pagou R$ 333,33 → devolve R$ 66,67', async () => {
      setup({ cash: 100.01 }, { cashImpact: -333.33, description: 'Conta: Mercadinho — Pago (-R$ 333.33)' })
      const res = await claim(6)
      expect(res.body.reward.amount).toBe(66.67)
      expect(res.body.cashAfter).toBe(166.68)
    })

    it('linha antiga sem valor: usa o valor da conta', async () => {
      setup({}, { cashImpact: null, description: 'Conta: Mercadinho — Pago' })
      const res = await claim(6)
      expect(res.body.reward.amount).toBe(200)
    })

    it('extrato com o valor devolvido e tudo numa transação', async () => {
      setup({}, { cashImpact: -1000, description: 'Conta: Mercadinho — Pago (-R$ 1000)' })
      await claim(6)
      expect(prismaMock.characterEventLog.create).toHaveBeenCalledWith({
        data: { characterId: 'char-1', turn: 6, cashImpact: 200, description: 'Cupom: Desconto no Mercadinho (+R$ 200.00 de volta da conta paga)' }
      })
      expect(prismaMock.characterCoupon.update.mock.calls[0][0].data.value).toBe(200)
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
      expect(prismaMock.$transaction.mock.calls[0][0]).toHaveLength(3)
    })
  })
})

// ─── cupom do Mercadinho × contas ────────────────────────────────────────────

describe('Cupom do Mercadinho nas contas', () => {
  const ORG = { skillNode: { path: 'management', level: 1 } }
  const COM = { skillNode: { path: 'communication', level: 1 } }
  const claimedCoupon = { id: 'cup-b', characterId: 'char-1', turn: 6, reward: 'food_discount', claimedAt: new Date(), value: 200 }
  const bills = (turn = 6) => request(app).get(`/api/v1/characters/char-1/bills/${turn}`).set(authHeader(TOKEN))
  const pay = (type, turn = 6) =>
    request(app).post(`/api/v1/characters/char-1/bills/${turn}/pay`).set(authHeader(TOKEN)).send({ type })
  const setup = (overrides = {}) =>
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ room: { currentTurn: 6, status: 'active' }, ...overrides }))

  describe('GET das contas', () => {
    it('conta aberta com cupom: 20% a menos e coupon true', async () => {
      setup()
      prismaMock.characterCoupon.findFirst.mockResolvedValue(claimedCoupon)
      prismaMock.characterEventLog.findFirst.mockResolvedValue(null)

      const res = await bills()
      expect(res.body.find(b => b.type === 'food')).toEqual({
        type: 'food', label: 'Mercadinho', amount: 800, baseAmount: 1000, discount: 0.2, coupon: true, paid: false,
      })
    })

    it('procura só cupom do Mercadinho resgatado no mesmo mês', async () => {
      setup()
      prismaMock.characterEventLog.findFirst.mockResolvedValue(null)
      await bills()
      expect(prismaMock.characterCoupon.findFirst).toHaveBeenCalledWith({
        where: { characterId: 'char-1', turn: 6, reward: 'food_discount', claimedAt: { not: null } }
      })
    })

    it('cupom + Organização Financeira: 1000 → 850 → 680, desconto 32%', async () => {
      setup({ unlockedSkills: [ORG] })
      prismaMock.characterCoupon.findFirst.mockResolvedValue(claimedCoupon)
      prismaMock.characterEventLog.findFirst.mockResolvedValue(null)

      const res = await bills()
      expect(res.body.find(b => b.type === 'food')).toMatchObject({ amount: 680, baseAmount: 1000, discount: 0.32, coupon: true })
    })

    it('o cupom não mexe nas outras contas', async () => {
      setup({ unlockedSkills: [COM] })
      prismaMock.characterCoupon.findFirst.mockResolvedValue(claimedCoupon)
      prismaMock.characterEventLog.findFirst.mockResolvedValue(null)

      const res = await bills()
      expect(res.body.find(b => b.type === 'utilities')).toMatchObject({ amount: 175, discount: 0.3, coupon: false })
      expect(res.body.find(b => b.type === 'transport')).toMatchObject({ amount: 175, discount: 0.3, coupon: false })
    })

    it('sem cupom: tudo como antes, coupon false', async () => {
      setup()
      prismaMock.characterCoupon.findFirst.mockResolvedValue(null)
      prismaMock.characterEventLog.findFirst.mockResolvedValue(null)

      const res = await bills()
      expect(res.body.find(b => b.type === 'food')).toMatchObject({ amount: 1000, discount: 0, coupon: false })
    })

    it('conta paga com o cupom: mostra o valor pago e o desconto combinado', async () => {
      setup()
      prismaMock.characterCoupon.findFirst.mockResolvedValue(claimedCoupon)
      prismaMock.characterEventLog.findFirst.mockImplementation(({ where }) =>
        Promise.resolve(where.description.startsWith === 'Conta: Mercadinho'
          ? { cashImpact: -800, description: `Conta: Mercadinho — Pago (-R$ 800) ${FOOD_COUPON_NOTE}` }
          : null))

      const res = await bills()
      expect(res.body.find(b => b.type === 'food')).toMatchObject({ amount: 800, discount: 0.2, coupon: true, paid: true })
    })

    it('conta paga antes do cupom (devolvido em dinheiro): mostra o valor cheio pago, coupon false', async () => {
      setup()
      prismaMock.characterCoupon.findFirst.mockResolvedValue(claimedCoupon)
      prismaMock.characterEventLog.findFirst.mockImplementation(({ where }) =>
        Promise.resolve(where.description.startsWith === 'Conta: Mercadinho'
          ? { cashImpact: -1000, description: 'Conta: Mercadinho — Pago (-R$ 1000)' }
          : null))

      const res = await bills()
      expect(res.body.find(b => b.type === 'food')).toMatchObject({ amount: 1000, discount: 0, coupon: false, paid: true })
    })
  })

  describe('pagar a conta', () => {
    it('Mercadinho com cupom: cobra 20% a menos', async () => {
      setup()
      prismaMock.characterCoupon.findFirst.mockResolvedValue(claimedCoupon)
      prismaMock.characterEventLog.findFirst.mockResolvedValue(null)

      const res = await pay('food')

      expect(res.status).toBe(200)
      expect(res.body).toEqual({ label: 'Mercadinho', amount: 800, cashAfter: 4200, coupon: true })
      expect(prismaMock.character.update).toHaveBeenCalledWith({ where: { id: 'char-1' }, data: { cash: { decrement: 800 } } })
    })

    it('extrato marca o cupom e continua começando com "Conta: Mercadinho"', async () => {
      setup()
      prismaMock.characterCoupon.findFirst.mockResolvedValue(claimedCoupon)
      prismaMock.characterEventLog.findFirst.mockResolvedValue(null)

      await pay('food')
      const [args] = prismaMock.characterEventLog.create.mock.calls[0]
      expect(args.data).toEqual({
        characterId: 'char-1', turn: 6, cashImpact: -800,
        description: 'Conta: Mercadinho — Pago (-R$ 800) com o Cupom do Mercadinho',
      })
      expect(args.data.description.startsWith('Conta: Mercadinho')).toBe(true)
    })

    it('guarda no cupom o desconto real, na mesma transação do pagamento', async () => {
      setup({ unlockedSkills: [ORG] })
      prismaMock.characterCoupon.findFirst.mockResolvedValue(claimedCoupon)
      prismaMock.characterEventLog.findFirst.mockResolvedValue(null)

      const res = await pay('food')

      expect(res.body.amount).toBe(680)
      expect(prismaMock.characterCoupon.update).toHaveBeenCalledWith({ where: { id: 'cup-b' }, data: { value: 170 } })
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
      expect(prismaMock.$transaction.mock.calls[0][0]).toHaveLength(3)
    })

    it('em centavos: Mercadinho de R$ 333,33 com cupom cobra R$ 266,66', async () => {
      setup({ foodCost: '333.33' })
      prismaMock.characterCoupon.findFirst.mockResolvedValue(claimedCoupon)
      prismaMock.characterEventLog.findFirst.mockResolvedValue(null)

      const res = await pay('food')
      expect(res.body).toMatchObject({ amount: 266.66, cashAfter: 4733.34 })
      expect(prismaMock.characterCoupon.update).toHaveBeenCalledWith({ where: { id: 'cup-b' }, data: { value: 66.67 } })
    })

    it('sem cupom: cobra o valor normal e não mexe em cupom', async () => {
      setup()
      prismaMock.characterCoupon.findFirst.mockResolvedValue(null)
      prismaMock.characterEventLog.findFirst.mockResolvedValue(null)

      const res = await pay('food')
      expect(res.body).toEqual({ label: 'Mercadinho', amount: 1000, cashAfter: 4000 })
      expect(prismaMock.characterCoupon.update).not.toHaveBeenCalled()
      expect(prismaMock.$transaction.mock.calls[0][0]).toHaveLength(2)
    })

    it('outras contas nem procuram cupom', async () => {
      setup()
      prismaMock.characterEventLog.findFirst.mockResolvedValue(null)

      const res = await pay('utilities')
      expect(res.body.amount).toBe(250)
      expect(prismaMock.characterCoupon.findFirst).not.toHaveBeenCalled()
    })

    it('fluxo completo: resgata com a conta aberta, paga, e o total economizado é 20%', async () => {
      // resgate
      setup()
      prismaMock.characterCoupon.findMany.mockResolvedValue(PLAN)
      prismaMock.characterEventLog.findFirst.mockResolvedValue(null)
      const claimRes = await claim(6)
      expect(claimRes.body.reward.amount).toBe(200)

      // pagamento
      prismaMock.characterCoupon.findFirst.mockResolvedValue(claimedCoupon)
      const payRes = await pay('food')
      expect(payRes.body.amount).toBe(800)
      expect(cents(claimRes.body.reward.amount + payRes.body.amount)).toBe(1000)
    })
  })
})

describe('o último cupom sempre cai num mês jogável', () => {
  it('nunca sorteia o mês 12, que não chega a ser jogado', () => {
    for (let i = 0; i < 500; i++) {
      const plan = planCoupons()
      expect(Math.max(...plan.map(c => c.turn))).toBeLessThanOrEqual(11)
    }
  })
})
