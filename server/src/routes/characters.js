const router = require('express').Router()
const auth = require('../middleware/auth')
const { createCharacter, getCharacter, setReady } = require('../controllers/characterController')

router.post('/', auth, createCharacter)
router.get('/:id', auth, getCharacter)
router.patch('/:id/ready', auth, setReady)

module.exports = router