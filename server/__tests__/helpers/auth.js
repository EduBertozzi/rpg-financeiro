// __tests__/helpers/auth.js
const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret'

function makeToken(payload = {}) {
  return jwt.sign(
    { id: 'user-1', role: 'player', ...payload },
    JWT_SECRET,
    { expiresIn: '1h' }
  )
}

function makeAdminToken(overrides = {}) {
  return makeToken({ id: 'admin-1', role: 'admin', ...overrides })
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` }
}

module.exports = { makeToken, makeAdminToken, authHeader }