// __tests__/auth.test.js
process.env.JWT_SECRET = 'test-secret'

const request = require('supertest')
const app = require('../src/app')
const { prismaMock } = require('@prisma/client')
const bcrypt = require('bcryptjs')

beforeEach(() => jest.clearAllMocks())

describe('POST /api/v1/auth/register', () => {
  it('cria usuário com sucesso', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.user.create.mockResolvedValue({
      id: 'user-1',
      name: 'Dudu',
      email: 'dudu@test.com',
      role: 'player',
      passwordHash: 'hash',
    })

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Dudu', email: 'dudu@test.com', password: '123456' })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('token')
    // controller retorna { id, name, role } — sem email
    expect(res.body.user.name).toBe('Dudu')
    expect(res.body.user).not.toHaveProperty('passwordHash')
  })

  it('retorna 409 se email já cadastrado', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-existente' })

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Dudu', email: 'dudu@test.com', password: '123456' })

    expect(res.status).toBe(409)
  })

  it('retorna 400 se campos obrigatórios faltam', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'dudu@test.com' }) // sem name e password

    expect(res.status).toBe(400)
  })
})

describe('POST /api/v1/auth/login', () => {
  it('login com credenciais corretas retorna token', async () => {
    const passwordHash = await bcrypt.hash('123456', 10)
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Dudu',
      email: 'dudu@test.com',
      passwordHash, // controller usa passwordHash, não password
      role: 'player',
    })

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'dudu@test.com', password: '123456' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
    expect(res.body.user.name).toBe('Dudu')
  })

  it('retorna 401 com senha errada', async () => {
    const passwordHash = await bcrypt.hash('senhaCorreta', 10)
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'dudu@test.com',
      passwordHash,
      role: 'player',
    })

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'dudu@test.com', password: 'senhaErrada' })

    expect(res.status).toBe(401)
  })

  it('retorna 404 se email não existe', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'naoexiste@test.com', password: '123456' })

    expect(res.status).toBe(404)
  })
})
// ─── administradores ─────────────────────────────────────────────────────────

const jwt = require('jsonwebtoken')
const { makeToken, authHeader } = require('./helpers/auth')

describe('promover a admin não é mais uma rota aberta', () => {
  it('PATCH /auth/make-admin/:email não existe mais', async () => {
    const res = await request(app).patch('/api/v1/auth/make-admin/qualquer@test.com')
    expect(res.status).toBe(404)
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })
})

describe('POST /api/v1/auth/register-admin', () => {
  const INVITE = 'SANTA-RITA-2026'
  const send = (body) => request(app).post('/api/v1/auth/register-admin').send(body)
  const body = (overrides = {}) => ({ name: 'Prof. Ana', email: 'ana@escola.com', password: '123456', inviteCode: INVITE, ...overrides })

  beforeEach(() => { process.env.ADMIN_INVITE_CODE = INVITE })
  afterAll(() => { delete process.env.ADMIN_INVITE_CODE })

  it('com o código certo cria a conta já como administrador', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.user.create.mockResolvedValue({ id: 'u-ana', name: 'Prof. Ana', role: 'admin' })
    const res = await send(body())

    expect(res.status).toBe(201)
    expect(prismaMock.user.create.mock.calls[0][0].data).toEqual(expect.objectContaining({ email: 'ana@escola.com', role: 'admin' }))
    expect(jwt.verify(res.body.token, 'test-secret').role).toBe('admin')
    expect(res.body.user).toEqual({ id: 'u-ana', name: 'Prof. Ana', role: 'admin' })
  })

  it('guarda a senha com hash', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.user.create.mockResolvedValue({ id: 'u-ana', name: 'Prof. Ana', role: 'admin' })
    await send(body())

    const { passwordHash } = prismaMock.user.create.mock.calls[0][0].data
    expect(passwordHash).not.toBe('123456')
    expect(await bcrypt.compare('123456', passwordHash)).toBe(true)
  })

  it('aceita o código com espaços em volta', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.user.create.mockResolvedValue({ id: 'u-ana', name: 'Prof. Ana', role: 'admin' })
    expect((await send(body({ inviteCode: `  ${INVITE} ` }))).status).toBe(201)
  })

  it.each(['errado', '', 'santa-rita-2026', 123])('código inválido (%p) é recusado', async (inviteCode) => {
    const res = await send(body({ inviteCode }))
    expect([400, 403]).toContain(res.status)
    expect(prismaMock.user.create).not.toHaveBeenCalled()
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it('sem código configurado no servidor, o cadastro fica fechado', async () => {
    delete process.env.ADMIN_INVITE_CODE
    const res = await send(body())
    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/fechado/)
    expect(prismaMock.user.create).not.toHaveBeenCalled()
  })

  it('campos faltando', async () => {
    expect((await send(body({ password: '' }))).status).toBe(400)
    prismaMock.user.findUnique.mockResolvedValue(null)
    expect((await send(body({ name: '' }))).status).toBe(400)
  })

  it('jogador que já tem conta vira administrador com a mesma senha', async () => {
    const passwordHash = await bcrypt.hash('123456', 4)
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u-1', name: 'Ana', role: 'player', passwordHash })
    prismaMock.user.update.mockResolvedValue({ id: 'u-1', name: 'Ana', role: 'admin' })
    const res = await send(body())

    expect(res.status).toBe(200)
    expect(prismaMock.user.update).toHaveBeenCalledWith({ where: { id: 'u-1' }, data: { role: 'admin' } })
    expect(jwt.verify(res.body.token, 'test-secret').role).toBe('admin')
  })

  it('conta que já existe com senha errada não vira admin', async () => {
    const passwordHash = await bcrypt.hash('outra', 4)
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u-1', name: 'Ana', role: 'player', passwordHash })
    const res = await send(body())

    expect(res.status).toBe(401)
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it('quem já é admin só entra', async () => {
    const passwordHash = await bcrypt.hash('123456', 4)
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u-1', name: 'Ana', role: 'admin', passwordHash })
    const res = await send(body())

    expect(res.status).toBe(200)
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })
})

describe('salas: só administrador cria e lista', () => {
  it('jogador não cria sala', async () => {
    const res = await request(app).post('/api/v1/rooms').set(authHeader(makeToken())).send({ name: 'x' })
    expect(res.status).toBe(403)
    expect(prismaMock.room.create).not.toHaveBeenCalled()
  })

  it('jogador não lista salas de administrador', async () => {
    const res = await request(app).get('/api/v1/rooms/mine').set(authHeader(makeToken()))
    expect(res.status).toBe(403)
  })
})
