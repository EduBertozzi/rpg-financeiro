import { useEffect, useState } from 'react'
import { remainingSeconds } from './walkTimer'

// Tela parada enquanto o personagem vai a pé para o trabalho.
export default function WalkLock({ until, total = 30, onDone }) {
  const [now, setNow] = useState(() => Date.now())
  const left = remainingSeconds(until, now)

  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (remainingSeconds(until, t) === 0) {
        clearInterval(id)
        onDone()
      }
    }, 250)
    return () => clearInterval(id)
  }, [until, onDone])

  const progress = Math.min(1, Math.max(0, 1 - left / total))

  return (
    <div role="alertdialog" aria-label="Você está indo a pé" className="fixed inset-0 z-[60] grid place-items-center bg-[#24331F]/70 p-4 backdrop-blur-sm">
      <div className="grid w-full max-w-md justify-items-center gap-4 rounded-[30px] bg-[#FFFDF7] px-6 py-7 text-center text-[#24331F] shadow-[0_10px_0_#E2D6BE,0_24px_50px_rgba(36,51,31,0.25)]">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#8A9680]">Agosto · ônibus quebrado</p>
        <h2 className="font-toy text-[28px] font-extrabold leading-tight">Indo a pé para o trabalho…</h2>

        <div className="relative h-20 w-full overflow-hidden rounded-2xl bg-[#DDEFD3]">
          <div className="absolute inset-x-0 bottom-5 h-3 bg-[#B9AE98]" />
          <div className="absolute inset-x-0 bottom-[25px] border-t-2 border-dashed border-white/80" />
          <svg
            viewBox="0 0 40 56"
            className="walker absolute bottom-6 h-12 w-9 transition-[left] duration-300 ease-linear"
            style={{ left: `calc(${progress * 100}% - ${progress * 36}px)` }}
            aria-hidden="true"
          >
            <circle cx="20" cy="9" r="7" fill="#F2B53A" />
            <path d="M20 17v18" stroke="#2457C5" strokeWidth="7" strokeLinecap="round" />
            <path className="walker-arm" d="M20 21l-8 9M20 21l8 9" stroke="#24331F" strokeWidth="4" strokeLinecap="round" />
            <path className="walker-leg" d="M20 35l-7 15M20 35l7 15" stroke="#24331F" strokeWidth="5" strokeLinecap="round" />
          </svg>
          <span className="absolute bottom-6 right-2 text-2xl" aria-hidden="true">🏢</span>
        </div>

        <p className="font-toy text-[40px] font-extrabold leading-none tabular-nums text-[#C98A12]">{left}s</p>
        <p className="text-sm text-[#6B7A62]">Sem o aplicativo, o jeito é andar. Você vai chegar atrasado.</p>
      </div>
    </div>
  )
}
