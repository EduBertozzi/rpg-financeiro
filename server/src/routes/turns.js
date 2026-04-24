const router = require('express').Router()
const auth = require('../middleware/auth')
const { nextTurn, getDilemma, chooseDilemma } = require('../controllers/turnController')

router.post('/rooms/:id/next-turn', auth, nextTurn)
router.get('/characters/:id/dilemma/:turn', auth, getDilemma)
router.post('/characters/:id/dilemma/:dilemmaId/choose', auth, chooseDilemma)

module.exports = router