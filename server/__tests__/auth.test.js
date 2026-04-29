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