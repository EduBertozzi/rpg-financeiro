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

// Cartão no meio da cidade depois de encerrar: quanto da turma já terminou e
// quando o mês vira. Se o dilema ainda está aberto, chama para responder.
export function MonthClosedCard({ turn, clock, onDilemma, onBank }) {
  if (!clock) return null
  const dilemma = clock.phase === 'dilemma'
  return (
    <div className={`pointer-events-auto mx-auto w-full max-w-sm ${TOY_CARD} px-6 pb-6 pt-3 text-center animate-fade-in-up`}>
      <Sheet turn={turn} stamped />
      <h3 className="mt-3 font-toy text-[26px] font-extrabold leading-tight">{dilemma ? 'Falta o dilema' : 'Mês encerrado!'}</h3>
      {dilemma ? (
        <p className={`mx-auto mt-2 w-fit rounded-full px-3 py-1 text-sm font-extrabold tabular-nums ${isUrgent(clock.dilemmaLeft) ? 'animate-pulse bg-[#C4283D] text-white' : 'bg-[#FFF3C4] text-[#7A5200]'}`}>
          ⏱ {formatClock(clock.dilemmaLeft)} para responder
        </p>
      ) : (
        <p className="mt-1 text-[15px] text-[#4A5A42]">
          {clock.paused ? 'O professor pausou o relógio.' : 'O mês vira sozinho quando a turma terminar.'}
        </p>
      )}
      {clock.total > 0 && (
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
          {!dilemma && clock.turnsIn != null && !clock.paused && (
            <p className="mt-1 text-xs font-bold text-[#8A9680]">No máximo em {formatClock(clock.turnsIn)}</p>
          )}
        </div>
      )}
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {dilemma && <button type="button" onClick={onDilemma} className={`${TOY_BUTTON} flex-1`}>Responder o dilema</button>}
        <button type="button" onClick={onBank} className={dilemma ? TOY_GHOST : `${TOY_BUTTON} flex-1`}>Ir ao banco</button>
      </div>
    </div>
  )
}
