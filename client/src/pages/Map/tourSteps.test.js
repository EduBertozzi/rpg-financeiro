// Testes do tour do primeiro mês. Rodar com: npm test
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { cardPosition, TOUR_STEPS, tourKey } from './tourSteps.js'

const view = { width: 1440, height: 900 }
const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height })

describe('passos do tour', () => {
  it('começa no meio da tela e termina no caderninho', () => {
    assert.equal(TOUR_STEPS[0].target, null)
    assert.equal(TOUR_STEPS.at(-1).target, 'caderninho')
  })

  it('passa por saldo, checklist, lugares e encerrar', () => {
    assert.deepEqual(TOUR_STEPS.map((s) => s.target).filter(Boolean), ['saldo', 'checklist', 'lugares', 'encerrar', 'caderninho'])
  })

  it('todo passo tem título e texto curtos', () => {
    for (const s of TOUR_STEPS) {
      assert.ok(s.title.length <= 40, s.title)
      assert.ok(s.text.length <= 220, s.title)
    }
  })

  it('a chave de já visto é por personagem', () => {
    assert.equal(tourKey('c1'), 'tour:c1')
  })
})

describe('cardPosition', () => {
  it('sem alvo: no meio da tela', () => {
    assert.deepEqual(cardPosition(null, view), { left: 550, top: 340 })
  })

  it('alvo à esquerda (barra lateral): cartão à direita dele', () => {
    assert.deepEqual(cardPosition(rect(10, 100, 60, 80), view), { left: 86, top: 100 })
  })

  it('alvo no canto direito (caderninho): cartão à esquerda, sem sair embaixo', () => {
    const pos = cardPosition(rect(1350, 780, 80, 110), view)
    assert.equal(pos.left, 1350 - 16 - 340)
    assert.ok(pos.top + 220 <= 900 - 16)
  })

  it('alvo largo que não deixa espaço dos lados: embaixo dele', () => {
    assert.deepEqual(cardPosition(rect(0, 100, 1440, 100), view), { left: 16, top: 216 })
  })

  it('alvo largo no pé da tela: em cima dele', () => {
    const pos = cardPosition(rect(0, 750, 1440, 140), view)
    assert.equal(pos.top, 750 - 16 - 220)
  })
})
