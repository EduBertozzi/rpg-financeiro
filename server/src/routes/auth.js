const router = require('express').Router()
const { register, login } = require('../controllers/authController')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

router.post('/register', register)
router.post('/login', login)

// rota temporaria para promover admin
router.patch('/make-admin/:email', async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { email: req.params.email },
      data: { role: 'admin' }
    })
    res.json({ message: 'Role atualizado!', role: user.role })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router