import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { sfx } from '../services/sound'
import { TOY_CARD } from './town/toy'
import { HOW_TO_PLAY, TOUR_EVENT } from './howToPlaySteps'
import leisureArt from '../assets/buildings/leisure.png'
import mercadinhoArt from '../assets/buildings/mercadinho.png'
import bankArt from '../assets/buildings/bank.png'
import universityArt from '../assets/buildings/university.png'

const ART = { leisure: leisureArt, mercadinho: mercadinhoArt, bank: bankArt, university: universityArt }

// A carta do dilema, desenhada (o mesmo envelope do começo do mês).
function Letter() {
  return (
    <span className="relative block h-[92px] w-[136px] -rotate-3 rounded-[10px] bg-[#FFF3C4] shadow-[0_5px_0_#E8C66B]">
      <svg viewBox="0 0 136 92" className="absolute inset-0 h-full w-full" fill="none" stroke="#E8C66B" strokeWidth="3" strokeLinejoin="round"><path d="M4 6l64 46 64-46" /></svg>
      <span className="absolute left-1/2 top-[46%] h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E5484D]" />
    </span>
  )
}

// "Como jogar": cinco cartões curtos, um para cada coisa do mês.
export default function HowToPlay({ onClose }) {
  const [i, setI] = useState(0)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const step = HOW_TO_PLAY[i]
  const last = i === HOW_TO_PLAY.length - 1

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setI((n) => Math.min(n + 1, HOW_TO_PLAY.length - 1))
      if (e.key === 'ArrowLeft') setI((n) => Math.max(n - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const move = (d) => {
    sfx.page()
    setI((n) => n + d)
  }

  const replayTour = () => {
    onClose()
    if (pathname !== '/map') navigate('/map')
    setTimeout(() => window.dispatchEvent(new Event(TOUR_EVENT)), pathname === '/map' ? 0 : 500)
  }

  return (
    <div className="fixed inset-0 z-[56] grid place-items-center bg-[#141E12]/55 p-4 backdrop-blur-[3px]" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label="Como jogar" className={`turn-pop relative grid w-full max-w-md gap-4 ${TOY_CARD} p-6`}>
        <button type="button" onClick={onClose} aria-label="Fechar" autoFocus
          className="absolute -right-3.5 -top-3.5 grid h-10 w-10 place-items-center rounded-full bg-[#FFFDF5] text-xl font-extrabold shadow-[0_4px_0_#E2D6BE] cursor-pointer">×</button>

        <div key={i} className="grid h-[150px] place-items-center rounded-[22px] bg-[color-mix(in_srgb,var(--theme-secondary)_22%,white)] turn-pop">
          {step.art === 'letter' ? <Letter /> : <img src={ART[step.art]} alt="" className="h-[130px] object-contain" />}
        </div>

        <div className="grid gap-1">
          <p className="font-hand text-[22px] font-bold leading-none text-[var(--theme-primary)]">passo {i + 1} de {HOW_TO_PLAY.length}</p>
          <h2 className="font-toy text-[28px] font-extrabold leading-tight">{step.title}</h2>
          <p className="text-[15px] leading-snug text-[#4A5A42]">{step.text}</p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => move(-1)} disabled={i === 0}
            className="rounded-[14px] border-2 border-[#E6DCC7] px-3 py-1.5 font-toy font-extrabold text-[#6B7A62] disabled:opacity-35 cursor-pointer disabled:cursor-default">← Voltar</button>
          <span className="flex gap-1.5" aria-hidden="true">
            {HOW_TO_PLAY.map((s, k) => <i key={s.title} className={`h-2.5 rounded-full transition-all ${k === i ? 'w-6 bg-[var(--theme-primary)]' : 'w-2.5 bg-[#EFE6D3]'}`} />)}
          </span>
          <button type="button" onClick={() => (last ? onClose() : move(1))}
            className="rounded-[14px] bg-[#3DBE5A] px-4 py-1.5 font-toy text-[16px] font-extrabold text-white shadow-[0_4px_0_#2B8C41] cursor-pointer">
            {last ? 'Bora jogar' : 'Próximo →'}
          </button>
        </div>

        <button type="button" onClick={replayTour} className="justify-self-center text-sm font-extrabold text-[#2457C5] underline decoration-dotted underline-offset-[3px] cursor-pointer">
          Rever o tour da cidade
        </button>
      </div>
    </div>
  )
}
