import { createPortal } from 'react-dom'
import { TOY_BUTTON, TOY_CARD, TOY_GHOST } from './town/toy'
import { formatClock, isUrgent } from './monthClock'

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

// Folha do calendário com o carimbo de "fechado".
function Sheet({ turn, stamped }) {
  return (
    <div className="relative mx-auto -mt-16 w-32 rotate-[-4deg] rounded-[18px] bg-white shadow-[0_8px_0_#E2D6BE,0_18px_30px_rgba(36,51,31,0.25)]" aria-hidden="true">
      <div className="rounded-t-[18px] bg-[#12B5A6] py-1.5 text-center font-toy text-[15px] font-extrabold uppercase tracking-wider text-white">{MONTHS[turn - 1]?.slice(0, 3)}</div>
      <div className="grid h-20 place-items-center font-toy text-[44px] font-extrabold text-[#24331F]">{turn}</div>
      {stamped && (
        <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rotate-[-14deg] whitespace-nowrap rounded-md border-[3px] border-[#C4283D] bg-white/85 px-1.5 font-toy text-[14px] font-extrabold leading-tight tracking-wide text-[#C4283D] animate-[stamp_.5s_cubic-bezier(.2,1.6,.4,1)_both]">
          FECHADO
        </span>
      )}
    </div>
  )
}

// Pop-up de "encerrar o mês": avisa o que ainda está em aberto e o que vem
// depois (a cidade trava e chega o dilema; o banco continua aberto).
export function FinishMonthModal({ turn, missing = [], hasDilemma, timeLeft = null, busy, onConfirm, onCancel }) {
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#24331F]/55 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && !busy && onCancel()}>
      <div role="dialog" aria-label={`Encerrar ${MONTHS[turn - 1]}`} className={`turn-pop grid w-full max-w-md gap-4 ${TOY_CARD} px-6 pb-6 pt-3 text-center`}>
        <Sheet turn={turn} />
        <div>
          <h2 className="font-toy text-[30px] font-extrabold leading-tight">Encerrar {MONTHS[turn - 1]?.toLowerCase()}?</h2>
          <p className="mt-1 text-[15px] text-[#4A5A42]">
            Depois de encerrar, a cidade fecha: contas e lazer não mudam mais.
            {hasDilemma ? ' Aí chega a carta com o dilema do mês.' : ''} O banco continua aberto até a virada.
          </p>
        </div>

        {missing.length > 0 ? (
          <div className="grid gap-1.5 rounded-[18px] border-2 border-[#F5B8C0] bg-[#FDE2E5] p-4 text-left">
            <p className="font-toy text-[17px] font-extrabold text-[#9F1D2F]">Ainda falta: {missing.join(', ')}</p>
            <p className="text-[13px] text-[#7A2230]">Conta não paga vira conta atrasada, com 2% de multa e 1% de juros. O lazer não escolhido é cobrado do mesmo jeito.</p>
          </div>
        ) : (
          <p className="rounded-full bg-[#E2F4E5] px-4 py-1.5 text-sm font-extrabold text-[#2B8C41]">Tudo pago. Mês em dia!</p>
        )}

        {timeLeft != null && <p className="text-xs font-bold text-[#8A9680]">Se não encerrar, o mês fecha sozinho em {formatClock(timeLeft)}.</p>}

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onCancel} disabled={busy} className={TOY_GHOST}>Voltar</button>
          <button type="button" onClick={onConfirm} disabled={busy} className={`${TOY_BUTTON} flex-1`}>
            {busy ? 'Encerrando…' : missing.length ? 'Encerrar mesmo assim' : 'Encerrar o mês'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// Tartaruga andando de um lado para o outro numa linha de chão: o tempo de
// esperar a turma. Só SVG e CSS (ver .turtle-* no index.css).
function Turtle() {
  return (
    <svg viewBox="0 8 200 66" className="mx-auto mt-1 block h-[84px] w-full max-w-[280px]" aria-hidden="true">
      {/* chão: grama e pedrinhas */}
      <path d="M8 68 H192" stroke="#CFE8B8" strokeWidth="6" strokeLinecap="round" />
      <path d="M8 68 H192" stroke="#A9DC84" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 9" />
      <path d="M26 66 l3 -7 l2 7 M31 66 l3 -5 l2 5 M162 66 l3 -8 l2 8 M168 66 l2 -5 l2 5" stroke="#8CCD62" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <ellipse cx="108" cy="69" rx="3" ry="1.6" fill="#E2D6BE" />
      <ellipse cx="62" cy="70" rx="2" ry="1.2" fill="#E2D6BE" />
      <g className="turtle-walk">
        <ellipse cx="100" cy="67" rx="28" ry="3.2" fill="#24331F" opacity=".12" />
        <g className="turtle-bob">
          {/* pernas de trás (mais escuras) e da frente */}
          <rect className="turtle-leg turtle-leg-b" x="80" y="50" width="9" height="15" rx="4.5" fill="#6FB34E" />
          <rect className="turtle-leg turtle-leg-a" x="106" y="50" width="9" height="15" rx="4.5" fill="#6FB34E" />
          <path d="M76 52 l-7 3 l7 2 Z" fill="#8FD06A" />
          {/* cabeça */}
          <g className="turtle-head">
            <path d="M116 49 C118 42 122 39 126 39 L128 50 Z" fill="#8FD06A" />
            <circle cx="131" cy="40" r="10" fill="#9BD86A" />
            <circle cx="134" cy="37.5" r="2.4" fill="#24331F" />
            <circle cx="134.8" cy="36.6" r=".8" fill="#fff" />
            <circle cx="135.5" cy="43.2" r="2.2" fill="#FF8FA8" opacity=".7" />
            <path d="M136.5 46 q2.5 1.4 4.5 -.6" stroke="#24331F" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          </g>
          <rect className="turtle-leg turtle-leg-b" x="86" y="51" width="10" height="15" rx="5" fill="#9BD86A" />
          <rect className="turtle-leg turtle-leg-a" x="112" y="51" width="10" height="15" rx="5" fill="#9BD86A" />
          {/* casco */}
          <path d="M74 53 C74 32 88 22 100 22 C113 22 126 32 126 53 Z" fill="#3DBE5A" />
          <path d="M92 30 L108 30 L113 41 L106 51 L94 51 L87 41 Z" fill="#2B8C41" opacity=".55" />
          <path d="M80 40 L87 41 L94 51 L77 51 Z M120 40 L113 41 L106 51 L123 51 Z" fill="#2B8C41" opacity=".35" />
          <path d="M84 30 C88 26 93 24.5 98 24.5" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".45" />
          <rect x="71" y="50" width="58" height="7" rx="3.5" fill="#F2B53A" />
          <rect x="71" y="50" width="58" height="3" rx="1.5" fill="#FFD36B" />
        </g>
      </g>
    </svg>
  )
}

// Barra da turma: quantos já terminaram o mês.
function ClassProgress({ clock }) {
  if (!clock.total) return null
  return (
    <div className="mt-4 grid gap-1">
      <div className="flex justify-between text-[12px] font-bold text-[#6B7A62]">
        <span>Turma</span>
        <b className="text-[#24331F]">{clock.done} de {clock.total} {clock.done === 1 ? 'terminou' : 'terminaram'}</b>
      </div>
      <div className="flex gap-[3px]" aria-hidden="true">
        {Array.from({ length: clock.total }, (_, i) => (
          <i key={i} className={`h-2 flex-1 rounded transition-colors duration-500 ${i < clock.done ? 'bg-[#3DBE5A]' : 'bg-[#EFE6D3]'}`} />
        ))}
      </div>
    </div>
  )
}

// Cartão no meio da cidade depois de encerrar. Com o dilema aberto, chama
// para responder; depois, é esperar a turma com a tartaruga andando.
export function MonthClosedCard({ turn, clock, onDilemma }) {
  if (!clock) return null
  if (clock.phase === 'dilemma') {
    return (
      <div className={`pointer-events-auto mx-auto w-full max-w-sm ${TOY_CARD} px-6 pb-6 pt-3 text-center animate-fade-in-up`}>
        <Sheet turn={turn} stamped />
        <h3 className="mt-3 font-toy text-[26px] font-extrabold leading-tight">Falta o dilema</h3>
        <p className={`mx-auto mt-2 w-fit rounded-full px-3 py-1 text-sm font-extrabold tabular-nums ${isUrgent(clock.dilemmaLeft) ? 'animate-pulse bg-[#C4283D] text-white' : 'bg-[#FFF3C4] text-[#7A5200]'}`}>
          ⏱ {formatClock(clock.dilemmaLeft)} para responder
        </p>
        <ClassProgress clock={clock} />
        <div className="mt-5 flex">
          <button type="button" onClick={onDilemma} className={`${TOY_BUTTON} flex-1`}>Responder o dilema</button>
        </div>
      </div>
    )
  }
  return (
    <div role="status" className={`pointer-events-auto mx-auto w-full max-w-sm ${TOY_CARD} px-6 pb-6 pt-5 text-center animate-fade-in-up`}>
      <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#8A9680]">{MONTHS[turn - 1]} encerrado</p>
      <h3 className="mt-1 font-toy text-[30px] font-extrabold leading-tight">Aguarde…</h3>
      <p className="mt-1 text-[15px] text-[#4A5A42]">
        {clock.paused ? 'O professor pausou o relógio.' : 'O mês vira sozinho quando a turma terminar.'}
      </p>
      <Turtle />
      <ClassProgress clock={clock} />
      {clock.turnsIn != null && !clock.paused && (
        <p className="mt-1 text-xs font-bold text-[#8A9680]">No máximo em {formatClock(clock.turnsIn)}</p>
      )}
    </div>
  )
}
