const router = require('express').Router()
const auth = require('../middleware/auth')
const requireAdmin = require('../middleware/requireAdmin')
const {
  createRoom, getRoom, startRoom, getLeaderboard, getMyRooms, getRoomProgress, updateRoom, deleteRoom, resetPlayerPassword, exportRoom, getStanding
} = require('../controllers/roomController')

router.post('/', auth, requireAdmin, createRoom)
router.get('/mine', auth, requireAdmin, getMyRooms) // antes de /:code
router.get('/:code', getRoom)
router.get('/:id/progress', auth, getRoomProgress)
router.get('/:id/export', auth, exportRoom)
router.patch('/:id', auth, updateRoom)
router.delete('/:id', auth, deleteRoom)
router.post('/:id/players/:characterId/reset-password', auth, resetPlayerPassword)
router.post('/:id/start', auth, startRoom)
router.get('/:id/leaderboard', auth, getLeaderboard)
router.get('/:id/standing', auth, getStanding)

module.exports = router