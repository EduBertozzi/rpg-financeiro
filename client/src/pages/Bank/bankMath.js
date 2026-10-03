// Cálculos da tela do banco, em funções puras (testadas em bankMath.test.js).
// Os valores de verdade vêm do servidor; aqui só se soma e se projeta.

export const monthlyFromAnnual = (annual) => Math.pow(1 + annual, 1 / 12) - 1

// "1.234,56" → 1234.56 · "R$ 500" → 500 · "1,5" → 1.5 · texto sem número → NaN
export function parseAmount(text) {
  const clean = String(text ?? '').replace(/[^\d,.-]/g, '')
  if (!/\d/.test(clean)) return NaN
  return Number(clean.replace(/\./g, '').replace(',', '.'))
}

// Total guardado numa caixinha de renda fixa (o servidor já soma os rendimentos).
export const fixedBoxValue = (investments, type) =>
  investments.filter((f) => f.type === type).reduce((sum, f) => sum + Number(f.amount), 0)

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

export const overdraftInterest = (cash) =>
  Number(cash) < 0 ? Math.round(-Number(cash) * OVERDRAFT_MONTHLY_RATE * 100) / 100 : 0
