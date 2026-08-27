import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useGameStore from '../../store/gameStore'
import api from '../../services/api'
import socket from '../../services/socket'
import GameLayout from '../../components/GameLayout'
import DilemmaModal from '../../components/DilemmaModal'
import BillModal from '../../components/BillModal'
import bankArt from '../../assets/buildings/bank.png'
import leisureArt from '../../assets/buildings/leisure.png'
import universityArt from '../../assets/buildings/university.png'
import mercadinhoArt from '../../assets/buildings/mercadinho.png'
import utilitiesArt from '../../assets/buildings/utilities.png'
import internetArt from '../../assets/buildings/internet.png'

const IconArrow = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)
const IconCheck = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="m5 13 4 4L19 7" />
  </svg>
)
const IconGuide = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 3 3 7l9 4 9-4-9-4Z" />
    <path d="M3 12l9 4 9-4" />
    <path d="M3 17l9 4 9-4" />
  </svg>
)

const GUIDE_TIPS = [
  {
    title: 'Prédios obrigatórios',
    desc: 'Lazer e as contas mensais (Mercadinho, Água e Luz, Internet) precisam ser resolvidos antes de encerrar o mês.',
  },
  {
    title: 'Diversifique investimentos',
    desc: 'No Banco você encontra Renda Fixa, Ações e Empresas — cada uma com riscos e retornos diferentes.',
  },
  {
    title: 'Patrimônio decide o ranking',
    desc: 'Ao final do mês 12, quem tiver o maior patrimônio líquido vence a partida.',
  },
  {
    title: 'Estude na Universidade',
    desc: 'A árvore de habilidades desbloqueia vantagens que ajudam sua estratégia financeira.',
  },
]

const BUILDINGS = [
  {
    id: 'bank',
    name: 'Banco',
    desc: 'Renda Fixa, Ações e Empresas',
    art: bankArt,
    glow: 'rgba(59,130,246,0.55)',
    ring: 'group-hover:border-blue-400/60',
    badge: 'text-blue-300 bg-blue-500/10 border-blue-400/30',
    route: '/bank',
  },
  {
    id: 'leisure',
    name: 'Lazer',
    desc: 'Eventos mensais obrigatórios',
    art: leisureArt,
    glow: 'rgba(236,72,153,0.55)',
    ring: 'group-hover:border-pink-400/60',
    badge: 'text-pink-300 bg-pink-500/10 border-pink-400/30',
    route: 'modal_dilemma',
    requiredPrefix: 'Dilema',
  },
  {
    id: 'mercadinho',
    name: 'Mercadinho',
    desc: 'Compras do mês',
    art: mercadinhoArt,
    glow: 'rgba(34,197,94,0.55)',
    ring: 'group-hover:border-green-400/60',
    badge: 'text-green-300 bg-green-500/10 border-green-400/30',
    route: 'modal_bill_food',
    requiredPrefix: 'Conta: Mercadinho',
  },
  {
    id: 'utilities',
    name: 'Água e Luz',
    desc: 'Conta mensal fixa',
    art: utilitiesArt,
    glow: 'rgba(234,179,8,0.55)',
    ring: 'group-hover:border-yellow-400/60',
    badge: 'text-yellow-300 bg-yellow-500/10 border-yellow-400/30',
    route: 'modal_bill_utilities',
    requiredPrefix: 'Conta: Água e Luz',
  },
  {
    id: 'internet',
    name: 'Internet e Celular',
    desc: 'Conta mensal fixa',
    art: internetArt,
    glow: 'rgba(34,211,238,0.55)',
    ring: 'group-hover:border-cyan-400/60',
    badge: 'text-cyan-300 bg-cyan-500/10 border-cyan-400/30',
    route: 'modal_bill_transport',
    requiredPrefix: 'Conta: Internet e Celular',
  },
  {
    id: 'university',
    name: 'Universidade',
    desc: 'Árvore de Habilidades',
    art: universityArt,
    glow: 'rgba(168,85,247,0.55)',
    ring: 'group-hover:border-purple-400/60',
    badge: 'text-purple-300 bg-purple-500/10 border-purple-400/30',
    route: '/skills',
  },
]

export default function Map() {
  const navigate = useNavigate()
  const { character, room, setCharacter, setRoom } = useGameStore()
  const characterRef = useRef(character)
  const roomRef = useRef(room)
  const [showDilemmaModal, setShowDilemmaModal] = useState(false)
  const [activeBill, setActiveBill] = useState(null)

  useEffect(() => {
    characterRef.current = character
  }, [character])

  useEffect(() => {
    roomRef.current = room
  }, [room])

  useEffect(() => {
    if (!room?.code) return

    api.get(`/rooms/${room.code}`)
      .then(({ data }) => setRoom(data))
      .catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.code])

  useEffect(() => {
    if (!room?.code || room.status !== 'waiting') return

    const interval = setInterval(() => {
      api.get(`/rooms/${room.code}`)
        .then(({ data }) => setRoom(data))
        .catch(console.error)
    }, 4000)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.code, room?.status])

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

  const isActionDone = (prefix) =>
    character?.eventLog?.some((log) => log.turn === room?.currentTurn && log.description.startsWith(prefix))

  const handleFinishMonth = async () => {
    if (room?.currentTurn > 0) {
      const missing = BUILDINGS.filter((b) => b.requiredPrefix && !isActionDone(b.requiredPrefix))

      if (missing.length > 0) {
        alert(`Você precisa completar antes de finalizar o mês: ${missing.map((b) => b.name).join(', ')}`)
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

  const handleBillComplete = async () => {
    setActiveBill(null)

    try {
      const { data } = await api.get(`/characters/${character.id}`)
      setCharacter(data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleBuilding = (b) => {
    if (b.route === 'modal_dilemma') setShowDilemmaModal(true)
    else if (b.route.startsWith('modal_bill_')) setActiveBill(b.route.replace('modal_bill_', ''))
    else navigate(b.route)
  }

  const currentTurn = room?.currentTurn ?? 0
  const isWaiting = room?.status === 'waiting'
  const activeBillBuilding = BUILDINGS.find((b) => b.route === `modal_bill_${activeBill}`)

  return (
    <GameLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 xl:flex xl:items-start xl:gap-6">
      <div className="min-w-0 flex-1">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
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

          {!isWaiting && (
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
                className={`rounded-2xl border px-5 py-2.5 text-sm font-black transition-all active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed ${character?.turnReady
                    ? 'border-green-500/30 bg-green-600/15 text-green-300'
                    : 'border-primary/40 bg-primary/15 text-white shadow-[0_0_18px_var(--theme-glow)] hover:bg-primary/25 hover:border-primary/70 hover:shadow-[0_0_28px_var(--theme-glow)] hover:-translate-y-0.5'
                  }`}
              >
                {character?.turnReady ? 'Mês finalizado' : 'Encerrar mês'}
              </button>
            </div>
          )}
        </div>

        {isWaiting ? (
          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-b from-[var(--theme-surface)]/80 to-black/30 p-10 text-center shadow-[0_18px_70px_rgba(0,0,0,0.55)] ring-1 ring-white/5 animate-fade-in-up sm:p-16">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(255,255,255,0.06),transparent_45%)]" />
            <div className="relative mx-auto max-w-md">
              <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full border border-yellow-400/30 bg-yellow-500/10 text-yellow-300">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 animate-pulse">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 3" />
                </svg>
              </span>
              <h3 className="mt-4 text-xl font-black text-white">Aguardando início da partida</h3>
              <p className="mt-2 text-sm text-gray-400">
                O administrador ainda não iniciou a sala. Assim que a partida começar, a cidade fica disponível e o mês 1 tem início automaticamente.
              </p>
              <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-[var(--theme-muted)]">
                Sala {room?.code}
              </p>
            </div>
          </div>
        ) : (
        <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-b from-[var(--theme-surface)]/80 to-black/30 p-6 shadow-[0_18px_70px_rgba(0,0,0,0.55)] ring-1 ring-white/5 animate-fade-in-up sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(255,255,255,0.06),transparent_45%)]" />

          <div className="relative grid grid-cols-1 gap-5 sm:grid-cols-2">
            {BUILDINGS.map((b, index) => {
              const done = b.requiredPrefix && isActionDone(b.requiredPrefix)
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleBuilding(b)}
                  className={`group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] text-left transition-all duration-300 hover:-translate-y-1.5 cursor-pointer active:scale-[0.98] ${b.ring} animate-fade-in-up`}
                  style={{ animationDelay: `${index * 0.08}s` }}
                >
                  <div
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ boxShadow: `inset 0 0 70px ${b.glow}` }}
                  />

                  <div className="relative flex h-48 items-center justify-center overflow-hidden bg-black/20">
                    <div
                      className="absolute inset-0 opacity-60 transition-opacity duration-300 group-hover:opacity-90"
                      style={{ background: `radial-gradient(circle at 50% 40%, ${b.glow}, transparent 65%)` }}
                    />
                    <img
                      src={b.art}
                      alt=""
                      className="relative h-40 w-40 object-contain drop-shadow-[0_16px_24px_rgba(0,0,0,0.6)] transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-1"
                    />
                  </div>

                  <div className="relative flex flex-1 items-center justify-between gap-3 p-5">
                    <div className="min-w-0">
                      {done ? (
                        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-green-300 bg-green-500/10 border-green-400/30">
                          <IconCheck className="h-3 w-3" /> Concluído
                        </span>
                      ) : (
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${b.badge}`}>
                          {b.requiredPrefix ? 'Obrigatório' : 'Distrito'}
                        </span>
                      )}
                      <h4 className="mt-1.5 text-lg font-black text-white">{b.name}</h4>
                      <p className="mt-0.5 text-sm text-gray-400">{b.desc}</p>
                    </div>

                    <IconArrow className="h-5 w-5 shrink-0 text-gray-600 transition-all group-hover:translate-x-1 group-hover:text-white" />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
        )}
      </div>

      <aside className="mt-6 hidden xl:mt-0 xl:block xl:w-72 xl:shrink-0">
        <div className="sticky top-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[var(--theme-surface)]/80 to-black/30 p-5 shadow-[0_18px_70px_rgba(0,0,0,0.4)] ring-1 ring-white/5">
          <div className="mb-4 flex items-center gap-2">
            <IconGuide className="h-5 w-5 text-[var(--theme-secondary)]" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Guia Rápido</h3>
          </div>

          <div className="flex flex-col gap-4">
            {GUIDE_TIPS.map((tip) => (
              <div key={tip.title} className="border-l-2 border-white/10 pl-3">
                <p className="text-sm font-bold text-white">{tip.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-400">{tip.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>
      </div>

      {showDilemmaModal && (
        <DilemmaModal
          onClose={() => setShowDilemmaModal(false)}
          onComplete={handleDilemmaComplete}
        />
      )}

      {activeBill && activeBillBuilding && (
        <BillModal
          type={activeBill}
          label={activeBillBuilding.name}
          onClose={() => setActiveBill(null)}
          onComplete={handleBillComplete}
        />
      )}
    </GameLayout>
  )
}
