import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hashKey, gateState } from './gate.js'

const KEY = 'chave-de-teste'
const keyHash = hashKey(KEY)

test('hashKey é estável e tem 8 dígitos hexadecimais', () => {
  assert.equal(hashKey(KEY), keyHash)
  assert.match(keyHash, /^[0-9a-f]{8}$/)
  assert.notEqual(hashKey('outra'), keyHash)
})

test('destravado: abre para todo mundo', () => {
  assert.deepEqual(gateState({ locked: false, keyHash }), { open: true, save: null })
})

test('travado e sem chave: fica fechado', () => {
  assert.deepEqual(gateState({ locked: true, keyHash }), { open: false, save: null })
})

test('chave certa na URL abre e manda salvar', () => {
  assert.deepEqual(gateState({ locked: true, keyHash, search: `?chave=${KEY}` }), { open: true, save: keyHash })
})

test('chave errada na URL não abre', () => {
  assert.deepEqual(gateState({ locked: true, keyHash, search: '?chave=chute' }), { open: false, save: null })
})

test('quem já abriu uma vez entra direto', () => {
  assert.deepEqual(gateState({ locked: true, keyHash, stored: keyHash }), { open: true, save: null })
})

test('valor salvo antigo ou falso não abre', () => {
  assert.equal(gateState({ locked: true, keyHash, stored: 'abc' }).open, false)
})
