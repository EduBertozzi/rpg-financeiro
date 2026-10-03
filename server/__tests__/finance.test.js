// __tests__/finance.test.js — matemática financeira pura (sem banco)
const {
  ANNUAL_RATES, SELIC_ANNUAL, cents, monthlyFromAnnual, getMonthlyRate, incomeTaxRate,
  monthlyReturn, principalOf, redemptionOf, planWithdrawal, debentureMaturity,
  debentureReturn, averagePrice, nextStockPrice,
} = require('../src/utils/finance')

// Simula o turnEngine: todo mês soma amount * monthlyRate em amount.
const grow = (amount, monthlyRate, months) => {
  let value = amount
  for (let m = 0; m < months; m++) value += monthlyReturn(value, monthlyRate)
  return value
}

// ─── taxas ────────────────────────────────────────────────────────────────────

describe('taxas anuais da tabela oficial', () => {
  it.each([
    ['POUPANCA', 0.065],
    ['CDB', 0.104 * 1.06],
    ['TESOURO_SELIC', 0.105 + 0.006],
    ['TESOURO_PRE', 0.135],
    ['LCI', 0.104 * 1.08],
    ['LCA', 0.105 + 0.026],
  ])('%s rende %f ao ano', (type, annual) => {
    expect(ANNUAL_RATES[type]).toBeCloseTo(annual, 10)
  })

  it('ordena os produtos do que rende menos para o que rende mais', () => {
    const order = ['POUPANCA', 'CDB', 'TESOURO_SELIC', 'LCI', 'LCA', 'TESOURO_PRE']
    const rates = order.map((t) => ANNUAL_RATES[t])
    expect([...rates].sort((a, b) => a - b)).toEqual(rates)
  })
})

describe('monthlyFromAnnual / getMonthlyRate', () => {
  it.each(Object.keys(ANNUAL_RATES))('12 meses de %s compostos dão a taxa anual', (type) => {
    expect(Math.pow(1 + getMonthlyRate(type), 12) - 1).toBeCloseTo(ANNUAL_RATES[type], 12)
  })

  it('taxa zero continua zero', () => {
    expect(monthlyFromAnnual(0)).toBe(0)
  })

  it('a taxa mensal é menor que um doze avos da anual (juros compostos)', () => {
    expect(monthlyFromAnnual(0.12)).toBeLessThan(0.01)
    expect(monthlyFromAnnual(0.12)).toBeCloseTo(0.009489, 6)
  })

  it('tipo desconhecido usa a Selic', () => {
    expect(getMonthlyRate('XYZ')).toBeCloseTo(monthlyFromAnnual(SELIC_ANNUAL), 12)
  })
})

// ─── IR ───────────────────────────────────────────────────────────────────────

describe('incomeTaxRate', () => {
  it('CDB paga 17,5% em qualquer prazo', () => {
    for (const months of [0, 1, 6, 12]) expect(incomeTaxRate('CDB', months)).toBe(0.175)
  })

  it.each(['TESOURO_SELIC', 'TESOURO_PRE'])('%s paga 22,5% antes de 6 meses e 15% a partir de 6', (type) => {
    for (const months of [0, 1, 5]) expect(incomeTaxRate(type, months)).toBe(0.225)
    for (const months of [6, 7, 12]) expect(incomeTaxRate(type, months)).toBe(0.15)
  })

  it.each(['POUPANCA', 'LCI', 'LCA'])('%s é isenta', (type) => {
    for (const months of [0, 3, 12]) expect(incomeTaxRate(type, months)).toBe(0)
  })
})

// ─── rendimento e valor aplicado ──────────────────────────────────────────────

describe('monthlyReturn', () => {
  it('é valor × taxa do mês', () => {
    expect(monthlyReturn(1000, 0.01)).toBe(10)
  })

  it('aceita valores que vêm do banco como texto (Decimal)', () => {
    expect(monthlyReturn('2500.50', '0.02')).toBeCloseTo(50.01, 10)
  })
})

describe('principalOf', () => {
  it('recupera o valor aplicado depois de meses de rendimento', () => {
    const rate = getMonthlyRate('CDB')
    const amount = grow(1000, rate, 5)
    expect(principalOf({ amount, monthlyRate: rate, investedAt: 2 }, 7)).toBeCloseTo(1000, 8)
  })

  it('no mês da aplicação é o próprio valor', () => {
    expect(principalOf({ amount: 750, monthlyRate: 0.01, investedAt: 4 }, 4)).toBe(750)
  })

  it('nunca desconta juros de meses negativos', () => {
    expect(principalOf({ amount: 750, monthlyRate: 0.01, investedAt: 4 }, 2)).toBe(750)
  })
})

// ─── resgate inteiro ──────────────────────────────────────────────────────────

describe('redemptionOf', () => {
  it('poupança devolve tudo, sem IR', () => {
    const rate = getMonthlyRate('POUPANCA')
    const amount = grow(1000, rate, 4)
    const r = redemptionOf({ type: 'POUPANCA', amount, monthlyRate: rate, investedAt: 1 }, 5)
    expect(r).toEqual({ gross: cents(amount), incomeTax: 0, net: cents(amount) })
  })

  it('CDB desconta 17,5% só do rendimento', () => {
    const rate = getMonthlyRate('CDB')
    const amount = grow(1000, rate, 3)
    const r = redemptionOf({ type: 'CDB', amount, monthlyRate: rate, investedAt: 1 }, 4)
    expect(r.incomeTax).toBeCloseTo((amount - 1000) * 0.175, 2)
    expect(r.net).toBeCloseTo(amount - (amount - 1000) * 0.175, 2)
  })

  it('Tesouro com 5 meses paga 22,5%; com 6 meses paga 15%', () => {
    const rate = getMonthlyRate('TESOURO_SELIC')
    const five = grow(1000, rate, 5)
    const six = grow(1000, rate, 6)
    expect(redemptionOf({ type: 'TESOURO_SELIC', amount: five, monthlyRate: rate, investedAt: 1 }, 6).incomeTax)
      .toBeCloseTo((five - 1000) * 0.225, 2)
    expect(redemptionOf({ type: 'TESOURO_SELIC', amount: six, monthlyRate: rate, investedAt: 1 }, 7).incomeTax)
      .toBeCloseTo((six - 1000) * 0.15, 2)
  })

  it('resgate no mesmo mês não tem rendimento nem IR', () => {
    expect(redemptionOf({ type: 'CDB', amount: 1000, monthlyRate: 0.01, investedAt: 3 }, 3))
      .toEqual({ gross: 1000, incomeTax: 0, net: 1000 })
  })

  it('líquido + IR = bruto', () => {
    const rate = getMonthlyRate('CDB')
    const amount = grow(3333.33, rate, 7)
    const r = redemptionOf({ type: 'CDB', amount, monthlyRate: rate, investedAt: 1 }, 8)
    expect(cents(r.net + r.incomeTax)).toBe(r.gross)
  })
})

// ─── resgate parcial de caixinha ──────────────────────────────────────────────

describe('planWithdrawal', () => {
  const rate = getMonthlyRate('CDB')
  const cdb = (id, principal, investedAt, turn) => ({ id, type: 'CDB', amount: grow(principal, rate, turn - investedAt), monthlyRate: rate, investedAt })

  it('recusa quando a caixinha não tem o valor', () => {
    const plan = planWithdrawal([cdb('a', 100, 1, 3)], 'CDB', 500, 3)
    expect(plan.error).toBe('insufficient')
    expect(plan.available).toBeCloseTo(grow(100, rate, 2), 2)
  })

  it('aceita diferença menor que meio centavo (arredondamento da tela)', () => {
    const inv = { id: 'a', type: 'POUPANCA', amount: 100.004, monthlyRate: 0.005, investedAt: 3 }
    expect(planWithdrawal([inv], 'POUPANCA', 100.008, 3).error).toBeUndefined()
  })

  it('resgate parcial reduz o investimento sem fechá-lo', () => {
    const plan = planWithdrawal([cdb('a', 1000, 3, 3)], 'CDB', 400, 3)
    expect(plan.steps).toEqual([expect.objectContaining({ id: 'a', take: 400, closes: false })])
    expect(plan).toMatchObject({ gross: 400, incomeTax: 0, net: 400 })
  })

  it('resgatar tudo fecha o investimento', () => {
    const inv = cdb('a', 1000, 1, 4)
    const plan = planWithdrawal([inv], 'CDB', inv.amount, 4)
    expect(plan.steps[0].closes).toBe(true)
    expect(plan.incomeTax).toBeCloseTo((inv.amount - 1000) * 0.175, 2)
  })

  it('tira primeiro do investimento mais antigo, mesmo fora de ordem', () => {
    const newer = cdb('new', 2000, 3, 4)
    const older = cdb('old', 1000, 1, 4)
    const plan = planWithdrawal([newer, older], 'CDB', older.amount + 500, 4)
    expect(plan.steps.map((s) => [s.id, s.closes])).toEqual([['old', true], ['new', false]])
    expect(plan.steps[1].take).toBeCloseTo(500, 8)
  })

  it('o IR é proporcional à fatia resgatada', () => {
    const inv = cdb('a', 1000, 1, 5)
    const gain = inv.amount - 1000
    const plan = planWithdrawal([inv], 'CDB', inv.amount / 4, 5)
    expect(plan.incomeTax).toBeCloseTo((gain / 4) * 0.175, 2)
  })

  it('resgatar em duas vezes cobra o mesmo IR que de uma vez só', () => {
    const invs = () => [cdb('a', 1000, 1, 6), cdb('b', 1500, 3, 6), cdb('c', 800, 5, 6)]
    const total = invs().reduce((s, i) => s + i.amount, 0)
    const once = planWithdrawal(invs(), 'CDB', total, 6)

    const state = invs()
    const first = planWithdrawal(state, 'CDB', 1700, 6)
    for (const step of first.steps) {
      const inv = state.find((i) => i.id === step.id)
      inv.amount -= step.take
    }
    const remaining = state.filter((i) => i.amount > 0.005)
    const second = planWithdrawal(remaining, 'CDB', remaining.reduce((s, i) => s + i.amount, 0), 6)

    expect(first.incomeTax + second.incomeTax).toBeCloseTo(once.incomeTax, 1)
    expect(first.net + second.net).toBeCloseTo(once.net, 1)
  })

  it('Tesouro cobra 15% da parte antiga e 22,5% da parte nova', () => {
    const r = getMonthlyRate('TESOURO_SELIC')
    const old = { id: 'old', type: 'TESOURO_SELIC', amount: grow(1000, r, 7), monthlyRate: r, investedAt: 1 }
    const fresh = { id: 'new', type: 'TESOURO_SELIC', amount: grow(1000, r, 2), monthlyRate: r, investedAt: 6 }
    const plan = planWithdrawal([old, fresh], 'TESOURO_SELIC', old.amount + fresh.amount, 8)
    const expected = (old.amount - 1000) * 0.15 + (fresh.amount - 1000) * 0.225
    expect(plan.incomeTax).toBeCloseTo(expected, 2)
  })

  it.each(['POUPANCA', 'LCI', 'LCA'])('%s nunca cobra IR no resgate parcial', (type) => {
    const r = getMonthlyRate(type)
    const inv = { id: 'a', type, amount: grow(5000, r, 9), monthlyRate: r, investedAt: 1 }
    const plan = planWithdrawal([inv], type, 1234.56, 10)
    expect(plan).toMatchObject({ incomeTax: 0, net: 1234.56, gross: 1234.56 })
  })

  it('valores saem em centavos', () => {
    const plan = planWithdrawal([cdb('a', 1000, 1, 9)], 'CDB', 333.333, 9)
    expect(plan.gross).toBe(333.33)
    expect(Number.isInteger(Math.round(plan.incomeTax * 100))).toBe(true)
    expect(plan.net).toBe(cents(plan.net))
  })
})

// ─── debêntures ───────────────────────────────────────────────────────────────

describe('debentureMaturity', () => {
  it.each([
    [0, 10],
    [1, 11],
    [2, 12],
    [5, 12],
    [12, 12],
  ])('aplicada no mês %i vence no mês %i (partida de 12 meses)', (turn, expected) => {
    expect(debentureMaturity(turn, 12)).toBe(expected)
  })
})

describe('debentureReturn', () => {
  it('12 meses a 18% a.a. pagam exatamente 18%', () => {
    expect(debentureReturn(1000, 0.18, 12)).toBe(1180)
  })

  it('10 meses pagam a fração composta da taxa anual', () => {
    expect(debentureReturn(1000, 0.18, 10)).toBeCloseTo(1000 * Math.pow(1.18, 10 / 12), 2)
  })

  it('0 meses devolve o valor aplicado', () => {
    expect(debentureReturn(2500, 0.18, 0)).toBe(2500)
  })

  it('aceita Decimal como texto', () => {
    expect(debentureReturn('1000', '0.18', 12)).toBe(1180)
  })
})

// ─── ações ────────────────────────────────────────────────────────────────────

describe('averagePrice', () => {
  it('pondera pelo número de ações', () => {
    expect(averagePrice(10, 20, 10, 30)).toBe(25)
    expect(averagePrice(30, 10, 10, 50)).toBe(20)
  })

  it('sem posição anterior é o próprio preço', () => {
    expect(averagePrice(0, 0, 5, 42.22)).toBe(42.22)
  })
})

describe('nextStockPrice', () => {
  const at = (v) => () => v

  it('sorteio no meio mantém o preço', () => {
    expect(nextStockPrice(83.79, 'medium', 'VALE3', 2, at(0.5))).toBe(83.79)
  })

  it.each([
    ['low', 0.03],
    ['medium', 0.07],
    ['high', 0.15],
  ])('risco %s varia no máximo ±%f', (risk, vol) => {
    expect(nextStockPrice(100, risk, 'ABEV3', 2, at(1))).toBeCloseTo(100 * (1 + vol), 2)
    expect(nextStockPrice(100, risk, 'ABEV3', 2, at(0))).toBeCloseTo(100 * (1 - vol), 2)
  })

  it('VALE3 sobe 40% no mês 3', () => {
    expect(nextStockPrice(100, 'medium', 'VALE3', 3, at(0.5))).toBe(140)
  })

  it('PETR4 cai 35% no mês 10', () => {
    expect(nextStockPrice(100, 'high', 'PETR4', 10, at(0.5))).toBe(65)
  })

  it('o evento só acontece no mês dele', () => {
    expect(nextStockPrice(100, 'medium', 'VALE3', 4, at(0.5))).toBe(100)
  })

  it('o preço nunca fica abaixo de 1 centavo', () => {
    expect(nextStockPrice(0.01, 'high', 'AMER3', 2, at(0))).toBe(0.01)
  })

  it('risco desconhecido usa a volatilidade alta', () => {
    expect(nextStockPrice(100, undefined, 'X', 2, at(1))).toBeCloseTo(115, 2)
  })

  it('sorteios reais ficam dentro da faixa do risco', () => {
    for (let i = 0; i < 200; i++) {
      const p = nextStockPrice(50, 'low', 'ABEV3', 2)
      expect(p).toBeGreaterThanOrEqual(48.5)
      expect(p).toBeLessThanOrEqual(51.5)
    }
  })
})

// ─── cenário completo ─────────────────────────────────────────────────────────

describe('cenário: 12 meses de caixinhas', () => {
  it.each(Object.keys(ANNUAL_RATES))('R$ 1.000 em %s por 12 meses rende a taxa anual, menos o IR', (type) => {
    const rate = getMonthlyRate(type)
    const amount = grow(1000, rate, 12)
    expect(amount).toBeCloseTo(1000 * (1 + ANNUAL_RATES[type]), 6)

    const r = redemptionOf({ type, amount, monthlyRate: rate, investedAt: 0 }, 12)
    const gain = 1000 * ANNUAL_RATES[type]
    expect(r.net).toBeCloseTo(1000 + gain * (1 - incomeTaxRate(type, 12)), 1)
  })
})
