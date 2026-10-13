// Testes do relógio do mês no navegador. Rodar com: npm test
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { MINUTE, clockState, clockText, formatClock, isUrgent } from './monthClock.js'

const T0 = Date.UTC(2026, 9, 13, 14, 0, 0)
const at = (min) => T0 + min * MINUTE
const clock = (o = {}) => ({
  status: 'active', paused: false, pausedAt: null, hasDilemma: true,
  monthMinutes: 10, dilemmaMinutes: 5, monthEndsAt: at(10), turnsBy: at(15),
  total: 3, closed: 1, done: 0, me: { phase: 'month', monthEndsAt: at(10), dilemmaEndsAt: null }, ...o,
})

describe('clockState', () => {
  it('mês aberto: quanto falta do mês', () => {
    const s = clockState(clock(), { now: at(3) })
    assert.equal(s.phase, 'month')
    assert.equal(s.monthLeft, 7 * MINUTE)
    assert.equal(s.dilemmaLeft, null)
  })

  it('usa o relógio do servidor (offset)', () => {
    assert.equal(clockState(clock(), { now: at(3), offset: 2 * MINUTE }).monthLeft, 5 * MINUTE)
  })

  it('encerrou: dilema com o tempo que o servidor marcou', () => {
    const s = clockState(clock({ me: { phase: 'dilemma', dilemmaEndsAt: at(9) } }), { now: at(6) })
    assert.equal(s.phase, 'dilemma')
    assert.equal(s.dilemmaLeft, 3 * MINUTE)
  })

  it('o tempo do mês acabou antes do servidor avisar: já abre o dilema aqui', () => {
    const s = clockState(clock(), { now: at(11) })
    assert.equal(s.phase, 'dilemma')
    assert.equal(s.dilemmaLeft, 4 * MINUTE)
  })

  it('respondeu ou o tempo do dilema acabou: esperando a turma', () => {
    const c = clock({ me: { phase: 'dilemma', dilemmaEndsAt: at(9) } })
    assert.equal(clockState(c, { now: at(6), answered: true }).phase, 'done')
    assert.equal(clockState(c, { now: at(9) }).phase, 'done')
  })

  it('mês sem dilema: encerrou, terminou', () => {
    assert.equal(clockState(clock({ hasDilemma: false, me: { phase: 'done' } }), { now: at(4) }).phase, 'done')
  })

  it('pausado: o tempo congela no momento da pausa', () => {
    const c = clock({ paused: true, pausedAt: at(4) })
    assert.equal(clockState(c, { now: at(40) }).monthLeft, 6 * MINUTE)
    assert.equal(clockState(c, { now: at(40) }).paused, true)
  })

  it('sala antiga sem relógio: mês aberto sem contagem', () => {
    const s = clockState(clock({ monthEndsAt: null, turnsBy: null }), { now: at(99) })
    assert.equal(s.phase, 'month')
    assert.equal(s.monthLeft, null)
  })

  it('sem relógio, sala parada ou servidor antigo (sem fase do jogador): null', () => {
    assert.equal(clockState(null), null)
    assert.equal(clockState({ status: 'active', total: 3, ready: 1 }), null)
    assert.equal(clockState(clock({ status: 'finished' })), null)
  })

  it('placar da turma', () => {
    const s = clockState(clock({ total: 12, closed: 7, done: 4 }), { now: at(1) })
    assert.deepEqual([s.total, s.closed, s.done], [12, 7, 4])
  })
})

describe('formatClock / isUrgent', () => {
  it('minutos e segundos, arredondando para cima', () => {
    assert.equal(formatClock(10 * MINUTE), '10:00')
    assert.equal(formatClock(65 * 1000), '1:05')
    assert.equal(formatClock(8_200), '0:09')
    assert.equal(formatClock(0), '0:00')
    assert.equal(formatClock(-5), '0:00')
    assert.equal(formatClock(null), '–:––')
  })

  it('urgente no último minuto', () => {
    assert.equal(isUrgent(61 * 1000), false)
    assert.equal(isUrgent(60 * 1000), true)
    assert.equal(isUrgent(null), false)
  })
})

describe('clockText', () => {
  it('o que aparece em cada fase', () => {
    assert.deepEqual(clockText({ phase: 'month', monthLeft: 5000 }), { label: 'para encerrar o mês', time: 5000 })
    assert.deepEqual(clockText({ phase: 'dilemma', dilemmaLeft: 3000 }), { label: 'para responder o dilema', time: 3000 })
    assert.deepEqual(clockText({ phase: 'done' }), { label: 'Esperando a turma', time: null })
    assert.deepEqual(clockText({ phase: 'month', paused: true, monthLeft: 1 }), { label: 'Relógio pausado pelo professor', time: null })
    assert.equal(clockText({ phase: 'month', monthLeft: null }), null)
    assert.equal(clockText(null), null)
  })
})
