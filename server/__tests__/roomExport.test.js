// __tests__/roomExport.test.js — dados da sala para pesquisa
process.env.JWT_SECRET = 'test-secret'
const request = require('supertest')
const app = require('../src/app')
const { prismaMock } = require('@prisma/client')
const { makeAdminToken, authHeader } = require('./helpers/auth')
const { HEADER, playerCode, playerRows, roomCsv } = require('../src/utils/roomExport')

beforeEach(() => jest.clearAllMocks())

const ana = {
  name: 'Ana Souza', gift: 'agile', unlockedSkills: [{}, {}],
  snapshots: [{ turn: 2, netWorth: 9000.5, cash: 1000 }, { turn: 3, netWorth: '12345.67', cash: '-200' }],
  choices: [{ kind: 'dilemma', turn: 1, option: 0 }, { kind: 'leisure', turn: 1, option: 1 }, { kind: 'dilemma', turn: 2, option: 1 }],
  eventLog: [
    { turn: 1, description: 'Presente de boas-vindas: Sua família fez um PIX.' },
    { turn: 1, description: 'Conta: Mercadinho — Pago (-R$ 1000)' },
    { turn: 1, description: 'Conta: Água e Luz — Pago (-R$ 250)' },
    { turn: 2, description: 'Convite para casamento: Um grande amigo…' },
    { turn: 2, description: 'Conta atrasada: Mercadinho — R$ 1000.00 + 2% (-R$ 1030.00)' },
    { turn: 2, description: 'Dilema "Empréstimo para o amigo" — Sem resposta: Não emprestar. Ok.' },
  ],
}

describe('playerRows', () => {
  const rows = playerRows(ana, 0)
  const col = (name) => HEADER.indexOf(name)

  it('12 linhas, uma por mês, com o código do jogador e sem o nome', () => {
    expect(rows).toHaveLength(12)
    expect(rows.every((r) => r[0] === 'J01')).toBe(true)
    expect(JSON.stringify(rows)).not.toContain('Ana')
  })

  it('patrimônio do fim do mês vem da virada seguinte, com vírgula decimal', () => {
    expect(rows[0][col('patrimonio_fim_do_mes')]).toBe('9000,50')
    expect(rows[1][col('patrimonio_fim_do_mes')]).toBe('12345,67')
    expect(rows[1][col('saldo_fim_do_mes')]).toBe('-200,00')
    expect(rows[5][col('patrimonio_fim_do_mes')]).toBe('')
  })

  it('evento, dilema, opção e lazer do mês', () => {
    expect(rows[0][col('evento_da_virada')]).toBe('Presente de boas-vindas')
    expect(rows[0][col('dilema')]).toBe('A rotina desandou')
    expect(rows[0][col('opcao_dilema')]).toBe('A')
    expect(rows[0][col('lazer')]).toBe('Viagem em família')
    expect(rows[1][col('evento_da_virada')]).toBe('Convite para casamento')
  })

  it('dilema decidido pela inércia não conta como respondido', () => {
    expect(rows[0][col('respondeu_no_mes')]).toBe('sim')
    expect(rows[1][col('respondeu_no_mes')]).toBe('não')
  })

  it('contas em dia e atrasadas', () => {
    expect(rows[0][col('contas_em_dia')]).toBe(2)
    expect(rows[1][col('contas_atrasadas')]).toBe(1)
  })

  it('dezembro não tem dilema', () => {
    expect(rows[11][col('dilema')]).toBe('')
    expect(rows[11][col('respondeu_no_mes')]).toBe('')
  })
})

describe('roomCsv', () => {
  it('BOM, cabeçalho e ; como separador', () => {
    const csv = roomCsv([ana])
    expect(csv.startsWith('﻿' + HEADER.join(';'))).toBe(true)
    expect(csv.trim().split('\r\n')).toHaveLength(13)
  })

  it('códigos seguem a ordem dos jogadores', () => {
    expect(playerCode(0)).toBe('J01')
    expect(playerCode(11)).toBe('J12')
    const csv = roomCsv([ana, { ...ana }])
    expect(csv).toContain('\r\nJ02;')
  })

  it('texto com ; vai entre aspas', () => {
    const odd = { ...ana, eventLog: [{ turn: 1, description: 'Presente de boas-vindas: x' }], gift: 'a;b' }
    expect(roomCsv([odd])).toContain('"a;b"')
  })
})

describe('GET /api/v1/rooms/:id/export', () => {
  const ADMIN = makeAdminToken({ id: 'admin-1' })

  it('baixa o CSV da sala', async () => {
    prismaMock.room.findUnique.mockResolvedValue({ id: 'room-1', code: 'ABC123', adminId: 'admin-1', maxTurns: 12 })
    prismaMock.character.findMany.mockResolvedValue([ana])
    const res = await request(app).get('/api/v1/rooms/room-1/export').set(authHeader(ADMIN))

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/csv/)
    expect(res.headers['content-disposition']).toContain('sala-ABC123.csv')
    expect(res.text).toContain('J01;agile')
  })

  it('só o administrador da sala', async () => {
    prismaMock.room.findUnique.mockResolvedValue({ id: 'room-1', code: 'ABC123', adminId: 'outro' })
    expect((await request(app).get('/api/v1/rooms/room-1/export').set(authHeader(ADMIN))).status).toBe(403)
    expect(prismaMock.character.findMany).not.toHaveBeenCalled()
  })
})
