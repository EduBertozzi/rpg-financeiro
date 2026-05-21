import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useGameStore from '../../store/gameStore'
import api from '../../services/api'
import socket from '../../services/socket'
import GameHeader from '../../components/GameHeader'
import DilemmaModal from '../../components/DilemmaModal'

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
    id: 'leisure',
    name: 'Lazer',
    description: 'Eventos mensais obrigatórios',
    icon: '🎉',
    color: 'from-pink-900 to-pink-700',
    border: 'border-pink-500',
    route: 'modal_dilemma'
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
  const [showDilemmaModal, setShowDilemmaModal] = useState(false)

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
      const hasDoneLeisure = character?.eventLog?.some(log => log.turn === room.currentTurn && log.description.startsWith('Dilema'))
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
    // Atualiza o personagem para pegar o novo saldo e log de evento
    try {
      const { data } = await api.get(`/characters/${character.id}`)
      setCharacter(data)
    } catch (err) {
      console.error(err)
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
          {BUILDINGS.map((building, index) => (
            <button
              key={building.id}
              onClick={() => {
                if (building.route === 'modal_dilemma') {
                  setShowDilemmaModal(true)
                } else {
                  navigate(building.route)
                }
              }}
              className={`relative p-6 bg-gradient-to-br ${building.color} border ${building.border} rounded-2xl text-left transition-all duration-300 hover:scale-105 hover:animate-glow hover:-translate-y-1 shadow-lg`}
            >
              <div className="text-5xl mb-4 animate-float" style={{ animationDelay: `${index * 0.5}s` }}>{building.icon}</div>
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
          <div className="bg-card border border-border rounded-xl p-4 group relative">
            <p className="text-xs text-gray-400 mb-1">Custos Fixos <span className="cursor-help" title="Ver detalhes">ℹ️</span></p>
            <p className="text-red-400 font-bold text-lg">
              R$ {totalCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <div className="hidden group-hover:block absolute top-full left-0 mt-2 w-64 p-3 bg-darker border border-border rounded-lg shadow-xl z-50 text-xs space-y-1">
              <div className="flex justify-between"><span>Jorge (Aluguel)</span><span>R$ {Number(character?.housingCost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between"><span>Mercadinho (Alimentação)</span><span>R$ {Number(character?.foodCost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between"><span>Hidroluz (Água/Luz)</span><span>R$ {Number(character?.utilitiesCost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between"><span>InaNet (Internet/Telefonia)</span><span>R$ {Number(character?.transportCost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
            </div>
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
            className={`px-8 py-3 font-bold rounded-xl transition-all duration-300 ${
              character?.turnReady 
                ? 'bg-green-600/50 text-green-200 cursor-not-allowed border border-green-500/30' 
                : 'bg-primary hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/50 hover:-translate-y-1'
            }`}
            onClick={handleFinishMonth}
            disabled={character?.turnReady}
          >
            {character?.turnReady ? '✓ Mês finalizado!' : 'Finalizar Mês →'}
          </button>
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