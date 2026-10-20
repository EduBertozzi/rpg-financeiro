import { clockText, formatClock, isUrgent } from './monthClock'

// Relógio do mês, fixo no canto de cima à direita em todas as telas do jogo
// (mapa, banco, árvore). Mostra quanto falta para encerrar o mês ou para
// responder o dilema; depois, que a turma está terminando. No dilema, vira
// botão que leva de volta para a carta.
export default function ClockBadge({ clock, onDilemma }) {
  const text = clockText(clock)
  if (!text) return null
  const urgent = !clock.paused && isUrgent(text.time)
  const dilemma = clock.phase === 'dilemma'
  const waiting = text.time == null
  const short = clock.paused ? 'Pausado' : clock.phase === 'done' ? 'Aguarde' : null
  const Tag = dilemma ? 'button' : 'div'

  return (
    <Tag
      type={dilemma ? 'button' : undefined}
      onClick={dilemma ? onDilemma : undefined}
      role="timer"
      aria-live="off"
      aria-label={waiting ? text.label : `${formatClock(text.time)} ${text.label}`}
      title={text.label}
      className={[
        'fixed right-4 top-4 z-[45] flex max-w-[calc(100vw-7rem)] items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 font-toy font-extrabold',
        'shadow-[0_4px_0_rgba(36,51,31,0.18),0_10px_24px_rgba(36,51,31,0.18)] transition-colors sm:right-6 sm:top-5',
        urgent ? 'animate-pulse bg-[#C4283D] text-white' : clock.paused || waiting ? 'bg-[#FFFDF7] text-[#6B7A62]' : 'bg-[#FFFDF7] text-[#24331F]',
        dilemma ? 'cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5' : '',
      ].join(' ')}
    >
      <ClockFace urgent={urgent} still={clock.paused || waiting} />
      {text.time != null && <b className="text-[20px] leading-none tabular-nums">{formatClock(text.time)}</b>}
      {short && <span className="text-[15px] leading-none sm:hidden">{short}</span>}
      <span className={`hidden truncate text-[13px] leading-none sm:inline ${urgent ? 'text-white/90' : 'text-[#6B7A62]'}`}>{text.label}</span>
    </Tag>
  )
}

// Mostrador redondo com o ponteiro andando (parado quando o relógio para).
function ClockFace({ urgent, still }) {
  return (
    <svg viewBox="0 0 24 26" className="h-7 w-7 shrink-0" aria-hidden="true">
      <rect x="9" y="0.5" width="6" height="3" rx="1.5" fill={urgent ? '#FFD36B' : '#F2B53A'} />
      <circle cx="12" cy="14" r="10" fill={urgent ? '#fff' : '#FFF3C4'} stroke={urgent ? '#FFD36B' : '#F2B53A'} strokeWidth="2.5" />
      <circle cx="12" cy="14" r="1.6" fill="#24331F" />
      <path d="M12 14 V8.5" stroke="#24331F" strokeWidth="2" strokeLinecap="round" className={still ? '' : 'clock-hand'} />
      <path d="M12 14 L15 15.5" stroke="#C4283D" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
