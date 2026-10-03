// Testes do calendário de clima do mapa. Rodar com: npm test
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { PARTICLES, WEATHER, treeColors, weatherFor } from './weather.js'

describe('calendário do clima', () => {
  it('tem os 12 meses, em ordem', () => {
    assert.deepEqual(WEATHER.map((w) => w.month), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  it('segue as estações do Brasil', () => {
    const season = (m) => weatherFor(m).season
    for (const m of [1, 2, 3, 12]) assert.equal(season(m), 'Verão')
    for (const m of [4, 5]) assert.equal(season(m), 'Outono')
    for (const m of [6, 7, 8]) assert.equal(season(m), 'Inverno')
    for (const m of [9, 10, 11]) assert.equal(season(m), 'Primavera')
  })

  it('fevereiro tem tempestade, junho bandeirinhas, julho neve e dezembro luzinhas', () => {
    assert.equal(weatherFor(2).fx, 'storm')
    assert.equal(weatherFor(6).deco, 'flags')
    assert.equal(weatherFor(7).snow, true)
    assert.equal(weatherFor(12).deco, 'lights')
  })

  it('todo clima tem partículas conhecidas', () => {
    for (const w of WEATHER) assert.ok(w.fx in PARTICLES, w.label)
  })

  it('mês fora da partida não tem clima', () => {
    for (const m of [0, 13, undefined, null]) assert.equal(weatherFor(m), null)
  })
})

describe('treeColors', () => {
  it('sem clima, as árvores ficam verdes', () => {
    assert.deepEqual(treeColors(null), ['#2F9E44', '#51CF66'])
    assert.deepEqual(treeColors(null, { muted: true }), ['#6FA873', '#8CC08D'])
  })

  it('no outono as árvores ficam laranja', () => {
    assert.equal(treeColors(weatherFor(4))[0], '#E8742C')
  })

  it('em setembro metade dos ipês fica rosa e metade amarela', () => {
    const w = weatherFor(9)
    assert.deepEqual(treeColors(w, { u: 2, v: 2 }), ['#E85A9C', '#FF8CC0'])
    assert.deepEqual(treeColors(w, { u: 2, v: 3 }), ['#F2C230', '#FFD84D'])
  })

  it('as árvores do fundo (muted) nunca usam a cor alternativa', () => {
    assert.deepEqual(treeColors(weatherFor(9), { muted: true, u: 2, v: 2 }), weatherFor(9).trees.muted)
  })
})
