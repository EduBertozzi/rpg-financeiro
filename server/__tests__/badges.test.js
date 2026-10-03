// __tests__/badges.test.js — regras puras das conquistas e contas do resumo do ano
const {
  BADGES, BILL_LABELS, RESERVE_MONTHS,
  neverOverdraft, monthlyBillsOf, emergencyReserveOf, reserveComplete, couponHunter, constellation,
  investmentTypesOf, investor, finishedTurns, billsOnTime, evaluateBadges,
} = require('../src/utils/badges')
const { latestPrices, stocksValueOf, breakdownOf, monthsOf, roomAverageOf, rankPlayers } = require('../src/utils/yearSummary')
const { cents } = require('../src/utils/finance')

// ─── conquistas ──────────────────────────────────────────────────────────────

describe('BADGES', () => {
  it('6 conquistas, na ordem oficial', () => {
    expect(BADGES.map(b => b.id)).toEqual([
      'never_overdraft', 'reserve_complete', 'coupon_hunter', 'constellation', 'investor', 'bills_on_time',
    ])
  })
  it('títulos oficiais', () => {
    expect(BADGES.map(b => b.title)).toEqual([
      'Nunca no vermelho', 'Reserva completa', 'Caçador de cupons', 'Constelação acesa', 'Investidor', 'Contas em dia',
    ])
  })
  it('todas têm descrição', () => {
    for (const b of BADGES) expect(b.description.length).toBeGreaterThan(10)
  })
})

describe('neverOverdraft — Nunca no vermelho', () => {
  it('sem dados: ganha', () => expect(neverOverdraft()).toBe(true))
  it('todos os meses positivos: ganha', () => {
    expect(neverOverdraft({ snapshots: [{ cash: 100 }, { cash: '2500.00' }], eventLog: [], cash: 10 })).toBe(true)
  })
  it('saldo exatamente zero não é vermelho', () => {
    expect(neverOverdraft({ snapshots: [{ cash: 0 }], cash: 0 })).toBe(true)
  })
  it('um mês fechado no negativo: perde', () => {
    expect(neverOverdraft({ snapshots: [{ cash: 100 }, { cash: -0.01 }] })).toBe(false)
  })
  it('saldo negativo em Decimal (texto): perde', () => {
    expect(neverOverdraft({ snapshots: [{ cash: '-15.50' }] })).toBe(false)
  })
  it('juros de cheque especial no extrato: perde (mesmo que a foto do mês esteja positiva)', () => {
    expect(neverOverdraft({
      snapshots: [{ cash: 500 }],
      eventLog: [{ description: 'Cheque especial: Juros de 8% sobre R$ 100.00 (-R$ 8.00)' }],
    })).toBe(false)
  })
  it('só "Cheque especial" no começo da linha conta', () => {
    expect(neverOverdraft({ eventLog: [{ description: 'Dica: evite o Cheque especial' }] })).toBe(true)
  })
  it('saldo atual negativo: perde', () => {
    expect(neverOverdraft({ snapshots: [{ cash: 100 }], cash: -1 })).toBe(false)
  })
  it('linha sem descrição não quebra', () => {
    expect(neverOverdraft({ eventLog: [{}, { description: null }] })).toBe(true)
  })
})

describe('monthlyBillsOf / emergencyReserveOf', () => {
  it('soma aluguel, mercado, água e luz e internet', () => {
    expect(monthlyBillsOf({ housingCost: 1500, foodCost: 1000, utilitiesCost: 250, transportCost: 250 })).toBe(3000)
  })
  it('Mão de Vaca: R$ 2.700', () => {
    expect(monthlyBillsOf({ housingCost: '1350', foodCost: '900', utilitiesCost: '225', transportCost: '225' })).toBe(2700)
  })
  it('sem campos: zero', () => expect(monthlyBillsOf({})).toBe(0))
  it('reserva soma só POUPANCA ainda aberta', () => {
    expect(emergencyReserveOf([
      { type: 'POUPANCA', amount: 1000.1, redeemedAt: null },
      { type: 'POUPANCA', amount: '2000.2' },
      { type: 'POUPANCA', amount: 5000, redeemedAt: 4 },
      { type: 'CDB', amount: 9000, redeemedAt: null },
    ])).toBe(3000.3)
  })
})

describe('reserveComplete — Reserva completa', () => {
  const poupanca = (amount, extra = {}) => ({ type: 'POUPANCA', amount, redeemedAt: null, ...extra })

  it('3 meses de contas são o mínimo oficial', () => expect(RESERVE_MONTHS).toBe(3))
  it('exatamente 3× as contas: ganha', () => {
    expect(reserveComplete({ fixedInvestments: [poupanca(9000)], monthlyBills: 3000 })).toBe(true)
  })
  it('um centavo a menos: perde', () => {
    expect(reserveComplete({ fixedInvestments: [poupanca(8999.99)], monthlyBills: 3000 })).toBe(false)
  })
  it('soma várias caixinhas de reserva', () => {
    expect(reserveComplete({ fixedInvestments: [poupanca(4500), poupanca('4500')], monthlyBills: 3000 })).toBe(true)
  })
  it('reserva resgatada não conta', () => {
    expect(reserveComplete({ fixedInvestments: [poupanca(9000, { redeemedAt: 11 })], monthlyBills: 3000 })).toBe(false)
  })
  it('outros investimentos não contam como reserva', () => {
    expect(reserveComplete({
      fixedInvestments: [{ type: 'CDB', amount: 50000, redeemedAt: null }, poupanca(100)],
      monthlyBills: 3000,
    })).toBe(false)
  })
  it('sem reserva nenhuma: perde (mesmo com contas zeradas)', () => {
    expect(reserveComplete({ fixedInvestments: [], monthlyBills: 0 })).toBe(false)
  })
  it('juros quebrados: 8100,004 cobre 3 × 2700', () => {
    expect(reserveComplete({ fixedInvestments: [poupanca(8100.004)], monthlyBills: 2700 })).toBe(true)
  })
  it('sem dados: perde', () => expect(reserveComplete()).toBe(false))
})

describe('couponHunter — Caçador de cupons', () => {
  const claimed = { claimedAt: new Date() }
  const open = { claimedAt: null }
  it('3 resgatados: ganha', () => expect(couponHunter({ coupons: [claimed, claimed, claimed] })).toBe(true))
  it('2 de 3: perde', () => expect(couponHunter({ coupons: [claimed, claimed, open] })).toBe(false))
  it('nenhum: perde', () => expect(couponHunter({ coupons: [open, open, open] })).toBe(false))
  it('sem plano: perde', () => expect(couponHunter({ coupons: [] })).toBe(false))
  it('sem dados: perde', () => expect(couponHunter()).toBe(false))
  it('claimedAt undefined conta como não resgatado', () => {
    expect(couponHunter({ coupons: [claimed, claimed, {}] })).toBe(false)
  })
})

describe('constellation — Constelação acesa', () => {
  const skills = (n) => Array.from({ length: n }, (_, i) => ({ skillNodeId: i + 1 }))
  it('5 habilidades: ganha', () => expect(constellation({ unlockedSkills: skills(5) })).toBe(true))
  it('12 habilidades: ganha', () => expect(constellation({ unlockedSkills: skills(12) })).toBe(true))
  it('4 habilidades: perde', () => expect(constellation({ unlockedSkills: skills(4) })).toBe(false))
  it('nenhuma: perde', () => expect(constellation({ unlockedSkills: [] })).toBe(false))
  it('sem dados: perde', () => expect(constellation()).toBe(false))
})

describe('investmentTypesOf / investor — Investidor', () => {
  const fixed = (...types) => types.map((type, i) => ({ id: `f${i}`, type, redeemedAt: null }))

  it('conta cada tipo de caixinha uma vez só', () => {
    expect(investmentTypesOf({ fixedInvestments: fixed('CDB', 'CDB', 'LCI') })).toEqual(['CDB', 'LCI'])
  })
  it('caixinhas resgatadas também contam', () => {
    expect(investmentTypesOf({ fixedInvestments: [{ type: 'TESOURO_PRE', redeemedAt: 5 }] })).toEqual(['TESOURO_PRE'])
  })
  it('debênture conta (inclusive paga ou calote)', () => {
    expect(investmentTypesOf({ debentures: [{ status: 'defaulted' }] })).toEqual(['DEBENTURE'])
  })
  it('ações contam pela posição atual', () => {
    expect(investmentTypesOf({ positions: [{ quantity: 1 }] })).toEqual(['STOCKS'])
  })
  it('ações contam pelo histórico de negociações (vendeu tudo)', () => {
    expect(investmentTypesOf({ trades: [{ id: 't1' }] })).toEqual(['STOCKS'])
  })
  it('ações contam pela linha "Ações:" do extrato', () => {
    expect(investmentTypesOf({ eventLog: [{ description: 'Ações: Venda de 10 VALE3 (Vale)' }] })).toEqual(['STOCKS'])
  })
  it('ações contam uma vez só, mesmo com posição, negociação e extrato', () => {
    expect(investmentTypesOf({
      positions: [{}], trades: [{}], eventLog: [{ description: 'Ações: Compra de 1 PETR4 (Petrobras)' }],
    })).toEqual(['STOCKS'])
  })
  it('extrato de outra coisa não conta como ações', () => {
    expect(investmentTypesOf({ eventLog: [{ description: 'Caixinha: Guardado em CDB' }] })).toEqual([])
  })

  it('4 tipos de caixinha: ganha', () => {
    expect(investor({ fixedInvestments: fixed('POUPANCA', 'CDB', 'LCI', 'LCA') })).toBe(true)
  })
  it('3 tipos: perde', () => {
    expect(investor({ fixedInvestments: fixed('POUPANCA', 'CDB', 'CDB', 'LCI') })).toBe(false)
  })
  it('2 caixinhas + debênture + ações: ganha', () => {
    expect(investor({ fixedInvestments: fixed('POUPANCA', 'CDB'), debentures: [{}], trades: [{}] })).toBe(true)
  })
  it('3 caixinhas + debênture: ganha', () => {
    expect(investor({ fixedInvestments: fixed('POUPANCA', 'CDB', 'TESOURO_SELIC'), debentures: [{}] })).toBe(true)
  })
  it('1 caixinha + debênture + ações: perde (3 tipos)', () => {
    expect(investor({ fixedInvestments: fixed('POUPANCA'), debentures: [{}, {}], positions: [{}] })).toBe(false)
  })
  it('sem dados: perde', () => expect(investor()).toBe(false))
})

describe('finishedTurns', () => {
  it('mês 1 ainda não fechou nada', () => expect(finishedTurns(1)).toEqual([]))
  it('mês 0 (sala esperando): nada', () => expect(finishedTurns(0)).toEqual([]))
  it('no mês 4, já fecharam 1, 2 e 3', () => expect(finishedTurns(4)).toEqual([1, 2, 3]))
  it('fim de jogo (12): meses 1 a 11', () => expect(finishedTurns(12)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]))
})

describe('billsOnTime — Contas em dia', () => {
  const paidAll = (turns) => turns.flatMap((turn) =>
    BILL_LABELS.map((label) => ({ turn, description: `Conta: ${label} — Pago (-R$ 100)` })))

  it('as 3 contas oficiais', () => expect(BILL_LABELS).toEqual(['Mercadinho', 'Água e Luz', 'Internet e Celular']))
  it('todas as contas de todos os meses fechados: ganha', () => {
    expect(billsOnTime({ eventLog: paidAll([1, 2, 3]), currentTurn: 4 })).toBe(true)
  })
  it('o mês atual (aberto) não precisa estar pago', () => {
    expect(billsOnTime({ eventLog: paidAll([1, 2]), currentTurn: 3 })).toBe(true)
  })
  it('faltou uma conta num mês: perde', () => {
    const log = paidAll([1, 2, 3]).filter((e) => !(e.turn === 2 && e.description.startsWith('Conta: Água e Luz')))
    expect(billsOnTime({ eventLog: log, currentTurn: 4 })).toBe(false)
  })
  it('faltou um mês inteiro: perde', () => {
    expect(billsOnTime({ eventLog: paidAll([1, 3]), currentTurn: 4 })).toBe(false)
  })
  it('conta paga no mês errado não cobre o mês que faltou', () => {
    const log = [...paidAll([1]), ...paidAll([3]), ...paidAll([3])]
    expect(billsOnTime({ eventLog: log, currentTurn: 3 })).toBe(false)
  })
  it('conta paga com cupom também vale', () => {
    const log = paidAll([1]).map((e) => e.description.includes('Mercadinho')
      ? { ...e, description: `${e.description} com o Cupom do Mercadinho` } : e)
    expect(billsOnTime({ eventLog: log, currentTurn: 2 })).toBe(true)
  })
  it('linha de cupom do Mercadinho não conta como conta paga', () => {
    const log = paidAll([1]).map((e) => e.description.startsWith('Conta: Mercadinho')
      ? { ...e, description: 'Cupom: Desconto no Mercadinho (+R$ 200.00 de volta da conta paga)' } : e)
    expect(billsOnTime({ eventLog: log, currentTurn: 2 })).toBe(false)
  })
  it('turno do extrato em texto também funciona', () => {
    const log = paidAll([1]).map((e) => ({ ...e, turn: '1' }))
    expect(billsOnTime({ eventLog: log, currentTurn: 2 })).toBe(true)
  })
  it('nenhum mês fechado ainda: não ganha', () => {
    expect(billsOnTime({ eventLog: paidAll([1]), currentTurn: 1 })).toBe(false)
  })
  it('fim de jogo: precisa dos meses 1 a 11', () => {
    expect(billsOnTime({ eventLog: paidAll([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]), currentTurn: 12 })).toBe(true)
    expect(billsOnTime({ eventLog: paidAll([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), currentTurn: 12 })).toBe(false)
  })
  it('sem dados: perde', () => expect(billsOnTime()).toBe(false))
})

describe('evaluateBadges', () => {
  it('sem dados: só Nunca no vermelho', () => {
    const result = evaluateBadges({})
    expect(result).toHaveLength(6)
    expect(result.filter(b => b.earned).map(b => b.id)).toEqual(['never_overdraft'])
  })
  it('formato { id, title, description, earned } sem a regra', () => {
    for (const b of evaluateBadges()) expect(Object.keys(b).sort()).toEqual(['description', 'earned', 'id', 'title'])
  })
  it('jogador completo ganha todas', () => {
    const claimed = { claimedAt: new Date() }
    const log = [1, 2, 3].flatMap((turn) => BILL_LABELS.map((label) => ({ turn, description: `Conta: ${label} — Pago` })))
    const result = evaluateBadges({
      snapshots: [{ cash: 10 }],
      eventLog: log,
      cash: 10,
      fixedInvestments: [
        { type: 'POUPANCA', amount: 9000, redeemedAt: null },
        { type: 'CDB', amount: 1, redeemedAt: 2 },
        { type: 'LCI', amount: 1, redeemedAt: null },
      ],
      monthlyBills: 3000,
      coupons: [claimed, claimed, claimed],
      unlockedSkills: [{}, {}, {}, {}, {}],
      debentures: [{}],
      positions: [],
      trades: [],
      currentTurn: 4,
    })
    expect(result.every(b => b.earned)).toBe(true)
  })
})

// ─── contas do resumo do ano ─────────────────────────────────────────────────

describe('latestPrices', () => {
  it('fica com o preço do mês mais recente de cada ação', () => {
    expect(latestPrices([
      { assetId: 1, turn: 2, price: '10.00' },
      { assetId: 1, turn: 5, price: '12.50' },
      { assetId: 1, turn: 3, price: '11.00' },
      { assetId: 2, turn: 1, price: 30 },
    ])).toEqual({ 1: 12.5, 2: 30 })
  })
  it('sem preços: vazio', () => expect(latestPrices([])).toEqual({}))
})

describe('stocksValueOf', () => {
  it('quantidade × último preço', () => {
    expect(stocksValueOf([{ assetId: 1, quantity: 10 }, { assetId: 2, quantity: 3 }], { 1: 12.5, 2: 33.33 })).toBe(224.99)
  })
  it('sem cotação na sala: usa o preço base do ativo', () => {
    expect(stocksValueOf([{ assetId: 9, quantity: 4, asset: { basePrice: '25.10' } }], {})).toBe(100.4)
  })
  it('sem cotação nem ativo: usa o preço médio', () => {
    expect(stocksValueOf([{ assetId: 9, quantity: 2, avgPrice: 7.5 }], {})).toBe(15)
  })
  it('sem ações: zero', () => expect(stocksValueOf([], {})).toBe(0))
})

describe('breakdownOf', () => {
  const base = { cash: 1000, overdraftDebt: 0, loanDebt: 0, fixedInvestments: [], debentures: [], positions: [] }

  it('só dinheiro', () => {
    expect(breakdownOf(base)).toEqual({ cash: 1000, fixedIncome: 0, debentures: 0, stocks: 0, debts: 0, netWorth: 1000 })
  })
  it('soma caixinhas abertas, debêntures ativas e ações', () => {
    const b = breakdownOf({
      ...base,
      cash: '1500.55',
      fixedInvestments: [{ amount: '2000.10' }, { amount: 999.99, redeemedAt: null }, { amount: 5000, redeemedAt: 3 }],
      debentures: [{ amount: 3000, status: 'active' }, { amount: 7000, status: 'paid' }, { amount: 1000, status: 'defaulted' }],
      positions: [{ assetId: 1, quantity: 10 }],
    }, { 1: 20.05 })
    expect(b).toEqual({ cash: 1500.55, fixedIncome: 3000.09, debentures: 3000, stocks: 200.5, debts: 0, netWorth: 7701.14 })
  })
  it('saldo negativo vira dívida e o caixa fica zero', () => {
    expect(breakdownOf({ ...base, cash: -350.4, fixedInvestments: [{ amount: 1000 }] }))
      .toEqual({ cash: 0, fixedIncome: 1000, debentures: 0, stocks: 0, debts: 350.4, netWorth: 649.6 })
  })
  it('dívidas: saldo negativo + cheque especial antigo + empréstimo', () => {
    const b = breakdownOf({ ...base, cash: -100, overdraftDebt: '200.25', loanDebt: 300 })
    expect(b.debts).toBe(600.25)
    expect(b.netWorth).toBe(-600.25)
  })
  it('caixa + caixinhas + debêntures + ações - dívidas = patrimônio, sempre', () => {
    for (let i = 0; i < 300; i++) {
      const b = breakdownOf({
        cash: cents((Math.random() - 0.4) * 10000),
        overdraftDebt: cents(Math.random() * 100),
        loanDebt: cents(Math.random() * 100),
        fixedInvestments: [{ amount: cents(Math.random() * 5000) }],
        debentures: [{ amount: cents(Math.random() * 5000), status: 'active' }],
        positions: [{ assetId: 1, quantity: Math.floor(Math.random() * 50) }],
      }, { 1: cents(Math.random() * 100) })
      expect(cents(b.cash + b.fixedIncome + b.debentures + b.stocks - b.debts)).toBeCloseTo(b.netWorth, 2)
    }
  })
  it('sem listas incluídas não quebra', () => {
    expect(breakdownOf({ cash: 10 }).netWorth).toBe(10)
  })
})

describe('monthsOf', () => {
  it('ordena por mês e arredonda em centavos', () => {
    expect(monthsOf([
      { turn: 3, netWorth: '3000.005' },
      { turn: 2, netWorth: 2000 },
    ])).toEqual([{ turn: 2, netWorth: 2000 }, { turn: 3, netWorth: 3000.01 }])
  })
  it('não mexe na lista original', () => {
    const list = [{ turn: 3, netWorth: 1 }, { turn: 2, netWorth: 1 }]
    monthsOf(list)
    expect(list[0].turn).toBe(3)
  })
  it('sem fotos: vazio', () => expect(monthsOf([])).toEqual([]))
})

describe('roomAverageOf', () => {
  it('média de todos por mês', () => {
    expect(roomAverageOf([
      [{ turn: 2, netWorth: 1000 }, { turn: 3, netWorth: 2000 }],
      [{ turn: 2, netWorth: 3000 }, { turn: 3, netWorth: '4000' }],
    ])).toEqual([{ turn: 2, netWorth: 2000 }, { turn: 3, netWorth: 3000 }])
  })
  it('quem não tem o mês fica fora da média daquele mês', () => {
    expect(roomAverageOf([
      [{ turn: 2, netWorth: 1000 }, { turn: 3, netWorth: 2000 }],
      [{ turn: 3, netWorth: 5000 }],
      [],
    ])).toEqual([{ turn: 2, netWorth: 1000 }, { turn: 3, netWorth: 3500 }])
  })
  it('média em centavos', () => {
    expect(roomAverageOf([[{ turn: 2, netWorth: 100 }], [{ turn: 2, netWorth: 100 }], [{ turn: 2, netWorth: 100.01 }]]))
      .toEqual([{ turn: 2, netWorth: 100 }])
    expect(roomAverageOf([[{ turn: 2, netWorth: 0.01 }], [{ turn: 2, netWorth: 0.02 }]]))
      .toEqual([{ turn: 2, netWorth: 0.02 }])
  })
  it('patrimônio negativo entra na média', () => {
    expect(roomAverageOf([[{ turn: 4, netWorth: -1000 }], [{ turn: 4, netWorth: 3000 }]])).toEqual([{ turn: 4, netWorth: 1000 }])
  })
  it('meses em ordem, mesmo vindo bagunçados', () => {
    expect(roomAverageOf([[{ turn: 5, netWorth: 1 }, { turn: 2, netWorth: 1 }]]).map(m => m.turn)).toEqual([2, 5])
  })
  it('sala sem fotos: vazio', () => expect(roomAverageOf([[], []])).toEqual([]))
  it('lista nula de um personagem não quebra', () => expect(roomAverageOf([null, [{ turn: 2, netWorth: 1 }]])).toEqual([{ turn: 2, netWorth: 1 }]))
})

describe('rankPlayers', () => {
  const p = (characterId, name, netWorth) => ({ characterId, name, avatarId: 1, netWorth })

  it('maior patrimônio primeiro', () => {
    const { players, rank } = rankPlayers([p('a', 'Ana', 100), p('b', 'Bia', 300), p('c', 'Caio', 200)], 'c')
    expect(players.map(x => x.characterId)).toEqual(['b', 'c', 'a'])
    expect(players.map(x => x.rank)).toEqual([1, 2, 3])
    expect(rank).toBe(2)
  })
  it('marca só o próprio personagem', () => {
    const { players } = rankPlayers([p('a', 'Ana', 100), p('b', 'Bia', 300)], 'a')
    expect(players.map(x => x.isSelf)).toEqual([false, true])
  })
  it('formato de cada jogador', () => {
    const { players } = rankPlayers([{ characterId: 'a', name: 'Ana', avatarId: 7, netWorth: '10.005', extra: 'x' }], 'a')
    expect(players[0]).toEqual({ characterId: 'a', name: 'Ana', avatarId: 7, netWorth: 10.01, rank: 1, isSelf: true })
  })
  it('empate divide a posição (1, 1, 3) e ordena por nome', () => {
    const { players, rank } = rankPlayers([p('z', 'Zeca', 500), p('a', 'Ana', 500), p('m', 'Mia', 100)], 'z')
    expect(players.map(x => x.name)).toEqual(['Ana', 'Zeca', 'Mia'])
    expect(players.map(x => x.rank)).toEqual([1, 1, 3])
    expect(rank).toBe(1)
  })
  it('empate no meio da tabela', () => {
    const { players, rank } = rankPlayers([p('a', 'A', 300), p('b', 'B', 200), p('c', 'C', 200), p('d', 'D', 100)], 'c')
    expect(players.map(x => x.rank)).toEqual([1, 2, 2, 4])
    expect(rank).toBe(2)
  })
  it('todos empatados: todos em 1º', () => {
    const { players } = rankPlayers([p('a', 'A', 0), p('b', 'B', 0), p('c', 'C', 0)], 'b')
    expect(players.every(x => x.rank === 1)).toBe(true)
  })
  it('empate decidido nos centavos (depois de arredondar)', () => {
    const { players } = rankPlayers([p('a', 'A', 100.004), p('b', 'B', 100.001)], 'a')
    expect(players.map(x => x.rank)).toEqual([1, 1])
  })
  it('acentos: ordem de nome em português', () => {
    const { players } = rankPlayers([p('2', 'Érica', 1), p('1', 'Eduardo', 1), p('3', 'Fábio', 1)], '1')
    expect(players.map(x => x.name)).toEqual(['Eduardo', 'Érica', 'Fábio'])
  })
  it('patrimônio negativo fica no fim', () => {
    const { players } = rankPlayers([p('a', 'A', -50), p('b', 'B', 0)], 'a')
    expect(players.map(x => x.characterId)).toEqual(['b', 'a'])
  })
  it('sozinho na sala: 1º', () => {
    expect(rankPlayers([p('a', 'A', -10)], 'a').rank).toBe(1)
  })
  it('personagem fora da lista: rank null', () => {
    expect(rankPlayers([p('a', 'A', 1)], 'x').rank).toBeNull()
  })
})
