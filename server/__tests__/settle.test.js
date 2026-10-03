// __tests__/settle.test.js — o que ficou em aberto quando o mês fecha
const { BILLS, LATE_FEE, LATE_INTEREST, lateBillAmount, pendingForMonth } = require('../src/utils/settle')
const { INERTIA, inertiaOption, DILEMMAS } = require('../src/utils/dilemmas')

describe('conta atrasada', () => {
  it('multa de 2% e juros de 1%', () => {
    expect(LATE_FEE).toBe(0.02)
    expect(LATE_INTEREST).toBe(0.01)
    expect(lateBillAmount(1000)).toBe(1030)
    expect(lateBillAmount('250')).toBe(257.5)
  })

  it('arredonda em centavos', () => {
    expect(lateBillAmount(175)).toBe(180.25)
    expect(lateBillAmount(333.33)).toBe(343.33)
  })

  it('as três contas do mês', () => {
    expect(Object.keys(BILLS)).toEqual(['food', 'utilities', 'transport'])
  })
})

describe('pendingForMonth', () => {
  const paid = (turn, label) => ({ turn, description: `Conta: ${label} — Pago (-R$ 1)` })

  it('nada feito: três contas, lazer e dilema', () => {
    expect(pendingForMonth({ turn: 3, hasLeisure: true, hasDilemma: true })).toEqual({
      bills: ['food', 'utilities', 'transport'], leisure: true, dilemma: true,
    })
  })

  it('tudo feito no mês', () => {
    expect(pendingForMonth({
      turn: 3, hasLeisure: true, hasDilemma: true,
      logs: [paid(3, 'Mercadinho'), paid(3, 'Água e Luz'), paid(3, 'Internet e Celular')],
      choices: [{ turn: 3, kind: 'leisure' }, { turn: 3, kind: 'dilemma' }],
    })).toEqual({ bills: [], leisure: false, dilemma: false })
  })

  it('o que foi feito em outro mês não conta', () => {
    const p = pendingForMonth({ turn: 3, hasLeisure: true, hasDilemma: true, logs: [paid(2, 'Mercadinho')], choices: [{ turn: 2, kind: 'leisure' }] })
    expect(p.bills).toContain('food')
    expect(p.leisure).toBe(true)
  })

  it('conta atrasada de antes não vale como paga', () => {
    const p = pendingForMonth({ turn: 3, logs: [{ turn: 3, description: 'Conta atrasada: Mercadinho — …' }] })
    expect(p.bills).toContain('food')
  })

  it('mês sem dilema (dezembro) não cobra dilema', () => {
    expect(pendingForMonth({ turn: 12, hasLeisure: true, hasDilemma: false }).dilemma).toBe(false)
  })
})

describe('inércia dos dilemas', () => {
  it('todo dilema tem uma opção de inércia válida', () => {
    for (const [turn, d] of Object.entries(DILEMMAS)) {
      expect(d.options[inertiaOption(turn)]).toBeDefined()
    }
    expect(Object.keys(INERTIA)).toEqual(Object.keys(DILEMMAS))
  })

  it('é a opção de quem não fez nada', () => {
    expect(DILEMMAS[2].options[inertiaOption(2)].text).toBe('Não emprestar')
    expect(DILEMMAS[3].options[inertiaOption(3)].text).toBe('Deixar para depois')
    expect(DILEMMAS[4].options[inertiaOption(4)].text).toMatch(/^Parcelar/)
    expect(DILEMMAS[9].options[inertiaOption(9)].text).toBe('Não participar')
  })
})
