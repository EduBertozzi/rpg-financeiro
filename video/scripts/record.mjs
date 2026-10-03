// Grava o jogo de verdade para o vídeo tutorial (servidor e cliente locais).
// Saída: footage/<clipe>.webm e footage/markers.json (segundos de cada momento).
// Uso: node scripts/record.mjs   (precisa de localhost:3001 e localhost:5173)
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { io } from '../../client/node_modules/socket.io-client/build/esm-debug/index.js'

const API = 'http://localhost:3001/api/v1'
const WEB = 'http://localhost:5173'
const OUT = path.resolve('footage')
const GATE_HASH = '5e183656' // libera a trava de surpresa no navegador da gravação
fs.mkdirSync(OUT, { recursive: true })

const call = async (token, method, url, body) => {
  const r = await fetch(API + url, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined })
  return r.json().catch(() => null)
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const n = Date.now()
const markers = {}

// cursor desenhado (o Playwright não grava o do sistema) e um círculo no clique
const CURSOR = () => {
  const add = () => {
    if (document.getElementById('rec-cursor')) return
    const c = document.createElement('div')
    c.id = 'rec-cursor'
    c.innerHTML = '<svg width="34" height="34" viewBox="0 0 24 24"><path d="M4 2l15 9-6.5 1.5L16 20l-3 1.5-3.5-7.5L4 18z" fill="#fff" stroke="#24331F" stroke-width="1.6" stroke-linejoin="round"/></svg>'
    Object.assign(c.style, { position: 'fixed', left: '-100px', top: '-100px', zIndex: 2147483647, pointerEvents: 'none', filter: 'drop-shadow(0 3px 3px rgba(0,0,0,.35))', transition: 'transform .08s' })
    document.documentElement.appendChild(c)
    window.addEventListener('mousemove', (e) => { c.style.left = e.clientX - 4 + 'px'; c.style.top = e.clientY - 2 + 'px' }, true)
    window.addEventListener('mousedown', (e) => {
      c.style.transform = 'scale(.85)'
      const r = document.createElement('div')
      Object.assign(r.style, { position: 'fixed', left: e.clientX - 22 + 'px', top: e.clientY - 22 + 'px', width: '44px', height: '44px', borderRadius: '50%', border: '4px solid #F4C430', zIndex: 2147483646, pointerEvents: 'none', transition: 'transform .45s ease-out, opacity .45s' })
      document.documentElement.appendChild(r)
      requestAnimationFrame(() => { r.style.transform = 'scale(1.8)'; r.style.opacity = '0' })
      setTimeout(() => r.remove(), 500)
    }, true)
    window.addEventListener('mouseup', () => { c.style.transform = '' }, true)
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add)
  else add()
}

async function session(name) {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } } })
  await context.addInitScript(CURSOR)
  await context.addInitScript((h) => { try { localStorage.setItem('chave-surpresa', h) } catch {} }, GATE_HASH)
  const page = await context.newPage()
  const t0 = Date.now()
  markers[name] = {}
  const mark = (key) => { markers[name][key] = Math.round((Date.now() - t0) / 100) / 10; console.log(name, key, markers[name][key]) }
  let mouse = { x: 960, y: 540 }
  const glide = async (x, y, steps = 28) => { await page.mouse.move(x, y, { steps }); mouse = { x, y } }
  const to = async (locator, { click = true, pause = 350 } = {}) => {
    const el = typeof locator === 'string' ? page.locator(locator).first() : locator
    try {
      await el.waitFor({ state: 'visible', timeout: 15000 })
    } catch (err) {
      await page.screenshot({ path: path.join(OUT, `fail-${name}.png`) })
      throw err
    }
    const b = await el.boundingBox()
    await glide(b.x + b.width / 2, b.y + b.height / 2)
    await wait(pause)
    if (click) await page.mouse.down(), await wait(90), await page.mouse.up()
    await wait(300)
  }
  const type = async (selector, text) => {
    await to(selector)
    await page.keyboard.type(text, { delay: 70 })
    await wait(250)
  }
  const finish = async () => {
    const video = page.video()
    await context.close()
    await browser.close()
    fs.renameSync(await video.path(), path.join(OUT, `${name}.webm`))
  }
  // lugares da barra lateral: o mouse abre a barra e clica no nome
  const nav = async (label) => {
    await glide(40, 470, 18)
    await wait(700)
    await to(page.locator('aside button', { hasText: label }).first())
    await glide(1100, 520, 18)
  }
  page.on('pageerror', (e) => console.log('pageerror', e.message))
  return { page, mark, glide, to, type, nav, finish, get mouse() { return mouse } }
}

// ─── preparação: professora, sala e colegas robôs ────────────────────────────
const admin = await call(null, 'POST', '/auth/register-admin', { name: 'Profa. Marta', email: `marta${n}@escola.br`, password: 'santarita', inviteCode: 'SANTA-RITA-DEV' })
const BOTS = [['Caio', 4, 'frugal'], ['Lia', 2, 'agile'], ['Theo', 5, 'frugal'], ['Nina', 6, 'smart']]
async function makeBot([name, avatarId, gift], roomId) {
  const email = `${name.toLowerCase()}${n}@bots.br`
  await call(null, 'POST', '/auth/register', { name, email, password: 'santarita' })
  const l = await call(null, 'POST', '/auth/login', { email, password: 'santarita' })
  const c = await call(l.token, 'POST', '/characters', { roomId, name, avatarId, course: 'Administração', gift })
  return { t: l.token, id: c.id }
}
async function botMonth(b, turn, opt) {
  await call(b.t, 'POST', `/characters/${b.id}/dilemma/${turn}/choose`, { optionIndex: opt })
  await call(b.t, 'POST', `/characters/${b.id}/leisure/${turn}/choose`, { optionIndex: opt % 2 })
  for (const type of ['food', 'utilities', 'transport']) await call(b.t, 'POST', `/characters/${b.id}/bills/${turn}/pay`, { type })
  await call(b.t, 'PATCH', `/characters/${b.id}/ready`)
}

// ─── 1. a professora cria a sala e inicia a partida ──────────────────────────
let room
{
  const s = await session('admin')
  const { page } = s
  await page.goto(`${WEB}/login`)
  await wait(1200)
  s.mark('login')
  await s.type('input[type=email]', `marta${n}@escola.br`)
  await s.type('input[type=password]', 'santarita')
  await s.to('button[type=submit]')
  await page.waitForURL('**/admin')
  await wait(1500)
  s.mark('panel')
  await s.to('text=+ Nova sala')
  s.mark('newRoom')
  await s.type('#new-room-name', '3º ano A · manhã')
  await s.to('text=Criar sala')
  await wait(1500)
  s.mark('roomCreated')
  const rooms = await call(admin.token, 'GET', '/rooms/mine')
  room = rooms[0]
  await s.to(page.locator('text=' + room.code).first(), { click: false, pause: 1200 })
  // os colegas entram com o código enquanto a professora espera
  global.bots = []
  for (const b of BOTS) global.bots.push(await makeBot(b, room.id))
  await wait(800)
  await page.reload()
  await wait(2000)
  s.mark('playersIn')
  await s.to('text=Iniciar partida')
  await wait(2200)
  s.mark('started')
  await wait(1500)
  await s.finish()
}
const bots = global.bots

// ─── 2. a aluna: personagem, janeiro, um mês inteiro, virada e mais ─────────
{
  const email = `duda${n}@escola.br`
  await call(null, 'POST', '/auth/register', { name: 'Duda', email, password: 'santarita' })
  const s = await session('player')
  const { page } = s
  await page.goto(`${WEB}/login`)
  await wait(1000)
  s.mark('login')
  await s.type('input[type=email]', email)
  await s.type('input[type=password]', 'santarita')
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
  for (let i = 0; i < 5; i++) { await wait(1500); await s.to('text=Próximo', { pause: 300 }) }
  await wait(1500)
  await s.to('text=Ver o dilema')
  await wait(1800)
  s.mark('dilemma')
  await s.to(page.locator('[role=dialog] button:has(span)').first(), { click: false, pause: 900 })
  await s.to(page.locator('[role=dialog] button:has(span)').nth(1), { click: false, pause: 900 })
  await s.to(page.locator('[role=dialog] button:has(span)').first(), { pause: 500 })
  await wait(1800)
  s.mark('dilemmaResult')
  await s.to('text=Seguir o mês')
  await wait(800)

  // lazer
  s.mark('leisure')
  await s.to('[role=button][aria-label^="Lazer"]')
  await wait(1200)
  await s.to(page.locator('[role=dialog] button').nth(1), { pause: 500 })
  await s.to('text=Escolher e pagar')
  await wait(1500)
  await s.to('text=Concluir lazer')
  await wait(600)

  // as três contas
  s.mark('bills')
  for (const label of ['Mercadinho', 'Água e Luz', 'Internet e Celular']) {
    await s.to(`[role=button][aria-label^="${label}"]`)
    await wait(1000)
    await s.to(page.locator('button:has-text("Pagar R$")'))
    await wait(1300)
    await s.to('text=Concluir')
    await wait(700)
  }
  s.mark('monthClean')
  await wait(2500)

  // HUD: passa o mouse na barra
  s.mark('hud')
  await s.glide(150, 420, 30)
  await wait(3200)

  // banco: guardar na caixinha
  s.mark('bank')
  await s.nav('Banco')
  await wait(1800)
  await s.glide(1100, 300, 20)
  await s.to('text=Guardar')
  await wait(900)
  await s.to('input[inputmode=decimal]')
  await page.keyboard.type('2000', { delay: 120 })
  await wait(500)
  await s.to('text=Confirmar')
  await wait(3000)
  s.mark('bankDone')

  // encerra o mês; colegas terminam e a professora vira o mês
  await s.nav('Mapa')
  await wait(1500)
  s.mark('close')
  await s.to('text=Encerrar mês', { pause: 600 })
  await wait(1500)
  for (const [i, b] of bots.entries()) await botMonth(b, 1, i % 2)
  // como o painel da professora: fecha o mês e avisa a sala pelo socket
  const result = await call(admin.token, 'POST', `/rooms/${room.id}/next-turn`)
  const sock = io('http://localhost:3001', { transports: ['websocket'] })
  await new Promise((r) => sock.on('connect', r))
  sock.emit('room:join', { roomId: room.id, characterId: 'admin' })
  sock.emit('turn:broadcast', { roomId: room.id, result })
  await wait(300)
  sock.close()
  s.mark('scene')
  await wait(6200)
  s.mark('summary')
  await wait(3000)
  await s.to('text=Bora para', { pause: 600 })
  await wait(1500)
  await s.to('text=Decidir depois').catch(() => {})
  await wait(800)

  // universidade: desbloqueia uma habilidade (confete)
  s.mark('skills')
  await s.nav('Universidade')
  await wait(2500)
  const intro = page.locator('text=Começar').first()
  if (await intro.isVisible().catch(() => false)) { await s.to(intro); await wait(1200) }
  const unlock = page.locator('button:has-text("Desbloquear por")').first()
  if (!(await unlock.isVisible().catch(() => false))) {
    const node = page.locator('svg [role=button], [data-skill]').first()
    if (await node.isVisible().catch(() => false)) await s.to(node)
    await wait(800)
  }
  await s.to(page.locator('button:has-text("Desbloquear por")').first(), { pause: 700 })
  s.mark('confetti')
  await wait(4500)

  // caderninho e como jogar
  s.mark('notebook')
  await s.to('[aria-label="Abrir o caderninho"]')
  await wait(2600)
  await s.to(page.locator('text=virar →').last())
  await wait(1600)
  await s.to(page.locator('text=virar →').last())
  await wait(1600)
  await page.keyboard.press('Escape')
  await wait(700)
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

// ─── 3. dezembro: o fim do ano e o ranking ──────────────────────────────────
{
  const r2 = await call(admin.token, 'POST', '/rooms', { name: '3º ano B' })
  const email = `bia${n}@escola.br`
  await call(null, 'POST', '/auth/register', { name: 'Bia', email, password: 'santarita' })
  const l = await call(null, 'POST', '/auth/login', { email, password: 'santarita' })
  const me = await call(l.token, 'POST', '/characters', { roomId: r2.id, name: 'Bia', avatarId: 3, course: 'Engenharia', gift: 'smart' })
  const others = []
  for (const b of BOTS) others.push(await makeBot(b, r2.id))
  await call(admin.token, 'POST', `/rooms/${r2.id}/start`)
  const all = [{ t: l.token, id: me.id }, ...others]
  for (let turn = 1; turn <= 12; turn++) {
    for (const [i, b] of all.entries()) await botMonth(b, turn, (i + turn) % 2)
    if (turn === 2) await call(l.token, 'POST', `/investments/fixed/${me.id}`, { type: 'CDB', amount: 8000 })
    await call(admin.token, 'POST', `/rooms/${r2.id}/next-turn`)
  }
  const s = await session('finished')
  const { page } = s
  await page.goto(`${WEB}/login`)
  await wait(800)
  await page.fill('input[type=email]', email)
  await page.fill('input[type=password]', 'santarita')
  await page.keyboard.press('Enter')
  await wait(2500)
  if (!page.url().includes('/finished')) await page.goto(`${WEB}/finished`)
  await wait(2500)
  s.mark('finished')
  await s.glide(960, 600, 20)
  for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, 260); await wait(700) }
  await wait(1200)
  s.mark('end')
  await s.finish()
}

fs.writeFileSync(path.join(OUT, 'markers.json'), JSON.stringify(markers, null, 2))
fs.mkdirSync('public', { recursive: true })
for (const f of ['admin', 'player', 'finished']) fs.copyFileSync(path.join(OUT, `${f}.webm`), path.join('public', `${f}.webm`))
console.log('ok', OUT)
