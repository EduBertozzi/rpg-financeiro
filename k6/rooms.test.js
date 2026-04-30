// k6/rooms.test.js
// Testa carga nas operações de sala — criar, buscar, leaderboard
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const errorRate = new Rate('errors')

export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '30s', target: 20 },  // pico de 20 jogadores simultâneos
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
}

const BASE_URL = 'http://localhost:3001/api/v1'
const HEADERS = { 'Content-Type': 'application/json' }

function getToken() {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: 'dudu4@gmail.com', password: '123456' }),
    { headers: HEADERS }
  )
  try { return JSON.parse(res.body).token } catch { return null }
}

export default function () {
  const token = getToken()
  if (!token) { errorRate.add(1); return }

  const authHeaders = { ...HEADERS, Authorization: `Bearer ${token}` }

  // Criar sala
  const createRes = http.post(
    `${BASE_URL}/rooms`,
    JSON.stringify({ maxTurns: 12 }),
    { headers: authHeaders }
  )

  const createOk = check(createRes, {
    'criar sala status 201': (r) => r.status === 201,
    'criar sala retorna code': (r) => {
      try { return !!JSON.parse(r.body).code } catch { return false }
    },
  })
  errorRate.add(!createOk)

  sleep(0.5)

  // Buscar sala pelo código
  if (createOk) {
    let code
    try { code = JSON.parse(createRes.body).code } catch { return }

    const getRes = http.get(`${BASE_URL}/rooms/${code}`)
    const getOk = check(getRes, {
      'buscar sala status 200': (r) => r.status === 200,
      'sala tem personagens': (r) => {
        try { return Array.isArray(JSON.parse(r.body).characters) } catch { return false }
      },
    })
    errorRate.add(!getOk)
  }

  sleep(1)
}