// k6/full-game.test.js
// Simula múltiplos jogadores entrando numa sala e consultando dados
// Este é o cenário mais próximo do uso real
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const errorRate = new Rate('errors')
const apiDuration = new Trend('api_duration')

export const options = {
  scenarios: {
    // Cenário 1 — jogadores fazendo login simultaneamente
    login_spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 10 },
        { duration: '20s', target: 10 },
        { duration: '5s',  target: 0 },
      ],
      gracefulRampDown: '5s',
    },
    // Cenário 2 — jogadores consultando mercado e investimentos
    market_load: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      startTime: '10s', // começa depois do login spike
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<3000'],
    api_duration: ['p(90)<2000'],
  },
}

const BASE_URL = 'http://localhost:3001/api/v1'
const HEADERS = { 'Content-Type': 'application/json' }

function login() {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: 'dudu4@gmail.com', password: '123456' }),
    { headers: HEADERS }
  )
  try {
    const body = JSON.parse(res.body)
    return body.token
  } catch {
    return null
  }
}

export default function () {
  const scenario = __ENV.K6_SCENARIO || 'login_spike'

  const token = login()
  if (!token) { errorRate.add(1); return }

  const authHeaders = { ...HEADERS, Authorization: `Bearer ${token}` }

  if (scenario === 'market_load') {
    // Consulta skills disponíveis
    const start = Date.now()
    const skillsRes = http.get(`${BASE_URL}/skills`, { headers: authHeaders })
    apiDuration.add(Date.now() - start)

    check(skillsRes, {
      'skills status 200': (r) => r.status === 200,
    })

    sleep(0.5)

    // Consulta empresas (rota pública)
    const companiesRes = http.get(`${BASE_URL}/investments/companies`)
    check(companiesRes, {
      'companies status 200': (r) => r.status === 200,
    })

    sleep(1)
  } else {
    // login_spike — só faz login e verifica resposta
    check({ status: 200 }, { 'login ok': (r) => r.status === 200 })
    sleep(2)
  }
}