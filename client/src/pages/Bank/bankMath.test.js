// Testes dos cálculos da tela do banco. Rodar com: npm test
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  activeDebentures, debentureValue, debentureYield, fixedBoxValue, fixedBoxYield, monthlyBills,
  monthlyFromAnnual, nextMaturity, OVERDRAFT_MONTHLY_RATE, overdraftInterest, overdraftRateFor, parseAmount, ratePercent, paymentPreview, reserveGoal, reserveMonths, shares, statementByMonth, stocksValue, freeBoxValue, lockedLots, nextUnlock, unlocksAt,
} from './bankMath.js'

const close = (actual, expected, digits = 2) =>
  assert.ok(Math.abs(actual - expected) < 10 ** -digits / 2, `esperado ${expected}, veio ${actual}`)

describe('parseAmount', () => {
  const cases = [
    ['1.234,56', 1234.56],
    ['1234,56', 1234.56],
    ['1000', 1000],
    ['1.000', 1000],
    ['R$ 500,00', 500],
    ['R$ 1.000.000,01', 1000000.01],
    ['1,5', 1.5],
    ['  250 ', 250],
    [1000, 1000],
  ]
  for (const [text, expected] of cases) {
    it(`"${text}" vira ${expected}`, () => assert.equal(parseAmount(text), expected))
  }

  it('texto sem número vira NaN', () => {
    for (const text of ['', 'abc', 'R$', null, undefined]) assert.ok(Number.isNaN(parseAmount(text)), String(text))
  })
})

describe('caixinhas de renda fixa', () => {
  const fixed = [
    { type: 'CDB', amount: '1000', monthlyRate: '0.0087' },
    { type: 'CDB', amount: 500.5, monthlyRate: 0.0087 },
    { type: 'POUPANCA', amount: 300, monthlyRate: 0.0053 },
  ]

  it('soma só os investimentos do tipo', () => {
    assert.equal(fixedBoxValue(fixed, 'CDB'), 1500.5)
    assert.equal(fixedBoxValue(fixed, 'POUPANCA'), 300)
    assert.equal(fixedBoxValue(fixed, 'LCI'), 0)
  })

  it('rendimento previsto é valor × taxa do mês de cada investimento', () => {
    close(fixedBoxYield(fixed, 'CDB'), 1500.5 * 0.0087, 6)
    assert.equal(fixedBoxYield(fixed, 'LCA'), 0)
  })
})

describe('debêntures', () => {
  const debs = [
    { status: 'active', amount: 1000, annualRate: '0.18', investedAt: 1, maturesAt: 11 },
    { status: 'active', amount: 500, annualRate: 0.18, investedAt: 3, maturesAt: 12 },
    { status: 'paid', amount: 9999, annualRate: 0.18, investedAt: 1, maturesAt: 2 },
    { status: 'defaulted', amount: 9999, annualRate: 0.18, investedAt: 1, maturesAt: 2 },
  ]

  it('considera só as ativas', () => {
    assert.equal(activeDebentures(debs).length, 2)
  })

  it('no mês da aplicação vale o que foi aplicado', () => {
    assert.equal(debentureValue([debs[0]], 1), 1000)
  })

  it('cresce com juros compostos mensais equivalentes aos 18% a.a.', () => {
    close(debentureValue([debs[0]], 13), 1180, 6)
    const m = monthlyFromAnnual(0.18)
    close(debentureValue(debs, 5), 1000 * (1 + m) ** 4 + 500 * (1 + m) ** 2, 6)
  })

  it('rendimento previsto do mês é valor atual × taxa mensal', () => {
    close(debentureYield([debs[0]], 1), 1000 * monthlyFromAnnual(0.18), 6)
  })

  it('próximo vencimento é o menor das ativas', () => {
    assert.equal(nextMaturity(debs), 11)
    assert.equal(nextMaturity([]), Infinity)
  })
})

describe('reserva de emergência', () => {
  const character = { housingCost: '1500', foodCost: 1000, utilitiesCost: 250, transportCost: 250 }

  it('contas do mês somam aluguel, mercado, luz e internet', () => {
    assert.equal(monthlyBills(character), 3000)
  })

  it('meta é 3 meses de contas', () => {
    assert.equal(reserveGoal(character), 9000)
  })

  it('cobertura em meses', () => {
    assert.equal(reserveMonths(4500, character), 1.5)
    assert.equal(reserveMonths(1000, {}), 0)
  })
})

describe('patrimônio', () => {
  it('soma o valor atual das ações', () => {
    assert.equal(stocksValue([{ totalValue: 837.9 }, { totalValue: '42.22' }]), 880.12)
  })

  it('fatias somam 100%', () => {
    const parts = shares([{ name: 'Conta', value: 4816.21 }, { name: 'CDB', value: 600 }, { name: 'Ações', value: 83.79 }])
    close(parts.reduce((s, p) => s + p.pct, 0), 100, 9)
  })

  it('sem patrimônio todas as fatias são 0', () => {
    assert.deepEqual(shares([{ name: 'Conta', value: 0 }]).map((p) => p.pct), [0])
  })
})

describe('paymentPreview', () => {
  it('desconta o valor do saldo', () => {
    assert.deepEqual(paymentPreview(4816.21, 1000), { after: 3816.21, negative: false })
  })

  it('fecha em centavos mesmo com valores quebrados', () => {
    assert.equal(paymentPreview(0.3, 0.1).after, 0.2)
    assert.equal(paymentPreview('1000.10', '250.05').after, 750.05)
  })

  it('pagar exatamente o saldo zera a conta sem ficar negativo', () => {
    assert.deepEqual(paymentPreview(250, 250), { after: 0, negative: false })
  })

  it('avisa quando o pagamento deixa a conta negativa', () => {
    assert.deepEqual(paymentPreview(300, 1000), { after: -700, negative: true })
  })
})

describe('cheque especial', () => {
  it('cobra 8% ao mês', () => assert.equal(OVERDRAFT_MONTHLY_RATE, 0.08))

  it('juros sobre o saldo negativo, em centavos', () => {
    assert.equal(overdraftInterest(-1000), 80)
    assert.equal(overdraftInterest('-333.33'), 26.67)
    assert.equal(overdraftInterest(-12345.67), 987.65)
  })

  it('saldo zero ou positivo não paga juros', () => {
    for (const cash of [0, 0.01, 5000]) assert.equal(overdraftInterest(cash), 0)
  })

  it('a prévia de pagamento que fica negativa já mostra quanto de juros vem', () => {
    const { after, negative } = paymentPreview(300, 1000)
    assert.ok(negative)
    assert.equal(overdraftInterest(after), 56)
  })
})

describe('taxa do cheque especial do personagem', () => {
  const node = (path, level) => ({ skillNode: { path, level } })

  it('8% sem habilidade e 4% com Gestão nível 2', () => {
    assert.equal(overdraftRateFor([]), 0.08)
    assert.equal(overdraftRateFor([node('management', 1)]), 0.08)
    assert.equal(overdraftRateFor([node('management', 1), node('management', 2)]), 0.04)
    assert.equal(overdraftRateFor([node('communication', 2)]), 0.08)
    assert.equal(overdraftRateFor(), 0.08)
  })

  it('juros usam a taxa do personagem', () => {
    assert.equal(overdraftInterest(-1000), 80)
    assert.equal(overdraftInterest(-1000, 0.04), 40)
    assert.equal(overdraftInterest(500, 0.04), 0)
  })

  it('texto da taxa', () => {
    assert.equal(ratePercent(0.08), '8%')
    assert.equal(ratePercent(0.04), '4%')
  })
})

describe('extrato por mês', () => {
  const log = [
    { id: 1, turn: 1, cashImpact: 7000, description: 'Salário', loggedAt: '2026-01-01T10:00:00Z' },
    { id: 2, turn: 1, cashImpact: -2000, description: 'Caixinha: Guardado em CDB', loggedAt: '2026-01-01T10:05:00Z' },
    { id: 3, turn: 2, cashImpact: -1500, description: 'Aluguel', loggedAt: '2026-01-01T10:10:00Z' },
    { id: 4, turn: 2, cashImpact: 0, description: 'Aviso', loggedAt: '2026-01-01T10:11:00Z' },
    ...Array.from({ length: 10 }, (_, i) => ({ id: 10 + i, turn: 2, cashImpact: -10, description: `Conta ${i}`, loggedAt: `2026-01-01T11:${String(i).padStart(2, '0')}:00Z` })),
  ]
  it('mês mais recente primeiro, linhas sem valor de fora', () => {
    const m = statementByMonth(log)
    assert.deepEqual(m.map((x) => x.turn), [2, 1])
    assert.equal(m[0].entries.length, 11)
  })
  it('não corta: a aplicação de um mês antigo continua no extrato', () => {
    assert.ok(statementByMonth(log)[1].entries.some((e) => e.description === 'Caixinha: Guardado em CDB'))
  })
  it('dentro do mês, o mais novo primeiro; total do mês em centavos', () => {
    const [feb, jan] = statementByMonth(log)
    assert.equal(jan.entries[0].description, 'Caixinha: Guardado em CDB')
    assert.equal(jan.total, 5000)
    assert.equal(feb.total, -1600)
  })
  it('sem movimentação: lista vazia', () => assert.deepEqual(statementByMonth(), []))
})

describe('carência da LCI e da LCA', () => {
  const inv = [
    { type: 'LCI', amount: 1000, investedAt: 1 },
    { type: 'LCI', amount: 500, investedAt: 3 },
    { type: 'LCA', amount: 2000, investedAt: 1 },
    { type: 'CDB', amount: 300, investedAt: 5 },
  ]
  it('LCI solta 6 meses depois, LCA 8, o resto na hora', () => {
    assert.equal(unlocksAt('LCI', 3), 9)
    assert.equal(unlocksAt('LCA', 1), 9)
    assert.equal(unlocksAt('CDB', 5), 5)
  })
  it('só conta o que já passou da carência', () => {
    assert.equal(freeBoxValue(inv, 'LCI', 6), 0)
    assert.equal(freeBoxValue(inv, 'LCI', 7), 1000)
    assert.equal(freeBoxValue(inv, 'LCI', 9), 1500)
    assert.equal(freeBoxValue(inv, 'LCA', 8), 0)
    assert.equal(freeBoxValue(inv, 'CDB', 5), 300)
  })
  it('o que está preso, somado por mês em que solta', () => {
    const lots = [...inv, { type: 'LCI', amount: 250.105, investedAt: 3 }]
    assert.deepEqual(lockedLots(lots, 'LCI', 2), [{ month: 7, amount: 1000 }, { month: 9, amount: 750.11 }])
    assert.deepEqual(lockedLots(lots, 'LCI', 9), [])
    assert.deepEqual(lockedLots(lots, 'CDB', 1), [])
  })

  it('mês em que solta a próxima', () => {
    assert.equal(nextUnlock(inv, 'LCI', 2), 7)
    assert.equal(nextUnlock(inv, 'LCI', 7), 9)
    assert.equal(nextUnlock(inv, 'LCI', 9), null)
    assert.equal(nextUnlock(inv, 'CDB', 5), null)
  })
})
