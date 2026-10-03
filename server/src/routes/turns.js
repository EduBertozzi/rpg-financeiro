const router = require('express').Router()
const auth = require('../middleware/auth')
const { nextTurn, getDilemma, chooseDilemma, getLeisure, chooseLeisure } = require('../controllers/turnController')

router.post('/rooms/:id/next-turn', auth, nextTurn)
router.get('/characters/:id/dilemma/:turn', auth, getDilemma)
router.post('/characters/:id/dilemma/:dilemmaId/choose', auth, chooseDilemma)
router.get('/characters/:id/leisure/:turn', auth, getLeisure)
router.post('/characters/:id/leisure/:turn/choose', auth, chooseLeisure)

module.exports = router
