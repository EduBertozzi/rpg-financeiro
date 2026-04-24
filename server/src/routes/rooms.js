const router = require('express').Router()
const auth = require('../middleware/auth')
const {
  createRoom, getRoom, startRoom, getLeaderboard
} = require('../controllers/roomController')

router.post('/', auth, createRoom)
router.get('/:code', getRoom)
router.post('/:id/start', auth, startRoom)
router.get('/:id/leaderboard', auth, getLeaderboard)

module.exports = router