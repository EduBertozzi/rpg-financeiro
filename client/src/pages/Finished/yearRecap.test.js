// Testes das contas da tela de fim de ano. Rodar com: npm test
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { decisionImpact, pickDecisions, podiumSlots, roomComparison } from './yearRecap.js'

const P = (name, netWorth, rank, isSelf = false) => ({ characterId: name, name, netWorth, rank, isSelf, avatarId: 1 })

describe('podiumSlots', () => {
  const players = [P('Ana', 9000, 1), P('Bia', 8000, 2), P('Caio', 7000, 3), P('Duda', 6000, 4)]

  it('3+ jogadores: colunas 2º, 1º, 3º e ninguém além do 3º', () => {
    assert.deepEqual(podiumSlots(players).map((s) => [s.player.name, s.place]), [['Bia', 2], ['Ana', 1], ['Caio', 3]])
  })

  it('o 3º entra primeiro e o 1º por último', () => {
    const enter = Object.fromEntries(podiumSlots(players).map((s) => [s.place, s.enter]))
    assert.deepEqual(enter, { 3: 0, 2: 1, 1: 2 })
  })

  it('2 jogadores: 2º e 1º, o 2º entra antes', () => {
    const slots = podiumSlots(players.slice(0, 2))
    assert.deepEqual(slots.map((s) => [s.place, s.enter]), [[2, 0], [1, 1]])
  })

  it('1 jogador: só o 1º, entrando na hora', () => {
    assert.deepEqual(podiumSlots(players.slice(0, 1)).map((s) => [s.place, s.enter]), [[1, 0]])
  })

  it('sem jogadores: vazio', () => {
    assert.deepEqual(podiumSlots([]), [])
    assert.deepEqual(podiumSlots(), [])
  })

  it('empate usa a posição do ranking', () => {
    const tie = [P('Ana', 9000, 1), P('Bia', 9000, 1), P('Caio', 7000, 3)]
    assert.deepEqual(podiumSlots(tie).map((s) => s.place), [1, 1, 3])
  })

  it('sem rank no jogador, usa a ordem da lista', () => {
    const slots = podiumSlots([{ name: 'A' }, { name: 'B' }])
    assert.deepEqual(slots.map((s) => s.place), [2, 1])
  })
})

describe('roomComparison', () => {
  const roomAverage = [{ turn: 12, netWorth: 7000 }, { turn: 13, netWorth: 7500.5 }]

  it('abaixo do 1º e acima da média: diferenças em R$ e frase de incentivo', () => {
    const r = roomComparison({
      breakdown: { netWorth: 8000 },
      players: [P('Ana', 9500.25, 1), P('Eu', 8000, 2, true)],
      roomAverage,
    })
    assert.equal(r.mine, 8000)
    assert.equal(r.best, 9500.25)
    assert.equal(r.bestName, 'Ana')
    assert.equal(r.isLeader, false)
    assert.equal(r.average, 7500.5)
    assert.equal(r.toBest, 1500.25)
    assert.equal(r.vsAverage, 499.5)
    assert.match(r.message, /acima da média/)
    assert.match(r.message, /1\.500/)
  })

  it('o próprio jogador em 1º: parabéns e diferença zero', () => {
    const r = roomComparison({ breakdown: { netWorth: 9500 }, players: [P('Eu', 9500, 1, true), P('Ana', 8000, 2)], roomAverage })
    assert.equal(r.isLeader, true)
    assert.equal(r.toBest, 0)
    assert.match(r.message, /Parabéns/)
  })

  it('empatado no 1º também é líder', () => {
    const r = roomComparison({ breakdown: { netWorth: 9500 }, players: [P('Ana', 9500, 1), P('Eu', 9500, 1, true)], roomAverage })
    assert.equal(r.isLeader, true)
  })

  it('abaixo da média: frase amigável, diferença negativa', () => {
    const r = roomComparison({ breakdown: { netWorth: 5000 }, players: [P('Ana', 9500, 1), P('Eu', 5000, 2, true)], roomAverage })
    assert.equal(r.vsAverage, -2500.5)
    assert.match(r.message, /abaixo da média/)
  })

  it('sem ranking (sala jogando): sem 1º, mas com média', () => {
    const r = roomComparison({ breakdown: { netWorth: 8000 }, roomAverage })
    assert.equal(r.best, null)
    assert.equal(r.toBest, null)
    assert.equal(r.isLeader, false)
    assert.equal(r.vsAverage, 499.5)
    assert.match(r.message, /acima da média/)
  })

  it('sem nada: não quebra', () => {
    const r = roomComparison()
    assert.equal(r.mine, 0)
    assert.equal(r.average, null)
    assert.equal(r.best, null)
    assert.equal(typeof r.message, 'string')
  })
})

const item = (turn, amount, consequences = [], extra = {}) => ({ turn, title: `Dilema ${turn}`, label: 'A', choice: `Escolha ${turn}`, amount, consequences, ...extra })
const cons = (amount, pending = 0, label = 'X: algo') => ({ label, turn: 12, amount, pending, count: 1, applied: pending ? 0 : 1 })

describe('decisionImpact', () => {
  it('só o custo na hora', () => {
    assert.equal(decisionImpact(item(1, 450)), -450)
  })

  it('custo na hora + o que voltou depois', () => {
    // emprestou 750 e o amigo devolveu 810
    assert.equal(decisionImpact(item(2, 750, [cons(810)])), 60)
  })

  it('soma as consequências e o que ainda falta pagar (parcelas)', () => {
    // máquina: 1ª parcela na hora, 8 pagas, 3 viram dívida
    assert.equal(decisionImpact(item(4, 502.8, [cons(-4022.4, -1508.4)])), -6033.6)
  })

  it('arredonda em centavos', () => {
    assert.equal(decisionImpact(item(1, 0.1, [cons(0.3)])), 0.2)
  })

  it('sem custo e sem consequência: zero', () => {
    assert.equal(decisionImpact(item(8, 0)), 0)
    assert.equal(decisionImpact({}), 0)
  })
})

describe('pickDecisions', () => {
  const timeline = [
    item(1, 450),                                 // −450
    item(2, 750, [cons(810)]),                    // +60
    item(3, 0, [cons(-750)]),                     // −750
    item(4, 5430),                                // −5430
    item(8, 0),                                   // 0
    item(9, 1200, [cons(1575, 0, 'Promoção: Salário maior')]), // +375
    item(11, 2172, [cons(7500, 0, 'Processo: Você ganhou a causa')]), // +5328
  ]

  it('as 3 que mais ajudaram, da melhor para a pior', () => {
    const { best } = pickDecisions(timeline)
    assert.deepEqual(best.map((d) => [d.turn, d.impact]), [[11, 5328], [9, 375], [2, 60]])
  })

  it('a que mais custou', () => {
    const { worst } = pickDecisions(timeline)
    assert.equal(worst.turn, 4)
    assert.equal(worst.impact, -5430)
  })

  it('traz mês, dilema, opção escolhida e a consequência principal', () => {
    const [top] = pickDecisions(timeline).best
    assert.deepEqual(
      { turn: top.turn, title: top.title, label: top.label, choice: top.choice, note: top.note },
      { turn: 11, title: 'Dilema 11', label: 'A', choice: 'Escolha 11', note: 'Você ganhou a causa' }
    )
  })

  it('sem consequência, a nota fica vazia', () => {
    const { worst } = pickDecisions(timeline)
    assert.equal(worst.note, null)
  })

  it('a que mais custou nunca aparece entre as melhores', () => {
    const { best, worst } = pickDecisions([item(1, 100), item(2, 200), item(3, 300)])
    assert.equal(worst.turn, 3)
    assert.deepEqual(best.map((d) => d.turn), [1, 2])
  })

  it('empate no valor: a que trouxe algo de bom vem antes, depois a mais cedo', () => {
    const { best } = pickDecisions([item(5, 0), item(3, 0), item(7, 100, [cons(100)]), item(9, 900)])
    assert.deepEqual(best.map((d) => d.turn), [7, 3, 5])
  })

  it('se nada custou dinheiro, não há "a que mais custou"', () => {
    const { best, worst } = pickDecisions([item(2, 750, [cons(810)]), item(8, 0)])
    assert.equal(worst, null)
    assert.equal(best.length, 2)
  })

  it('uma escolha só: aparece como melhor, sem pior', () => {
    const { best, worst } = pickDecisions([item(1, 450)])
    assert.equal(best.length, 1)
    assert.equal(worst, null)
  })

  it('linha do tempo vazia', () => {
    assert.deepEqual(pickDecisions([]), { best: [], worst: null })
    assert.deepEqual(pickDecisions(), { best: [], worst: null })
  })

  it('não muda a lista original', () => {
    const copy = JSON.parse(JSON.stringify(timeline))
    pickDecisions(timeline)
    assert.deepEqual(timeline, copy)
  })
})
