// __tests__/skills.perks.test.js — vantagens da Árvore de Habilidades (funções puras)
const {
  PERKS, REDUCED_OVERDRAFT_RATE, perkOf, perksOf, billDiscount, billAmount, rentAmount,
  eventImpact, dilemmaImpact, savingsBonus, percentLabel, stockTipsFor,
} = require('../src/utils/skills')
const { OVERDRAFT_MONTHLY_RATE, overdraftInterest, closeMonth, STOCK_EVENTS } = require('../src/utils/finance')

const node = (path, level) => ({ path, level })
const only = (path, level) => perksOf([node(path, level)])
const all = (path) => [1, 2, 3, 4].map((level) => node(path, level))

const NEUTRAL = {
  salaryBonus: 0,
  salaryBonuses: [],
  extraIncome: 0,
  incomes: [],
  repairDiscount: 0,
  utilitiesDiscount: 0,
  leisureDiscount: 0,
  rentDiscount: 0,
  foodDiscount: 0,
  overdraftRate: 0.08,
  savingsBonusRate: 0,
  stockTips: false,
}

// ─── tabela ───────────────────────────────────────────────────────────────────

describe('tabela de vantagens', () => {
  it('tem os 12 nós da árvore (3 caminhos x 4 níveis)', () => {
    for (const path of ['technical', 'communication', 'management']) {
      expect(Object.keys(PERKS[path])).toEqual(['1', '2', '3', '4'])
    }
  })

  it('usa os mesmos nomes do seed', () => {
    expect(perkOf('technical', 1).name).toBe('Fundamentos e Lógica')
    expect(perkOf('technical', 4).name).toBe('Inovação e Otimização')
    expect(perkOf('communication', 2).name).toBe('Trabalho em Equipe')
    expect(perkOf('management', 3).name).toBe('Visão de Mercado')
  })

  it('todo nó tem um texto de vantagem para mostrar ao jogador', () => {
    for (const path of Object.keys(PERKS)) {
      for (const level of [1, 2, 3, 4]) expect(typeof perkOf(path, level).perk).toBe('string')
    }
  })

  it('nó inexistente não tem vantagem', () => {
    expect(perkOf('economy', 1)).toBeNull()
    expect(perkOf('technical', 5)).toBeNull()
    expect(perkOf(undefined, undefined)).toBeNull()
  })
})

// ─── nada desbloqueado ────────────────────────────────────────────────────────

describe('perksOf sem habilidades', () => {
  it('sem argumento é tudo neutro', () => {
    expect(perksOf()).toEqual(NEUTRAL)
  })

  it('lista vazia, null ou undefined é tudo neutro', () => {
    expect(perksOf([])).toEqual(NEUTRAL)
    expect(perksOf(null)).toEqual(NEUTRAL)
    expect(perksOf(undefined)).toEqual(NEUTRAL)
  })

  it('taxa do cheque especial neutra é a oficial de 8%', () => {
    expect(perksOf().overdraftRate).toBe(OVERDRAFT_MONTHLY_RATE)
  })

  it('ignora nós desconhecidos (caminhos antigos)', () => {
    expect(perksOf([node('economy', 1), node('investment', 2), null])).toEqual(NEUTRAL)
  })

  it('cada chamada devolve listas novas (não compartilha estado)', () => {
    const a = perksOf()
    a.incomes.push({ amount: 1 })
    expect(perksOf().incomes).toEqual([])
  })
})

// ─── formato da entrada ───────────────────────────────────────────────────────

describe('perksOf aceita nós ou linhas de CharacterSkill', () => {
  it('aceita { skillNode: { path, level } }', () => {
    const p = perksOf([{ skillNodeId: 3, skillNode: { id: 3, path: 'technical', level: 3, name: 'x' } }])
    expect(p.salaryBonus).toBe(400)
  })

  it('aceita { path, level } direto', () => {
    expect(perksOf([node('technical', 3)]).salaryBonus).toBe(400)
  })
})

// ─── Técnico ──────────────────────────────────────────────────────────────────

describe('Técnico (renda garantida)', () => {
  it('L1 Fundamentos e Lógica: +R$ 200 de freela por mês', () => {
    const p = only('technical', 1)
    expect(p.extraIncome).toBe(200)
    expect(p.incomes).toEqual([{ label: 'Freela', skill: 'Fundamentos e Lógica', amount: 200 }])
    expect(p.salaryBonus).toBe(0)
  })

  it('L2 Resolução de Problemas: imprevistos de casa pela metade', () => {
    const p = only('technical', 2)
    expect(p.repairDiscount).toBe(0.5)
    expect(p.extraIncome).toBe(0)
  })

  it('L3 Pensamento Analítico Avançado: salário +R$ 400', () => {
    const p = only('technical', 3)
    expect(p.salaryBonus).toBe(400)
    expect(p.salaryBonuses).toEqual([{ skill: 'Pensamento Analítico Avançado', amount: 400 }])
  })

  it('L4 Inovação e Otimização: +R$ 400 de projeto paralelo', () => {
    const p = only('technical', 4)
    expect(p.extraIncome).toBe(400)
    expect(p.incomes).toEqual([{ label: 'Projeto paralelo', skill: 'Inovação e Otimização', amount: 400 }])
  })

  it('caminho completo: +R$ 400 de salário e R$ 600 de renda extra', () => {
    const p = perksOf(all('technical'))
    expect(p.salaryBonus).toBe(400)
    expect(p.extraIncome).toBe(600)
    expect(p.incomes.map((i) => i.label)).toEqual(['Freela', 'Projeto paralelo'])
    expect(p.repairDiscount).toBe(0.5)
  })
})

// ─── Comunicação ──────────────────────────────────────────────────────────────

describe('Comunicação (contas mais baratas)', () => {
  it('L1 Comunicação Básica: água/luz e internet 30% mais baratas', () => {
    expect(only('communication', 1).utilitiesDiscount).toBe(0.3)
    expect(only('communication', 1).foodDiscount).toBe(0)
  })

  it('L2 Trabalho em Equipe: lazer e dilemas 30% mais baratos', () => {
    expect(only('communication', 2).leisureDiscount).toBe(0.3)
  })

  it('L3 Negociação e Liderança: aluguel 15% mais barato', () => {
    expect(only('communication', 3).rentDiscount).toBe(0.15)
  })

  it('L4 Liderança Estratégica: salário +R$ 400', () => {
    const p = only('communication', 4)
    expect(p.salaryBonus).toBe(400)
    expect(p.salaryBonuses).toEqual([{ skill: 'Liderança Estratégica', amount: 400 }])
  })

  it('Técnico L3 + Comunicação L4 somam R$ 800 de salário, em duas linhas', () => {
    const p = perksOf([node('technical', 3), node('communication', 4)])
    expect(p.salaryBonus).toBe(800)
    expect(p.salaryBonuses).toHaveLength(2)
  })
})

// ─── Gestão ───────────────────────────────────────────────────────────────────

describe('Gestão (rende sobre o que você guarda)', () => {
  it('L1 Organização Financeira: Mercadinho 15% mais barato', () => {
    expect(only('management', 1).foodDiscount).toBe(0.15)
  })

  it('L2 Planejamento e Produtividade: cheque especial a 4% e +0,8% nas caixinhas', () => {
    const p = only('management', 2)
    expect(p.overdraftRate).toBe(0.04)
    expect(p.overdraftRate).toBe(REDUCED_OVERDRAFT_RATE)
    expect(p.savingsBonusRate).toBe(0.008)
  })

  it('L3 Visão de Mercado: +1,3% nas caixinhas e dica das ações', () => {
    const p = only('management', 3)
    expect(p.savingsBonusRate).toBe(0.013)
    expect(p.stockTips).toBe(true)
    expect(p.overdraftRate).toBe(0.08) // sozinho não mexe no cheque especial
  })

  it('L4 Estratégia e Empreendedorismo: +1,7% nas caixinhas', () => {
    expect(only('management', 4).savingsBonusRate).toBe(0.017)
  })

  it('L2 + L3 = 2,1%', () => {
    expect(perksOf([node('management', 2), node('management', 3)]).savingsBonusRate).toBe(0.021)
  })

  it('L2 + L3 + L4 = 3,8% exatos (sem lixo de ponto flutuante)', () => {
    expect(perksOf(all('management')).savingsBonusRate).toBe(0.038)
  })

  it('caminho completo: 4% no cheque especial, 15% no mercado e dica de ações', () => {
    const p = perksOf(all('management'))
    expect(p.overdraftRate).toBe(0.04)
    expect(p.foodDiscount).toBe(0.15)
    expect(p.stockTips).toBe(true)
  })
})

// ─── tudo junto ───────────────────────────────────────────────────────────────

describe('árvore inteira', () => {
  const p = perksOf([...all('technical'), ...all('communication'), ...all('management')])

  it('junta todas as vantagens', () => {
    expect(p).toEqual({
      salaryBonus: 800,
      salaryBonuses: [
        { skill: 'Pensamento Analítico Avançado', amount: 400 },
        { skill: 'Liderança Estratégica', amount: 400 },
      ],
      extraIncome: 600,
      incomes: [
        { label: 'Freela', skill: 'Fundamentos e Lógica', amount: 200 },
        { label: 'Projeto paralelo', skill: 'Inovação e Otimização', amount: 400 },
      ],
      repairDiscount: 0.5,
      utilitiesDiscount: 0.3,
      leisureDiscount: 0.3,
      rentDiscount: 0.15,
      foodDiscount: 0.15,
      overdraftRate: 0.04,
      savingsBonusRate: 0.038,
      stockTips: true,
    })
  })

  it('a ordem de desbloqueio não muda o resultado', () => {
    const shuffled = [...all('management'), ...all('communication'), ...all('technical')].reverse()
    const q = perksOf(shuffled)
    expect(q.salaryBonus).toBe(800)
    expect(q.extraIncome).toBe(600)
    expect(q.savingsBonusRate).toBe(0.038)
    expect(q.overdraftRate).toBe(0.04)
  })

  it('nó repetido não soma duas vezes os descontos percentuais', () => {
    const q = perksOf([node('communication', 1), node('communication', 1)])
    expect(q.utilitiesDiscount).toBe(0.3)
  })
})

// ─── contas do mês ────────────────────────────────────────────────────────────

describe('billAmount', () => {
  const none = perksOf()
  const comm = only('communication', 1)
  const mgmt = only('management', 1)
  const both = perksOf([node('communication', 1), node('management', 1)])

  it('sem habilidade cobra o valor cheio, em centavos', () => {
    expect(billAmount('food', 1000, none)).toBe(1000)
    expect(billAmount('utilities', 250, none)).toBe(250)
    expect(billAmount('transport', '249.995', none)).toBe(250)
  })

  it('Mercadinho 15% mais barato com Organização Financeira', () => {
    expect(billAmount('food', 1000, mgmt)).toBe(850)
    expect(billAmount('food', 600, mgmt)).toBe(510)
  })

  it('Mercadinho não muda com Comunicação Básica', () => {
    expect(billAmount('food', 1000, comm)).toBe(1000)
  })

  it('Água e Luz 30% mais barata com Comunicação Básica', () => {
    expect(billAmount('utilities', 250, comm)).toBe(175)
    expect(billAmount('utilities', 300, comm)).toBe(210)
  })

  it('Internet e Celular 30% mais barata com Comunicação Básica', () => {
    expect(billAmount('transport', 250, comm)).toBe(175)
    expect(billAmount('transport', 150, comm)).toBe(105)
  })

  it('Água e Luz e Internet não mudam com Organização Financeira', () => {
    expect(billAmount('utilities', 250, mgmt)).toBe(250)
    expect(billAmount('transport', 250, mgmt)).toBe(250)
  })

  it('com as duas, cada conta tem só o seu desconto', () => {
    expect(billAmount('food', 1000, both)).toBe(850)
    expect(billAmount('utilities', 250, both)).toBe(175)
    expect(billAmount('transport', 250, both)).toBe(175)
  })

  it('arredonda para centavos', () => {
    expect(billAmount('food', 333.33, mgmt)).toBe(283.33) // 283.3305
    expect(billAmount('utilities', 199.99, comm)).toBe(139.99) // 139.993
    expect(billAmount('transport', 0.07, comm)).toBe(0.05) // 0.049
  })

  it('aceita valores Decimal/string do Prisma', () => {
    expect(billAmount('food', '1200.00', mgmt)).toBe(1020)
  })

  it('tipo desconhecido não tem desconto', () => {
    expect(billDiscount('aluguel', both)).toBe(0)
    expect(billAmount('aluguel', 500, both)).toBe(500)
  })

  it('billDiscount devolve a fração de cada tipo', () => {
    expect(billDiscount('food', both)).toBe(0.15)
    expect(billDiscount('utilities', both)).toBe(0.3)
    expect(billDiscount('transport', both)).toBe(0.3)
    expect(billDiscount('food', none)).toBe(0)
  })
})

// ─── aluguel ──────────────────────────────────────────────────────────────────

describe('rentAmount', () => {
  it('sem Negociação e Liderança é o aluguel cheio', () => {
    expect(rentAmount(1000, perksOf())).toBe(1000)
    expect(rentAmount('1500.50', perksOf())).toBe(1500.5)
  })

  it('com Negociação e Liderança é 15% mais barato', () => {
    const p = only('communication', 3)
    expect(rentAmount(1000, p)).toBe(850)
    expect(rentAmount(1500, p)).toBe(1275)
    expect(rentAmount(1234.56, p)).toBe(1049.38) // 1049.376
  })
})

// ─── imprevistos ──────────────────────────────────────────────────────────────

describe('eventImpact', () => {
  const resistencia = { title: 'Resistência Queimada', cashImpact: -200, repair: true }
  const infiltracao = { title: 'Infiltração Grave', cashImpact: -3500, repair: true }
  const vet = { title: 'Emergência Veterinária', cashImpact: -600 }
  const bonus = { title: 'Bônus no Trabalho', cashImpact: 1500 }
  const tech2 = only('technical', 2)

  it('sem habilidade o imprevisto custa o valor cheio', () => {
    expect(eventImpact(resistencia, perksOf())).toBe(-200)
    expect(eventImpact(infiltracao, perksOf())).toBe(-3500)
  })

  it('Resistência Queimada custa metade: -100', () => {
    expect(eventImpact(resistencia, tech2)).toBe(-100)
  })

  it('Infiltração Grave custa metade: -1750', () => {
    expect(eventImpact(infiltracao, tech2)).toBe(-1750)
  })

  it('imprevistos que não são de casa não mudam', () => {
    expect(eventImpact(vet, tech2)).toBe(-600)
    expect(eventImpact(bonus, tech2)).toBe(1500)
  })

  it('arredonda para centavos', () => {
    expect(eventImpact({ cashImpact: -0.03, repair: true }, tech2)).toBe(-0.01) // -0.015
    expect(eventImpact({ cashImpact: -200.02, repair: true }, tech2)).toBe(-100.01)
  })
})

// ─── dilemas ──────────────────────────────────────────────────────────────────

describe('dilemmaImpact', () => {
  const team = only('communication', 2)

  it('sem Trabalho em Equipe o custo é cheio', () => {
    expect(dilemmaImpact(-100, perksOf())).toBe(-100)
    expect(dilemmaImpact(-1500, perksOf())).toBe(-1500)
  })

  it('com Trabalho em Equipe custos ficam 30% menores', () => {
    expect(dilemmaImpact(-100, team)).toBe(-70)
    expect(dilemmaImpact(-150, team)).toBe(-105)
    expect(dilemmaImpact(-1500, team)).toBe(-1050)
    expect(dilemmaImpact(-50, team)).toBe(-35)
    expect(dilemmaImpact(-1000, team)).toBe(-700)
  })

  it('ganhos não mudam', () => {
    expect(dilemmaImpact(300, team)).toBe(300)
    expect(dilemmaImpact(6000, team)).toBe(6000)
  })

  it('zero continua zero', () => {
    expect(dilemmaImpact(0, team)).toBe(0)
  })

  it('arredonda para centavos', () => {
    expect(dilemmaImpact(-33.33, team)).toBe(-23.33) // -23.331
    expect(dilemmaImpact(-0.05, team)).toBe(-0.03) // -0.035
  })

  it('aceita string', () => {
    expect(dilemmaImpact('-200', team)).toBe(-140)
    expect(dilemmaImpact('200', team)).toBe(200)
  })
})

// ─── bônus das caixinhas ──────────────────────────────────────────────────────

describe('savingsBonus', () => {
  it('sem Gestão não há bônus', () => {
    expect(savingsBonus(10000, perksOf())).toBe(0)
  })

  it('0,8% com Planejamento e Produtividade', () => {
    expect(savingsBonus(10000, only('management', 2))).toBe(80)
  })

  it('1,3% com Visão de Mercado', () => {
    expect(savingsBonus(10000, only('management', 3))).toBe(130)
  })

  it('1,7% com Estratégia e Empreendedorismo', () => {
    expect(savingsBonus(10000, only('management', 4))).toBe(170)
  })

  it('L2+L3 = 2,1%', () => {
    expect(savingsBonus(10000, perksOf([node('management', 2), node('management', 3)]))).toBe(210)
  })

  it('L2+L3+L4 = 3,8%', () => {
    expect(savingsBonus(10000, perksOf(all('management')))).toBe(380)
    expect(savingsBonus(8230.5, perksOf(all('management')))).toBe(312.76) // 312.759
  })

  it('arredonda para centavos', () => {
    expect(savingsBonus(1234.56, only('management', 2))).toBe(9.88) // 9.87648
    expect(savingsBonus(0.5, only('management', 2))).toBe(0) // 0.004
  })

  it('caixinha vazia ou negativa não rende bônus', () => {
    expect(savingsBonus(0, perksOf(all('management')))).toBe(0)
    expect(savingsBonus(-100, perksOf(all('management')))).toBe(0)
  })

  it('aceita string', () => {
    expect(savingsBonus('5000', only('management', 4))).toBe(85)
  })
})

// ─── cheque especial ──────────────────────────────────────────────────────────

describe('cheque especial com Planejamento e Produtividade', () => {
  const rate = only('management', 2).overdraftRate

  it('overdraftInterest sem taxa continua em 8%', () => {
    expect(overdraftInterest(-1000)).toBe(80)
  })

  it('overdraftInterest com a taxa da habilidade cobra 4%', () => {
    expect(overdraftInterest(-1000, rate)).toBe(40)
    expect(overdraftInterest(-2500.5, rate)).toBe(100.02)
  })

  it('saldo positivo não paga juros em nenhuma taxa', () => {
    expect(overdraftInterest(500, rate)).toBe(0)
    expect(overdraftInterest(0, rate)).toBe(0)
  })

  it('closeMonth usa a taxa passada', () => {
    expect(closeMonth(-1000, 1000, 0, 7000, rate)).toEqual({ opening: -1000, interest: 40, closing: 4960, inOverdraft: false })
  })

  it('closeMonth sem taxa mantém os 8%', () => {
    expect(closeMonth(-1000, 1000, 0, 7000)).toEqual({ opening: -1000, interest: 80, closing: 4920, inOverdraft: false })
  })

  it('metade dos juros em relação ao cheque especial normal', () => {
    for (const cash of [-100, -999.99, -12345.67]) {
      const normal = overdraftInterest(cash)
      const reduced = overdraftInterest(cash, rate)
      expect(Math.abs(reduced - normal / 2)).toBeLessThanOrEqual(0.01)
    }
  })
})

// ─── formato ──────────────────────────────────────────────────────────────────

describe('percentLabel', () => {
  it('formata taxas no padrão brasileiro', () => {
    expect(percentLabel(0.008)).toBe('0,8%')
    expect(percentLabel(0.021)).toBe('2,1%')
    expect(percentLabel(0.038)).toBe('3,8%')
    expect(percentLabel(0.006)).toBe('0,6%')
    expect(percentLabel(0.015)).toBe('1,5%')
    expect(percentLabel(0.027)).toBe('2,7%')
    expect(percentLabel(0.08)).toBe('8%')
    expect(percentLabel(0.04)).toBe('4%')
    expect(percentLabel(0.2)).toBe('20%')
    expect(percentLabel(0.15)).toBe('15%')
    expect(percentLabel(0.35)).toBe('35%')
  })
})

// ─── dica de ações ────────────────────────────────────────────────────────────

describe('stockTipsFor', () => {
  it('no turno 2 avisa que VALE3 vai subir 40% no turno 3', () => {
    expect(stockTipsFor(2)).toEqual([{
      ticker: 'VALE3', turn: 3, direction: 'up', change: 0.4,
      text: 'VALE3 deve subir cerca de 40% no próximo mês',
    }])
  })

  it('no turno 9 avisa que PETR4 vai cair 35% no turno 10', () => {
    expect(stockTipsFor(9)).toEqual([{
      ticker: 'PETR4', turn: 10, direction: 'down', change: -0.35,
      text: 'PETR4 deve cair cerca de 35% no próximo mês',
    }])
  })

  it('sem evento no próximo mês não há dica', () => {
    expect(stockTipsFor(0)).toEqual([])
    expect(stockTipsFor(3)).toEqual([]) // o evento da VALE3 já passou
    expect(stockTipsFor(10)).toEqual([])
  })

  it('a dica bate com os STOCK_EVENTS oficiais', () => {
    for (const [ticker, e] of Object.entries(STOCK_EVENTS)) {
      const tips = stockTipsFor(e.turn - 1)
      expect(tips.map((t) => t.ticker)).toContain(ticker)
    }
  })

  it('aceita turno como string e tabela de eventos própria', () => {
    const events = { ABEV3: { turn: 5, change: 0.1 }, AMER3: { turn: 5, change: -0.5 } }
    const tips = stockTipsFor('4', events)
    expect(tips.map((t) => [t.ticker, t.direction])).toEqual([['ABEV3', 'up'], ['AMER3', 'down']])
    expect(tips[1].text).toBe('AMER3 deve cair cerca de 50% no próximo mês')
  })
})
