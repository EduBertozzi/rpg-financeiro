// Ajudantes do Playwright para as gravações: cursor desenhado, sessão gravada,
// mouse que desliza até o alvo e marcações de tempo (segundos da gravação).
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { wait } from './game.mjs'

export const WEB = 'http://localhost:5173'
export const OUT = path.resolve('footage')
fs.mkdirSync(OUT, { recursive: true })

// código de convite do administrador (dev) lido do server/.env local
export const INVITE = Object.fromEntries(fs.readFileSync('../server/.env', 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')])).ADMIN_INVITE_CODE

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

export async function session(name, markers) {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } } })
  await context.addInitScript(CURSOR)
  const page = await context.newPage()
  const t0 = Date.now()
  markers[name] = {}
  const mark = (key) => { markers[name][key] = Math.round((Date.now() - t0) / 100) / 10; console.log(name, key, markers[name][key]) }
  const shot = (tag) => page.screenshot({ path: path.join(OUT, `fail-${name}-${tag}.png`) }).catch(() => {})
  const glide = async (x, y, steps = 28) => { await page.mouse.move(x, y, { steps }) }
  const box = async (locator, timeout = 15000, scroll = false) => {
    const el = typeof locator === 'string' ? page.locator(locator).first() : locator
    try {
      await el.waitFor({ state: 'visible', timeout })
    } catch (err) {
      await shot('wait')
      throw err
    }
    if (scroll) await el.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {})
    return el.boundingBox()
  }
  const to = async (locator, { click = true, pause = 350, dx = 0, dy = 0, steps = 28, timeout, scroll } = {}) => {
    const b = await box(locator, timeout, scroll)
    await glide(b.x + b.width / 2 + dx, b.y + b.height / 2 + dy, steps)
    await wait(pause)
    if (click) await page.mouse.down(), await wait(90), await page.mouse.up()
    await wait(300)
  }
  // passo opcional: se o alvo não aparece, segue a gravação
  const maybe = async (locator, opts = {}) => {
    try { await to(locator, { timeout: 4000, ...opts }); return true } catch { console.log(name, 'pulou', String(locator)); return false }
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
    await wait(800)
    await to(page.locator('aside nav button', { hasText: label }).first())
    await glide(1100, 520, 18)
  }
  page.on('pageerror', (e) => console.log('pageerror', e.message))
  return { page, mark, glide, to, maybe, type, nav, finish, shot }
}
