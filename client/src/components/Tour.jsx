import { useEffect, useState } from 'react'
import { cardPosition, TOUR_STEPS } from '../pages/Map/tourSteps'

const PAD = 8

// Tour do primeiro mês: escurece a tela e ilumina um pedaço por vez.
export default function Tour({ onDone }) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState(null)
  const [view, setView] = useState({ width: window.innerWidth, height: window.innerHeight })
  const current = TOUR_STEPS[step]
  const last = step === TOUR_STEPS.length - 1

  // mede o alvo do passo (e de novo se a janela mudar de tamanho)
  useEffect(() => {
    const measure = () => {
      setView({ width: window.innerWidth, height: window.innerHeight })
      const el = current.target ? document.querySelector(`[data-tour="${current.target}"]`) : null
      const r = el?.getBoundingClientRect()
      setRect(r && r.width > 0 ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height } : null)
    }
    const id = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('resize', measure)
    }
  }, [current.target])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onDone()
      if (e.key === 'ArrowRight') setStep((s) => Math.min(s + 1, TOUR_STEPS.length - 1))
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(s - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDone])

  const pos = cardPosition(rect, view)

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-label={`Tour: ${current.title}`}>
      {rect ? (
        <div
          className="tour-spot pointer-events-none absolute rounded-[22px] transition-all duration-300"
          style={{ left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2, boxShadow: '0 0 0 9999px rgba(20,30,18,0.62)' }}
        />
      ) : (
        <div className="absolute inset-0 bg-[#141E12]/62" />
      )}

      <div
        key={step}
        className="tour-card absolute grid w-[340px] gap-3 rounded-[24px] bg-[#FFFDF7] p-5 text-[#24331F] shadow-[0_8px_0_#E2D6BE,0_20px_40px_rgba(0,0,0,0.3)]"
        style={{ left: pos.left, top: pos.top }}
      >
        <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#8A9680]">Mês de aprender · {step + 1} de {TOUR_STEPS.length}</p>
        <h2 className="font-toy text-[24px] font-extrabold leading-tight">{current.title}</h2>
        <p className="text-[15px] leading-snug text-[#4A5A42]">{current.text}</p>
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={onDone} className="text-sm font-bold text-[#8A9680] hover:text-[#24331F] cursor-pointer">Pular tour</button>
          <div className="flex gap-2">
            {step > 0 && (
              <button type="button" onClick={() => setStep(step - 1)} className="rounded-[14px] border-2 border-[#E6DCC7] px-3 py-1.5 font-toy font-extrabold text-[#6B7A62] cursor-pointer">Voltar</button>
            )}
            <button
              type="button"
              autoFocus
              onClick={() => (last ? onDone() : setStep(step + 1))}
              className="rounded-[14px] bg-[#3DBE5A] px-4 py-1.5 font-toy text-[16px] font-extrabold text-white shadow-[0_4px_0_#2B8C41] cursor-pointer"
            >
              {last ? 'Ver o dilema' : 'Próximo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
