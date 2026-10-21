// Testes do gráfico grande do patrimônio. Rodar com: npm test
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { chartPoints, chartScale } from './worthChart.js'

describe('chartPoints', () => {
  const series = [{ turn: 1, value: 3000, cash: 3000 }, { turn: 2, value: 4200, cash: 1200 }]

  it('um ponto por mês fechado, mais o de agora no mês que está rolando', () => {
    const pts = chartPoints(series, { value: 3900, cash: 900 }, 3)
    assert.deepEqual(pts.map((p) => [p.turn, p.value, p.live]), [[1, 3000, false], [2, 4200, false], [3, 3900, true]])
  })

  it('variação em relação ao mês anterior (o primeiro não tem)', () => {
    const pts = chartPoints(series, { value: 3900, cash: 900 }, 3)
    assert.deepEqual(pts.map((p) => p.delta), [null, 1200, -300])
  })

  it('o ponto de agora não repete um mês que já fechou', () => {
    assert.equal(chartPoints(series, { value: 1, cash: 1 }, 2).length, 2)
  })

  it('sem nada: vazio; só o de agora: um ponto', () => {
    assert.deepEqual(chartPoints([], null, 0), [])
    assert.deepEqual(chartPoints([], { value: 500, cash: 500 }, 1).map((p) => p.value), [500])
  })
})

describe('chartScale', () => {
  it('passos redondos, incluindo o zero', () => {
    const s = chartScale([3000, 4200, 3900])
    assert.equal(s.min, 0)
    assert.ok(s.max >= 4200)
    assert.ok([500, 1000, 1250, 2000, 2500].includes(s.step))
    assert.equal(s.ticks[0], 0)
    assert.equal(s.ticks.at(-1), s.max)
  })

  it('valor negativo (cheque especial) desce abaixo do zero', () => {
    const s = chartScale([-1500, 2000])
    assert.ok(s.min <= -1500)
    assert.ok(s.ticks.includes(0))
  })

  it('tudo zero não quebra', () => {
    const s = chartScale([0, 0])
    assert.ok(s.max > s.min)
  })
})
