import { useState, useEffect } from 'react'
import api from '../../services/api'
import useGameStore from '../../store/gameStore'
import socket from '../../services/socket'

export default function Admin() {
  const { room, setRoom } = useGameStore()
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
    } catch (err) {
      alert('Erro ao criar sala!')
    } finally {
      setLoading(false)
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

  const readyCount = roomData?.characters?.filter(c => c.turnReady).length ?? 0
  const totalPlayers = roomData?.characters?.length ?? 0
  const allReady = totalPlayers > 0 && readyCount === totalPlayers

  return (
    <div className="min-h-screen bg-darker text-white">

      <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">🛡️ Painel Admin</h1>
          <p className="text-xs text-gray-400">Controle da sessão de jogo</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-gray-400">Código da sala</p>
            <p className="text-white font-mono font-bold text-lg">{room?.code}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Turno atual</p>
            <p className="text-primary font-bold text-lg">{roomData?.currentTurn ?? 0}/{roomData?.maxTurns ?? 12}</p>
          </div>
        </div>
      </div>

      <div className="bg-yellow-900/20 border-b border-yellow-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-yellow-400 text-sm font-medium">Acessar sala existente:</p>
          <input
            type="text"
            value={newRoomCode}
            onChange={(e) => setNewRoomCode(e.target.value.toUpperCase())}
            className="px-3 py-1 bg-dark border border-border rounded-lg text-white text-sm font-mono w-32 focus:outline-none focus:border-primary"
            placeholder="Código"
            maxLength={6}
          />
          <button
            onClick={async () => {
              try {
                const { data } = await api.get(`/rooms/${newRoomCode}`)
                setRoom(data)
                setNewRoomCode('')
                window.location.reload()
              } catch {
                alert('Sala não encontrada!')
              }
            }}
            className="px-3 py-1 bg-primary text-white text-sm rounded-lg"
          >
            Entrar
          </button>
        </div>
        <button
          onClick={handleCreateRoom}
          disabled={loading}
          className="px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors shadow-lg"
        >
          {loading ? 'Criando...' : '➕ Criar Nova Sala'}
        </button>
      </div>

      <div className="max-w-5xl mx-auto p-8 space-y-6">

        {message.text && (
          <div className={`p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-900/30 border border-red-500/50 text-red-400' : 'bg-green-900/30 border border-green-500/50 text-green-400'}`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Status</p>
            <p className={`font-bold ${
              roomData?.status === 'waiting' ? 'text-yellow-400' :
              roomData?.status === 'active' ? 'text-green-400' : 'text-gray-400'
            }`}>
              {roomData?.status === 'waiting' ? 'Aguardando' :
               roomData?.status === 'active' ? 'Em andamento' : 'Finalizada'}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Jogadores</p>
            <p className="text-white font-bold">{totalPlayers}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Prontos</p>
            <p className={`font-bold ${allReady ? 'text-green-400' : 'text-yellow-400'}`}>
              {readyCount}/{totalPlayers}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Turno</p>
            <p className="text-primary font-bold">{roomData?.currentTurn ?? 0}/{roomData?.maxTurns ?? 12}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Controles</h2>
          <div className="flex gap-3">
            {roomData?.status === 'waiting' && (
              <button
                onClick={handleStart}
                disabled={loading || totalPlayers === 0}
                className="px-6 py-3 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
              >
                {loading ? 'Iniciando...' : '▶ Iniciar Partida'}
              </button>
            )}
            {roomData?.status === 'active' && (
              <button
                onClick={handleNextTurn}
                disabled={loading}
                className={`px-6 py-3 font-semibold rounded-lg transition-colors text-white ${
                  allReady ? 'bg-primary hover:bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                } disabled:opacity-50`}
              >
                {loading ? 'Processando...' : `⏭ Processar Turno ${(roomData?.currentTurn ?? 0) + 1}`}
              </button>
            )}
            <button
              onClick={() => { fetchRoom(); fetchLeaderboard() }}
              className="px-4 py-3 border border-border text-gray-400 hover:text-white rounded-lg transition-colors"
            >
              🔄 Atualizar
            </button>
          </div>
          {roomData?.status === 'active' && !allReady && (
            <p className="text-yellow-400 text-xs mt-2">
              ⚠ Aguardando {totalPlayers - readyCount} jogador(es) finalizar o mês
            </p>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Jogadores na Sala</h2>
          {totalPlayers === 0 ? (
            <p className="text-gray-400 text-sm">Nenhum jogador ainda. Compartilhe o código: <span className="font-mono text-primary">{room?.code}</span></p>
          ) : (
            <div className="space-y-2">
              {roomData?.characters?.map(char => (
                <div key={char.id} className="flex items-center justify-between p-3 bg-dark rounded-lg border border-border">
                  <span className="text-white font-medium">{char.name}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${char.turnReady ? 'bg-green-900/40 text-green-400 border border-green-700' : 'bg-yellow-900/40 text-yellow-400 border border-yellow-700'}`}>
                    {char.turnReady ? '✓ Pronto' : '⏳ Jogando'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {turnResult && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Resultado do Turno {turnResult.turn}</h2>
            {turnResult.dilemma && (
              <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                <p className="text-yellow-400 font-semibold mb-1">⚡ Dilema do mês: {turnResult.dilemma.title}</p>
                <p className="text-gray-300 text-sm">{turnResult.dilemma.description}</p>
              </div>
            )}
            <div className="space-y-2">
              {turnResult.results?.map(r => (
                <div key={r.characterId} className="flex items-center justify-between p-3 bg-dark rounded-lg border border-border">
                  <div>
                    <p className="text-white font-medium">{r.characterName}</p>
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
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">🏆 Leaderboard</h2>
            <div className="space-y-2">
              {leaderboard.map((entry, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-dark rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-500'}`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </span>
                    <span className="text-white font-medium">{entry.characterName}</span>
                  </div>
                  <span className="text-green-400 font-bold">
                    R$ {Number(entry.netWorth).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}