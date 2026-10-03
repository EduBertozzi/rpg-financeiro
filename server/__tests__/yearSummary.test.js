// __tests__/yearSummary.test.js — GET /api/v1/characters/:id/year-summary
process.env.JWT_SECRET = 'test-secret'

const request = require('supertest')
const app = require('../src/app')
const { prismaMock } = require('@prisma/client')
const { makeToken, authHeader } = require('./helpers/auth')
const { BILL_LABELS } = require('../src/utils/badges')

const TOKEN = makeToken({ id: 'user-1' })

beforeEach(() => {
  jest.clearAllMocks()
  for (const model of ['character', 'assetPrice']) {
    for (const fn of Object.values(prismaMock[model])) fn.mockReset()
  }
})

const snaps = (pairs) => pairs.map(([turn, netWorth, cash = netWorth]) => ({ turn, netWorth, cash }))

const makeSelf = (overrides = {}) => ({
  id: 'char-1',
  userId: 'user-1',
  roomId: 'room-1',
  name: 'Dudu',
  avatarId: 3,
  cash: 2000,
  overdraftDebt: 0,
  loanDebt: 0,
  housingCost: 1500,
  foodCost: 1000,
  utilitiesCost: 250,
  transportCost: 250,
  room: { id: 'room-1', currentTurn: 4, status: 'active' },
  snapshots: snaps([[2, 7000], [3, 8000]]),
  eventLog: [],
  fixedInvestments: [],
  debentures: [],
  positions: [],
  trades: [],
  unlockedSkills: [],
  coupons: [],
  ...overrides,
})

// como o findMany da sala devolve cada personagem
const roomRow = (c) => ({
  id: c.id, name: c.name, avatarId: c.avatarId, cash: c.cash, overdraftDebt: c.overdraftDebt ?? 0, loanDebt: c.loanDebt ?? 0,
  snapshots: c.snapshots ?? [],
  fixedInvestments: (c.fixedInvestments ?? []).filter(i => i.redeemedAt == null),
  debentures: (c.debentures ?? []).filter(d => d.status === 'active'),
  positions: c.positions ?? [],
})

const OTHER = { id: 'char-2', name: 'Ana', avatarId: 5, cash: 5000, snapshots: snaps([[2, 3000], [3, 6000]]) }
const THIRD = { id: 'char-3', name: 'Caio', avatarId: 2, cash: 1000, snapshots: snaps([[3, 1000]]) }

const setup = (self = makeSelf(), others = [OTHER, THIRD], prices = []) => {
  prismaMock.character.findUnique.mockResolvedValue(self)
  prismaMock.character.findMany.mockResolvedValue([roomRow(self), ...others.map(roomRow)])
  prismaMock.assetPrice.findMany.mockResolvedValue(prices)
}

const summary = (id = 'char-1') => request(app).get(`/api/v1/characters/${id}/year-summary`).set(authHeader(TOKEN))

describe('GET /api/v1/characters/:id/year-summary — acesso', () => {
  it('404 para personagem inexistente', async () => {
    prismaMock.character.findUnique.mockResolvedValue(null)
    const res = await summary('naoexiste')
    expect(res.status).toBe(404)
    expect(prismaMock.character.findMany).not.toHaveBeenCalled()
  })

  it('403 para personagem de outro usuário (sem carregar a sala)', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeSelf({ userId: 'outro' }))
    const res = await summary()
    expect(res.status).toBe(403)
    expect(prismaMock.character.findMany).not.toHaveBeenCalled()
  })

  it('401 sem token', async () => {
    const res = await request(app).get('/api/v1/characters/char-1/year-summary')
    expect(res.status).toBe(401)
  })

  it('500 se o banco falhar', async () => {
    prismaMock.character.findUnique.mockRejectedValue(new Error('boom'))
    const res = await summary()
    expect(res.status).toBe(500)
  })
})

describe('GET /api/v1/characters/:id/year-summary — resposta', () => {
  it('tem todas as partes do contrato', async () => {
    setup()
    const res = await summary()
    expect(res.status).toBe(200)
    expect(Object.keys(res.body).sort()).toEqual(['badges', 'breakdown', 'months', 'players', 'rank', 'roomAverage'])
  })

  it('carrega o personagem com tudo que as conquistas usam', async () => {
    setup()
    await summary()
    const { include } = prismaMock.character.findUnique.mock.calls[0][0]
    expect(Object.keys(include).sort()).toEqual([
      'coupons', 'debentures', 'eventLog', 'fixedInvestments', 'positions', 'room', 'snapshots', 'trades', 'unlockedSkills',
    ])
    expect(include.fixedInvestments).toBe(true) // inclusive as resgatadas
  })

  it('carrega a sala e os preços só até o mês atual', async () => {
    setup()
    await summary()
    expect(prismaMock.character.findMany.mock.calls[0][0].where).toEqual({ roomId: 'room-1' })
    expect(prismaMock.assetPrice.findMany).toHaveBeenCalledWith({ where: { roomId: 'room-1', turn: { lte: 4 } } })
  })

  it('months: patrimônio do personagem mês a mês, em ordem', async () => {
    setup(makeSelf({ snapshots: snaps([[3, '8000.50'], [2, 7000]]) }))
    const res = await summary()
    expect(res.body.months).toEqual([{ turn: 2, netWorth: 7000 }, { turn: 3, netWorth: 8000.5 }])
  })

  it('roomAverage: média da sala por mês, sem contar quem não tem o mês', async () => {
    setup()
    const res = await summary()
    // mês 2: (7000 + 3000) / 2; mês 3: (8000 + 6000 + 1000) / 3
    expect(res.body.roomAverage).toEqual([{ turn: 2, netWorth: 5000 }, { turn: 3, netWorth: 5000 }])
  })

  it('roomAverage em centavos', async () => {
    setup(makeSelf({ snapshots: snaps([[2, 100]]) }), [
      { ...OTHER, snapshots: snaps([[2, 100]]) },
      { ...THIRD, snapshots: snaps([[2, 100.01]]) },
    ])
    const res = await summary()
    expect(res.body.roomAverage).toEqual([{ turn: 2, netWorth: 100 }])
  })

  it('breakdown: patrimônio atual com caixinhas abertas, debêntures ativas e ações no último preço', async () => {
    setup(makeSelf({
      cash: '1234.56',
      fixedInvestments: [
        { type: 'POUPANCA', amount: '3000.10', redeemedAt: null },
        { type: 'CDB', amount: 999, redeemedAt: 2 },
      ],
      debentures: [{ amount: 2000, status: 'active' }, { amount: 500, status: 'paid' }],
      positions: [{ assetId: 1, quantity: 10, avgPrice: 20, asset: { basePrice: 20 } }],
    }), [OTHER], [
      { assetId: 1, turn: 3, price: '22.00' },
      { assetId: 1, turn: 4, price: '25.55' },
    ])
    const res = await summary()
    expect(res.body.breakdown).toEqual({
      cash: 1234.56, fixedIncome: 3000.1, debentures: 2000, stocks: 255.5, debts: 0, netWorth: 6490.16,
    })
  })

  it('breakdown: saldo negativo vira dívida', async () => {
    setup(makeSelf({ cash: -500.5, loanDebt: 100 }), [])
    const res = await summary()
    expect(res.body.breakdown).toMatchObject({ cash: 0, debts: 600.5, netWorth: -600.5 })
  })

  it('players: ranking da sala pelo patrimônio atual, com o próprio marcado', async () => {
    setup()
    const res = await summary()
    expect(res.body.players).toEqual([
      { characterId: 'char-2', name: 'Ana', avatarId: 5, netWorth: 5000, rank: 1, isSelf: false },
      { characterId: 'char-1', name: 'Dudu', avatarId: 3, netWorth: 2000, rank: 2, isSelf: true },
      { characterId: 'char-3', name: 'Caio', avatarId: 2, netWorth: 1000, rank: 3, isSelf: false },
    ])
    expect(res.body.rank).toBe(2)
  })

  it('o patrimônio do próprio no ranking é o mesmo do breakdown', async () => {
    setup(makeSelf({ positions: [{ assetId: 1, quantity: 100, asset: { basePrice: 10 } }] }), [OTHER], [{ assetId: 1, turn: 4, price: 40 }])
    const res = await summary()
    const self = res.body.players.find(p => p.isSelf)
    expect(self.netWorth).toBe(res.body.breakdown.netWorth)
    expect(self.netWorth).toBe(6000)
    expect(res.body.rank).toBe(1)
  })

  it('ações dos outros também entram no ranking', async () => {
    setup(makeSelf(), [{ ...OTHER, cash: 0, positions: [{ assetId: 1, quantity: 10, asset: { basePrice: 1 } }] }], [{ assetId: 1, turn: 2, price: 500 }])
    const res = await summary()
    expect(res.body.players[0]).toMatchObject({ characterId: 'char-2', netWorth: 5000 })
  })

  it('empate: mesma posição', async () => {
    setup(makeSelf({ cash: 5000 }), [OTHER, THIRD])
    const res = await summary()
    expect(res.body.rank).toBe(1)
    expect(res.body.players.map(p => p.rank)).toEqual([1, 1, 3])
    expect(res.body.players.map(p => p.name)).toEqual(['Ana', 'Dudu', 'Caio'])
  })

  it('se a lista da sala vier sem o personagem, ele entra assim mesmo', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeSelf())
    prismaMock.character.findMany.mockResolvedValue([roomRow(OTHER)])
    prismaMock.assetPrice.findMany.mockResolvedValue([])
    const res = await summary()
    expect(res.body.players).toHaveLength(2)
    expect(res.body.rank).toBe(2)
  })

  it('sala sem nenhum mês fechado: listas vazias, sem quebrar', async () => {
    setup(makeSelf({ snapshots: [], room: { currentTurn: 1, status: 'active' } }), [{ ...OTHER, snapshots: [] }])
    const res = await summary()
    expect(res.status).toBe(200)
    expect(res.body.months).toEqual([])
    expect(res.body.roomAverage).toEqual([])
  })
})

describe('GET /api/v1/characters/:id/year-summary — conquistas', () => {
  const earned = (res) => res.body.badges.filter(b => b.earned).map(b => b.id)
  const paidAll = (turns) => turns.flatMap((turn) =>
    BILL_LABELS.map((label) => ({ turn, cashImpact: -100, description: `Conta: ${label} — Pago (-R$ 100)` })))

  it('devolve as 6 conquistas com { id, title, description, earned }', async () => {
    setup()
    const res = await summary()
    expect(res.body.badges).toHaveLength(6)
    for (const b of res.body.badges) expect(Object.keys(b).sort()).toEqual(['description', 'earned', 'id', 'title'])
  })

  it('jogador básico: só Nunca no vermelho', async () => {
    setup()
    const res = await summary()
    expect(earned(res)).toEqual(['never_overdraft'])
  })

  it('cheque especial no extrato derruba Nunca no vermelho', async () => {
    setup(makeSelf({ eventLog: [{ turn: 3, description: 'Cheque especial: Juros de 8% sobre R$ 10.00 (-R$ 0.80)' }] }))
    const res = await summary()
    expect(earned(res)).not.toContain('never_overdraft')
  })

  it('mês fechado no negativo derruba Nunca no vermelho', async () => {
    setup(makeSelf({ snapshots: snaps([[2, -10, -10]]) }))
    const res = await summary()
    expect(earned(res)).not.toContain('never_overdraft')
  })

  it('Reserva completa com 3× as contas fixas do personagem', async () => {
    setup(makeSelf({ fixedInvestments: [{ type: 'POUPANCA', amount: 9000, redeemedAt: null }] }))
    expect(earned(await summary())).toContain('reserve_complete')
  })

  it('Reserva completa usa as contas do próprio personagem (Mão de Vaca: 8.100)', async () => {
    setup(makeSelf({
      housingCost: 1350, foodCost: 900, utilitiesCost: 225, transportCost: 225,
      fixedInvestments: [{ type: 'POUPANCA', amount: 8100, redeemedAt: null }],
    }))
    expect(earned(await summary())).toContain('reserve_complete')
  })

  it('Caçador de cupons com os 3 cupons resgatados', async () => {
    const claimedAt = new Date().toISOString()
    setup(makeSelf({ coupons: [{ claimedAt }, { claimedAt }, { claimedAt }] }))
    expect(earned(await summary())).toContain('coupon_hunter')
  })

  it('Constelação acesa com 5 habilidades', async () => {
    setup(makeSelf({ unlockedSkills: [1, 2, 3, 4, 5].map(skillNodeId => ({ skillNodeId })) }))
    expect(earned(await summary())).toContain('constellation')
  })

  it('Investidor conta caixinhas resgatadas, debênture e ações', async () => {
    setup(makeSelf({
      fixedInvestments: [{ type: 'CDB', amount: 1, redeemedAt: 3 }, { type: 'LCI', amount: 1, redeemedAt: null }],
      debentures: [{ amount: 1, status: 'paid' }],
      trades: [{ id: 't1' }],
    }))
    expect(earned(await summary())).toContain('investor')
  })

  it('Contas em dia com tudo pago nos meses fechados (1 a 3)', async () => {
    setup(makeSelf({ eventLog: paidAll([1, 2, 3]) }))
    expect(earned(await summary())).toContain('bills_on_time')
  })

  it('faltou uma conta: sem Contas em dia', async () => {
    setup(makeSelf({ eventLog: paidAll([1, 2, 3]).slice(1) }))
    expect(earned(await summary())).not.toContain('bills_on_time')
  })
})
