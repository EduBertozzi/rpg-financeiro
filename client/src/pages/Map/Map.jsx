import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useGameStore from '../../store/gameStore'
import api from '../../services/api'
import socket from '../../services/socket'
import GameLayout from '../../components/GameLayout'
import DilemmaModal from '../../components/DilemmaModal'
import BillModal from '../../components/BillModal'
import CityScene from './CityScene'
import bankArt from '../../assets/buildings/bank.png'
import leisureArt from '../../assets/buildings/leisure.png'
import universityArt from '../../assets/buildings/university.png'
import mercadinhoArt from '../../assets/buildings/mercadinho.png'
import utilitiesArt from '../../assets/buildings/utilities.png'
import internetArt from '../../assets/buildings/internet.png'

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

const IconClose = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

const PANEL = 'rounded-2xl border border-white/15 bg-[color-mix(in_srgb,var(--theme-bg)_82%,transparent)] shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md'

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
    title: 'Universidade',
    desc: 'Na Universidade fica o Cruzeiro, sua constelação de habilidades: cada estrela dá uma vantagem financeira de verdade.',
  },
]

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const BUILDINGS = [
  {
    id: 'bank',
    name: 'Banco',
    desc: 'Renda Fixa, Ações e Empresas',
    art: bankArt,
    glow: 'rgba(59,130,246,0.55)',
    route: '/bank',
  },
  {
    id: 'leisure',
    name: 'Lazer',
    desc: 'Eventos mensais obrigatórios',
    art: leisureArt,
    glow: 'rgba(236,72,153,0.55)',
    route: 'modal_dilemma',
    requiredPrefix: 'Dilema',
  },
  {
    id: 'mercadinho',
    name: 'Mercadinho',
    desc: 'Compras do mês',
    art: mercadinhoArt,
    glow: 'rgba(34,197,94,0.55)',
    route: 'modal_bill_food',
    requiredPrefix: 'Conta: Mercadinho',
  },
  {
    id: 'utilities',
    name: 'Água e Luz',
    desc: 'Conta mensal fixa',
    art: utilitiesArt,
    glow: 'rgba(234,179,8,0.55)',
    route: 'modal_bill_utilities',
    requiredPrefix: 'Conta: Água e Luz',
  },
  {
    id: 'internet',
    name: 'Internet e Celular',
    desc: 'Conta mensal fixa',
    art: internetArt,
    glow: 'rgba(34,211,238,0.55)',
    route: 'modal_bill_transport',
    requiredPrefix: 'Conta: Internet e Celular',
  },
  {
    id: 'university',
    name: 'Universidade',
    desc: 'Constelação de habilidades',
    art: universityArt,
    glow: 'rgba(168,85,247,0.55)',
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
  const [showGuide, setShowGuideState] = useState(() => {
    try {
      return localStorage.getItem('map:showGuide') === '1'
    } catch {
      return false
    }
  })
  const setShowGuide = (open) => {
    setShowGuideState(open)
    try {
      localStorage.setItem('map:showGuide', open ? '1' : '0')
    } catch {
      // sem storage: só não lembra a preferência
    }
  }
  const mapScrollRef = useRef(null)

  // no celular o mapa rola na horizontal; começa centralizado na cidade
  useEffect(() => {
    const el = mapScrollRef.current
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
  }, [])

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
  const monthName = MONTHS[currentTurn - 1]

  const sceneBuildings = BUILDINGS.map((b) => ({
    ...b,
    name: b.id === 'leisure' && monthName ? `Lazer de ${monthName}` : b.name,
    required: !!b.requiredPrefix && currentTurn > 0,
    done: !!b.requiredPrefix && isActionDone(b.requiredPrefix),
  }))
  const checklist = sceneBuildings.filter((b) => b.required)
  const doneCount = checklist.filter((b) => b.done).length

  return (
    <GameLayout>
      {/* A cidade é o fundo da tela; os painéis flutuam por cima dela. */}
      <div ref={mapScrollRef} className="fixed inset-y-0 left-20 right-0 z-0 overflow-x-auto overflow-y-hidden">
        <div className={`h-full min-w-[760px] transition-[filter,opacity] duration-500 ${isWaiting ? 'pointer-events-none opacity-60 blur-[3px]' : ''}`}>
          <CityScene buildings={sceneBuildings} onSelect={handleBuilding} interactive={!isWaiting} />
        </div>
      </div>

      <div className="pointer-events-none relative z-10 flex min-h-screen flex-col justify-between gap-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex w-full max-w-xs flex-col gap-3">
            <div className={`pointer-events-auto ${PANEL} px-5 py-4`}>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--theme-muted)]">Mapa</p>
              <h2 className="mt-0.5 text-2xl font-black tracking-tight">Cidade de Santa Rita</h2>
              <p className="mt-1 hidden text-xs text-gray-300 sm:block">Passe o mouse pela cidade e clique num prédio para entrar.</p>
            </div>

          </div>

          {!isWaiting && (
            <div className={`pointer-events-auto flex flex-col items-end gap-3 ${PANEL} px-5 py-4`}>
              <div className="text-right">
                <p className="mb-1 text-xs font-black uppercase tracking-[0.2em] text-gray-300">
                  {monthName ?? 'Mês'} · <span className="text-[var(--theme-secondary)]">{currentTurn}</span> / 12
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
                              : 'bg-white/15'
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
                    : 'border-primary/40 bg-primary/25 text-white shadow-[0_0_18px_var(--theme-glow)] hover:bg-primary/40 hover:border-primary/70 hover:shadow-[0_0_28px_var(--theme-glow)] hover:-translate-y-0.5'
                  }`}
              >
                {character?.turnReady ? 'Mês finalizado' : 'Encerrar mês'}
              </button>
            </div>
          )}
        </div>

        {isWaiting && (
          <div className="pointer-events-auto mx-auto max-w-md rounded-3xl border border-white/10 bg-[var(--theme-bg)]/90 p-8 text-center backdrop-blur-md animate-fade-in-up">
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
        )}

        <div className="flex items-end justify-between gap-4">
          {!isWaiting && checklist.length > 0 && (
            <div className={`pointer-events-auto hidden w-64 sm:block ${PANEL} p-4`}>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--theme-muted)]">
                Checklist de {monthName}
              </p>
              <p className="mt-0.5 text-sm font-black text-white">{doneCount}/{checklist.length} concluídos</p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {checklist.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => handleBuilding(b)}
                      className="flex w-full items-center gap-2 rounded-lg px-1 py-0.5 text-left text-xs transition-colors hover:bg-white/5 cursor-pointer"
                    >
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${b.done ? 'border-green-400 bg-green-500 text-white' : 'border-yellow-400/60 text-transparent'}`}>
                        <IconCheck className="h-3 w-3" />
                      </span>
                      <span className={b.done ? 'text-gray-500 line-through' : 'text-gray-200'}>{b.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="ml-auto">
            {showGuide ? (
              <div className={`pointer-events-auto hidden w-72 lg:block ${PANEL} p-5 animate-fade-in-up`}>
                <div className="mb-4 flex items-center gap-2">
                  <IconGuide className="h-5 w-5 text-[var(--theme-secondary)]" />
                  <h3 className="flex-1 text-sm font-black uppercase tracking-[0.2em] text-white">Guia Rápido</h3>
                  <button
                    type="button"
                    onClick={() => setShowGuide(false)}
                    aria-label="Fechar guia rápido"
                    className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    <IconClose className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-col gap-4">
                  {GUIDE_TIPS.map((tip) => (
                    <div key={tip.title} className="border-l-2 border-white/15 pl-3">
                      <p className="text-sm font-bold text-white">{tip.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-gray-300">{tip.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowGuide(true)}
                className={`pointer-events-auto hidden items-center gap-2 lg:flex ${PANEL} px-4 py-2.5 text-xs font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-white/10 cursor-pointer`}
              >
                <IconGuide className="h-4 w-4 text-[var(--theme-secondary)]" /> Guia Rápido
              </button>
            )}
          </div>
        </div>
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
