import { useEffect, useMemo, useState } from 'react'
import api from '../../services/api'
import useGameStore from '../../store/gameStore'
import GameLayout from '../../components/GameLayout'
import TreeSky from './TreeSky'
import { getAvatarById } from '../../data/avatarTheme'
import { CORE, PATHS, PATH_ORDER, SPOTS, STATUS_TEXT, perkOf, skillCost, skillStatus } from './skillData'
import './cruzeiro.css'

const PANEL = 'rounded-[28px] bg-[#FFFDF7]/95 text-[#24331F] shadow-[0_10px_0_#E2D6BE,0_24px_50px_rgba(36,51,31,0.2)] backdrop-blur'

// A entrada completa toca uma vez por sessão; depois a árvore só aparece.
const readIntro = () => {
  try {
    if (sessionStorage.getItem('cruzeiro:intro')) return false
    sessionStorage.setItem('cruzeiro:intro', '1')
  } catch { /* sem storage: toca sempre */ }
  return true
}

export default function SkillTree() {
  const { character, setCharacter } = useGameStore()
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
      // a barra lateral (pontos sobrando) e o confete olham o personagem
      api.get(`/characters/${character.id}`).then(({ data: fresh }) => setCharacter(fresh)).catch(() => {})
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
      <div className="fixed inset-y-0 left-20 right-0 z-0 overflow-hidden bg-[#E3F5FC] text-[#24331F]">
        <TreeSky />

        <div className="relative z-10 flex h-full flex-col gap-4 overflow-y-auto p-4 sm:p-6 lg:flex-row lg:overflow-hidden">
          {/* a árvore */}
          <section className="relative flex min-h-[420px] min-w-0 flex-1 flex-col" aria-label="Árvore de habilidades">
            <div className="pointer-events-none flex flex-wrap items-start justify-between gap-3">
              <div key={`brand-${introKey}`} className={`cz-brand ${intro ? 'cz-intro-brand' : ''}`}>
                <h1 className="font-toy text-[clamp(28px,4vw,46px)] font-extrabold leading-none text-[#2B8C41] [text-shadow:0_3px_0_#FFFDF7]">
                  Árvore de habilidades
                </h1>
                <p className="mt-1 text-sm font-bold text-[#4A5A42]">Cada dilema respondido vale 1 ponto. Cada ponto vira um fruto: uma vantagem para o ano todo.</p>
              </div>
              <Points free={free} used={mine.usedPoints} max={mine.maxPoints} />
            </div>

            <Tree
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
              className="self-start rounded-xl bg-[#FFFDF7]/90 px-3 py-2 text-xs font-bold text-[#4A5A42] shadow-[0_3px_0_#E2D6BE] hover:text-[#24331F] cursor-pointer"
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
    <div className="flex items-center gap-3 rounded-2xl bg-[#FFFDF7]/95 px-4 py-2.5 shadow-[0_4px_0_#E2D6BE]">
      <b className="font-toy text-xl tabular-nums text-[#C98A12]">{free}</b>
      <span className="text-xs font-bold text-[#6B7A62]">{free === 1 ? 'ponto' : 'pontos'}</span>
      <div className="flex gap-1" aria-label={`${used} de ${max} pontos usados`}>
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            className={`h-2 w-3.5 rounded-full transition-colors ${i < used ? 'bg-[#F2B53A]' : i < used + free ? 'bg-[#F2B53A]/25 ring-1 ring-inset ring-[#F2B53A]' : 'bg-[#EFE6D3]'}`}
          />
        ))}
      </div>
    </div>
  )
}

// Folha apontando para cima, com a base em (x, y).
const leafPath = (x, y, s) => `M${x} ${y} C${x - s * 0.9} ${y - s * 0.4} ${x - s * 0.6} ${y - s * 1.3} ${x} ${y - s * 1.6} C${x + s * 0.6} ${y - s * 1.3} ${x + s * 0.9} ${y - s * 0.4} ${x} ${y}Z`

// Galho curvo de (x1, y1) até (x2, y2), puxado um pouco para fora.
const branchPath = ([x1, y1], [x2, y2]) => {
  const mx = (x1 + x2) / 2 + (x2 - x1) * 0.12
  const my = (y1 + y2) / 2 + Math.abs(x2 - x1) * 0.18
  return `M${x1} ${y1} Q${mx.toFixed(1)} ${my.toFixed(1)} ${x2} ${y2}`
}

// copa: bolotas de folhas atrás dos galhos (x, y, raio)
const CANOPY = [
  [500, 300, 210], [300, 360, 170], [700, 360, 170], [200, 280, 120], [800, 280, 120],
  [400, 230, 150], [600, 230, 150], [500, 190, 130], [380, 470, 130], [620, 470, 130],
]

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

function Tree({ skills, statusOf, unlockedIds, selectedId, justUnlocked, intro, avatar, onPick }) {
  if (!skills.length) return <div className="flex-1" />
  const [cx, cy] = CORE
  const isOn = (s) => unlockedIds.includes(s.id)
  const fresh = skills.find((s) => s.id === justUnlocked)
  const halo = { paintOrder: 'stroke', stroke: '#FFFDF7', strokeWidth: 5, strokeLinejoin: 'round' }

  return (
    <svg
      viewBox="0 100 1000 680"
      preserveAspectRatio="xMidYMid meet"
      className={`min-h-0 w-full flex-1 ${intro ? 'cz-intro' : 'cz-quick'}`}
      role="group"
      aria-label="Habilidades por caminho"
    >
      <defs>
        <radialGradient id="tr-leaf" cx=".35" cy=".3" r=".75"><stop offset="0" stopColor="#B9EE7E" /><stop offset=".5" stopColor="#6CC64A" /><stop offset="1" stopColor="#3F9A3E" /></radialGradient>
        <linearGradient id="tr-trunk" x1="0" x2="1"><stop offset="0" stopColor="#7A4C2B" /><stop offset=".45" stopColor="#B07A4A" /><stop offset="1" stopColor="#6E4426" /></linearGradient>
        <radialGradient id="cz-gcore"><stop offset="0" stopColor="#FFF4D6" /><stop offset=".55" stopColor="#FFC857" /><stop offset="1" stopColor="#E08A00" /></radialGradient>
        {PATH_ORDER.map((p) => (
          <g key={p}>
            <radialGradient id={`cz-g-${p}`} cx=".35" cy=".3" r=".75"><stop offset="0" stopColor="#fff" /><stop offset=".3" stopColor={PATHS[p].hex} stopOpacity=".7" /><stop offset="1" stopColor={PATHS[p].hex} /></radialGradient>
            <radialGradient id={`cz-glow-${p}`}><stop offset="0" stopColor="#FFE68A" stopOpacity=".8" /><stop offset="1" stopColor="#FFE68A" stopOpacity="0" /></radialGradient>
          </g>
        ))}
        <clipPath id="cz-avatar-clip"><circle cx={cx} cy={cy} r="35" /></clipPath>
        <filter id="cz-soft" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#24331F" floodOpacity=".22" /></filter>
      </defs>

      {/* copa e tronco */}
      <g className="cz-sway">
        <g opacity=".6">
          {CANOPY.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="url(#tr-leaf)" />)}
        </g>
        <path d={`M${cx - 46} 780 C${cx - 34} 740 ${cx - 30} 700 ${cx - 26} ${cy} L${cx + 26} ${cy} C${cx + 30} 700 ${cx + 34} 740 ${cx + 46} 780 Z`} fill="url(#tr-trunk)" />
      </g>

      {/* galhos */}
      {PATH_ORDER.map((path, pi) => {
        const list = skills.filter((s) => s.path === path).sort((a, b) => a.level - b.level)
        return list.map((s, li) => {
          const from = li === 0 ? CORE : SPOTS[path][li - 1]
          const to = SPOTS[path][s.level - 1] ?? CORE
          const len = Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) * 1.1)
          const style = { '--len': len, '--d': `${(0.9 + li * 0.32 + pi * 0.08).toFixed(2)}s` }
          const on = isOn(s)
          const w = 22 - li * 4
          return (
            <g key={`l-${s.id}`}>
              <path
                className={`cz-ln ${s.id === justUnlocked ? 'cz-drawnow' : ''}`}
                style={style}
                d={branchPath(from, to)}
                fill="none"
                stroke={on ? '#8A5A34' : '#A7865F'}
                strokeOpacity={on ? 1 : 0.55}
                strokeWidth={w}
                strokeLinecap="round"
                filter={on ? 'url(#cz-soft)' : undefined}
              />
              {on && <path className="cz-ln" style={style} d={branchPath(from, to)} fill="none" stroke="#C79058" strokeWidth={Math.max(3, w * 0.28)} strokeLinecap="round" transform="translate(-2 -2)" />}
            </g>
          )
        })
      })}

      {/* você, na base do tronco */}
      <circle className="cz-shock" cx={cx} cy={cy} r="30" fill="none" stroke="#F2B53A" strokeWidth="3" />
      <g className="cz-vc">
        <circle className="cz-orbit" cx={cx} cy={cy} r="50" fill="none" stroke="#F2B53A" strokeOpacity=".8" strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="42" fill="#8A5A34" />
        <circle cx={cx} cy={cy} r="35" fill="#DDE6F5" />
        {avatar && <image href={avatar} x={cx - 44} y={cy - 40} width="88" height="88" clipPath="url(#cz-avatar-clip)" preserveAspectRatio="xMidYMin slice" />}
        <circle cx={cx} cy={cy} r="35" fill="none" stroke="#FFFDF7" strokeWidth="3" />
      </g>

      {/* frutos (as habilidades) */}
      {PATH_ORDER.map((path, pi) =>
        skills.filter((s) => s.path === path).map((s) => {
          const [x, y] = SPOTS[path][s.level - 1] ?? CORE
          const li = s.level - 1
          const st = statusOf(s)
          const on = st === 'on'
          const sel = s.id === selectedId
          const hex = PATHS[path].hex
          const R = (on ? 20 : st === 'locked' ? 11 : 15) + s.level * 2
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
                {on && <circle className="cz-halo" cx={x} cy={y} r={R * 2.2} fill={`url(#cz-glow-${path})`} />}
                {st === 'ready' && <circle className="cz-ready" cx={x} cy={y} r={R * 0.9} fill="none" stroke="#F2B53A" strokeWidth="3" />}
                {sel && <circle className="cz-orbit" cx={x} cy={y} r={R + 9} fill="none" stroke="#24331F" strokeWidth="2" strokeDasharray="3 5" />}
                <circle className="cz-focus" cx={x} cy={y} r={R + 13} fill="none" stroke="#24331F" strokeWidth="2" strokeDasharray="4 4" />
                <g className="cz-core" filter="url(#cz-soft)">
                  {on ? (
                    <>
                      <circle cx={x} cy={y} r={R} fill={`url(#cz-g-${path})`} stroke="#FFFDF7" strokeWidth="2.5" />
                      <path d={`M${x} ${y - R + 2} q2 -7 6 -9`} stroke="#6E4426" strokeWidth="3" strokeLinecap="round" fill="none" />
                      <path d={leafPath(x + 6, y - R - 4, 9)} transform={`rotate(40 ${x + 6} ${y - R - 4})`} fill="#6CC64A" />
                      <circle cx={x - R * 0.35} cy={y - R * 0.35} r={R * 0.2} fill="#fff" opacity=".85" />
                    </>
                  ) : (
                    <>
                      <path d={leafPath(x, y + R * 0.7, R * 1.05)} fill={st === 'locked' ? '#A9C99A' : st === 'ready' ? '#6CC64A' : '#8DBF74'} stroke={st === 'ready' ? hex : 'none'} strokeWidth="2.5" />
                      <path d={`M${x} ${y + R * 0.6} L${x} ${y - R * 0.6}`} stroke="#FFFDF7" strokeOpacity=".7" strokeWidth="1.6" strokeLinecap="round" />
                    </>
                  )}
                </g>
              </g>
              <text className="cz-lbl" style={{ ...d, ...halo }} x={lp.x} y={lp.y} textAnchor={lp.anchor} fontSize="14" fontWeight={on || sel ? 800 : 600} fill={on ? '#1B2A16' : st === 'locked' ? '#5E6B55' : '#2F3D28'}>
                {splitName(s.name).map((line, i) => <tspan key={i} x={lp.x} dy={i ? 16 : 0}>{line}</tspan>)}
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
            <text className="cz-lbl" style={{ ...d, ...halo }} x={lx} y={ly - 52} textAnchor="middle" fontSize="13" fontWeight="800" letterSpacing="3" fill={PATHS[path].hex}>{PATHS[path].short.toUpperCase()}</text>
            <text className="cz-lbl" style={{ ...d, ...halo }} x={lx} y={ly - 35} textAnchor="middle" fontSize="12" fontWeight="600" fill="#4A5A42">{PATHS[path].theme}</text>
          </g>
        )
      })}

      {/* folhas e brilho ao desbloquear */}
      {fresh && (() => {
        const [x, y] = SPOTS[fresh.path][fresh.level - 1]
        const hex = PATHS[fresh.path].hex
        return (
          <g className="cz-burst" key={`b-${fresh.id}`}>
            {Array.from({ length: 18 }, (_, i) => {
              const a = (i / 18) * 6.283
              const dist = 40 + (i % 3) * 18
              return <circle key={i} cx={x} cy={y} r={2.5 + (i % 2)} fill={i % 3 === 0 ? '#F2B53A' : i % 3 === 1 ? '#6CC64A' : hex} style={{ '--dx': `${(Math.cos(a) * dist).toFixed(1)}px`, '--dy': `${(Math.sin(a) * dist).toFixed(1)}px` }} />
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
      <p className="leading-relaxed text-[#4A5A42]">{perk.desc}</p>
      <div className="rounded-2xl border-2 border-[#F2D27A] bg-[#FFF3C4] px-4 py-3">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#B07A0C]">Vantagem</p>
        <p className="mt-1 text-[17px] font-bold">{perk.perk}</p>
        {perk.note && <p className="mt-1 text-[13px] text-[#6B5A2E]">{perk.note}</p>}
      </div>
      <p className="text-[13px] font-bold" style={{ color: status === 'on' ? path?.hex : status === 'ready' ? '#B07A0C' : '#6B7A62' }}>
        {STATUS_TEXT[status]}
      </p>
      {error && <p className="rounded-xl bg-[#FDE2E5] px-3 py-2 text-sm font-semibold text-[#9F1D2F]">{error}</p>}
      <button
        type="button"
        onClick={onUnlock}
        disabled={status !== 'ready' || busy}
        className="rounded-[18px] bg-[#3DBE5A] px-4 py-3.5 font-toy text-[18px] font-extrabold text-white shadow-[0_6px_0_#2B8C41] transition hover:brightness-105 active:translate-y-1 active:shadow-[0_2px_0_#2B8C41] disabled:cursor-not-allowed disabled:bg-[#EFE6D3] disabled:text-[#8A9680] disabled:shadow-none cursor-pointer"
      >
        {status === 'on' ? 'Desbloqueada' : busy ? 'Desbloqueando…' : `Desbloquear por ${cost} ${cost > 1 ? 'pontos' : 'ponto'}`}
      </button>

      {Array.isArray(tips) && tips.length > 0 && (
        <div className="rounded-2xl border-2 border-[#D9CBFB] bg-[#F1ECFE] px-4 py-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#6538C9]">Dica do jornal</p>
          <ul className="mt-1 grid gap-1 text-sm">
            {tips.map((t, i) => <li key={t.ticker ?? i}>{t.text ?? `${t.ticker}: ${t.direction === 'down' ? 'deve cair' : 'deve subir'} no mês que vem`}</li>)}
          </ul>
        </div>
      )}

      <div>
        <p className="mb-2 mt-2 text-[11px] font-extrabold uppercase tracking-[0.24em] text-[#8A9680]">Suas vantagens ativas</p>
        <ul className="grid gap-1.5 text-[13px]">
          {unlocked.length ? unlocked.map((s) => (
            <li key={s.id} className="flex items-baseline gap-2">
              <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: PATHS[s.path]?.hex }} />
              {perkOf(s).perk}
            </li>
          )) : <li className="text-[#6B7A62]">Nenhuma ainda. Cada dilema respondido dá 1 ponto.</li>}
        </ul>
      </div>
    </aside>
  )
}
