// Resumo da virada do mês, para o cartão que abre no começo de cada mês:
// o imprevisto do mês, as consequências de escolhas que chegaram, o que ficou
// em aberto no mês anterior e o dinheiro de sempre (salário, aluguel, juros).
// Tudo sai do extrato (CharacterEventLog); cada linha entra em um lugar só.
const { cents } = require('./finance')
const { EVENT_CALENDAR, QUIET, WELCOME_GIFT } = require('./events')

const MONEY = {
  salary: ['Salário:'],
  extras: ['Bônus salarial:', 'Freela:', 'Projeto paralelo:', 'Gestão:'],
  rent: ['Aluguel:'],
  interest: ['Cheque especial:'],
}
const LATE = (d) => d.startsWith('Conta atrasada:') || d.includes('— Sem resposta:') || d.includes('o mês fechou sem lazer')

// títulos dos imprevistos que podem cair na virada para `turn`
function eventTitles(turn) {
  const titles = (EVENT_CALENDAR[Number(turn)] ?? []).map((e) => e.title)
  if (Number(turn) === 1) titles.push(WELCOME_GIFT.title)
  return [...titles, QUIET.title]
}

// logs: o extrato inteiro do personagem; effectLabels: os rótulos das
// consequências aplicadas nesta virada (ScheduledEffect.label)
function turnSummary({ turn, logs = [], effectLabels = [] }) {
  const t = Number(turn)
  const titles = eventTitles(t)
  const summary = { turn: t, events: [], consequences: [], late: [], money: { salary: 0, extras: 0, rent: 0, interest: 0 }, net: 0 }
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
    const kind = Object.keys(MONEY).find((k) => MONEY[k].some((prefix) => d.startsWith(prefix)))
    if (kind) summary.money[kind] = cents(summary.money[kind] + amount(l))
  }
  // o que ficou em aberto no mês que fechou é registrado naquele mês
  for (const l of logs.filter((x) => Number(x.turn) === t - 1 && LATE(x.description))) {
    summary.late.push({ description: l.description, amount: amount(l) })
  }

  const all = [
    ...summary.events, ...summary.consequences, ...summary.late,
    ...Object.values(summary.money).map((v) => ({ amount: v })),
  ]
  summary.net = cents(all.reduce((s, x) => s + x.amount, 0))
  return summary
}

module.exports = { turnSummary, eventTitles }
