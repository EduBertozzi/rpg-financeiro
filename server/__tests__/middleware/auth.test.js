// __tests__/middleware/auth.test.js

// Garante que o mesmo JWT_SECRET é usado pelo helper e pelo middleware
process.env.JWT_SECRET = 'test-secret'

const jwt = require('jsonwebtoken')
const { makeToken, makeAdminToken } = require('../helpers/auth')
const authMiddleware = require('../../src/middleware/auth')

function mockReqRes(token) {
  const req = {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    user: null,
  }
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  }
  const next = jest.fn()
  return { req, res, next }
}

describe('middleware auth', () => {
  it('chama next() com token válido e popula req.user', () => {
    const token = makeToken({ id: 'user-1', role: 'player' })
    const { req, res, next } = mockReqRes(token)

    authMiddleware(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(req.user).toMatchObject({ id: 'user-1', role: 'player' })
  })

  it('retorna 401 sem Authorization header', () => {
    const { req, res, next } = mockReqRes(null)

    authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('retorna 401 com token malformado', () => {
    const { req, res, next } = mockReqRes('token-invalido-aqui')

    authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('retorna 401 com token expirado', () => {
    const expired = jwt.sign(
      { id: 'user-1' },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    )
    const { req, res, next } = mockReqRes(expired)

    authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('popula role admin corretamente', () => {
    const token = makeAdminToken()
    const { req, res, next } = mockReqRes(token)

    authMiddleware(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(req.user.role).toBe('admin')
  })
})