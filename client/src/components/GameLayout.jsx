import useGameStore from '../store/gameStore'
import GameHeader from './GameHeader'
import Notebook from './Notebook'
import Celebrations from './Celebrations'

// `light`: fundo claro de manhã, para telas claras como o Inabank.
export default function GameLayout({ children, light = false }) {
  const sidebarExpanded = useGameStore((s) => s.sidebarExpanded)
  // o relógio do mês fica fixo no canto de cima: telas que rolam (o banco)
  // descem um pouco para ele não cobrir os botões do topo
  const clockOn = useGameStore((s) => s.room?.status === 'active' && s.user?.role !== 'admin')

  return (
    <div className={`relative min-h-screen overflow-hidden ${light ? 'bg-gradient-to-b from-[#DCEFF7] to-[#EEF5E9] text-[#24331F]' : 'bg-[var(--theme-bg)] text-white'}`}>
      {!light && <div className="absolute inset-0 z-0 perspective-grid opacity-15" />}

      {!light && (
        <>
          <div className="pointer-events-none absolute left-[-10%] top-[-15%] z-0 h-[460px] w-[460px] animate-float rounded-full bg-[var(--theme-primary)]/15 blur-[110px]" />
          <div
            className="pointer-events-none absolute bottom-[-15%] right-[-10%] z-0 h-[460px] w-[460px] animate-float rounded-full bg-[var(--theme-secondary)]/15 blur-[110px]"
            style={{ animationDelay: '2s' }}
          />
        </>
      )}

      <GameHeader />

      <main className={`relative z-10 transition-[padding] duration-300 max-sm:pb-20 max-sm:pl-0 ${sidebarExpanded ? 'sm:pl-80' : 'sm:pl-20'} ${light && clockOn ? 'pt-12 sm:pt-10' : ''}`}>
        {children}
      </main>

      {/* o caderninho fica sempre no canto, em todas as telas do jogo */}
      <Notebook />
      <Celebrations />
    </div>
  )
}
