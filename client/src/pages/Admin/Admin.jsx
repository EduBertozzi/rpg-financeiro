import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import useGameStore from '../../store/gameStore'
import socket from '../../services/socket'

const IconShield = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 3 4 6.5V11c0 4.9 3.4 9.1 8 10 4.6-.9 8-5.1 8-10V6.5L12 3Z" />
  </svg>
)
const IconLogout = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M10 17l5-5-5-5" />
    <path d="M15 12H3" />
    <path d="M21 19V5a2 2 0 0 0-2-2h-5" />
  </svg>
)
const IconMap = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3z" />
    <path d="M9 3v15M15 6v15" />
  </svg>
)
const IconPlus = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)
const IconPlay = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" {...p}>
    <path d="M8 5v14l11-7-11-7Z" />
  </svg>
)
const IconSkip = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M5 5v14l9-7-9-7Z" fill="currentColor" stroke="none" />
    <path d="M19 5v14" />
  </svg>
)
const IconRefresh = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
)
const IconCheck = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="m5 13 4 4L19 7" />
  </svg>
)
const IconHourglass = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M6 3h12M6 21h12" />
    <path d="M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9" />
  </svg>
)
const IconTrophy = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M8 21h8M12 17v4" />
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
    <path d="M7 5H4a3 3 0 0 0 3 5M17 5h3a3 3 0 0 1-3 5" />
  </svg>
)
const IconBolt = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" {...p}>
    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
  </svg>
)

function StatCard({ label, value, tone = 'default' }) {
  const toneCls = {
    default: 'text-white',
    green: 'text-green-300',
    yellow: 'text-yellow-300',
    gray: 'text-gray-400',
  }[tone]

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="mb-1 text-xs text-gray-400">{label}</p>
      <p className={`font-bold ${toneCls}`}>{value}</p>
    </div>
  )
}

export default function Admin() {
  const navigate = useNavigate()
  const { character, room, setRoom, logout } = useGameStore()
  const [roomData, setRoomData] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [turnResult, setTurnResult] = useState(null)
  const [newRoomCode, setNewRoomCode] = useState('')

  const fetchRoom = async () => {
    if (!room?.code) return
    try {
      const { data } = await api.get(`/rooms/${room.code}`)
      setRoomData(data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreateRoom = async () => {
    setLoading(true)
    try {
      const { data } = await api.post('/rooms', { maxTurns: 12 })
      setRoom(data)
      setNewRoomCode('')
      window.location.reload()
    } catch {
      alert('Erro ao criar sala!')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinRoom = async () => {
    try {
      const { data } = await api.get(`/rooms/${newRoomCode}`)
      setRoom(data)
      setNewRoomCode('')
      window.location.reload()
    } catch {
      alert('Sala não encontrada!')
    }
  }

  const fetchLeaderboard = async () => {
    if (!room?.id) return
    try {
      const { data } = await api.get(`/rooms/${room.id}/leaderboard`)
      setLeaderboard(data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (!room?.id) return
    const load = async () => {
      await Promise.all([fetchRoom(), fetchLeaderboard()])
    }
    load()

    socket.connect()
    socket.emit('room:join', { roomId: room.id, characterId: 'admin' })

    return () => socket.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id])

  const handleStart = async () => {
    setLoading(true)
    setMessage({ text: '', type: '' })
    try {
      const { data } = await api.post(`/rooms/${room.id}/start`)
      setRoom({ ...room, ...data })
      setMessage({ text: 'Partida iniciada!', type: 'success' })
      fetchRoom()
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Erro ao iniciar', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleNextTurn = async () => {
    setLoading(true)
    setMessage({ text: '', type: '' })
    setTurnResult(null)
    try {
      const { data } = await api.post(`/rooms/${room.id}/next-turn`)
      setTurnResult(data)
      setRoom({ ...room, currentTurn: data.turn })
      setMessage({ text: `Turno ${data.turn} processado!`, type: 'success' })
      socket.emit('turn:broadcast', { roomId: room.id, result: data })
      fetchRoom()
      fetchLeaderboard()
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Erro ao processar turno', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const readyCount = roomData?.characters?.filter(c => c.turnReady).length ?? 0
  const totalPlayers = roomData?.characters?.length ?? 0
  const allReady = totalPlayers > 0 && readyCount === totalPlayers

  const statusLabel = roomData?.status === 'waiting' ? 'Aguardando' : roomData?.status === 'active' ? 'Em andamento' : 'Finalizada'
  const statusTone = roomData?.status === 'waiting' ? 'yellow' : roomData?.status === 'active' ? 'green' : 'gray'

  return (
    <div className="relative min-h-screen overflow-hidden bg-darker text-white">
      <div className="absolute inset-0 z-0 perspective-grid opacity-15" />
      <div className="pointer-events-none absolute left-[-10%] top-[-15%] z-0 h-[460px] w-[460px] animate-float rounded-full bg-primary/15 blur-[110px]" />
      <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] z-0 h-[460px] w-[460px] animate-float rounded-full bg-purple-500/15 blur-[110px]" style={{ animationDelay: '2s' }} />

      <div className="relative z-10">
        <div className="border-b border-white/10 bg-white/[0.035] px-6 py-4 backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-primary/40 bg-primary/15">
                <IconShield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-black">Painel Admin</h1>
                <p className="text-xs text-gray-400">Controle da sessão de jogo</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs text-gray-400">Código da sala</p>
                <p className="font-mono text-lg font-bold text-white">{room?.code ?? '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Turno atual</p>
                <p className="text-lg font-bold text-primary">{roomData?.currentTurn ?? 0}/{roomData?.maxTurns ?? 12}</p>
              </div>

              {character && (
                <button
                  type="button"
                  onClick={() => navigate('/map')}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-black/20 text-gray-400 transition-colors hover:border-primary/50 hover:text-white cursor-pointer"
                  title="Voltar ao Mapa"
                  aria-label="Voltar ao Mapa"
                >
                  <IconMap className="h-5 w-5" />
                </button>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="grid h-10 w-10 place-items-center rounded-xl border border-red-400/20 bg-red-500/10 text-red-300 transition-colors hover:border-red-400/40 hover:bg-red-500/15 cursor-pointer"
                title="Sair"
                aria-label="Sair"
              >
                <IconLogout className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="border-b border-white/10 bg-yellow-500/[0.06] px-6 py-3">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium text-yellow-300">Acessar sala existente:</p>
              <input
                type="text"
                value={newRoomCode}
                onChange={(e) => setNewRoomCode(e.target.value.toUpperCase())}
                className="w-32 rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 font-mono text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                placeholder="Código"
                maxLength={6}
              />
              <button
                onClick={handleJoinRoom}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-600 transition-colors cursor-pointer"
              >
                Entrar
              </button>
            </div>
            <button
              onClick={handleCreateRoom}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-1.5 text-sm font-bold text-white shadow-lg transition-colors hover:bg-green-500 disabled:opacity-50 cursor-pointer"
            >
              <IconPlus className="h-4 w-4" />
              {loading ? 'Criando...' : 'Criar Nova Sala'}
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-5xl space-y-6 p-6 sm:p-8">

          {message.text && (
            <div className={`flex items-center gap-2 rounded-xl border p-3 text-sm ${message.type === 'error' ? 'border-red-500/50 bg-red-900/30 text-red-300' : 'border-green-500/50 bg-green-900/30 text-green-300'}`}>
              {message.type === 'error' ? null : <IconCheck className="h-4 w-4 shrink-0" />}
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Status" value={statusLabel} tone={statusTone} />
            <StatCard label="Jogadores" value={totalPlayers} />
            <StatCard label="Prontos" value={`${readyCount}/${totalPlayers}`} tone={allReady ? 'green' : 'yellow'} />
            <StatCard label="Turno" value={`${roomData?.currentTurn ?? 0}/${roomData?.maxTurns ?? 12}`} />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
            <h2 className="mb-4 text-lg font-bold">Controles</h2>
            <div className="flex flex-wrap gap-3">
              {roomData?.status === 'waiting' && (
                <button
                  onClick={handleStart}
                  disabled={loading || totalPlayers === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-600 disabled:opacity-50 cursor-pointer"
                >
                  <IconPlay className="h-4 w-4" />
                  {loading ? 'Iniciando...' : 'Iniciar Partida'}
                </button>
              )}
              {roomData?.status === 'active' && (
                <button
                  onClick={handleNextTurn}
                  disabled={loading}
                  className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold text-white transition-colors cursor-pointer disabled:opacity-50 ${allReady ? 'bg-primary hover:bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                >
                  <IconSkip className="h-4 w-4" />
                  {loading ? 'Processando...' : `Processar Turno ${(roomData?.currentTurn ?? 0) + 1}`}
                </button>
              )}
              <button
                onClick={() => { fetchRoom(); fetchLeaderboard() }}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-gray-400 transition-colors hover:text-white cursor-pointer"
              >
                <IconRefresh className="h-4 w-4" />
                Atualizar
              </button>
            </div>
            {roomData?.status === 'active' && !allReady && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-yellow-400">
                <IconHourglass className="h-3.5 w-3.5" />
                Aguardando {totalPlayers - readyCount} jogador(es) finalizar o mês
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
            <h2 className="mb-4 text-lg font-bold">Jogadores na Sala</h2>
            {totalPlayers === 0 ? (
              <p className="text-sm text-gray-400">Nenhum jogador ainda. Compartilhe o código: <span className="font-mono text-primary">{room?.code}</span></p>
            ) : (
              <div className="space-y-2">
                {roomData?.characters?.map(char => (
                  <div key={char.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3">
                    <span className="font-medium text-white">{char.name}</span>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${char.turnReady ? 'border-green-700 bg-green-900/40 text-green-400' : 'border-yellow-700 bg-yellow-900/40 text-yellow-400'}`}>
                      {char.turnReady ? <IconCheck className="h-3 w-3" /> : <IconHourglass className="h-3 w-3" />}
                      {char.turnReady ? 'Pronto' : 'Jogando'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {turnResult && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
              <h2 className="mb-4 text-lg font-bold">Resultado do Turno {turnResult.turn}</h2>
              {turnResult.dilemma && (
                <div className="mb-4 rounded-xl border border-yellow-700 bg-yellow-900/20 p-4">
                  <p className="mb-1 flex items-center gap-1.5 font-semibold text-yellow-400">
                    <IconBolt className="h-4 w-4" />
                    Dilema do mês: {turnResult.dilemma.title}
                  </p>
                  <p className="text-sm text-gray-300">{turnResult.dilemma.description}</p>
                </div>
              )}
              <div className="space-y-2">
                {turnResult.results?.map(r => (
                  <div key={r.characterId} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3">
                    <div>
                      <p className="font-medium text-white">{r.characterName}</p>
                      <p className="text-xs text-gray-400">{r.event?.title}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${r.cashDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {r.cashDelta >= 0 ? '+' : ''}R$ {Number(r.cashDelta).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-gray-400">
                        Patrimônio: R$ {Number(r.netWorth).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {leaderboard.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                <IconTrophy className="h-5 w-5 text-yellow-400" />
                Leaderboard
              </h2>
              <div className="space-y-2">
                {leaderboard.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-500'}`}>
                        #{i + 1}
                      </span>
                      <span className="font-medium text-white">{entry.characterName}</span>
                    </div>
                    <span className="font-bold text-green-400">
                      R$ {Number(entry.netWorth).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
