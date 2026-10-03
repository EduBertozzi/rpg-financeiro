import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import useGameStore from '../../store/gameStore'
import api from '../../services/api'
import socket from '../../services/socket'
import GameLayout from '../../components/GameLayout'
import DilemmaModal from '../../components/DilemmaModal'
import LeisureModal from '../../components/LeisureModal'
import TurnSummaryModal from '../../components/TurnSummaryModal'
import TurnScene from '../../components/TurnScene'
import { sfx } from '../../services/sound'
import Tour from '../../components/Tour'
import { tourKey } from './tourSteps'
import { TASK_EVENT } from '../../components/sidebarData'
import { TOUR_EVENT } from '../../components/howToPlaySteps'
import { refreshStanding } from '../../components/hudHooks'
import WalkLock from '../../components/WalkLock'
import { loadWalkLock, saveWalkLock } from '../../components/walkTimer'
import BillModal from '../../components/BillModal'
import CityScene from './CityScene'
import CouponModal from '../../components/CouponModal'
import { weatherFor } from './weather'
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
const PANEL = 'rounded-[24px] bg-[#FFFDF7]/95 text-[#24331F] shadow-[0_6px_0_#E2D6BE,0_16px_36px_rgba(36,51,31,0.2)] backdrop-blur'

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const BUILDINGS = [
  {
    id: 'bank',
    name: 'Banco Maré',
    desc: 'Renda Fixa, Ações e Empresas',
    company: 'bank',
    art: bankArt,
    glow: 'rgba(59,130,246,0.55)',
    route: '/bank',
  },
  {
    id: 'leisure',
    name: 'Lazer',
    desc: 'Praça do Coreto · lazer do mês',
    company: 'leisure',
    art: leisureArt,
    glow: 'rgba(236,72,153,0.55)',
    route: 'modal_leisure',
    requiredPrefix: 'Lazer:',
  },
  {
    id: 'mercadinho',
    name: 'Mercadinho',
    desc: 'da Dona Cida · compras do mês',
    company: 'mercadinho',
    art: mercadinhoArt,
    glow: 'rgba(34,197,94,0.55)',
    route: 'modal_bill_food',
    requiredPrefix: 'Conta: Mercadinho',
  },
  {
    id: 'utilities',
    name: 'Água e Luz',
    desc: 'Sapucaí Água e Luz · conta do mês',
    company: 'utilities',
    art: utilitiesArt,
    glow: 'rgba(234,179,8,0.55)',
    route: 'modal_bill_utilities',
    requiredPrefix: 'Conta: Água e Luz',
  },
  {
    id: 'internet',
    name: 'Internet e Celular',
    desc: 'Vale Conecta · conta do mês',
    company: 'internet',
    art: internetArt,
    glow: 'rgba(34,211,238,0.55)',
    route: 'modal_bill_transport',
    requiredPrefix: 'Conta: Internet e Celular',
  },
  {
    id: 'university',
    name: 'Universidade',
    desc: 'Constelação de habilidades',
    company: 'university',
    art: universityArt,
    glow: 'rgba(168,85,247,0.55)',
    route: '/skills',
  },
]

// o resumo da virada abre sozinho uma vez por mês; depois, pelo painel do mês
const summaryKey = (characterId, turn) => `virada:${characterId}:${turn}`
function summarySeen(characterId, turn) {
  try {
    return localStorage.getItem(summaryKey(characterId, turn)) === '1'
  } catch {
    return false
  }
}
// o tour do primeiro mês abre uma vez por personagem
function tourSeen(characterId) {
  try {
    return localStorage.getItem(tourKey(characterId)) === '1'
  } catch {
    return false
  }
}
function markTourSeen(characterId) {
  try {
    localStorage.setItem(tourKey(characterId), '1')
  } catch {
    // sem storage: o tour pode abrir de novo
  }
}

function markSummarySeen(characterId, turn) {
  try {
    localStorage.setItem(summaryKey(characterId, turn), '1')
  } catch {
    // sem storage: o resumo pode abrir de novo depois de um F5
  }
}

export default function Map() {
  const navigate = useNavigate()
  const { character, room, setCharacter, setRoom } = useGameStore()
  const characterRef = useRef(character)
  const roomRef = useRef(room)
  const [showDilemmaModal, setShowDilemmaModal] = useState(false)
  const [showLeisure, setShowLeisure] = useState(false)
  const [dilemmaInfo, setDilemmaInfo] = useState(null) // { turn, exists }
  const [walkUntil, setWalkUntil] = useState(null)
  const [activeBill, setActiveBill] = useState(null)
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

      refreshStanding()
      // o resumo da virada e o dilema do mês novo abrem pelo efeito do mês (abaixo)
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
      const missing = checklist.filter((b) => !b.done)

      if (missing.length > 0) {
        alert(`Você precisa completar antes de finalizar o mês: ${missing.map((b) => b.name).join(', ')}`)
        return
      }
    }

    try {
      await api.patch(`/characters/${character.id}/ready`)
      setCharacter({ ...character, turnReady: true })
      refreshStanding()
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.error || 'Erro ao finalizar mês!')
    }
  }

  const handleDilemmaComplete = async (result) => {
    setShowDilemmaModal(false)
    // ir a pé em agosto: a tela fica parada por alguns segundos
    if (result?.lockSeconds > 0) setWalkUntil(saveWalkLock(character.id, room.currentTurn, result.lockSeconds))

    try {
      const { data } = await api.get(`/characters/${character.id}`)
      setCharacter(data)
    } catch (err) {
      console.error(err)
    }
  }

  // Começo do mês: primeiro o resumo da virada (o imprevisto, as consequências,
  // o que ficou em aberto), depois o dilema, se ainda não foi respondido.
  const [turnSummary, setTurnSummary] = useState(null)
  const [showSummary, setShowSummary] = useState(false)
  const [showScene, setShowScene] = useState(false)
  const [dilemmaPending, setDilemmaPending] = useState(false)
  const [showTour, setShowTour] = useState(false)
  useEffect(() => {
    if (!character?.id || !room?.currentTurn || room?.status !== 'active') return
    const turn = room.currentTurn
    Promise.all([
      api.get(`/characters/${character.id}/dilemma/${turn}`),
      api.get(`/characters/${character.id}/turn-summary/${turn}`).catch(() => ({ data: null })),
    ])
      .then(([{ data }, { data: summary }]) => {
        setDilemmaInfo({ turn, exists: !!data.dilemma })
        setTurnSummary(summary)
        // quem deu F5 no meio da caminhada continua andando
        const until = loadWalkLock(character.id, turn)
        if (until) return setWalkUntil(until)
        const pending = Boolean(data.dilemma && !data.alreadyAnswered)
        if (summary && !summarySeen(character.id, turn)) {
          setDilemmaPending(pending)
          // de fevereiro em diante a virada abre com a cena; depois vem o resumo
          if (turn > 1) setShowScene(true)
          else setShowSummary(true)
        } else if (turn === 1 && !tourSeen(character.id)) {
          setDilemmaPending(pending)
          setShowTour(true)
        } else if (pending) setShowDilemmaModal(true)
      })
      .catch(() => setDilemmaInfo(null))
  }, [character?.id, room?.currentTurn, room?.status])

  const closeTour = () => {
    setShowTour(false)
    markTourSeen(character.id)
    if (dilemmaPending) {
      setDilemmaPending(false)
      setShowDilemmaModal(true)
    }
  }

  const closeSummary = () => {
    setShowSummary(false)
    markSummarySeen(character.id, room.currentTurn)
    // janeiro: o tour do mês de aprender vem antes do primeiro dilema
    if (room.currentTurn === 1 && !tourSeen(character.id)) return setShowTour(true)
    if (dilemmaPending) {
      setDilemmaPending(false)
      setShowDilemmaModal(true)
    }
  }

  // cupom escondido do mês (o servidor só diz se tem e onde, nunca o prêmio)
  const [couponState, setCoupon] = useState(null) // { turn, id, spot }
  const [couponReward, setCouponReward] = useState(null)
  const turnNow = room?.currentTurn ?? 0
  const coupon = couponState?.turn === turnNow ? couponState : null

  useEffect(() => {
    if (!character?.id || !turnNow || room?.status !== 'active') return
    api.get(`/characters/${character.id}/coupon/${turnNow}`)
      .then(({ data }) => setCoupon(data.coupon ? { ...data.coupon, turn: turnNow } : null))
      .catch(() => setCoupon(null))
  }, [character?.id, turnNow, room?.status])

  const handleCoupon = async () => {
    try {
      const { data } = await api.post(`/characters/${character.id}/coupon/${turnNow}/claim`)
      setCoupon(null)
      setCouponReward(data.reward)
      const { data: fresh } = await api.get(`/characters/${character.id}`)
      setCharacter(fresh)
    } catch (err) {
      setCoupon(null)
      console.error(err)
    }
  }

  const clearWalk = useCallback(() => setWalkUntil(null), [])

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
    sfx.click()
    if (b.route === 'modal_dilemma') setShowDilemmaModal(true)
    else if (b.route === 'modal_leisure') setShowLeisure(true)
    else if (b.route.startsWith('modal_bill_')) setActiveBill(b.route.replace('modal_bill_', ''))
    else navigate(b.route)
  }

  // os ícones de tarefa da barra lateral abrem a tarefa aqui
  useEffect(() => {
    const ROUTES = { dilemma: 'modal_dilemma', leisure: 'modal_leisure', food: 'modal_bill_food', utilities: 'modal_bill_utilities', internet: 'modal_bill_transport' }
    const onTask = (e) => {
      const route = ROUTES[e.detail?.id]
      if (!route || roomRef.current?.status !== 'active') return
      if (route === 'modal_dilemma') setShowDilemmaModal(true)
      else if (route === 'modal_leisure') setShowLeisure(true)
      else setActiveBill(route.replace('modal_bill_', ''))
    }
    const onTour = () => roomRef.current?.status === 'active' && setShowTour(true)
    window.addEventListener(TASK_EVENT, onTask)
    window.addEventListener(TOUR_EVENT, onTour)
    return () => {
      window.removeEventListener(TASK_EVENT, onTask)
      window.removeEventListener(TOUR_EVENT, onTour)
    }
  }, [])

  const currentTurn = room?.currentTurn ?? 0
  const isWaiting = room?.status === 'waiting'
  const activeBillBuilding = BUILDINGS.find((b) => b.route === `modal_bill_${activeBill}`)
  const monthName = MONTHS[currentTurn - 1]
  // em desenvolvimento, /map?clima=7 mostra o clima de julho para conferir
  const previewMonth = import.meta.env.DEV ? Number(new URLSearchParams(window.location.search).get('clima')) || 0 : 0
  const sceneMonth = isWaiting ? 0 : previewMonth || currentTurn
  const weather = weatherFor(sceneMonth)

  const sceneBuildings = BUILDINGS.map((b) => ({
    ...b,
    name: b.id === 'leisure' && monthName ? `Lazer de ${monthName}` : b.name,
    required: !!b.requiredPrefix && currentTurn > 0,
    done: !!b.requiredPrefix && isActionDone(b.requiredPrefix),
  }))
  const hasDilemma = dilemmaInfo?.turn === currentTurn && dilemmaInfo.exists
  const dilemmaItem = { id: 'dilemma', name: 'Dilema do mês', route: 'modal_dilemma', required: true, done: isActionDone('Dilema') }
  const checklist = [...(hasDilemma ? [dilemmaItem] : []), ...sceneBuildings.filter((b) => b.required)]
  const doneCount = checklist.filter((b) => b.done).length

  return (
    <GameLayout>
      {/* A cidade é o fundo da tela; os painéis flutuam por cima dela. */}
      <div ref={mapScrollRef} className="fixed inset-y-0 left-20 right-0 z-0 overflow-x-auto overflow-y-hidden">
        <div inert={isWaiting} className={`h-full min-w-[760px] transition-[filter,opacity] duration-500 ${isWaiting ? 'pointer-events-none opacity-60 blur-[3px]' : ''}`}>
          <CityScene buildings={sceneBuildings} onSelect={handleBuilding} interactive={!isWaiting} month={sceneMonth} coupon={coupon} onCoupon={handleCoupon} />
        </div>
      </div>

      <div className="pointer-events-none relative z-10 flex min-h-screen flex-col justify-between gap-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex w-full max-w-xs flex-col gap-3">
            <div className={`pointer-events-auto ${PANEL} px-5 py-4`}>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#8A9680]">Mapa</p>
              <h2 className="font-toy text-[26px] font-extrabold leading-tight text-[#2457C5]">Cidade de Santa Rita</h2>
              <p className="mt-0.5 hidden text-xs text-[#6B7A62] sm:block">Passe o mouse pela cidade e clique num prédio para entrar.</p>
            </div>

          </div>

          {!isWaiting && (
            <div className={`pointer-events-auto flex flex-col items-end gap-3 ${PANEL} px-5 py-4`}>
              <div className="text-right">
                <p className="font-toy text-[17px] font-extrabold text-[#24331F]">
                  {monthName ?? 'Mês'} · <span className="text-[#2457C5]">{currentTurn}</span><span className="text-[#A9B19E]"> / 12</span>
                </p>
                {weather && (
                  <p className="mb-1.5 text-xs font-bold text-[#6B7A62]">
                    <span aria-hidden="true">{weather.icon}</span> {weather.season} · {weather.label}
                  </p>
                )}
                {currentTurn === 1 && (
                  <button type="button" onClick={() => setShowTour(true)} className="mb-1.5 mr-3 text-xs font-extrabold text-[#2457C5] underline decoration-dotted underline-offset-2 cursor-pointer">
                    Rever o tour
                  </button>
                )}
                {turnSummary?.turn === currentTurn && (
                  <button type="button" onClick={() => setShowSummary(true)} className="mb-1.5 text-xs font-extrabold text-[#2457C5] underline decoration-dotted underline-offset-2 cursor-pointer">
                    O que aconteceu na virada
                  </button>
                )}

                <div className="flex w-48 gap-1">
                  {Array.from({ length: 12 }).map((_, i) => {
                    const m = i + 1
                    const active = m === currentTurn
                    const done = m < currentTurn

                    return (
                      <div
                        key={m}
                        className={`h-2 flex-1 rounded-full transition-all duration-500 ${active
                            ? 'bg-[#2457C5]'
                            : done
                              ? 'bg-[#3DBE5A]'
                              : 'bg-[#EFE6D3]'
                          }`}
                      />
                    )
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={handleFinishMonth}
                data-tour="encerrar"
                disabled={character?.turnReady}
                className={`rounded-[16px] px-5 py-2 font-toy text-[17px] font-extrabold transition-transform cursor-pointer disabled:cursor-not-allowed ${character?.turnReady
                    ? 'bg-[#E2F4E5] text-[#2B8C41]'
                    : 'bg-[#3DBE5A] text-white shadow-[0_5px_0_#2B8C41] hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_1px_0_#2B8C41]'
                  }`}
              >
                {character?.turnReady ? 'Mês finalizado' : 'Encerrar mês'}
              </button>
            </div>
          )}
        </div>

        {isWaiting && (
          <div className={`pointer-events-auto mx-auto max-w-md ${PANEL} p-8 text-center animate-fade-in-up`}>
            <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#FDF1D6] text-[#C98A12]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 animate-pulse">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 3" />
              </svg>
            </span>
            <h3 className="mt-4 font-toy text-2xl font-extrabold">Aguardando início da partida</h3>
            <p className="mt-2 text-sm text-[#6B7A62]">
              O administrador ainda não iniciou a sala. Assim que a partida começar, a cidade fica disponível e o mês 1 tem início automaticamente.
            </p>
            <p className="mt-4 font-mono text-sm font-bold tracking-[0.2em] text-[#8A9680]">
              Sala {room?.code}
            </p>
          </div>
        )}

        <div className="flex items-end justify-between gap-4">
          {!isWaiting && checklist.length > 0 && (
            <div data-tour="checklist" className={`pointer-events-auto hidden w-64 sm:block ${PANEL} p-4`}>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#8A9680]">
                Checklist de {monthName}
              </p>
              <p className="font-toy text-[18px] font-extrabold">{doneCount}/{checklist.length} concluídos</p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {checklist.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => handleBuilding(b)}
                      className="flex w-full items-center gap-2 rounded-lg px-1 py-0.5 text-left text-[13px] font-semibold transition-colors hover:bg-[#F1EBDD] cursor-pointer"
                    >
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${b.done ? 'border-[#3DBE5A] bg-[#3DBE5A] text-white' : 'border-[#F2B53A] text-transparent'}`}>
                        <IconCheck className="h-3 w-3" />
                      </span>
                      <span className={b.done ? 'text-[#A9B19E] line-through' : 'text-[#24331F]'}>{b.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {showDilemmaModal && (
        <DilemmaModal
          onClose={() => setShowDilemmaModal(false)}
          onComplete={handleDilemmaComplete}
        />
      )}

      {showScene && turnSummary && (
        <TurnScene
          turn={turnSummary.turn}
          net={turnSummary.net}
          onDone={() => {
            setShowScene(false)
            setShowSummary(true)
          }}
        />
      )}

      {showSummary && turnSummary && <TurnSummaryModal summary={turnSummary} onClose={closeSummary} />}

      {showTour && <Tour onDone={closeTour} />}

      {showLeisure && (
        <LeisureModal
          onClose={() => setShowLeisure(false)}
          onComplete={() => {
            setShowLeisure(false)
            handleBillComplete()
          }}
        />
      )}

      {walkUntil && <WalkLock until={walkUntil} onDone={clearWalk} />}

      {couponReward && <CouponModal reward={couponReward} onClose={() => setCouponReward(null)} />}

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
