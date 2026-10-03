import { useState } from 'react'
import TownBackdrop from './TownBackdrop'
import { TOY_CARD, TOY_INPUT, TOY_LABEL, TOY_LOGO } from './toy'
import bankArt from '../../assets/buildings/bank.png'

// Moldura das telas de login e cadastro: a cidade ao fundo e o cartão de brinquedo.
export default function AuthShell({ subtitle, children }) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-16">
      <TownBackdrop />
      <div className={`${TOY_CARD} relative z-10 grid w-full max-w-[420px] gap-4 px-7 pb-7 pt-4 text-center sm:px-8 animate-fade-in-up`}>
        <img src={bankArt} alt="" className="mx-auto -mt-20 h-32 drop-shadow-[0_10px_10px_rgba(0,0,0,0.18)]" />
        <div>
          <h1 className={TOY_LOGO}>Santa Rita</h1>
          <p className="mt-1.5 text-xs font-extrabold tracking-[0.22em] text-[#6B7A62]">SIMULADOR FINANCEIRO · INATEL</p>
          {subtitle && <p className="mt-2 text-sm text-[#6B7A62]">{subtitle}</p>}
        </div>
        {children}
      </div>
    </main>
  )
}

export function PasswordField({ id, value, onChange, autoComplete = 'current-password' }) {
  const [show, setShow] = useState(false)
  return (
    <label htmlFor={id} className={TOY_LABEL}>
      Senha
      <span className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className={`${TOY_INPUT} pr-12`}
          placeholder="••••••••"
          required
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-label={show ? 'Esconder senha' : 'Mostrar senha'}
          className="absolute inset-y-0 right-0 grid w-12 place-items-center text-[#8A9680] hover:text-[#24331F] cursor-pointer"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {show
              ? <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A9.8 9.8 0 0 1 12 5c5 0 9 4.5 10 7-.4 1-1.2 2.3-2.4 3.5M6.6 6.6C4.4 8 2.8 10.1 2 12c1 2.5 5 7 10 7 1.6 0 3-.4 4.3-1" />
              : <><path d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12Z" /><circle cx="12" cy="12" r="3" /></>}
          </svg>
        </button>
      </span>
    </label>
  )
}
