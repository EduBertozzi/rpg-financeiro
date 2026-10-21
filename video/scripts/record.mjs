// Grava o jogo de verdade para o vídeo tutorial (servidor e cliente locais).
// Saída: footage/<clipe>.webm e footage/markers.json (segundos de cada momento),
// com cópia dos vídeos em public/ e das marcações em src/markers.json.
// Uso: node scripts/record.mjs   (precisa de localhost:3001 e localhost:5173)
// Só alguns trechos: ONLY=finished node scripts/record.mjs (admin, player, finished)
import fs from 'node:fs'
import path from 'node:path'
import { BOTS, botMonth, call, makeBot as makeBotIn, wait, waitTurn } from './game.mjs'
import { INVITE, OUT, WEB, session as open } from './rec.mjs'

const n = Date.now()
const markers = {}
const session = (name) => open(name, markers)
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : ['admin', 'player', 'finished']

// ─── preparação: professora, sala e colegas robôs ────────────────────────────
const admin = await call(null, 'POST', '/auth/register-admin', { name: 'Profa. Marta', email: `marta${n}@escola.br`, password: 'fechaomes', inviteCode: INVITE })
if (!admin?.token) throw new Error('não deu para criar a professora: ' + JSON.stringify(admin))
const makeBot = (b, roomId) => makeBotIn(b, roomId, n)

// ─── 1. a professora cria a sala e inicia a partida ──────────────────────────
let room
let bots
if (ONLY.includes('admin') || ONLY.includes('player')) {
  const s = await session('admin')
  const { page } = s
  await page.goto(`${WEB}/login`)
  await wait(1200)
  s.mark('login')
  await s.type('input[type=email]', `marta${n}@escola.br`)
  await s.type('input[type=password]', 'fechaomes')
  await s.to('button[type=submit]')
  await page.waitForURL('**/admin')
  await wait(1500)
  s.mark('panel')
  await s.to('text=+ Nova sala')
  s.mark('newRoom')
  await s.type('#new-room-name', '3º ano A · manhã')
  await s.to('text=Minutos por mês', { click: false, pause: 900 })
  await s.to('text=Criar sala')
  await wait(1500)
  s.mark('roomCreated')
  const rooms = await call(admin.token, 'GET', '/rooms/mine')
  room = rooms[0]
  await s.to(page.locator('text=' + room.code).first(), { click: false, pause: 1200 })
  // os colegas entram com o código enquanto a professora espera
  bots = []
  for (const b of BOTS) bots.push(await makeBot(b, room.id))
  await wait(800)
  await page.reload()
  await wait(2000)
  s.mark('playersIn')
  await s.to('text=Iniciar partida')
  await wait(2200)
  s.mark('started')
  await s.to(page.locator('text=para o mês fechar sozinho').first(), { click: false, pause: 1400 })
  await s.to('text=Pausar relógio', { click: false, pause: 1200 })
  s.mark('clock')
  await wait(1200)
  await s.finish()
}

// ─── 2. a aluna: personagem, janeiro, um mês inteiro, virada e mais ─────────
if (ONLY.includes('player')) {
  const email = `duda${n}@escola.br`
  await call(null, 'POST', '/auth/register', { name: 'Duda', email, password: 'fechaomes' })
  const s = await session('player')
  const { page } = s
  await page.goto(`${WEB}/login`)
  await wait(1000)
  s.mark('login')
  await s.type('input[type=email]', email)
  await s.type('input[type=password]', 'fechaomes')
  await s.to('button[type=submit]')
  await page.waitForURL('**/character')
  await wait(1200)
  s.mark('create')
  const avatars = page.locator('button[aria-pressed]')
  for (const i of [0, 1, 2, 3, 4, 5, 2]) { await s.to(avatars.nth(i), { click: false, pause: 650 }) }
  s.mark('pickAvatar')
  await s.to(avatars.nth(2))
  await s.type('#cc-name', 'Duda')
  await s.type('#cc-room', room.code)
  await s.to('text=Próximo: escolher o dom')
  await wait(800)
  s.mark('gift')
  await s.to(page.locator('button[aria-pressed]').nth(2), { pause: 600 })
  await s.to('text=Próximo: ver a carteira')
  await wait(1200)
  s.mark('card')
  await s.to('text=Começar o jogo', { pause: 800 })
  await page.waitForURL('**/map')
  await wait(2200)
  s.mark('januarySummary')
  await s.to('text=Bora para', { pause: 900 })
  await wait(900)
  s.mark('tour')
  for (let i = 0; i < 6; i++) { await wait(1500); await s.to('text=Próximo', { pause: 300 }) }
  await wait(1500)
  await s.to('text=Começar o mês')
  await wait(1000)

  // o relógio fixo no canto
  s.mark('timer')
  await s.to('[role=timer]', { click: false, pause: 1600 })

  // a cidade viva: o mouse passeia pelos prédios e recolhe/abre os painéis
  s.mark('town')
  for (const label of ['Inabank', 'Mercadinho', 'Árvore de habilidades', 'Água e Luz', 'Internet e Celular']) {
    await s.to(`[role=button][aria-label^="${label}"]`, { click: false, pause: 700, dy: -40 })
  }
  await s.maybe('[aria-label="Recolher o painel da cidade"]', { pause: 400 })
  await wait(700)
  await s.maybe('button:has-text("A cidade")', { pause: 400 })
  await wait(900)

  // lazer: zoom curto com holofote e o modal
  s.mark('leisure')
  await s.to('[role=button][aria-label^="Lazer"]', { dy: -30 })
  await wait(1400)
  await s.to(page.locator('[role=dialog] button[aria-pressed]').nth(0), { click: false, pause: 500 })
  await s.to(page.locator('[role=dialog] button[aria-pressed]').nth(1), { pause: 500 })
  await s.to('text=Escolher e pagar')
  await wait(1500)
  await s.to('text=Concluir lazer')
  await wait(800)

  // as três contas (a faixa PAGO aparece em cada prédio)
  s.mark('bills')
  for (const label of ['Mercadinho', 'Água e Luz', 'Internet e Celular']) {
    await s.to(`[role=button][aria-label^="${label}"]`, { dy: -30 })
    await wait(1200)
    await s.to(page.locator('button:has-text("Pagar R$")'))
    await wait(1300)
    await s.to('text=Concluir')
    await wait(900)
  }
  s.mark('monthClean')
  await wait(2500)

  // barra lateral e o gráfico do patrimônio em detalhes
  s.mark('hud')
  await s.glide(40, 420, 30)
  await wait(500)
  await s.glide(160, 300, 20)
  await wait(2200)
  s.mark('chart')
  await s.to('[aria-label="Ver o gráfico do patrimônio em detalhes"]', { pause: 600 })
  await wait(1200)
  await s.glide(700, 470, 20)
  await wait(900)
  await s.glide(780, 450, 20)
  await wait(1400)
  await s.to('[role=dialog][aria-label="Seu patrimônio no ano"] [aria-label=Fechar]')
  await wait(800)

  // Inabank: máscara de valor, caixinha com carência, ações e extrato
  s.mark('bank')
  await s.nav('Inabank')
  await wait(2000)
  await s.to('[aria-label="Esconder valores"]', { pause: 500 })
  await wait(1100)
  await s.to('[aria-label="Mostrar valores"]', { pause: 300 })
  await wait(700)
  s.mark('box')
  await s.to(page.locator('button:has-text("Risco"):has-text("LCI")').first(), { pause: 500 })
  await wait(1000)
  await s.to('#bank-amount')
  await page.keyboard.type('800', { delay: 180 })
  await wait(900)
  await s.to('[role=dialog] button:has-text("Confirmar")')
  await wait(2600)
  s.mark('stocks')
  await s.glide(960, 700, 12)
  for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 180); await wait(220) }
  await wait(600)
  const plus = page.locator('[aria-label="Mais uma"]').nth(3)
  await s.to(plus, { pause: 300, scroll: true })
  await s.to(plus, { pause: 200 })
  await wait(400)
  await s.to(page.locator('button:has-text("Comprar")').nth(3), { pause: 500 })
  await wait(2200)
  s.mark('statement')
  for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 200); await wait(220) }
  await wait(500)
  await s.to('[role=tablist] button:has-text("Entradas")', { pause: 400, scroll: true })
  await wait(1500)
  await s.to('[role=tablist] button:has-text("Saídas")', { pause: 400 })
  await wait(1500)
  await s.to('[role=tablist] button:has-text("Tudo")', { pause: 400 })
  await wait(1200)
  s.mark('bankDone')

  // de volta à cidade: a moeda do banco gira com o investimento
  await s.nav('Mapa')
  await wait(1200)
  s.mark('coin')
  await s.to('[role=button][aria-label^="Inabank"]', { click: false, pause: 400, dy: -60 })
  await wait(2200)

  // encerra o mês: pop-up, a cidade trava e chega o dilema
  s.mark('close')
  await s.to('button:has-text("Encerrar mês")', { pause: 600 })
  await wait(1600)
  await s.to('[role=dialog] button:has-text("Encerrar")', { pause: 700 })
  await wait(2400)
  s.mark('dilemma')
  await s.to('[role=dialog] [role=timer]', { click: false, pause: 1200 })
  const options = page.locator('[role=dialog][aria-label="Dilema do mês"] button:has(span)')
  await s.to(options.first(), { click: false, pause: 900 })
  await s.to(options.nth(1), { click: false, pause: 900 })
  s.mark('dilemmaBank')
  await s.to('text=Acessar o banco', { pause: 500 })
  await wait(3000)
  await s.glide(600, 500, 20)
  await page.mouse.wheel(0, 300)
  await wait(1500)
  await s.to('text=Fechar o banco', { pause: 500 })
  await wait(1500)
  await s.to(options.first(), { pause: 500 })
  await wait(1800)
  s.mark('dilemmaResult')
  await s.to('text=Fechar o mês', { pause: 900 })
  await wait(1200)
  s.mark('waiting')
  await wait(2500)
  // os colegas terminam e o mês vira sozinho
  for (const [i, b] of bots.entries()) await botMonth(b, 1, i % 2)
  await waitTurn(room.code, 1, admin.token, room.id)
  s.mark('scene')
  await page.locator('text=Bora para').first().waitFor({ state: 'visible', timeout: 30000 })
  s.mark('summary')
  await wait(1500)
  // o resumo da virada: holerite e as vantagens
  await s.glide(960, 600, 20)
  await wait(1200)
  for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 160); await wait(450) }
  await wait(1800)
  await s.to('text=Bora para', { pause: 600 })
  await wait(1500)

  // árvore de habilidades: desbloqueia uma habilidade (confete)
  s.mark('skills')
  await s.nav('Árvore de habilidades')
  await wait(3500)
  await s.maybe('[role=button][aria-label^="Organização Financeira"]', { pause: 500 })
  await wait(1200)
  await s.to(page.locator('button:has-text("Desbloquear por")').first(), { pause: 700 })
  s.mark('confetti')
  await wait(4000)

  // a árvore do mapa cresce com a habilidade
  await s.nav('Mapa')
  await wait(800)
  s.mark('treeMap')
  await s.to('[role=button][aria-label^="Árvore de habilidades"]', { click: false, pause: 400, dy: -60 })
  await wait(2200)

  // caderninho (abre da capa fechada) e como jogar
  s.mark('notebook')
  await s.to('[aria-label="Abrir o caderninho"]')
  await wait(3200)
  await s.to(page.locator('text=virar →').last())
  await wait(1600)
  await s.to(page.locator('text=virar →').last())
  await wait(1600)
  await page.keyboard.press('Escape')
  await wait(900)
  s.mark('howto')
  await s.to('[aria-label="Como jogar"]')
  await wait(2000)
  await s.to('text=Próximo →')
  await wait(1800)
  await s.to('text=Próximo →')
  await wait(1800)
  await page.keyboard.press('Escape')
  await wait(1000)
  s.mark('end')
  await s.finish()
}

// ─── 3. dezembro: o fim do ano ───────────────────────────────────────────────
if (ONLY.includes('finished')) {
  const r2 = await call(admin.token, 'POST', '/rooms', { name: '3º ano B' })
  const email = `bia${n}@escola.br`
  await call(null, 'POST', '/auth/register', { name: 'Bia', email, password: 'fechaomes' })
  const l = await call(null, 'POST', '/auth/login', { email, password: 'fechaomes' })
  const me = await call(l.token, 'POST', '/characters', { roomId: r2.id, name: 'Bia', avatarId: 3, course: 'Engenharia', gift: 'frugal' })
  const others = []
  for (const b of BOTS) others.push(await makeBot(b, r2.id))
  await call(admin.token, 'POST', `/rooms/${r2.id}/start`)
  const all = [{ t: l.token, id: me.id }, ...others]
  for (let turn = 1; turn <= 12; turn++) {
    // a Bia guarda um pouco todo mês (o investimento sai antes de encerrar)
    if (turn >= 2 && turn <= 10) {
      const r = await call(l.token, 'POST', `/investments/fixed/${me.id}`, { type: turn % 2 ? 'CDB' : 'TESOURO_SELIC', amount: 600 })
      if (r?.error) console.log('investimento', turn, r.error)
    }
    // a Bia escolhe como a melhor colega (e ainda guarda): fica no pódio
    for (const [i, b] of all.entries()) await botMonth(b, turn, ((i || 3) + turn) % 2)
    await waitTurn(r2.code, turn, admin.token, r2.id)
  }
  const s = await session('finished')
  const { page } = s
  await page.goto(`${WEB}/login`)
  await wait(800)
  await page.fill('input[type=email]', email)
  await page.fill('input[type=password]', 'fechaomes')
  await page.keyboard.press('Enter')
  await wait(2500)
  if (!page.url().includes('/finished')) await page.goto(`${WEB}/finished`)
  await page.locator('text=Fechou o ano!').waitFor({ state: 'visible', timeout: 20000 })
  s.mark('finished')
  await wait(5000)
  s.mark('scroll')
  await s.glide(960, 600, 20)
  for (let i = 0; i < 9; i++) { await page.mouse.wheel(0, 200); await wait(900) }
  await wait(1500)
  s.mark('end')
  await s.finish()
}

const prev = fs.existsSync(path.join(OUT, 'markers.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'markers.json'), 'utf8')) : {}
fs.writeFileSync(path.join(OUT, 'markers.json'), JSON.stringify({ ...prev, ...markers }, null, 2))
fs.mkdirSync('public', { recursive: true })
for (const f of Object.keys(markers)) fs.copyFileSync(path.join(OUT, `${f}.webm`), path.join('public', `${f}.webm`))
// o roteiro (src/plan.jsx) lê as marcações daqui
const all = fs.existsSync('src/markers.json') ? JSON.parse(fs.readFileSync('src/markers.json', 'utf8')) : {}
fs.writeFileSync('src/markers.json', JSON.stringify({ ...all, ...markers }, null, 2) + '\n')
console.log('ok', OUT)
