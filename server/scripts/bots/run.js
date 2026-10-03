// Robôs jogando o Fecha o Mês de verdade: o servidor sobe num banco separado
// (cópia do dev.db sem as partidas) e cada robô joga pelas mesmas rotas do
// jogo. Um administrador-robô abre as salas e fecha os meses.
//
// Uso: npm run bots -- --rooms 30 --seed 42 --out ./bots-out
// Resultado: <out>/results.json (uma linha por robô por partida) e
// <out>/summary.json (médias por robô, dom, caminho de habilidade…).
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const jwt = require('jsonwebtoken')
const { createClient } = require('@libsql/client')
const {
  BOTS, GIFTS, PATHS, dilemmaChoice, investable, investPlan, stockOrders, skillOrder, seededRandom, stats,
} = require('./strategies')

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : fallback
}
const ROOMS = Number(arg('rooms', 30))
const SEED = Number(arg('seed', 42))
const OUT = path.resolve(arg('out', path.join(__dirname, '../../bots-out')))
// experimento de balanceamento: multiplica o bônus das caixinhas da Gestão só
// nesta simulação (o jogo não muda). Ex.: --management-mult 1.5
const MANAGEMENT_MULT = Number(arg('management-mult', 1))
const MONTHS = 12
const BILL_TYPES = ['food', 'utilities', 'transport']

// tabelas de partida, apagadas da cópia do banco (filhas antes das mães)
const GAME_TABLES = [
  'Leaderboard', 'ScheduledEffect', 'CharacterChoice', 'CharacterCoupon', 'FinancialSnapshot', 'CharacterEventLog',
  'DebentureInvestment', 'TradeHistory', 'VariableIncomePosition', 'FixedIncomeInvestment', 'CharacterSkillPoints',
  'CharacterSkill', 'Character', 'AssetPrice', 'Room', 'User',
]

async function freshDatabase() {
  fs.mkdirSync(OUT, { recursive: true })
  const dbPath = path.join(OUT, 'bots.db')
  fs.copyFileSync(path.join(__dirname, '../../dev.db'), dbPath)
  const db = createClient({ url: `file:${dbPath}` })
  for (const table of GAME_TABLES) await db.execute(`DELETE FROM "${table}"`)
  db.close()
  return dbPath
}

async function main() {
  const dbPath = await freshDatabase()
  process.env.TURSO_DATABASE_URL = `file:${dbPath}`
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'bots-secret'
  // sorteios do servidor (eventos, ações, calote, cupons) com semente
  const rng = seededRandom(SEED)
  Math.random = rng

  if (MANAGEMENT_MULT !== 1) {
    const { PERKS } = require('../../src/utils/skills')
    for (const perk of Object.values(PERKS.management)) {
      if (perk.savingsBonusRate) perk.savingsBonusRate = Math.round(perk.savingsBonusRate * MANAGEMENT_MULT * 1e6) / 1e6
    }
  }

  const app = require('../../src/app')
  const prisma = require('../../src/lib/prisma')
  const server = app.listen(0)
  const base = `http://127.0.0.1:${server.address().port}/api/v1`

  const failures = []
  async function call(token, method, url, body, { expect = [] } = {}) {
    const r = await fetch(base + url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await r.json().catch(() => null)
    if (r.status >= 500 || (r.status >= 400 && !expect.includes(r.status))) {
      failures.push({ method, url, status: r.status, error: data?.error, details: data?.details?.slice?.(0, 300) })
    }
    return { status: r.status, data }
  }

  const makeUser = async (name, role) => {
    const user = await prisma.user.create({ data: { name, email: `${name.replace(/\W/g, '').toLowerCase()}_${Date.now()}_${Math.floor(rng() * 1e9)}@bots.test`, passwordHash: 'x', role } })
    return jwt.sign({ id: user.id, role }, process.env.JWT_SECRET)
  }

  const adminToken = await makeUser('Admin Robô', 'admin')
  const skills = (await call(adminToken, 'GET', '/skills')).data
  const nodeOf = (p, level) => skills.find((s) => s.path === p && s.level === level)
  const company = (await call(adminToken, 'GET', '/investments/companies')).data?.[0]

  const results = []
  const started = Date.now()

  for (let r = 0; r < ROOMS; r++) {
    const room = (await call(adminToken, 'POST', '/rooms', { name: `Robôs ${r + 1}` })).data
    const players = []
    for (let i = 0; i < BOTS.length; i++) {
      const bot = BOTS[i]
      const token = await makeUser(bot.name, 'player')
      // dom e caminho giram entre as salas para cada robô passar por todos
      const gift = GIFTS[(r + i) % GIFTS.length]
      const skillPath = PATHS[(Math.floor(r / GIFTS.length) + i) % PATHS.length]
      const ch = (await call(token, 'POST', '/characters', { roomId: room.id, name: bot.name, avatarId: (i % 8) + 1, course: 'Engenharia', gift })).data
      players.push({ bot, token, gift, skillPath, id: ch.id, coupons: 0 })
    }
    await call(adminToken, 'POST', `/rooms/${room.id}/start`)

    for (let turn = 1; turn <= MONTHS; turn++) {
      for (const p of players) await playMonth(p, turn, room)
      await call(adminToken, 'POST', `/rooms/${room.id}/next-turn`)
    }

    for (const p of players) {
      const summary = (await call(p.token, 'GET', `/characters/${p.id}/year-summary`)).data
      const c = (await call(p.token, 'GET', `/characters/${p.id}`)).data
      const logs = c?.eventLog ?? []
      results.push({
        room: r + 1,
        bot: p.bot.id,
        name: p.bot.name,
        gift: p.gift,
        path: p.skillPath,
        dilemma: p.bot.dilemma ?? 'nenhum',
        invest: p.bot.invest ?? 'nada',
        netWorth: summary?.breakdown?.netWorth ?? null,
        breakdown: summary?.breakdown,
        rank: summary?.rank,
        players: summary?.players?.length,
        badges: (summary?.badges ?? []).filter((b) => b.earned).map((b) => b.id),
        overdraftMonths: logs.filter((l) => l.description.startsWith('Cheque especial')).length,
        overdraftInterest: Math.round(logs.filter((l) => l.description.startsWith('Cheque especial')).reduce((s, l) => s - Number(l.cashImpact), 0) * 100) / 100,
        fired: logs.some((l) => l.description.startsWith('Demissão')),
        coupons: p.coupons,
        skills: (c?.unlockedSkills ?? []).length,
        months: (summary?.months ?? []).map((m) => m.netWorth),
      })
    }
    const secs = ((Date.now() - started) / 1000).toFixed(0)
    console.log(`sala ${r + 1}/${ROOMS} ok · ${secs}s · falhas até agora: ${failures.length}`)
  }

  async function playMonth(p, turn, room) {
    const { bot, token, id } = p
    if (bot.idle) return
    const get = (url) => call(token, 'GET', url)
    const post = (url, body, expect) => call(token, 'POST', url, body, { expect })

    // 1. dilema
    const d = (await get(`/characters/${id}/dilemma/${turn}`)).data
    if (d?.dilemma && !d.alreadyAnswered) {
      await post(`/characters/${id}/dilemma/${turn}/choose`, { optionIndex: dilemmaChoice(bot.dilemma, turn, d.dilemma.options, rng) })
    }
    // 2. lazer (as duas opções custam igual)
    await post(`/characters/${id}/leisure/${turn}/choose`, { optionIndex: Math.floor(rng() * 2) })
    // 3. cupom escondido
    if (bot.huntsCoupons) {
      const c = (await get(`/characters/${id}/coupon/${turn}`)).data
      if (c?.coupon) {
        const claim = await post(`/characters/${id}/coupon/${turn}/claim`)
        if (claim.status === 200) p.coupons++
      }
    }
    // 4. contas
    for (const type of BILL_TYPES) await post(`/characters/${id}/bills/${turn}/pay`, { type })

    // 5. habilidades, na ordem do caminho do robô
    let c = (await get(`/characters/${id}`)).data
    const unlocked = new Set((c.unlockedSkills ?? []).map((u) => u.skillNodeId ?? u.skillNode?.id))
    let free = (c.skillPoints?.totalPoints ?? 0) - (c.skillPoints?.usedPoints ?? 0)
    for (const step of skillOrder(p.skillPath)) {
      const node = nodeOf(step.path, step.level)
      if (!node || unlocked.has(node.id)) continue
      if (node.costPoints > free) break
      const res = await post(`/skills/character/${id}/unlock/${node.id}`, undefined, [400])
      if (res.status !== 200) break
      free -= node.costPoints
      unlocked.add(node.id)
    }

    // 6. dinheiro: sai do cheque especial com as caixinhas, ou investe o que sobra
    c = (await get(`/characters/${id}`)).data
    const cash = Number(c.cash)
    if (cash < 0 && bot.coversOverdraft) {
      let need = -cash
      const byType = {}
      for (const inv of c.fixedInvestments ?? []) byType[inv.type] = (byType[inv.type] ?? 0) + Number(inv.amount)
      for (const type of ['POUPANCA', 'CDB', 'TESOURO_SELIC', 'LCI', 'LCA', 'TESOURO_PRE']) {
        if (need <= 0 || !byType[type]) continue
        const amount = Math.round(Math.min(need * 1.25, byType[type]) * 100) / 100 // folga para o IR
        const res = await post(`/investments/fixed/${id}/withdraw`, { type, amount }, [400, 422])
        if (res.status === 200) need -= amount
      }
    } else if (cash > 0) {
      const monthlyNeed = Number(c.housingCost) + Number(c.foodCost) + Number(c.utilitiesCost) + Number(c.transportCost)
      for (const order of investPlan(bot.invest, investable(cash, monthlyNeed, bot.reserveMonths), turn)) {
        if (order.kind === 'fixed') await post(`/investments/fixed/${id}`, { type: order.type, amount: order.amount }, [422])
        if (order.kind === 'debenture' && company) await post(`/investments/debentures/${id}`, { companyId: company.id, amount: order.amount }, [422])
        if (order.kind === 'stocks') {
          const market = (await get(`/investments/market/${room.id}`)).data ?? []
          for (const o of stockOrders(order.amount, market)) {
            await post(`/investments/trade/${id}`, { assetId: o.assetId, operation: 'buy', quantity: o.quantity }, [422])
          }
        }
      }
    }

    // 7. fecha o mês
    await call(token, 'PATCH', `/characters/${id}/ready`)
  }

  // ─── resumo ──────────────────────────────────────────────────────────────────
  const valid = results.filter((x) => x.netWorth != null)
  const groupBy = (key) => {
    const out = {}
    for (const x of valid) (out[x[key]] ??= []).push(x)
    return Object.fromEntries(Object.entries(out).map(([k, list]) => [k, {
      netWorth: stats(list.map((x) => x.netWorth)),
      overdraftMonths: stats(list.map((x) => x.overdraftMonths)),
      firedPct: Math.round((list.filter((x) => x.fired).length / list.length) * 1000) / 10,
      winsPct: Math.round((list.filter((x) => x.rank === 1).length / list.length) * 1000) / 10,
    }]))
  }
  // dom e caminho comparados só entre robôs que jogam (sem o Dorminhoco)
  const active = valid.filter((x) => x.bot !== 'dorminhoco')
  const fairGroup = (key) => {
    const out = {}
    for (const x of active) (out[x[key]] ??= []).push(x.netWorth)
    return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, stats(v)]))
  }
  const badgeCounts = {}
  for (const x of valid) for (const b of x.badges) badgeCounts[b] = (badgeCounts[b] ?? 0) + 1

  const summary = {
    seed: SEED,
    managementMult: MANAGEMENT_MULT,
    rooms: ROOMS,
    botYears: results.length,
    seconds: Math.round((Date.now() - started) / 1000),
    failures: failures.length,
    failureSamples: failures.slice(0, 20),
    bots: BOTS.map(({ id, name, bio }) => ({ id, name, bio })),
    byBot: groupBy('bot'),
    byGift: fairGroup('gift'),
    byPath: fairGroup('path'),
    byDilemma: fairGroup('dilemma'),
    byInvest: fairGroup('invest'),
    badges: badgeCounts,
    monthsByBot: Object.fromEntries(BOTS.map((b) => {
      const list = valid.filter((x) => x.bot === b.id && x.months.length)
      const len = Math.max(0, ...list.map((x) => x.months.length))
      return [b.id, Array.from({ length: len }, (_, m) => stats(list.map((x) => x.months[m])).mean)]
    })),
  }

  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 1))
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2))
  console.log(`\n${results.length} anos jogados em ${summary.seconds}s · falhas: ${failures.length}`)
  for (const b of BOTS) {
    const s = summary.byBot[b.id]?.netWorth
    if (s) console.log(`${b.name.padEnd(18)} média ${s.mean.toFixed(0).padStart(7)} · p10 ${String(s.p10).padStart(9)} · p90 ${String(s.p90).padStart(9)} · vence ${summary.byBot[b.id].winsPct}%`)
  }
  server.close()
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
