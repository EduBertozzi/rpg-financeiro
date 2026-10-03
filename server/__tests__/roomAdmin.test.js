// __tests__/roomAdmin.test.js — painel do administrador: várias salas por admin
process.env.JWT_SECRET = 'test-secret'

const request = require('supertest')
const app = require('../src/app')
const { prismaMock } = require('@prisma/client')
const { makeAdminToken, makeToken, authHeader } = require('./helpers/auth')
const { cleanRoomName, playerTasks, playerProgress, roomSummary, CHARACTER_CHILD_MODELS, NAME_MAX } = require('../src/utils/roomAdmin')

beforeEach(() => jest.clearAllMocks())

const ADMIN = makeAdminToken({ id: 'admin-1' })
const OTHER = makeAdminToken({ id: 'admin-2' })
const room = (overrides = {}) => ({ id: 'room-1', code: 'ABC123', name: '3º ano A', adminId: 'admin-1', status: 'active', currentTurn: 3, maxTurns: 12, createdAt: '2026-10-03T10:00:00.000Z', ...overrides })

// ─── funções puras ────────────────────────────────────────────────────────────

describe('cleanRoomName', () => {
  it('tira espaços sobrando', () => {
    expect(cleanRoomName('  3º ano   B  ')).toBe('3º ano B')
  })

  it(`corta em ${NAME_MAX} letras`, () => {
    expect(cleanRoomName('x'.repeat(60))).toHaveLength(NAME_MAX)
  })

  it.each([undefined, null, '', '   ', 42, {}])('nome vazio ou inválido (%p) vira null', (v) => {
    expect(cleanRoomName(v)).toBeNull()
  })
})

describe('playerTasks', () => {
  const logs = (turn, ...prefixes) => prefixes.map((p) => ({ turn, description: `${p} — Pago` }))

  it('nada feito no mês', () => {
    expect(playerTasks({ choices: [], eventLog: [] }, 3)).toEqual({ dilemma: false, leisure: false, food: false, utilities: false, transport: false })
  })

  it('tudo feito no mês', () => {
    expect(playerTasks({
      choices: [{ turn: 3, kind: 'dilemma' }, { turn: 3, kind: 'leisure' }],
      eventLog: logs(3, 'Conta: Mercadinho', 'Conta: Água e Luz', 'Conta: Internet e Celular'),
    }, 3)).toEqual({ dilemma: true, leisure: true, food: true, utilities: true, transport: true })
  })

  it('o que foi feito em outro mês não conta', () => {
    const tasks = playerTasks({ choices: [{ turn: 2, kind: 'dilemma' }], eventLog: logs(2, 'Conta: Mercadinho') }, 3)
    expect(tasks.dilemma).toBe(false)
    expect(tasks.food).toBe(false)
  })

  it('dezembro não tem dilema (null)', () => {
    expect(playerTasks({ choices: [], eventLog: [] }, 12).dilemma).toBeNull()
  })

  it('aceita o mês como texto', () => {
    expect(playerTasks({ choices: [{ turn: '3', kind: 'leisure' }], eventLog: [] }, '3').leisure).toBe(true)
  })
})

describe('playerProgress', () => {
  it('usa o patrimônio do snapshot mais recente', () => {
    const p = playerProgress({ id: 'c1', name: 'Ana', turnReady: true, cash: 100, snapshots: [{ turn: 2, netWorth: '9000' }, { turn: 3, netWorth: '9500.5' }] }, 3)
    expect(p).toEqual(expect.objectContaining({ id: 'c1', name: 'Ana', ready: true, netWorth: 9500.5 }))
  })

  it('sem snapshot usa o saldo', () => {
    expect(playerProgress({ id: 'c1', name: 'Ana', cash: '7500' }, 1).netWorth).toBe(7500)
  })

  it('sala esperando: sem tarefas', () => {
    expect(playerProgress({ id: 'c1', name: 'Ana', cash: 0 }, 0).tasks).toBeNull()
  })
})

describe('roomSummary', () => {
  it('conta jogadores e prontos', () => {
    const s = roomSummary(room({ characters: [{ turnReady: true }, { turnReady: false }] }))
    expect(s).toEqual(expect.objectContaining({ players: 2, ready: 1, allReady: false, name: '3º ano A' }))
  })

  it('todo mundo pronto numa sala jogando', () => {
    expect(roomSummary(room({ characters: [{ turnReady: true }] })).allReady).toBe(true)
  })

  it('sala sem jogador nunca está toda pronta', () => {
    expect(roomSummary(room({ characters: [] })).allReady).toBe(false)
  })

  it('sala encerrada não pede atenção', () => {
    expect(roomSummary(room({ status: 'finished', characters: [{ turnReady: true }] })).allReady).toBe(false)
  })

  it('sala antiga sem nome devolve texto vazio', () => {
    expect(roomSummary(room({ name: null })).name).toBe('')
  })
})

describe('CHARACTER_CHILD_MODELS', () => {
  it('cobre todas as tabelas presas ao personagem no schema', () => {
    const schema = require('fs').readFileSync(require('path').join(__dirname, '../prisma/schema.prisma'), 'utf8')
    const models = [...schema.matchAll(/model (\w+) \{([^}]*)\}/g)]
      .filter(([, name, body]) => name !== 'Leaderboard' && /character\s+Character\s+@relation/.test(body))
      .map(([, name]) => name[0].toLowerCase() + name.slice(1))
    expect([...CHARACTER_CHILD_MODELS].sort()).toEqual(models.sort())
  })
})

// ─── rotas ────────────────────────────────────────────────────────────────────

describe('POST /api/v1/rooms — nome da turma', () => {
  beforeEach(() => {
    prismaMock.room.findUnique.mockResolvedValue(null)
    prismaMock.room.create.mockResolvedValue(room())
  })

  it('guarda o nome limpo', async () => {
    await request(app).post('/api/v1/rooms').set(authHeader(ADMIN)).send({ name: '  3º ano   A ' })
    expect(prismaMock.room.create.mock.calls[0][0].data).toEqual(expect.objectContaining({ name: '3º ano A', adminId: 'admin-1' }))
  })

  it('sem nome cria com nome vazio', async () => {
    await request(app).post('/api/v1/rooms').set(authHeader(ADMIN)).send({})
    expect(prismaMock.room.create.mock.calls[0][0].data.name).toBe('')
  })
})

describe('GET /api/v1/rooms/mine', () => {
  it('lista só as salas do administrador, da mais nova para a mais antiga', async () => {
    prismaMock.room.findMany.mockResolvedValue([room({ characters: [{ turnReady: true }] }), room({ id: 'room-2', status: 'waiting', characters: [] })])
    const res = await request(app).get('/api/v1/rooms/mine').set(authHeader(ADMIN))

    expect(res.status).toBe(200)
    expect(prismaMock.room.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { adminId: 'admin-1' }, orderBy: { createdAt: 'desc' } }))
    expect(res.body.map((r) => [r.id, r.players, r.allReady])).toEqual([['room-1', 1, true], ['room-2', 0, false]])
  })

  it('não confunde com o código de uma sala', async () => {
    prismaMock.room.findMany.mockResolvedValue([])
    await request(app).get('/api/v1/rooms/mine').set(authHeader(ADMIN))
    expect(prismaMock.room.findUnique).not.toHaveBeenCalled()
  })

  it('401 sem token', async () => {
    expect((await request(app).get('/api/v1/rooms/mine')).status).toBe(401)
  })
})

describe('GET /api/v1/rooms/:id/progress', () => {
  it('devolve a sala e o que cada jogador fez no mês atual', async () => {
    prismaMock.room.findUnique.mockResolvedValue(room())
    prismaMock.character.findMany.mockResolvedValue([
      { id: 'c1', name: 'Ana', turnReady: true, cash: 0, choices: [{ turn: 3, kind: 'dilemma' }, { turn: 3, kind: 'leisure' }], eventLog: [], snapshots: [{ turn: 3, netWorth: 9000 }] },
      { id: 'c2', name: 'Bruno', turnReady: false, cash: 5000, choices: [], eventLog: [], snapshots: [] },
    ])
    const res = await request(app).get('/api/v1/rooms/room-1/progress').set(authHeader(ADMIN))

    expect(res.status).toBe(200)
    expect(res.body.room).toEqual(expect.objectContaining({ players: 2, ready: 1 }))
    expect(res.body.players[0]).toEqual(expect.objectContaining({ name: 'Ana', ready: true, netWorth: 9000 }))
    expect(res.body.players[0].tasks).toEqual(expect.objectContaining({ dilemma: true, leisure: true, food: false }))
    expect(res.body.players[1].netWorth).toBe(5000)
  })

  it('busca escolhas e extrato só do mês atual', async () => {
    prismaMock.room.findUnique.mockResolvedValue(room({ currentTurn: 5 }))
    prismaMock.character.findMany.mockResolvedValue([])
    await request(app).get('/api/v1/rooms/room-1/progress').set(authHeader(ADMIN))

    const { include } = prismaMock.character.findMany.mock.calls[0][0]
    expect(include.choices).toEqual({ where: { turn: 5 } })
    expect(include.eventLog).toEqual({ where: { turn: 5 } })
  })

  it('403 para sala de outro administrador', async () => {
    prismaMock.room.findUnique.mockResolvedValue(room())
    const res = await request(app).get('/api/v1/rooms/room-1/progress').set(authHeader(OTHER))
    expect(res.status).toBe(403)
    expect(prismaMock.character.findMany).not.toHaveBeenCalled()
  })

  it('404 para sala que não existe', async () => {
    prismaMock.room.findUnique.mockResolvedValue(null)
    expect((await request(app).get('/api/v1/rooms/x/progress').set(authHeader(ADMIN))).status).toBe(404)
  })
})

describe('PATCH /api/v1/rooms/:id', () => {
  it('troca o nome da turma', async () => {
    prismaMock.room.findUnique.mockResolvedValue(room())
    prismaMock.room.update.mockResolvedValue(room({ name: 'Turma nova' }))
    const res = await request(app).patch('/api/v1/rooms/room-1').set(authHeader(ADMIN)).send({ name: ' Turma   nova ' })

    expect(res.status).toBe(200)
    expect(prismaMock.room.update).toHaveBeenCalledWith({ where: { id: 'room-1' }, data: { name: 'Turma nova' } })
  })

  it('400 para nome vazio', async () => {
    const res = await request(app).patch('/api/v1/rooms/room-1').set(authHeader(ADMIN)).send({ name: '   ' })
    expect(res.status).toBe(400)
    expect(prismaMock.room.update).not.toHaveBeenCalled()
  })

  it('403 para sala de outro administrador', async () => {
    prismaMock.room.findUnique.mockResolvedValue(room())
    const res = await request(app).patch('/api/v1/rooms/room-1').set(authHeader(OTHER)).send({ name: 'Minha' })
    expect(res.status).toBe(403)
    expect(prismaMock.room.update).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/v1/rooms/:id', () => {
  beforeEach(() => {
    prismaMock.room.findUnique.mockResolvedValue(room())
    prismaMock.character.findMany.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }])
  })

  it('apaga a sala com os personagens e tudo que é deles', async () => {
    const res = await request(app).delete('/api/v1/rooms/room-1').set(authHeader(ADMIN))

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ deleted: 'room-1', players: 2 })
    for (const model of CHARACTER_CHILD_MODELS) {
      expect(prismaMock[model].deleteMany).toHaveBeenCalledWith({ where: { characterId: { in: ['c1', 'c2'] } } })
    }
    expect(prismaMock.leaderboard.deleteMany).toHaveBeenCalledWith({ where: { roomId: 'room-1' } })
    expect(prismaMock.character.deleteMany).toHaveBeenCalledWith({ where: { roomId: 'room-1' } })
    expect(prismaMock.assetPrice.deleteMany).toHaveBeenCalledWith({ where: { roomId: 'room-1' } })
    expect(prismaMock.room.delete).toHaveBeenCalledWith({ where: { id: 'room-1' } })
  })

  it('apaga os filhos antes do personagem e o personagem antes da sala', async () => {
    await request(app).delete('/api/v1/rooms/room-1').set(authHeader(ADMIN))
    const order = (fn) => fn.mock.invocationCallOrder[0]
    expect(order(prismaMock.scheduledEffect.deleteMany)).toBeLessThan(order(prismaMock.character.deleteMany))
    expect(order(prismaMock.leaderboard.deleteMany)).toBeLessThan(order(prismaMock.character.deleteMany))
    expect(order(prismaMock.character.deleteMany)).toBeLessThan(order(prismaMock.room.delete))
  })

  it('tudo numa transação só', async () => {
    await request(app).delete('/api/v1/rooms/room-1').set(authHeader(ADMIN))
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
  })

  it('403 para sala de outro administrador (nada é apagado)', async () => {
    const res = await request(app).delete('/api/v1/rooms/room-1').set(authHeader(OTHER))
    expect(res.status).toBe(403)
    expect(prismaMock.room.delete).not.toHaveBeenCalled()
    expect(prismaMock.character.deleteMany).not.toHaveBeenCalled()
  })

  it('jogador comum também não apaga', async () => {
    const res = await request(app).delete('/api/v1/rooms/room-1').set(authHeader(makeToken({ id: 'user-9' })))
    expect(res.status).toBe(403)
  })

  it('404 para sala que não existe', async () => {
    prismaMock.room.findUnique.mockResolvedValue(null)
    expect((await request(app).delete('/api/v1/rooms/x').set(authHeader(ADMIN))).status).toBe(404)
  })

  it('401 sem token', async () => {
    expect((await request(app).delete('/api/v1/rooms/room-1')).status).toBe(401)
  })
})

// ─── esqueci a senha ──────────────────────────────────────────────────────────

const bcrypt = require('bcryptjs')
const { temporaryPassword, TEMP_WORDS } = require('../src/utils/roomAdmin')

describe('temporaryPassword', () => {
  it('palavra sem acento + 3 números', () => {
    expect(temporaryPassword(() => 0)).toBe('mare100')
    expect(temporaryPassword(() => 0.99)).toMatch(/^boleto\d{3}$/)
  })

  it('sempre só letras minúsculas e números, com pelo menos 6 caracteres', () => {
    for (let i = 0; i < 200; i++) expect(temporaryPassword()).toMatch(/^[a-z]+\d{3}$/)
    expect(TEMP_WORDS.length).toBeGreaterThanOrEqual(10)
  })
})

describe('POST /api/v1/rooms/:id/players/:characterId/reset-password', () => {
  const reset = (token = ADMIN, characterId = 'c1') =>
    request(app).post(`/api/v1/rooms/room-1/players/${characterId}/reset-password`).set(authHeader(token))

  beforeEach(() => {
    prismaMock.room.findUnique.mockResolvedValue(room())
    prismaMock.character.findUnique.mockResolvedValue({ id: 'c1', name: 'Ana', roomId: 'room-1', userId: 'u-ana' })
    prismaMock.user.update.mockResolvedValue({})
  })

  it('gera uma senha provisória e grava só o hash dela', async () => {
    const res = await reset()

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ password: expect.stringMatching(/^[a-z]+\d{3}$/), name: 'Ana' })
    const { where, data } = prismaMock.user.update.mock.calls[0][0]
    expect(where).toEqual({ id: 'u-ana' })
    expect(data.passwordHash).not.toBe(res.body.password)
    expect(await bcrypt.compare(res.body.password, data.passwordHash)).toBe(true)
  })

  it('jogador de outra sala: 404 e nada muda', async () => {
    prismaMock.character.findUnique.mockResolvedValue({ id: 'c9', roomId: 'outra', userId: 'u9' })
    expect((await reset(ADMIN, 'c9')).status).toBe(404)
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it('administrador de outra sala não redefine', async () => {
    expect((await reset(OTHER)).status).toBe(403)
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it('jogador comum não redefine', async () => {
    expect((await reset(makeToken({ id: 'u-ana' }))).status).toBe(403)
  })

  it('401 sem token', async () => {
    expect((await request(app).post('/api/v1/rooms/room-1/players/c1/reset-password')).status).toBe(401)
  })
})
