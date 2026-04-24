const router = require('express').Router()
const auth = require('../middleware/auth')
const { createCharacter, getCharacter, setReady, getMyCharacter } = require('../controllers/characterController')

router.get('/me', auth, getMyCharacter)
router.post('/', auth, createCharacter)
router.get('/:id', auth, getCharacter)
router.patch('/:id/ready', auth, setReady)

module.exports = router