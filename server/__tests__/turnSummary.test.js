// __tests__/turnSummary.test.js — o cartão "virada do mês"
process.env.JWT_SECRET = 'test-secret'
const request = require('supertest')
const app = require('../src/app')
const { prismaMock } = require('@prisma/client')
const { makeToken, authHeader } = require('./helpers/auth')
const { turnSummary, eventTitles, salaryLine, payslipDeductions } = require('../src/utils/turnSummary')
const { payslip } = require('../src/utils/finance')

beforeEach(() => jest.clearAllMocks())

const log = (turn, description, cashImpact) => ({ turn, description, cashImpact })

describe('turnSummary', () => {
  const logs = [
    log(5, 'Salário: Depósito do mês (+R$ 7000.00)', 7000),
    log(5, 'Freela: Fundamentos e Lógica (+R$ 200.00)', 200),
    log(5, 'Empréstimo: Seu amigo devolveu o dinheiro com um agradecimento (+R$ 537.00)', 537),
    log(5, 'Parcela: Máquina de lavar (2/12) (-R$ 335.20)', '-335.20'),
    log(5, 'Aluguel: Casa — Pago (-R$ 1500)', -1500),
    log(5, 'Celular no chão: Na correria do trabalho o celular caiu e a tela quebrou.', -450),
    log(5, 'Conta: Mercadinho — Pago (-R$ 1000)', -1000), // ação do jogador no mês: fora
    log(4, 'Conta atrasada: Água e Luz — R$ 250.00 + 2% de multa e 1% de juros (-R$ 257.50)', -257.5),
    log(4, 'Lazer: Ovos de Páscoa (-R$ 350.00)', -350), // lazer pago em dia: fora
  ]
  const labels = ['Empréstimo: Seu amigo devolveu o dinheiro com um agradecimento', 'Parcela: Máquina de lavar (2/12)']
  const s = turnSummary({ turn: 5, logs, effectLabels: labels })

  it('o imprevisto do mês em destaque', () => {
    expect(s.events).toEqual([{ title: 'Celular no chão', description: 'Na correria do trabalho o celular caiu e a tela quebrou.', amount: -450, quiet: false }])
  })

  it('consequências das escolhas, com título e texto separados', () => {
    expect(s.consequences).toEqual([
      { title: 'Empréstimo', description: 'Seu amigo devolveu o dinheiro com um agradecimento', amount: 537 },
      { title: 'Parcela', description: 'Máquina de lavar (2/12)', amount: -335.2 },
    ])
  })

  it('o que ficou em aberto no mês anterior', () => {
    expect(s.late).toEqual([expect.objectContaining({ amount: -257.5 })])
  })

  it('dinheiro de sempre separado', () => {
    expect(s.money).toEqual({ salary: 7000, inss: 0, ir: 0, extras: 200, rent: -1500, interest: 0 })
  })

  it('saldo da virada soma tudo, sem as ações do jogador no mês', () => {
    expect(s.net).toBe(7000 + 200 + 537 - 335.2 - 1500 - 450 - 257.5)
  })

  it('mês tranquilo aparece como tranquilo', () => {
    const q = turnSummary({ turn: 2, logs: [log(2, 'Nenhum imprevisto: Mês tranquilo, sem surpresas.', 0)] })
    expect(q.events).toEqual([expect.objectContaining({ quiet: true, amount: 0 })])
  })

  it('dezembro traz os dois eventos fixos', () => {
    const d = turnSummary({ turn: 12, logs: [log(12, '13º salário: Caiu o décimo terceiro.', 7000), log(12, 'Gastos de fim de ano: Confraternizações.', -550)] })
    expect(d.events.map((e) => e.title)).toEqual(['13º salário', 'Gastos de fim de ano'])
  })

  it('janeiro: salário e aluguel do primeiro mês, sem imprevisto', () => {
    const j = turnSummary({ turn: 1, logs: [log(1, 'Salário: Depósito do mês (+R$ 7000.00)', 7000), log(1, 'Aluguel: Casa — Pago (-R$ 1500)', -1500)] })
    expect(j.events).toEqual([])
    expect(j.money).toEqual({ salary: 7000, inss: 0, ir: 0, extras: 0, rent: -1500, interest: 0 })
    expect(j.net).toBe(5500)
    expect(eventTitles(1)).toEqual(['Nenhum imprevisto'])
  })

  it('janeiro com holerite: bruto, INSS, IR e aluguel; o saldo é o líquido menos o aluguel', () => {
    const j = turnSummary({
      turn: 1,
      logs: [
        log(1, 'Salário (bruto): Depósito do mês (+R$ 7000.00)', 7000),
        log(1, 'INSS: Desconto da Previdência Social (-R$ 781.51)', -781.51),
        log(1, 'Imposto de Renda na fonte: Desconto do mês (-R$ 754.75)', -754.75),
        log(1, 'Aluguel: Casa — Pago (-R$ 2100)', -2100),
      ],
    })
    expect(j.money).toEqual({ salary: 7000, inss: -781.51, ir: -754.75, extras: 0, rent: -2100, interest: 0 })
    expect(j.net).toBe(3363.74)
    expect(j.events).toEqual([])
    expect(j.consequences).toEqual([])
  })

  it('aluguel adiantado entra como consequência, não como aluguel', () => {
    const a = turnSummary({ turn: 11, logs: [log(11, 'Aluguel: Já pago adiantado', 0)], effectLabels: ['Aluguel: Já pago adiantado'] })
    expect(a.consequences).toHaveLength(1)
    expect(a.money.rent).toBe(0)
  })

  it('dilema sem resposta e lazer cobrado na virada também contam como em aberto', () => {
    const l = turnSummary({
      turn: 4,
      logs: [log(3, 'Dilema "Dor de dente" — Sem resposta: Deixar para depois. A dor passou… por enquanto.', 0), log(3, 'Lazer: Compras (-R$ 200.00) — o mês fechou sem lazer escolhido', -200)],
    })
    expect(l.late.map((x) => x.amount)).toEqual([0, -200])
  })
})

describe('GET /api/v1/characters/:id/turn-summary/:turn', () => {
  const TOKEN = makeToken({ id: 'user-1' })

  it('busca o extrato do mês e do anterior e as consequências aplicadas na virada', async () => {
    prismaMock.character.findUnique.mockResolvedValue({ id: 'c1', userId: 'user-1', eventLog: [log(5, 'Salário: Depósito', 7000)], effects: [] })
    const res = await request(app).get('/api/v1/characters/c1/turn-summary/5').set(authHeader(TOKEN))

    expect(res.status).toBe(200)
    expect(res.body.money.salary).toBe(7000)
    const { include } = prismaMock.character.findUnique.mock.calls[0][0]
    expect(include.eventLog).toEqual({ where: { turn: { in: [4, 5] } } })
    expect(include.effects).toEqual({ where: { turn: 5, appliedAt: { not: null } } })
  })

  it('403 para personagem de outro usuário', async () => {
    prismaMock.character.findUnique.mockResolvedValue({ id: 'c1', userId: 'outro', eventLog: [], effects: [] })
    expect((await request(app).get('/api/v1/characters/c1/turn-summary/5').set(authHeader(TOKEN))).status).toBe(403)
  })

  it('400 para mês inválido', async () => {
    expect((await request(app).get('/api/v1/characters/c1/turn-summary/0').set(authHeader(TOKEN))).status).toBe(400)
  })
})

describe('turnSummary — debêntures na virada', () => {
  const log = (turn, description, cashImpact = 0) => ({ turn, description, cashImpact })

  it('debênture que venceu entra no resumo e no saldo da virada', () => {
    const s = turnSummary({ turn: 6, logs: [log(6, 'Debênture: Milhas Fácil venceu! Você recebeu R$ 5500.00.', 5500), log(6, 'Salário: Depósito do mês (+R$ 7000.00)', 7000)] })
    expect(s.investments).toEqual([{ description: 'Milhas Fácil venceu! Você recebeu R$ 5500.00.', amount: 5500 }])
    expect(s.net).toBe(12500)
  })

  it('calote aparece no resumo sem mexer no saldo (o dinheiro já tinha saído na compra)', () => {
    const s = turnSummary({ turn: 6, logs: [log(6, 'Debênture: Milhas Fácil entrou em calote! Você perdeu os R$ 5000.00 aplicados.', 0)] })
    expect(s.investments).toHaveLength(1)
    expect(s.net).toBe(0)
  })
})

describe('turnSummary — holerite (salário bruto, INSS e IR)', () => {
  const log = (turn, description, cashImpact) => ({ turn, description, cashImpact })
  const slip = payslip(7000)

  it('salaryLine escreve o bruto com o prefixo "Salário (bruto):"', () => {
    expect(salaryLine(7000)).toBe('Salário (bruto): Depósito do mês (+R$ 7000.00)')
    expect(salaryLine(7200.5)).toBe('Salário (bruto): Depósito do mês (+R$ 7200.50)')
  })

  it('payslipDeductions gera uma linha de INSS e uma de IR, negativas', () => {
    expect(payslipDeductions(slip)).toEqual([
      { amount: -781.51, description: 'INSS: Desconto da Previdência Social (-R$ 781.51)' },
      { amount: -754.75, description: 'Imposto de Renda na fonte: Desconto do mês (-R$ 754.75)' },
    ])
  })

  it('payslipDeductions omite descontos zerados', () => {
    expect(payslipDeductions(payslip(0))).toEqual([])
    // até R$ 5.000 não há IR: só a linha do INSS
    const low = payslipDeductions(payslip(3000))
    expect(low).toHaveLength(1)
    expect(low[0].description).toMatch(/^INSS:/)
  })

  it('as linhas do holerite vão para salary, inss e ir; o net é a variação do caixa', () => {
    const logs = [
      log(6, salaryLine(7000), 7000),
      log(6, 'Bônus salarial: Pensamento Analítico Avançado (+R$ 200.00)', 200),
      log(6, 'Trabalho extra: Fundamentos e Lógica (+R$ 100.00)', 100),
      ...payslipDeductions(payslip(7200)).map((l) => log(6, l.description, l.amount)),
      log(6, 'Aluguel: Casa — Pago (-R$ 2100)', -2100),
      log(6, 'Cheque especial: Juros de 8% sobre R$ 100.00 (-R$ 8.00)', -8),
    ]
    const s = turnSummary({ turn: 6, logs })
    expect(s.money).toEqual({ salary: 7000, inss: -809.51, ir: -828.68, extras: 300, rent: -2100, interest: -8 })
    const sumOfLines = logs.reduce((acc, l) => acc + l.cashImpact, 0)
    expect(s.net).toBeCloseTo(sumOfLines, 2)
    // bruto + bônus − INSS − IR = líquido do holerite de R$ 7.200
    expect(s.money.salary + 200 + s.money.inss + s.money.ir).toBeCloseTo(payslip(7200).net, 2)
    expect(s.net).toBeCloseTo(payslip(7200).net + 100 - 2100 - 8, 2)
  })

  it('o net soma todas as linhas, inclusive as que não são do holerite', () => {
    const logs = [
      log(5, salaryLine(7000), 7000),
      ...payslipDeductions(slip).map((l) => log(5, l.description, l.amount)),
      log(5, 'Parcela: Máquina de lavar (2/12) (-R$ 502.80)', -502.8),
      log(5, 'Aluguel: Casa — Pago (-R$ 2100)', -2100),
      log(5, 'Celular no chão: Na correria do trabalho o celular caiu e a tela quebrou.', -450),
    ]
    const s = turnSummary({ turn: 5, logs, effectLabels: ['Parcela: Máquina de lavar (2/12)'] })
    expect(s.money.salary).toBe(7000)
    expect(s.money.inss).toBe(-781.51)
    expect(s.money.ir).toBe(-754.75)
    expect(s.net).toBeCloseTo(5463.74 - 502.8 - 2100 - 450, 2)
  })

  it('o texto antigo "Salário:" (antes do holerite) ainda conta como salário', () => {
    const s = turnSummary({ turn: 3, logs: [log(3, 'Salário: Depósito do mês (+R$ 7000.00)', 7000), log(3, 'Aluguel: Casa — Pago (-R$ 1500)', -1500)] })
    expect(s.money).toEqual({ salary: 7000, inss: 0, ir: 0, extras: 0, rent: -1500, interest: 0 })
    expect(s.net).toBe(5500)
  })

  it('logs de outro mês não entram no holerite', () => {
    const s = turnSummary({ turn: 3, logs: [log(2, salaryLine(7000), 7000), log(2, payslipDeductions(slip)[0].description, -781.51)] })
    expect(s.money).toEqual({ salary: 0, inss: 0, ir: 0, extras: 0, rent: 0, interest: 0 })
    expect(s.net).toBe(0)
  })
})
