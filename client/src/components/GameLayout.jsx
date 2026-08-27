import useGameStore from '../store/gameStore'
import GameHeader from './GameHeader'

export default function GameLayout({ children }) {
  const sidebarExpanded = useGameStore((s) => s.sidebarExpanded)

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--theme-bg)] text-white">
      <div className="absolute inset-0 z-0 perspective-grid opacity-15" />

      <div className="pointer-events-none absolute left-[-10%] top-[-15%] z-0 h-[460px] w-[460px] animate-float rounded-full bg-[var(--theme-primary)]/15 blur-[110px]" />
      <div
        className="pointer-events-none absolute bottom-[-15%] right-[-10%] z-0 h-[460px] w-[460px] animate-float rounded-full bg-[var(--theme-secondary)]/15 blur-[110px]"
        style={{ animationDelay: '2s' }}
      />

      <GameHeader />

      <main className={`relative z-10 transition-[padding] duration-300 pl-20 ${sidebarExpanded ? 'lg:pl-80' : ''}`}>
        {children}
      </main>
    </div>
  )
}
