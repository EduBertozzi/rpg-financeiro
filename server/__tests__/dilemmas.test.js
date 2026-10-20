// __tests__/dilemmas.test.js — dilemas do ano e as consequências (funções puras)
const {
  DILEMMAS, dilemmaFor, optionPrice, resolveDilemma, publicDilemma, summarizeEffects,
  installmentDebt, choicesTimeline, machinePaid, lawyerCost, firePrepay,
} = require('../src/utils/dilemmas')
const { perksOf } = require('../src/utils/skills')

const NO_PERKS = perksOf()
const TEAMWORK = perksOf([{ skillNode: { path: 'communication', level: 2, name: 'Trabalho em Equipe' } }])
const ctx = (overrides = {}) => ({ perks: NO_PERKS, choices: {}, housingCost: 1500, ...overrides })
const resolve = (turn, option, overrides) => resolveDilemma(turn, option, ctx(overrides))
const sum = (list) => Math.round(list.reduce((a, b) => a + b, 0) * 100) / 100

describe('calendário de dilemas', () => {
  it('tem um dilema de janeiro a novembro e nenhum em dezembro', () => {
    expect(Object.keys(DILEMMAS).map(Number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    expect(dilemmaFor(12)).toBeNull()
    expect(dilemmaFor(0)).toBeNull()
  })

  it('todo dilema tem exatamente duas escolhas', () => {
    for (const d of Object.values(DILEMMAS)) expect(d.options).toHaveLength(2)
  })

  it('aceita o mês como texto', () => {
    expect(dilemmaFor('3').title).toBe('Dor de dente')
  })

  it('opção ou mês inválido lança erro', () => {
    expect(() => resolve(12, 0)).toThrow('Dilema não encontrado')
    expect(() => resolve(2, 5)).toThrow('Opção inválida')
  })
})

describe('janeiro — a rotina desandou', () => {
  it('as duas escolhas custam igual (dilema sem diferença de dinheiro)', () => {
    expect(resolve(1, 0).cash).toBe(-450)
    expect(resolve(1, 1).cash).toBe(-450)
    expect(resolve(1, 0).effects).toEqual([])
    expect(resolve(1, 1).effects).toEqual([])
  })
})

describe('fevereiro — empréstimo para o amigo', () => {
  it('emprestar: -750 agora, +810 na virada para maio', () => {
    const r = resolve(2, 0)
    expect(r.cash).toBe(-750)
    expect(r.effects).toEqual([expect.objectContaining({ turn: 5, kind: 'cash', amount: 810 })])
  })

  it('o amigo devolve 8% a mais', () => {
    expect(810 / 750 - 1).toBeCloseTo(0.08, 3)
  })

  it('não emprestar não custa nada', () => {
    expect(resolve(2, 1)).toEqual(expect.objectContaining({ cash: 0, effects: [] }))
  })
})

describe('março — dor de dente', () => {
  it('deixar para depois: grátis agora, canal de R$ 750 em junho', () => {
    const r = resolve(3, 0)
    expect(r.cash).toBe(0)
    expect(r.effects).toEqual([expect.objectContaining({ turn: 6, kind: 'cash', amount: -750 })])
  })

  it('ir ao dentista sai por pouco mais da metade do canal (R$ 380)', () => {
    expect(resolve(3, 1).cash).toBe(-380)
  })
})

describe('abril — máquina de lavar', () => {
  it('parcelado: 12 × 502,80 = 6.033,60', () => {
    expect(machinePaid({ 4: 0 })).toBe(6033.6)
  })

  it('à vista: 5.430', () => {
    expect(machinePaid({ 4: 1 })).toBe(5430)
    expect(resolve(4, 1).cash).toBe(-5430)
  })

  it('parcelar custa 11,1% a mais que pagar à vista', () => {
    expect(6033.6 / 5430 - 1).toBeCloseTo(0.111, 3)
  })

  it('primeira parcela na hora e 11 nas viradas seguintes, até janeiro do outro ano', () => {
    const r = resolve(4, 0)
    expect(r.cash).toBe(-502.8)
    expect(r.effects).toHaveLength(11)
    expect(r.effects[0]).toEqual({ turn: 5, kind: 'installment', amount: -502.8, label: 'Parcela: Máquina de lavar (2/12)' })
    expect(r.effects[10]).toEqual({ turn: 15, kind: 'installment', amount: -502.8, label: 'Parcela: Máquina de lavar (12/12)' })
  })

  it('primeira parcela + todas as marcadas = preço total parcelado', () => {
    const r = resolve(4, 0)
    expect(sum([-r.cash, ...r.effects.map((e) => -e.amount)])).toBe(6033.6)
  })

  it('no ano cabem 9 parcelas (abril a dezembro); 3 sobram como dívida', () => {
    const r = resolve(4, 0)
    const inGame = r.effects.filter((e) => e.turn <= 12)
    const after = r.effects.filter((e) => e.turn > 12)
    expect(1 + inGame.length).toBe(9)
    expect(installmentDebt(after)).toBe(1508.4)
  })

  it('contando a dívida, parcelar nunca sai mais barato que à vista', () => {
    const r = resolve(4, 0)
    const paidInYear = sum([-r.cash, ...r.effects.filter((e) => e.turn <= 12).map((e) => -e.amount)])
    const debt = installmentDebt(r.effects.filter((e) => e.turn > 12))
    expect(paidInYear).toBe(4525.2) // sem a dívida, pareceria mais barato
    expect(sum([paidInYear, debt])).toBeGreaterThan(5430)
  })
})

describe('maio — chave perdida', () => {
  it('arrombar: grátis agora, porta de R$ 450 em junho', () => {
    const r = resolve(5, 0)
    expect(r.cash).toBe(0)
    expect(r.effects).toEqual([expect.objectContaining({ turn: 6, amount: -450 })])
  })

  it('chaveiro: R$ 270 e sem consequência imediata', () => {
    expect(resolve(5, 1)).toEqual(expect.objectContaining({ cash: -270, effects: [] }))
  })
})

describe('junho — esgotamento', () => {
  it('descansar: R$ 1.500 agora', () => {
    expect(resolve(6, 0)).toEqual(expect.objectContaining({ cash: -1500, effects: [] }))
  })

  it('seguir trabalhando: crise de coluna de R$ 3.000 em agosto', () => {
    expect(resolve(6, 1).effects).toEqual([expect.objectContaining({ turn: 8, kind: 'cash', amount: -3000 })])
  })
})

describe('julho — academia', () => {
  it('semestral à vista: R$ 1.800', () => {
    expect(resolve(7, 0).cash).toBe(-1800)
  })

  it('mensal: 6 × 359,85 de julho a dezembro, todas dentro do ano', () => {
    const r = resolve(7, 1)
    expect(r.cash).toBe(-359.85)
    expect(r.effects.map((e) => e.turn)).toEqual([8, 9, 10, 11, 12])
    expect(sum([-r.cash, ...r.effects.map((e) => -e.amount)])).toBe(2159.1)
    expect(installmentDebt(r.effects.filter((e) => e.turn > 12))).toBe(0)
  })
})

describe('agosto — ônibus quebrado', () => {
  it('aplicativo: R$ 70 e sem trava', () => {
    expect(resolve(8, 0)).toEqual(expect.objectContaining({ cash: -70, lockSeconds: 0 }))
  })

  it('a pé: grátis, mas trava a tela por 2 minutos', () => {
    expect(resolve(8, 1)).toEqual(expect.objectContaining({ cash: 0, lockSeconds: 120, effects: [] }))
  })
})

describe('setembro — programa de TV', () => {
  it('participar: R$ 1.200 e promoção de 15% (R$ 1.050) nas viradas de out, nov e dez', () => {
    const r = resolve(9, 0)
    expect(r.cash).toBe(-1200)
    expect(r.effects.map((e) => [e.turn, e.kind, e.amount])).toEqual([
      [10, 'salary_raise', 1050], [11, 'salary_raise', 1050], [12, 'salary_raise', 1050],
    ])
    expect(r.effects[0].label).toBe('Promoção: Salário 15% maior depois do programa de TV')
  })

  it('a promoção paga 2,6 vezes o custo do programa', () => {
    const r = resolve(9, 0)
    expect(sum(r.effects.map((e) => e.amount)) / 1200).toBeCloseTo(2.625, 3)
  })

  it('quem perdeu a reunião em maio sobe só 7,5%', () => {
    const r = resolve(9, 0, { choices: { 5: 1 } })
    expect(r.effects.map((e) => e.amount)).toEqual([525, 525, 525])
    expect(r.effects[0].label).toBe('Promoção: Salário 7,5% maior depois do programa de TV')
  })

  it('não participar sem atraso em agosto: nada', () => {
    expect(resolve(9, 1, { choices: { 8: 0 } }).effects).toEqual([])
    expect(resolve(9, 1).effects).toEqual([])
  })

  it('não participar e ter ido a pé em agosto: demissão em novembro, dezembro sem salário', () => {
    const r = resolve(9, 1, { choices: { 8: 1 } })
    expect(r.effects.map((e) => [e.turn, e.kind])).toEqual([[11, 'notice'], [12, 'no_salary']])
    expect(r.effects[0].label).toMatch(/^Demissão: /)
  })
})

describe('outubro — incêndio', () => {
  it('adiantar 3 meses com 10% de desconto: 1.500 × 3 × 0,9 = 4.050', () => {
    expect(firePrepay(ctx())).toBe(4050)
    expect(resolve(10, 0).cash).toBe(-4050)
  })

  it('adiantar dispensa o aluguel de novembro e dezembro', () => {
    const waived = resolve(10, 0).effects.filter((e) => e.kind === 'rent_waived')
    expect(waived.map((e) => e.turn)).toEqual([11, 12])
  })

  it('casa mais cara: aluguel 50% maior a partir de agora', () => {
    const r = resolve(10, 1, { housingCost: 1500 })
    expect(r.cash).toBe(0)
    expect(r.updates).toEqual({ housingCost: 2250 })
  })

  it('o Mão de Vaca leva o desconto dele para a casa nova', () => {
    expect(resolve(10, 1, { housingCost: 1350 }).updates).toEqual({ housingCost: 2025 })
  })

  it('a casa mais cara avisa no extrato de novembro', () => {
    expect(resolve(10, 1).effects[0]).toEqual(expect.objectContaining({ turn: 11, kind: 'notice', amount: 0 }))
  })

  it('as duas escolhas precisam mobiliar a casa nova em novembro (R$ 3.000)', () => {
    for (const option of [0, 1]) {
      const furniture = resolve(10, option).effects.filter((e) => e.kind === 'cash')
      expect(furniture).toEqual([expect.objectContaining({ turn: 11, amount: -3000 })])
    }
  })

  it('no ano, adiantar sai R$ 450 mais barato que a casa cara (mas pesa no caixa agora)', () => {
    const rent = 1500
    const prepayNet = 4050 - 2 * rent // paga 3, deixa de pagar 2
    const houseExtra = 2 * rent * 0.5 // nov e dez 50% mais caros
    expect(prepayNet).toBe(1050)
    expect(houseExtra).toBe(1500)
    expect(houseExtra - prepayNet).toBe(450)
  })

  it('adiantar não ganha Trabalho em Equipe', () => {
    expect(resolve(10, 0, { perks: TEAMWORK }).cash).toBe(-4050)
  })
})

describe('novembro — a máquina quebrou de novo', () => {
  it('advogado: 40% do que foi pago na máquina', () => {
    expect(lawyerCost({ 4: 1 })).toBe(2172)
    expect(lawyerCost({ 4: 0 })).toBe(2413.44)
    expect(resolve(11, 0, { choices: { 4: 1 } }).cash).toBe(-2172)
  })

  it('advogado ganha R$ 7.500 em dezembro', () => {
    expect(resolve(11, 0).effects).toEqual([expect.objectContaining({ turn: 12, kind: 'cash', amount: 7500 })])
  })

  it('Black Friday: R$ 2.290', () => {
    expect(resolve(11, 1)).toEqual(expect.objectContaining({ cash: -2290, effects: [] }))
  })
})

describe('Trabalho em Equipe nos dilemas', () => {
  it('15% a menos no gasto imediato', () => {
    expect(resolve(6, 0, { perks: TEAMWORK })).toEqual(expect.objectContaining({ cash: -1275, discount: 225 }))
    expect(resolve(4, 1, { perks: TEAMWORK }).cash).toBe(-4615.5)
  })

  it('não vale em parcela', () => {
    expect(resolve(4, 0, { perks: TEAMWORK })).toEqual(expect.objectContaining({ cash: -502.8, discount: 0 }))
    expect(resolve(7, 1, { perks: TEAMWORK }).cash).toBe(-359.85)
  })

  it('não vale nas consequências', () => {
    const r = resolve(3, 0, { perks: TEAMWORK })
    expect(r.effects[0].amount).toBe(-750)
  })

  it('optionPrice arredonda em centavos', () => {
    const option = { cost: 1528.48 }
    expect(optionPrice(option, ctx({ perks: TEAMWORK }))).toBe(1299.21) // 1.528,48 × 0,85 = 1.299,208
  })
})

describe('publicDilemma', () => {
  it('manda título, descrição e preço, sem as consequências', () => {
    const d = publicDilemma(4, ctx())
    expect(d.title).toBe('A máquina de lavar morreu')
    expect(d.options).toEqual([
      expect.objectContaining({ label: 'A', price: 502.8, installment: { amount: 502.8, count: 12 } }),
      expect.objectContaining({ label: 'B', price: 5430, installment: null }),
    ])
    expect(JSON.stringify(d)).not.toMatch(/effects/)
  })

  it('mês sem dilema devolve null', () => {
    expect(publicDilemma(12, ctx())).toBeNull()
  })
})

describe('summarizeEffects', () => {
  it('soma dinheiro e parcelas, separa promoção, demissão e aluguel pago', () => {
    expect(summarizeEffects([
      { kind: 'cash', amount: 537 },
      { kind: 'installment', amount: '-335.20' },
      { kind: 'salary_raise', amount: 700 },
      { kind: 'rent_waived', amount: 0 },
    ])).toEqual({ cash: 201.8, raise: 700, skipSalary: false, rentWaived: true })
  })

  it('demissão marca o salário como não pago', () => {
    expect(summarizeEffects([{ kind: 'no_salary' }]).skipSalary).toBe(true)
  })

  it('aviso não mexe em dinheiro', () => {
    expect(summarizeEffects([{ kind: 'notice', amount: 0 }])).toEqual({ cash: 0, raise: 0, skipSalary: false, rentWaived: false })
  })

  it('sem efeitos, nada muda', () => {
    expect(summarizeEffects()).toEqual({ cash: 0, raise: 0, skipSalary: false, rentWaived: false })
  })
})

describe('installmentDebt', () => {
  it('soma só as parcelas ainda não pagas', () => {
    expect(installmentDebt([
      { kind: 'installment', amount: -335.2, appliedAt: null },
      { kind: 'installment', amount: '-335.20', appliedAt: null },
      { kind: 'installment', amount: -335.2, appliedAt: new Date() },
      { kind: 'cash', amount: -500, appliedAt: null },
    ])).toBe(670.4)
  })

  it('sem parcelas é zero', () => {
    expect(installmentDebt()).toBe(0)
  })
})

describe('choicesTimeline', () => {
  const applied = new Date()

  it('lista os dilemas respondidos em ordem, com escolha e custo', () => {
    const timeline = choicesTimeline([
      { kind: 'dilemma', turn: 3, option: 1, amount: 380 },
      { kind: 'leisure', turn: 2, option: 0, amount: 450 },
      { kind: 'dilemma', turn: 2, option: 0, amount: 750 },
    ], [])
    expect(timeline.map((t) => [t.turn, t.label, t.amount])).toEqual([[2, 'A', 750], [3, 'B', 380]])
    expect(timeline[0]).toEqual(expect.objectContaining({ title: 'Empréstimo para o amigo', choice: 'Emprestar o dinheiro' }))
  })

  it('junta as parcelas numa linha com quantas foram pagas', () => {
    const { effects } = resolve(4, 0)
    const rows = effects.map((e) => ({ ...e, sourceTurn: 4, appliedAt: e.turn <= 12 ? applied : null }))
    const [machine] = choicesTimeline([{ kind: 'dilemma', turn: 4, option: 0, amount: 502.8 }], rows)

    expect(machine.consequences).toEqual([
      { label: 'Parcela: Máquina de lavar', turn: 5, amount: -4022.4, count: 11, applied: 8 },
    ])
  })

  it('consequência que ainda não chegou aparece com valor zero', () => {
    const [loan] = choicesTimeline(
      [{ kind: 'dilemma', turn: 2, option: 0, amount: 750 }],
      [{ sourceTurn: 2, turn: 5, kind: 'cash', amount: 810, label: 'Empréstimo: Devolvido', appliedAt: null }]
    )
    expect(loan.consequences).toEqual([{ label: 'Empréstimo: Devolvido', turn: 5, amount: 0, count: 1, applied: 0 }])
  })
})

// ─── o ano inteiro: caminho prudente × descuidado ─────────────────────────────

describe('o ano inteiro em dilemas', () => {
  const RENT = 1500
  const SALARY = 7000

  // Simula as escolhas e soma o que muda no caixa em relação a um ano sem
  // dilemas: gasto imediato + consequências até dezembro + aluguel que muda +
  // salário perdido + parcelas que sobram como dívida. Salário e promoção
  // contam pelo bruto (antes de INSS e IR).
  function yearOf(picks) {
    const choices = {}
    let total = 0
    let housingCost = RENT
    const effects = []
    for (let turn = 1; turn <= 11; turn++) {
      const r = resolveDilemma(turn, picks[turn - 1], { perks: NO_PERKS, choices, housingCost })
      choices[turn] = picks[turn - 1]
      total += r.cash
      effects.push(...r.effects)
      if (r.updates.housingCost) housingCost = r.updates.housingCost
    }
    for (const e of effects) {
      if (e.turn > 12) continue
      if (['cash', 'installment', 'salary_raise'].includes(e.kind)) total += Number(e.amount)
      if (e.kind === 'rent_waived') total += RENT
      if (e.kind === 'no_salary') total -= SALARY
    }
    total += -(housingCost - RENT) * 2 // casa mais cara em nov e dez
    total -= installmentDebt(effects.filter((e) => e.turn > 12))
    return Math.round(total * 100) / 100
  }

  const PRUDENT = [0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0]
  const CARELESS = [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1]

  it('prudente: -R$ 6.852 no ano', () => {
    // -450 -380 -5430 -450 -1500 -1800 -70 -1200 +3150 (promoção)
    // -4050 +3000 (aluguel dispensado) -3000 (mobília) -2172 +7500 (causa)
    expect(yearOf(PRUDENT)).toBe(-6852)
  })

  it('descuidado: -R$ 26.392,70 no ano', () => {
    // -450 -750 +810 -750 -6033,60 -270 -3000 -2159,10 -7000 (demitido)
    // -1500 (casa cara) -3000 (mobília) -2290
    expect(yearOf(CARELESS)).toBe(-26392.7)
  })

  it('a diferença entre os dois caminhos passa de R$ 19 mil', () => {
    expect(yearOf(PRUDENT) - yearOf(CARELESS)).toBeGreaterThan(19000)
  })

  it('sem a demissão, o descuidado perde uns R$ 19 mil', () => {
    const notFired = [...CARELESS]
    notFired[7] = 0 // pegou o aplicativo em agosto
    expect(yearOf(notFired)).toBeCloseTo(-19462.7, 2)
  })
})
