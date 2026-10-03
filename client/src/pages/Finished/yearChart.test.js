// Testes do gráfico da tela de fim de ano. Rodar com: npm test
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { consequenceNote, endOfMonthSeries, linePoints, monthName, niceMax, yearGain } from './yearChart.js'

describe('niceMax', () => {
  it('arredonda para cima num passo bonito', () => {
    assert.equal(niceMax([45140, 29800]), 50000)
    assert.equal(niceMax([12000]), 20000)
    assert.equal(niceMax([7000]), 10000)
    assert.equal(niceMax([2300]), 2500)
    assert.equal(niceMax([100000]), 100000)
  })

  it('sem valores ou só negativos usa R$ 1.000', () => {
    assert.equal(niceMax([]), 1000)
    assert.equal(niceMax([-500, 0]), 1000)
  })

  it('ignora valores que não são números', () => {
    assert.equal(niceMax([NaN, 900, undefined]), 1000)
  })
})

describe('linePoints', () => {
  const box = { x0: 0, x1: 110, y0: 100, y1: 0, maxTurn: 12, max: 1000 }

  it('mês 1 fica na esquerda e mês 12 na direita', () => {
    assert.equal(linePoints([{ turn: 1, netWorth: 0 }, { turn: 12, netWorth: 1000 }], box), '0.0,100.0 110.0,0.0')
  })

  it('valor negativo encosta no zero e acima do topo fica no topo', () => {
    assert.equal(linePoints([{ turn: 1, netWorth: -300 }, { turn: 12, netWorth: 5000 }], box), '0.0,100.0 110.0,0.0')
  })

  it('aceita o valor como texto (Decimal do servidor)', () => {
    assert.equal(linePoints([{ turn: 6, netWorth: '500' }], box), '50.0,50.0')
  })
})

describe('yearGain', () => {
  it('é o último menos o primeiro', () => {
    assert.equal(yearGain([{ netWorth: 7000 }, { netWorth: 12000 }, { netWorth: 45140 }]), 38140)
  })

  it('sem dados é zero', () => {
    assert.equal(yearGain([]), 0)
  })
})

describe('endOfMonthSeries', () => {
  it('a virada para o mês N mostra o fim do mês N-1', () => {
    assert.deepEqual(endOfMonthSeries([{ turn: 2, netWorth: 1 }, { turn: 13, netWorth: 2 }]), [
      { turn: 1, netWorth: 1 }, { turn: 12, netWorth: 2 },
    ])
  })

  it('ignora o que cai fora do ano', () => {
    assert.deepEqual(endOfMonthSeries([{ turn: 1, netWorth: 0 }, { turn: 14, netWorth: 0 }]), [])
  })

  it('aceita o mês como texto e lista vazia', () => {
    assert.deepEqual(endOfMonthSeries([{ turn: '3', netWorth: 5 }]), [{ turn: 2, netWorth: 5 }])
    assert.deepEqual(endOfMonthSeries(), [])
  })
})

describe('linha do tempo das escolhas', () => {
  it('nome do mês da virada', () => {
    assert.equal(monthName(6), 'junho')
    assert.equal(monthName(13), '')
  })

  it('parcelas mostram quantas foram pagas', () => {
    assert.equal(consequenceNote({ count: 11, applied: 8, turn: 5 }), '8 de 11 pagas, 3 ficam como dívida')
    assert.equal(consequenceNote({ count: 5, applied: 5, turn: 8 }), '5 de 5 pagas')
  })

  it('consequência única mostra o mês em que chegou', () => {
    assert.equal(consequenceNote({ count: 1, applied: 1, turn: 5 }), 'em maio')
  })

  it('consequência que não chegou avisa', () => {
    assert.equal(consequenceNote({ count: 1, applied: 0, turn: 12 }), 'ainda não chegou')
  })
})
