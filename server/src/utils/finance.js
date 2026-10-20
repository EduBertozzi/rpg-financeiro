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
const OVERDRAFT_MONTHLY_RATE = 0.08 // cheque especial: teto legal de 8% ao mês
const SALARY = 7000 // salário fixo mensal (bruto) de todo personagem

const cents = (n) => Math.round(n * 100) / 100

// Tabela do INSS 2026 (progressiva): cada faixa paga a sua alíquota só sobre
// a parte do salário que cai nela. Acima do teto não desconta mais.
const INSS_BRACKETS = [
  { upTo: 1621.0, rate: 0.075 },
  { upTo: 2902.84, rate: 0.09 },
  { upTo: 4354.27, rate: 0.12 },
  { upTo: 8475.55, rate: 0.14 },
]

// Tabela mensal do IR 2026 sobre (bruto − INSS): alíquota e parcela a deduzir.
const IR_BRACKETS = [
  { upTo: 2428.8, rate: 0, deduction: 0 },
  { upTo: 2826.65, rate: 0.075, deduction: 182.16 },
  { upTo: 3751.05, rate: 0.15, deduction: 394.16 },
  { upTo: 4664.68, rate: 0.225, deduction: 675.49 },
  { upTo: Infinity, rate: 0.275, deduction: 908.73 },
]

// Redutor de 2026: quem ganha até R$ 5.000 brutos não paga IR; entre 5.000 e
// 7.350 o imposto diminui aos poucos.
const IR_EXEMPT_UP_TO = 5000
const IR_REDUCER_UP_TO = 7350

function inssOf(gross) {
  let total = 0
  let floor = 0
  for (const { upTo, rate } of INSS_BRACKETS) {
    if (gross <= floor) break
    total += (Math.min(gross, upTo) - floor) * rate
    floor = upTo
  }
  return cents(total)
}

function irOf(gross, inss) {
  if (gross <= IR_EXEMPT_UP_TO) return 0
  const base = gross - inss
  const bracket = IR_BRACKETS.find((b) => base <= b.upTo)
  let tax = Math.max(base * bracket.rate - bracket.deduction, 0)
  if (gross <= IR_REDUCER_UP_TO) tax -= 978.62 - 0.133145 * gross
  return cents(Math.max(tax, 0))
}

// Holerite: do salário bruto saem o INSS e o IR na fonte; o líquido é o que
// cai na conta. Ex.: 7.000 brutos → INSS 781,51, IR 754,75, líquido 5.463,74.
function payslip(gross) {
  const g = cents(Math.max(Number(gross) || 0, 0))
  const inss = inssOf(g)
  const ir = irOf(g, inss)
  return { gross: g, inss, ir, net: cents(g - inss - ir) }
}

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

// Carência: cada aplicação de LCI fica presa 6 meses e de LCA 8 meses, contados
// do mês em que entrou (é o preço de não pagar IR). Depois, resgate livre.
const LOCK_MONTHS = { LCI: 6, LCA: 8 }
const unlocksAt = (type, investedAt) => Number(investedAt) + (LOCK_MONTHS[type] ?? 0)
const isLocked = (type, investedAt, currentTurn) => currentTurn < unlocksAt(type, investedAt)

// Plano de resgate parcial de uma caixinha: tira o valor dos investimentos do
// mais antigo para o mais novo, e o IR incide só sobre a parte do rendimento.
// Retorna { error, available } quando a caixinha não tem o valor pedido.
// Na LCI e na LCA só entram as aplicações que já passaram da carência; o resto
// volta em `locked` (quanto está preso) e `nextUnlock` (mês em que solta o próximo).
function planWithdrawal(investments, type, amount, currentTurn) {
  const all = [...investments].sort((a, b) => a.investedAt - b.investedAt)
  const sorted = all.filter((inv) => !isLocked(type, inv.investedAt, currentTurn))
  const held = all.filter((inv) => isLocked(type, inv.investedAt, currentTurn))
  const locked = cents(held.reduce((sum, inv) => sum + Number(inv.amount), 0))
  const nextUnlock = held.length ? unlocksAt(type, held[0].investedAt) : null
  const available = sorted.reduce((sum, inv) => sum + Number(inv.amount), 0)
  if (amount > available + 0.005) return { error: 'insufficient', available: cents(available), locked, nextUnlock }

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
  return { available: cents(available), locked, nextUnlock, steps, incomeTax, gross: cents(amount), net: cents(amount - incomeTax) }
}

// Debênture: liquidez de 10 meses, limitada ao fim da partida.
const debentureMaturity = (currentTurn, maxTurns) => Math.min(currentTurn + DEBENTURE_TERM_MONTHS, maxTurns)

// Valor pago no vencimento: juros compostos mensais equivalentes à taxa anual.
const debentureReturn = (amount, annualRate, months) =>
  cents(Number(amount) * Math.pow(1 + monthlyFromAnnual(Number(annualRate)), months))

// Cheque especial: o saldo negativo é a dívida. No fechamento do mês ele cobra
// juros sobre o valor usado, que entram como mais saldo negativo; qualquer
// dinheiro que entra na conta abate a dívida antes de sobrar saldo.
// `rate` permite a taxa menor de quem tem a habilidade Planejamento e Produtividade.
const overdraftInterest = (cash, rate = OVERDRAFT_MONTHLY_RATE) => (Number(cash) < 0 ? cents(-Number(cash) * rate) : 0)

// Virada do mês na conta: juros do cheque especial sobre o saldo com que o mês
// fechou, depois entra o salário do mês novo (que abate a dívida) e sai o
// aluguel. `legacyDebt` é a dívida antiga guardada fora do saldo, que volta
// para o saldo para seguir a mesma regra. `overdraftRate` é a taxa do cheque
// especial do personagem (8% por padrão).
function closeMonth(cash, rent, legacyDebt = 0, salary = 0, overdraftRate = OVERDRAFT_MONTHLY_RATE) {
  const opening = cents(Number(cash) - Number(legacyDebt))
  const interest = overdraftInterest(opening, overdraftRate)
  const closing = cents(opening - interest + Number(salary) - Number(rent))
  return { opening, interest, closing, inOverdraft: closing < 0 }
}

// Balanço do patrimônio: saldo positivo é ativo, saldo negativo é dívida.
// `installmentDebt` são as parcelas que ainda vão vencer (compras parceladas).
function balanceSheet({ cash, fixedIncome = 0, debentures = 0, stocks = 0, overdraftDebt = 0, loanDebt = 0, installmentDebt = 0 }) {
  const c = Number(cash)
  const totalAssets = cents(Math.max(c, 0) + Number(fixedIncome) + Number(debentures) + Number(stocks))
  const totalDebts = cents(Math.max(-c, 0) + Number(overdraftDebt) + Number(loanDebt) + Number(installmentDebt))
  return { totalAssets, totalDebts, netWorth: cents(totalAssets - totalDebts) }
}

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
  OVERDRAFT_MONTHLY_RATE,
  SALARY,
  INSS_BRACKETS,
  IR_BRACKETS,
  payslip,
  cents,
  monthlyFromAnnual,
  getMonthlyRate,
  incomeTaxRate,
  monthlyReturn,
  principalOf,
  redemptionOf,
  planWithdrawal,
  LOCK_MONTHS,
  unlocksAt,
  isLocked,
  debentureMaturity,
  debentureReturn,
  overdraftInterest,
  closeMonth,
  balanceSheet,
  averagePrice,
  STOCK_EVENTS,
  nextStockPrice,
}
