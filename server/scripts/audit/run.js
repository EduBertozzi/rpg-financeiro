// Auditoria do dinheiro do Fecha o Mês, de ponta a ponta.
//
// Sobe o servidor de verdade num banco SQLite temporário (migrations + seed),
// cria UM jogador e joga os 12 meses pelas rotas do jogo, fazendo coisas
// conhecidas. A cada passo compara o saldo, o extrato, as caixinhas, o resumo
// da virada e o patrimônio com o valor calculado À MÃO aqui no script.
//
// As fórmulas deste arquivo são escritas aqui, independentes do servidor: nada
// de server/src/utils para calcular o esperado. Daqui só saem os dados do jogo
// (tabelas de preço, dilemas, imprevistos), escritos à mão abaixo.
//
// Tolerância: ±R$ 0,01 por conferência. O servidor arredonda para centavos em
// pontos diferentes do cálculo à mão (ex.: soma o IR de várias aplicações antes
// de arredondar, guarda o valor das caixinhas sem arredondar), então um
// centavo de diferença por operação é aceito; mais que isso é divergência.
//
// Regras do servidor que a conta à mão segue (decisões de jogo, não erros):
// - debênture ativa entra no patrimônio pelo valor aplicado; o juro só aparece
//   no vencimento (ou nada, no calote);
// - o 13º é um holerite de R$ 7.000 (sem bônus de habilidade nem aumento) e
//   não ganha o bônus de eventos do dom Desenrolado;
// - na última virada só entram o que ficou em aberto, os juros do cheque
//   especial, o rendimento das caixinhas e o bônus da Gestão; as parcelas que
//   sobram viram dívida no patrimônio.
//
// Sorteios: o Math.random do servidor é trocado por valores roteirizados,
// reconhecidos pela função que sorteia (preço das ações, imprevisto do mês,
// calote da debênture). O resto (código da sala, cupons) segue aleatório.
//
// Uso: npm run audit   (ou node scripts/audit/run.js --verbose)
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')

const VERBOSE = process.argv.includes('--verbose')
const TOL = 0.01

// ─── banco temporário ─────────────────────────────────────────────────────────
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fecha-o-mes-audit-'))
const dbPath = path.join(tmp, 'audit.db')
require('dotenv').config()
process.env.TURSO_DATABASE_URL = `file:${dbPath}`
delete process.env.TURSO_AUTH_TOKEN
process.env.JWT_SECRET = 'audit-secret'

// ─── sorteios roteirizados ────────────────────────────────────────────────────
const originalRandom = Math.random
const dice = { price: 0.5, event: 0.5, debenture: [] }
Math.random = function scriptedRandom() {
  const stack = new Error().stack || ''
  if (stack.includes('nextStockPrice')) return dice.price
  if (stack.includes('eventsFor')) return dice.event
  if (stack.includes('checkDebentures')) return dice.debenture.length ? dice.debenture.shift() : 0.5
  return originalRandom()
}

// ─── contas à mão ─────────────────────────────────────────────────────────────
const c2 = (n) => Math.round(Number(n) * 100) / 100
const brl = (n) => Number(n).toFixed(2)

// Holerite 2026. INSS progressivo: cada faixa paga a sua alíquota só sobre a
// parte do salário que cai nela.
const INSS_2026 = [[1621.0, 0.075], [2902.84, 0.09], [4354.27, 0.12], [8475.55, 0.14]]
// IR mensal 2026 sobre (bruto − INSS): [teto da faixa, alíquota, parcela a deduzir]
const IR_2026 = [[2428.8, 0, 0], [2826.65, 0.075, 182.16], [3751.05, 0.15, 394.16], [4664.68, 0.225, 675.49], [Infinity, 0.275, 908.73]]
function holerite(gross) {
  let inss = 0
  let prev = 0
  for (const [top, rate] of INSS_2026) {
    if (gross > prev) inss += (Math.min(gross, top) - prev) * rate
    prev = top
  }
  inss = c2(inss)
  let ir = 0
  if (gross > 5000) { // isento até 5.000
    const base = gross - inss
    const [, rate, ded] = IR_2026.find(([top]) => base <= top)
    ir = Math.max(base * rate - ded, 0)
    if (gross <= 7350) ir -= 978.62 - 0.133145 * gross // redutor 2026 entre 5.000 e 7.350
    ir = c2(Math.max(ir, 0))
  }
  return { gross, inss, ir, net: c2(gross - inss - ir) }
}

// Tabela oficial de investimentos (taxas anuais). CDI 10,4% e Selic 10,5% simulados.
const CDI = 0.104
const SELIC = 0.105
const ANNUAL = { POUPANCA: 0.065, CDB: 1.06 * CDI, TESOURO_SELIC: SELIC + 0.006, LCI: 1.08 * CDI, LCA: SELIC + 0.026 }
const monthly = (annual) => (1 + annual) ** (1 / 12) - 1 // juros compostos mensais equivalentes
const LOCK = { LCI: 6, LCA: 8 } // carência em meses
// IR no resgate, contado por aplicação
const irRate = (type, months) => {
  if (type === 'CDB') return 0.175
  if (type === 'TESOURO_SELIC') return months < 6 ? 0.225 : 0.15
  return 0 // Poupança, LCI e LCA isentas
}
const DEBENTURE = { annual: 0.18, term: 10, defaultProbability: 0.05 }
const VOL = { ABEV3: 0.03, VALE3: 0.07, AMER3: 0.15, PETR4: 0.15 }
const BASE_PRICE = { ABEV3: 15.9, VALE3: 83.79, AMER3: 5.29, PETR4: 42.22 }
const STOCK_STORY = { VALE3: [3, 0.4], PETR4: [10, -0.35] } // mês, variação

const SALARY = 7000
const GIFT_INCOME = 120 // Desenrolado: trabalho extra
const GIFT_EVENT_BONUS = 0.25 // Desenrolado: eventos positivos +25%
const LATE = 0.03 // multa 2% + juros 1%
const LEISURE_PRICE = [null, 750, 450, 300, 530, 380, 230, 150, 900, 450, 680, 980, 1500]
const BILL_LABEL = { food: 'Mercadinho', utilities: 'Água e Luz', transport: 'Internet e Celular' }

// habilidades usadas no roteiro e o que cada uma faz no dinheiro
const SKILL = {
  'technical:1': { income: 100 },
  'technical:2': { repair: 0.25 },
  'technical:3': { salary: 200 },
  'management:1': { food: 0.075 },
  'management:2': { overdraft: 0.04, savings: 0.004 },
}

// ─── conferências ─────────────────────────────────────────────────────────────
let checks = 0
const failures = []
let section = ''
function check(label, actual, expected, tol = TOL) {
  checks++
  const a = Number(actual)
  const e = Number(expected)
  const ok = typeof expected === 'number' ? Number.isFinite(a) && Math.abs(a - e) <= tol + 1e-9 : actual === expected
  if (!ok) failures.push({ section, label, actual, expected })
  if (VERBOSE || !ok) console.log(`  ${ok ? 'ok ' : 'XX '} ${label}: servidor ${typeof expected === 'number' ? brl(a) : actual} · à mão ${typeof expected === 'number' ? brl(e) : expected}`)
  return ok
}
const begin = (name) => { section = name; console.log(`\n▶ ${name}`) }

// ─── modelo à mão do jogador ──────────────────────────────────────────────────
const M = {
  turn: 1,
  cash: 0,
  apps: [], // { type, value, principal, investedAt, rate, id }
  debs: [], // { amount, investedAt, maturesAt, status }
  pos: {}, // ticker → quantidade
  price: { ...BASE_PRICE },
  effects: [], // { turn, kind, amount, label }
  rent: 2100,
  costs: { food: 1000, utilities: 250, transport: 250 },
  skills: new Set(),
  points: 0,
  usedPoints: 0,
  choices: {}, // dilemas respondidos { turn: option }
  month: null, // { bills:Set, leisure, dilemma }
}
const has = (k) => M.skills.has(k)
const perk = (field) => [...M.skills].reduce((acc, k) => (SKILL[k]?.[field] ? SKILL[k][field] : acc), 0)
const salaryBonus = () => [...M.skills].reduce((s, k) => s + (SKILL[k]?.salary ?? 0), 0)
const skillIncome = () => [...M.skills].reduce((s, k) => s + (SKILL[k]?.income ?? 0), 0)
const overdraftRate = () => (has('management:2') ? 0.04 : 0.08)
const savingsRate = () => [...M.skills].reduce((s, k) => s + (SKILL[k]?.savings ?? 0), 0)
const billCost = (type) => c2(M.costs[type] * (1 - (type === 'food' ? perk('food') : 0)))
const openApps = (type) => M.apps.filter((a) => !a.closed && (!type || a.type === type))
const fixedTotal = () => openApps().reduce((s, a) => s + a.value, 0)
const debTotal = () => M.debs.filter((d) => d.status === 'active').reduce((s, d) => s + d.amount, 0)
const stocksAt = (prices) => c2(Object.entries(M.pos).reduce((s, [t, q]) => s + q * prices[t], 0))
const installmentsLeft = () => c2(M.effects.filter((e) => e.kind === 'installment' && !e.applied).reduce((s, e) => s - e.amount, 0))
// patrimônio = saldo + caixinhas + debêntures + ações − dívidas (parcelas que
// faltam; o cheque especial é o saldo negativo)
const netWorth = () => c2(M.cash + fixedTotal() + debTotal() + stocksAt(M.price) - installmentsLeft())

// ─── servidor ─────────────────────────────────────────────────────────────────
async function setupDatabase() {
  await require('../migrate-turso').migrate({ log: () => {} })
  execFileSync(process.execPath, [path.join(__dirname, '../../src/utils/seed.js')], { env: process.env, stdio: 'ignore' })
}

async function main() {
  await setupDatabase()
  const jwt = require('jsonwebtoken')
  const app = require('../../src/app')
  const prisma = require('../../src/lib/prisma')
  const server = app.listen(0)
  const base = `http://127.0.0.1:${server.address().port}/api/v1`

  async function call(token, method, url, body, expectStatus) {
    const r = await fetch(base + url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await r.json().catch(() => null)
    const okStatus = expectStatus ? [].concat(expectStatus).includes(r.status) : r.status < 400
    if (!okStatus) {
      checks++
      failures.push({ section, label: `${method} ${url}`, actual: `${r.status} ${data?.error ?? ''} ${data?.details ?? ''}`, expected: expectStatus ?? '2xx' })
      console.log(`  XX  ${method} ${url} → ${r.status} ${data?.error ?? ''} ${data?.details ?? ''}`)
    }
    return { status: r.status, data }
  }
  const makeUser = async (name, role) => {
    const user = await prisma.user.create({ data: { name, email: `${role}_${Date.now()}@audit.test`, passwordHash: 'x', role } })
    return jwt.sign({ id: user.id, role }, process.env.JWT_SECRET)
  }

  const admin = await makeUser('Professora Auditoria', 'admin')
  const token = await makeUser('Jogador Auditado', 'player')
  const get = (url) => call(token, 'GET', url)
  const post = (url, body, expectStatus) => call(token, 'POST', url, body, expectStatus)

  const skills = (await get('/skills')).data
  const company = (await get('/investments/companies')).data[0]
  check('debênture: taxa da empresa (18% a.a.)', Number(company.annualRate), DEBENTURE.annual, 1e-9)
  check('debênture: chance de calote (5%)', Number(company.defaultProbability), DEBENTURE.defaultProbability, 1e-9)

  const room = (await call(admin, 'POST', '/rooms', { name: 'Auditoria', monthMinutes: 60, dilemmaMinutes: 60 })).data
  const ch = (await post('/characters', { roomId: room.id, name: 'Auditado', avatarId: 1, course: 'Contabilidade', gift: 'agile' })).data
  const id = ch.id
  await call(admin, 'POST', `/rooms/${room.id}/start`)

  const character = async () => (await get(`/characters/${id}`)).data
  let assets = {}
  for (const a of (await get(`/investments/market/${room.id}`)).data) assets[a.ticker] = a

  // saldo, extrato (soma das linhas = saldo), caixinhas, debêntures e ações
  async function checkState(label) {
    const c = await character()
    check(`${label} · saldo`, Number(c.cash), M.cash)
    const extrato = c2(c.eventLog.reduce((s, l) => s + Number(l.cashImpact ?? 0), 0))
    check(`${label} · extrato soma o saldo`, extrato, Number(c.cash))
    const server = [...c.fixedInvestments].sort((a, b) => a.investedAt - b.investedAt || a.type.localeCompare(b.type))
    const mine = [...openApps()].sort((a, b) => a.investedAt - b.investedAt || a.type.localeCompare(b.type))
    check(`${label} · caixinhas abertas`, server.length, mine.length, 0)
    mine.forEach((a, i) => check(`${label} · ${a.type} de ${a.investedAt}`, Number(server[i]?.amount), a.value))
    check(`${label} · debêntures ativas`, c.debentures.reduce((s, d) => s + Number(d.amount), 0), debTotal())
    for (const [t, q] of Object.entries(M.pos)) {
      check(`${label} · ações ${t}`, c.positions.find((p) => p.asset.ticker === t)?.quantity ?? 0, q, 0)
    }
    return c
  }

  // ─── ações do jogador (cada uma confere a resposta com a conta à mão) ──────
  const t = () => M.turn

  async function payBill(type) {
    const bills = (await get(`/characters/${id}/bills/${t()}`)).data
    const expected = billCost(type)
    check(`conta ${BILL_LABEL[type]} cobrada`, bills.find((b) => b.type === type).amount, expected)
    const r = await post(`/characters/${id}/bills/${t()}/pay`, { type })
    check(`pagar ${BILL_LABEL[type]}`, r.data?.amount, expected)
    M.cash = c2(M.cash - expected)
    M.month.bills.add(type)
  }

  async function chooseLeisure(option) {
    const r = await post(`/characters/${id}/leisure/${t()}/choose`, { optionIndex: option })
    check(`lazer do mês ${t()}`, -r.data?.cashImpact, LEISURE_PRICE[t()])
    M.cash = c2(M.cash - LEISURE_PRICE[t()])
    M.month.leisure = true
  }

  // dilema: `cost` à vista, `installment` (1ª agora, as outras nos meses
  // seguintes), `effects` futuros, `housing` multiplica o aluguel
  async function chooseDilemma(option, { cost = 0, installment, effects = [], housing } = {}) {
    const d = (await get(`/characters/${id}/dilemma/${t()}`)).data
    const now = installment ? installment.amount : cost
    check(`dilema ${t()}: preço da opção`, d.dilemma.options[option].price, now)
    const r = await post(`/characters/${id}/dilemma/${t()}/choose`, { optionIndex: option })
    check(`dilema ${t()}: saiu da conta`, -r.data?.cashImpact, now)
    M.cash = c2(M.cash - now)
    if (installment) {
      for (let k = 2; k <= installment.count; k++) M.effects.push({ turn: t() + k - 1, kind: 'installment', amount: -installment.amount, label: `${installment.label} (${k}/${installment.count})` })
    }
    for (const e of effects) M.effects.push({ ...e })
    if (housing) M.rent = c2(M.rent * housing)
    M.choices[t()] = option
    M.points += 1
    M.month.dilemma = true
  }

  async function unlock(pathName, level) {
    const node = skills.find((s) => s.path === pathName && s.level === level)
    await post(`/skills/character/${id}/unlock/${node.id}`)
    M.skills.add(`${pathName}:${level}`)
    M.usedPoints += node.costPoints
  }

  async function invest(type, amount) {
    const r = await post(`/investments/fixed/${id}`, { type, amount })
    check(`guardar ${brl(amount)} em ${type}: taxa mensal`, Number(r.data.monthlyRate), monthly(ANNUAL[type]), 1e-12)
    M.apps.push({ id: r.data.id, type, value: amount, principal: amount, investedAt: t(), rate: monthly(ANNUAL[type]) })
    M.cash = c2(M.cash - amount)
  }

  // resgate parcial pelo valor: das aplicações mais antigas para as mais novas,
  // fora as presas na carência; IR só sobre a fração de rendimento que sai
  function planOut(type, amount) {
    const free = openApps(type).filter((a) => t() >= a.investedAt + (LOCK[type] ?? 0)).sort((a, b) => a.investedAt - b.investedAt)
    const available = free.reduce((s, a) => s + a.value, 0)
    if (amount > available + 0.005) return null
    let left = amount
    let tax = 0
    const steps = []
    for (const a of free) {
      if (left <= 0.005) break
      const take = Math.min(left, a.value)
      const share = take / a.value
      tax += (a.value - a.principal) * share * irRate(type, t() - a.investedAt)
      steps.push({ a, take, share })
      left -= take
    }
    return { steps, tax: c2(tax), net: c2(amount - c2(tax)) }
  }

  async function withdraw(type, amount, label = '') {
    const plan = planOut(type, amount)
    const r = await post(`/investments/fixed/${id}/withdraw`, { type, amount }, plan ? 200 : 422)
    if (!plan) {
      check(`resgate ${type} bloqueado ${label}`, r.status, 422, 0)
      return null
    }
    check(`resgate ${brl(amount)} de ${type} ${label}: IR`, r.data?.incomeTax, plan.tax)
    check(`resgate ${brl(amount)} de ${type} ${label}: líquido`, r.data?.net, plan.net)
    for (const { a, take, share } of plan.steps) {
      if (take >= a.value - 0.005) a.closed = true
      a.principal -= a.principal * share
      a.value -= take
    }
    M.cash = c2(M.cash + plan.net)
    return plan
  }

  async function redeemAll(app, label = '') {
    const locked = t() < app.investedAt + (LOCK[app.type] ?? 0)
    const r = await call(token, 'DELETE', `/investments/fixed/${id}/${app.id}`, undefined, locked ? 400 : 200)
    if (locked) {
      check(`resgate total de ${app.type} bloqueado ${label}`, r.status, 400, 0)
      return
    }
    const tax = c2((app.value - app.principal) * irRate(app.type, t() - app.investedAt))
    check(`resgate total de ${app.type} ${label}: bruto`, r.data?.grossValue, app.value)
    check(`resgate total de ${app.type} ${label}: IR`, r.data?.incomeTax, tax)
    check(`resgate total de ${app.type} ${label}: líquido`, r.data?.redeemedValue, c2(app.value - tax))
    app.closed = true
    M.cash = c2(M.cash + c2(app.value - tax))
  }

  async function buyDebenture(amount) {
    const r = await post(`/investments/debentures/${id}`, { companyId: company.id, amount })
    const maturesAt = Math.min(t() + DEBENTURE.term, 12)
    check(`debênture de ${t()}: vencimento`, r.data?.maturesAt, maturesAt, 0)
    M.debs.push({ amount, investedAt: t(), maturesAt, status: 'active' })
    M.cash = c2(M.cash - amount)
  }

  async function trade(ticker, operation, quantity) {
    const market = (await get(`/investments/market/${room.id}`)).data
    const price = market.find((a) => a.ticker === ticker).currentPrice
    check(`preço de ${ticker} no mês ${t()}`, price, M.price[ticker])
    const r = await post(`/investments/trade/${id}`, { assetId: assets[ticker].id, operation, quantity })
    const total = c2(M.price[ticker] * quantity)
    check(`${operation === 'buy' ? 'compra' : 'venda'} de ${quantity} ${ticker}`, r.data?.total, total)
    M.cash = c2(M.cash + (operation === 'buy' ? -total : total))
    M.pos[ticker] = (M.pos[ticker] ?? 0) + (operation === 'buy' ? quantity : -quantity)
    if (M.pos[ticker] === 0) delete M.pos[ticker]
  }

  async function ready() {
    await call(token, 'PATCH', `/characters/${id}/ready`)
  }

  // ─── virada do mês, à mão ──────────────────────────────────────────────────
  // plan: { price, event: { r, title, amount, positive, repair } | null, debentureRolls,
  //         leisureOption0Price (lazer não escolhido), inertia: { cost, effects } }
  async function nextTurn(plan = {}) {
    const from = t()
    const to = from + 1
    const final = from === 12
    begin(`Virada ${from} → ${to}${final ? ' (fechamento do ano)' : ''}`)
    const before = M.cash
    const exp = { late: 0, interest: 0, salary: 0, inss: 0, ir: 0, extras: 0, rent: 0, events: 0, consequences: 0, investments: 0 }

    // 1. o que ficou em aberto no mês que fecha
    for (const type of ['food', 'utilities', 'transport']) {
      if (!M.month.bills.has(type)) exp.late -= c2(billCost(type) * (1 + LATE))
    }
    if (!M.month.leisure) exp.late -= LEISURE_PRICE[from]
    if (plan.inertia && !M.month.dilemma) {
      exp.late -= plan.inertia.cost
      for (const e of plan.inertia.effects ?? []) M.effects.push({ ...e })
    }
    exp.late = c2(exp.late)
    M.cash = c2(M.cash + exp.late)

    // 2. juros do cheque especial sobre o saldo com que o mês fechou
    if (M.cash < 0) exp.interest = -c2(-M.cash * overdraftRate())
    M.cash = c2(M.cash + exp.interest)

    // 3. salário (líquido do holerite), rendas extras, consequências e aluguel
    const arriving = final ? [] : M.effects.filter((e) => e.turn === to && !e.applied)
    if (!final) {
      const raise = arriving.filter((e) => e.kind === 'raise').reduce((s, e) => s + e.amount, 0)
      const slip = holerite(SALARY + salaryBonus() + raise)
      exp.salary = SALARY
      exp.inss = -slip.inss
      exp.ir = -slip.ir
      exp.extras = salaryBonus() + skillIncome() + GIFT_INCOME
      const waived = arriving.some((e) => e.kind === 'rent_waived')
      exp.rent = waived ? 0 : -M.rent
      exp.consequences = c2(arriving.reduce((s, e) => s + (['cash', 'installment', 'raise'].includes(e.kind) ? e.amount : 0), 0))
      const income = c2(slip.net + skillIncome() + GIFT_INCOME)
      M.cash = c2(M.cash + income + c2(exp.consequences - raise) + exp.rent)
      for (const e of arriving) e.applied = true
    }

    // 4. rendimento das caixinhas (juros compostos mensais) e bônus da Gestão
    for (const a of openApps()) a.value += a.value * a.rate
    const bonusRate = savingsRate()
    const bonus = bonusRate > 0 && fixedTotal() > 0 ? c2(fixedTotal() * bonusRate) : 0
    exp.extras = c2(exp.extras + bonus)
    M.cash = c2(M.cash + bonus)

    // 5. imprevisto do mês
    if (!final) {
      for (const ev of plan.events ?? []) {
        let amount = ev.amount
        if (ev.repair && amount < 0) amount = c2(amount * (1 - perk('repair')))
        if (ev.positive && amount > 0) amount = c2(amount * (1 + GIFT_EVENT_BONUS))
        ev.expected = amount
        exp.events = c2(exp.events + amount)
      }
      M.cash = c2(M.cash + exp.events)
    }

    // 6. debêntures que vencem: pagam juros compostos mensais ou dão calote
    for (const d of M.debs.filter((x) => x.status === 'active' && x.maturesAt <= to)) {
      const roll = (plan.debentureRolls ?? []).shift() ?? 0.5
      dice.debenture.push(roll)
      if (roll < DEBENTURE.defaultProbability) {
        d.status = 'defaulted'
      } else {
        d.status = 'paid'
        d.paid = c2(d.amount * (1 + DEBENTURE.annual) ** ((d.maturesAt - d.investedAt) / 12))
        exp.investments = c2(exp.investments + d.paid)
        M.cash = c2(M.cash + d.paid)
      }
    }

    // 7. preços das ações do mês novo
    const prices = {}
    for (const [tk, p] of Object.entries(M.price)) {
      const story = STOCK_STORY[tk]?.[0] === to ? STOCK_STORY[tk][1] : 0
      prices[tk] = c2(Math.max(p * (1 + (plan.price ?? 0.5) * 2 * VOL[tk] - VOL[tk] + story), 0.01))
    }
    M.price = prices

    // roda a virada no servidor
    dice.price = plan.price ?? 0.5
    dice.event = plan.eventR ?? 0.5
    const res = await call(admin, 'POST', `/rooms/${room.id}/next-turn`)
    M.turn = to
    M.month = { bills: new Set(), leisure: false, dilemma: false }

    const c = await checkState(`fim da virada ${to}`)
    const market = (await get(`/investments/market/${room.id}`)).data ?? []
    for (const a of market) check(`preço de ${a.ticker} no mês ${to}`, a.currentPrice, M.price[a.ticker])
    if (dice.debenture.length) check('sorteios de debênture usados', dice.debenture.length, 0, 0)
    dice.debenture = []

    // o que o servidor contou na virada
    const delta = c2(Number(c.cash) - before)
    check('virada: variação do saldo', delta, c2(M.cash - before))
    check('virada: cashDelta do resultado', res.data?.results?.[0]?.cashDelta, c2(M.cash - before))
    const s = (await get(`/characters/${id}/turn-summary/${to}`)).data
    check('resumo da virada: total (net)', s.net, delta)
    check('resumo: salário bruto', s.money.salary, exp.salary)
    check('resumo: INSS', s.money.inss, exp.inss)
    check('resumo: IR na fonte', s.money.ir, exp.ir)
    check('resumo: extras (habilidades, dom, Gestão)', s.money.extras, exp.extras)
    check('resumo: aluguel', s.money.rent, exp.rent)
    check('resumo: juros do cheque especial', s.money.interest, exp.interest)
    check('resumo: o que ficou em aberto', c2(s.late.reduce((x, l) => x + l.amount, 0)), exp.late)
    check('resumo: consequências dos dilemas', c2(s.consequences.reduce((x, l) => x + l.amount, 0)), exp.consequences)
    check('resumo: debêntures', c2(s.investments.reduce((x, l) => x + l.amount, 0)), exp.investments)
    if (!final) {
      check('resumo: imprevistos', c2(s.events.reduce((x, l) => x + l.amount, 0)), exp.events)
      for (const ev of plan.events ?? []) {
        check(`imprevisto sorteado: ${ev.title}`, s.events.find((e) => e.title === ev.title)?.amount, ev.expected)
      }
      if (!(plan.events ?? []).length) check('mês sem imprevisto', s.events[0]?.title, 'Nenhum imprevisto')
    }
    // patrimônio da virada (FinancialSnapshot), com as ações pelo preço do mês novo
    const snap = c.snapshots.find((x) => x.turn === to)
    check(`patrimônio do mês ${to}`, Number(snap?.netWorth), netWorth())
    check('resultado da virada: patrimônio', res.data?.results?.[0]?.netWorth, netWorth())
    return { res, summary: s, character: c }
  }

  // ═══ Janeiro ═══════════════════════════════════════════════════════════════
  begin('Janeiro: salário líquido, aluguel e renda do dom')
  M.month = { bills: new Set(), leisure: false, dilemma: false }
  const jan = holerite(SALARY)
  check('holerite 7.000: INSS', jan.inss, 781.51) // conferido com a tabela 2026
  check('holerite 7.000: IR', jan.ir, 754.75)
  M.cash = c2(jan.net + GIFT_INCOME - M.rent)
  let c = await checkState('janeiro, ao entrar')
  const line = (prefix) => c2(c.eventLog.filter((l) => l.description.startsWith(prefix)).reduce((s, l) => s + Number(l.cashImpact), 0))
  check('janeiro: salário bruto no extrato', line('Salário (bruto):'), SALARY)
  check('janeiro: INSS no extrato', line('INSS:'), -jan.inss)
  check('janeiro: IR no extrato', line('Imposto de Renda'), -jan.ir)
  check('janeiro: renda do dom (Desenrolado)', line('Trabalho extra:'), GIFT_INCOME)
  check('janeiro: aluguel', line('Aluguel:'), -2100)
  check('janeiro: líquido que caiu', c2(line('Salário (bruto):') + line('INSS:') + line('Imposto de Renda')), 5463.74)

  begin('Janeiro: caixinhas, debênture, contas em dia, lazer, dilema à vista e cheque especial')
  await invest('POUPANCA', 1000)
  await invest('CDB', 500)
  await buyDebenture(300) // vence em novembro (mês 11)
  await chooseLeisure(1)
  for (const type of ['food', 'utilities', 'transport']) await payBill(type) // contas em dia
  await ready()
  await chooseDilemma(0, { cost: 450 }) // à vista: marmitas
  await checkState('fim de janeiro (no vermelho)')
  await nextTurn({ events: [{ title: 'Convite para casamento', amount: -500 }], eventR: 0.5 }) // 8% no cheque especial

  // ═══ Fevereiro ═════════════════════════════════════════════════════════════
  begin('Fevereiro: conta atrasada, lazer não escolhido, empréstimo ao amigo, ações')
  await unlock('technical', 1) // +R$ 100 por mês a partir da próxima virada
  await trade('VALE3', 'buy', 5)
  await payBill('food')
  await payBill('utilities') // Internet e Celular fica para a virada: multa 2% + juros 1%
  await ready()
  await chooseDilemma(0, { cost: 750, effects: [{ turn: 5, kind: 'cash', amount: 810 }] }) // consequência futura: devolve em maio
  await checkState('fim de fevereiro')
  await nextTurn({ events: [{ title: 'Comparou preços', amount: 500, positive: true }], eventR: 0.5 })

  // ═══ Março ═════════════════════════════════════════════════════════════════
  begin('Março: Tesouro Selic, LCI, VALE3 depois da alta, dor de dente')
  await unlock('management', 1) // Mercadinho 7,5% mais barato
  await chooseLeisure(0)
  for (const type of ['food', 'utilities', 'transport']) await payBill(type)
  await invest('TESOURO_SELIC', 600)
  await invest('LCI', 300)
  await ready()
  await chooseDilemma(0, { effects: [{ turn: 6, kind: 'cash', amount: -750 }] }) // deixa para depois: canal em junho
  await checkState('fim de março')
  await nextTurn({ events: [], eventR: 0.1, price: 0.75 })

  // ═══ Abril ═════════════════════════════════════════════════════════════════
  begin('Abril: máquina parcelada, LCA, resgates parciais isento e com IR, venda de ações')
  await unlock('management', 2) // cheque especial 4% e +0,4% sobre as caixinhas
  await chooseLeisure(1)
  for (const type of ['food', 'utilities', 'transport']) await payBill(type)
  await trade('VALE3', 'sell', 3)
  await withdraw('POUPANCA', 200, '(isento)')
  await withdraw('CDB', 100, '(17,5% sobre o rendimento)')
  await invest('LCA', 300)
  await ready()
  await chooseDilemma(0, { installment: { amount: 502.8, count: 12, label: 'Parcela: Máquina de lavar' } })
  await checkState('fim de abril')
  await nextTurn({ events: [{ title: 'Celular no chão', amount: -450, repair: true }], eventR: 0.5, price: 0.25 })

  // ═══ Maio ══════════════════════════════════════════════════════════════════
  begin('Maio: amigo devolveu, Tesouro antes de 6 meses (22,5%), segunda debênture')
  await unlock('technical', 2) // imprevistos de casa 25% mais baratos
  await chooseLeisure(0)
  for (const type of ['food', 'utilities', 'transport']) await payBill(type)
  await withdraw('TESOURO_SELIC', 100, '(2 meses: 22,5%)')
  await buyDebenture(400) // vence em dezembro (mês 12): vai dar calote no roteiro
  await ready()
  await chooseDilemma(0, { effects: [{ turn: 6, kind: 'cash', amount: -450 }] }) // arrombar a porta
  await checkState('fim de maio')
  await nextTurn({ events: [{ title: 'Participação nos resultados', amount: 700, positive: true }], eventR: 0.5 })

  // ═══ Junho ═════════════════════════════════════════════════════════════════
  begin('Junho: LCI presa na carência, cheque especial com a Gestão (4%)')
  await chooseLeisure(1)
  await withdraw('LCI', 100, '(carência de 6 meses)')
  await redeemAll(openApps('LCI')[0], '(carência de 6 meses)')
  // guarda quase tudo antes de pagar as contas: o mês fecha no vermelho
  await invest('POUPANCA', Math.floor(M.cash) - 100)
  for (const type of ['food', 'utilities', 'transport']) await payBill(type)
  await ready()
  await chooseDilemma(1, { effects: [{ turn: 8, kind: 'cash', amount: -3000 }] }) // continuar trabalhando: coluna em agosto
  await checkState('fim de junho (no vermelho)')
  await nextTurn({ events: [{ title: 'Venda de usados', amount: 600, positive: true }], eventR: 0.5 })

  // ═══ Julho ═════════════════════════════════════════════════════════════════
  begin('Julho: Técnico 3 (salário +R$ 200), academia parcelada, segunda aplicação no Tesouro')
  await unlock('technical', 3)
  await chooseLeisure(0)
  for (const type of ['food', 'utilities', 'transport']) await payBill(type)
  await invest('TESOURO_SELIC', 400)
  await ready()
  await chooseDilemma(1, { installment: { amount: 359.85, count: 6, label: 'Parcela: Academia' } })
  await checkState('fim de julho')
  await nextTurn({ events: [{ title: 'Bonificação', amount: 85, positive: true }], eventR: 0.9 })

  // ═══ Agosto ════════════════════════════════════════════════════════════════
  begin('Agosto: vende o resto da VALE3, carro de aplicativo')
  await chooseLeisure(0)
  for (const type of ['food', 'utilities', 'transport']) await payBill(type)
  await trade('VALE3', 'sell', 2)
  await ready()
  await chooseDilemma(0, { cost: 70 })
  await checkState('fim de agosto')
  await nextTurn({ events: [{ title: 'Notebook na assistência', amount: -450, repair: true }], eventR: 0.9 })

  // ═══ Setembro ══════════════════════════════════════════════════════════════
  begin('Setembro: Tesouro por aplicação (15% e 22,5%), LCI liberada, PETR4, TV')
  const tesouroA = openApps('TESOURO_SELIC').find((a) => a.investedAt === 3)
  await withdraw('TESOURO_SELIC', c2(tesouroA.value + 100), '(6 meses: 15% + 2 meses: 22,5%)')
  await withdraw('LCI', c2(openApps('LCI')[0].value), '(liberada, isenta)')
  // comprar mais do que o saldo é recusado e não mexe em nada
  const tooMuch = await post(`/investments/trade/${id}`, { assetId: assets.PETR4.id, operation: 'buy', quantity: Math.ceil(M.cash / M.price.PETR4) + 1 }, 422)
  check('compra acima do saldo recusada', tooMuch.status, 422, 0)
  await trade('PETR4', 'buy', 10) // segura até o fim: cai 35% em outubro
  await chooseLeisure(1)
  for (const type of ['food', 'utilities', 'transport']) await payBill(type)
  await ready()
  await chooseDilemma(0, { cost: 1200, effects: [10, 11, 12].map((turn) => ({ turn, kind: 'raise', amount: c2(SALARY * 0.15) })) })
  await checkState('fim de setembro')
  await nextTurn({ events: [{ title: 'Venda de usados', amount: 600, positive: true }], eventR: 0.5 })

  // ═══ Outubro ═══════════════════════════════════════════════════════════════
  begin('Outubro: resgate total do CDB, incêndio (aluguel 50% mais caro)')
  await chooseLeisure(0)
  for (const type of ['food', 'utilities', 'transport']) await payBill(type)
  await redeemAll(openApps('CDB')[0], '(17,5%)')
  await ready()
  await chooseDilemma(1, { housing: 1.5, effects: [{ turn: 11, kind: 'cash', amount: -3000 }] })
  await checkState('fim de outubro')
  // a debênture de janeiro vence nesta virada e paga
  await nextTurn({ events: [{ title: 'Sorteio do Mercadinho', amount: 150, positive: true }], eventR: 0.5, debentureRolls: [0.5] })

  // ═══ Novembro ══════════════════════════════════════════════════════════════
  begin('Novembro: LCA ainda presa, dilema sem resposta (inércia)')
  await chooseLeisure(1)
  for (const type of ['food', 'utilities', 'transport']) await payBill(type)
  await withdraw('LCA', 100, '(carência de 8 meses)')
  await ready()
  // não responde o dilema: a inércia compra outra máquina (R$ 2.290)
  await checkState('fim de novembro')
  // dezembro chega com o 13º (líquido, sem o bônus do dom) e os gastos de fim
  // de ano; a debênture de maio vence e dá calote
  await nextTurn({
    events: [{ title: '13º salário', amount: holerite(SALARY).net }, { title: 'Gastos de fim de ano', amount: -550 }],
    debentureRolls: [0.01],
    inertia: { cost: 2290 },
  })

  // ═══ Dezembro ══════════════════════════════════════════════════════════════
  begin('Dezembro: 13º, LCA liberada, fechamento')
  c = await character()
  const thirteenth = c.eventLog.find((l) => l.turn === 12 && l.description.startsWith('13º salário'))
  check('13º: líquido (7.000 − INSS − IR)', Number(thirteenth?.cashImpact), holerite(SALARY).net)
  await chooseLeisure(0)
  for (const type of ['food', 'utilities', 'transport']) await payBill(type)
  await withdraw('LCA', c2(openApps('LCA')[0].value), '(liberada, isenta)')
  await ready()
  await checkState('fim de dezembro')
  // a virada final só cobra o que ficou em aberto e os juros, rende as
  // caixinhas, paga o bônus da Gestão e fecha o patrimônio
  await nextTurn({})

  // ═══ Fechamento ════════════════════════════════════════════════════════════
  begin('Fechamento: year-summary, ranking e leaderboard')
  const finalWorth = netWorth()
  const breakdownHand = {
    cash: c2(Math.max(M.cash, 0)),
    fixedIncome: c2(fixedTotal()),
    debentures: c2(debTotal()),
    stocks: stocksAt(M.price),
    debts: c2(Math.max(-M.cash, 0) + installmentsLeft()),
  }
  check('dívida final: 3 parcelas da máquina', installmentsLeft(), c2(3 * 502.8))
  const ys = (await get(`/characters/${id}/year-summary`)).data
  for (const k of Object.keys(breakdownHand)) check(`year-summary: ${k}`, ys.breakdown[k], breakdownHand[k])
  check('year-summary: patrimônio', ys.breakdown.netWorth, finalWorth)
  check('year-summary: saldo + caixinhas + debêntures + ações − dívidas', c2(ys.breakdown.cash + ys.breakdown.fixedIncome + ys.breakdown.debentures + ys.breakdown.stocks - ys.breakdown.debts), finalWorth)
  check('year-summary: último mês do gráfico', ys.months[ys.months.length - 1]?.netWorth, finalWorth)
  check('year-summary: ranking (eu)', ys.players?.find((p) => p.isSelf)?.netWorth, finalWorth)
  const lb = (await call(admin, 'GET', `/rooms/${room.id}/leaderboard`)).data
  check('leaderboard: patrimônio', Number(lb?.[0]?.netWorth), finalWorth)

  server.close()
  await prisma.$disconnect()

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`Auditoria do dinheiro: ${checks} conferências, ${checks - failures.length} passaram, ${failures.length} divergências (tolerância ±R$ ${brl(TOL)})`)
  console.log(`Patrimônio final à mão: R$ ${brl(finalWorth)}`)
  for (const f of failures) console.log(`  ✗ [${f.section}] ${f.label}: servidor ${f.actual} · à mão ${f.expected}`)
  fs.rmSync(tmp, { recursive: true, force: true })
  process.exit(failures.length ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  fs.rmSync(tmp, { recursive: true, force: true })
  process.exit(1)
})
