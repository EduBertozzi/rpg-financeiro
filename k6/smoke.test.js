// k6/smoke.test.js
// Smoke test — verifica se a API tá de pé com 1 usuário
// Rode isso primeiro antes dos testes de carga completos
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  vus: 1,
  duration: '10s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
  },
}

const BASE_URL = 'http://localhost:3001/api/v1'
const HEADERS = { 'Content-Type': 'application/json' }

export default function () {
  // Health check
  const rootRes = http.get('http://localhost:3001/')
  check(rootRes, { 'API rodando': (r) => r.status === 200 })

  sleep(0.5)

  // Login
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: 'dudu4@gmail.com', password: '123456' }),
    { headers: HEADERS }
  )
  const token = JSON.parse(loginRes.body).token

  check(loginRes, {
    'login ok': (r) => r.status === 200,
    'tem token': () => !!token,
  })

  sleep(0.5)

  // Skills (autenticado)
  const skillsRes = http.get(`${BASE_URL}/skills`, {
    headers: { ...HEADERS, Authorization: `Bearer ${token}` }
  })
  check(skillsRes, { 'skills ok': (r) => r.status === 200 })

  // Empresas (público)
  const companiesRes = http.get(`${BASE_URL}/investments/companies`)
  check(companiesRes, { 'companies ok': (r) => r.status === 200 })

  sleep(1)
}