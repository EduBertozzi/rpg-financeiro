// Dons do personagem (escolhidos na criação). Tudo que é número dos dons mora
// aqui — o resto do servidor só chama os helpers. Balanceados para valer
// ≈ R$ 3.600 por ano cada um (ver __tests__/gifts.test.js).
const { cents } = require('./finance')

// custos fixos mensais de quem não tem dom de desconto
const BASE_COSTS = { housingCost: 1500, foodCost: 1000, utilitiesCost: 250, transportCost: 250 }

// pontos de habilidade de quem não tem o dom Inteligente
const BASE_SKILL_POINTS = { totalPoints: 0, maxPoints: 8 }

const GIFTS = {
  frugal: {
    id: 'frugal',
    name: 'Mão de Vaca Estratégico',
    description: 'Todos os custos fixos do mês 10% mais baratos.',
    costDiscount: 0.10,
  },
  agile: {
    id: 'agile',
    name: 'Desenrolado',
    description: 'Freela fixo de R$ 220 por mês e eventos positivos pagam 50% a mais.',
    monthlyIncome: { label: 'Freela', amount: 220 },
    positiveEventBonus: 0.50,
  },
  smart: {
    id: 'smart',
    name: 'Inteligente',
    description: 'Começa com 2 pontos de habilidade e pode usar até 10 (em vez de 8).',
    skillPoints: { totalPoints: 2, maxPoints: 10 },
  },
}

const GIFT_IDS = Object.keys(GIFTS)

const giftOf = (gift) => (Object.prototype.hasOwnProperty.call(GIFTS, gift) ? GIFTS[gift] : null)
const isValidGift = (gift) => giftOf(gift) !== null

// custos fixos do mês na criação do personagem (com o desconto do dom, se tiver)
function startingCosts(gift) {
  const discount = giftOf(gift)?.costDiscount ?? 0
  const costs = {}
  for (const [key, value] of Object.entries(BASE_COSTS)) costs[key] = cents(value * (1 - discount))
  return costs
}

// pontos de habilidade iniciais e limite de pontos usáveis
const startingSkillPoints = (gift) => ({ ...(giftOf(gift)?.skillPoints ?? BASE_SKILL_POINTS) })

// renda extra do dom paga em toda virada de mês (0 sem dom de renda)
const giftIncome = (gift) => giftOf(gift)?.monthlyIncome?.amount ?? 0

// linha do extrato da renda do dom ({ label, skill, amount }), ou null
function giftIncomeEntry(gift) {
  const g = giftOf(gift)
  if (!g?.monthlyIncome) return null
  return { label: g.monthlyIncome.label, skill: g.name, amount: g.monthlyIncome.amount }
}

// multiplicador dos eventos positivos (1 sem dom de bônus)
const positiveEventMultiplier = (gift) => 1 + (giftOf(gift)?.positiveEventBonus ?? 0)

// valor de um evento depois do dom: só os positivos ganham o bônus
const giftEventImpact = (cashImpact, gift) =>
  (cashImpact > 0 ? cents(cashImpact * positiveEventMultiplier(gift)) : cashImpact)

module.exports = {
  GIFTS, GIFT_IDS, BASE_COSTS, BASE_SKILL_POINTS,
  giftOf, isValidGift, startingCosts, startingSkillPoints,
  giftIncome, giftIncomeEntry, positiveEventMultiplier, giftEventImpact,
}
