// Testes dos dados da criação de personagem. Rodar com: npm test
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { GIFTS, PROFESSIONS, giftById, registrationNumber } from './gifts.js'

describe('dons', () => {
  it('são os 3 dons que o servidor aceita', () => {
    assert.deepEqual(GIFTS.map((g) => g.id), ['frugal', 'agile', 'smart'])
  })

  it('valem quase o mesmo no ano (±10% de R$ 3.600)', () => {
    for (const g of GIFTS) assert.ok(Math.abs(g.year - 3600) <= 360, `${g.id}: ${g.year}`)
  })

  it('giftById acha o dom ou devolve null', () => {
    assert.equal(giftById('agile').name, 'Desenrolado')
    assert.equal(giftById('xyz'), null)
    assert.equal(giftById(undefined), null)
  })
})

describe('profissões', () => {
  it('a primeira é Engenheiro(a) de Produção', () => {
    assert.equal(PROFESSIONS[0], 'Engenheiro(a) de Produção')
  })

  it('não tem repetidas', () => {
    assert.equal(new Set(PROFESSIONS).size, PROFESSIONS.length)
  })
})

describe('registrationNumber', () => {
  it('tem o formato SR-000000', () => {
    for (const name of ['Dudu', 'Ana Paula', '', null]) assert.match(registrationNumber(name), /^SR-\d{6}$/)
  })

  it('é o mesmo para o mesmo nome, ignorando maiúsculas e espaços nas pontas', () => {
    assert.equal(registrationNumber('Dudu'), registrationNumber('  dudu '))
  })

  it('muda quando o nome muda', () => {
    assert.notEqual(registrationNumber('Dudu'), registrationNumber('Duda'))
  })
})
