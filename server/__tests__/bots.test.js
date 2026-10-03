// __tests__/bots.test.js — decisões dos robôs de teste (scripts/bots)
const { BOTS, GIFTS, PATHS, PRUDENT, CARELESS, SHREWD, dilemmaChoice, investable, investPlan, stockOrders, skillOrder, seededRandom, stats } = require('../scripts/bots/strategies')
const { DILEMMAS } = require('../src/utils/dilemmas')

describe('turma de robôs', () => {
  it('12 robôs com nome, jeito de jogar e id único', () => {
    expect(BOTS).toHaveLength(12)
    expect(new Set(BOTS.map((b) => b.id)).size).toBe(12)
    for (const b of BOTS) {
      expect(b.name).toEqual(expect.any(String))
      expect(b.bio.length).toBeGreaterThan(20)
    }
  })

  it('o Seu Cofrinho é o controle: decide bem e não investe', () => {
    const c = BOTS.find((b) => b.id === 'cofrinho')
    expect([c.dilemma, c.invest]).toEqual(['prudente', 'nada'])
  })

  it('só o Dorminhoco não joga', () => {
    expect(BOTS.filter((b) => b.idle).map((b) => b.id)).toEqual(['dorminhoco'])
  })

  it('caminhos de dilema cobrem os 11 meses com opções que existem', () => {
    for (const picks of [PRUDENT, CARELESS, SHREWD]) {
      expect(picks).toHaveLength(11)
      picks.forEach((option, i) => expect(DILEMMAS[i + 1].options[option]).toBeDefined())
    }
  })

  it('três dons e três caminhos', () => {
    expect(GIFTS).toEqual(['frugal', 'agile', 'smart'])
    expect(PATHS).toEqual(['technical', 'communication', 'management'])
  })
})

describe('dilemmaChoice', () => {
  const options = [{ price: 500 }, { price: 0 }]

  it('prudente, descuidado e esperto seguem a lista do mês', () => {
    expect(dilemmaChoice('prudente', 2, options)).toBe(1)
    expect(dilemmaChoice('descuidado', 5, options)).toBe(1)
    expect(dilemmaChoice('esperto', 2, options)).toBe(0)
  })

  it('barato escolhe o menor preço agora (empate fica na primeira)', () => {
    expect(dilemmaChoice('barato', 2, options)).toBe(1)
    expect(dilemmaChoice('barato', 1, [{ price: 300 }, { price: 300 }])).toBe(0)
  })

  it('aleatório usa o sorteio', () => {
    expect(dilemmaChoice('aleatorio', 3, options, () => 0.2)).toBe(0)
    expect(dilemmaChoice('aleatorio', 3, options, () => 0.7)).toBe(1)
  })
})

describe('investable e investPlan', () => {
  it('deixa a reserva na conta', () => {
    expect(investable(10000, 3000, 1)).toBe(7000)
    expect(investable(2000, 3000, 1)).toBe(0)
    expect(investable('500.5', 3000, 0)).toBe(500.5)
  })

  it('não investe migalha', () => {
    expect(investPlan('poupanca', 49, 3)).toEqual([])
  })

  it('o plano nunca investe mais do que tem', () => {
    for (const policy of ['poupanca', 'cdb', 'lca', 'isentos', 'acoes', 'debenture', 'diversificado']) {
      for (const turn of [1, 9, 10, 12]) {
        const total = investPlan(policy, 1000, turn).reduce((s, o) => s + o.amount, 0)
        expect(total).toBeLessThanOrEqual(1000.01)
        expect(total).toBeGreaterThan(0)
      }
    }
  })

  it('debênture só até setembro', () => {
    expect(investPlan('debenture', 1000, 9).some((o) => o.kind === 'debenture')).toBe(true)
    expect(investPlan('debenture', 1000, 10).some((o) => o.kind === 'debenture')).toBe(false)
    expect(investPlan('diversificado', 1000, 11).some((o) => o.kind === 'debenture')).toBe(false)
  })

  it('quem não investe não investe', () => {
    expect(investPlan('nada', 5000, 3)).toEqual([])
  })
})

describe('stockOrders', () => {
  it('divide por igual em ações inteiras', () => {
    expect(stockOrders(1000, [{ id: 1, currentPrice: 15.9 }, { id: 2, currentPrice: 83.79 }])).toEqual([
      { assetId: 1, quantity: 31 }, { assetId: 2, quantity: 5 },
    ])
  })

  it('não compra quando não dá nem uma ação', () => {
    expect(stockOrders(50, [{ id: 2, currentPrice: 83.79 }])).toEqual([])
    expect(stockOrders(1000, [])).toEqual([])
  })
})

describe('skillOrder', () => {
  it('o caminho do robô primeiro, nível por nível, depois os outros', () => {
    const order = skillOrder('management')
    expect(order).toHaveLength(12)
    expect(order.slice(0, 4)).toEqual([1, 2, 3, 4].map((level) => ({ path: 'management', level })))
    expect(order[4]).toEqual({ path: 'technical', level: 1 })
  })
})

describe('seededRandom e stats', () => {
  it('mesma semente, mesma sequência, sempre entre 0 e 1', () => {
    const a = seededRandom(7), b = seededRandom(7)
    for (let i = 0; i < 100; i++) {
      const x = a()
      expect(x).toBe(b())
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
    }
  })

  it('sementes diferentes, sequências diferentes', () => {
    expect(seededRandom(1)()).not.toBe(seededRandom(2)())
  })

  it('estatísticas básicas', () => {
    expect(stats([3, 1, 2, 10, NaN])).toEqual({ n: 4, mean: 4, min: 1, p10: 1, median: 2, p90: 3, max: 10 })
    expect(stats([])).toEqual(expect.objectContaining({ n: 0, mean: 0 }))
  })
})
