import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GameLayout from '../../components/GameLayout'
import TownBackdrop from '../../components/town/TownBackdrop'
import { TOY_BUTTON, TOY_CARD, TOY_GHOST } from '../../components/town/toy'
import { getAvatarById } from '../../data/avatarTheme'
import useGameStore from '../../store/gameStore'
import api from '../../services/api'
import { consequenceNote, endOfMonthSeries, linePoints, niceMax, yearGain } from './yearChart'

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const brl0 = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

const BADGE_LOOK = {
  never_overdraft: ['#3DBE5A', '✓'],
  reserve_complete: ['#12B5A6', 'R'],
  coupon_hunter: ['#F2B53A', '%'],
  constellation: ['#8A5CF6', '★'],
  investor: ['#2457C5', '$'],
  bills_on_time: ['#EC4899', '✉'],
}
const PODIUM = [
  { place: 2, height: 120, color: '#C0C7D0' },
  { place: 1, height: 160, color: '#F2B53A' },
  { place: 3, height: 96, color: '#D98B4A' },
]

export default function Finished() {
  const navigate = useNavigate()
  const { character, setCharacter, setRoom } = useGameStore()
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!character?.id) return
    api.get(`/characters/${character.id}/year-summary`)
      .then(({ data }) => setSummary(data))
      .catch(() => setError('Não deu para carregar o resultado do ano.'))
  }, [character?.id])

  const newGame = () => {
    setCharacter(null)
    setRoom(null)
    navigate('/character')
  }

  return (
    <GameLayout light>
      <TownBackdrop />
      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {summary && <Confetti />}
        <header className="grid justify-items-center gap-1 text-center">
          <p className="rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold tracking-[0.18em] text-[#6B7A62]">FIM DO ANO EM SANTA RITA</p>
          <h1 className="font-toy text-[clamp(38px,6vw,58px)] font-extrabold leading-none text-[#2457C5] [text-shadow:0_4px_0_#BFD3FF]">Fechou o ano!</h1>
          <p className="text-[#4A5A42]">12 meses depois, quem cuidou melhor do dinheiro?</p>
        </header>

        {error && <p className={`${TOY_CARD} mx-auto mt-8 max-w-md p-6 text-center text-[#9F1D2F]`}>{error}</p>}
        {!summary && !error && <p className="mt-16 text-center font-toy text-xl text-[#6B7A62]">Somando o ano…</p>}

        {summary && (
          <>
            <Podium players={summary.players} />
            <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <MyYear summary={summary} />
              <div className="grid content-start gap-5">
                <Badges badges={summary.badges} />
                <section className={`${TOY_CARD} grid gap-3 p-5`}>
                  <h2 className="font-toy text-xl font-extrabold">Ranking da sala</h2>
                  <ol className="grid">
                    {summary.players.map((p, i) => (
                      <li key={p.characterId} className={`flex items-center justify-between gap-3 border-t border-[#EFE6D3] px-2 py-2 text-sm ${p.isSelf ? 'rounded-lg bg-[#E2F4E5] font-extrabold' : ''}`}>
                        <span>{i + 1}º · {p.name}{p.isSelf ? ' (você)' : ''}</span>
                        <b className="tabular-nums">{brl0(p.netWorth)}</b>
                      </li>
                    ))}
                  </ol>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => navigate('/bank')} className={`${TOY_BUTTON} w-auto flex-1`}>Ver o extrato do ano</button>
                    <button type="button" onClick={newGame} className={TOY_GHOST}>Nova partida</button>
                  </div>
                </section>
              </div>
            </div>
            {summary.timeline?.length > 0 && <Timeline items={summary.timeline} />}
          </>
        )}
      </div>
    </GameLayout>
  )
}

function Podium({ players }) {
  return (
    <div className="mt-6 flex flex-wrap items-end justify-center gap-4">
      {PODIUM.map(({ place, height, color }) => {
        const p = players[place - 1]
        if (!p) return null
        return (
          <div key={place} className="grid w-[150px] justify-items-center gap-1.5">
            <span className="grid h-20 w-20 place-items-end overflow-hidden rounded-full border-4 border-white bg-[#DDE6F5] shadow-[0_4px_0_#E2D6BE]">
              <img src={getAvatarById(p.avatarId ?? 1).image} alt="" className="w-[118%] max-w-none" />
            </span>
            <b className="font-toy text-lg leading-none">{p.name}{p.isSelf ? ' (você)' : ''}</b>
            <small className="text-[13px] font-extrabold tabular-nums text-[#6B7A62]">{brl0(p.netWorth)}</small>
            <div className="grid w-full place-items-center rounded-[18px_18px_8px_8px] font-toy text-4xl font-extrabold text-white shadow-[0_6px_0_rgba(0,0,0,0.15)]" style={{ height, background: color }}>
              {place}º
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MyYear({ summary }) {
  const { breakdown, rank, players } = summary
  const months = endOfMonthSeries(summary.months)
  const roomAverage = endOfMonthSeries(summary.roomAverage)
  const X0 = 56, X1 = 600, Y0 = 200, Y1 = 16
  const max = niceMax([...months, ...roomAverage].map((p) => Number(p.netWorth)))
  const box = { x0: X0, x1: X1, y0: Y0, y1: Y1, max }
  const me = linePoints(months, box)
  const avg = linePoints(roomAverage, box)
  const last = months[months.length - 1]
  const gain = yearGain(months)
  const parts = [
    ['Conta', Math.max(Number(breakdown.cash), 0), '#9FB3B0'],
    ['Caixinhas', breakdown.fixedIncome, '#2457C5'],
    ['Debêntures', breakdown.debentures, '#8A5CF6'],
    ['Ações', breakdown.stocks, '#334155'],
  ]
  const total = parts.reduce((s, p) => s + Number(p[1]), 0)

  return (
    <section className={`${TOY_CARD} grid content-start gap-4 p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#8A9680]">Seu patrimônio final</p>
          <p className="font-toy text-[42px] font-extrabold leading-none tabular-nums text-[#2B8C41]">{brl0(breakdown.netWorth)}</p>
        </div>
        <span className="rounded-full bg-[#E2F4E5] px-3 py-1 text-xs font-extrabold text-[#2B8C41]">
          {rank}º de {players.length} · {gain >= 0 ? '+' : ''}{brl0(gain)} no ano
        </span>
      </div>

      {months.length < 2 ? (
        <p className="rounded-2xl border-2 border-dashed border-[#EFE6D3] px-4 py-10 text-center text-sm text-[#8A9680]">
          O gráfico do ano aparece quando pelo menos dois meses tiverem sido fechados.
        </p>
      ) : (
      <svg viewBox="0 0 640 230" className="h-auto w-full" role="img" aria-label="Seu patrimônio mês a mês comparado com a média da sala">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = Y0 - (Y0 - Y1) * f
          return (
            <g key={f}>
              <line x1={X0} x2={X1} y1={y} y2={y} stroke="#EFE6D3" />
              <text x={X0 - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#8A9680">{brl0(max * f).replace('R$', '').trim()}</text>
            </g>
          )
        })}
        {MONTHS.map((m, i) => (i % 2 === 0 || i === 11) && (
          <text key={m} x={X0 + ((X1 - X0) * i) / 11} y={Y0 + 18} textAnchor="middle" fontSize="11" fill="#8A9680">{m}</text>
        ))}
        {me && <polygon points={`${X0},${Y0} ${me} ${me.split(' ').at(-1).split(',')[0]},${Y0}`} fill="#3DBE5A" opacity="0.12" />}
        {avg && <polyline points={avg} fill="none" stroke="#A9B19E" strokeWidth="2" strokeDasharray="5 5" />}
        {me && <polyline points={me} fill="none" stroke="#2B8C41" strokeWidth="3" strokeLinejoin="round" />}
        {last && (() => {
          const [x, y] = me.split(' ').at(-1).split(',').map(Number)
          return (
            <g>
              <circle cx={x} cy={y} r="5" fill="#2B8C41" />
              <text x={x - 8} y={y - 10} textAnchor="end" fontSize="11" fontWeight="800" fill="#2B8C41">você</text>
            </g>
          )
        })()}
        {avg && (() => {
          const [x, y] = avg.split(' ').at(-1).split(',').map(Number)
          return <text x={x - 8} y={y + 16} textAnchor="end" fontSize="11" fill="#8A9680">média da sala</text>
        })()}
      </svg>
      )}

      <div className="flex h-3 overflow-hidden rounded-md bg-[#EFE6D3]">
        {total > 0 && parts.map(([name, v, color]) => <span key={name} style={{ width: `${(Number(v) / total) * 100}%`, background: color }} />)}
      </div>
      <dl className="grid gap-1 text-sm">
        {parts.map(([name, v, color]) => (
          <div key={name} className="flex justify-between gap-3">
            <dt className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />{name}</dt>
            <dd className="font-bold tabular-nums">{brl0(v)}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-3 text-[#C4283D]">
          <dt className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-[3px] bg-[#C4283D]" />Dívidas</dt>
          <dd className="font-bold tabular-nums">{brl0(breakdown.debts)}</dd>
        </div>
      </dl>
    </section>
  )
}

const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const brl2 = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Linha do tempo das escolhas: cada dilema, o que custou e o que voltou depois.
function Timeline({ items }) {
  return (
    <section className={`${TOY_CARD} mt-5 grid gap-4 p-5`}>
      <div>
        <h2 className="font-toy text-xl font-extrabold">Suas escolhas do ano</h2>
        <p className="text-sm text-[#6B7A62]">Cada dilema e o que ele trouxe nos meses seguintes.</p>
      </div>
      <ol className="grid gap-3">
        {items.map((t) => (
          <li key={t.turn} className="grid grid-cols-[52px_minmax(0,1fr)] gap-3">
            <span className="grid h-11 place-items-center rounded-2xl bg-[#FFF3C4] font-toy text-[15px] font-extrabold text-[#B07A0C]">{MONTH_SHORT[t.turn - 1]}</span>
            <div className="grid gap-1 border-b border-[#EFE6D3] pb-3">
              <p className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#8A9680]">{t.title}</p>
              <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-[15px] font-semibold">
                <span>{t.label} · {t.choice}</span>
                {t.amount > 0 && <span className="tabular-nums text-[#C4283D]">−{brl2(t.amount)}</span>}
              </p>
              {t.consequences.map((c) => (
                <p key={c.label} className="flex flex-wrap items-baseline justify-between gap-x-3 text-[13px] text-[#4A5A42]">
                  <span>↳ {c.label.replace(/^[^:]+: /, '')} <span className="text-[#8A9680]">({consequenceNote(c)})</span></span>
                  {c.amount !== 0 && (
                    <span className={`font-bold tabular-nums ${c.amount > 0 ? 'text-[#2B8C41]' : 'text-[#C4283D]'}`}>{c.amount > 0 ? '+' : '−'}{brl2(Math.abs(c.amount))}</span>
                  )}
                </p>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Badges({ badges }) {
  return (
    <section className={`${TOY_CARD} grid gap-3 p-5`}>
      <h2 className="font-toy text-xl font-extrabold">Conquistas</h2>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {badges.map((b) => {
          const [color, icon] = BADGE_LOOK[b.id] ?? ['#8A9680', '•']
          return (
            <li key={b.id} className={`grid justify-items-center gap-1 rounded-[18px] border-[3px] border-[#EFE6D3] bg-white px-2 py-3 text-center ${b.earned ? '' : 'opacity-45 grayscale'}`}>
              <span className="grid h-10 w-10 place-items-center rounded-full font-toy text-lg font-extrabold text-white shadow-[0_3px_0_rgba(0,0,0,0.18)]" style={{ background: color }}>{icon}</span>
              <b className="text-[13px] leading-tight">{b.title}</b>
              <small className="text-[11px] leading-snug text-[#8A9680]">{b.description}</small>
              <span className="sr-only">{b.earned ? 'Conquistada' : 'Não conquistada'}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// Chuva de confete quando o resultado aparece.
function Confetti() {
  const ref = useRef(null)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const r = canvas.getBoundingClientRect()
    const d = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = r.width * d; canvas.height = r.height * d
    ctx.setTransform(d, 0, 0, d, 0, 0)
    const colors = ['#FF5C8A', '#FFC857', '#3DBE5A', '#5AA2FF', '#B884FF']
    const parts = Array.from({ length: 170 }, () => ({
      x: r.width / 2 + (Math.random() - 0.5) * 240, y: 140, vx: (Math.random() - 0.5) * 13, vy: -Math.random() * 13 - 4,
      a: Math.random() * 6, c: colors[Math.floor(Math.random() * 5)],
    }))
    const start = performance.now()
    let frame = 0
    const step = (now) => {
      ctx.clearRect(0, 0, r.width, r.height)
      for (const p of parts) {
        p.vy += 0.28; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += 0.15
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-4, -6, 8, 12); ctx.restore()
      }
      if (now - start < 4500) frame = requestAnimationFrame(step)
      else ctx.clearRect(0, 0, r.width, r.height)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [])
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 h-[80vh] w-full" />
}
