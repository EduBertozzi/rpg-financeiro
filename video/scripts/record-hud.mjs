// Grava a barra lateral aberta no meio do ano (servidor e cliente locais).
// Saída: footage/hud.webm e footage/markers-hud.json.
// Uso: node scripts/record.mjs   (precisa de localhost:3001 e localhost:5173)
import fs from 'node:fs'
import path from 'node:path'
import { BOTS, botMonth, call, makeBot as makeBotIn, wait, waitTurn } from './game.mjs'
import { INVITE, OUT, WEB, session as open } from './rec.mjs'

const n = Date.now()
const markers = {}
const session = (name) => open(name, markers)

// ─── preparação: professora, sala e colegas robôs ────────────────────────────
const admin = await call(null, 'POST', '/auth/register-admin', { name: 'Profa. Marta', email: `marta${n}@escola.br`, password: 'fechaomes', inviteCode: INVITE })
const makeBot = (b, roomId) => makeBotIn(b, roomId, n)

// ─── a barra lateral aberta, no meio do ano ─────────────────────────────────
{
  const r = await call(admin.token, 'POST', '/rooms', { name: '3º ano C' })
  const email = `duda${n}@escola.br`
  await call(null, 'POST', '/auth/register', { name: 'Duda', email, password: 'fechaomes' })
  const l = await call(null, 'POST', '/auth/login', { email, password: 'fechaomes' })
  const me = await call(l.token, 'POST', '/characters', { roomId: r.id, name: 'Duda', avatarId: 3, course: 'Engenharia', gift: 'smart' })
  const others = []
  for (const b of BOTS) others.push(await makeBot(b, r.id))
  await call(admin.token, 'POST', `/rooms/${r.id}/start`)
  const all = [{ t: l.token, id: me.id }, ...others]
  for (let turn = 1; turn <= 4; turn++) {
    if (turn >= 2) await call(l.token, 'POST', `/investments/fixed/${me.id}`, { type: 'CDB', amount: 700 })
    for (const [i, b] of all.entries()) await botMonth(b, turn, (i + turn) % 2)
    await waitTurn(r.code, turn, admin.token, r.id)
  }
  // maio: dois colegas já terminaram, a Duda pagou o mercadinho e o lazer
  await botMonth(others[0], 5, 0)
  await botMonth(others[1], 5, 1)
  await call(l.token, 'POST', `/characters/${me.id}/leisure/5/choose`, { optionIndex: 0 })
  await call(l.token, 'POST', `/characters/${me.id}/bills/5/pay`, { type: 'food' })
  const s = await session('hud')
  const { page } = s
  await page.goto(`${WEB}/login`)
  await page.fill('input[type=email]', email)
  await page.fill('input[type=password]', 'fechaomes')
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
  await s.glide(170, 190, 20) // patrimônio com o gráfico
  await wait(1400)
  await s.glide(160, 380, 20) // tarefas do mês
  await wait(1300)
  await s.glide(200, 435, 20) // turma
  await wait(1300)
  await s.glide(180, 670, 20) // árvore com os pontos
  await wait(1300)
  // o gráfico do patrimônio abre em detalhes
  s.mark('chart')
  await s.to('[aria-label="Ver o gráfico do patrimônio em detalhes"]', { pause: 600 })
  await wait(1500)
  const svg = await page.locator('[aria-label="Gráfico do patrimônio e do saldo mês a mês"]').boundingBox()
  for (const k of [0.02, 0.1, 0.19, 0.28, 0.37]) { await s.glide(svg.x + svg.width * k + 40, svg.y + svg.height * 0.5, 12); await wait(700) }
  await wait(1200)
  await s.to('[role=dialog][aria-label="Seu patrimônio no ano"] [aria-label=Fechar]')
  await wait(1000)
  s.mark('end')
  await s.finish()
}

fs.writeFileSync(path.join(OUT, 'markers-hud.json'), JSON.stringify(markers, null, 2))
fs.copyFileSync(path.join(OUT, 'hud.webm'), path.join('public', 'hud.webm'))
const saved = fs.existsSync('src/markers.json') ? JSON.parse(fs.readFileSync('src/markers.json', 'utf8')) : {}
fs.writeFileSync('src/markers.json', JSON.stringify({ ...saved, ...markers }, null, 2) + '\n')
console.log('ok')
