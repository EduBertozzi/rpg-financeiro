// __tests__/bills.test.js
process.env.JWT_SECRET = 'test-secret'

const request = require('supertest')
const app = require('../src/app')
const { prismaMock } = require('@prisma/client')
const { makeToken, authHeader } = require('./helpers/auth')

beforeEach(() => jest.clearAllMocks())

const TOKEN = makeToken({ id: 'user-1' })

const makeCharacter = (overrides = {}) => ({
  id: 'char-1',
  userId: 'user-1',
  cash: 5000,
  room: { id: 'room-1', currentTurn: 1 },
  foodCost: 1000,
  utilitiesCost: 250,
  transportCost: 250,
  ...overrides,
})

// ─── GET /api/v1/characters/:id/bills/:turn ───────────────────────────────────

describe('GET /api/v1/characters/:id/bills/:turn', () => {
  it('retorna os 3 tipos de conta com o status de pagamento', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.characterEventLog.findFirst
      .mockResolvedValueOnce({ id: 'log-1' }) // food: pago
      .mockResolvedValueOnce(null) // utilities: não pago
      .mockResolvedValueOnce(null) // transport: não pago

    const res = await request(app)
      .get('/api/v1/characters/char-1/bills/1')
      .set(authHeader(TOKEN))

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(3)
    expect(res.body.find(b => b.type === 'food')).toMatchObject({ label: 'Mercadinho', amount: 1000, paid: true })
    expect(res.body.find(b => b.type === 'utilities')).toMatchObject({ label: 'Água e Luz', amount: 250, paid: false })
    expect(res.body.find(b => b.type === 'transport')).toMatchObject({ label: 'Internet e Celular', amount: 250, paid: false })
  })

  it('retorna 404 para personagem inexistente', async () => {
    prismaMock.character.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .get('/api/v1/characters/naoexiste/bills/1')
      .set(authHeader(TOKEN))

    expect(res.status).toBe(404)
  })

  it('retorna 403 para personagem de outro usuário', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ userId: 'outro-user' }))

    const res = await request(app)
      .get('/api/v1/characters/char-1/bills/1')
      .set(authHeader(TOKEN))

    expect(res.status).toBe(403)
  })

  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/v1/characters/char-1/bills/1')
    expect(res.status).toBe(401)
  })
})

// ─── POST /api/v1/characters/:id/bills/:turn/pay ──────────────────────────────

describe('POST /api/v1/characters/:id/bills/:turn/pay', () => {
  it('paga a conta e desconta do saldo', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.characterEventLog.findFirst.mockResolvedValue(null)
    prismaMock.character.update.mockResolvedValue({})
    prismaMock.characterEventLog.create.mockResolvedValue({})

    const res = await request(app)
      .post('/api/v1/characters/char-1/bills/1/pay')
      .set(authHeader(TOKEN))
      .send({ type: 'food' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ label: 'Mercadinho', amount: 1000, cashAfter: 4000 })
    expect(prismaMock.character.update).toHaveBeenCalledWith({
      where: { id: 'char-1' },
      data: { cash: { decrement: 1000 } }
    })
  })

  it('registra o pagamento no extrato do mês, junto com o débito', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.characterEventLog.findFirst.mockResolvedValue(null)

    await request(app).post('/api/v1/characters/char-1/bills/1/pay').set(authHeader(TOKEN)).send({ type: 'utilities' })

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
    expect(prismaMock.characterEventLog.create).toHaveBeenCalledWith({
      data: { characterId: 'char-1', turn: 1, cashImpact: -250, description: 'Conta: Água e Luz — Pago (-R$ 250)' }
    })
  })

  it('cobra o valor da conta do personagem em centavos', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ transportCost: '249.995' }))
    prismaMock.characterEventLog.findFirst.mockResolvedValue(null)

    const res = await request(app).post('/api/v1/characters/char-1/bills/1/pay').set(authHeader(TOKEN)).send({ type: 'transport' })

    expect(res.body).toMatchObject({ label: 'Internet e Celular', amount: 250, cashAfter: 4750 })
  })

  it('permite pagar mesmo com saldo menor que a conta (fica negativo)', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ cash: 300 }))
    prismaMock.characterEventLog.findFirst.mockResolvedValue(null)

    const res = await request(app).post('/api/v1/characters/char-1/bills/1/pay').set(authHeader(TOKEN)).send({ type: 'food' })

    expect(res.status).toBe(200)
    expect(res.body.cashAfter).toBe(-700)
  })

  it('não deixa pagar conta de outro mês', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ room: { id: 'room-1', currentTurn: 3 } }))
    prismaMock.characterEventLog.findFirst.mockResolvedValue(null)

    const res = await request(app).post('/api/v1/characters/char-1/bills/5/pay').set(authHeader(TOKEN)).send({ type: 'food' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Só dá para pagar as contas do mês atual')
    expect(prismaMock.character.update).not.toHaveBeenCalled()
  })

  it('retorna 400 para tipo de conta inválido', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())

    const res = await request(app)
      .post('/api/v1/characters/char-1/bills/1/pay')
      .set(authHeader(TOKEN))
      .send({ type: 'aluguel' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Tipo de conta inválido')
  })

  it('retorna 400 se a conta já foi paga', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.characterEventLog.findFirst.mockResolvedValue({ id: 'log-1' })

    const res = await request(app)
      .post('/api/v1/characters/char-1/bills/1/pay')
      .set(authHeader(TOKEN))
      .send({ type: 'utilities' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Conta já paga')
  })

  it('retorna 404 para personagem inexistente', async () => {
    prismaMock.character.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .post('/api/v1/characters/naoexiste/bills/1/pay')
      .set(authHeader(TOKEN))
      .send({ type: 'food' })

    expect(res.status).toBe(404)
  })

  it('retorna 403 para personagem de outro usuário', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ userId: 'outro-user' }))

    const res = await request(app)
      .post('/api/v1/characters/char-1/bills/1/pay')
      .set(authHeader(TOKEN))
      .send({ type: 'food' })

    expect(res.status).toBe(403)
  })

  it('retorna 401 sem token', async () => {
    const res = await request(app).post('/api/v1/characters/char-1/bills/1/pay').send({ type: 'food' })
    expect(res.status).toBe(401)
  })
})

// ─── descontos das habilidades ────────────────────────────────────────────────

describe('contas com desconto das habilidades', () => {
  const skill = (path, level) => ({ skillNode: { path, level } })
  const withSkills = (...skills) => makeCharacter({ unlockedSkills: skills })

  it('GET busca o personagem com as habilidades desbloqueadas', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.characterEventLog.findFirst.mockResolvedValue(null)

    await request(app).get('/api/v1/characters/char-1/bills/1').set(authHeader(TOKEN))

    expect(prismaMock.character.findUnique).toHaveBeenCalledWith({
      where: { id: 'char-1' },
      include: { unlockedSkills: { include: { skillNode: true } } },
    })
  })

  it('GET sem habilidades mostra valor cheio e desconto zero', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ unlockedSkills: [] }))
    prismaMock.characterEventLog.findFirst.mockResolvedValue(null)

    const res = await request(app).get('/api/v1/characters/char-1/bills/1').set(authHeader(TOKEN))

    expect(res.body).toEqual([
      { type: 'food', label: 'Mercadinho', amount: 1000, baseAmount: 1000, discount: 0, coupon: false, paid: false },
      { type: 'utilities', label: 'Água e Luz', amount: 250, baseAmount: 250, discount: 0, coupon: false, paid: false },
      { type: 'transport', label: 'Internet e Celular', amount: 250, baseAmount: 250, discount: 0, coupon: false, paid: false },
    ])
  })

  it('GET com Comunicação Básica: Água e Luz e Internet 30% mais baratas', async () => {
    prismaMock.character.findUnique.mockResolvedValue(withSkills(skill('communication', 1)))
    prismaMock.characterEventLog.findFirst.mockResolvedValue(null)

    const res = await request(app).get('/api/v1/characters/char-1/bills/1').set(authHeader(TOKEN))

    expect(res.body.find(b => b.type === 'food')).toMatchObject({ amount: 1000, discount: 0 })
    expect(res.body.find(b => b.type === 'utilities')).toMatchObject({ amount: 175, baseAmount: 250, discount: 0.3 })
    expect(res.body.find(b => b.type === 'transport')).toMatchObject({ amount: 175, baseAmount: 250, discount: 0.3 })
  })

  it('GET com Organização Financeira: Mercadinho 15% mais barato', async () => {
    prismaMock.character.findUnique.mockResolvedValue(withSkills(skill('management', 1)))
    prismaMock.characterEventLog.findFirst.mockResolvedValue(null)

    const res = await request(app).get('/api/v1/characters/char-1/bills/1').set(authHeader(TOKEN))

    expect(res.body.find(b => b.type === 'food')).toMatchObject({ amount: 850, baseAmount: 1000, discount: 0.15 })
    expect(res.body.find(b => b.type === 'utilities')).toMatchObject({ amount: 250, discount: 0 })
  })

  it('GET com as duas habilidades desconta as três contas', async () => {
    prismaMock.character.findUnique.mockResolvedValue(withSkills(skill('communication', 1), skill('management', 1)))
    prismaMock.characterEventLog.findFirst.mockResolvedValue(null)

    const res = await request(app).get('/api/v1/characters/char-1/bills/1').set(authHeader(TOKEN))

    expect(res.body.map(b => b.amount)).toEqual([850, 175, 175])
  })

  it('GET de conta já paga mostra o valor que foi cobrado', async () => {
    prismaMock.character.findUnique.mockResolvedValue(withSkills(skill('management', 1)))
    prismaMock.characterEventLog.findFirst
      .mockResolvedValueOnce({ id: 'log-1', cashImpact: '-1000' }) // pago antes da habilidade
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)

    const res = await request(app).get('/api/v1/characters/char-1/bills/1').set(authHeader(TOKEN))

    expect(res.body.find(b => b.type === 'food')).toMatchObject({ amount: 1000, paid: true })
  })

  it('POST busca o personagem com sala e habilidades', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter())
    prismaMock.characterEventLog.findFirst.mockResolvedValue(null)

    await request(app).post('/api/v1/characters/char-1/bills/1/pay').set(authHeader(TOKEN)).send({ type: 'food' })

    expect(prismaMock.character.findUnique).toHaveBeenCalledWith({
      where: { id: 'char-1' },
      include: { room: true, unlockedSkills: { include: { skillNode: true } } },
    })
  })

  it('POST cobra o Mercadinho com 15% de desconto', async () => {
    prismaMock.character.findUnique.mockResolvedValue(withSkills(skill('management', 1)))
    prismaMock.characterEventLog.findFirst.mockResolvedValue(null)

    const res = await request(app).post('/api/v1/characters/char-1/bills/1/pay').set(authHeader(TOKEN)).send({ type: 'food' })

    expect(res.body).toEqual({ label: 'Mercadinho', amount: 850, cashAfter: 4150 })
    expect(prismaMock.character.update).toHaveBeenCalledWith({ where: { id: 'char-1' }, data: { cash: { decrement: 850 } } })
    expect(prismaMock.characterEventLog.create).toHaveBeenCalledWith({
      data: { characterId: 'char-1', turn: 1, cashImpact: -850, description: 'Conta: Mercadinho — Pago (-R$ 850)' }
    })
  })

  it('POST cobra Água e Luz com 30% de desconto', async () => {
    prismaMock.character.findUnique.mockResolvedValue(withSkills(skill('communication', 1)))
    prismaMock.characterEventLog.findFirst.mockResolvedValue(null)

    const res = await request(app).post('/api/v1/characters/char-1/bills/1/pay').set(authHeader(TOKEN)).send({ type: 'utilities' })

    expect(res.body).toEqual({ label: 'Água e Luz', amount: 175, cashAfter: 4825 })
    expect(prismaMock.character.update).toHaveBeenCalledWith({ where: { id: 'char-1' }, data: { cash: { decrement: 175 } } })
  })

  it('POST cobra Internet e Celular com 30% de desconto, em centavos', async () => {
    prismaMock.character.findUnique.mockResolvedValue(makeCharacter({ transportCost: '199.99', unlockedSkills: [skill('communication', 1)] }))
    prismaMock.characterEventLog.findFirst.mockResolvedValue(null)

    const res = await request(app).post('/api/v1/characters/char-1/bills/1/pay').set(authHeader(TOKEN)).send({ type: 'transport' })

    expect(res.body).toEqual({ label: 'Internet e Celular', amount: 139.99, cashAfter: 4860.01 })
  })

  it('POST: a habilidade de uma conta não barateia a outra', async () => {
    prismaMock.character.findUnique.mockResolvedValue(withSkills(skill('communication', 1)))
    prismaMock.characterEventLog.findFirst.mockResolvedValue(null)

    const res = await request(app).post('/api/v1/characters/char-1/bills/1/pay').set(authHeader(TOKEN)).send({ type: 'food' })

    expect(res.body.amount).toBe(1000)
  })

  it('GET e POST mostram e cobram o mesmo valor', async () => {
    const character = withSkills(skill('communication', 1), skill('management', 1))
    for (const type of ['food', 'utilities', 'transport']) {
      jest.clearAllMocks()
      prismaMock.character.findUnique.mockResolvedValue(character)
      prismaMock.characterEventLog.findFirst.mockResolvedValue(null)

      const listed = await request(app).get('/api/v1/characters/char-1/bills/1').set(authHeader(TOKEN))
      const paid = await request(app).post('/api/v1/characters/char-1/bills/1/pay').set(authHeader(TOKEN)).send({ type })

      expect(paid.body.amount).toBe(listed.body.find(b => b.type === type).amount)
    }
  })
})
