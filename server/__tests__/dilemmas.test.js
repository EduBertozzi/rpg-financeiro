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
    expect(resolve(1, 0).cash).toBe(-300)
    expect(resolve(1, 1).cash).toBe(-300)
    expect(resolve(1, 0).effects).toEqual([])
    expect(resolve(1, 1).effects).toEqual([])
  })
})

describe('fevereiro — empréstimo para o amigo', () => {
  it('emprestar: -500 agora, +537 na virada para maio', () => {
    const r = resolve(2, 0)
    expect(r.cash).toBe(-500)
    expect(r.effects).toEqual([expect.objectContaining({ turn: 5, kind: 'cash', amount: 537 })])
  })

  it('o amigo devolve 7,4% a mais', () => {
    expect(537 / 500 - 1).toBeCloseTo(0.074, 3)
  })

  it('não emprestar não custa nada', () => {
    expect(resolve(2, 1)).toEqual(expect.objectContaining({ cash: 0, effects: [] }))
  })
})

describe('março — dor de dente', () => {
  it('deixar para depois: grátis agora, canal de R$ 500 em junho', () => {
    const r = resolve(3, 0)
    expect(r.cash).toBe(0)
    expect(r.effects).toEqual([expect.objectContaining({ turn: 6, kind: 'cash', amount: -500 })])
  })

  it('ir ao dentista sai pela metade do canal', () => {
    expect(resolve(3, 1).cash).toBe(-250)
  })
})

describe('abril — máquina de lavar', () => {
  it('parcelado: 12 × 335,20 = 4.022,40', () => {
    expect(machinePaid({ 4: 0 })).toBe(4022.4)
  })

  it('à vista: 3.620', () => {
    expect(machinePaid({ 4: 1 })).toBe(3620)
    expect(resolve(4, 1).cash).toBe(-3620)
  })

  it('parcelar custa 11,1% a mais que pagar à vista', () => {
    expect(4022.4 / 3620 - 1).toBeCloseTo(0.111, 3)
  })

  it('primeira parcela na hora e 11 nas viradas seguintes, até janeiro do outro ano', () => {
    const r = resolve(4, 0)
    expect(r.cash).toBe(-335.2)
    expect(r.effects).toHaveLength(11)
    expect(r.effects[0]).toEqual({ turn: 5, kind: 'installment', amount: -335.2, label: 'Parcela: Máquina de lavar (2/12)' })
    expect(r.effects[10]).toEqual({ turn: 15, kind: 'installment', amount: -335.2, label: 'Parcela: Máquina de lavar (12/12)' })
  })

  it('primeira parcela + todas as marcadas = preço total parcelado', () => {
    const r = resolve(4, 0)
    expect(sum([-r.cash, ...r.effects.map((e) => -e.amount)])).toBe(4022.4)
  })

  it('no ano cabem 9 parcelas (abril a dezembro); 3 sobram como dívida', () => {
    const r = resolve(4, 0)
    const inGame = r.effects.filter((e) => e.turn <= 12)
    const after = r.effects.filter((e) => e.turn > 12)
    expect(1 + inGame.length).toBe(9)
    expect(installmentDebt(after)).toBe(1005.6)
  })

  it('contando a dívida, parcelar nunca sai mais barato que à vista', () => {
    const r = resolve(4, 0)
    const paidInYear = sum([-r.cash, ...r.effects.filter((e) => e.turn <= 12).map((e) => -e.amount)])
    const debt = installmentDebt(r.effects.filter((e) => e.turn > 12))
    expect(paidInYear).toBe(3016.8) // sem a dívida, pareceria mais barato
    expect(sum([paidInYear, debt])).toBeGreaterThan(3620)
  })
})

describe('maio — chave perdida', () => {
  it('arrombar: grátis agora, porta de R$ 300 em junho', () => {
    const r = resolve(5, 0)
    expect(r.cash).toBe(0)
    expect(r.effects).toEqual([expect.objectContaining({ turn: 6, amount: -300 })])
  })

  it('chaveiro: R$ 180 e sem consequência imediata', () => {
    expect(resolve(5, 1)).toEqual(expect.objectContaining({ cash: -180, effects: [] }))
  })
})

describe('junho — esgotamento', () => {
  it('descansar: R$ 1.000 agora', () => {
    expect(resolve(6, 0)).toEqual(expect.objectContaining({ cash: -1000, effects: [] }))
  })

  it('seguir trabalhando: crise de coluna de R$ 2.000 em agosto', () => {
    expect(resolve(6, 1).effects).toEqual([expect.objectContaining({ turn: 8, kind: 'cash', amount: -2000 })])
  })
})

describe('julho — academia', () => {
  it('semestral à vista: R$ 1.200', () => {
    expect(resolve(7, 0).cash).toBe(-1200)
  })

  it('mensal: 6 × 239,90 de julho a dezembro, todas dentro do ano', () => {
    const r = resolve(7, 1)
    expect(r.cash).toBe(-239.9)
    expect(r.effects.map((e) => e.turn)).toEqual([8, 9, 10, 11, 12])
    expect(sum([-r.cash, ...r.effects.map((e) => -e.amount)])).toBe(1439.4)
    expect(installmentDebt(r.effects.filter((e) => e.turn > 12))).toBe(0)
  })
})

describe('agosto — ônibus quebrado', () => {
  it('aplicativo: R$ 45 e sem trava', () => {
    expect(resolve(8, 0)).toEqual(expect.objectContaining({ cash: -45, lockSeconds: 0 }))
  })

  it('a pé: grátis, mas trava a tela por 30 segundos', () => {
    expect(resolve(8, 1)).toEqual(expect.objectContaining({ cash: 0, lockSeconds: 30, effects: [] }))
  })
})

describe('setembro — programa de TV', () => {
  it('participar: R$ 800 e promoção de 10% (R$ 700) nas viradas de out, nov e dez', () => {
    const r = resolve(9, 0)
    expect(r.cash).toBe(-800)
    expect(r.effects.map((e) => [e.turn, e.kind, e.amount])).toEqual([
      [10, 'salary_raise', 700], [11, 'salary_raise', 700], [12, 'salary_raise', 700],
    ])
  })

  it('a promoção paga 2,6 vezes o custo do programa', () => {
    const r = resolve(9, 0)
    expect(sum(r.effects.map((e) => e.amount)) / 800).toBeCloseTo(2.625, 3)
  })

  it('quem perdeu a reunião em maio sobe só 5%', () => {
    const r = resolve(9, 0, { choices: { 5: 1 } })
    expect(r.effects.map((e) => e.amount)).toEqual([350, 350, 350])
    expect(r.effects[0].label).toContain('5%')
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

  it('as duas escolhas precisam mobiliar a casa nova em novembro (R$ 2.000)', () => {
    for (const option of [0, 1]) {
      const furniture = resolve(10, option).effects.filter((e) => e.kind === 'cash')
      expect(furniture).toEqual([expect.objectContaining({ turn: 11, amount: -2000 })])
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
    expect(lawyerCost({ 4: 1 })).toBe(1448)
    expect(lawyerCost({ 4: 0 })).toBe(1608.96)
    expect(resolve(11, 0, { choices: { 4: 1 } }).cash).toBe(-1448)
  })

  it('advogado ganha R$ 5.000 em dezembro', () => {
    expect(resolve(11, 0).effects).toEqual([expect.objectContaining({ turn: 12, kind: 'cash', amount: 5000 })])
  })

  it('Black Friday: R$ 1.528,48', () => {
    expect(resolve(11, 1)).toEqual(expect.objectContaining({ cash: -1528.48, effects: [] }))
  })
})

describe('Trabalho em Equipe nos dilemas', () => {
  it('30% a menos no gasto imediato', () => {
    expect(resolve(6, 0, { perks: TEAMWORK })).toEqual(expect.objectContaining({ cash: -700, discount: 300 }))
    expect(resolve(4, 1, { perks: TEAMWORK }).cash).toBe(-2534)
  })

  it('não vale em parcela', () => {
    expect(resolve(4, 0, { perks: TEAMWORK })).toEqual(expect.objectContaining({ cash: -335.2, discount: 0 }))
    expect(resolve(7, 1, { perks: TEAMWORK }).cash).toBe(-239.9)
  })

  it('não vale nas consequências', () => {
    const r = resolve(3, 0, { perks: TEAMWORK })
    expect(r.effects[0].amount).toBe(-500)
  })

  it('optionPrice arredonda em centavos', () => {
    const option = { cost: 1528.48 }
    expect(optionPrice(option, ctx({ perks: TEAMWORK }))).toBe(1069.94)
  })
})

describe('publicDilemma', () => {
  it('manda título, descrição e preço, sem as consequências', () => {
    const d = publicDilemma(4, ctx())
    expect(d.title).toBe('A máquina de lavar morreu')
    expect(d.options).toEqual([
      expect.objectContaining({ label: 'A', price: 335.2, installment: { amount: 335.2, count: 12 } }),
      expect.objectContaining({ label: 'B', price: 3620, installment: null }),
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
      { kind: 'dilemma', turn: 3, option: 1, amount: 250 },
      { kind: 'leisure', turn: 2, option: 0, amount: 300 },
      { kind: 'dilemma', turn: 2, option: 0, amount: 500 },
    ], [])
    expect(timeline.map((t) => [t.turn, t.label, t.amount])).toEqual([[2, 'A', 500], [3, 'B', 250]])
    expect(timeline[0]).toEqual(expect.objectContaining({ title: 'Empréstimo para o amigo', choice: 'Emprestar o dinheiro' }))
  })

  it('junta as parcelas numa linha com quantas foram pagas', () => {
    const { effects } = resolve(4, 0)
    const rows = effects.map((e) => ({ ...e, sourceTurn: 4, appliedAt: e.turn <= 12 ? applied : null }))
    const [machine] = choicesTimeline([{ kind: 'dilemma', turn: 4, option: 0, amount: 335.2 }], rows)

    expect(machine.consequences).toEqual([
      { label: 'Parcela: Máquina de lavar', turn: 5, amount: -2681.6, count: 11, applied: 8 },
    ])
  })

  it('consequência que ainda não chegou aparece com valor zero', () => {
    const [loan] = choicesTimeline(
      [{ kind: 'dilemma', turn: 2, option: 0, amount: 500 }],
      [{ sourceTurn: 2, turn: 5, kind: 'cash', amount: 537, label: 'Empréstimo: Devolvido', appliedAt: null }]
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
  // salário perdido + parcelas que sobram como dívida.
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

  it('prudente: -R$ 4.913 no ano', () => {
    // -300 -250 -3620 -300 -1000 -1200 -45 -800 +2100 (promoção)
    // -4050 +3000 (aluguel dispensado) -2000 (mobília) -1448 +5000 (causa)
    expect(yearOf(PRUDENT)).toBe(-4913)
  })

  it('descuidado: -R$ 20.433,28 no ano', () => {
    // -300 +37 -500 -4022,40 -180 -2000 -1439,40 -7000 (demitido)
    // -1500 (casa cara) -2000 (mobília) -1528,48
    expect(yearOf(CARELESS)).toBe(-20433.28)
  })

  it('a diferença entre os dois caminhos passa de R$ 15 mil', () => {
    expect(yearOf(PRUDENT) - yearOf(CARELESS)).toBeGreaterThan(15000)
  })

  it('sem a demissão, o descuidado perde uns R$ 13 mil', () => {
    const notFired = [...CARELESS]
    notFired[7] = 0 // pegou o aplicativo em agosto
    expect(yearOf(notFired)).toBeCloseTo(-13478.28, 2)
  })
})
