// __tests__/monthClock.test.js — relógio do mês, pausa e virada automática
process.env.JWT_SECRET = 'test-secret'

jest.mock('../src/utils/turnEngine', () => ({ processTurn: jest.fn(), settleMonth: jest.fn() }))

const request = require('supertest')
const app = require('../src/app')
const { prismaMock } = require('@prisma/client')
const { makeAdminToken, authHeader } = require('./helpers/auth')
const { processTurn } = require('../src/utils/turnEngine')
const { MINUTE, monthEndsAt, closedAt, playerPhase, roomCanTurn, roomTurnsBy } = require('../src/utils/monthClock')
const realtime = require('../src/realtime')

beforeEach(() => jest.clearAllMocks())

const T0 = Date.UTC(2026, 9, 13, 14, 0, 0) // começo do mês
const room = (o = {}) => ({ id: 'room-1', status: 'active', currentTurn: 3, turnStartedAt: new Date(T0), monthMinutes: 10, dilemmaMinutes: 5, pausedAt: null, ...o })
const at = (min) => T0 + min * MINUTE

// ─── funções puras ────────────────────────────────────────────────────────────

describe('monthEndsAt', () => {
  it('começo do mês + minutos do mês', () => {
    expect(monthEndsAt(room())).toBe(at(10))
    expect(monthEndsAt(room({ monthMinutes: 3 }))).toBe(at(3))
  })

  it('sem relógio (sala antiga ou esperando): null', () => {
    expect(monthEndsAt(room({ turnStartedAt: null }))).toBeNull()
    expect(monthEndsAt(null)).toBeNull()
  })

  it('sala sem os minutos usa 10', () => {
    expect(monthEndsAt({ turnStartedAt: new Date(T0) })).toBe(at(10))
  })
})

describe('closedAt', () => {
  it('ainda no mês: null', () => {
    expect(closedAt({ readyAt: null }, room(), at(4))).toBeNull()
  })

  it('clicou em encerrar: o horário do clique', () => {
    expect(closedAt({ readyAt: new Date(at(6)) }, room(), at(7))).toBe(at(6))
  })

  it('o tempo acabou sem clicar: fecha no fim do tempo', () => {
    expect(closedAt({ readyAt: null }, room(), at(12))).toBe(at(10))
    expect(closedAt({ readyAt: null }, room(), at(10))).toBe(at(10))
  })

  it('clique gravado depois do fim do tempo conta como o fim do tempo', () => {
    expect(closedAt({ readyAt: new Date(at(13)) }, room(), at(14))).toBe(at(10))
  })

  it('sala antiga sem relógio: pronto conta como encerrado agora', () => {
    expect(closedAt({ turnReady: true }, room({ turnStartedAt: null }), at(1))).toBe(at(1))
    expect(closedAt({ turnReady: false }, room({ turnStartedAt: null }), at(99))).toBeNull()
  })
})

describe('playerPhase', () => {
  const phase = (character, now, extra = {}) => playerPhase({ character, room: room(), hasDilemma: true, answered: false, now, ...extra })

  it('mês aberto', () => {
    expect(phase({ readyAt: null }, at(2))).toEqual({ phase: 'month', monthEndsAt: at(10), dilemmaEndsAt: null })
  })

  it('encerrou: abre o dilema com 5 minutos a partir do clique', () => {
    expect(phase({ readyAt: new Date(at(6)) }, at(7))).toEqual({ phase: 'dilemma', monthEndsAt: at(10), dilemmaEndsAt: at(11) })
  })

  it('respondeu o dilema: terminou', () => {
    expect(phase({ readyAt: new Date(at(6)) }, at(7), { answered: true }).phase).toBe('done')
  })

  it('o tempo do dilema acabou: terminou (o dilema vai pela inércia)', () => {
    expect(phase({ readyAt: new Date(at(6)) }, at(11)).phase).toBe('done')
  })

  it('não encerrou e o mês acabou: o dilema conta do fim do mês', () => {
    expect(phase({ readyAt: null }, at(12))).toEqual({ phase: 'dilemma', monthEndsAt: at(10), dilemmaEndsAt: at(15) })
    expect(phase({ readyAt: null }, at(15)).phase).toBe('done')
  })

  it('mês sem dilema (dezembro): encerrou, terminou', () => {
    expect(phase({ readyAt: new Date(at(6)) }, at(6), { hasDilemma: false }).phase).toBe('done')
  })
})

describe('roomCanTurn / roomTurnsBy', () => {
  it('vira só quando todo mundo terminou, e nunca com a sala vazia', () => {
    expect(roomCanTurn([{ phase: 'done' }, { phase: 'done' }])).toBe(true)
    expect(roomCanTurn([{ phase: 'done' }, { phase: 'dilemma' }])).toBe(false)
    expect(roomCanTurn([])).toBe(false)
  })

  it('o mês vira no pior caso no último dilema aberto', () => {
    const phases = [{ phase: 'dilemma', dilemmaEndsAt: at(9) }, { phase: 'month', dilemmaEndsAt: null }]
    expect(roomTurnsBy(phases, room())).toBe(at(15))
    expect(roomTurnsBy([{ phase: 'done', dilemmaEndsAt: at(8) }], room())).toBe(at(10))
    expect(roomTurnsBy([], room({ turnStartedAt: null }))).toBeNull()
  })
})

// ─── virada automática (realtime.checkRoom) ─────────────────────────────────

describe('checkRoom', () => {
  const withChars = (chars, o = {}) => ({ ...room(o), characters: chars })

  it('todo mundo respondeu: vira o mês sozinho', async () => {
    prismaMock.room.findUnique.mockResolvedValue(withChars([
      { id: 'a', readyAt: new Date(at(5)), choices: [{ turn: 3 }] },
      { id: 'b', readyAt: new Date(at(6)), choices: [{ turn: 3 }] },
    ]))
    processTurn.mockResolvedValue({ turn: 4, isFinished: false })

    const result = await realtime.checkRoom('room-1', at(7))

    expect(processTurn).toHaveBeenCalledWith('room-1')
    expect(result.turn).toBe(4)
  })

  it('falta alguém: não vira', async () => {
    prismaMock.room.findUnique.mockResolvedValue(withChars([
      { id: 'a', readyAt: new Date(at(5)), choices: [{ turn: 3 }] },
      { id: 'b', readyAt: null, choices: [] },
    ]))
    expect(await realtime.checkRoom('room-1', at(7))).toBeNull()
    expect(processTurn).not.toHaveBeenCalled()
  })

  it('acabou o tempo de todo mundo: vira mesmo sem respostas', async () => {
    prismaMock.room.findUnique.mockResolvedValue(withChars([{ id: 'a', readyAt: null, choices: [] }]))
    processTurn.mockResolvedValue({ turn: 4, isFinished: false })
    await realtime.checkRoom('room-1', at(16))
    expect(processTurn).toHaveBeenCalled()
  })

  it('sala pausada: o tempo para e não vira', async () => {
    prismaMock.room.findUnique.mockResolvedValue(withChars([{ id: 'a', readyAt: null, choices: [] }], { pausedAt: new Date(at(3)) }))
    expect(await realtime.checkRoom('room-1', at(60))).toBeNull()
    expect(processTurn).not.toHaveBeenCalled()
  })

  it('sala antiga sem relógio: só o administrador vira', async () => {
    prismaMock.room.findUnique.mockResolvedValue(withChars([{ id: 'a', turnReady: true, readyAt: null, choices: [{ turn: 3 }] }], { turnStartedAt: null }))
    expect(await realtime.checkRoom('room-1', at(60))).toBeNull()
    expect(processTurn).not.toHaveBeenCalled()
  })

  it('sala sem jogadores não vira', async () => {
    prismaMock.room.findUnique.mockResolvedValue(withChars([]))
    expect(await realtime.checkRoom('room-1', at(60))).toBeNull()
  })
})

// ─── pausar e retomar ──────────────────────────────────────────────────────────

describe('POST /api/v1/rooms/:id/pause', () => {
  const ADMIN = makeAdminToken({ id: 'admin-1' })
  const pause = (paused, token = ADMIN) => request(app).post('/api/v1/rooms/room-1/pause').set(authHeader(token)).send({ paused })

  it('pausa: guarda o horário da pausa', async () => {
    prismaMock.room.findUnique.mockResolvedValue({ ...room(), adminId: 'admin-1', characters: [] })
    prismaMock.room.update.mockResolvedValue({})
    const res = await pause(true)
    expect(res.status).toBe(200)
    expect(prismaMock.room.update).toHaveBeenCalledWith({ where: { id: 'room-1' }, data: { pausedAt: expect.any(Date) } })
  })

  it('retoma: devolve o tempo parado ao mês e a quem já tinha encerrado', async () => {
    const pausedAt = new Date(Date.now() - 20 * MINUTE)
    prismaMock.room.findUnique.mockResolvedValue({ ...room({ pausedAt }), adminId: 'admin-1', characters: [] })
    prismaMock.character.findMany.mockResolvedValue([{ id: 'a', readyAt: new Date(T0 + 2 * MINUTE) }])
    prismaMock.room.update.mockImplementation((args) => args)
    prismaMock.character.update.mockImplementation((args) => args)
    prismaMock.$transaction.mockResolvedValue([])

    const res = await pause(false)

    expect(res.status).toBe(200)
    const roomUpdate = prismaMock.room.update.mock.calls[0][0].data
    expect(roomUpdate.pausedAt).toBeNull()
    const shifted = roomUpdate.turnStartedAt.getTime() - T0
    expect(shifted).toBeGreaterThanOrEqual(20 * MINUTE - 1000)
    expect(shifted).toBeLessThanOrEqual(20 * MINUTE + 5000)
    const readyShift = prismaMock.character.update.mock.calls[0][0].data.readyAt.getTime() - (T0 + 2 * MINUTE)
    expect(readyShift).toBe(shifted)
  })

  it('só o administrador da sala', async () => {
    prismaMock.room.findUnique.mockResolvedValue({ ...room(), adminId: 'outro' })
    expect((await pause(true)).status).toBe(403)
  })

  it('sala esperando ou encerrada não pausa', async () => {
    prismaMock.room.findUnique.mockResolvedValue({ ...room({ status: 'finished' }), adminId: 'admin-1' })
    expect((await pause(true)).status).toBe(400)
  })
})
