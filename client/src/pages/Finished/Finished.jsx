import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import GameLayout from '../../components/GameLayout'
import TownBackdrop from '../../components/town/TownBackdrop'
import { TOY_BUTTON, TOY_CARD, TOY_GHOST } from '../../components/town/toy'
import { getAvatarById } from '../../data/avatarTheme'
import useGameStore from '../../store/gameStore'
import api from '../../services/api'
import { consequenceNote, endOfMonthSeries, linePoints, niceMax, yearGain } from './yearChart'
import { pickDecisions, podiumSlots, roomComparison } from './yearRecap'

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const brl0 = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const brl2 = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const signed = (n, fmt = brl0) => (n > 0 ? `+${fmt(n)}` : n < 0 ? `−${fmt(Math.abs(n))}` : fmt(0))

const KICKER = 'text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#8A9680]'

const BADGE_LOOK = {
  never_overdraft: ['#3DBE5A', '✓'],
  reserve_complete: ['#12B5A6', 'R'],
  coupon_hunter: ['#F2B53A', '%'],
  constellation: ['#8A5CF6', '★'],
  investor: ['#2457C5', '$'],
  bills_on_time: ['#EC4899', '✉'],
}

// cor e altura de cada degrau do pódio
const STEP = {
  1: { height: 150, color: '#F2B53A', shade: '#C98F1B' },
  2: { height: 112, color: '#AEB8C4', shade: '#8893A1' },
  3: { height: 86, color: '#D98B4A', shade: '#B06A2F' },
}
const STEP_DELAY = 0.65 // segundos entre um degrau e outro

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

  const hasRanking = summary?.players?.length > 0

  return (
    <GameLayout light>
      <TownBackdrop />
      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {summary && !hasRanking && <Confetti />}
        <header className="grid justify-items-center gap-1 text-center">
          <p className="rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold tracking-[0.18em] text-[#6B7A62]">FIM DO ANO</p>
          <h1 className="font-toy text-[clamp(38px,6vw,58px)] font-extrabold leading-none text-[#2457C5] [text-shadow:0_4px_0_#BFD3FF]">Fechou o ano!</h1>
          <p className="text-[#4A5A42]">12 meses depois, quem cuidou melhor do dinheiro?</p>
        </header>

        {error && <p className={`${TOY_CARD} mx-auto mt-8 max-w-md p-6 text-center text-[#9F1D2F]`}>{error}</p>}
        {!summary && !error && <p className="mt-16 text-center font-toy text-xl text-[#6B7A62]">Somando o ano…</p>}

        {summary && (
          <div className="mt-6 grid gap-5">
            {hasRanking && <Podium players={summary.players} />}
            <Comparison summary={summary} />
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <MyYear summary={summary} />
              <div className="grid content-start gap-5">
                {hasRanking && <Ranking players={summary.players} />}
                <Badges badges={summary.badges ?? []} />
              </div>
            </div>
            {summary.timeline?.length > 0 && <BestDecisions timeline={summary.timeline} />}
            {summary.timeline?.length > 0 && <Timeline items={summary.timeline} />}
            <div className="mx-auto grid w-full max-w-lg gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <button type="button" onClick={() => navigate('/bank')} className={TOY_BUTTON}>Ver o extrato do ano</button>
              <button type="button" onClick={newGame} className={TOY_GHOST}>Nova partida</button>
            </div>
          </div>
        )}
      </div>
    </GameLayout>
  )
}

// ─── pódio ────────────────────────────────────────────────────────────────

// Os 3 primeiros sobem em sequência (3º, 2º, 1º); confete quando o 1º chega.
function Podium({ players }) {
  const reduce = useReducedMotion()
  const slots = podiumSlots(players)
  const firstEnter = slots.find((s) => s.place === 1)?.enter ?? slots.length - 1
  return (
    <section aria-label="Pódio" className="relative">
      {!reduce && <Confetti delay={(firstEnter * STEP_DELAY + 0.55) * 1000} originY={60} />}
      <ol className="flex items-end justify-center gap-2 sm:gap-4">
        {slots.map((s) => <PodiumStep key={s.player.characterId ?? s.place} {...s} reduce={reduce} />)}
      </ol>
    </section>
  )
}

function PodiumStep({ player, place, enter, reduce }) {
  const step = STEP[place] ?? STEP[3]
  const delay = reduce ? 0 : enter * STEP_DELAY
  const first = place === 1
  return (
    <li className="grid min-w-0 max-w-[160px] flex-1 justify-items-center gap-1.5 pt-3">
      <motion.div
        className="relative grid w-full justify-items-center gap-1.5"
        initial={reduce ? false : { y: -70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: delay + 0.3, type: 'spring', stiffness: 420, damping: 9, mass: 0.8 }}
      >
        {player.isSelf && (
          <motion.span
            className="absolute -top-3 z-10 rounded-full bg-[#2457C5] px-2.5 py-0.5 font-toy text-[13px] font-extrabold text-white shadow-[0_3px_0_#173B8C]"
            animate={reduce ? undefined : { scale: [1, 1.12, 1] }}
            transition={{ delay: delay + 1, duration: 0.9, repeat: Infinity, repeatDelay: 1.2 }}
          >
            Você!
          </motion.span>
        )}
        <span
          className={`grid place-items-end overflow-hidden rounded-full border-4 bg-[#DDE6F5] shadow-[0_4px_0_#E2D6BE] ${first ? 'h-[clamp(64px,18vw,92px)] w-[clamp(64px,18vw,92px)] border-[#F2B53A]' : 'h-[clamp(54px,15vw,76px)] w-[clamp(54px,15vw,76px)] border-white'} ${player.isSelf ? 'ring-4 ring-[#2457C5]/60' : ''}`}
        >
          <img src={getAvatarById(player.avatarId ?? 1).image} alt="" className="w-[118%] max-w-none" />
        </span>
        <span className="grid max-w-full justify-items-center rounded-2xl bg-white/90 px-2.5 py-1 shadow-[0_3px_0_#E2D6BE]">
          <b className="max-w-full truncate font-toy text-[clamp(14px,3.6vw,18px)] leading-tight" title={player.name}>{player.name}</b>
          <small className="text-[clamp(11px,3vw,13px)] font-extrabold tabular-nums text-[#4A5A42]">{brl0(player.netWorth)}</small>
        </span>
      </motion.div>
      <motion.div
        className="grid w-full place-items-start justify-center overflow-hidden rounded-[18px_18px_8px_8px] pt-2 font-toy text-[clamp(26px,7vw,40px)] font-extrabold text-white"
        style={{ background: step.color, boxShadow: `inset 0 -10px 0 ${step.shade}, 0 6px 0 rgba(0,0,0,0.12)` }}
        initial={reduce ? false : { height: 0 }}
        animate={{ height: step.height }}
        transition={{ delay, type: 'spring', stiffness: 170, damping: 13 }}
      >
        <span className="[text-shadow:0_2px_0_rgba(0,0,0,0.18)]">{place}º</span>
      </motion.div>
    </li>
  )
}

// ─── você × sala ────────────────────────────────────────────────────────────

function Comparison({ summary }) {
  const c = roomComparison(summary)
  const bars = [
    { name: 'Você', value: c.mine, color: '#2B8C41' },
    c.best != null && !c.isLeader && { name: `1º lugar · ${c.bestName}`, value: c.best, color: '#F2B53A' },
    c.average != null && { name: 'Média da sala', value: c.average, color: '#A9B19E' },
  ].filter(Boolean)
  const top = Math.max(1, ...bars.map((b) => b.value))

  return (
    <section className={`${TOY_CARD} grid gap-4 p-5 sm:p-6`}>
      <p className={KICKER}>Seu resultado</p>
      <h2 className="font-toy text-[clamp(20px,3.4vw,28px)] font-extrabold leading-tight">
        Você terminou com <span className="tabular-nums text-[#2B8C41]">{brl0(c.mine)}</span>
        {c.isLeader && <>: o melhor resultado da sala!</>}
        {!c.isLeader && c.best != null && <>; o melhor da sala terminou com <span className="tabular-nums text-[#B07A0C]">{brl0(c.best)}</span>.</>}
        {!c.isLeader && c.best == null && c.average != null && <>; a média da sala ficou em <span className="tabular-nums text-[#6B7A62]">{brl0(c.average)}</span>.</>}
      </h2>

      {bars.length > 1 && (
        <ul className="grid gap-2">
          {bars.map((b) => (
            <li key={b.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm sm:grid-cols-[150px_minmax(0,1fr)_auto]">
              <span className="truncate font-bold text-[#4A5A42]">{b.name}</span>
              <span className="col-span-2 row-start-2 h-3 overflow-hidden rounded-full bg-[#EFE6D3] sm:col-span-1 sm:row-start-auto">
                <motion.span
                  className="block h-full rounded-full"
                  style={{ background: b.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(Math.max(b.value, 0) / top) * 100}%` }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                />
              </span>
              <b className="tabular-nums">{brl0(b.value)}</b>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        {c.toBest != null && !c.isLeader && (
          <Chip tone="gold">{brl0(c.toBest)} abaixo do 1º lugar</Chip>
        )}
        {c.isLeader && <Chip tone="gold">1º lugar</Chip>}
        {c.vsAverage != null && (
          <Chip tone={c.vsAverage >= 0 ? 'green' : 'red'}>
            {brl0(Math.abs(c.vsAverage))} {c.vsAverage >= 0 ? 'acima' : 'abaixo'} da média
          </Chip>
        )}
      </div>
      <p className="text-[15px] text-[#4A5A42]">{c.message}</p>
    </section>
  )
}

const CHIP = {
  gold: 'bg-[#FFF3C4] text-[#8A5F06]',
  green: 'bg-[#E2F4E5] text-[#2B8C41]',
  red: 'bg-[#FDE2E5] text-[#9F1D2F]',
}
const Chip = ({ tone, children }) => (
  <span className={`rounded-full px-3 py-1 text-xs font-extrabold tabular-nums ${CHIP[tone]}`}>{children}</span>
)

// ─── o ano mês a mês ─────────────────────────────────────────────────────────

function MyYear({ summary }) {
  const { breakdown } = summary
  const months = endOfMonthSeries(summary.months)
  const roomAverage = endOfMonthSeries(summary.roomAverage)
  const X0 = 56, X1 = 600, Y0 = 200, Y1 = 16
  const max = niceMax([...months, ...roomAverage].map((p) => Number(p.netWorth)))
  const box = { x0: X0, x1: X1, y0: Y0, y1: Y1, max }
  const me = linePoints(months, box)
  const avg = linePoints(roomAverage, box)
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
        <h2 className="font-toy text-xl font-extrabold">Seu ano, mês a mês</h2>
        {months.length > 1 && (
          <Chip tone={gain >= 0 ? 'green' : 'red'}>{signed(gain)} no ano</Chip>
        )}
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
        {me && (() => {
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

      <div>
        <p className={`${KICKER} mb-2`}>Onde está o seu dinheiro</p>
        <div className="flex h-3 overflow-hidden rounded-md bg-[#EFE6D3]">
          {total > 0 && parts.map(([name, v, color]) => <span key={name} style={{ width: `${(Number(v) / total) * 100}%`, background: color }} />)}
        </div>
      </div>
      <dl className="grid gap-1 text-sm sm:grid-cols-2 sm:gap-x-6">
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

// ─── ranking em lista ────────────────────────────────────────────────────────

function Ranking({ players }) {
  return (
    <section className={`${TOY_CARD} grid gap-2 p-5`}>
      <h2 className="font-toy text-xl font-extrabold">Ranking da sala</h2>
      <ol className="grid">
        {players.map((p, i) => (
          <li key={p.characterId} className={`flex items-center gap-3 border-t border-[#EFE6D3] px-2 py-2 text-sm first:border-t-0 ${p.isSelf ? 'rounded-xl border-transparent bg-[#E2F4E5] font-extrabold' : ''}`}>
            <span className="w-7 shrink-0 text-right font-toy text-base font-extrabold text-[#8A9680]">{p.rank ?? i + 1}º</span>
            <span className="grid h-8 w-8 shrink-0 place-items-end overflow-hidden rounded-full bg-[#DDE6F5]">
              <img src={getAvatarById(p.avatarId ?? 1).image} alt="" className="w-[118%] max-w-none" />
            </span>
            <span className="min-w-0 flex-1 truncate">{p.name}{p.isSelf ? ' (você)' : ''}</span>
            <b className="tabular-nums">{brl0(p.netWorth)}</b>
          </li>
        ))}
      </ol>
    </section>
  )
}

// ─── as decisões que mais pesaram ─────────────────────────────────────────────

function BestDecisions({ timeline }) {
  const { best, worst } = pickDecisions(timeline)
  if (!best.length && !worst) return null
  return (
    <section className={`${TOY_CARD} grid gap-4 p-5 sm:p-6`}>
      <div>
        <h2 className="font-toy text-xl font-extrabold">As decisões que mais pesaram</h2>
        <p className="text-sm text-[#6B7A62]">Quanto cada escolha deixou no seu bolso até dezembro: o que saiu na hora mais o que veio depois.</p>
      </div>
      <div className={`grid gap-4 ${worst ? 'md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]' : ''}`}>
        {best.length > 0 && (
          <div className="grid content-start gap-2">
            <p className={`${KICKER} text-[#2B8C41]`}>Melhores escolhas</p>
            <ol className="grid gap-2">
              {best.map((d, i) => <DecisionCard key={d.turn} d={d} tone="good" index={i} />)}
            </ol>
          </div>
        )}
        {worst && (
          <div className="grid content-start gap-2">
            <p className={`${KICKER} text-[#C4283D]`}>A que mais custou</p>
            <ol className="grid gap-2">
              <DecisionCard d={worst} tone="bad" index={best.length} />
            </ol>
          </div>
        )}
      </div>
    </section>
  )
}

function DecisionCard({ d, tone, index }) {
  const good = tone === 'good'
  const valueClass = d.impact > 0 ? 'text-[#2B8C41]' : d.impact < 0 ? (good ? 'text-[#6B7A62]' : 'text-[#C4283D]') : 'text-[#6B7A62]'
  const caption = d.impact > 0 ? 'deixou a mais' : d.impact === 0 ? 'não custou nada' : good ? 'custou pouco' : 'custou'
  return (
    <motion.li
      className={`grid grid-cols-[48px_minmax(0,1fr)] items-start gap-3 rounded-[20px] border-[3px] p-3 ${good ? 'border-[#D5EDD9] bg-[#F4FBF5]' : 'border-[#F5D0D5] bg-[#FFF5F6]'}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.08, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="grid h-11 place-items-center rounded-2xl bg-[#FFF3C4] font-toy text-[15px] font-extrabold text-[#B07A0C]">{MONTHS[d.turn - 1]}</span>
      <div className="grid gap-0.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#8A9680]">{d.title}</p>
          <p className="text-right">
            <b className={`font-toy text-lg tabular-nums ${valueClass}`}>{signed(d.impact)}</b>
            <span className="ml-1.5 text-[11px] font-bold text-[#8A9680]">{caption}</span>
          </p>
        </div>
        <p className="text-[15px] font-semibold leading-snug">{d.label} · {d.choice}</p>
        {d.note && <p className="text-[13px] text-[#4A5A42]">↳ {d.note}</p>}
      </div>
    </motion.li>
  )
}

// ─── linha do tempo completa ──────────────────────────────────────────────────

// Cada dilema, o que custou e o que voltou depois. Fica fechada para não
// pesar a tela: quem quiser abre.
function Timeline({ items }) {
  return (
    <details className={`${TOY_CARD} group p-5`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block font-toy text-xl font-extrabold">Todas as suas escolhas do ano</span>
          <span className="block text-sm text-[#6B7A62]">Cada dilema e o que ele trouxe nos meses seguintes.</span>
        </span>
        <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#EFE6D3] font-toy text-lg font-extrabold text-[#6B7A62] transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <ol className="mt-4 grid gap-3">
        {items.map((t) => (
          <li key={t.turn} className="grid grid-cols-[52px_minmax(0,1fr)] gap-3">
            <span className="grid h-11 place-items-center rounded-2xl bg-[#FFF3C4] font-toy text-[15px] font-extrabold text-[#B07A0C]">{MONTHS[t.turn - 1]}</span>
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
    </details>
  )
}

// ─── conquistas ───────────────────────────────────────────────────────────────

function Badges({ badges }) {
  const earned = badges.filter((b) => b.earned).length
  return (
    <section className={`${TOY_CARD} grid gap-3 p-5`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-toy text-xl font-extrabold">Conquistas</h2>
        <span className="text-xs font-extrabold text-[#8A9680]">{earned} de {badges.length}</span>
      </div>
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

// ─── confete ──────────────────────────────────────────────────────────────────

// Chuva de confete. `delay` em ms (o pódio espera o 1º chegar); `originY` é a
// altura de onde o confete sai, dentro do bloco onde ele está.
function Confetti({ delay = 0, originY = 140 }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    let frame = 0
    const timer = setTimeout(() => {
      const r = canvas.getBoundingClientRect()
      const d = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = r.width * d; canvas.height = r.height * d
      ctx.setTransform(d, 0, 0, d, 0, 0)
      const colors = ['#FF5C8A', '#FFC857', '#3DBE5A', '#5AA2FF', '#B884FF']
      const parts = Array.from({ length: 170 }, () => ({
        x: r.width / 2 + (Math.random() - 0.5) * 120, y: originY, vx: (Math.random() - 0.5) * 13, vy: -Math.random() * 12 - 4,
        a: Math.random() * 6, c: colors[Math.floor(Math.random() * 5)],
      }))
      const start = performance.now()
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
    }, delay)
    return () => { clearTimeout(timer); cancelAnimationFrame(frame) }
  }, [delay, originY])
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[80vh] w-full" />
}
