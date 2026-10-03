const router = require('express').Router()
const { register, login, registerAdmin } = require('../controllers/authController')

router.post('/register', register)
router.post('/register-admin', registerAdmin)
router.post('/login', login)

// Promover alguém a admin não é mais uma rota aberta: usar o código de
// convite (register-admin) ou `npm run make-admin -- email` no servidor.

module.exports = router
