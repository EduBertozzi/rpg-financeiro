import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useGameStore from '../../store/gameStore'
import api from '../../services/api'
import socket from '../../services/socket'
import GameHeader from '../../components/GameHeader'
import DilemmaModal from '../../components/DilemmaModal'

/* =========================================================================
   PROJEÇÃO ISOMÉTRICA (2:1)
   ========================================================================= */
const TILE = 46          // metade da largura de um tile
const HZ = 26            // altura de 1 unidade vertical
const OX = 480           // origem X (centro)
const OY = 120           // origem Y

const iso = (gx, gy, gz = 0) => ({
  x: OX + (gx - gy) * TILE,
  y: OY + (gx + gy) * (TILE / 2) - gz * HZ,
})
const P = (arr) => arr.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
const facePoint = (P00, P10, P11, P01, u, v) =>
  lerp(lerp(P00, P10, u), lerp(P01, P11, u), v)

/* Faces de uma caixa com base (gx,gy), tamanho (w,d) e altura H */
function box(gx, gy, w, d, H) {
  const T = {
    A: iso(gx, gy, H), B: iso(gx + w, gy, H),
    C: iso(gx + w, gy + d, H), D: iso(gx, gy + d, H),
  }
  const B = {
    a: iso(gx, gy, 0), b: iso(gx + w, gy, 0),
    c: iso(gx + w, gy + d, 0), d: iso(gx, gy + d, 0),
  }
  return {
    top: [T.A, T.B, T.C, T.D],
    east: [T.B, T.C, B.c, B.b],   // face x = gx+w
    south: [T.D, T.C, B.c, B.d],  // face y = gy+d
  }
}

/* Janelinhas distribuídas numa face (quad P00,P10,P11,P01) */
function windows(face, cols, rows, fill, key) {
  const [P00, P10, P11, P01] = face
  const mu = 0.18, mv = 0.16
  const cu = (1 - 2 * mu) / cols
  const cv = (1 - 2 * mv) / rows
  const wu = cu * 0.55, wv = cv * 0.6
  const out = []
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const u = mu + i * cu + (cu - wu) / 2
      const v = mv + j * cv + (cv - wv) / 2
      const a = facePoint(P00, P10, P11, P01, u, v)
      const b = facePoint(P00, P10, P11, P01, u + wu, v)
      const c = facePoint(P00, P10, P11, P01, u + wu, v + wv)
      const d = facePoint(P00, P10, P11, P01, u, v + wv)
      out.push(<polygon key={`${key}-${i}-${j}`} points={P([a, b, c, d])} fill={fill} opacity="0.9" />)
    }
  }
  return out
}

/* =========================================================================
   DADOS DA CIDADE
   ========================================================================= */
const LANDMARKS = [
  {
    id: 'bank', name: 'Banco', icon: '🏦', desc: 'Renda Fixa',
    gx: 3, gy: 0, w: 2, d: 2, H: 3, route: '/bank',
    top: '#3b82f6', south: '#2563eb', east: '#1d4ed8', glow: '#3b82f6', win: '#bfdbfe',
  },
  {
    id: 'companies', name: 'Empresas', icon: '🏢', desc: 'Debêntures',
    gx: 6, gy: 3, w: 2, d: 2, H: 4.4, route: '/companies',
    top: '#a855f7', south: '#9333ea', east: '#7e22ce', glow: '#a855f7', win: '#e9d5ff',
  },
  {
    id: 'university', name: 'Universidade', icon: '🎓', desc: 'Habilidades',
    gx: 3, gy: 6, w: 2, d: 2, H: 3, route: '/skills',
    top: '#eab308', south: '#ca8a04', east: '#a16207', glow: '#eab308', win: '#fef08a',
  },
  {
    id: 'leisure', name: 'Lazer', icon: '🎉', desc: 'Evento do mês',
    gx: 0, gy: 3, w: 2, d: 2, H: 2.4, route: 'modal_dilemma',
    top: '#ec4899', south: '#db2777', east: '#be185d', glow: '#ec4899', win: '#fbcfe8',
  },
]

const HOUSES = [
  { gx: 0, gy: 1 }, { gx: 1, gy: 0 }, { gx: 6, gy: 1 }, { gx: 7, gy: 0 },
  { gx: 0, gy: 6 }, { gx: 1, gy: 7 }, { gx: 6, gy: 6 }, { gx: 7, gy: 7 },
]
const TREES = [
  { gx: 2, gy: 0 }, { gx: 0, gy: 2 }, { gx: 5, gy: 0 }, { gx: 7, gy: 2 },
  { gx: 2, gy: 6 }, { gx: 7, gy: 6 }, { gx: 0, gy: 5 }, { gx: 6, gy: 2 },
  { gx: 2, gy: 7 }, { gx: 5, gy: 7 }, { gx: 1, gy: 2 }, { gx: 6, gy: 0 },
]
const HOUSE_COLORS = [
  { roof: '#5b6b9a', wall: '#3a4570', side: '#2c3358' },
  { roof: '#4f7a8c', wall: '#345561', side: '#27414a' },
  { roof: '#7a5b8c', wall: '#553a61', side: '#412c4a' },
]
const isRoad = (gx, gy) =>
  ((gx === 3 || gx === 4) && gy >= 0 && gy <= 7) ||
  ((gy === 3 || gy === 4) && gx >= 0 && gx <= 7)

/* =========================================================================
   PEÇAS DO MAPA
   ========================================================================= */
function Shadow({ gx, gy, w = 1, d = 1 }) {
  const c = iso(gx + w / 2, gy + d / 2, 0)
  return <ellipse cx={c.x} cy={c.y + 6} rx={TILE * (w + d) * 0.32} ry={TILE * (w + d) * 0.16} fill="#000" opacity="0.28" />
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
  const w = 1, d = 1, H = 1.2, rh = 0.85
  const f = box(gx, gy, w, d, H)
  const A = f.top[0], B = f.top[1], C = f.top[2], D = f.top[3]
  // teto de duas águas (ridge no eixo gx, em gy+d/2)
  const Rl = iso(gx, gy + d / 2, H + rh)
  const Rr = iso(gx + w, gy + d / 2, H + rh)
  return (
    <g>
      <polygon points={P(f.east)} fill={c.side} />
      <polygon points={P(f.south)} fill={c.wall} />
      {/* janela */}
      <polygon
        points={P([
          facePoint(f.south[0], f.south[1], f.south[2], f.south[3], 0.35, 0.32),
          facePoint(f.south[0], f.south[1], f.south[2], f.south[3], 0.62, 0.32),
          facePoint(f.south[0], f.south[1], f.south[2], f.south[3], 0.62, 0.62),
          facePoint(f.south[0], f.south[1], f.south[2], f.south[3], 0.35, 0.62),
        ])}
        fill="#ffe9a8" opacity="0.85"
      />
      {/* telhado */}
      <polygon points={P([D, C, Rr, Rl])} fill={c.roof} />
      <polygon points={P([A, B, Rr, Rl])} fill={c.roof} opacity="0.78" />
      <polygon points={P([B, C, Rr])} fill={c.roof} opacity="0.6" />
    </g>
  )
}

/* Ícones desenhados (sem emoji) — herdam stroke branco do <g> pai */
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
      {/* halo de chão (sinaliza que é clicável) */}
      <ellipse className="lm-halo" cx={ground.x} cy={ground.y + 8} rx={TILE * 1.5} ry={TILE * 0.8} fill={b.glow} opacity="0.18" />
      <Shadow gx={b.gx} gy={b.gy} w={b.w} d={b.d} />

      {/* corpo do prédio */}
      <polygon points={P(f.east)} fill={b.east} />
      <polygon points={P(f.south)} fill={b.south} />
      <polygon points={P(f.top)} fill={b.top} />
      <polygon points={P(f.top)} fill="none" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="1.5" />

      {/* janelas iluminadas */}
      {windows(f.south, 2, Math.max(2, Math.round(b.H)), b.win, `${b.id}-s`)}
      {windows(f.east, 2, Math.max(2, Math.round(b.H)), b.win, `${b.id}-e`)}

      {/* ícone desenhado num badge sobre o telhado */}
      <g transform={`translate(${center.x}, ${center.y - 15})`} className="lm-icon">
        <circle r="16" fill="#0B0D17" opacity="0.92" stroke={b.glow} strokeOpacity="0.85" strokeWidth="2" />
        <g transform="translate(-11, -11)" stroke="#ffffff" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <BuildingIcon kind={b.id} />
        </g>
      </g>

      {/* etiqueta */}
      <g transform={`translate(${center.x}, ${center.y - 46})`} className="lm-label">
        <rect x="-62" y="-16" width="124" height="32" rx="16" fill="#0B0D17" opacity="0.92" stroke={b.glow} strokeOpacity="0.5" />
        <text x="-2" y="-1" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700">{b.name}</text>
        <text x="-2" y="11" textAnchor="middle" fill="#9aa3c0" fontSize="8.5" letterSpacing="0.5">{b.desc.toUpperCase()}  ›</text>
      </g>
    </g>
  )
}

/* =========================================================================
   COMPONENTE PRINCIPAL  (lógica idêntica à original)
   ========================================================================= */
export default function Map() {
  const navigate = useNavigate()
  const { character, room, setCharacter, setRoom } = useGameStore()
  const characterRef = useRef(character)
  const roomRef = useRef(room)
  const [showDilemmaModal, setShowDilemmaModal] = useState(false)

  useEffect(() => { characterRef.current = character }, [character])
  useEffect(() => { roomRef.current = room }, [room])

  const totalCosts = character
    ? Number(character.housingCost) + Number(character.foodCost) +
    Number(character.utilitiesCost) + Number(character.transportCost)
    : 0

  useEffect(() => {
    if (!room?.code) return
    api.get(`/rooms/${room.code}`).then(({ data }) => setRoom(data)).catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.code])

  useEffect(() => {
    if (!character?.id) return
    api.get(`/characters/${character.id}`).then(({ data }) => setCharacter(data)).catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.id])

  useEffect(() => {
    if (!character?.id || !room?.id) return
    socket.connect()
    socket.on('connect', () => {
      socket.emit('room:join', { roomId: roomRef.current.id, characterId: characterRef.current.id })
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
      socket.off('connect'); socket.off('turn:result')
      socket.off('room:finished'); socket.off('connect_error')
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
    } catch (err) { console.error(err) }
  }

  const handleLandmark = (b) => {
    if (b.route === 'modal_dilemma') setShowDilemmaModal(true)
    else navigate(b.route)
  }

  /* ----- derivados de apresentação ----- */
  const monthlyIncome = Number(character?.monthlyIncome ?? 7000)
  const surplus = monthlyIncome - totalCosts
  const currentTurn = room?.currentTurn ?? 0
  const lowReserve = character && Number(character.cash) < totalCosts * 3
  const initial = (character?.name?.trim()?.[0] || '?').toUpperCase()
  const fmt = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  /* ----- objetos do mapa ordenados por profundidade (back→front) ----- */
  const objects = []
  TREES.forEach((t, i) => objects.push({ depth: t.gx + t.gy + 0.4, node: <Tree key={`t${i}`} {...t} /> }))
  HOUSES.forEach((h, i) => objects.push({ depth: h.gx + h.gy + 0.9, node: <House key={`h${i}`} {...h} idx={i} /> }))
  LANDMARKS.forEach((b) =>
    objects.push({ depth: b.gx + b.gy + (b.w + b.d) / 2, node: <Landmark key={b.id} b={b} onClick={() => handleLandmark(b)} /> })
  )
  // praça no centro
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
  // personagem
  const heroBase = iso(4.5, 3.5, 0)
  objects.push({
    depth: 8.5,
    node: (
      <g key="hero" className="hero-pin">
        <ellipse cx={heroBase.x} cy={heroBase.y + 4} rx="16" ry="7" fill="#000" opacity="0.3" />
        <circle cx={heroBase.x} cy={heroBase.y - 34} r="17" fill="url(#heroGrad)" stroke="#fff" strokeOpacity="0.5" strokeWidth="2" />
        <text x={heroBase.x} y={heroBase.y - 29} textAnchor="middle" fontSize="16" fontWeight="800" fill="#fff">{initial}</text>
        <polygon points={`${heroBase.x - 7},${heroBase.y - 20} ${heroBase.x + 7},${heroBase.y - 20} ${heroBase.x},${heroBase.y - 8}`} fill="url(#heroGrad)" />
      </g>
    ),
  })
  objects.sort((a, b) => a.depth - b.depth)

  /* tiles do chão */
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
    <div className="min-h-screen relative overflow-hidden bg-[#0B0D17] text-white">
      {/* atmosfera (mesma identidade do Login) */}
      <div className="absolute inset-0 z-0 perspective-grid opacity-15" />
      <div className="absolute top-[-15%] left-[-10%] w-[460px] h-[460px] bg-blue-600/15 rounded-full blur-[110px] animate-float pointer-events-none z-0" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[460px] h-[460px] bg-purple-600/15 rounded-full blur-[110px] animate-float pointer-events-none z-0" style={{ animationDelay: '2s' }} />

      <div className="relative z-10">
        <GameHeader />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

          {/* topo: título + progresso */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">Cidade de Santa Rita</h2>
              <p className="text-gray-400 text-sm">Clique em um prédio para interagir</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-1">
                Mês <span className="text-primary font-semibold">{currentTurn}</span> / 12
              </p>
              <div className="flex gap-1 w-48">
                {Array.from({ length: 12 }).map((_, i) => {
                  const m = i + 1
                  const active = m === currentTurn, done = m < currentTurn
                  return (
                    <div key={m} className={`h-2 flex-1 rounded-full transition-all duration-500 ${active ? 'bg-gradient-to-r from-blue-400 to-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.6)]'
                        : done ? 'bg-blue-500/70' : 'bg-white/10'}`} />
                  )
                })}
              </div>
            </div>
          </div>

          {lowReserve && (
            <div className="flex items-center gap-3 rounded-2xl border border-red-500/40 bg-red-900/20 backdrop-blur-sm px-4 py-3 text-sm text-red-300">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-semibold text-red-200">Reserva de Emergência Baixa</p>
                <p className="text-xs mt-0.5 text-red-300/80">Sem reserva para 3 meses de custos fixos. Considere a Renda Fixa.</p>
              </div>
            </div>
          )}

          {/* ===== O MAPA ===== */}
          <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-[#10142a] to-[#0a0c1a] ring-1 ring-white/5 shadow-[0_8px_40px_rgba(0,0,0,0.5)] overflow-hidden animate-fade-in-up">
            <svg viewBox="80 -10 800 540" className="w-full h-auto block select-none">
              <defs>
                <radialGradient id="heroGrad" cx="50%" cy="35%" r="70%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#9333ea" />
                </radialGradient>
                <radialGradient id="boardVignette" cx="50%" cy="42%" r="62%">
                  <stop offset="60%" stopColor="#000" stopOpacity="0" />
                  <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
                </radialGradient>
                <style>{`
                  .landmark { cursor: pointer; transition: transform .25s ease, filter .25s ease; }
                  .landmark:hover { transform: translateY(-9px); filter: drop-shadow(0 10px 14px var(--glow)); }
                  .landmark:hover .lm-halo { opacity: .42; }
                  .landmark .lm-icon { transition: transform .25s ease; }
                  .landmark:hover .lm-icon { transform: translateY(-4px); }
                  .hero-pin { animation: heroFloat 3s ease-in-out infinite; }
                  @keyframes heroFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
                `}</style>
              </defs>

              {/* base do tabuleiro */}
              <polygon
                points={P([iso(-0.4, -0.4), iso(8.4, -0.4), iso(8.4, 8.4), iso(-0.4, 8.4)])}
                fill="#171c38"
              />
              {/* tiles */}
              {tiles}
              {/* faixas centrais da rua */}
              <polygon points={P([iso(3.5, 0), iso(3.6, 0), iso(3.6, 8), iso(3.5, 8)])} fill="#5b6699" opacity="0.5" />
              <polygon points={P([iso(0, 3.5), iso(8, 3.5), iso(8, 3.6), iso(0, 3.6)])} fill="#5b6699" opacity="0.5" />

              {/* objetos 3D ordenados */}
              {objects.map((o) => o.node)}

              {/* vinheta */}
              <rect x="80" y="-10" width="800" height="540" fill="url(#boardVignette)" pointerEvents="none" />
            </svg>
          </div>

          {/* resumo financeiro */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5">
              <p className="text-xs text-gray-400 mb-1.5">Salário Mensal</p>
              <p className="text-green-400 font-bold text-xl">{fmt(monthlyIncome)}</p>
            </div>
            <div className="group relative rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5">
              <p className="text-xs text-gray-400 mb-1.5 flex items-center gap-1">Custos Fixos <span className="cursor-help opacity-60">ℹ️</span></p>
              <p className="text-red-400 font-bold text-xl">{fmt(totalCosts)}</p>
              <div className="hidden group-hover:block absolute top-full left-0 mt-2 w-72 p-4 bg-[#0B0D17] border border-white/10 rounded-xl shadow-2xl z-50 text-xs space-y-1.5 backdrop-blur-xl">
                <div className="flex justify-between"><span className="text-gray-400">Jorge (Aluguel)</span><span>{fmt(character?.housingCost || 0)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Mercadinho (Alimentação)</span><span>{fmt(character?.foodCost || 0)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Hidroluz (Água/Luz)</span><span>{fmt(character?.utilitiesCost || 0)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">InaNet (Internet/Telefonia)</span><span>{fmt(character?.transportCost || 0)}</span></div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5">
              <p className="text-xs text-gray-400 mb-1.5">Sobra por Mês</p>
              <p className={`font-bold text-xl ${surplus >= 0 ? 'text-primary' : 'text-red-400'}`}>{fmt(surplus)}</p>
            </div>
          </div>

          {/* finalizar mês */}
          <div className="flex justify-end">
            <button
              onClick={handleFinishMonth}
              disabled={character?.turnReady}
              className={`px-8 py-3.5 font-bold rounded-xl transition-all duration-300 tracking-wide ${character?.turnReady
                  ? 'bg-green-600/20 text-green-300 cursor-not-allowed border border-green-500/30'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] hover:-translate-y-0.5'
                }`}
            >
              {character?.turnReady ? '✓ Mês finalizado!' : 'Finalizar Mês →'}
            </button>
          </div>

        </div>
      </div>

      {showDilemmaModal && (
        <DilemmaModal onClose={() => setShowDilemmaModal(false)} onComplete={handleDilemmaComplete} />
      )}
    </div>
  )
}