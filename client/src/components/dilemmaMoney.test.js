// Testes do dinheiro na carta do dilema. Rodar com: npm test
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { afterLabel, cashAfter, payNow, savedTotal } from './dilemmaMoney.js'

const brl = (v) => `R$ ${v}`

describe('dinheiro na carta do dilema', () => {
  it('à vista sai o preço; parcelado sai só a primeira parcela', () => {
    assert.equal(payNow({ price: 3620 }), 3620)
    assert.equal(payNow({ price: 335.2, installment: { amount: 335.2, count: 12 } }), 335.2)
    assert.equal(payNow({}), 0)
  })

  it('quanto sobra na conta', () => {
    assert.equal(cashAfter(3000, { price: 3620 }), -620)
    assert.equal(cashAfter('3000', { installment: { amount: 335.2, count: 12 } }), 2664.8)
    assert.equal(cashAfter(1000, { price: 0 }), 1000)
  })

  it('máquina de lavar com R$ 3.000: à vista entra no cheque especial, parcelado não', () => {
    assert.equal(afterLabel(3000, { price: 3620 }, brl).negative, true)
    assert.equal(afterLabel(3000, { price: 335.2, installment: { amount: 335.2, count: 12 } }, brl).negative, false)
  })

  it('textos do que sobra', () => {
    assert.deepEqual(afterLabel(1000, { price: 300 }, brl), { text: 'sobram R$ 700 na conta', negative: false })
    assert.deepEqual(afterLabel(100, { price: 300 }, brl), { text: 'fica −R$ 200: entra no cheque especial', negative: true })
  })

  it('soma só as caixinhas abertas', () => {
    assert.equal(savedTotal([{ amount: '1000.50' }, { amount: 2000 }, { amount: 500, redeemedAt: '2026-01-01' }]), 3000.5)
    assert.equal(savedTotal(), 0)
  })
})
