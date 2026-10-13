// Ajudantes das gravações: chamadas à API e os colegas robôs jogando o mês na
// ordem do jogo (lazer e contas, encerra o mês e só então o dilema). O mês
// vira sozinho quando todo mundo termina; aqui só esperamos a virada.
export const API = 'http://localhost:3001/api/v1'
export const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export const call = async (token, method, url, body) => {
  const r = await fetch(API + url, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined })
  return r.json().catch(() => null)
}

export const BOTS = [['Caio', 4, 'frugal'], ['Lia', 2, 'agile'], ['Theo', 5, 'frugal'], ['Nina', 6, 'smart']]

export async function makeBot([name, avatarId, gift], roomId, n) {
  const email = `${name.toLowerCase()}${n}@bots.br`
  await call(null, 'POST', '/auth/register', { name, email, password: 'fechaomes' })
  const l = await call(null, 'POST', '/auth/login', { email, password: 'fechaomes' })
  const c = await call(l.token, 'POST', '/characters', { roomId, name, avatarId, course: 'Engenheiro(a) de Produção', gift })
  return { t: l.token, id: c.id }
}

// tudo do mês, com o dilema por último
export async function botMonth(b, turn, opt) {
  await call(b.t, 'POST', `/characters/${b.id}/leisure/${turn}/choose`, { optionIndex: opt % 2 })
  for (const type of ['food', 'utilities', 'transport']) await call(b.t, 'POST', `/characters/${b.id}/bills/${turn}/pay`, { type })
  await call(b.t, 'PATCH', `/characters/${b.id}/ready`)
  await call(b.t, 'POST', `/characters/${b.id}/dilemma/${turn}/choose`, { optionIndex: opt })
}

// espera o servidor virar o mês sozinho (ou vira pelo administrador)
export async function waitTurn(code, turn, adminToken, roomId) {
  for (let i = 0; i < 60; i++) {
    const room = await call(null, 'GET', `/rooms/${code}`)
    if (room?.currentTurn > turn || room?.status === 'finished') return room
    await wait(250)
  }
  return call(adminToken, 'POST', `/rooms/${roomId}/next-turn`)
}
