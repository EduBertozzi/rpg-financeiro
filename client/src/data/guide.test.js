// Testes do caderninho. Rodar com: npm test
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { BOX_TERM, GLOSSARY, PRODUCTS, overdraftAfter, searchGlossary, termOf, yearlyNet } from './guide.js'
import { BOXES } from '../pages/Bank/bankData.js'

const byTerm = (t) => PRODUCTS.find((p) => p.term === t)

describe('quanto R$ 1.000 rende em um ano (sem IR)', () => {
  it('poupança: R$ 65 (isenta)', () => assert.equal(yearlyNet(byTerm('Poupança')), 65))
  it('CDB: 106% do CDI menos 17,5% de IR = R$ 90,95', () => assert.equal(yearlyNet(byTerm('CDB')), 90.95))
  it('Tesouro Selic: 11,1% menos 15% = R$ 94,35', () => assert.equal(yearlyNet(byTerm('Tesouro Selic')), 94.35))
  it('LCI: 108% do CDI, isenta = R$ 112,32', () => assert.equal(yearlyNet(byTerm('LCI')), 112.32))
  it('LCA: Selic + 2,6%, isenta = R$ 131', () => assert.equal(yearlyNet(byTerm('LCA')), 131))
  it('Tesouro Prefixado: 13,5% menos 15% = R$ 114,75', () => assert.equal(yearlyNet(byTerm('Tesouro Prefixado')), 114.75))
  it('Debênture: 18%, isenta = R$ 180', () => assert.equal(yearlyNet(byTerm('Debênture')), 180))
  it('o valor investido muda o rendimento na mesma proporção', () => assert.equal(yearlyNet(byTerm('LCA'), 5000), 655))
})

describe('cheque especial', () => {
  it('R$ 1.000 a 8% ao mês viram R$ 2.518,17 em um ano', () => assert.equal(overdraftAfter(1000), 2518.17))
  it('com a habilidade (4%) viram R$ 1.601,03', () => assert.equal(overdraftAfter(1000, 12, 0.04), 1601.03))
})

describe('glossário', () => {
  it('em ordem alfabética, sem repetir', () => {
    const terms = GLOSSARY.map((g) => g.term)
    assert.equal(new Set(terms).size, terms.length)
    assert.deepEqual(terms.slice(0, -1), [...terms.slice(0, -1)].sort((a, b) => a.localeCompare(b, 'pt-BR')))
  })

  it('todo termo tem explicação e onde aparece no jogo', () => {
    for (const g of GLOSSARY) {
      assert.ok(g.text.length > 20, g.term)
      assert.ok(g.ingame.length > 5, g.term)
    }
  })

  it('toda caixinha do banco tem página no glossário', () => {
    for (const box of BOXES) assert.ok(termOf(BOX_TERM[box.type]), box.type)
  })

  it('todo produto da tabela de rendimento tem página', () => {
    for (const p of PRODUCTS) assert.ok(termOf(p.term), p.term)
  })

  it('busca sem ligar para acento e maiúscula', () => {
    assert.deepEqual(searchGlossary('INFLACAO').map((g) => g.term), ['Inflação'])
    assert.ok(searchGlossary('governo').some((g) => g.term === 'Tesouro Selic'))
  })

  it('busca vazia mostra tudo', () => {
    assert.equal(searchGlossary('  ').length, GLOSSARY.length)
  })

  it('termo que não existe', () => {
    assert.equal(termOf('Bitcoin'), null)
    assert.deepEqual(searchGlossary('xyzw'), [])
  })
})
