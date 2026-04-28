import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useGameStore from '../../store/gameStore'
import api from '../../services/api'
import socket from '../../services/socket'
import GameHeader from '../../components/GameHeader'

const BUILDINGS = [
  {
    id: 'bank',
    name: 'Banco',
    description: 'Renda Fixa e Dashboard Financeiro',
    icon: '🏦',
    color: 'from-blue-900 to-blue-700',
    border: 'border-blue-500',
    route: '/bank'
  },
  {
    id: 'broker',
    name: 'Corretora',
    description: 'Ações e Fundos Imobiliários',
    icon: '📈',
    color: 'from-green-900 to-green-700',
    border: 'border-green-500',
    route: '/broker'
  },
  {
    id: 'companies',
    name: 'Empresas',
    description: 'Investimento em Debêntures',
    icon: '🏢',
    color: 'from-purple-900 to-purple-700',
    border: 'border-purple-500',
    route: '/companies'
  },
  {
    id: 'university',
    name: 'Universidade',
    description: 'Árvore de Habilidades',
    icon: '🎓',
    color: 'from-yellow-900 to-yellow-700',
    border: 'border-yellow-500',
    route: '/skills'
  },
]

export default function Map() {
  const navigate = useNavigate()
  const { character, room, setCharacter, setRoom } = useGameStore()
  const characterRef = useRef(character)
  const roomRef = useRef(room)

  useEffect(() => { characterRef.current = character }, [character])
  useEffect(() => { roomRef.current = room }, [room])

  const totalCosts = character
    ? Number(character.housingCost) +
      Number(character.foodCost) +
      Number(character.utilitiesCost) +
      Number(character.transportCost)
    : 0

  // busca sala atualizada ao carregar
  useEffect(() => {
    if (!room?.code) return
    api.get(`/rooms/${room.code}`)
      .then(({ data }) => setRoom(data))
      .catch(console.error)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.code])

  // busca personagem atualizado ao carregar
  useEffect(() => {
    if (!character?.id) return
    api.get(`/characters/${character.id}`)
      .then(({ data }) => setCharacter(data))
      .catch(console.error)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.id])

  // socket
  useEffect(() => {
    if (!character?.id || !room?.id) return

    socket.connect()

    socket.on('connect', () => {
      socket.emit('room:join', {
        roomId: roomRef.current.id,
        characterId: characterRef.current.id
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
      if (data.dilemma) navigate('/dilemma')
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
    try {
      await api.patch(`/characters/${character.id}/ready`)
      setCharacter({ ...character, turnReady: true })
    } catch (err) {
      console.error(err)
      alert('Erro ao finalizar mês!')
    }
  }

  return (
    <div className="min-h-screen bg-darker text-white">
      <GameHeader />

      <div className="max-w-5xl mx-auto p-8">

        {character && Number(character.cash) < totalCosts * 3 && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-400 text-sm flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-semibold">Atenção: Reserva de Emergência Baixa!</p>
              <p className="text-xs mt-1">Você não tem reserva suficiente para 3 meses de custos fixos. Considere investir em Renda Fixa.</p>
            </div>
          </div>
        )}

        <h2 className="text-2xl font-bold text-white mb-2">Cidade de Santa Rita</h2>
        <p className="text-gray-400 text-sm mb-8">Clique em um local para interagir</p>

        <div className="grid grid-cols-2 gap-6 mb-8">
          {BUILDINGS.map(building => (
            <button
              key={building.id}
              onClick={() => navigate(building.route)}
              className={`relative p-6 bg-gradient-to-br ${building.color} border ${building.border} rounded-2xl text-left hover:scale-105 transition-all duration-200 shadow-lg`}
            >
              <div className="text-5xl mb-4">{building.icon}</div>
              <h3 className="text-xl font-bold text-white mb-1">{building.name}</h3>
              <p className="text-sm text-gray-300">{building.description}</p>
              <div className="absolute top-4 right-4 text-gray-400 text-xs">›</div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Salário Mensal</p>
            <p className="text-green-400 font-bold text-lg">
              R$ {Number(character?.monthlyIncome ?? 7000).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Custos Fixos</p>
            <p className="text-red-400 font-bold text-lg">
              R$ {totalCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Sobra por Mês</p>
            <p className="text-primary font-bold text-lg">
              R$ {(Number(character?.monthlyIncome ?? 7000) - totalCosts).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            className="px-6 py-3 bg-yellow-700 hover:bg-yellow-600 text-white font-bold rounded-xl transition-colors"
            onClick={() => navigate('/dilemma')}
          >
            ⚡ Ver Dilema
          </button>
          <button
            className="px-8 py-3 bg-primary hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
            onClick={handleFinishMonth}
            disabled={character?.turnReady}
          >
            {character?.turnReady ? '✓ Mês finalizado!' : 'Finalizar Mês →'}
          </button>
        </div>

      </div>
    </div>
  )
}