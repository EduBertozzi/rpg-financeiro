// Testes do painel do administrador. Rodar com: npm test
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { closeLabel, filterRooms, missingCount, playersLabel, ranked, roomTitle, taskCount, TASKS } from './adminData.js'

const rooms = [
  { id: 1, status: 'active' }, { id: 2, status: 'waiting' }, { id: 3, status: 'finished' }, { id: 4, status: 'active' },
]

describe('lista de salas', () => {
  it('filtra por situação', () => {
    assert.deepEqual(filterRooms(rooms, 'active').map((r) => r.id), [1, 4])
    assert.deepEqual(filterRooms(rooms, 'finished').map((r) => r.id), [3])
    assert.equal(filterRooms(rooms, 'all').length, 4)
  })

  it('sala sem nome aparece pelo código', () => {
    assert.equal(roomTitle({ name: '', code: 'ABC123' }), 'Sala ABC123')
    assert.equal(roomTitle({ name: '  ', code: 'ABC123' }), 'Sala ABC123')
    assert.equal(roomTitle({ name: '3º ano A', code: 'ABC123' }), '3º ano A')
  })
})

describe('fechar o mês', () => {
  it('botão diz qual mês fecha', () => {
    assert.equal(closeLabel({ currentTurn: 3, maxTurns: 12 }), 'Fechar março')
  })

  it('em dezembro fecha o ano', () => {
    assert.equal(closeLabel({ currentTurn: 12, maxTurns: 12 }), 'Fechar o ano')
  })

  it('conta quem falta', () => {
    assert.equal(missingCount([{ ready: true }, { ready: false }, { ready: false }]), 2)
    assert.equal(missingCount([]), 0)
  })
})

describe('tarefas do jogador', () => {
  it('cinco tarefas na ordem da tabela', () => {
    assert.deepEqual(TASKS.map(([k]) => k), ['dilemma', 'leisure', 'food', 'utilities', 'transport'])
  })

  it('conta só as tarefas que valem no mês (dezembro sem dilema)', () => {
    assert.deepEqual(taskCount({ dilemma: null, leisure: true, food: true, utilities: false, transport: false }), { done: 2, total: 4 })
  })

  it('sem tarefas (sala esperando)', () => {
    assert.deepEqual(taskCount(null), { done: 0, total: 0 })
  })
})

describe('ranking e textos', () => {
  it('ordena pelo patrimônio sem mudar a lista original', () => {
    const list = [{ name: 'a', netWorth: 1 }, { name: 'b', netWorth: 3 }]
    assert.deepEqual(ranked(list).map((p) => p.name), ['b', 'a'])
    assert.equal(list[0].name, 'a')
  })

  it('singular e plural', () => {
    assert.equal(playersLabel(1), '1 jogador')
    assert.equal(playersLabel(0), '0 jogadores')
  })
})
