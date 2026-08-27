import { useState, useEffect } from 'react'
import api from '../../services/api'
import useGameStore from '../../store/gameStore'
import GameLayout from '../../components/GameLayout'

const IconCpu = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="7" y="7" width="10" height="10" rx="1.5" />
    <rect x="3" y="10" width="2" height="4" rx="0.5" fill="currentColor" stroke="none" />
    <rect x="19" y="10" width="2" height="4" rx="0.5" fill="currentColor" stroke="none" />
    <rect x="10" y="3" width="4" height="2" rx="0.5" fill="currentColor" stroke="none" />
    <rect x="10" y="19" width="4" height="2" rx="0.5" fill="currentColor" stroke="none" />
    <path d="M10 10h4v4h-4z" />
  </svg>
)
const IconUsers = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
    <path d="M16 8.2a3 3 0 1 1 .5 5.9" />
    <path d="M15 14.6c2.6.4 4 2.2 4 5.4" />
  </svg>
)
const IconChart = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
)
const IconLock = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="1.5" />
    <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
  </svg>
)
const IconStar = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" {...p}>
    <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6-5.9-3.3-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8L12 2.5z" />
  </svg>
)
const IconCheck = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="m5 13 4 4L19 7" />
  </svg>
)
const IconBolt = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" {...p}>
    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
  </svg>
)

const PATH_CONFIG = {
  technical: {
    label: 'Raciocínio Lógico e Técnico',
    Icon: IconCpu,
    text: 'text-blue-300',
    ring: 'border-blue-500/40',
    line: 'from-blue-500 to-blue-400',
    unlockedBg: 'bg-blue-500/10 border-blue-400/50',
    badge: 'bg-blue-500/15 text-blue-300 border-blue-400/30',
    glow: 'rgba(59,130,246,0.35)',
  },
  communication: {
    label: 'Comunicação e Trabalho em Equipe',
    Icon: IconUsers,
    text: 'text-green-300',
    ring: 'border-green-500/40',
    line: 'from-green-500 to-green-400',
    unlockedBg: 'bg-green-500/10 border-green-400/50',
    badge: 'bg-green-500/15 text-green-300 border-green-400/30',
    glow: 'rgba(34,197,94,0.35)',
  },
  management: {
    label: 'Gestão e Visão de Negócio',
    Icon: IconChart,
    text: 'text-purple-300',
    ring: 'border-purple-500/40',
    line: 'from-purple-500 to-purple-400',
    unlockedBg: 'bg-purple-500/10 border-purple-400/50',
    badge: 'bg-purple-500/15 text-purple-300 border-purple-400/30',
    glow: 'rgba(168,85,247,0.35)',
  },
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
  const progressPct = mySkills.maxPoints ? (mySkills.usedPoints / mySkills.maxPoints) * 100 : 0

  return (
    <GameLayout>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">

          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-primary/40 bg-primary/15 shadow-[0_0_18px_var(--theme-glow)]">
              <IconBolt className="h-5 w-5 text-[var(--theme-secondary)]" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[var(--theme-muted)]">Universidade</p>
              <h2 className="mt-0.5 text-2xl font-black tracking-tight">Árvore de Habilidades</h2>
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl">
            <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span className="font-medium text-gray-400">Progresso de pontos</span>
              <span className="font-semibold tabular-nums text-[var(--theme-secondary)]">
                {mySkills.usedPoints}/{mySkills.maxPoints} usados · {remainingPoints} disponíveis
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/5" role="progressbar" aria-valuenow={mySkills.usedPoints} aria-valuemin={0} aria-valuemax={mySkills.maxPoints}>
              <div
                className="h-2 rounded-full bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] shadow-[0_0_10px_var(--theme-glow)] transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="mt-2.5 text-xs text-gray-500">Você tem {mySkills.maxPoints} pontos no total — impossível completar toda a árvore. Escolha sua estratégia!</p>
          </div>

          {message.text && (
            <div className={`mb-6 flex items-center gap-2.5 rounded-xl border p-3.5 text-sm ${message.type === 'error' ? 'border-red-500/50 bg-red-900/30 text-red-300' : 'border-green-500/50 bg-green-900/30 text-green-300'}`}>
              {message.type === 'error' ? <IconLock className="h-4 w-4 shrink-0" /> : <IconCheck className="h-4 w-4 shrink-0" />}
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {['technical', 'communication', 'management'].map((path, colIdx) => {
              const config = PATH_CONFIG[path]
              const skills = allSkills.filter(s => s.path === path).sort((a, b) => a.level - b.level)
              return (
                <div
                  key={path}
                  className={`relative overflow-hidden rounded-3xl border ${config.ring} bg-white/[0.035] p-5 backdrop-blur-xl animate-fade-in-up`}
                  style={{ animationDelay: `${colIdx * 0.08}s` }}
                >
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-40"
                    style={{ background: `radial-gradient(circle at 50% 0%, ${config.glow}, transparent 70%)` }}
                  />

                  <div className="relative mb-6 flex flex-col items-center gap-2 text-center">
                    <div className={`grid h-12 w-12 place-items-center rounded-2xl border ${config.ring} bg-black/20`}>
                      <config.Icon className={`h-6 w-6 ${config.text}`} />
                    </div>
                    <h3 className="text-sm font-bold leading-snug text-white">{config.label}</h3>
                  </div>

                  <div className="relative flex flex-col items-stretch">
                    {skills.map((skill, idx) => {
                      const unlocked = isUnlocked(skill.id)
                      const canDo = canUnlock(skill)
                      const cost = character?.gift === 'smart' ? Math.ceil(skill.costPoints * 0.8) : skill.costPoints
                      return (
                        <div key={skill.id}>
                          {idx > 0 && (
                            <div className="flex justify-center">
                              <div className={`h-5 w-0.5 ${unlocked ? `bg-gradient-to-b ${config.line}` : 'bg-white/10'}`} />
                            </div>
                          )}
                          <div
                            className={`rounded-2xl border p-3.5 transition-all duration-200 ${unlocked
                                ? config.unlockedBg
                                : canDo
                                  ? 'border-white/20 bg-white/[0.04] hover:-translate-y-0.5 hover:border-white/40'
                                  : 'border-white/5 bg-white/[0.02] opacity-55'
                              }`}
                          >
                            <div className="mb-1.5 flex items-start justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${unlocked ? `${config.badge} border-transparent` : 'border-white/15 text-gray-500'}`}>
                                  {unlocked ? <IconStar className="h-3 w-3" /> : !canDo ? <IconLock className="h-3 w-3" /> : <span className="text-[10px] font-bold">{skill.level}</span>}
                                </span>
                                <span className="text-xs font-semibold text-white">Nível {skill.level}</span>
                              </div>
                              <span className={`rounded-full border px-1.5 py-0.5 text-[11px] font-medium ${config.badge}`}>{cost} pt{cost > 1 ? 's' : ''}</span>
                            </div>
                            <p className="mb-1 text-xs font-semibold text-white">{skill.name}</p>
                            <p className="text-xs leading-relaxed text-gray-400">{skill.description}</p>
                            {canDo && !unlocked && (
                              <button
                                type="button"
                                onClick={() => handleUnlock(skill.id)}
                                disabled={loading}
                                className="mt-3 w-full cursor-pointer rounded-xl bg-primary py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Desbloquear ({cost} pt{cost > 1 ? 's' : ''})
                              </button>
                            )}
                            {unlocked && (
                              <div className={`mt-3 flex items-center justify-center gap-1 text-xs font-semibold ${config.text}`}>
                                <IconCheck className="h-3.5 w-3.5" /> Desbloqueado
                              </div>
                            )}
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
    </GameLayout>
  )
}
