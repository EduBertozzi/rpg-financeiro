import { useNavigate, useLocation } from 'react-router-dom'
import useGameStore from '../store/gameStore'
import { Avatar } from './Avatars'

export default function GameHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const { character, room, user, logout } = useGameStore()

  const path = location.pathname
  const showBack = !['/map', '/login', '/register'].includes(path)

  return (
    <header className="sticky top-0 z-50 bg-[#0B0D17]/75 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

        {/* Esquerda: marca + voltar */}
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/map')} className="flex items-center gap-3 group shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 grid place-items-center font-extrabold text-white shadow-[0_0_18px_rgba(168,85,247,0.45)] group-hover:shadow-[0_0_24px_rgba(168,85,247,0.7)] transition-shadow">
              R$
            </div>
            <div className="hidden sm:block leading-tight text-left">
              <p className="text-sm font-bold bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">RPG Financeiro</p>
              <p className="text-[10px] text-gray-500 tracking-wide">INATEL · Santa Rita do Sapucaí</p>
            </div>
          </button>

          {showBack && (
            <button
              onClick={() => navigate('/map')}
              className="ml-1 flex items-center gap-1.5 px-3 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-sm font-medium transition-colors"
            >
              <span className="text-base leading-none">←</span>
              <span className="hidden sm:inline">Mapa</span>
            </button>
          )}
        </div>

        {/* Direita: identidade + status */}
        {character && (
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">

            {/* chips de status */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex flex-col items-end px-3 py-1 rounded-lg bg-white/5 border border-white/10">
                <span className="text-[9px] uppercase tracking-wider text-gray-500">Caixa</span>
                <span className="text-green-400 font-bold text-sm leading-tight">
                  R$ {Number(character.cash).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex flex-col items-center px-3 py-1 rounded-lg bg-white/5 border border-white/10">
                <span className="text-[9px] uppercase tracking-wider text-gray-500">Mês</span>
                <span className="text-primary font-bold text-sm leading-tight">{room?.currentTurn ?? 0}<span className="text-gray-500 font-normal">/12</span></span>
              </div>
            </div>

            {/* bloco do jogador */}
            <div className="flex items-center gap-2.5 pl-2 sm:pl-3 sm:border-l border-white/10">
              <div className="text-right leading-tight min-w-0 block">
                <p className="text-white font-semibold text-sm truncate max-w-[140px]">{character.name}</p>
                <p className="text-[11px] text-gray-400 truncate max-w-[140px]">{character.course}</p>
              </div>
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full ring-2 ring-white/15 overflow-hidden bg-white/5">
                  <Avatar id={character.avatarId} size={40} />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-[#0B0D17]" title="online" />
              </div>
            </div>

            {/* ações */}
            {user?.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="px-2.5 h-9 text-xs font-medium text-yellow-300 border border-yellow-500/40 rounded-lg hover:bg-yellow-500/10 transition-colors"
              >
                Admin
              </button>
            )}
            <button
              onClick={() => { logout(); navigate('/login') }}
              className="px-2.5 h-9 text-xs text-gray-400 hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
              title="Sair"
            >
              Sair
            </button>
          </div>
        )}
      </div>
    </header>
  )
}