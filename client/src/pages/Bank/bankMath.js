// Cálculos da tela do banco, em funções puras (testadas em bankMath.test.js).
// Os valores de verdade vêm do servidor; aqui só se soma e se projeta.

export const monthlyFromAnnual = (annual) => Math.pow(1 + annual, 1 / 12) - 1

// "1.234,56" → 1234.56 · "R$ 500" → 500 · "1,5" → 1.5 · texto sem número → NaN
export function parseAmount(text) {
  const clean = String(text ?? '').replace(/[^\d,.-]/g, '')
  if (!/\d/.test(clean)) return NaN
  return Number(clean.replace(/\./g, '').replace(',', '.'))
}

// Máscara do campo de valor em R$, enquanto a pessoa digita: pontos de milhar
// e vírgula para os centavos (no máximo 2 casas).
// "1000" → "1.000" · "1234567,891" → "1.234.567,89" · "0012" → "12" · "abc" → ""
// Um ponto digitado no fim (sem vírgula ainda) vira a vírgula dos centavos.
export function maskAmount(text) {
  let raw = String(text ?? '')
  if (raw.endsWith('.') && !raw.includes(',')) raw = `${raw.slice(0, -1)},`
  raw = raw.replace(/[^\d,]/g, '')
  const comma = raw.indexOf(',')
  const intDigits = (comma === -1 ? raw : raw.slice(0, comma)).replace(/^0+(?=\d)/, '')
  const intPart = intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  if (comma === -1) return intPart
  const decimals = raw.slice(comma + 1).replace(/,/g, '').slice(0, 2)
  return `${intPart || '0'},${decimals}`
}

// Ao sair do campo: completa para 2 casas ("1.000" → "1.000,00", "5,5" → "5,50").
export function finishAmount(text) {
  const n = parseAmount(maskAmount(text))
  if (!Number.isFinite(n)) return ''
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const cents = (n) => Math.round(n * 100) / 100

// Total guardado numa caixinha de renda fixa (o servidor já soma os rendimentos).
export const fixedBoxValue = (investments, type) =>
  investments.filter((f) => f.type === type).reduce((sum, f) => sum + Number(f.amount), 0)

// Carência da LCI (6 meses) e da LCA (8 meses), contada de cada aplicação.
// Igual ao servidor (server/src/utils/finance.js).
export const LOCK_MONTHS = { LCI: 6, LCA: 8 }
export const unlocksAt = (type, investedAt) => Number(investedAt) + (LOCK_MONTHS[type] ?? 0)
const isFree = (f, turn) => turn >= unlocksAt(f.type, f.investedAt)

// Quanto da caixinha já pode ser resgatado agora.
export const freeBoxValue = (investments, type, turn) =>
  investments.filter((f) => f.type === type && isFree(f, turn)).reduce((sum, f) => sum + Number(f.amount), 0)

// Mês em que solta a próxima aplicação presa (null se nada está preso).
export const nextUnlock = (investments, type, turn) => {
  const held = investments.filter((f) => f.type === type && !isFree(f, turn)).map((f) => unlocksAt(type, f.investedAt))
  return held.length ? Math.min(...held) : null
}

// IR sobre o rendimento, cobrado só no resgate (igual a incomeTaxRate do
// servidor): CDB 17,5%; Tesouro 22,5% antes de 6 meses e 15% depois;
// poupança, LCI e LCA isentas.
export const EARLY_REDEMPTION_MONTHS = 6
export function incomeTaxRate(type, monthsHeld) {
  if (type === 'CDB') return 0.175
  if (type === 'TESOURO_SELIC' || type === 'TESOURO_PRE') return monthsHeld < EARLY_REDEMPTION_MONTHS ? 0.225 : 0.15
  return 0
}

// Valor aplicado originalmente: desfaz os meses de juros compostos já somados em `amount`.
export function principalOf(investment, turn) {
  const months = Math.max(turn - investment.investedAt, 0)
  return Number(investment.amount) / Math.pow(1 + Number(investment.monthlyRate), months)
}

// Prévia do resgate parcial de uma caixinha, espelho de planWithdrawal do
// servidor: tira do mais antigo para o mais novo e o IR incide só sobre a parte
// do rendimento. Na LCI e na LCA só entram as aplicações fora da carência.
// Retorna { error: 'insufficient', available } quando não dá para resgatar o valor.
export function planWithdrawal(investments, type, amount, turn) {
  const all = investments
    .filter((inv) => inv.type === undefined || inv.type === type)
    .sort((a, b) => a.investedAt - b.investedAt)
  const free = all.filter((inv) => turn >= unlocksAt(type, inv.investedAt))
  const available = free.reduce((sum, inv) => sum + Number(inv.amount), 0)
  const value = cents(Number(amount))
  if (value > available + 0.005) return { error: 'insufficient', available: cents(available) }

  let remaining = value
  let incomeTax = 0
  for (const inv of free) {
    if (remaining <= 0.005) break
    const invValue = Number(inv.amount)
    const take = Math.min(remaining, invValue)
    const gain = Math.max(invValue - principalOf(inv, turn), 0) * (take / invValue)
    incomeTax += gain * incomeTaxRate(type, turn - inv.investedAt)
    remaining -= take
  }
  incomeTax = cents(incomeTax)
  return { available: cents(available), incomeTax, gross: value, net: cents(value - incomeTax) }
}

// Ações: total de uma ordem e quantidade válida (inteiro de 1 até `max`).
export const tradeTotal = (price, quantity) => cents(Number(price) * Number(quantity))

export function clampQuantity(value, max = Infinity) {
  const n = Math.floor(Number(String(value ?? '').replace(/\D/g, '')))
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.max(1, Math.min(n, max))
}

// Compra de ações: o saldo da conta precisa cobrir o total.
export function buyCheck(cash, price, quantity) {
  const total = tradeTotal(price, quantity)
  return { total, ok: Number(cash) >= total }
}

// Quanto a caixinha deve render até o fim do mês.
export const fixedBoxYield = (investments, type) =>
  investments.filter((f) => f.type === type).reduce((sum, f) => sum + Number(f.amount) * Number(f.monthlyRate), 0)

export const activeDebentures = (debentures) => debentures.filter((d) => d.status === 'active')

// Valor estimado das debêntures ativas hoje (juros compostos desde a aplicação;
// o dinheiro só volta para a conta no vencimento).
export const debentureValue = (debentures, turn) =>
  activeDebentures(debentures).reduce((sum, d) => {
    const months = Math.max(turn - d.investedAt, 0)
    return sum + Number(d.amount) * Math.pow(1 + monthlyFromAnnual(Number(d.annualRate)), months)
  }, 0)

export const debentureYield = (debentures, turn) =>
  activeDebentures(debentures).reduce((sum, d) => {
    const months = Math.max(turn - d.investedAt, 0)
    const rate = monthlyFromAnnual(Number(d.annualRate))
    return sum + Number(d.amount) * Math.pow(1 + rate, months) * rate
  }, 0)

export const nextMaturity = (debentures) =>
  activeDebentures(debentures).reduce((min, d) => Math.min(min, d.maturesAt), Infinity)

// Contas fixas do mês e a meta da reserva de emergência (3 meses de contas).
export const monthlyBills = (character) =>
  ['housingCost', 'foodCost', 'utilitiesCost', 'transportCost'].reduce((sum, k) => sum + Number(character?.[k] ?? 0), 0)

export const reserveGoal = (character) => monthlyBills(character) * 3

export const reserveMonths = (reserve, character) => {
  const bills = monthlyBills(character)
  return bills ? reserve / bills : 0
}

export const stocksValue = (portfolio) => portfolio.reduce((sum, p) => sum + Number(p.totalValue), 0)

// Fatia de cada parte no patrimônio, em %, somando 100 quando há patrimônio.
export const shares = (parts) => {
  const total = parts.reduce((sum, p) => sum + p.value, 0)
  return parts.map((p) => ({ ...p, pct: total ? (p.value / total) * 100 : 0 }))
}

// Prévia de um pagamento pela conta: saldo depois e se vai ficar negativo.
export function paymentPreview(cash, amount) {
  const after = Math.round((Number(cash) - Number(amount)) * 100) / 100
  return { after, negative: after < 0 }
}

// Cheque especial: 8% ao mês sobre o saldo negativo, cobrados no fechamento do
// mês (mesma regra do servidor, em server/src/utils/finance.js).
export const OVERDRAFT_MONTHLY_RATE = 0.08

export const REDUCED_OVERDRAFT_RATE = 0.04 // com Planejamento e Produtividade (Gestão nível 2)

// taxa do cheque especial do personagem: 4% com Gestão nível 2, senão 8%
export const overdraftRateFor = (unlockedSkills = []) =>
  unlockedSkills.some((s) => s.skillNode?.path === 'management' && s.skillNode?.level === 2)
    ? REDUCED_OVERDRAFT_RATE
    : OVERDRAFT_MONTHLY_RATE

export const overdraftInterest = (cash, rate = OVERDRAFT_MONTHLY_RATE) =>
  Number(cash) < 0 ? Math.round(-Number(cash) * rate * 100) / 100 : 0

// "8%" / "4%" para os textos
export const ratePercent = (rate) => `${Math.round(rate * 100)}%`

// Extrato completo separado por mês (o mais recente primeiro), com o total de
// entradas e saídas de cada mês. Linhas sem valor ficam de fora.
export function statementByMonth(eventLog = []) {
  const months = new Map()
  for (const e of eventLog) {
    const v = Number(e.cashImpact ?? 0)
    if (!v) continue
    const turn = Number(e.turn)
    if (!months.has(turn)) months.set(turn, { turn, entries: [], total: 0 })
    const m = months.get(turn)
    m.entries.push(e)
    m.total = Math.round((m.total + v) * 100) / 100
  }
  const byTime = (a, b) => new Date(b.loggedAt) - new Date(a.loggedAt)
  return [...months.values()].sort((a, b) => b.turn - a.turn).map((m) => ({ ...m, entries: m.entries.sort(byTime) }))
}
