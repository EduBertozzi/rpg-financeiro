const router = require('express').Router()
const auth = require('../middleware/auth')
const { getAllSkills, getCharacterSkills, unlockSkill } = require('../controllers/skillController')

router.get('/', getAllSkills)
router.get('/character/:id', auth, getCharacterSkills)
router.post('/character/:id/unlock/:skillId', auth, unlockSkill)

module.exports = router