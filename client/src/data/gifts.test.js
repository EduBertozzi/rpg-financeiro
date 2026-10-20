// Testes dos dados da criação de personagem. Rodar com: npm test
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { GIFTS, PROFESSIONS, giftById, registrationNumber } from './gifts.js'

describe('dons', () => {
  it('são os 3 dons que o servidor aceita', () => {
    assert.deepEqual(GIFTS.map((g) => g.id), ['frugal', 'agile', 'smart'])
  })

  it('valor no ano pelas regras de 20/10/2026', () => {
    assert.equal(giftById('frugal').year, 0.05 * (2100 + 1000 + 250 + 250) * 12) // 2.160
    assert.equal(giftById('agile').year, 120 * 12 + 0.25 * 1392) // 1.788
    assert.equal(giftById('smart').year, (100 + 0.075 * 1000) * 12) // 2.100 (estimativa)
  })

  it('ficam a até 20% de R$ 1.800 (o aluguel de R$ 2.100 deixou o frugal 20% acima)', () => {
    for (const g of GIFTS) assert.ok(Math.abs(g.year - 1800) <= 360, `${g.id}: ${g.year}`)
    assert.equal(giftById('frugal').year - giftById('agile').year, 372)
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
  it('tem o formato FM-000000', () => {
    for (const name of ['Dudu', 'Ana Paula', '', null]) assert.match(registrationNumber(name), /^FM-\d{6}$/)
  })

  it('é o mesmo para o mesmo nome, ignorando maiúsculas e espaços nas pontas', () => {
    assert.equal(registrationNumber('Dudu'), registrationNumber('  dudu '))
  })

  it('muda quando o nome muda', () => {
    assert.notEqual(registrationNumber('Dudu'), registrationNumber('Duda'))
  })
})
