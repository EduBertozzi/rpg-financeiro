import { TOY_BUTTON, TOY_CARD } from './town/toy'

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const brl = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const signed = (v) => (v > 0 ? `+${brl(v)}` : v < 0 ? `−${brl(-v)}` : brl(0))
const tone = (v) => (v > 0 ? 'text-[#2B8C41]' : v < 0 ? 'text-[#C4283D]' : 'text-[#6B7A62]')

// O imprevisto do mês, grande: verde quando é bom, vermelho quando custa.
function EventCard({ event }) {
  const look = event.quiet
    ? { bg: 'bg-[#EEF5E9]', border: 'border-[#CFE3C4]', badge: 'Mês tranquilo', badgeTone: 'bg-[#DDEFD3] text-[#2B8C41]' }
    : event.amount >= 0
      ? { bg: 'bg-[#E9F7EC]', border: 'border-[#A9DDB4]', badge: 'Boa notícia', badgeTone: 'bg-[#3DBE5A] text-white' }
      : { bg: 'bg-[#FDECEE]', border: 'border-[#F5B8C0]', badge: 'Imprevisto', badgeTone: 'bg-[#C4283D] text-white' }
  return (
    <div className={`turn-event grid gap-1.5 rounded-[22px] border-[3px] ${look.border} ${look.bg} p-4`}>
      <div className="flex items-center justify-between gap-3">
        <span className={`rounded-full px-3 py-0.5 text-xs font-extrabold ${look.badgeTone}`}>{look.badge}</span>
        {!event.quiet && <span className={`font-toy text-[24px] font-extrabold tabular-nums ${tone(event.amount)}`}>{signed(event.amount)}</span>}
      </div>
      <h3 className="font-toy text-[24px] font-extrabold leading-tight">{event.title}</h3>
      <p className="text-[15px] leading-snug text-[#4A5A42]">{event.description}</p>
    </div>
  )
}

function Row({ label, value, strong }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${strong ? 'font-extrabold' : ''}`}>
      <span className="min-w-0 text-[14px] text-[#4A5A42]">{label}</span>
      <span className={`shrink-0 text-[15px] font-extrabold tabular-nums ${tone(value)}`}>{signed(value)}</span>
    </div>
  )
}

// Cartão da virada do mês: abre no começo de cada mês, antes do dilema.
export default function TurnSummaryModal({ summary, onClose }) {
  if (!summary) return null
  const { turn, events, consequences, late, money, net } = summary
  const first = turn === 1
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#24331F]/55 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label={`Virada para ${MONTHS[turn - 1]}`} className={`turn-pop grid max-h-[calc(100vh-32px)] w-full max-w-lg gap-4 overflow-y-auto ${TOY_CARD} px-6 py-6`}>
        <div className="text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#8A9680]">{first ? 'Começou o ano' : 'Virou o mês'}</p>
          <h2 className="font-toy text-[32px] font-extrabold leading-tight">{MONTHS[turn - 1]} em Santa Rita</h2>
        </div>

        {events.map((e) => <EventCard key={e.title} event={e} />)}

        {consequences.length > 0 && (
          <div className="grid gap-1.5 rounded-[18px] bg-[#FFF3C4] p-4">
            <p className="font-toy text-[17px] font-extrabold text-[#7A5200]">Suas escolhas voltaram</p>
            {consequences.map((c, i) => <Row key={i} label={`${c.title}: ${c.description}`} value={c.amount} />)}
          </div>
        )}

        {late.length > 0 && (
          <div className="grid gap-1.5 rounded-[18px] border-2 border-[#F5B8C0] bg-[#FDE2E5] p-4">
            <p className="font-toy text-[17px] font-extrabold text-[#9F1D2F]">Ficou em aberto no mês passado</p>
            {late.map((l, i) => <Row key={i} label={l.description.replace(/ \(-R\$ [\d.]+\)/, '')} value={l.amount} />)}
          </div>
        )}

        {!first && (
          <div className="grid gap-1 rounded-[18px] border-2 border-[#EFE6D3] bg-white p-4">
            {money.salary !== 0 && <Row label="Salário" value={money.salary} />}
            {money.extras !== 0 && <Row label="Freelas e bônus" value={money.extras} />}
            {money.rent !== 0 && <Row label="Aluguel" value={money.rent} />}
            {money.interest !== 0 && <Row label="Juros do cheque especial" value={money.interest} />}
            <div className="mt-1 border-t-2 border-dashed border-[#EFE6D3] pt-2"><Row label="Saldo da virada" value={net} strong /></div>
          </div>
        )}

        <button type="button" onClick={onClose} className={TOY_BUTTON}>Bora para {MONTHS[turn - 1].toLowerCase()}</button>
      </div>
    </div>
  )
}
