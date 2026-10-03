// Fechamento do que ficou em aberto no mês. Quem não pagou uma conta, não
// escolheu o lazer ou não respondeu o dilema não sai ganhando: na virada do
// mês a conta é cobrada com multa e juros de atraso, o lazer é cobrado e o
// dilema é decidido pela inércia (a opção de quem não fez nada).
const { cents } = require('./finance')

// contas do mês: tipo → campo do personagem e nome no extrato
const BILLS = {
  food: { field: 'foodCost', label: 'Mercadinho' },
  utilities: { field: 'utilitiesCost', label: 'Água e Luz' },
  transport: { field: 'transportCost', label: 'Internet e Celular' },
}

// atraso de conta no Brasil: multa de 2% + juros de 1% ao mês
const LATE_FEE = 0.02
const LATE_INTEREST = 0.01

const lateBillAmount = (amount) => cents(Number(amount) * (1 + LATE_FEE + LATE_INTEREST))

// O que falta no mês, a partir do extrato e das escolhas daquele mês.
function pendingForMonth({ logs = [], choices = [], turn, hasLeisure, hasDilemma }) {
  const ofTurn = (x) => Number(x.turn) === Number(turn)
  const paid = (label) => logs.some((l) => ofTurn(l) && l.description.startsWith(`Conta: ${label}`))
  return {
    bills: Object.keys(BILLS).filter((type) => !paid(BILLS[type].label)),
    leisure: Boolean(hasLeisure) && !choices.some((c) => ofTurn(c) && c.kind === 'leisure'),
    dilemma: Boolean(hasDilemma) && !choices.some((c) => ofTurn(c) && c.kind === 'dilemma'),
  }
}

module.exports = { BILLS, LATE_FEE, LATE_INTEREST, lateBillAmount, pendingForMonth }
