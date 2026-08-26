const router = require('express').Router()
const auth = require('../middleware/auth')
const { getBills, payBill } = require('../controllers/billController')

router.get('/characters/:id/bills/:turn', auth, getBills)
router.post('/characters/:id/bills/:turn/pay', auth, payBill)

module.exports = router
