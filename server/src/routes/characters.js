const router = require('express').Router()
const auth = require('../middleware/auth')
const { createCharacter, getCharacter, setReady, getMyCharacter, getTurnSummary } = require('../controllers/characterController')
const { getCoupon, claimCoupon } = require('../controllers/couponController')
const { getYearSummary } = require('../controllers/summaryController')

router.get('/me', auth, getMyCharacter)
router.post('/', auth, createCharacter)
router.get('/:id', auth, getCharacter)
router.patch('/:id/ready', auth, setReady)
router.get('/:id/coupon/:turn', auth, getCoupon)
router.post('/:id/coupon/:turn/claim', auth, claimCoupon)
router.get('/:id/year-summary', auth, getYearSummary)
router.get('/:id/turn-summary/:turn', auth, getTurnSummary)

module.exports = router