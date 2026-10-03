import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { sfx } from '../services/sound'
import { useRolling } from './hudHooks'

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const LAST_DAY = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const brl = (v) => `R$ ${Math.round(Math.abs(Number(v))).toLocaleString('pt-BR')}`

// Estrelas fixas (sem Math.random no render): x, y em %, tamanho em px.
const STARS = [[6, 8, 2], [14, 22, 3], [22, 6, 2], [31, 15, 2], [38, 4, 3], [47, 19, 2], [55, 9, 2], [63, 24, 3], [71, 5, 2], [79, 17, 2], [86, 8, 3], [93, 21, 2], [10, 33, 2], [42, 30, 2], [68, 34, 2], [90, 36, 2]]

// Moedas saindo do calendário até o saldo da barra lateral.
function flyCoins(from, n = 12) {
  const target = document.querySelector('[data-hud="cash"]')
  if (!target || !from) return
  const t = target.getBoundingClientRect()
  const f = from.getBoundingClientRect()
  const tx = t.left + t.width / 2
  const ty = t.top + t.height / 2
  for (let i = 0; i < n; i++) {
    const c = document.createElement('span')
    c.className = 'turn-coin'
    c.textContent = '$'
    document.body.append(c)
    const sx = f.left + f.width / 2 + (Math.random() - 0.5) * 160
    const sy = f.top + f.height / 2 + (Math.random() - 0.5) * 80
    const mx = (sx + tx) / 2 + (Math.random() - 0.5) * 140
    const my = Math.min(sy, ty) - 100 - Math.random() * 80
    const a = c.animate([
      { transform: `translate(${sx}px,${sy}px) scale(.2)`, opacity: 0 },
      { transform: `translate(${sx}px,${sy - 30}px) scale(1.1)`, opacity: 1, offset: 0.2 },
      { transform: `translate(${mx}px,${my}px) scale(1)`, opacity: 1, offset: 0.6 },
      { transform: `translate(${tx - 13}px,${ty - 13}px) scale(.5)`, opacity: 0.6 },
    ], { duration: 1100, delay: i * 70, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'both' })
    a.onfinish = () => {
      c.remove()
      if (i % 3 === 0) sfx.coin()
    }
  }
}

// A virada do mês como cena: a cidade anoitece, a folha do calendário rasga,
// amanhece e o saldo da virada voa para a conta. Clique ou Esc pula.
// turn = mês que começou; net = saldo da virada; cash = saldo agora.
export default function TurnScene({ turn, net = 0, onDone }) {
  const [stage, setStage] = useState('night') // night → tear → dawn → money → out
  const [counter, setCounter] = useState(0)
  const shown = useRolling(counter, 1000)
  const doneRef = useRef(onDone)
  const calRef = useRef(null)
  const from = MONTHS[turn - 2]
  const to = MONTHS[turn - 1]

  useEffect(() => {
    doneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      doneRef.current()
      return
    }
    sfx.whoosh()
    const steps = [
      [1300, () => { setStage('tear'); sfx.rip() }],
      [2200, () => { setStage('dawn'); sfx.bell() }],
      [2900, () => { setStage('money'); setCounter(net); if (net > 0) flyCoins(calRef.current) }],
      [4700, () => setStage('out')],
      [5100, () => doneRef.current()],
    ]
    const ids = steps.map(([ms, fn]) => setTimeout(fn, ms))
    return () => ids.forEach(clearTimeout)
  }, [net])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && doneRef.current()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const night = stage === 'night' || stage === 'tear'
  const dawn = stage === 'dawn' || stage === 'money'

  // no body: por cima da barra lateral e do caderninho, que ficam fora do mapa
  return createPortal(
    <div
      role="dialog"
      aria-label={`Virada para ${to}`}
      onClick={() => doneRef.current()}
      className={`fixed inset-0 z-[60] overflow-hidden transition-opacity duration-300 cursor-pointer ${stage === 'out' ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className={`turn-night absolute inset-0 transition-opacity duration-1000 ${night ? 'opacity-100' : 'opacity-0'}`}>
        {STARS.map(([x, y, s], i) => (
          <i key={i} className="turn-star absolute rounded-full bg-white" style={{ left: `${x}%`, top: `${y}%`, width: s, height: s, animationDelay: `${i * 0.13}s` }} />
        ))}
      </div>
      <div className={`turn-dawn absolute inset-0 transition-opacity duration-1000 ${dawn ? 'opacity-100' : 'opacity-0'}`} />

      <div ref={calRef} className="turn-cal absolute left-1/2 top-1/2 grid w-[220px] -translate-x-1/2 -translate-y-1/2 justify-items-center gap-4">
        <div className="relative h-[250px] w-[220px]">
          <div className="turn-sheet absolute inset-0">
            <div className="turn-sheet-top">{to.toUpperCase()}</div>
            <div className="turn-sheet-day">1<small>{net >= 0 ? 'o salário caiu' : 'mês novo'}</small></div>
          </div>
          {stage === 'night' || stage === 'tear' ? (
            <div className={`turn-sheet absolute inset-0 ${stage === 'tear' ? 'turn-tear' : ''}`}>
              <div className="turn-sheet-top">{from.toUpperCase()}</div>
              <div className="turn-sheet-day">{LAST_DAY[turn - 2]}<small>fim do mês</small></div>
            </div>
          ) : null}
        </div>
        <div className={`rounded-[18px] bg-[#FFFDF7] px-5 py-2.5 text-center shadow-[0_6px_0_#E2D6BE] transition-all duration-500 ${stage === 'money' ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#8A9680]">Saldo da virada</p>
          <p className={`font-toy text-[28px] font-extrabold leading-tight tabular-nums ${net >= 0 ? 'text-[#2B8C41]' : 'text-[#C4283D]'}`}>
            {net >= 0 ? '+' : '−'} {brl(shown)}
          </p>
        </div>
      </div>

      <button type="button" onClick={() => doneRef.current()} className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-white/85 px-4 py-1.5 text-sm font-extrabold text-[#24331F] cursor-pointer">
        Pular
      </button>
    </div>,
    document.body,
  )
}
