import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import useGameStore from '../../store/gameStore'
import api from '../../services/api'
import socket from '../../services/socket'
import { leaveDeletedRoom } from '../../services/roomGone'
import GameLayout from '../../components/GameLayout'
import DilemmaModal from '../../components/DilemmaModal'
import Bank from '../Bank/Bank'
import LeisureModal from '../../components/LeisureModal'
import TurnSummaryModal from '../../components/TurnSummaryModal'
import TurnScene from '../../components/TurnScene'
import { sfx } from '../../services/sound'
import Tour from '../../components/Tour'
import { tourKey } from './tourSteps'
import { TASK_EVENT, pointsLeft } from '../../components/sidebarData'
import { TOUR_EVENT } from '../../components/howToPlaySteps'
import { refreshStanding, useMonthClock } from '../../components/hudHooks'
import { FinishMonthModal, MonthClosedCard } from '../../components/MonthEnd'
import WalkLock from '../../components/WalkLock'
import { loadWalkLock, saveWalkLock, savePendingWalk, takePendingWalk } from '../../components/walkTimer'
import BillModal from '../../components/BillModal'
import CityScene from './CityScene'
import CouponModal from '../../components/CouponModal'
import { weatherFor } from './weather'
import bankArt from '../../assets/buildings/bank.png'
import leisureArt from '../../assets/buildings/leisure.png'
import treeArt from '../../assets/buildings/tree.png'
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
    name: 'Inabank',
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
    name: 'Árvore de habilidades',
    desc: 'Pontos viram vantagens',
    company: 'university',
    art: treeArt,
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
  // foi olhar o banco no meio do dilema (volta ao abrir o mapa de novo)
  const [dilemmaAway, setDilemmaAway] = useState(false)
  // painéis recolhíveis ("A cidade" e o checklist), lembrados neste navegador
  const [fold, setFold] = useState(() => {
    try { return JSON.parse(localStorage.getItem('map:fold')) ?? {} } catch { return {} }
  })
  const toggleFold = (key) => setFold((f) => {
    const next = { ...f, [key]: !f[key] }
    try { localStorage.setItem('map:fold', JSON.stringify(next)) } catch { /* sem storage */ }
    return next
  })
  const [bankSide, setBankSide] = useState(false) // banco aberto ao lado da carta do dilema
  // respondeu: o cartão do resultado fica aberto até o jogador fechar
  const [dilemmaHold, setDilemmaHold] = useState(false)
  const phaseRef = useRef('month')
  const mapScrollRef = useRef(null)

  // no celular o mapa rola na horizontal; começa centralizado na cidade
  // (de novo um pouco depois: a cidade termina de montar depois do primeiro quadro)
  useEffect(() => {
    const center = () => {
      const el = mapScrollRef.current
      if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
    }
    center()
    const ids = [requestAnimationFrame(center), setTimeout(center, 250), setTimeout(center, 900)]
    return () => { cancelAnimationFrame(ids[0]); clearTimeout(ids[1]); clearTimeout(ids[2]) }
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
    socket.on('room:deleted', () => leaveDeletedRoom(useGameStore))
    // alguém encerrou, respondeu ou o professor pausou: relê o relógio
    socket.on('room:clock', () => refreshStanding())

    return () => {
      socket.off('connect')
      socket.off('turn:result')
      socket.off('room:clock')
      socket.off('room:finished')
      socket.off('room:deleted')
      socket.off('connect_error')
      socket.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.id, room?.id])

  const isActionDone = (prefix) =>
    character?.eventLog?.some((log) => log.turn === room?.currentTurn && log.description.startsWith(prefix))

  // Encerrar o mês: primeiro o pop-up (o que falta e o que vem depois)
  const [finishing, setFinishing] = useState(false)
  const [finishBusy, setFinishBusy] = useState(false)
  const confirmFinish = async () => {
    setFinishBusy(true)
    try {
      const { data } = await api.patch(`/characters/${character.id}/ready`)
      setCharacter({ ...character, turnReady: true, readyAt: data.readyAt })
      setFinishing(false)
      sfx.bell()
      refreshStanding()
    } catch (err) {
      console.error(err)
      setNotice(err.response?.data?.error || 'Não deu para encerrar o mês. Tente de novo.')
    } finally {
      setFinishBusy(false)
    }
  }

  const handleDilemmaComplete = async (result) => {
    setShowDilemmaModal(false)
    setDilemmaHold(false)
    // ir a pé em agosto: chega atrasado e perde o começo do mês seguinte
    if (result?.lockSeconds > 0) savePendingWalk(character.id, room.currentTurn + 1, result.lockSeconds)
    refreshStanding()

    try {
      const { data } = await api.get(`/characters/${character.id}`)
      setCharacter(data)
    } catch (err) {
      console.error(err)
    }
  }

  // Começo do mês: primeiro a cena e o resumo da virada (o imprevisto, as
  // consequências, o que ficou em aberto), em janeiro o tour, e então a
  // caminhada de quem foi a pé no mês passado. O dilema vem no fim do mês.
  const [turnSummary, setTurnSummary] = useState(null)
  const [showSummary, setShowSummary] = useState(false)
  const [showScene, setShowScene] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const startPendingWalk = (characterId, turn) => {
    const seconds = takePendingWalk(characterId, turn)
    if (seconds > 0) setWalkUntil(saveWalkLock(characterId, turn, seconds))
  }
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
        if (until) setWalkUntil(until)
        if (summary && !summarySeen(character.id, turn)) {
          // de fevereiro em diante a virada abre com a cena; depois vem o resumo
          if (turn > 1) setShowScene(true)
          else setShowSummary(true)
        } else if (turn === 1 && !tourSeen(character.id)) setShowTour(true)
        else if (!until) startPendingWalk(character.id, turn)
      })
      .catch(() => setDilemmaInfo(null))
  }, [character?.id, room?.currentTurn, room?.status])

  const closeTour = () => {
    setShowTour(false)
    markTourSeen(character.id)
    startPendingWalk(character.id, room.currentTurn)
  }

  const closeSummary = () => {
    setShowSummary(false)
    markSummarySeen(character.id, room.currentTurn)
    // janeiro: o tour do mês de aprender
    if (room.currentTurn === 1 && !tourSeen(character.id)) return setShowTour(true)
    startPendingWalk(character.id, room.currentTurn)
  }

  // aviso curto no mapa (cidade fechada, erro ao encerrar)
  const [notice, setNotice] = useState('')
  useEffect(() => {
    if (!notice) return
    const id = setTimeout(() => setNotice(''), 3200)
    return () => clearTimeout(id)
  }, [notice])

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
    const closed = phaseRef.current !== 'month'
    if (b.route === 'modal_dilemma') {
      if (closed) setDilemmaAway(false)
      else setFinishing(true)
      return
    }
    // mês encerrado: a cidade fechou (o banco e a árvore continuam abertos)
    if (closed && b.route.startsWith('modal_')) return setNotice('A cidade fechou: este mês já foi encerrado.')
    if (b.route === 'modal_leisure') setShowLeisure(true)
    else if (b.route.startsWith('modal_bill_')) setActiveBill(b.route.replace('modal_bill_', ''))
    else navigate(b.route)
  }

  // os ícones de tarefa da barra lateral abrem a tarefa aqui
  useEffect(() => {
    const ROUTES = { dilemma: 'modal_dilemma', leisure: 'modal_leisure', food: 'modal_bill_food', utilities: 'modal_bill_utilities', internet: 'modal_bill_transport' }
    const onTask = (e) => {
      const route = ROUTES[e.detail?.id]
      if (!route || roomRef.current?.status !== 'active') return
      const closed = phaseRef.current !== 'month'
      if (route === 'modal_dilemma') {
        if (closed) setDilemmaAway(false)
        else setFinishing(true)
      } else if (closed) setNotice('A cidade fechou: este mês já foi encerrado.')
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
    // pontos para gastar: a árvore ganha um selo roxo com o número
    points: b.id === 'university' && currentTurn > 0 ? pointsLeft(character?.skillPoints) : 0,
    // o banco brilha quando há dinheiro investido; a árvore cresce com as habilidades
    invested: b.id === 'bank' && ((character?.fixedInvestments ?? []).some((f) => !f.redeemedAt) || (character?.positions ?? []).some((p) => Number(p.quantity) > 0)),
    skills: b.id === 'university' ? (character?.unlockedSkills ?? []).length : 0,
  }))
  const hasDilemma = dilemmaInfo?.turn === currentTurn && dilemmaInfo.exists
  const answered = Boolean(isActionDone('Dilema'))
  const tasks = sceneBuildings.filter((b) => b.required)
  // o checklist é só lazer e contas; o dilema chega depois de encerrar
  const checklist = tasks
  const doneCount = checklist.filter((b) => b.done).length
  const missing = tasks.filter((b) => !b.done).map((b) => (b.id === 'leisure' ? 'Lazer' : b.name))

  // Fase do mês: aberto → dilema (cidade fechada) → esperando a turma
  const playing = room?.status === 'active' && currentTurn > 0
  const clock = useMonthClock(room?.id, playing, answered)
  const phase = playing ? clock?.phase ?? (character?.turnReady ? (hasDilemma && !answered ? 'dilemma' : 'done') : 'month') : 'month'
  const locked = playing && phase !== 'month'
  const busyIntro = showScene || showSummary || showTour || Boolean(walkUntil)
  const dilemmaOpen = locked && phase === 'dilemma' && hasDilemma && !answered && !dilemmaAway && !busyIntro
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])
  // "Acessar o banco" na carta: a tela se divide (banco à esquerda, dilema à direita)
  const toggleBankSide = () => {
    sfx.click()
    setBankSide((open) => !open)
  }

  return (
    <GameLayout>
      {/* A cidade é o fundo da tela; os painéis flutuam por cima dela. */}
      <div ref={mapScrollRef} className="fixed inset-x-0 top-0 bottom-[64px] z-0 overflow-x-auto overflow-y-hidden sm:bottom-0 sm:left-20">
        <div inert={isWaiting || locked} className={`h-full min-w-[760px] transition-[filter,opacity] duration-500 ${isWaiting ? 'pointer-events-none opacity-60 blur-[3px]' : locked ? 'pointer-events-none opacity-75 blur-[2px] saturate-50' : ''}`}>
          <CityScene buildings={sceneBuildings} onSelect={handleBuilding} interactive={!isWaiting} month={sceneMonth} coupon={coupon} onCoupon={handleCoupon} />
        </div>
      </div>

      <div className="pointer-events-none relative z-10 flex min-h-screen flex-col justify-between gap-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex w-full max-w-xs flex-col gap-3">
            {fold.info ? (
              <button type="button" onClick={() => toggleFold('info')} className={`pointer-events-auto hidden self-start sm:flex ${PANEL} items-center gap-2 px-4 py-2 font-toy text-[17px] font-extrabold text-[#2457C5] cursor-pointer`} aria-label="Mostrar o painel da cidade">
                A cidade <Chevron down />
              </button>
            ) : (
              <div className={`pointer-events-auto relative hidden sm:block ${PANEL} px-5 py-4`}>
                <FoldButton onClick={() => toggleFold('info')} label="Recolher o painel da cidade" />
                <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#8A9680]">Mapa</p>
                <h2 className="font-toy text-[26px] font-extrabold leading-tight text-[#2457C5]">A cidade</h2>
                <p className="mt-0.5 hidden text-xs text-[#6B7A62] sm:block">Passe o mouse pela cidade e clique num prédio para entrar.</p>
              </div>
            )}

          </div>

          {!isWaiting && (
            <div data-tour-m="checklist" className={`pointer-events-auto mt-12 flex flex-col items-end gap-3 ${PANEL} px-5 py-4`}>
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
                onClick={() => { sfx.click(); setFinishing(true) }}
                data-tour="encerrar"
                disabled={locked}
                className={`rounded-[16px] px-5 py-2 font-toy text-[17px] font-extrabold transition-transform cursor-pointer disabled:cursor-not-allowed ${locked
                    ? 'bg-[#E2F4E5] text-[#2B8C41]'
                    : 'bg-[#3DBE5A] text-white shadow-[0_5px_0_#2B8C41] hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_1px_0_#2B8C41]'
                  }`}
              >
                {locked ? 'Mês encerrado' : 'Encerrar mês'}
              </button>
            </div>
          )}
        </div>

        {locked && !dilemmaOpen && !busyIntro && (
          <MonthClosedCard turn={currentTurn} clock={clock} onDilemma={() => setDilemmaAway(false)} />
        )}

        {notice && (
          <p role="status" className="pointer-events-none fixed left-1/2 top-6 z-[65] -translate-x-1/2 rounded-full bg-[#24331F] px-5 py-2 text-sm font-extrabold text-white shadow-lg animate-fade-in-up">{notice}</p>
        )}

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
          {!isWaiting && checklist.length > 0 && fold.list && (
            <button type="button" data-tour="checklist" onClick={() => toggleFold('list')} className={`pointer-events-auto hidden items-center gap-2 sm:flex ${PANEL} px-4 py-2 font-toy text-[16px] font-extrabold cursor-pointer`} aria-label="Mostrar o checklist do mês">
              Checklist <span className={doneCount === checklist.length ? 'text-[#2B8C41]' : 'text-[#C98A12]'}>{doneCount}/{checklist.length}</span> <Chevron />
            </button>
          )}
          {!isWaiting && checklist.length > 0 && !fold.list && (
            <div data-tour="checklist" className={`pointer-events-auto relative hidden w-64 sm:block ${PANEL} p-4`}>
              <FoldButton onClick={() => toggleFold('list')} label="Recolher o checklist" down />
              <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#8A9680]">
                Checklist de {monthName}
              </p>
              <p className="font-toy text-[18px] font-extrabold">{doneCount}/{checklist.length} concluídos</p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {checklist.map((b) => (
                  <li key={b.id} className="flex w-full items-center gap-2 px-1 py-0.5 text-[13px] font-semibold">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${b.done ? 'border-[#3DBE5A] bg-[#3DBE5A] text-white' : 'border-[#F2B53A] text-transparent'}`}>
                        <IconCheck className="h-3 w-3" />
                      </span>
                      <span className={b.done ? 'text-[#A9B19E] line-through' : 'text-[#24331F]'}>{b.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {(dilemmaOpen || dilemmaHold || showDilemmaModal) && (
        <DilemmaModal
          onClose={() => setShowDilemmaModal(false)}
          onComplete={handleDilemmaComplete}
          onAnswered={() => setDilemmaHold(true)}
          timeLeft={clock?.dilemmaLeft ?? null}
          onBank={toggleBankSide}
          side={bankSide && !dilemmaHold ? <Bank embedded /> : null}
        />
      )}

      {finishing && !locked && (
        <FinishMonthModal
          turn={currentTurn}
          missing={missing}
          hasDilemma={hasDilemma}
          timeLeft={clock?.monthLeft ?? null}
          busy={finishBusy}
          onConfirm={confirmFinish}
          onCancel={() => setFinishing(false)}
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

      {walkUntil && <WalkLock until={walkUntil} total={120} onDone={clearWalk} />}

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

// setinha dos painéis recolhíveis
function Chevron({ down = false }) {
  return (
    <svg viewBox="0 0 20 20" className={`h-4 w-4 transition-transform ${down ? '' : 'rotate-180'}`} aria-hidden="true">
      <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// botão de recolher no canto do painel
function FoldButton({ onClick, label, down = false }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title="Recolher" className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full text-[#8A9680] transition-colors hover:bg-[#F1EBDD] hover:text-[#24331F] cursor-pointer">
      <Chevron down={down} />
    </button>
  )
}
