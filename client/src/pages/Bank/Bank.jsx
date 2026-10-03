import { useEffect, useState } from 'react'
import api from '../../services/api'
import useGameStore from '../../store/gameStore'
import GameLayout from '../../components/GameLayout'
import { BOXES, MONTHS, boxByType } from './bankData'
import MareLogo from './MareLogo'
import {
  debentureValue as debentureValueOf, debentureYield as debentureYieldOf, fixedBoxValue, fixedBoxYield,
  nextMaturity as nextMaturityOf, parseAmount, reserveGoal as reserveGoalOf,
  reserveMonths as reserveMonthsOf, shares, stocksValue as stocksValueOf, activeDebentures as activeDebenturesOf,
  OVERDRAFT_MONTHLY_RATE, overdraftInterest,
} from './bankMath'

const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const readStored = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
const writeStored = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // sem storage: só não lembra a preferência
  }
}

const Icon = {
  eye: <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />,
  eyeOff: <path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />,
  in: <path d="M12 4v12M6 10l6 6 6-6M4 20h16" />,
  out: <path d="M12 20V8M6 14l6-6 6 6M4 4h16" />,
  plus: <path d="M12 5v14M5 12h14" />,
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  box: <path d="M4 8h16v11H4zM3 5h18v3H3zM10 12h4" />,
  lock: <path d="M5 11h14v10H5zM8 11V8a4 4 0 0 1 8 0v3" />,
  up: <path d="M4 17l6-6 4 4 6-8" />,
}
const Svg = ({ d, className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {d}
  </svg>
)

const RISK_STYLE = {
  Baixo: 'bg-[#E0F5EA] text-[#0B6B3F]',
  Médio: 'bg-[#FDF1D6] text-[#8A5A00]',
  Alto: 'bg-[#FDE2E5] text-[#9F1D2F]',
}

export default function Bank() {
  const { character, room, setCharacter } = useGameStore()
  const [fixed, setFixed] = useState([])
  const [debentures, setDebentures] = useState([])
  const [companies, setCompanies] = useState([])
  const [market, setMarket] = useState([])
  const [portfolio, setPortfolio] = useState([])
  const [hide, setHide] = useState(() => readStored('bank:hide', false))
  const [extraBoxes, setExtraBoxes] = useState(() => readStored(`bank:boxes:${character?.id}`, []))
  const [sheet, setSheet] = useState(null) // { kind: 'move', type, mode, value, error } | { kind: 'new' }
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')

  const turn = room?.currentTurn ?? 0
  const money = (n) => (hide ? 'R$ ••••' : brl(n))

  const refresh = async () => {
    if (!character?.id) return
    const calls = [
      api.get(`/investments/fixed/${character.id}`).then(({ data }) => setFixed(data)),
      api.get(`/investments/debentures/${character.id}`).then(({ data }) => setDebentures(data)),
      api.get(`/investments/portfolio/${character.id}`).then(({ data }) => setPortfolio(data)),
      api.get(`/characters/${character.id}`).then(({ data }) => setCharacter(data)),
    ]
    if (room?.id) calls.push(api.get(`/investments/market/${room.id}`).then(({ data }) => setMarket(data)))
    await Promise.allSettled(calls)
  }

  useEffect(() => {
    refresh()
    api.get('/investments/companies').then(({ data }) => setCompanies(data)).catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.id, room?.id, turn])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(''), 2800)
    return () => clearTimeout(id)
  }, [toast])

  const toggleHide = () => {
    setHide(!hide)
    writeStored('bank:hide', !hide)
  }

  // ── valores de cada caixinha ───────────────────────────────────────────
  const company = companies[0]
  const activeDebentures = activeDebenturesOf(debentures)
  const nextMaturity = nextMaturityOf(debentures)
  const boxValue = (type) => (type === 'DEBENTURE' ? debentureValueOf(debentures, turn) : fixedBoxValue(fixed, type))
  const boxYield = (type) => (type === 'DEBENTURE' ? debentureYieldOf(debentures, turn) : fixedBoxYield(fixed, type))

  const activeTypes = BOXES
    .filter((b) => b.initial || extraBoxes.includes(b.type) || boxValue(b.type) > 0)
    .map((b) => b.type)

  const cash = Number(character?.cash ?? 0)
  const stocksValue = stocksValueOf(portfolio)
  const boxesTotal = activeTypes.reduce((sum, t) => sum + boxValue(t), 0)
  const total = cash + boxesTotal + stocksValue
  const monthlyYield = activeTypes.reduce((sum, t) => sum + boxYield(t), 0)
  const reserveGoal = reserveGoalOf(character)
  // caixinha com mais dinheiro resgatável para cobrir o cheque especial
  const coverType = activeTypes
    .filter((t) => t !== 'DEBENTURE')
    .reduce((best, t) => (boxValue(t) > boxValue(best) ? t : best), 'POUPANCA')

  // ── ações ──────────────────────────────────────────────────────────────
  const openMove = (type, mode = 'guardar') => setSheet({ kind: 'move', type, mode, value: '', error: '' })

  const confirmMove = async () => {
    const box = boxByType(sheet.type)
    const amount = parseAmount(sheet.value)
    if (!(amount > 0)) return setSheet({ ...sheet, error: 'Digite um valor maior que zero.' })
    if (sheet.mode === 'guardar' && amount > cash) return setSheet({ ...sheet, error: `Saldo insuficiente na conta: você tem ${brl(cash)}.` })

    setBusy(true)
    try {
      if (sheet.mode === 'guardar') {
        if (box.type === 'DEBENTURE') {
          await api.post(`/investments/debentures/${character.id}`, { companyId: company?.id, amount })
        } else {
          await api.post(`/investments/fixed/${character.id}`, { type: box.type, amount })
        }
        setToast(`${brl(amount)} guardados em ${box.short}`)
      } else {
        const { data } = await api.post(`/investments/fixed/${character.id}/withdraw`, { type: box.type, amount })
        setToast(data.incomeTax > 0
          ? `${brl(data.net)} na conta (IR de ${brl(data.incomeTax)})`
          : `${brl(data.net)} resgatados de ${box.short}`)
      }
      setSheet(null)
      await refresh()
    } catch (err) {
      setSheet({ ...sheet, error: err.response?.data?.error || 'Não deu certo. Tente de novo.' })
    } finally {
      setBusy(false)
    }
  }

  const createBox = (type) => {
    const next = [...extraBoxes, type]
    setExtraBoxes(next)
    writeStored(`bank:boxes:${character.id}`, next)
    openMove(type)
  }

  const trade = async (asset, operation, quantity) => {
    setBusy(true)
    try {
      await api.post(`/investments/trade/${character.id}`, { assetId: asset.id, operation, quantity })
      setToast(`${operation === 'buy' ? 'Comprou' : 'Vendeu'} ${quantity} ${asset.ticker}`)
      await refresh()
    } catch (err) {
      setToast(err.response?.data?.error || 'Não deu certo. Tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  const extrato = [...(character?.eventLog ?? [])]
    .filter((e) => Number(e.cashImpact ?? 0) !== 0)
    .sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt))
    .slice(0, 8)

  const parts = shares([
    { name: 'Conta', value: Math.max(cash, 0), color: '#9FB3B0' },
    ...activeTypes.map((t) => ({ name: boxByType(t).short, value: boxValue(t), color: boxByType(t).color })),
    { name: 'Ações', value: stocksValue, color: '#334155' },
  ])
  const reserveMonths = reserveMonthsOf(boxValue('POUPANCA'), character)
  const initials = (character?.name ?? '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <GameLayout light>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="relative overflow-hidden rounded-[28px] bg-[#F3F6F6] text-[#10201E] shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
          {/* cabeçalho da marca */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[#12B5A6] px-6 pb-16 pt-5 text-white sm:px-7">
            <div className="flex items-center gap-3">
              <MareLogo size={42} />
              <div>
                <p className="text-2xl font-black leading-none tracking-tight">Maré</p>
                <p className="mt-1 text-xs opacity-90">O seu dinheiro na onda certa.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-bold">Olá, {character?.name}</p>
                <p className="text-xs opacity-90">{MONTHS[turn - 1] ?? 'Antes da partida'} · mês {turn} de 12</p>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white/20 font-black">{initials}</span>
              <button
                type="button"
                onClick={toggleHide}
                aria-label={hide ? 'Mostrar valores' : 'Esconder valores'}
                className="grid h-10 w-10 place-items-center rounded-full bg-white/20 transition-colors hover:bg-white/30 cursor-pointer"
              >
                <Svg d={hide ? Icon.eyeOff : Icon.eye} />
              </button>
            </div>
          </div>

          <div className="-mt-11 grid gap-4 px-4 pb-6 sm:px-7">
            {cash < 0 && (
              <section role="alert" className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-[#F5B8C0] bg-[#FDE2E5] p-5 text-[#7A1626] shadow-sm sm:p-6">
                <div className="min-w-[14rem] flex-1">
                  <p className="font-extrabold">Você está no cheque especial</p>
                  <p className="mt-1 text-sm">
                    Está usando <b className="tabular-nums">{money(-cash)}</b> do limite. Os juros são de {OVERDRAFT_MONTHLY_RATE * 100}% ao mês:
                    se continuar assim, no fechamento do mês vêm mais <b className="tabular-nums">{money(overdraftInterest(cash))}</b> de dívida.
                    Todo dinheiro que entra na conta abate a dívida primeiro.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openMove(coverType, 'resgatar')}
                  className="rounded-[14px] bg-[#C4283D] px-5 py-3 font-extrabold text-white transition-colors hover:bg-[#9F1D2F] cursor-pointer"
                >
                  Cobrir com uma caixinha
                </button>
              </section>
            )}

            {/* conta + patrimônio */}
            <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
              <section className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 rounded-[20px] bg-white p-5 shadow-sm sm:p-6">
                <div className="min-w-[12rem]">
                  <p className="text-sm text-[#627673]">Saldo em conta</p>
                  <p className={`mt-1 text-4xl font-black tracking-tight tabular-nums ${cash < 0 ? 'text-[#C4283D]' : ''}`}>{money(cash)}</p>
                  {cash < 0 && <p className="mt-1 text-xs font-bold text-[#C4283D]">Usando o cheque especial</p>}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-3">
                  {[
                    { label: 'Guardar', icon: Icon.in, onClick: () => openMove('POUPANCA', 'guardar') },
                    { label: 'Resgatar', icon: Icon.out, onClick: () => openMove('POUPANCA', 'resgatar') },
                    { label: 'Nova caixinha', icon: Icon.plus, onClick: () => setSheet({ kind: 'new' }) },
                    { label: 'Extrato', icon: Icon.list, onClick: () => document.getElementById('extrato')?.scrollIntoView({ behavior: 'smooth' }) },
                  ].map((a) => (
                    <button key={a.label} type="button" onClick={a.onClick} className="group grid w-[76px] justify-items-center gap-2 text-xs font-bold cursor-pointer">
                      <span className="grid h-14 w-14 place-items-center rounded-full bg-[#E2F6F3] text-[#063F3A] transition-colors group-hover:bg-[#CBEFE9]">
                        <Svg d={a.icon} className="h-6 w-6" />
                      </span>
                      <span className="text-center leading-tight">{a.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="grid content-start gap-3 rounded-[20px] bg-white p-5 shadow-sm sm:p-6">
                <h3 className="flex items-center justify-between font-extrabold">
                  Patrimônio <span className="tabular-nums">{money(total)}</span>
                </h3>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-[#E3EAE9]">
                  {parts.map((p) => (
                    <span key={p.name} style={{ width: `${p.pct}%`, background: p.color }} />
                  ))}
                </div>
                <div className="grid gap-1.5 text-sm">
                  {parts.filter((p) => p.value > 0 || p.name === 'Conta').map((p) => (
                    <div key={p.name} className="flex justify-between gap-3">
                      <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />{p.name}</span>
                      <b className="tabular-nums">{money(p.value)}</b>
                    </div>
                  ))}
                  {cash < 0 && (
                    <div className="flex justify-between gap-3 text-[#C4283D]">
                      <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-[3px] bg-[#C4283D]" />Cheque especial</span>
                      <b className="tabular-nums">{money(cash)}</b>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* caixinhas */}
            <section className="grid gap-4 rounded-[20px] bg-white p-5 shadow-sm sm:p-6">
              <h3 className="flex flex-wrap items-center justify-between gap-2 font-extrabold">
                Caixinhas
                <span className="text-sm font-medium text-[#627673]">
                  Rendem cerca de <b className="tabular-nums text-[#0B8A50]">{money(monthlyYield)}</b> até o fim do mês
                </span>
              </h3>
              <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
                {activeTypes.map((type) => {
                  const box = boxByType(type)
                  const value = boxValue(type)
                  const locked = type === 'DEBENTURE' && activeDebentures.length > 0
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => openMove(type)}
                      className="grid content-start gap-2 rounded-[18px] border border-[#E3EAE9] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[#12B5A6] cursor-pointer"
                    >
                      <span className="flex items-center justify-between">
                        <span className="grid h-9 w-9 place-items-center rounded-xl text-white" style={{ background: box.color }}><Svg d={Icon.box} /></span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${RISK_STYLE[box.risk]}`}>Risco {box.risk.toLowerCase()}</span>
                      </span>
                      <b className="text-sm">{type === 'DEBENTURE' && company ? `Debênture ${company.name}` : box.name}</b>
                      <span className="text-[22px] font-black tabular-nums">{money(value)}</span>
                      <small className="text-xs text-[#627673]">{box.rate} · rende {money(boxYield(type))} este mês</small>
                      <BoxFacts box={box} />
                      {box.type === 'POUPANCA' && reserveGoal > 0 && (
                        <>
                          <div className="h-1.5 overflow-hidden rounded-full bg-[#E3EAE9]">
                            <span className="block h-full rounded-full" style={{ width: `${Math.min(100, (value / reserveGoal) * 100)}%`, background: box.color }} />
                          </div>
                          <small className="text-xs text-[#627673]">Meta {brl(reserveGoal)} · 3 meses de contas</small>
                        </>
                      )}
                      {locked && (
                        <small className="flex items-center gap-1 text-xs text-[#7A4F00]">
                          <Svg d={Icon.lock} className="h-3 w-3" /> Volta para a conta em {MONTHS[nextMaturity - 1] ?? `mês ${nextMaturity}`}
                        </small>
                      )}
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() => setSheet({ kind: 'new' })}
                  className="grid min-h-[140px] place-items-center content-center gap-1 rounded-[18px] border-2 border-dashed border-[#E3EAE9] p-4 font-extrabold text-[#0A7F75] transition-colors hover:border-[#12B5A6] hover:bg-[#E2F6F3] cursor-pointer"
                >
                  <Svg d={Icon.plus} className="h-6 w-6" />
                  Nova caixinha
                  <span className="text-xs font-medium text-[#627673]">LCI, LCA, Tesouro Prefixado</span>
                </button>
              </div>
            </section>

            {/* ações */}
            <section className="grid gap-4 rounded-[20px] bg-white p-5 shadow-sm sm:p-6">
              <h3 className="flex flex-wrap items-center justify-between gap-2 font-extrabold">
                Ações
                <span className="text-sm font-medium text-[#627673]">Renda variável · liquidez diária · isento de IR · o preço muda todo mês</span>
              </h3>
              <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
                {market.map((asset) => {
                  const position = portfolio.find((p) => p.ticker === asset.ticker)
                  const qty = position?.quantity ?? 0
                  return (
                    <div key={asset.id} className="grid gap-1.5 rounded-2xl border border-[#E3EAE9] p-3.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <b className="text-base font-black">{asset.ticker}</b>
                        <small className="text-[#627673]">{asset.name}</small>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xl font-black tabular-nums">{brl(asset.currentPrice)}</span>
                        <small className={`tabular-nums ${asset.changePct >= 0 ? 'text-[#0B8A50]' : 'text-[#C4283D]'}`}>
                          {asset.changePct >= 0 ? '+' : ''}{asset.changePct.toLocaleString('pt-BR')}%
                        </small>
                      </div>
                      <small className="text-[#627673]">Você tem {qty} {qty === 1 ? 'ação' : 'ações'}{qty ? ` · ${money(position.totalValue)}` : ''}</small>
                      <div className="mt-1 flex gap-1.5">
                        <button type="button" disabled={busy || !qty} onClick={() => trade(asset, 'sell', 1)} className="flex-1 rounded-[10px] border border-[#E3EAE9] py-1.5 text-[13px] font-extrabold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">Vender 1</button>
                        <button type="button" disabled={busy} onClick={() => trade(asset, 'buy', 1)} className="flex-1 rounded-[10px] bg-[#12B5A6] py-1.5 text-[13px] font-extrabold text-white disabled:opacity-40 cursor-pointer">Comprar 1</button>
                        <button type="button" disabled={busy} onClick={() => trade(asset, 'buy', 10)} className="flex-1 rounded-[10px] bg-[#12B5A6] py-1.5 text-[13px] font-extrabold text-white disabled:opacity-40 cursor-pointer">+10</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* extrato + dica */}
            <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
              <section id="extrato" className="rounded-[20px] bg-white p-5 shadow-sm sm:p-6">
                <h3 className="mb-2 font-extrabold">Extrato</h3>
                {extrato.length === 0 && <p className="text-sm text-[#627673]">Nenhuma movimentação ainda.</p>}
                {extrato.map((e) => {
                  const v = Number(e.cashImpact)
                  return (
                    <div key={e.id} className="flex items-center justify-between gap-3 border-t border-[#E3EAE9] py-2.5 text-sm first:border-t-0">
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#E2F6F3] text-[#063F3A]">
                          <Svg d={v >= 0 ? Icon.in : Icon.out} className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block">{e.description}</span>
                          <small className="text-xs text-[#627673]">{MONTHS[e.turn - 1] ?? `Mês ${e.turn}`}</small>
                        </span>
                      </span>
                      <b className={`shrink-0 tabular-nums ${v >= 0 ? 'text-[#0B8A50]' : 'text-[#C4283D]'}`}>
                        {hide ? '••••' : `${v >= 0 ? '+' : '−'}${brl(Math.abs(v))}`}
                      </b>
                    </div>
                  )
                })}
              </section>
              <section className="grid content-start gap-2 rounded-[20px] bg-[#063F3A] p-5 text-[#DDF5F1] sm:p-6">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] opacity-80">Dica da Maré</p>
                <p className="text-lg font-black text-white">Reserva de emergência primeiro</p>
                <p className="text-sm">
                  {reserveMonths >= 3
                    ? `Sua reserva já cobre ${reserveMonths.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} meses de contas. Agora vale buscar mais rendimento no Tesouro, numa LCI ou na debênture.`
                    : `Sua reserva cobre ${reserveMonths.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mês de contas. O ideal é chegar a 3 meses (${brl(reserveGoal)}) antes de arriscar.`}
                </p>
              </section>
            </div>
          </div>

          {sheet && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center bg-[#041E1C]/45 p-4"
              onClick={(e) => e.target === e.currentTarget && setSheet(null)}
            >
              {sheet.kind === 'new' ? (
                <NewBoxSheet available={BOXES.filter((b) => !activeTypes.includes(b.type))} onPick={createBox} onClose={() => setSheet(null)} />
              ) : (
                <MoveSheet
                  sheet={sheet}
                  setSheet={setSheet}
                  activeTypes={activeTypes}
                  cash={cash}
                  value={boxValue(sheet.type)}
                  turn={turn}
                  activeDebentures={activeDebentures}
                  companyName={company?.name}
                  busy={busy}
                  onConfirm={confirmMove}
                />
              )}
            </div>
          )}

          {toast && (
            <div role="status" className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-xl bg-[#063F3A] px-4 py-2.5 text-sm font-bold text-white shadow-lg">
              {toast}
            </div>
          )}
        </div>
      </div>
    </GameLayout>
  )
}

function BoxFacts({ box }) {
  return (
    <span className="flex flex-wrap gap-1">
      {[`Liquidez ${box.liquidity}`, `Prazo ${box.term}`, box.tax, box.rating && `Rating ${box.rating}`].filter(Boolean).map((f) => (
        <span key={f} className="rounded-md bg-[#F3F6F6] px-1.5 py-0.5 text-[11px] font-bold text-[#627673]">{f}</span>
      ))}
    </span>
  )
}

function MoveSheet({ sheet, setSheet, activeTypes, cash, value, turn, activeDebentures, companyName, busy, onConfirm }) {
  const box = boxByType(sheet.type)
  const isDebenture = box.type === 'DEBENTURE'
  const max = sheet.mode === 'guardar' ? cash : value
  const withdrawBlocked = sheet.mode === 'resgatar' && isDebenture
  const earlyTesouro = sheet.mode === 'resgatar' && box.earlyTaxMonths && turn > 0
  const title = `${sheet.mode === 'guardar' ? 'Guardar em' : 'Resgatar de'} ${isDebenture && companyName ? `Debênture ${companyName}` : box.name}`

  return (
    <div role="dialog" aria-label={title} className="grid max-h-full w-full max-w-[460px] gap-3.5 overflow-y-auto rounded-[22px] bg-white p-6 text-[#10201E] shadow-2xl">
      <h5 className="text-lg font-black">{title}</h5>
      <div className="flex flex-wrap rounded-xl bg-[#F3F6F6] p-1">
        {activeTypes.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={t === sheet.type}
            onClick={() => setSheet({ ...sheet, type: t, error: '' })}
            className={`flex-1 rounded-[9px] px-2 py-2 text-sm font-extrabold cursor-pointer ${t === sheet.type ? 'bg-[#12B5A6] text-white' : ''}`}
          >
            {boxByType(t).short}
          </button>
        ))}
      </div>
      <div className="flex rounded-xl bg-[#F3F6F6] p-1">
        {['guardar', 'resgatar'].map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={m === sheet.mode}
            onClick={() => setSheet({ ...sheet, mode: m, error: '' })}
            className={`flex-1 rounded-[9px] py-2 text-sm font-extrabold capitalize cursor-pointer ${m === sheet.mode ? 'bg-[#12B5A6] text-white' : ''}`}
          >
            {m}
          </button>
        ))}
      </div>

      {withdrawBlocked ? (
        <p className="rounded-[10px] bg-[#FDF1D6] px-3 py-2 text-sm text-[#7A4F00]">
          A debênture tem liquidez de 10 meses: o dinheiro volta sozinho para a conta no vencimento
          {activeDebentures.length > 0 && ` (${activeDebentures.map((d) => MONTHS[d.maturesAt - 1] ?? `mês ${d.maturesAt}`).join(', ')})`}.
          Se a empresa der calote, o valor é perdido.
        </p>
      ) : (
        <>
          <label htmlFor="bank-amount" className="text-sm text-[#627673]">
            Quanto você quer {sheet.mode}?
          </label>
          <input
            id="bank-amount"
            autoFocus
            inputMode="decimal"
            placeholder="R$ 0,00"
            value={sheet.value}
            onChange={(e) => setSheet({ ...sheet, value: e.target.value, error: '' })}
            onKeyDown={(e) => e.key === 'Enter' && onConfirm()}
            className="w-full border-0 border-b-2 border-[#12B5A6] bg-transparent py-1.5 text-3xl font-black tabular-nums outline-none"
          />
          <div className="flex flex-wrap gap-2">
            {[100, 500, 1000].map((v) => (
              <button key={v} type="button" onClick={() => setSheet({ ...sheet, value: v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), error: '' })} className="rounded-full border border-[#E3EAE9] px-3 py-1.5 text-sm font-bold cursor-pointer">
                {brl(v)}
              </button>
            ))}
            <button type="button" onClick={() => setSheet({ ...sheet, value: max.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), error: '' })} className="rounded-full border border-[#E3EAE9] px-3 py-1.5 text-sm font-bold cursor-pointer">
              Tudo ({brl(max)})
            </button>
          </div>
        </>
      )}

      <p className="text-sm text-[#627673]">
        {box.rate} · {sheet.mode === 'guardar' ? `${brl(cash)} disponível na conta` : `${brl(value)} na caixinha`}
      </p>
      <BoxFacts box={box} />
      {sheet.mode === 'guardar' && isDebenture && (
        <p className="rounded-[10px] bg-[#FDF1D6] px-3 py-2 text-sm text-[#7A4F00]">O dinheiro guardado aqui fica preso por 10 meses (ou até o fim da partida) e pode dar calote.</p>
      )}
      {earlyTesouro && (
        <p className="rounded-[10px] bg-[#FDF1D6] px-3 py-2 text-sm text-[#7A4F00]">Resgate antes de 6 meses paga IR de 22,5% sobre o rendimento (depois, 15%).</p>
      )}
      {sheet.error && <p className="text-sm text-[#C4283D]">{sheet.error}</p>}
      {!withdrawBlocked && (
        <button type="button" disabled={busy} onClick={onConfirm} className="rounded-[14px] bg-[#12B5A6] py-3.5 font-extrabold text-white transition-colors hover:bg-[#0A7F75] disabled:opacity-60 cursor-pointer">
          {busy ? 'Aguarde…' : 'Confirmar'}
        </button>
      )}
      <button type="button" onClick={() => setSheet(null)} className="font-bold text-[#627673] cursor-pointer">Cancelar</button>
    </div>
  )
}

function NewBoxSheet({ available, onPick, onClose }) {
  return (
    <div role="dialog" aria-label="Nova caixinha" className="grid max-h-full w-full max-w-[460px] gap-3.5 overflow-y-auto rounded-[22px] bg-white p-6 text-[#10201E] shadow-2xl">
      <h5 className="text-lg font-black">Nova caixinha</h5>
      <p className="text-sm text-[#627673]">Escolha onde a nova caixinha vai render.</p>
      {available.length === 0 && <p className="text-sm text-[#627673]">Você já tem todas as caixinhas disponíveis.</p>}
      {available.map((box) => (
        <button key={box.type} type="button" onClick={() => onPick(box.type)} className="grid gap-1.5 rounded-[14px] border border-[#E3EAE9] p-3.5 text-left hover:border-[#12B5A6] cursor-pointer">
          <span className="flex justify-between gap-2 font-extrabold"><span>{box.name}</span><span className="text-[#0A7F75]">{box.rate}</span></span>
          <span className="text-sm text-[#627673]">{box.desc}</span>
          <BoxFacts box={box} />
        </button>
      ))}
      <button type="button" onClick={onClose} className="font-bold text-[#627673] cursor-pointer">Fechar</button>
    </div>
  )
}
