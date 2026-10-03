import { useState } from 'react'

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']

// A logo do jogo perdendo folhas, um mês depois do outro: é o "carregando".
export function CalendarIcon({ size = 120 }) {
  const [i, setI] = useState(0)
  return (
    <span className="cl-icon" style={{ '--s': `${size}px` }} aria-hidden="true">
      <span className="cl-ring cl-ring-l" />
      <span className="cl-ring cl-ring-r" />
      <span className="cl-frame">
        <span className="cl-bar" />
        <span className="cl-pad">
          <span className="cl-sheet">{MONTHS[(i + 1) % 12]}</span>
          <span key={i} className="cl-sheet cl-fall" onAnimationEnd={() => setI((n) => (n + 1) % 12)}>{MONTHS[i]}</span>
        </span>
      </span>
    </span>
  )
}

// Tela cheia de carregando (por exemplo, enquanto o servidor acorda).
export default function CalendarLoader({ text = 'Carregando…', hint }) {
  return (
    <div role="status" aria-live="polite" className="fixed inset-0 z-[90] grid place-items-center bg-[#0A7F75] p-6 text-center text-white">
      <div className="grid justify-items-center gap-5">
        <CalendarIcon size={168} />
        <p className="font-toy text-[26px] font-extrabold leading-tight">{text}</p>
        {hint && <p className="max-w-xs text-sm text-[#D7F5F1]">{hint}</p>}
      </div>
    </div>
  )
}
