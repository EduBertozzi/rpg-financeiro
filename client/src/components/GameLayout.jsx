import useGameStore from '../store/gameStore'
import GameHeader from './GameHeader'
import Notebook from './Notebook'

// `light`: fundo claro de manhã, para telas claras como o banco Maré.
export default function GameLayout({ children, light = false }) {
  const sidebarExpanded = useGameStore((s) => s.sidebarExpanded)

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

      <main className={`relative z-10 transition-[padding] duration-300 ${sidebarExpanded ? 'pl-80' : 'pl-20'}`}>
        {children}
      </main>

      {/* o caderninho fica sempre no canto, em todas as telas do jogo */}
      <Notebook />
    </div>
  )
}
