import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { TOY_CARD } from './town/toy'
import { chartPoints, chartScale } from './worthChart'

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const brl = (v) => `${v < 0 ? '−' : ''}R$ ${Math.round(Math.abs(Number(v))).toLocaleString('pt-BR')}`
const short = (v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : String(Math.round(v)))

// área do desenho (viewBox)
const W = 720
const H = 300
const L = 64
const R = 20
const T = 18
const B = 34

// O patrimônio do ano em tamanho grande: linha do patrimônio, linha tracejada
// do saldo na conta, valores no hover e a tabela mês a mês.
export default function WorthChartModal({ series, now, turn, onClose }) {
  const [hover, setHover] = useState(null)
  const pts = chartPoints(series, now, turn)
  const scale = chartScale(pts.flatMap((p) => [p.value, p.cash]))
  const x = (t) => L + ((t - 1) * (W - L - R)) / 11
  const y = (v) => T + (1 - (v - scale.min) / (scale.max - scale.min)) * (H - T - B)
  const line = (key) => pts.map((p) => `${x(p.turn).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ')
  const sel = hover !== null ? pts[hover] : pts[pts.length - 1]

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#24331F]/55 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label="Seu patrimônio no ano" className={`turn-pop grid max-h-full w-full max-w-3xl gap-4 overflow-y-auto ${TOY_CARD} p-5 sm:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#8A9680]">Seu patrimônio no ano</p>
            {sel && (
              <p className="font-toy text-[30px] font-extrabold leading-tight tabular-nums">
                {brl(sel.value)}
                <span className="ml-2 text-[14px] font-bold text-[#6B7A62]">{sel.live ? `agora, em ${FULL[sel.turn - 1]?.toLowerCase()}` : `fim de ${FULL[sel.turn - 1]?.toLowerCase()}`}</span>
              </p>
            )}
            {sel?.delta != null && (
              <p className={`text-sm font-extrabold ${sel.delta >= 0 ? 'text-[#2B8C41]' : 'text-[#C4283D]'}`}>
                {sel.delta >= 0 ? '▲' : '▼'} {brl(Math.abs(sel.delta))} em relação ao mês anterior
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="grid h-10 w-10 place-items-center rounded-full bg-[#F1EBDD] text-xl font-extrabold text-[#6B7A62] hover:bg-[#E6DCC7] cursor-pointer">×</button>
        </div>

        {pts.length === 0 ? (
          <p className="py-10 text-center text-[#6B7A62]">O gráfico começa na primeira virada do mês.</p>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Gráfico do patrimônio e do saldo mês a mês" onMouseLeave={() => setHover(null)}>
            <defs>
              <linearGradient id="wc-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#3DBE5A" stopOpacity=".28" /><stop offset="1" stopColor="#3DBE5A" stopOpacity="0" /></linearGradient>
            </defs>
            {scale.ticks.map((v) => (
              <g key={v}>
                <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={v === 0 ? '#C9BFA8' : '#EFE6D3'} strokeWidth={v === 0 ? 2 : 1} strokeDasharray={v === 0 ? '' : '4 4'} />
                <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="12" fontWeight="700" fill="#8A9680">{short(v)}</text>
              </g>
            ))}
            {MONTHS.map((m, i) => (
              <text key={m} x={x(i + 1)} y={H - 10} textAnchor="middle" fontSize="12" fontWeight="800" fill={sel?.turn === i + 1 ? '#24331F' : '#A9B19E'}>{m}</text>
            ))}
            {pts.length > 1 && (
              <polygon points={`${x(pts[0].turn)},${y(Math.max(scale.min, 0))} ${line('value')} ${x(pts[pts.length - 1].turn)},${y(Math.max(scale.min, 0))}`} fill="url(#wc-area)" />
            )}
            <polyline points={line('cash')} fill="none" stroke="#2F7FE0" strokeWidth="2.5" strokeDasharray="6 5" strokeLinejoin="round" />
            <polyline points={line('value')} fill="none" stroke="#2B8C41" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
            {sel && <line x1={x(sel.turn)} x2={x(sel.turn)} y1={T} y2={H - B} stroke="#24331F" strokeOpacity=".15" strokeWidth="2" />}
            {pts.map((p, i) => (
              <g key={p.turn}>
                <circle cx={x(p.turn)} cy={y(p.cash)} r="4" fill="#FFFFFF" stroke="#2F7FE0" strokeWidth="2.5" />
                <circle cx={x(p.turn)} cy={y(p.value)} r={sel === p ? 7.5 : 5.5} fill={p.live ? '#FFFFFF' : '#2B8C41'} stroke="#2B8C41" strokeWidth="3" />
                {/* área de toque grande em cada mês */}
                <rect x={x(p.turn) - 28} y={T} width="56" height={H - T - B} fill="transparent" onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
              </g>
            ))}
          </svg>
        )}

        <div className="flex flex-wrap gap-4 text-[13px] font-bold text-[#4A5A42]">
          <span className="flex items-center gap-2"><i className="h-1 w-6 rounded bg-[#2B8C41]" />Patrimônio (tudo o que você tem menos o que deve)</span>
          <span className="flex items-center gap-2"><i className="h-0 w-6 border-t-[3px] border-dashed border-[#2F7FE0]" />Saldo na conta</span>
        </div>

        {pts.length > 0 && (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-[#A9B19E]">
                <th className="py-1">Mês</th><th className="py-1 text-right">Patrimônio</th><th className="py-1 text-right">Saldo na conta</th><th className="py-1 text-right">Variação</th>
              </tr>
            </thead>
            <tbody>
              {[...pts].reverse().map((p) => (
                <tr key={p.turn} className={`border-t border-[#EFE6D3] ${sel === p ? 'bg-[#F7F2E6]' : ''}`}>
                  <td className="py-1.5 font-bold">{FULL[p.turn - 1]}{p.live ? ' (agora)' : ''}</td>
                  <td className="py-1.5 text-right font-extrabold tabular-nums">{brl(p.value)}</td>
                  <td className="py-1.5 text-right tabular-nums text-[#4A5A42]">{brl(p.cash)}</td>
                  <td className={`py-1.5 text-right font-extrabold tabular-nums ${p.delta == null ? 'text-[#A9B19E]' : p.delta >= 0 ? 'text-[#2B8C41]' : 'text-[#C4283D]'}`}>
                    {p.delta == null ? '—' : `${p.delta >= 0 ? '+' : '−'}${brl(Math.abs(p.delta)).replace('−', '')}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>,
    document.body,
  )
}
