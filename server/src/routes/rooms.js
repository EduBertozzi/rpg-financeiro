const router = require('express').Router()
const auth = require('../middleware/auth')
const {
  createRoom, getRoom, startRoom, getLeaderboard, getMyRooms, getRoomProgress, updateRoom, deleteRoom
} = require('../controllers/roomController')

router.post('/', auth, createRoom)
router.get('/mine', auth, getMyRooms) // antes de /:code
router.get('/:code', getRoom)
router.get('/:id/progress', auth, getRoomProgress)
router.patch('/:id', auth, updateRoom)
router.delete('/:id', auth, deleteRoom)
router.post('/:id/start', auth, startRoom)
router.get('/:id/leaderboard', auth, getLeaderboard)

module.exports = router