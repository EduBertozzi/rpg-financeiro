import { useEffect, useMemo, useState } from 'react'
import api from '../../services/api'
import useGameStore from '../../store/gameStore'
import GameLayout from '../../components/GameLayout'
import StarSky from './StarSky'
import { getAvatarById } from '../../data/avatarTheme'
import { CORE, PATHS, PATH_ORDER, SPOTS, STATUS_TEXT, perkOf, skillCost, skillStatus } from './skillData'
import './cruzeiro.css'

const PANEL = 'rounded-3xl border border-white/10 bg-[rgba(14,28,47,0.78)] shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-md'

// A entrada completa toca uma vez por sessão; depois a constelação só aparece.
const readIntro = () => {
  try {
    if (sessionStorage.getItem('cruzeiro:intro')) return false
    sessionStorage.setItem('cruzeiro:intro', '1')
  } catch { /* sem storage: toca sempre */ }
  return true
}

export default function SkillTree() {
  const { character } = useGameStore()
  const [skills, setSkills] = useState([])
  const [mine, setMine] = useState({ totalPoints: 0, usedPoints: 0, maxPoints: 8, unlocked: [] })
  const [selected, setSelected] = useState(null)
  const [justUnlocked, setJustUnlocked] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [intro, setIntro] = useState(readIntro)
  const [introKey, setIntroKey] = useState(0)

  useEffect(() => {
    api.get('/skills').then(({ data }) => setSkills(data)).catch(console.error)
  }, [])

  useEffect(() => {
    if (!character?.id) return
    api.get(`/skills/character/${character.id}`).then(({ data }) => setMine(data)).catch(console.error)
  }, [character?.id])

  const unlockedIds = useMemo(() => mine.unlocked.map((s) => s.id), [mine.unlocked])
  const ctx = { skills, unlockedIds, totalPoints: mine.totalPoints, usedPoints: mine.usedPoints, maxPoints: mine.maxPoints, gift: character?.gift }
  const statusOf = (s) => skillStatus(s, ctx)

  // começa mostrando a primeira habilidade que dá para desbloquear
  const current = skills.find((s) => s.id === selected)
    ?? skills.find((s) => statusOf(s) === 'ready')
    ?? skills[0]

  const free = mine.totalPoints - mine.usedPoints

  const unlock = async () => {
    if (!current || statusOf(current) !== 'ready') return
    setBusy(true)
    setError('')
    try {
      await api.post(`/skills/character/${character.id}/unlock/${current.id}`)
      const { data } = await api.get(`/skills/character/${character.id}`)
      setSelected(current.id)
      setJustUnlocked(current.id)
      setIntro(false)
      setMine(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Não deu para desbloquear agora.')
    } finally {
      setBusy(false)
    }
  }

  const replay = () => {
    setJustUnlocked(null)
    setIntro(true)
    setIntroKey((k) => k + 1)
  }

  return (
    <GameLayout>
      <div className="fixed inset-y-0 left-20 right-0 z-0 overflow-hidden bg-[#040914] text-white">
        <StarSky />

        <div className="relative z-10 flex h-full flex-col gap-4 overflow-y-auto p-4 sm:p-6 lg:flex-row lg:overflow-hidden">
          {/* céu com a constelação */}
          <section className="relative flex min-h-[420px] min-w-0 flex-1 flex-col" aria-label="Constelação Cruzeiro">
            <div className="pointer-events-none flex flex-wrap items-start justify-between gap-3">
              <div key={`brand-${introKey}`} className={`cz-brand ${intro ? 'cz-intro-brand' : ''}`}>
                <h1 className="font-['Cinzel',Georgia,serif] text-[clamp(26px,4vw,46px)] font-extrabold tracking-[0.32em] text-[#F6E7C1] [text-shadow:0_0_24px_rgba(255,200,87,0.45)]">
                  CRUZEIRO
                </h1>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.3em] text-[#8EA0B8]">Constelação de habilidades</p>
              </div>
              <Points free={free} used={mine.usedPoints} max={mine.maxPoints} />
            </div>

            <Constellation
              key={introKey}
              skills={skills}
              statusOf={statusOf}
              unlockedIds={unlockedIds}
              selectedId={current?.id}
              justUnlocked={justUnlocked}
              intro={intro}
              avatar={getAvatarById(character?.avatarId ?? 1)?.image}
              onPick={(id) => { setSelected(id); setJustUnlocked(null); setError('') }}
            />

            <button
              type="button"
              onClick={replay}
              className="self-start rounded-xl border border-white/10 bg-[rgba(5,11,22,0.55)] px-3 py-2 text-xs font-bold text-[#8EA0B8] backdrop-blur hover:text-white cursor-pointer"
            >
              ↻ Ver a entrada de novo
            </button>
          </section>

          {current && (
            <Detail
              skill={current}
              status={statusOf(current)}
              cost={skillCost(current)}
              unlocked={skills.filter((s) => unlockedIds.includes(s.id))}
              tips={mine.tips}
              busy={busy}
              error={error}
              onUnlock={unlock}
            />
          )}
        </div>
      </div>
    </GameLayout>
  )
}

function Points({ free, used, max }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[rgba(5,11,22,0.55)] px-4 py-2.5 backdrop-blur">
      <b className="text-lg tabular-nums text-[#FFC857]">{free}</b>
      <span className="text-xs font-bold text-[#8EA0B8]">{free === 1 ? 'ponto' : 'pontos'}</span>
      <div className="flex gap-1" aria-label={`${used} de ${max} pontos usados`}>
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 w-3.5 rounded-full transition-colors ${i < used ? 'bg-[#FFC857] shadow-[0_0_8px_rgba(255,200,87,0.6)]' : i < used + free ? 'bg-[#FFC857]/25 ring-1 ring-inset ring-[#FFC857]' : 'bg-white/10'}`}
          />
        ))}
      </div>
    </div>
  )
}

// Estrela de 4 pontas centrada em (x, y).
const starPath = (x, y, R) => {
  const r = R * 0.3
  return Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4 - Math.PI / 2
    const d = i % 2 ? r : R
    return `${i ? 'L' : 'M'}${(x + Math.cos(a) * d).toFixed(1)} ${(y + Math.sin(a) * d).toFixed(1)}`
  }).join(' ') + 'Z'
}

// Nomes longos quebram em duas linhas, no espaço mais perto do meio.
const splitName = (name) => {
  if (name.length <= 22) return [name]
  const mid = name.length / 2
  const spaces = [...name.matchAll(/ /g)].map((m) => m.index)
  const cut = spaces.reduce((best, i) => (Math.abs(i - mid) < Math.abs(best - mid) ? i : best), spaces[0])
  return [name.slice(0, cut), name.slice(cut + 1)]
}

// Nome ao lado da estrela, longe da linha que desce para o centro.
const labelPos = (path, x, y, R) => {
  if (path === 'technical') return { x: x - 8, y: y + R + 16, anchor: 'end' }
  if (path === 'management') return { x: x + 8, y: y + R + 16, anchor: 'start' }
  return { x: x + R + 12, y: y + 5, anchor: 'start' }
}

function Constellation({ skills, statusOf, unlockedIds, selectedId, justUnlocked, intro, avatar, onPick }) {
  if (!skills.length) return <div className="flex-1" />
  const [cx, cy] = CORE
  const isOn = (s) => unlockedIds.includes(s.id)
  const fresh = skills.find((s) => s.id === justUnlocked)

  return (
    <svg
      viewBox="0 130 1000 640"
      preserveAspectRatio="xMidYMid meet"
      className={`min-h-0 w-full flex-1 ${intro ? 'cz-intro' : 'cz-quick'}`}
      role="group"
      aria-label="Habilidades por caminho"
    >
      <defs>
        <radialGradient id="cz-gcore"><stop offset="0" stopColor="#FFF4D6" /><stop offset=".55" stopColor="#FFC857" /><stop offset="1" stopColor="#E08A00" /></radialGradient>
        {PATH_ORDER.map((p) => (
          <g key={p}>
            <radialGradient id={`cz-g-${p}`}><stop offset="0" stopColor="#fff" /><stop offset=".45" stopColor="#fff" /><stop offset="1" stopColor={PATHS[p].hex} /></radialGradient>
            <radialGradient id={`cz-glow-${p}`}><stop offset="0" stopColor={PATHS[p].hex} stopOpacity=".6" /><stop offset="1" stopColor={PATHS[p].hex} stopOpacity="0" /></radialGradient>
          </g>
        ))}
        <clipPath id="cz-avatar-clip"><circle cx={cx} cy={cy} r="35" /></clipPath>
        <filter id="cz-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" /></filter>
      </defs>

      {/* linhas */}
      {PATH_ORDER.map((path, pi) => {
        const list = skills.filter((s) => s.path === path).sort((a, b) => a.level - b.level)
        return list.map((s, li) => {
          const from = li === 0 ? CORE : SPOTS[path][li - 1]
          const [x, y] = SPOTS[path][s.level - 1] ?? CORE
          const len = Math.ceil(Math.hypot(x - from[0], y - from[1]))
          const style = { '--len': len, '--d': `${(0.9 + li * 0.32 + pi * 0.08).toFixed(2)}s` }
          const on = isOn(s)
          const hex = PATHS[path].hex
          return (
            <g key={`l-${s.id}`}>
              <line
                className={`cz-ln ${s.id === justUnlocked ? 'cz-drawnow' : ''}`}
                style={style}
                x1={from[0]} y1={from[1]} x2={x} y2={y}
                stroke={on ? hex : 'rgba(200,215,240,.16)'}
                strokeWidth={on ? 2.6 : 1.2}
                strokeDasharray={on ? undefined : '2 8'}
                strokeLinecap="round"
                filter={on ? 'url(#cz-soft)' : undefined}
              />
              {on && (
                <>
                  <line className="cz-ln" style={style} x1={from[0]} y1={from[1]} x2={x} y2={y} stroke={hex} strokeWidth="1.4" strokeLinecap="round" />
                  <line className="cz-flow" x1={from[0]} y1={from[1]} x2={x} y2={y} stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".8" />
                </>
              )}
            </g>
          )
        })
      })}

      {/* você, no centro */}
      <circle className="cz-shock" cx={cx} cy={cy} r="30" fill="none" stroke="#FFC857" strokeWidth="2" />
      <g className="cz-vc">
        <circle cx={cx} cy={cy} r="74" fill="url(#cz-glow-technical)" opacity=".0" />
        <circle cx={cx} cy={cy} r="64" fill="#FFC857" opacity=".1" />
        <circle className="cz-orbit" cx={cx} cy={cy} r="52" fill="none" stroke="#FFC857" strokeOpacity=".55" strokeWidth="1.5" strokeDasharray="2 9" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="40" fill="url(#cz-gcore)" />
        <circle cx={cx} cy={cy} r="35" fill="#1B2B47" />
        {avatar && <image href={avatar} x={cx - 44} y={cy - 40} width="88" height="88" clipPath="url(#cz-avatar-clip)" preserveAspectRatio="xMidYMin slice" />}
        <circle cx={cx} cy={cy} r="35" fill="none" stroke="#FFF4D6" strokeWidth="2" />
      </g>

      {/* estrelas */}
      {PATH_ORDER.map((path, pi) =>
        skills.filter((s) => s.path === path).map((s) => {
          const [x, y] = SPOTS[path][s.level - 1] ?? CORE
          const li = s.level - 1
          const st = statusOf(s)
          const on = st === 'on'
          const sel = s.id === selectedId
          const hex = PATHS[path].hex
          const R = (on ? 17 : st === 'locked' ? 9 : 14) + s.level * 2
          const d = { '--d': `${(1.15 + li * 0.32 + pi * 0.08).toFixed(2)}s` }
          const lp = labelPos(path, x, y, Math.max(R * 0.6, 12))
          const pick = () => onPick(s.id)
          return (
            <g
              key={s.id}
              className={`cz-node ${s.id === justUnlocked ? 'cz-just' : ''}`}
              tabIndex={0}
              role="button"
              aria-pressed={sel}
              aria-label={`${s.name}: ${perkOf(s).perk}. ${STATUS_TEXT[st]}`}
              onClick={pick}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick() } }}
            >
              <g className="cz-nd" style={d}>
                <circle cx={x} cy={y} r={R + 12} fill="transparent" />
                {on && <circle className="cz-halo" cx={x} cy={y} r={R * 2.4} fill={`url(#cz-glow-${path})`} />}
                {st === 'ready' && <circle className="cz-ready" cx={x} cy={y} r={R * 0.75} fill="none" stroke="#FFC857" strokeWidth="2" />}
                {sel && <circle className="cz-orbit" cx={x} cy={y} r={R + 8} fill="none" stroke="#FFC857" strokeWidth="1.6" strokeDasharray="3 5" />}
                <circle className="cz-focus" cx={x} cy={y} r={R + 13} fill="none" stroke="#FFC857" strokeWidth="2" strokeDasharray="4 4" />
                <g className="cz-core">
                  {on && (
                    <g stroke={hex} strokeLinecap="round" opacity=".7">
                      <line x1={x - R * 2} y1={y} x2={x + R * 2} y2={y} strokeWidth="1" />
                      <line x1={x} y1={y - R * 2} x2={x} y2={y + R * 2} strokeWidth="1" />
                    </g>
                  )}
                  <path
                    d={starPath(x, y, R)}
                    fill={on ? `url(#cz-g-${path})` : st === 'locked' ? 'rgba(200,215,240,.32)' : st === 'ready' ? hex : 'rgba(9,18,34,.9)'}
                    stroke={on ? '#fff' : st === 'locked' ? 'none' : hex}
                    strokeWidth={on ? 1 : 1.6}
                    strokeLinejoin="round"
                  />
                  {on && <circle cx={x} cy={y} r={R * 0.22} fill="#fff" />}
                </g>
              </g>
              <text className="cz-lbl" style={d} x={lp.x} y={lp.y} textAnchor={lp.anchor} fontSize="13" fontWeight={on || sel ? 700 : 500} fill={on ? '#fff' : sel ? '#F6E7C1' : st === 'locked' ? '#6E7F96' : '#A9B8CC'}>
                {splitName(s.name).map((line, i) => <tspan key={i} x={lp.x} dy={i ? 15 : 0}>{line}</tspan>)}
              </text>
            </g>
          )
        })
      )}

      {/* nome de cada caminho */}
      {PATH_ORDER.map((path, pi) => {
        const [lx, ly] = SPOTS[path][3]
        const d = { '--d': `${(2 + pi * 0.1).toFixed(2)}s` }
        return (
          <g key={`t-${path}`}>
            <text className="cz-lbl" style={d} x={lx} y={ly - 50} textAnchor="middle" fontSize="12" fontWeight="800" letterSpacing="3" fill={PATHS[path].hex}>{PATHS[path].short.toUpperCase()}</text>
            <text className="cz-lbl" style={d} x={lx} y={ly - 34} textAnchor="middle" fontSize="11" fill="#8EA0B8">{PATHS[path].theme}</text>
          </g>
        )
      })}

      {/* explosão ao desbloquear */}
      {fresh && (() => {
        const [x, y] = SPOTS[fresh.path][fresh.level - 1]
        const hex = PATHS[fresh.path].hex
        return (
          <g className="cz-burst" key={`b-${fresh.id}`}>
            {Array.from({ length: 18 }, (_, i) => {
              const a = (i / 18) * 6.283
              const dist = 40 + (i % 3) * 18
              return <circle key={i} cx={x} cy={y} r={2 + (i % 2)} fill={i % 3 ? hex : '#FFC857'} style={{ '--dx': `${(Math.cos(a) * dist).toFixed(1)}px`, '--dy': `${(Math.sin(a) * dist).toFixed(1)}px` }} />
            })}
          </g>
        )
      })()}
    </svg>
  )
}

function Detail({ skill, status, cost, unlocked, tips, busy, error, onUnlock }) {
  const path = PATHS[skill.path]
  const perk = perkOf(skill)
  return (
    <aside className={`${PANEL} grid shrink-0 content-start gap-3 p-5 lg:w-[340px] lg:overflow-y-auto`} aria-live="polite">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.2em]" style={{ color: path?.hex }}>
        {path?.short} · nível {skill.level} · {cost} {cost > 1 ? 'pontos' : 'ponto'}
      </p>
      <h2 className="text-2xl font-extrabold [text-wrap:balance]">{skill.name}</h2>
      <p className="leading-relaxed text-[#8EA0B8]">{perk.desc}</p>
      <div className="rounded-2xl border border-[#FFC857]/30 bg-[#FFC857]/[0.07] px-4 py-3">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#FFC857]">Vantagem</p>
        <p className="mt-1 text-[17px] font-bold">{perk.perk}</p>
        {perk.note && <p className="mt-1 text-[13px] text-[#8EA0B8]">{perk.note}</p>}
      </div>
      <p className="text-[13px] font-bold" style={{ color: status === 'on' ? path?.hex : status === 'ready' ? '#FFC857' : '#8EA0B8' }}>
        {STATUS_TEXT[status]}
      </p>
      {error && <p className="rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>}
      <button
        type="button"
        onClick={onUnlock}
        disabled={status !== 'ready' || busy}
        className="rounded-2xl bg-gradient-to-b from-[#FFD777] to-[#F2B53A] px-4 py-3.5 font-extrabold text-[#2A1C00] shadow-[0_6px_24px_rgba(255,200,87,0.25)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:bg-none disabled:bg-white/[0.07] disabled:text-[#8EA0B8] disabled:shadow-none cursor-pointer"
      >
        {status === 'on' ? 'Desbloqueada' : busy ? 'Desbloqueando…' : `Desbloquear por ${cost} ${cost > 1 ? 'pontos' : 'ponto'}`}
      </button>

      {Array.isArray(tips) && tips.length > 0 && (
        <div className="rounded-2xl border border-[#B884FF]/30 bg-[#B884FF]/[0.08] px-4 py-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#B884FF]">Dica do jornal</p>
          <ul className="mt-1 grid gap-1 text-sm">
            {tips.map((t, i) => <li key={t.ticker ?? i}>{t.text ?? `${t.ticker}: ${t.direction === 'down' ? 'deve cair' : 'deve subir'} no mês que vem`}</li>)}
          </ul>
        </div>
      )}

      <div>
        <p className="mb-2 mt-2 text-[11px] font-extrabold uppercase tracking-[0.24em] text-[#8EA0B8]">Suas vantagens ativas</p>
        <ul className="grid gap-1.5 text-[13px]">
          {unlocked.length ? unlocked.map((s) => (
            <li key={s.id} className="flex items-baseline gap-2">
              <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: PATHS[s.path]?.hex }} />
              {perkOf(s).perk}
            </li>
          )) : <li className="text-[#8EA0B8]">Nenhuma ainda. Ganhe pontos respondendo o Lazer de cada mês.</li>}
        </ul>
      </div>
    </aside>
  )
}
