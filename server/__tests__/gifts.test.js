// __tests__/gifts.test.js — tabela dos dons e balanceamento
const {
  GIFTS, GIFT_IDS, BASE_COSTS, BASE_SKILL_POINTS,
  giftOf, isValidGift, startingCosts, startingSkillPoints,
  giftIncome, giftIncomeEntry, positiveEventMultiplier, giftEventImpact,
} = require('../src/utils/gifts')
const { expectedPositiveEvents, WELCOME_GIFT, EVENT_CALENDAR } = require('../src/utils/events')

const NEUTRAL = [null, undefined, '', 'invalido', 'FRUGAL', 'toString', '__proto__', 'constructor', 42]

// ─── tabela ───────────────────────────────────────────────────────────────────

describe('tabela de dons', () => {
  it('tem exatamente os três dons', () => {
    expect(GIFT_IDS).toEqual(['frugal', 'agile', 'smart'])
  })

  it.each([
    ['frugal', 'Mão de Vaca Estratégico'],
    ['agile', 'Desenrolado'],
    ['smart', 'Inteligente'],
  ])('%s se chama "%s"', (id, name) => {
    expect(GIFTS[id]).toMatchObject({ id, name })
    expect(typeof GIFTS[id].description).toBe('string')
  })

  it('frugal: 10% de desconto nos custos fixos', () => {
    expect(GIFTS.frugal.costDiscount).toBe(0.10)
  })

  it('agile: freela de R$ 220 e +50% nos eventos positivos', () => {
    expect(GIFTS.agile.monthlyIncome).toEqual({ label: 'Freela', amount: 220 })
    expect(GIFTS.agile.positiveEventBonus).toBe(0.5)
  })

  it('smart: 2 pontos iniciais e limite 10', () => {
    expect(GIFTS.smart.skillPoints).toEqual({ totalPoints: 2, maxPoints: 10 })
  })

  it('custos base: 1500 / 1000 / 250 / 250', () => {
    expect(BASE_COSTS).toEqual({ housingCost: 1500, foodCost: 1000, utilitiesCost: 250, transportCost: 250 })
  })

  it('pontos base: 0 pontos e limite 8', () => {
    expect(BASE_SKILL_POINTS).toEqual({ totalPoints: 0, maxPoints: 8 })
  })
})

describe('giftOf / isValidGift', () => {
  it.each(GIFT_IDS)('%s é válido', (id) => {
    expect(isValidGift(id)).toBe(true)
    expect(giftOf(id)).toBe(GIFTS[id])
  })

  it.each(NEUTRAL)('%p não é dom', (gift) => {
    expect(isValidGift(gift)).toBe(false)
    expect(giftOf(gift)).toBeNull()
  })
})

// ─── custos iniciais ──────────────────────────────────────────────────────────

describe('startingCosts', () => {
  it('frugal: exatamente 1350 / 900 / 225 / 225', () => {
    expect(startingCosts('frugal')).toEqual({ housingCost: 1350, foodCost: 900, utilitiesCost: 225, transportCost: 225 })
  })

  it('frugal: soma R$ 2.700 (R$ 300 a menos por mês)', () => {
    const total = Object.values(startingCosts('frugal')).reduce((a, b) => a + b, 0)
    expect(total).toBe(2700)
  })

  it.each(['agile', 'smart'])('%s: custos cheios', (gift) => {
    expect(startingCosts(gift)).toEqual(BASE_COSTS)
  })

  it.each(NEUTRAL)('dom %p: custos cheios', (gift) => {
    expect(startingCosts(gift)).toEqual(BASE_COSTS)
  })

  it('valores em centavos exatos (sem lixo de ponto flutuante)', () => {
    for (const v of Object.values(startingCosts('frugal'))) expect(Math.round(v * 100) / 100).toBe(v)
  })

  it('devolve um objeto novo a cada chamada (não expõe BASE_COSTS)', () => {
    const costs = startingCosts('agile')
    costs.housingCost = 1
    expect(BASE_COSTS.housingCost).toBe(1500)
    expect(startingCosts('agile').housingCost).toBe(1500)
  })
})

// ─── pontos de habilidade ─────────────────────────────────────────────────────

describe('startingSkillPoints', () => {
  it('smart: { 2, 10 }', () => {
    expect(startingSkillPoints('smart')).toEqual({ totalPoints: 2, maxPoints: 10 })
  })

  it.each(['frugal', 'agile', ...NEUTRAL])('%p: { 0, 8 }', (gift) => {
    expect(startingSkillPoints(gift)).toEqual({ totalPoints: 0, maxPoints: 8 })
  })

  it('devolve cópia (mexer no retorno não altera a tabela)', () => {
    const p = startingSkillPoints('smart')
    p.totalPoints = 99
    expect(GIFTS.smart.skillPoints.totalPoints).toBe(2)
    const b = startingSkillPoints(null)
    b.maxPoints = 99
    expect(BASE_SKILL_POINTS.maxPoints).toBe(8)
  })
})

// ─── renda do dom ─────────────────────────────────────────────────────────────

describe('giftIncome / giftIncomeEntry', () => {
  it('agile: R$ 220 por mês', () => {
    expect(giftIncome('agile')).toBe(220)
  })

  it.each(['frugal', 'smart', ...NEUTRAL])('%p: 0', (gift) => {
    expect(giftIncome(gift)).toBe(0)
  })

  it('agile: linha do extrato no formato das rendas das habilidades', () => {
    expect(giftIncomeEntry('agile')).toEqual({ label: 'Freela', skill: 'Desenrolado', amount: 220 })
  })

  it.each(['frugal', 'smart', ...NEUTRAL])('%p: sem linha', (gift) => {
    expect(giftIncomeEntry(gift)).toBeNull()
  })
})

// ─── eventos positivos ────────────────────────────────────────────────────────

describe('positiveEventMultiplier / giftEventImpact', () => {
  it('agile: 1,5', () => {
    expect(positiveEventMultiplier('agile')).toBe(1.5)
  })

  it.each(['frugal', 'smart', ...NEUTRAL])('%p: 1', (gift) => {
    expect(positiveEventMultiplier(gift)).toBe(1)
  })

  it.each([
    [800, 1200],
    [1500, 2250],
    [100, 150],
    [0.01, 0.02], // 0,015 → 0,02 (arredonda pro centavo)
    [33.33, 50],  // 49,995 → 50,00
    [10.01, 15.02], // 15,015 → 15,02
  ])('agile: %p vira %p', (value, expected) => {
    expect(giftEventImpact(value, 'agile')).toBe(expected)
  })

  it.each([-200, -600, -3500, -30, 0])('agile: evento %p não muda', (value) => {
    expect(giftEventImpact(value, 'agile')).toBe(value)
  })

  it.each(['frugal', 'smart', null])('%p: evento positivo não muda', (gift) => {
    expect(giftEventImpact(800, gift)).toBe(800)
    expect(giftEventImpact(1500, gift)).toBe(1500)
  })

  it('resultado sempre em centavos', () => {
    for (let v = 0.01; v < 50; v += 0.37) {
      const r = giftEventImpact(Math.round(v * 100) / 100, 'agile')
      expect(Math.round(r * 100) / 100).toBe(r)
    }
  })
})

// ─── balanceamento: cada dom vale ≈ R$ 3.600 por ano ─────────────────────────

describe('balanceamento anual dos dons', () => {
  const MONTHS = 12
  const TARGET = 3600
  const within10 = (value) => {
    expect(value).toBeGreaterThanOrEqual(TARGET * 0.9)
    expect(value).toBeLessThanOrEqual(TARGET * 1.1)
  }

  // valor esperado dos eventos positivos do ano: calendário + presente de boas-vindas
  const expectedPositiveYear = expectedPositiveEvents() + WELCOME_GIFT.cashImpact

  const yearlyValue = {
    frugal: () => {
      const base = Object.values(BASE_COSTS).reduce((a, b) => a + b, 0)
      const discounted = Object.values(startingCosts('frugal')).reduce((a, b) => a + b, 0)
      return (base - discounted) * MONTHS
    },
    agile: () =>
      giftIncome('agile') * MONTHS +
      (positiveEventMultiplier('agile') - 1) * expectedPositiveYear,
  }

  it('o modelo usa R$ 1.392 esperados do calendário + R$ 500 de boas-vindas', () => {
    expect(expectedPositiveEvents()).toBe(1392)
    expect(expectedPositiveYear).toBe(1892)
  })

  it('o 13º não entra no bônus do Desenrolado (é salário, não sorte)', () => {
    const thirteenth = EVENT_CALENDAR[12].find((e) => e.title === '13º salário')
    expect(thirteenth.category).toBe('salary')
  })

  it('frugal vale R$ 3.600 por ano (R$ 300 × 12)', () => {
    expect(yearlyValue.frugal()).toBe(3600)
    within10(yearlyValue.frugal())
  })

  it('agile vale ≈ R$ 3.586 por ano (220 × 12 + 50% de R$ 1.892)', () => {
    expect(yearlyValue.agile()).toBeCloseTo(2640 + 946, 6)
    within10(yearlyValue.agile())
  })

  it('o freela fixo sozinho já é 2/3 do valor do agile (menos dependente da sorte)', () => {
    expect(giftIncome('agile') * MONTHS / yearlyValue.agile()).toBeGreaterThan(0.6)
  })

  it('frugal e agile ficam a menos de 5% um do outro', () => {
    const diff = Math.abs(yearlyValue.frugal() - yearlyValue.agile())
    expect(diff / TARGET).toBeLessThan(0.05)
  })

  it('smart: 2 pontos a mais logo no início e 2 a mais de limite', () => {
    const smart = startingSkillPoints('smart')
    const base = startingSkillPoints(null)
    expect(smart.totalPoints - base.totalPoints).toBe(2)
    expect(smart.maxPoints - base.maxPoints).toBe(2)
  })

  it('os valores antigos estavam desbalanceados (frugal 15% ≈ 5.400, agile 20% ≈ 460)', () => {
    const oldFrugal = 3000 * 0.15 * MONTHS
    // eventos antigos: positivos de R$ 800 e R$ 1.500 entre 12 sorteáveis
    const oldAgile = 0.2 * ((800 + 1500) / 12) * MONTHS
    expect(oldFrugal).toBeCloseTo(5400, 6)
    expect(oldAgile).toBeCloseTo(460, 6)
    expect(oldFrugal).toBeGreaterThan(TARGET * 1.1)
    expect(oldAgile).toBeLessThan(TARGET * 0.9)
  })
})
