import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useGameStore from '../../store/gameStore'
import api from '../../services/api'
import socket from '../../services/socket'
import GameHeader from '../../components/GameHeader'
import DilemmaModal from '../../components/DilemmaModal'

const TILE = 46
const HZ = 26
const OX = 480
const OY = 120

const iso = (gx, gy, gz = 0) => ({
  x: OX + (gx - gy) * TILE,
  y: OY + (gx + gy) * (TILE / 2) - gz * HZ,
})

const P = (arr) => arr.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
const facePoint = (P00, P10, P11, P01, u, v) =>
  lerp(lerp(P00, P10, u), lerp(P01, P11, u), v)

function box(gx, gy, w, d, H) {
  const T = {
    A: iso(gx, gy, H),
    B: iso(gx + w, gy, H),
    C: iso(gx + w, gy + d, H),
    D: iso(gx, gy + d, H),
  }

  const B = {
    a: iso(gx, gy, 0),
    b: iso(gx + w, gy, 0),
    c: iso(gx + w, gy + d, 0),
    d: iso(gx, gy + d, 0),
  }

  return {
    top: [T.A, T.B, T.C, T.D],
    east: [T.B, T.C, B.c, B.b],
    south: [T.D, T.C, B.c, B.d],
  }
}

function windows(face, cols, rows, fill, key) {
  const [P00, P10, P11, P01] = face
  const mu = 0.18
  const mv = 0.16
  const cu = (1 - 2 * mu) / cols
  const cv = (1 - 2 * mv) / rows
  const wu = cu * 0.55
  const wv = cv * 0.6
  const out = []

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const u = mu + i * cu + (cu - wu) / 2
      const v = mv + j * cv + (cv - wv) / 2
      const a = facePoint(P00, P10, P11, P01, u, v)
      const b = facePoint(P00, P10, P11, P01, u + wu, v)
      const c = facePoint(P00, P10, P11, P01, u + wu, v + wv)
      const d = facePoint(P00, P10, P11, P01, u, v + wv)

      out.push(
        <polygon
          key={`${key}-${i}-${j}`}
          points={P([a, b, c, d])}
          fill={fill}
          opacity="0.9"
        />
      )
    }
  }

  return out
}

const LANDMARKS = [
  {
    id: 'bank',
    name: 'Banco',
    desc: 'Renda Fixa',
    gx: 3,
    gy: 0,
    w: 2,
    d: 2,
    H: 3,
    route: '/bank',
    top: '#3b82f6',
    south: '#2563eb',
    east: '#1d4ed8',
    glow: '#3b82f6',
    win: '#bfdbfe',
  },
  {
    id: 'companies',
    name: 'Empresas',
    desc: 'Debêntures',
    gx: 6,
    gy: 3,
    w: 2,
    d: 2,
    H: 4.4,
    route: '/companies',
    top: '#a855f7',
    south: '#9333ea',
    east: '#7e22ce',
    glow: '#a855f7',
    win: '#e9d5ff',
  },
  {
    id: 'university',
    name: 'Universidade',
    desc: 'Habilidades',
    gx: 3,
    gy: 6,
    w: 2,
    d: 2,
    H: 3,
    route: '/skills',
    top: '#eab308',
    south: '#ca8a04',
    east: '#a16207',
    glow: '#eab308',
    win: '#fef08a',
  },
  {
    id: 'leisure',
    name: 'Lazer',
    desc: 'Evento do mês',
    gx: 0,
    gy: 3,
    w: 2,
    d: 2,
    H: 2.4,
    route: 'modal_dilemma',
    top: '#ec4899',
    south: '#db2777',
    east: '#be185d',
    glow: '#ec4899',
    win: '#fbcfe8',
  },
]

const HOUSES = [
  { gx: 0, gy: 1 },
  { gx: 1, gy: 0 },
  { gx: 6, gy: 1 },
  { gx: 7, gy: 0 },
  { gx: 0, gy: 6 },
  { gx: 1, gy: 7 },
  { gx: 6, gy: 6 },
  { gx: 7, gy: 7 },
]

const TREES = [
  { gx: 2, gy: 0 },
  { gx: 0, gy: 2 },
  { gx: 5, gy: 0 },
  { gx: 7, gy: 2 },
  { gx: 2, gy: 6 },
  { gx: 7, gy: 6 },
  { gx: 0, gy: 5 },
  { gx: 6, gy: 2 },
  { gx: 2, gy: 7 },
  { gx: 5, gy: 7 },
  { gx: 1, gy: 2 },
  { gx: 6, gy: 0 },
]

const HOUSE_COLORS = [
  { roof: '#5b6b9a', wall: '#3a4570', side: '#2c3358' },
  { roof: '#4f7a8c', wall: '#345561', side: '#27414a' },
  { roof: '#7a5b8c', wall: '#553a61', side: '#412c4a' },
]

const isRoad = (gx, gy) =>
  ((gx === 3 || gx === 4) && gy >= 0 && gy <= 7) ||
  ((gy === 3 || gy === 4) && gx >= 0 && gx <= 7)

function Shadow({ gx, gy, w = 1, d = 1 }) {
  const c = iso(gx + w / 2, gy + d / 2, 0)

  return (
    <ellipse
      cx={c.x}
      cy={c.y + 6}
      rx={TILE * (w + d) * 0.32}
      ry={TILE * (w + d) * 0.16}
      fill="#000"
      opacity="0.28"
    />
  )
}

function Tree({ gx, gy }) {
  const base = iso(gx + 0.5, gy + 0.5, 0)

  return (
    <g>
      <ellipse cx={base.x} cy={base.y + 4} rx="16" ry="8" fill="#000" opacity="0.22" />
      <rect x={base.x - 3} y={base.y - 16} width="6" height="18" rx="2" fill="#6b4f3a" />
      <circle cx={base.x} cy={base.y - 26} r="16" fill="#3f7d5a" />
      <circle cx={base.x - 7} cy={base.y - 20} r="11" fill="#4f9468" />
      <circle cx={base.x + 7} cy={base.y - 22} r="10" fill="#356b4c" />
      <circle cx={base.x - 3} cy={base.y - 31} r="7" fill="#5aa87a" opacity="0.7" />
    </g>
  )
}

function House({ gx, gy, idx }) {
  const c = HOUSE_COLORS[idx % HOUSE_COLORS.length]
  const w = 1
  const d = 1
  const H = 1.2
  const rh = 0.85
  const f = box(gx, gy, w, d, H)
  const A = f.top[0]
  const B = f.top[1]
  const C = f.top[2]
  const D = f.top[3]
  const Rl = iso(gx, gy + d / 2, H + rh)
  const Rr = iso(gx + w, gy + d / 2, H + rh)

  return (
    <g>
      <polygon points={P(f.east)} fill={c.side} />
      <polygon points={P(f.south)} fill={c.wall} />

      <polygon
        points={P([
          facePoint(f.south[0], f.south[1], f.south[2], f.south[3], 0.35, 0.32),
          facePoint(f.south[0], f.south[1], f.south[2], f.south[3], 0.62, 0.32),
          facePoint(f.south[0], f.south[1], f.south[2], f.south[3], 0.62, 0.62),
          facePoint(f.south[0], f.south[1], f.south[2], f.south[3], 0.35, 0.62),
        ])}
        fill="#ffe9a8"
        opacity="0.85"
      />

      <polygon points={P([D, C, Rr, Rl])} fill={c.roof} />
      <polygon points={P([A, B, Rr, Rl])} fill={c.roof} opacity="0.78" />
      <polygon points={P([B, C, Rr])} fill={c.roof} opacity="0.6" />
    </g>
  )
}

function BuildingIcon({ kind }) {
  switch (kind) {
    case 'bank':
      return (
        <>
          <polyline points="2,9 11,3 20,9" />
          <line x1="2" y1="9.5" x2="20" y2="9.5" />
          <line x1="4.5" y1="10.5" x2="4.5" y2="18" />
          <line x1="9" y1="10.5" x2="9" y2="18" />
          <line x1="13" y1="10.5" x2="13" y2="18" />
          <line x1="17.5" y1="10.5" x2="17.5" y2="18" />
          <line x1="2.5" y1="18.5" x2="19.5" y2="18.5" />
        </>
      )
    case 'companies':
      return (
        <>
          <rect x="3" y="8" width="16" height="11" rx="1.5" />
          <path d="M8 8 V6.5 a1.5 1.5 0 0 1 1.5 -1.5 h3 a1.5 1.5 0 0 1 1.5 1.5 V8" />
          <line x1="3" y1="13" x2="19" y2="13" />
        </>
      )
    case 'university':
      return (
        <>
          <polygon points="11,3.5 21,8.5 11,13.5 1,8.5" />
          <path d="M5 10.5 v3.8 c0 1.7 12 1.7 12 0 v-3.8" />
          <line x1="21" y1="8.5" x2="21" y2="14.5" />
          <circle cx="21" cy="15.5" r="1" fill="#fff" stroke="none" />
        </>
      )
    case 'leisure':
      return (
        <>
          <ellipse cx="9" cy="8" rx="5" ry="6" />
          <path d="M9 14 q1.5 1.5 0 3.5" />
          <polygon points="9,14 7.5,15.5 10.5,15.5" fill="#fff" stroke="none" />
          <path d="M16.5 5 v4 M14.5 7 h4" />
          <circle cx="17" cy="14" r="0.9" fill="#fff" stroke="none" />
        </>
      )
    default:
      return null
  }
}

function Landmark({ b, onClick }) {
  const f = box(b.gx, b.gy, b.w, b.d, b.H)
  const center = iso(b.gx + b.w / 2, b.gy + b.d / 2, b.H)
  const ground = iso(b.gx + b.w / 2, b.gy + b.d / 2, 0)

  return (
    <g className="landmark" onClick={onClick} style={{ '--glow': b.glow }}>
      <ellipse
        className="lm-halo"
        cx={ground.x}
        cy={ground.y + 8}
        rx={TILE * 1.5}
        ry={TILE * 0.8}
        fill={b.glow}
        opacity="0.18"
      />

      <Shadow gx={b.gx} gy={b.gy} w={b.w} d={b.d} />

      <polygon points={P(f.east)} fill={b.east} />
      <polygon points={P(f.south)} fill={b.south} />
      <polygon points={P(f.top)} fill={b.top} />
      <polygon points={P(f.top)} fill="none" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="1.5" />

      {windows(f.south, 2, Math.max(2, Math.round(b.H)), b.win, `${b.id}-s`)}
      {windows(f.east, 2, Math.max(2, Math.round(b.H)), b.win, `${b.id}-e`)}

      <g transform={`translate(${center.x}, ${center.y - 15})`} className="lm-icon">
        <circle r="16" fill="#0B0D17" opacity="0.92" stroke={b.glow} strokeOpacity="0.85" strokeWidth="2" />
        <g transform="translate(-11, -11)" stroke="#ffffff" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <BuildingIcon kind={b.id} />
        </g>
      </g>

      <g transform={`translate(${center.x}, ${center.y - 46})`} className="lm-label">
        <rect x="-62" y="-16" width="124" height="32" rx="16" fill="#0B0D17" opacity="0.92" stroke={b.glow} strokeOpacity="0.5" />
        <text x="-2" y="-1" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700">
          {b.name}
        </text>
        <text x="-2" y="11" textAnchor="middle" fill="#9aa3c0" fontSize="8.5" letterSpacing="0.5">
          {b.desc.toUpperCase()} ›
        </text>
      </g>
    </g>
  )
}

export default function Map() {
  const navigate = useNavigate()
  const { character, room, setCharacter, setRoom } = useGameStore()
  const characterRef = useRef(character)
  const roomRef = useRef(room)
  const [showDilemmaModal, setShowDilemmaModal] = useState(false)

  useEffect(() => {
    characterRef.current = character
  }, [character])

  useEffect(() => {
    roomRef.current = room
  }, [room])

  const totalCosts = character
    ? Number(character.housingCost) +
    Number(character.foodCost) +
    Number(character.utilitiesCost) +
    Number(character.transportCost)
    : 0

  useEffect(() => {
    if (!room?.code) return

    api.get(`/rooms/${room.code}`)
      .then(({ data }) => setRoom(data))
      .catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.code])

  useEffect(() => {
    if (!character?.id) return

    api.get(`/characters/${character.id}`)
      .then(({ data }) => setCharacter(data))
      .catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.id])

  useEffect(() => {
    if (!character?.id || !room?.id) return

    socket.connect()

    socket.on('connect', () => {
      socket.emit('room:join', {
        roomId: roomRef.current.id,
        characterId: characterRef.current.id,
      })
    })

    socket.on('turn:result', async (data) => {
      setRoom({ ...roomRef.current, currentTurn: data.turn })

      try {
        const { data: charData } = await api.get(`/characters/${characterRef.current.id}`)
        setCharacter(charData)
      } catch {
        setCharacter({ ...characterRef.current, turnReady: false })
      }

      if (data.dilemma) setShowDilemmaModal(true)
    })

    socket.on('connect_error', (err) => console.log('Erro socket:', err.message))
    socket.on('room:finished', () => navigate('/finished'))

    return () => {
      socket.off('connect')
      socket.off('turn:result')
      socket.off('room:finished')
      socket.off('connect_error')
      socket.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.id, room?.id])

  const handleFinishMonth = async () => {
    if (room?.currentTurn > 0) {
      const hasDoneLeisure = character?.eventLog?.some(
        (log) => log.turn === room.currentTurn && log.description.startsWith('Dilema')
      )

      if (!hasDoneLeisure) {
        alert('Você precisa ir ao Lazer antes de finalizar o mês!')
        return
      }
    }

    try {
      await api.patch(`/characters/${character.id}/ready`)
      setCharacter({ ...character, turnReady: true })
    } catch (err) {
      console.error(err)
      alert('Erro ao finalizar mês!')
    }
  }

  const handleDilemmaComplete = async () => {
    setShowDilemmaModal(false)

    try {
      const { data } = await api.get(`/characters/${character.id}`)
      setCharacter(data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleLandmark = (b) => {
    if (b.route === 'modal_dilemma') setShowDilemmaModal(true)
    else navigate(b.route)
  }

  const currentTurn = room?.currentTurn ?? 0
  const lowReserve = character && Number(character.cash) < totalCosts * 3
  const initial = (character?.name?.trim()?.[0] || '?').toUpperCase()

  const objects = []

  TREES.forEach((t, i) =>
    objects.push({
      depth: t.gx + t.gy + 0.4,
      node: <Tree key={`t${i}`} {...t} />,
    })
  )

  HOUSES.forEach((h, i) =>
    objects.push({
      depth: h.gx + h.gy + 0.9,
      node: <House key={`h${i}`} {...h} idx={i} />,
    })
  )

  LANDMARKS.forEach((b) =>
    objects.push({
      depth: b.gx + b.gy + (b.w + b.d) / 2,
      node: <Landmark key={b.id} b={b} onClick={() => handleLandmark(b)} />,
    })
  )

  const plaza = iso(3.5, 3.5, 0)

  objects.push({
    depth: 6.8,
    node: (
      <g key="plaza">
        <ellipse cx={plaza.x} cy={plaza.y} rx={TILE * 1.4} ry={TILE * 0.7} fill="#4b5377" opacity="0.5" />
        <ellipse cx={plaza.x} cy={plaza.y} rx={TILE * 0.45} ry={TILE * 0.22} fill="#6c79b0" />
        <ellipse cx={plaza.x} cy={plaza.y - 2} rx={TILE * 0.28} ry={TILE * 0.14} fill="#9fc7ff" opacity="0.8" />
      </g>
    ),
  })

  const heroBase = iso(4.5, 3.5, 0)

  objects.push({
    depth: 8.5,
    node: (
      <g key="hero" className="hero-pin">
        <ellipse cx={heroBase.x} cy={heroBase.y + 4} rx="16" ry="7" fill="#000" opacity="0.3" />
        <circle cx={heroBase.x} cy={heroBase.y - 34} r="17" fill="url(#heroGrad)" stroke="#fff" strokeOpacity="0.5" strokeWidth="2" />
        <text x={heroBase.x} y={heroBase.y - 29} textAnchor="middle" fontSize="16" fontWeight="800" fill="#fff">
          {initial}
        </text>
        <polygon points={`${heroBase.x - 7},${heroBase.y - 20} ${heroBase.x + 7},${heroBase.y - 20} ${heroBase.x},${heroBase.y - 8}`} fill="url(#heroGrad)" />
      </g>
    ),
  })

  objects.sort((a, b) => a.depth - b.depth)

  const tiles = []

  for (let gx = 0; gx < 8; gx++) {
    for (let gy = 0; gy < 8; gy++) {
      const t = box(gx, gy, 1, 1, 0).top
      const road = isRoad(gx, gy)

      tiles.push(
        <polygon
          key={`tile-${gx}-${gy}`}
          points={P(t)}
          fill={road ? '#39406a' : '#222a4d'}
          stroke={road ? '#454f80' : '#2a3257'}
          strokeWidth="1"
        />
      )
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--theme-bg)] text-white">
      <div className="absolute inset-0 z-0 perspective-grid opacity-15" />

      <div className="pointer-events-none absolute left-[-10%] top-[-15%] z-0 h-[460px] w-[460px] animate-float rounded-full bg-[var(--theme-primary)]/15 blur-[110px]" />
      <div
        className="pointer-events-none absolute bottom-[-15%] right-[-10%] z-0 h-[460px] w-[460px] animate-float rounded-full bg-[var(--theme-secondary)]/15 blur-[110px]"
        style={{ animationDelay: '2s' }}
      />

      <div className="relative z-10">
        <GameHeader />

        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4 pl-20 sm:pl-0">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[var(--theme-muted)]">
                Mapa
              </p>

              <h2 className="mt-1 text-3xl font-black tracking-tight">
                Cidade de Santa Rita
              </h2>

              <p className="mt-1 text-sm text-gray-400">
                Escolha um prédio para interagir.
              </p>
            </div>

            <div className="flex flex-col items-end gap-3">
              <div className="text-right">
                <p className="mb-1 text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                  Mês <span className="text-[var(--theme-secondary)]">{currentTurn}</span> / 12
                </p>

                <div className="flex w-48 gap-1">
                  {Array.from({ length: 12 }).map((_, i) => {
                    const m = i + 1
                    const active = m === currentTurn
                    const done = m < currentTurn

                    return (
                      <div
                        key={m}
                        className={`h-2 flex-1 rounded-full transition-all duration-500 ${active
                            ? 'bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] shadow-[0_0_8px_var(--theme-glow)]'
                            : done
                              ? 'bg-primary/70'
                              : 'bg-white/10'
                          }`}
                      />
                    )
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={handleFinishMonth}
                disabled={character?.turnReady}
                className={`rounded-2xl border px-5 py-2.5 text-sm font-black transition-all active:scale-[0.98] ${character?.turnReady
                    ? 'cursor-not-allowed border-green-500/30 bg-green-600/15 text-green-300'
                    : 'border-primary/40 bg-primary/15 text-white shadow-[0_0_18px_var(--theme-glow)] hover:bg-primary/25'
                  }`}
              >
                {character?.turnReady ? 'Mês finalizado' : 'Encerrar mês'}
              </button>
            </div>
          </div>

          {lowReserve && (
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/40 bg-red-900/20 px-4 py-3 text-sm text-red-300 backdrop-blur-sm">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-red-500/15 text-red-200">
                !
              </span>

              <div>
                <p className="font-semibold text-red-200">
                  Reserva de Emergência Baixa
                </p>

                <p className="mt-0.5 text-xs text-red-300/80">
                  Sem reserva para 3 meses de custos fixos. Considere a Renda Fixa.
                </p>
              </div>
            </div>
          )}

          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-b from-[var(--theme-surface)]/80 to-black/30 shadow-[0_18px_70px_rgba(0,0,0,0.55)] ring-1 ring-white/5 animate-fade-in-up">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(255,255,255,0.06),transparent_40%)]" />

            <svg viewBox="80 -40 800 600" className="relative block h-auto w-full select-none">
              <defs>
                <radialGradient id="heroGrad" cx="50%" cy="35%" r="70%">
                  <stop offset="0%" stopColor="var(--theme-secondary)" />
                  <stop offset="100%" stopColor="var(--theme-primary)" />
                </radialGradient>

                <radialGradient id="boardVignette" cx="50%" cy="42%" r="62%">
                  <stop offset="60%" stopColor="#000" stopOpacity="0" />
                  <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
                </radialGradient>

                <style>{`
                  .landmark {
                    cursor: pointer;
                    transition: transform .25s ease, filter .25s ease;
                    transform-box: fill-box;
                    transform-origin: center;
                  }

                  .landmark:hover {
                    transform: translateY(-9px);
                    filter: drop-shadow(0 10px 14px var(--glow));
                  }

                  .landmark:hover .lm-halo {
                    opacity: .42;
                  }

                  .landmark .lm-icon {
                    transition: transform .25s ease;
                  }

                  .landmark:hover .lm-icon {
                    transform: translateY(-4px);
                  }

                  .hero-pin {
                    animation: heroFloat 3s ease-in-out infinite;
                  }

                  @keyframes heroFloat {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                  }
                `}</style>
              </defs>

              <polygon
                points={P([iso(-0.4, -0.4), iso(8.4, -0.4), iso(8.4, 8.4), iso(-0.4, 8.4)])}
                fill="#171c38"
              />

              {tiles}

              <polygon points={P([iso(3.5, 0), iso(3.6, 0), iso(3.6, 8), iso(3.5, 8)])} fill="#5b6699" opacity="0.5" />
              <polygon points={P([iso(0, 3.5), iso(8, 3.5), iso(8, 3.6), iso(0, 3.6)])} fill="#5b6699" opacity="0.5" />

              {objects.map((o) => o.node)}

              <rect x="80" y="-40" width="800" height="600" fill="url(#boardVignette)" pointerEvents="none" />
            </svg>
          </div>
        </div>
      </div>

      {showDilemmaModal && (
        <DilemmaModal
          onClose={() => setShowDilemmaModal(false)}
          onComplete={handleDilemmaComplete}
        />
      )}
    </div>
  )
}