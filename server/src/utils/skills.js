// Efeitos da Árvore de Habilidades, em funções puras (sem banco de dados).
// Cada nó (caminho + nível) dá uma vantagem; perksOf junta as vantagens de
// tudo que o personagem já desbloqueou num objeto só, usado pelo turnEngine,
// pelas contas e pelos dilemas.
const { cents, OVERDRAFT_MONTHLY_RATE, STOCK_EVENTS } = require('./finance')

const REDUCED_OVERDRAFT_RATE = 0.04 // cheque especial com Planejamento e Produtividade

// Tabela oficial das vantagens (aprovada pelo game design).
const PERKS = {
  technical: {
    1: { name: 'Fundamentos e Lógica', perk: '+R$ 150 por mês (freela)', income: { label: 'Freela', amount: 150 } },
    2: { name: 'Resolução de Problemas', perk: 'Imprevistos de casa custam metade', repairDiscount: 0.5 },
    3: { name: 'Pensamento Analítico Avançado', perk: 'Salário +R$ 300', salaryBonus: 300 },
    4: { name: 'Inovação e Otimização', perk: '+R$ 400 por mês (projeto paralelo)', income: { label: 'Projeto paralelo', amount: 400 } },
  },
  communication: {
    1: { name: 'Comunicação Básica', perk: 'Água/luz e internet 30% mais baratas', utilitiesDiscount: 0.3 },
    2: { name: 'Trabalho em Equipe', perk: 'Lazer e dilemas 30% mais baratos', leisureDiscount: 0.3 },
    3: { name: 'Negociação e Liderança', perk: 'Aluguel 20% mais barato', rentDiscount: 0.2 },
    4: { name: 'Liderança Estratégica', perk: 'Salário +R$ 400', salaryBonus: 400 },
  },
  management: {
    1: { name: 'Organização Financeira', perk: 'Mercadinho 15% mais barato', foodDiscount: 0.15 },
    2: { name: 'Planejamento e Produtividade', perk: 'Cheque especial cai para 4% ao mês e +0,6% ao mês sobre as caixinhas', overdraftRate: REDUCED_OVERDRAFT_RATE, savingsBonusRate: 0.006 },
    3: { name: 'Visão de Mercado', perk: '+0,9% ao mês sobre as caixinhas e dica das ações do próximo mês', savingsBonusRate: 0.009, stockTips: true },
    4: { name: 'Estratégia e Empreendedorismo', perk: '+1,2% ao mês sobre as caixinhas', savingsBonusRate: 0.012 },
  },
}

const perkOf = (path, level) => PERKS[path]?.[level] ?? null

// Vantagens somadas. `unlocked` aceita nós ({ path, level }) ou as linhas de
// CharacterSkill com `skillNode` incluído. Sem nada desbloqueado, tudo neutro.
function perksOf(unlocked = []) {
  const perks = {
    salaryBonus: 0,
    salaryBonuses: [], // [{ skill, amount }] — uma linha no extrato para cada
    extraIncome: 0,
    incomes: [], // [{ label, skill, amount }] — freela, projeto paralelo
    repairDiscount: 0,
    utilitiesDiscount: 0,
    leisureDiscount: 0,
    rentDiscount: 0,
    foodDiscount: 0,
    overdraftRate: OVERDRAFT_MONTHLY_RATE,
    savingsBonusRate: 0,
    stockTips: false,
  }

  for (const item of unlocked ?? []) {
    const node = item?.skillNode ?? item
    const p = perkOf(node?.path, node?.level)
    if (!p) continue

    if (p.salaryBonus) {
      perks.salaryBonus += p.salaryBonus
      perks.salaryBonuses.push({ skill: p.name, amount: p.salaryBonus })
    }
    if (p.income) {
      perks.extraIncome += p.income.amount
      perks.incomes.push({ label: p.income.label, skill: p.name, amount: p.income.amount })
    }
    for (const key of ['repairDiscount', 'utilitiesDiscount', 'leisureDiscount', 'rentDiscount', 'foodDiscount']) {
      if (p[key]) perks[key] = Math.max(perks[key], p[key])
    }
    if (p.overdraftRate !== undefined) perks.overdraftRate = Math.min(perks.overdraftRate, p.overdraftRate)
    if (p.savingsBonusRate) perks.savingsBonusRate += p.savingsBonusRate
    if (p.stockTips) perks.stockTips = true
  }

  // evita lixo de ponto flutuante (0,006 + 0,009 + 0,012 = 0,027)
  perks.savingsBonusRate = Math.round(perks.savingsBonusRate * 1e6) / 1e6
  return perks
}

const discounted = (value, discount) => cents(Number(value) * (1 - discount))

// Desconto de cada conta do mês, pelo tipo usado no billController.
function billDiscount(type, perks) {
  if (type === 'food') return perks.foodDiscount
  if (type === 'utilities' || type === 'transport') return perks.utilitiesDiscount
  return 0
}

// Valor cobrado de uma conta do mês já com o desconto das habilidades.
const billAmount = (type, baseCost, perks) => discounted(baseCost, billDiscount(type, perks))

// Aluguel com o desconto de Negociação e Liderança.
const rentAmount = (housingCost, perks) => discounted(housingCost, perks.rentDiscount)

// Imprevisto do mês: os de casa (repair) ficam mais baratos; o resto não muda.
const eventImpact = (event, perks) =>
  event.repair && event.cashImpact < 0 ? discounted(event.cashImpact, perks.repairDiscount) : event.cashImpact

// Dilemas: só o que custa dinheiro fica mais barato; ganhos não mudam.
const dilemmaImpact = (value, perks) => (Number(value) < 0 ? discounted(value, perks.leisureDiscount) : Number(value))

// Bônus de Gestão: pago em dinheiro sobre o saldo das caixinhas.
const savingsBonus = (savingsBalance, perks) =>
  perks.savingsBonusRate > 0 && Number(savingsBalance) > 0 ? cents(Number(savingsBalance) * perks.savingsBonusRate) : 0

// "1,5%" — taxa em porcentagem no formato brasileiro.
const percentLabel = (rate) => `${(Math.round(rate * 1000) / 10).toString().replace('.', ',')}%`

// Dica de Visão de Mercado: eventos das ações que acontecem no próximo turno.
function stockTipsFor(currentTurn, events = STOCK_EVENTS) {
  const nextTurn = Number(currentTurn) + 1
  return Object.entries(events)
    .filter(([, e]) => e.turn === nextTurn)
    .map(([ticker, e]) => {
      const direction = e.change > 0 ? 'up' : 'down'
      const magnitude = percentLabel(Math.abs(e.change))
      return {
        ticker,
        turn: e.turn,
        direction,
        change: e.change,
        text: `${ticker} deve ${direction === 'up' ? 'subir' : 'cair'} cerca de ${magnitude} no próximo mês`,
      }
    })
}

module.exports = {
  PERKS,
  REDUCED_OVERDRAFT_RATE,
  perkOf,
  perksOf,
  billDiscount,
  billAmount,
  rentAmount,
  eventImpact,
  dilemmaImpact,
  savingsBonus,
  percentLabel,
  stockTipsFor,
}
