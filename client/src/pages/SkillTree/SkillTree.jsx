import { useState, useEffect } from 'react'
import api from '../../services/api'
import useGameStore from '../../store/gameStore'
import GameHeader from '../../components/GameHeader'

const PATH_CONFIG = {
  technical:     { label: 'Raciocínio Lógico e Técnico',       icon: '⚙️', color: 'border-blue-500',   bg: 'bg-blue-900/20',   badge: 'bg-blue-900/40 text-blue-400 border-blue-700' },
  communication: { label: 'Comunicação e Trabalho em Equipe',   icon: '🤝', color: 'border-green-500',  bg: 'bg-green-900/20',  badge: 'bg-green-900/40 text-green-400 border-green-700' },
  management:    { label: 'Gestão e Visão de Negócio',          icon: '📊', color: 'border-purple-500', bg: 'bg-purple-900/20', badge: 'bg-purple-900/40 text-purple-400 border-purple-700' },
}

export default function SkillTree() {
  const { character } = useGameStore()
  const [allSkills, setAllSkills] = useState([])
  const [mySkills, setMySkills] = useState({ totalPoints: 0, usedPoints: 0, maxPoints: 8, unlocked: [] })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  useEffect(() => {
    api.get('/skills').then(({ data }) => setAllSkills(data)).catch(console.error)
  }, [])

  useEffect(() => {
    if (!character?.id) return
    api.get(`/skills/character/${character.id}`).then(({ data }) => setMySkills(data)).catch(console.error)
  }, [character?.id])

  const isUnlocked = (skillId) => mySkills.unlocked.some(s => s.id === skillId)

  const canUnlock = (skill) => {
    if (isUnlocked(skill.id)) return false
    if (mySkills.usedPoints >= mySkills.maxPoints) return false
    const available = mySkills.totalPoints - mySkills.usedPoints
    const cost = character?.gift === 'smart' ? Math.ceil(skill.costPoints * 0.8) : skill.costPoints
    if (available < cost) return false
    if (skill.level === 1) return true
    const prevSkill = allSkills.find(s => s.path === skill.path && s.level === skill.level - 1)
    return prevSkill ? isUnlocked(prevSkill.id) : false
  }

  const handleUnlock = async (skillId) => {
    setLoading(true)
    setMessage({ text: '', type: '' })
    try {
      await api.post(`/skills/character/${character.id}/unlock/${skillId}`)
      const { data } = await api.get(`/skills/character/${character.id}`)
      setMySkills(data)
      setMessage({ text: 'Habilidade desbloqueada!', type: 'success' })
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Erro ao desbloquear', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const remainingPoints = mySkills.totalPoints - mySkills.usedPoints

  return (
    <div className="min-h-screen bg-darker text-white">
      <GameHeader />

      <div className="max-w-6xl mx-auto p-8 space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🎓</span>
          <div>
            <h1 className="text-xl font-bold">Universidade</h1>
            <p className="text-xs text-gray-400">Árvore de Habilidades</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Progresso de pontos</span>
            <span className="text-yellow-400">{mySkills.usedPoints}/{mySkills.maxPoints} pontos usados · {remainingPoints} disponíveis</span>
          </div>
          <div className="w-full bg-dark rounded-full h-2">
            <div className="bg-yellow-500 h-2 rounded-full transition-all" style={{ width: `${(mySkills.usedPoints / mySkills.maxPoints) * 100}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-2">Você tem {mySkills.maxPoints} pontos no total — impossível completar toda a árvore. Escolha sua estratégia!</p>
        </div>

        {message.text && (
          <div className={`p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-900/30 border border-red-500/50 text-red-400' : 'bg-green-900/30 border border-green-500/50 text-green-400'}`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          {['technical', 'communication', 'management'].map(path => {
            const config = PATH_CONFIG[path]
            const skills = allSkills.filter(s => s.path === path).sort((a, b) => a.level - b.level)
            return (
              <div key={path} className={`bg-card border ${config.color} rounded-xl p-5`}>
                <div className="text-center mb-5">
                  <div className="text-3xl mb-2">{config.icon}</div>
                  <h3 className="text-white font-semibold text-sm">{config.label}</h3>
                </div>
                <div className="space-y-3">
                  {skills.map((skill, idx) => {
                    const unlocked = isUnlocked(skill.id)
                    const canDo = canUnlock(skill)
                    const cost = character?.gift === 'smart' ? Math.ceil(skill.costPoints * 0.8) : skill.costPoints
                    return (
                      <div key={skill.id}>
                        {idx > 0 && (
                          <div className="flex justify-center my-1">
                            <div className={`w-0.5 h-4 ${unlocked ? 'bg-yellow-500' : 'bg-gray-700'}`} />
                          </div>
                        )}
                        <div className={`rounded-lg p-3 border transition-all ${unlocked ? `${config.bg} ${config.color}` : canDo ? 'bg-dark border-gray-500 hover:border-gray-300' : 'bg-dark border-gray-700 opacity-50'}`}>
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-1">
                              {unlocked && <span className="text-yellow-400 text-xs">★</span>}
                              <span className="text-white text-xs font-semibold">Nível {skill.level}</span>
                            </div>
                            <span className={`text-xs px-1.5 py-0.5 rounded border ${config.badge}`}>{cost} pt{cost > 1 ? 's' : ''}</span>
                          </div>
                          <p className="text-white text-xs font-medium mb-1">{skill.name}</p>
                          <p className="text-gray-400 text-xs leading-relaxed">{skill.description}</p>
                          {canDo && !unlocked && (
                            <button onClick={() => handleUnlock(skill.id)} disabled={loading} className="mt-2 w-full py-1 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white text-xs font-medium rounded transition-colors">
                              Desbloquear ({cost} pt{cost > 1 ? 's' : ''})
                            </button>
                          )}
                          {unlocked && <div className="mt-2 text-center text-xs text-yellow-400">✓ Desbloqueado</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}