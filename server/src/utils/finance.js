// Matemática financeira do jogo, em funções puras (sem banco de dados), para
// poder ser testada à parte. Valores seguem a tabela oficial de investimentos.

const SELIC_ANNUAL = 0.105 // 10,5% a.a. simulado
const CDI_ANNUAL = 0.104 // 10,4% a.a. simulado

const ANNUAL_RATES = {
  POUPANCA: 0.065,
  CDB: CDI_ANNUAL * 1.06, // 106% do CDI
  TESOURO_SELIC: SELIC_ANNUAL + 0.006, // Selic + 0,6% a.a.
  TESOURO_PRE: 0.135,
  LCI: CDI_ANNUAL * 1.08, // 108% do CDI
  LCA: SELIC_ANNUAL + 0.026, // Selic + 2,6% a.a.
}

const DEBENTURE_TERM_MONTHS = 10
const EARLY_REDEMPTION_MONTHS = 6

const cents = (n) => Math.round(n * 100) / 100

const monthlyFromAnnual = (annual) => Math.pow(1 + annual, 1 / 12) - 1

function getMonthlyRate(type) {
  return monthlyFromAnnual(ANNUAL_RATES[type] ?? SELIC_ANNUAL)
}

// IR sobre o rendimento, cobrado só no resgate. Tesouro resgatado antes de
// 6 meses paga a alíquota de resgate antecipado. Poupança, LCI e LCA são isentas.
function incomeTaxRate(type, monthsHeld) {
  if (type === 'CDB') return 0.175
  if (type === 'TESOURO_SELIC' || type === 'TESOURO_PRE') return monthsHeld < EARLY_REDEMPTION_MONTHS ? 0.225 : 0.15
  return 0
}

// Rendimento de um mês de um investimento (o turnEngine soma isso em `amount`).
const monthlyReturn = (amount, monthlyRate) => Number(amount) * Number(monthlyRate)

// Como `amount` cresce todo mês, o valor aplicado originalmente é recuperado
// desfazendo esses meses de juros compostos.
function principalOf(investment, currentTurn) {
  const months = Math.max(currentTurn - investment.investedAt, 0)
  return Number(investment.amount) / Math.pow(1 + Number(investment.monthlyRate), months)
}

// Resgate de um investimento inteiro: devolve bruto, IR e líquido.
function redemptionOf(investment, currentTurn) {
  const gross = Number(investment.amount)
  const gain = Math.max(gross - principalOf(investment, currentTurn), 0)
  const incomeTax = cents(gain * incomeTaxRate(investment.type, currentTurn - investment.investedAt))
  return { gross: cents(gross), incomeTax, net: cents(gross - incomeTax) }
}

// Plano de resgate parcial de uma caixinha: tira o valor dos investimentos do
// mais antigo para o mais novo, e o IR incide só sobre a parte do rendimento.
// Retorna { error, available } quando a caixinha não tem o valor pedido.
function planWithdrawal(investments, type, amount, currentTurn) {
  const sorted = [...investments].sort((a, b) => a.investedAt - b.investedAt)
  const available = sorted.reduce((sum, inv) => sum + Number(inv.amount), 0)
  if (amount > available + 0.005) return { error: 'insufficient', available: cents(available) }

  let remaining = amount
  let incomeTax = 0
  const steps = []
  for (const inv of sorted) {
    if (remaining <= 0.005) break
    const value = Number(inv.amount)
    const take = Math.min(remaining, value)
    const gain = Math.max(value - principalOf(inv, currentTurn), 0) * (take / value)
    const tax = gain * incomeTaxRate(type, currentTurn - inv.investedAt)
    incomeTax += tax
    remaining -= take
    steps.push({ id: inv.id, take, tax, closes: take >= value - 0.005, value })
  }

  incomeTax = cents(incomeTax)
  return { available: cents(available), steps, incomeTax, gross: cents(amount), net: cents(amount - incomeTax) }
}

// Debênture: liquidez de 10 meses, limitada ao fim da partida.
const debentureMaturity = (currentTurn, maxTurns) => Math.min(currentTurn + DEBENTURE_TERM_MONTHS, maxTurns)

// Valor pago no vencimento: juros compostos mensais equivalentes à taxa anual.
const debentureReturn = (amount, annualRate, months) =>
  cents(Number(amount) * Math.pow(1 + monthlyFromAnnual(Number(annualRate)), months))

// Preço médio ponderado depois de uma compra.
const averagePrice = (qty, avg, boughtQty, price) =>
  (Number(avg) * qty + Number(price) * boughtQty) / (qty + boughtQty)

const VOLATILITY = { low: 0.03, medium: 0.07, high: 0.15 }

// Eventos de mercado com data marcada (as "historinhas" das ações).
const STOCK_EVENTS = {
  VALE3: { turn: 3, change: 0.40 }, // valoriza 40%
  PETR4: { turn: 10, change: -0.35 }, // cai 35% por evento político (eleição)
}

// Próximo preço de uma ação: variação aleatória pelo risco + evento do mês.
function nextStockPrice(prevPrice, riskLevel, ticker, turn, random = Math.random) {
  const volatility = VOLATILITY[riskLevel] ?? VOLATILITY.high
  let change = (random() * 2 - 1) * volatility
  const event = STOCK_EVENTS[ticker]
  if (event && event.turn === turn) change += event.change
  return cents(Math.max(Number(prevPrice) * (1 + change), 0.01))
}

module.exports = {
  SELIC_ANNUAL,
  CDI_ANNUAL,
  ANNUAL_RATES,
  DEBENTURE_TERM_MONTHS,
  EARLY_REDEMPTION_MONTHS,
  cents,
  monthlyFromAnnual,
  getMonthlyRate,
  incomeTaxRate,
  monthlyReturn,
  principalOf,
  redemptionOf,
  planWithdrawal,
  debentureMaturity,
  debentureReturn,
  averagePrice,
  nextStockPrice,
}
