import { useNavigate } from 'react-router-dom'
import useGameStore from '../store/gameStore'

export default function GameHeader() {
  const navigate = useNavigate()
  const { character, room, user, logout } = useGameStore()

  return (
    <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <div>
        <h1 className="text-xl font-bold text-white">RPG Financeiro</h1>
        <p className="text-xs text-gray-400">INATEL — Santa Rita do Sapucaí</p>
      </div>

      {character && (
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs text-gray-400">Personagem</p>
            <p className="text-white font-semibold">{character.name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Caixa</p>
            <p className="text-green-400 font-bold">
              R$ {Number(character.cash).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Mês</p>
            <p className="text-primary font-bold">{room?.currentTurn ?? 0}/12</p>
          </div>
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="px-3 py-1 text-xs text-yellow-400 border border-yellow-700 rounded-lg hover:bg-yellow-900/20 transition-colors"
            >
              Admin
            </button>
          )}
          <button
            onClick={() => {
              logout()
              navigate('/login')
            }}
            className="px-3 py-1 text-xs text-gray-400 hover:text-white border border-border rounded-lg transition-colors"
          >
            Sair
          </button>
        </div>
      )}
    </div>
  )
}