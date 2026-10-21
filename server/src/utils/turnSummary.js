// Resumo da virada do mês, para o cartão que abre no começo de cada mês:
// o imprevisto do mês, as consequências de escolhas que chegaram, o que ficou
// em aberto no mês anterior e o dinheiro de sempre (salário, aluguel, juros).
// Tudo sai do extrato (CharacterEventLog); cada linha entra em um lugar só.
const { cents } = require('./finance')
const { EVENT_CALENDAR, QUIET } = require('./events')

// Linhas do holerite no extrato: o salário bruto entra e o INSS e o IR saem,
// cada um na sua linha, para a soma bater com o líquido que caiu na conta.
const SALARY_PREFIX = 'Salário (bruto):'
const INSS_PREFIX = 'INSS:'
const IR_PREFIX = 'Imposto de Renda na fonte:'

const salaryLine = (gross) => `${SALARY_PREFIX} Depósito do mês (+R$ ${Number(gross).toFixed(2)})`

// descontos do holerite ({ inss, ir } de payslip) como linhas do extrato
function payslipDeductions(slip) {
  const lines = []
  if (slip.inss > 0) lines.push({ amount: -slip.inss, description: `${INSS_PREFIX} Desconto da Previdência Social (-R$ ${slip.inss.toFixed(2)})` })
  if (slip.ir > 0) lines.push({ amount: -slip.ir, description: `${IR_PREFIX} Desconto do mês (-R$ ${slip.ir.toFixed(2)})` })
  return lines
}

const MONEY = {
  // 'Salário:' é o texto antigo, de antes do holerite
  salary: [SALARY_PREFIX, 'Salário:'],
  inss: [INSS_PREFIX],
  ir: [IR_PREFIX],
  extras: ['Bônus salarial:', 'Trabalho extra:', 'Freela:', 'Projeto paralelo:', 'Gestão:'], // 'Freela:' = extrato antigo
  rent: ['Aluguel:'],
  interest: ['Cheque especial:'],
}
// debênture que venceu ou deu calote na virada
const INVEST = (d) => d.startsWith('Debênture:')
const LATE = (d) => d.startsWith('Conta atrasada:') || d.includes('— Sem resposta:') || d.includes('o mês fechou sem lazer')

// títulos dos imprevistos que podem cair na virada para `turn`
function eventTitles(turn) {
  const titles = (EVENT_CALENDAR[Number(turn)] ?? []).map((e) => e.title)
  return [...titles, QUIET.title]
}

// logs: o extrato inteiro do personagem; effectLabels: os rótulos das
// consequências aplicadas nesta virada (ScheduledEffect.label)
function turnSummary({ turn, logs = [], effectLabels = [] }) {
  const t = Number(turn)
  const titles = eventTitles(t)
  const summary = { turn: t, events: [], consequences: [], investments: [], late: [], perks: [], money: { salary: 0, inss: 0, ir: 0, extras: 0, rent: 0, interest: 0 }, net: 0 }
  const amount = (l) => cents(Number(l.cashImpact ?? 0))

  for (const l of logs.filter((x) => Number(x.turn) === t)) {
    const d = l.description
    const title = titles.find((x) => d.startsWith(`${x}:`))
    if (title) {
      summary.events.push({ title, description: d.slice(title.length + 1).trim(), amount: amount(l), quiet: title === QUIET.title })
      continue
    }
    const label = effectLabels.find((x) => d.startsWith(x))
    if (label) {
      const [head, ...rest] = label.split(': ')
      summary.consequences.push({ title: head, description: rest.join(': ') || head, amount: amount(l) })
      continue
    }
    if (INVEST(d)) {
      summary.investments.push({ description: d.slice('Debênture:'.length).trim(), amount: amount(l) })
      continue
    }
    const kind = Object.keys(MONEY).find((k) => MONEY[k].some((prefix) => d.startsWith(prefix)))
    if (kind) summary.money[kind] = cents(summary.money[kind] + amount(l))
    // as vantagens (dom e habilidades) também vão uma a uma, com o nome, para o
    // cartão mostrar separadas do salário (o total segue em money.extras)
    if (kind === 'extras') summary.perks.push({ description: d.replace(/ \([+-]R\$ [\d.,]+\)$/, ''), amount: amount(l) })
  }
  // o que ficou em aberto no mês que fechou é registrado naquele mês
  for (const l of logs.filter((x) => Number(x.turn) === t - 1 && LATE(x.description))) {
    summary.late.push({ description: l.description, amount: amount(l) })
  }

  const all = [
    ...summary.events, ...summary.consequences, ...summary.investments, ...summary.late,
    ...Object.values(summary.money).map((v) => ({ amount: v })),
  ]
  summary.net = cents(all.reduce((s, x) => s + x.amount, 0))
  return summary
}

module.exports = { turnSummary, eventTitles, salaryLine, payslipDeductions }
