// __tests__/turnSummary.test.js — o cartão "virada do mês"
process.env.JWT_SECRET = 'test-secret'
const request = require('supertest')
const app = require('../src/app')
const { prismaMock } = require('@prisma/client')
const { makeToken, authHeader } = require('./helpers/auth')
const { turnSummary, eventTitles } = require('../src/utils/turnSummary')

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
    expect(s.money).toEqual({ salary: 7000, extras: 200, rent: -1500, interest: 0 })
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

  it('janeiro: o presente de boas-vindas', () => {
    const j = turnSummary({ turn: 1, logs: [log(1, 'Presente de boas-vindas: Sua família fez um PIX.', 500)] })
    expect(j.events).toEqual([expect.objectContaining({ title: 'Presente de boas-vindas', amount: 500 })])
    expect(eventTitles(1)).toContain('Presente de boas-vindas')
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
