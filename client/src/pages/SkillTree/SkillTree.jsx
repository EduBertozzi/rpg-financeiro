import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../../services/api'
import useGameStore from '../../store/gameStore'
import GameLayout from '../../components/GameLayout'
import TreeSky from './TreeSky'
import { getAvatarById } from '../../data/avatarTheme'
import { CORE, PATHS, PATH_ORDER, SPOTS, STATUS_TEXT, perkOf, skillCost, skillStatus } from './skillData'
import { LABEL_FONT, VIEW, labelBox, nodeRadius } from './treeLayout'
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

        {/* em cima sobra espaço para o relógio do mês, fixo no canto */}
        <div className="relative z-10 flex h-full flex-col gap-4 overflow-y-auto p-4 pt-16 sm:p-6 sm:pt-20 lg:flex-row lg:overflow-hidden lg:pt-6">
          {/* a árvore */}
          <section className="relative flex min-w-0 flex-none flex-col lg:min-h-[420px] lg:flex-1" aria-label="Árvore de habilidades">
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

            <div className="flex flex-wrap items-center gap-3">
              <Legend />
              <button
                type="button"
                onClick={replay}
                className="rounded-xl bg-[#FFFDF7]/90 px-3 py-2 text-xs font-bold text-[#4A5A42] shadow-[0_3px_0_#E2D6BE] hover:text-[#24331F] cursor-pointer"
              >
                ↻ Ver a entrada de novo
              </button>
            </div>
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

// Galho curvo passando por todos os frutos do caminho (curva suave tipo
// Catmull-Rom): o trecho i vai do ponto i ao i+1 da cadeia [tronco, nível 1..4].
const chainOf = (path) => [CORE, ...SPOTS[path]]
function segment(chain, i) {
  const p0 = chain[Math.max(i - 1, 0)], p1 = chain[i], p2 = chain[i + 1], p3 = chain[Math.min(i + 2, chain.length - 1)]
  const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
  const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
  const f = (n) => n.toFixed(1)
  return {
    d: `M${f(p1[0])} ${f(p1[1])} C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`,
    mid: [(p1[0] + 3 * c1[0] + 3 * c2[0] + p2[0]) / 8, (p1[1] + 3 * c1[1] + 3 * c2[1] + p2[1]) / 8],
  }
}

// copa: bolotas de folhas atrás dos galhos (x, y, raio), com um contorno
// recortado de bolotas menores
const CANOPY = [
  [500, 300, 210], [300, 360, 170], [700, 360, 170], [200, 280, 120], [800, 280, 120],
  [400, 230, 150], [600, 230, 150], [500, 190, 130], [380, 470, 130], [620, 470, 130],
  [120, 300, 70], [880, 300, 70], [150, 420, 80], [850, 420, 80], [260, 170, 80], [740, 170, 80],
  [380, 130, 70], [620, 130, 70], [250, 520, 70], [750, 520, 70],
]
const GRASS = [[300, 784], [352, 790], [628, 788], [690, 783], [430, 792], [570, 792]]

function Tree({ skills, statusOf, unlockedIds, selectedId, justUnlocked, intro, avatar, onPick }) {
  const scrollRef = useRef(null)
  // no celular a árvore rola na horizontal; começa centralizada no tronco
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
  }, [skills.length])

  if (!skills.length) return <div className="flex-1" />
  const [cx, cy] = CORE
  const isOn = (s) => unlockedIds.includes(s.id)
  const fresh = skills.find((s) => s.id === justUnlocked)
  const halo = { paintOrder: 'stroke', stroke: '#FFFDF7', strokeWidth: 5, strokeLinejoin: 'round' }

  return (
    <div ref={scrollRef} className="-mx-4 flex h-[470px] shrink-0 overflow-x-auto overflow-y-hidden lg:h-auto lg:min-h-0 lg:flex-1 lg:shrink [scrollbar-width:none] sm:mx-0 [&::-webkit-scrollbar]:hidden">
      <svg
        viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
        preserveAspectRatio="xMidYMid meet"
        className={`h-full w-full min-w-[720px] ${intro ? 'cz-intro' : 'cz-quick'}`}
        role="group"
        aria-label="Habilidades por caminho"
      >
        <defs>
          <radialGradient id="tr-leaf" cx=".4" cy=".3" r=".85"><stop offset="0" stopColor="#A6E37A" /><stop offset=".6" stopColor="#7CCB55" /><stop offset="1" stopColor="#5BB14A" /></radialGradient>
          <linearGradient id="tr-trunk" x1="0" x2="1"><stop offset="0" stopColor="#6E4426" /><stop offset=".4" stopColor="#B07A4A" /><stop offset=".7" stopColor="#9A6A3E" /><stop offset="1" stopColor="#5E3A20" /></linearGradient>
          {PATH_ORDER.map((p) => (
            <g key={p}>
              <radialGradient id={`cz-g-${p}`} cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#fff" stopOpacity=".9" /><stop offset=".28" stopColor={PATHS[p].hex} stopOpacity=".75" /><stop offset="1" stopColor={PATHS[p].hex} /></radialGradient>
              <radialGradient id={`cz-glow-${p}`}><stop offset="0" stopColor="#FFE68A" stopOpacity=".85" /><stop offset="1" stopColor="#FFE68A" stopOpacity="0" /></radialGradient>
            </g>
          ))}
          <clipPath id="cz-avatar-clip"><circle cx={cx} cy={cy} r="35" /></clipPath>
          <filter id="cz-soft" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#24331F" floodOpacity=".25" /></filter>
          <filter id="cz-tag" x="-20%" y="-30%" width="140%" height="180%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#24331F" floodOpacity=".18" /></filter>
        </defs>

        {/* chão: morrinho de grama embaixo do tronco */}
        <ellipse cx={cx} cy="800" rx="330" ry="34" fill="#8CCD62" />
        <ellipse cx={cx} cy="796" rx="250" ry="20" fill="#9BD86A" />
        {GRASS.map(([x, y]) => <path key={x} d={`M${x} ${y} l4 -12 l3 12 M${x + 7} ${y} l4 -8 l3 8`} stroke="#6FB34E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />)}
        <ellipse cx={cx} cy="786" rx="120" ry="11" fill="#24331F" opacity=".14" />

        {/* copa (sombra, folhas e brilho, cada camada inteira de uma vez) e tronco */}
        <g className="cz-sway">
          <g>{CANOPY.map(([x, y, r], i) => <circle key={i} cx={x} cy={y + 18} r={r} fill="#3E8A39" />)}</g>
          <g>{CANOPY.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="url(#tr-leaf)" />)}</g>
          <g opacity=".14">{CANOPY.filter(([, , r]) => r >= 150).map(([x, y, r], i) => <circle key={i} cx={x - r * 0.3} cy={y - r * 0.4} r={r * 0.4} fill="#F2FDE2" />)}</g>
          <path
            d={`M${cx - 84} 788 Q${cx - 46} 778 ${cx - 38} 740 C${cx - 32} 712 ${cx - 30} 694 ${cx - 28} ${cy} L${cx + 28} ${cy} C${cx + 30} 694 ${cx + 32} 712 ${cx + 38} 740 Q${cx + 46} 778 ${cx + 84} 788 Z`}
            fill="url(#tr-trunk)"
          />
          <path d={`M${cx - 14} 778 C${cx - 18} 748 ${cx - 10} 724 ${cx - 15} 700 M${cx + 12} 774 C${cx + 16} 750 ${cx + 9} 728 ${cx + 13} 706 M${cx - 52} 784 Q${cx - 36} 778 ${cx - 30} 762 M${cx + 52} 784 Q${cx + 36} 778 ${cx + 30} 762`} stroke="#4A2C16" strokeOpacity=".35" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d={`M${cx - 23} 764 C${cx - 25} 736 ${cx - 21} 712 ${cx - 21} 694`} stroke="#E1AE78" strokeOpacity=".55" strokeWidth="4" strokeLinecap="round" fill="none" />
        </g>

        {/* galhos: madeira firme até o que já é seu; broto claro no resto */}
        {PATH_ORDER.map((path, pi) => {
          const list = skills.filter((s) => s.path === path).sort((a, b) => a.level - b.level)
          return list.map((s, li) => {
            const chain = chainOf(path)
            const from = chain[li]
            const to = chain[li + 1] ?? CORE
            const len = Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) * 1.25)
            const style = { '--len': len, '--d': `${(0.9 + li * 0.32 + pi * 0.08).toFixed(2)}s` }
            const on = isOn(s)
            const w = 24 - li * 4
            const { d, mid: [mx, my] } = segment(chain, li)
            const cls = `cz-ln ${s.id === justUnlocked ? 'cz-drawnow' : ''}`
            const side = to[0] < from[0] ? -1 : 1
            return (
              <g key={`l-${s.id}`}>
                {on ? (
                  <>
                    <path className={cls} style={style} d={d} fill="none" stroke="#5E3A20" strokeWidth={w} strokeLinecap="round" filter="url(#cz-soft)" />
                    <path className={cls} style={style} d={d} fill="none" stroke="#9A6A3E" strokeWidth={w * 0.62} strokeLinecap="round" />
                    <path className={cls} style={style} d={d} fill="none" stroke="#D9A06A" strokeWidth={Math.max(2.5, w * 0.2)} strokeLinecap="round" transform="translate(-2 -2)" />
                  </>
                ) : (
                  <>
                    <path className={cls} style={style} d={d} fill="none" stroke="#B49773" strokeOpacity=".75" strokeWidth={w * 0.78} strokeLinecap="round" />
                    <path className={cls} style={style} d={d} fill="none" stroke="#E4D3B6" strokeOpacity=".8" strokeWidth={Math.max(2, w * 0.18)} strokeLinecap="round" transform="translate(-1.5 -1.5)" />
                  </>
                )}
                <g className="cz-nd" style={{ '--d': style['--d'] }}>
                  <path d={leafPath(mx, my, 13)} transform={`rotate(${side * 55} ${mx} ${my})`} fill={on ? '#4FA63F' : '#A9C99A'} />
                  <path d={leafPath(mx, my, 10)} transform={`rotate(${side * -35} ${mx} ${my})`} fill={on ? '#6CC64A' : '#BFD8B0'} />
                </g>
              </g>
            )
          })
        })}

        {/* você, na base do tronco */}
        <circle className="cz-shock" cx={cx} cy={cy} r="30" fill="none" stroke="#F2B53A" strokeWidth="3" />
        <g className="cz-vc">
          <circle className="cz-orbit" cx={cx} cy={cy} r="50" fill="none" stroke="#F2B53A" strokeOpacity=".9" strokeWidth="2.5" strokeDasharray="2 9" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="43" fill="#5E3A20" filter="url(#cz-soft)" />
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
            const R = nodeRadius(st, s.level)
            const d = { '--d': `${(1.15 + li * 0.32 + pi * 0.08).toFixed(2)}s` }
            const tag = labelBox(path, x, y, R, s.name)
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
                  {on && <circle className="cz-halo" cx={x} cy={y} r={R * 2.1} fill={`url(#cz-glow-${path})`} />}
                  {st === 'ready' && <circle className="cz-ready" cx={x} cy={y} r={R + 2} fill="none" stroke="#F2B53A" strokeWidth="4" />}
                  {sel && <circle className="cz-orbit" cx={x} cy={y} r={R + 9} fill="none" stroke="#24331F" strokeWidth="2.5" strokeDasharray="3 5" />}
                  <circle className="cz-focus" cx={x} cy={y} r={R + 13} fill="none" stroke="#24331F" strokeWidth="2" strokeDasharray="4 4" />
                  <g className="cz-core" filter="url(#cz-soft)">
                    {on ? (
                      <>
                        {/* fruto maduro, com cabinho, folha, brilho e o selo de "já é sua" */}
                        <path d={`M${x} ${y - R + 3} q1 -8 5 -11`} stroke="#5E3A20" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                        <path d={leafPath(x + 4, y - R - 6, 10)} transform={`rotate(48 ${x + 4} ${y - R - 6})`} fill="#4FA63F" />
                        <circle cx={x} cy={y} r={R} fill={`url(#cz-g-${path})`} stroke="#FFFDF7" strokeWidth="3" />
                        <ellipse cx={x - R * 0.38} cy={y - R * 0.38} rx={R * 0.22} ry={R * 0.15} transform={`rotate(-40 ${x - R * 0.38} ${y - R * 0.38})`} fill="#fff" opacity=".9" />
                        <circle cx={x + R * 0.72} cy={y + R * 0.72} r="9" fill="#2B8C41" stroke="#FFFDF7" strokeWidth="2.5" />
                        <path d={`M${x + R * 0.72 - 4} ${y + R * 0.72} l3 3 l5 -6`} stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </>
                    ) : st === 'locked' ? (
                      <>
                        {/* botão fechado, com cadeado */}
                        <circle cx={x} cy={y} r={R} fill="#EEF2E8" stroke="#C3CDB8" strokeWidth="2.5" />
                        <path d={`M${x - 4.5} ${y - 1} v-3.5 a4.5 4.5 0 0 1 9 0 v3.5`} stroke="#8A9680" strokeWidth="2.4" fill="none" strokeLinecap="round" />
                        <rect x={x - 6.5} y={y - 1.5} width="13" height="10" rx="2.5" fill="#8A9680" />
                      </>
                    ) : st === 'ready' ? (
                      <>
                        {/* pronta para colher: aro na cor do caminho e um "+" */}
                        <circle cx={x} cy={y} r={R} fill="#FFFDF7" stroke={hex} strokeWidth="4" />
                        <circle cx={x} cy={y} r={R * 0.62} fill={hex} opacity=".16" />
                        <path d={`M${x - 7} ${y} h14 M${x} ${y - 7} v14`} stroke={hex} strokeWidth="4" strokeLinecap="round" />
                      </>
                    ) : (
                      <>
                        {/* aberta, mas faltam pontos: aro tracejado e apagado */}
                        <circle cx={x} cy={y} r={R} fill="#FFFDF7" fillOpacity=".92" stroke={hex} strokeOpacity=".55" strokeWidth="3" strokeDasharray="5 4" />
                        <path d={`M${x - 5.5} ${y} h11 M${x} ${y - 5.5} v11`} stroke={hex} strokeOpacity=".45" strokeWidth="3" strokeLinecap="round" />
                      </>
                    )}
                  </g>
                </g>
                <title>{`${s.name} · ${STATUS_TEXT[st]}`}</title>
                {(on || st === 'ready' || sel) && <g className="cz-lbl" style={d}>
                  <rect
                    x={tag.x} y={tag.y} width={tag.w} height={tag.h} rx="11"
                    fill={st === 'locked' ? '#F6F3EA' : '#FFFDF7'} fillOpacity={st === 'locked' ? 0.82 : 0.96}
                    stroke={sel || on ? hex : 'none'} strokeOpacity={sel ? 1 : 0.35} strokeWidth={sel ? 2.5 : 1.5}
                    filter="url(#cz-tag)"
                  />
                  <text x={tag.textX} y={tag.textY} fontSize={LABEL_FONT} fontWeight={on || sel || st === 'ready' ? 800 : 700} fill={on ? '#1B2A16' : st === 'locked' ? '#6B7A62' : '#2F3D28'}>
                    {tag.lines.map((line, i) => <tspan key={i} x={tag.textX} dy={i ? tag.line : 0}>{line}</tspan>)}
                  </text>
                </g>}
              </g>
            )
          })
        )}

        {/* nome de cada caminho, em cima do último fruto */}
        {PATH_ORDER.map((path, pi) => {
          const [lx, ly] = SPOTS[path][3]
          const d = { '--d': `${(2 + pi * 0.1).toFixed(2)}s` }
          const name = PATHS[path].short.toUpperCase()
          const pw = name.length * 13 + 34
          return (
            <g key={`t-${path}`} className="cz-lbl" style={d}>
              <rect x={lx - pw / 2} y={ly - 84} width={pw} height="32" rx="16" fill={PATHS[path].hex} stroke="#FFFDF7" strokeWidth="3" filter="url(#cz-tag)" />
              <text x={lx} y={ly - 62} textAnchor="middle" fontSize="17" fontWeight="800" letterSpacing="2" fill="#fff">{name}</text>
              <text style={halo} x={lx} y={ly - 34} textAnchor="middle" fontSize="14" fontWeight="800" fill="#2F3D28">{PATHS[path].theme}</text>
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
    </div>
  )
}

// O que cada desenho quer dizer, embaixo da árvore.
function Legend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl bg-[#FFFDF7]/90 px-3 py-2 text-[12px] font-bold text-[#4A5A42] shadow-[0_3px_0_#E2D6BE]" aria-label="Legenda">
      <li className="flex items-center gap-1.5">
        <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="#2B8C41" stroke="#fff" strokeWidth="2" /><path d="M6.5 10l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Já é sua
      </li>
      <li className="flex items-center gap-1.5">
        <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true"><circle cx="10" cy="10" r="7.5" fill="#FFFDF7" stroke="#F2B53A" strokeWidth="3" /><path d="M6.5 10h7M10 6.5v7" stroke="#F2B53A" strokeWidth="2.4" strokeLinecap="round" /></svg>
        Pode desbloquear
      </li>
      <li className="flex items-center gap-1.5">
        <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="#EEF2E8" stroke="#C3CDB8" strokeWidth="2" /><path d="M7.5 9.5v-2a2.5 2.5 0 0 1 5 0v2" stroke="#8A9680" strokeWidth="1.8" fill="none" /><rect x="6.2" y="9" width="7.6" height="5.6" rx="1.5" fill="#8A9680" /></svg>
        Bloqueada
      </li>
    </ul>
  )
}

function Detail({ skill, status, cost, unlocked, tips, busy, error, onUnlock }) {
  const path = PATHS[skill.path]
  const perk = perkOf(skill)
  return (
    <aside className={`${PANEL} grid shrink-0 content-start gap-3 p-5 lg:mt-14 lg:w-[340px] lg:overflow-y-auto`} aria-live="polite">
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
