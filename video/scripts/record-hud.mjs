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

// ─── a barra lateral aberta, no meio do ano ─────────────────────────────────
{
  const r = await call(admin.token, 'POST', '/rooms', { name: '3º ano C' })
  const email = `duda${n}@escola.br`
  await call(null, 'POST', '/auth/register', { name: 'Duda', email, password: 'santarita' })
  const l = await call(null, 'POST', '/auth/login', { email, password: 'santarita' })
  const me = await call(l.token, 'POST', '/characters', { roomId: r.id, name: 'Duda', avatarId: 3, course: 'Engenharia', gift: 'smart' })
  const others = []
  for (const b of BOTS) others.push(await makeBot(b, r.id))
  await call(admin.token, 'POST', `/rooms/${r.id}/start`)
  const all = [{ t: l.token, id: me.id }, ...others]
  for (let turn = 1; turn <= 4; turn++) {
    for (const [i, b] of all.entries()) await botMonth(b, turn, (i + turn) % 2)
    if (turn === 2) await call(l.token, 'POST', `/investments/fixed/${me.id}`, { type: 'CDB', amount: 4000 })
    await call(admin.token, 'POST', `/rooms/${r.id}/next-turn`)
  }
  // maio: dois colegas prontos, a Duda fez o dilema e o mercadinho
  await botMonth(others[0], 5, 0)
  await botMonth(others[1], 5, 1)
  await call(l.token, 'POST', `/characters/${me.id}/dilemma/5/choose`, { optionIndex: 0 })
  await call(l.token, 'POST', `/characters/${me.id}/bills/5/pay`, { type: 'food' })
  const s = await session('hud')
  const { page } = s
  await page.goto(`${WEB}/login`)
  await page.fill('input[type=email]', email)
  await page.fill('input[type=password]', 'santarita')
  await page.keyboard.press('Enter')
  await wait(1500)
  await page.locator('text=Pular').click().catch(() => {})
  await wait(800)
  await page.locator('text=Bora para').click().catch(() => {})
  await wait(1200)
  s.mark('start')
  await s.glide(900, 520, 10)
  await wait(500)
  s.mark('open')
  await s.glide(40, 300, 30)
  await wait(1600)
  await s.glide(180, 260, 20) // patrimônio
  await wait(1300)
  await s.glide(150, 545, 20) // tarefas
  await wait(1300)
  await s.glide(220, 600, 20) // turma
  await wait(1300)
  await s.glide(200, 930, 20) // universidade com selo
  await wait(1300)
  s.mark('end')
  await s.finish()
}

fs.writeFileSync(path.join(OUT, 'markers-hud.json'), JSON.stringify(markers, null, 2))
fs.copyFileSync(path.join(OUT, 'hud.webm'), path.join('public', 'hud.webm'))
console.log('ok')
