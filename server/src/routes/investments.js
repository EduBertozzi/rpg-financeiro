const router = require('express').Router()
const auth = require('../middleware/auth')
const {
  getFixedIncome, investFixed, redeemFixed,
  getMarket, getPortfolio, trade,
  getCompanies, getDebentures, investDebenture
} = require('../controllers/investmentController')

router.get('/fixed/:id', auth, getFixedIncome)
router.post('/fixed/:id', auth, investFixed)
router.delete('/fixed/:id/:investmentId', auth, redeemFixed)

router.get('/market/:roomId', auth, getMarket)
router.get('/portfolio/:id', auth, getPortfolio)
router.post('/trade/:id', auth, trade)

router.get('/companies', getCompanies)
router.get('/debentures/:id', auth, getDebentures)
router.post('/debentures/:id', auth, investDebenture)

module.exports = router