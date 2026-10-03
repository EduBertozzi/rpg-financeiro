import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newAchievements, skillUnlocked } from './achievements.js'

const base = { id: 'c1', cash: 1000, eventLog: [], fixedInvestments: [], positions: [], unlockedSkills: [] }
const ids = (list) => list.map((a) => a.id)

test('pagar a última tarefa do mês dá "Mês em dia"', () => {
  const four = ['Dilema "x"', 'Lazer: y', 'Conta: Mercadinho', 'Conta: Água e Luz'].map((d) => ({ turn: 3, description: d }))
  const prev = { ...base, eventLog: four }
  const next = { ...base, eventLog: [...four, { turn: 3, description: 'Conta: Internet e Celular' }] }
  assert.deepEqual(ids(newAchievements(prev, next, 3)), ['month_clean'])
})

test('primeira caixinha, primeira ação e primeira habilidade', () => {
  const next = { ...base, fixedInvestments: [{ id: 'f' }], positions: [{ quantity: 2 }], unlockedSkills: [{ id: 's' }] }
  assert.deepEqual(ids(newAchievements(base, next, 2)), ['first_box', 'first_stock', 'first_skill'])
})

test('ação com quantidade zero não conta', () => {
  assert.deepEqual(newAchievements(base, { ...base, positions: [{ quantity: 0 }] }, 2), [])
})

test('saiu do vermelho só quando o saldo passa de negativo para positivo', () => {
  assert.deepEqual(ids(newAchievements({ ...base, cash: -50 }, { ...base, cash: 10 }, 2)), ['out_of_red'])
  assert.deepEqual(newAchievements({ ...base, cash: 10 }, { ...base, cash: 20 }, 2), [])
})

test('o que já era verdade antes não comemora de novo', () => {
  const had = { ...base, fixedInvestments: [{ id: 'f' }] }
  assert.deepEqual(newAchievements(had, { ...had, fixedInvestments: [{ id: 'f' }, { id: 'g' }] }, 2), [])
})

test('conquista já vista não volta', () => {
  const next = { ...base, fixedInvestments: [{ id: 'f' }] }
  assert.deepEqual(newAchievements(base, next, 2, new Set(['first_box'])), [])
})

test('personagem diferente ou sem dados: nada', () => {
  assert.deepEqual(newAchievements(base, { ...base, id: 'c2', fixedInvestments: [{}] }, 2), [])
  assert.deepEqual(newAchievements(null, base, 2), [])
})

test('skillUnlocked: confete a cada habilidade nova', () => {
  assert.equal(skillUnlocked(base, { ...base, unlockedSkills: [{}] }), true)
  assert.equal(skillUnlocked({ ...base, unlockedSkills: [{}] }, { ...base, unlockedSkills: [{}, {}] }), true)
  assert.equal(skillUnlocked(base, base), false)
})
