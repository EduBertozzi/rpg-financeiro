// Conquistas do resumo de fim de ano. Cada regra é uma função pura que recebe
// dados simples (linhas do banco já carregadas) e devolve true/false, para ser
// testada à parte (ver __tests__/badges.test.js).
const { cents } = require('./finance')

const BILL_LABELS = ['Mercadinho', 'Água e Luz', 'Internet e Celular'] // ver billController.js
const RESERVE_MONTHS = 3 // reserva completa: 3 meses de contas fixas
const MIN_UNLOCKED_SKILLS = 5
const MIN_INVESTMENT_TYPES = 4
const COUPONS_PER_GAME = 3

const startsWith = (prefix) => (entry) => String(entry?.description ?? '').startsWith(prefix)

// Nunca no vermelho: nenhum fechamento de mês com saldo negativo, nenhum juro
// de cheque especial no extrato e o saldo atual (se vier) também não negativo.
function neverOverdraft({ snapshots = [], eventLog = [], cash } = {}) {
  if (snapshots.some((s) => Number(s.cash) < 0)) return false
  if (eventLog.some(startsWith('Cheque especial'))) return false
  if (cash != null && Number(cash) < 0) return false
  return true
}

// Contas fixas de um mês: aluguel + mercado + água e luz + internet e celular.
const monthlyBillsOf = (character = {}) =>
  cents(['housingCost', 'foodCost', 'utilitiesCost', 'transportCost']
    .reduce((sum, key) => sum + Number(character[key] ?? 0), 0))

// Saldo atual da Reserva de Emergência (POUPANCA ainda não resgatada).
const emergencyReserveOf = (fixedInvestments = []) =>
  cents(fixedInvestments
    .filter((inv) => inv.type === 'POUPANCA' && inv.redeemedAt == null)
    .reduce((sum, inv) => sum + Number(inv.amount), 0))

// Reserva completa: a Reserva de Emergência cobre 3 meses de contas fixas.
function reserveComplete({ fixedInvestments = [], monthlyBills = 0 } = {}) {
  const reserve = emergencyReserveOf(fixedInvestments)
  if (reserve <= 0) return false
  return reserve + 0.005 >= cents(RESERVE_MONTHS * Number(monthlyBills))
}

// Caçador de cupons: achou e resgatou os 3 cupons da partida.
function couponHunter({ coupons = [] } = {}) {
  return coupons.filter((c) => c.claimedAt != null).length >= COUPONS_PER_GAME
}

// Constelação acesa: pelo menos 5 habilidades desbloqueadas.
function constellation({ unlockedSkills = [] } = {}) {
  return unlockedSkills.length >= MIN_UNLOCKED_SKILLS
}

// Tipos de investimento que o personagem teve ao longo da partida: cada tipo de
// caixinha (inclusive as já resgatadas), debênture e ações (posição atual,
// histórico de negociações ou linha "Ações:" no extrato).
function investmentTypesOf({ fixedInvestments = [], debentures = [], positions = [], trades = [], eventLog = [] } = {}) {
  const types = new Set(fixedInvestments.map((inv) => inv.type))
  if (debentures.length > 0) types.add('DEBENTURE')
  if (positions.length > 0 || trades.length > 0 || eventLog.some(startsWith('Ações:'))) types.add('STOCKS')
  return [...types].sort()
}

// Investidor: teve pelo menos 4 tipos de investimento.
function investor(data = {}) {
  return investmentTypesOf(data).length >= MIN_INVESTMENT_TYPES
}

// Meses já fechados da partida: do 1 até o anterior ao mês atual.
const finishedTurns = (currentTurn) =>
  Array.from({ length: Math.max(Number(currentTurn) - 1, 0) }, (_, i) => i + 1)

// Contas em dia: em todo mês já fechado as 3 contas (Mercadinho, Água e Luz,
// Internet e Celular) foram pagas. Sem mês fechado ainda, não conta.
function billsOnTime({ eventLog = [], currentTurn = 0 } = {}) {
  const turns = finishedTurns(currentTurn)
  if (turns.length === 0) return false
  return turns.every((turn) =>
    BILL_LABELS.every((label) =>
      eventLog.some((e) => Number(e.turn) === turn && startsWith(`Conta: ${label}`)(e))))
}

const BADGES = [
  { id: 'never_overdraft', title: 'Nunca no vermelho', description: 'Passou o ano inteiro sem entrar no cheque especial.', rule: neverOverdraft },
  { id: 'reserve_complete', title: 'Reserva completa', description: 'Terminou com 3 meses de contas guardados na Reserva de Emergência.', rule: reserveComplete },
  { id: 'coupon_hunter', title: 'Caçador de cupons', description: 'Achou os 3 cupons escondidos pela cidade.', rule: couponHunter },
  { id: 'constellation', title: 'Constelação acesa', description: 'Desbloqueou pelo menos 5 habilidades.', rule: constellation },
  { id: 'investor', title: 'Investidor', description: 'Teve pelo menos 4 tipos diferentes de investimento.', rule: investor },
  { id: 'bills_on_time', title: 'Contas em dia', description: 'Pagou Mercadinho, Água e Luz e Internet e Celular em todos os meses.', rule: billsOnTime },
]

// Todas as conquistas com o resultado: [{ id, title, description, earned }].
// `data` junta tudo que as regras usam: snapshots, eventLog, cash,
// fixedInvestments, monthlyBills, coupons, unlockedSkills, debentures,
// positions, trades, currentTurn.
function evaluateBadges(data = {}) {
  return BADGES.map(({ id, title, description, rule }) => ({ id, title, description, earned: Boolean(rule(data)) }))
}

module.exports = {
  BADGES,
  BILL_LABELS,
  RESERVE_MONTHS,
  MIN_UNLOCKED_SKILLS,
  MIN_INVESTMENT_TYPES,
  neverOverdraft,
  monthlyBillsOf,
  emergencyReserveOf,
  reserveComplete,
  couponHunter,
  constellation,
  investmentTypesOf,
  investor,
  finishedTurns,
  billsOnTime,
  evaluateBadges,
}
