const prisma = require('../lib/prisma')

exports.getAllSkills = async (req, res) => {
  try {
    const skills = await prisma.skillNode.findMany({
      orderBy: [{ path: 'asc' }, { level: 'asc' }]
    })
    res.json(skills)
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

exports.getCharacterSkills = async (req, res) => {
  try {
    const character = await prisma.character.findUnique({
      where: { id: req.params.id },
      include: {
        skillPoints: true,
        unlockedSkills: { include: { skillNode: true } }
      }
    })

    if (!character) return res.status(404).json({ error: 'Personagem não encontrado' })
    if (character.userId !== req.user.id) return res.status(403).json({ error: 'Sem permissão' })

    res.json({
      totalPoints: character.skillPoints?.totalPoints ?? 0,
      usedPoints:  character.skillPoints?.usedPoints  ?? 0,
      maxPoints:   character.skillPoints?.maxPoints   ?? 8,
      unlocked: character.unlockedSkills.map(s => ({
        id: s.skillNodeId,
        path: s.skillNode.path,
        level: s.skillNode.level,
        name: s.skillNode.name,
        unlockedAt: s.unlockedAt
      }))
    })
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}

exports.unlockSkill = async (req, res) => {
  try {
    const { id: characterId, skillId } = req.params

    const character = await prisma.character.findUnique({
      where: { id: characterId },
      include: {
        skillPoints: true,
        unlockedSkills: true,
        room: true
      }
    })

    if (!character) return res.status(404).json({ error: 'Personagem não encontrado' })
    if (character.userId !== req.user.id) return res.status(403).json({ error: 'Sem permissão' })

    const skill = await prisma.skillNode.findUnique({ where: { id: parseInt(skillId) } })
    if (!skill) return res.status(404).json({ error: 'Habilidade não encontrada' })

    // verifica se já desbloqueou
    const alreadyUnlocked = character.unlockedSkills.some(s => s.skillNodeId === skill.id)
    if (alreadyUnlocked) return res.status(400).json({ error: 'Habilidade já desbloqueada' })

    // verifica pré-requisito (nível anterior do mesmo caminho)
    if (skill.level > 1) {
      const prereq = character.unlockedSkills.some(s => {
        return s.skillNodeId !== skill.id
      })
      const prevSkill = await prisma.skillNode.findUnique({
        where: { path_level: { path: skill.path, level: skill.level - 1 } }
      })
      const hasPrereq = character.unlockedSkills.some(s => s.skillNodeId === prevSkill?.id)
      if (!hasPrereq) return res.status(400).json({ error: 'Pré-requisito não atendido' })
    }

    // calcula custo (smart tem 20% de desconto)
    let cost = skill.costPoints
    if (character.gift === 'smart') cost = Math.ceil(cost * 0.8)

    const points = character.skillPoints
    if (!points) return res.status(400).json({ error: 'Pontos não inicializados' })
    if ((points.usedPoints + cost) > points.totalPoints)
      return res.status(400).json({ error: 'Pontos insuficientes' })
    if ((points.usedPoints + cost) > points.maxPoints)
      return res.status(400).json({ error: 'Limite de pontos atingido' })

    // desbloqueia
    await prisma.characterSkill.create({
      data: { characterId, skillNodeId: skill.id, unlockedAt: character.room.currentTurn }
    })

    await prisma.characterSkillPoints.update({
      where: { characterId },
      data: { usedPoints: { increment: cost } }
    })

    res.json({ unlockedSkill: skill.id, remainingPoints: points.totalPoints - points.usedPoints - cost })
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}