// k6/auth.test.js
// Testa carga no fluxo de autenticação — login e register
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const errorRate = new Rate('errors')
const loginDuration = new Trend('login_duration')

export const options = {
  stages: [
    { duration: '10s', target: 5 },   // sobe pra 5 usuários
    { duration: '20s', target: 10 },  // sobe pra 10 usuários
    { duration: '10s', target: 0 },   // desce pra 0
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],         // menos de 5% de erros
    http_req_duration: ['p(95)<2000'],      // 95% das requests < 2s
    login_duration: ['p(95)<1500'],         // login específico < 1.5s
  },
}

const BASE_URL = 'http://localhost:3001/api/v1'
const HEADERS = { 'Content-Type': 'application/json' }

export default function () {
  // Login com usuário existente
  const loginStart = Date.now()
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: 'dudu4@gmail.com', password: '123456' }),
    { headers: HEADERS }
  )
  loginDuration.add(Date.now() - loginStart)

  const loginOk = check(loginRes, {
    'login status 200': (r) => r.status === 200,
    'login retorna token': (r) => {
      try { return !!JSON.parse(r.body).token } catch { return false }
    },
  })
  errorRate.add(!loginOk)

  sleep(1)

  // Register com usuário novo (email único por VU + timestamp)
  const email = `load_test_${__VU}_${Date.now()}@test.com`
  const registerRes = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({ name: 'Load Test User', email, password: '123456' }),
    { headers: HEADERS }
  )

  const registerOk = check(registerRes, {
    'register status 201': (r) => r.status === 201,
    'register retorna token': (r) => {
      try { return !!JSON.parse(r.body).token } catch { return false }
    },
  })
  errorRate.add(!registerOk)

  sleep(1)
}