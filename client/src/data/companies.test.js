// Testes de quem é quem na cidade e da trava de ir a pé. Rodar com: npm test
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { COMPANIES, COMPANY_IDS } from './companies.js'
import { remainingSeconds, walkLockKey } from '../components/walkTimer.js'

describe('empresas da cidade', () => {
  it('tem as 7 empresas do relatório', () => {
    assert.deepEqual(COMPANY_IDS, ['bank', 'leisure', 'mercadinho', 'utilities', 'internet', 'landlord', 'university'])
  })

  it('toda empresa tem nome, história, o que se paga e uma dica', () => {
    for (const c of Object.values(COMPANIES)) {
      for (const key of ['name', 'story', 'pays', 'tip']) assert.ok(c[key]?.length > 3, `${c.name} sem ${key}`)
    }
  })

  it('o banco continua sendo o Maré', () => {
    assert.equal(COMPANIES.bank.name, 'Banco Maré')
  })
})

describe('trava de ir a pé', () => {
  it('a chave é por personagem e por mês', () => {
    assert.equal(walkLockKey('c1', 8), 'walk:c1:8')
  })

  it('conta os segundos que faltam, arredondando para cima', () => {
    assert.equal(remainingSeconds(30_000, 0), 30)
    assert.equal(remainingSeconds(30_000, 29_001), 1)
    assert.equal(remainingSeconds(30_000, 30_000), 0)
  })

  it('nunca fica negativo', () => {
    assert.equal(remainingSeconds(1_000, 50_000), 0)
  })
})
