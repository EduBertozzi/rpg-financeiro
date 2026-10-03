import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TASKS, monthTasks, worthSeries, worthNow, sparkPoints, pointsLeft } from './sidebarData.js'

const log = (turn, description) => ({ turn, description })

test('monthTasks: as 5 tarefas, marcando o que já foi feito no mês', () => {
  const logs = [
    log(4, 'Dilema "Dor de dente" — Opção A: ...'),
    log(4, 'Conta: Mercadinho (-R$ 1000.00)'),
    log(3, 'Lazer: Cinema (-R$ 200.00)'), // mês passado não conta
  ]
  const tasks = monthTasks(logs, 4)
  assert.deepEqual(tasks.map((t) => t.id), TASKS.map((t) => t.id))
  assert.deepEqual(tasks.map((t) => t.done), [true, false, true, false, false])
})

test('monthTasks: dezembro não tem dilema', () => {
  assert.deepEqual(monthTasks([], 12).map((t) => t.id), ['leisure', 'food', 'utilities', 'internet'])
})

test('monthTasks: sala esperando (mês 0) não tem tarefa', () => {
  assert.deepEqual(monthTasks([log(0, 'Lazer: x')], 0), [])
  assert.deepEqual(monthTasks(undefined, undefined), [])
})

test('monthTasks: dilema sem resposta (inércia) também conta como feito', () => {
  const t = monthTasks([log(2, 'Dilema "Chave perdida" — Sem resposta: ...')], 2)
  assert.equal(t[0].done, true)
})

test('worthSeries: retrato da virada vira o mês que fechou, em ordem, Decimal em número', () => {
  const s = worthSeries([{ turn: 3, netWorth: '15000.5' }, { turn: 2, netWorth: 12000 }, { turn: 4, netWorth: null }])
  assert.deepEqual(s, [{ turn: 1, value: 12000, cash: 0 }, { turn: 2, value: 15000.5, cash: 0 }])
})

test('worthSeries: o fechamento final (turn 13) é dezembro', () => {
  assert.deepEqual(worthSeries([{ turn: 13, netWorth: 50000, cash: '1200.5' }]), [{ turn: 12, value: 50000, cash: 1200.5 }])
})

test('worthNow: na virada, igual ao retrato; a mudança é a da última virada', () => {
  const series = [{ turn: 2, value: 12000, cash: 5000 }, { turn: 3, value: 11700.4, cash: 6000 }]
  assert.deepEqual(worthNow(series, 6000), { value: 11700.4, delta: -299.6 })
})

test('worthNow: conta paga depois da virada baixa o patrimônio na hora', () => {
  const series = [{ turn: 3, value: 18000, cash: 14000 }]
  assert.deepEqual(worthNow(series, 12650.5), { value: 16650.5, delta: null })
})

test('worthNow: janeiro, sem virada ainda, mostra o saldo e nenhuma mudança', () => {
  assert.deepEqual(worthNow([], '7500'), { value: 7500, delta: null })
  assert.deepEqual(worthNow([{ turn: 2, value: 9000, cash: 1 }], 1), { value: 9000, delta: null })
})

test('sparkPoints: 12 meses na largura toda, valor maior mais alto', () => {
  const p = sparkPoints([{ turn: 1, value: 100 }, { turn: 12, value: 200 }], { w: 100, h: 20, pad: 0 })
  assert.equal(p.line, '0,20 100,0')
  assert.deepEqual(p.last, { x: 100, y: 0 })
  assert.equal(p.area, '0,20 0,20 100,0 100,20')
})

test('sparkPoints: linha reta no meio quando o patrimônio não muda; nada sem dados', () => {
  const p = sparkPoints([{ turn: 1, value: 50 }, { turn: 2, value: 50 }], { w: 100, h: 20, pad: 0 })
  assert.match(p.line, /,10 .*,10$/)
  assert.equal(sparkPoints([]), null)
})

test('sparkPoints: diferença pequena não vira penhasco (altura mínima de 20% do valor)', () => {
  const p = sparkPoints([{ turn: 1, value: 10000 }, { turn: 2, value: 10200 }], { w: 100, h: 100, pad: 0 })
  const ys = p.line.split(' ').map((pt) => Number(pt.split(',')[1]))
  assert.ok(ys[0] - ys[1] < 15, `subida de ${ys[0] - ys[1]}px`)
})

test('pointsLeft: total menos usados, nunca negativo', () => {
  assert.equal(pointsLeft({ totalPoints: 3, usedPoints: 1 }), 2)
  assert.equal(pointsLeft({ totalPoints: 1, usedPoints: 2 }), 0)
  assert.equal(pointsLeft(null), 0)
})
