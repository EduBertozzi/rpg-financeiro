const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const prisma = require('../lib/prisma')

const generateToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' })

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Preencha todos os campos' })

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return res.status(409).json({ error: 'Email já cadastrado' })

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { name, email, passwordHash }
    })

    res.status(201).json({ token: generateToken(user), user: { id: user.id, name: user.name, role: user.role } })
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Senha incorreta' })

    res.json({ token: generateToken(user), user: { id: user.id, name: user.name, role: user.role } })
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}
// Compara o código de convite sem vazar pelo tempo de resposta. Maiúsculas e
// minúsculas não importam (o campo mostra tudo em maiúsculas).
function inviteMatches(given, expected) {
  if (typeof given !== 'string' || !expected) return false
  const a = crypto.createHash('sha256').update(given.trim().toUpperCase()).digest()
  const b = crypto.createHash('sha256').update(expected.trim().toUpperCase()).digest()
  return crypto.timingSafeEqual(a, b)
}

// Cadastro de administrador: precisa do código de convite (ADMIN_INVITE_CODE).
// Quem já tem conta de jogador vira administrador com a mesma senha.
// Sem código configurado no servidor, o cadastro de administrador fica fechado.
exports.registerAdmin = async (req, res) => {
  try {
    const expected = process.env.ADMIN_INVITE_CODE
    if (!expected) return res.status(403).json({ error: 'O cadastro de administrador está fechado' })

    const { name, email, password, inviteCode } = req.body ?? {}
    if (!email || !password || !inviteCode)
      return res.status(400).json({ error: 'Preencha todos os campos' })
    if (!inviteMatches(inviteCode, expected))
      return res.status(403).json({ error: 'Código de convite inválido' })

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) {
      const valid = await bcrypt.compare(password, exists.passwordHash)
      if (!valid) return res.status(401).json({ error: 'Esse e-mail já tem conta. Use a mesma senha dela.' })
      const user = exists.role === 'admin'
        ? exists
        : await prisma.user.update({ where: { id: exists.id }, data: { role: 'admin' } })
      return res.json({ token: generateToken(user), user: { id: user.id, name: user.name, role: user.role } })
    }

    if (!name) return res.status(400).json({ error: 'Preencha todos os campos' })
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({ data: { name, email, passwordHash, role: 'admin' } })
    res.status(201).json({ token: generateToken(user), user: { id: user.id, name: user.name, role: user.role } })
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}
