// Cupons escondidos no mapa (easter egg). Cada personagem tem 3 por partida:
// um no começo do ano, um no meio e um no fim, cada um num lugar do mapa e com
// um prêmio diferente. Tudo aqui é função pura — o sorteio recebe `random`
// injetável (como `nextStockPrice` em finance.js) para poder ser testado.
const crypto = require('crypto')
const { cents } = require('./finance')

// meses em que cada cupom pode aparecer (um cupom por fase)
const COUPON_PHASES = Object.freeze([
  Object.freeze({ from: 2, to: 4 }),
  Object.freeze({ from: 5, to: 8 }),
  Object.freeze({ from: 9, to: 11 }), // o mês 12 nunca é jogado: a partida acaba na virada do 11 para o 12
])

// lugares do mapa onde o cupom pode estar escondido
const COUPON_SPOTS = Object.freeze(['lake', 'balloon', 'tree', 'fountain'])

const FOOD_COUPON_RATE = 0.20 // 20% na conta do Mercadinho do mês
const CASHBACK_AMOUNT = 150 // R$ 150 direto na conta

const COUPON_REWARDS = {
  food_discount: {
    title: 'Cupom do Mercadinho',
    description: '20% de desconto na conta do Mercadinho deste mês.',
  },
  cashback: {
    title: 'Cashback do Maré',
    description: `R$ ${CASHBACK_AMOUNT} de volta direto na sua conta.`,
  },
  skill_point: {
    title: 'Bilhete da Universidade',
    description: '+1 ponto de habilidade para a sua constelação.',
  },
}

const REWARD_KINDS = Object.freeze(Object.keys(COUPON_REWARDS))

// marca no extrato da conta do Mercadinho paga com o cupom
const FOOD_COUPON_NOTE = 'com o Cupom do Mercadinho'

// inteiro sorteado entre `from` e `to` (inclusive)
const randomInt = (from, to, random) => from + Math.min(Math.floor(random() * (to - from + 1)), to - from)

// embaralhamento de Fisher-Yates (não mexe no array original)
function shuffle(items, random) {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(0, i, random)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// Plano de cupons da partida: 3 { turn, spot, reward }, um por fase, em ordem
// de mês, com os 3 prêmios sem repetir.
function planCoupons(random = Math.random) {
  const rewards = shuffle(REWARD_KINDS, random)
  return COUPON_PHASES.map((phase, i) => ({
    turn: randomInt(phase.from, phase.to, random),
    spot: COUPON_SPOTS[randomInt(0, COUPON_SPOTS.length - 1, random)],
    reward: rewards[i],
  }))
}

// Gerador pseudoaleatório com semente (mulberry32). Usado para criar o plano de
// personagens antigos: o mesmo personagem sempre recebe o mesmo plano, então
// duas requisições ao mesmo tempo não criam cupons diferentes.
function seededRandom(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Semente a partir de um texto (id do personagem + segredo do servidor, para o
// plano não ser adivinhável pelo id).
const seedFrom = (text) => crypto.createHash('sha256').update(String(text)).digest().readUInt32BE(0)

const isRewardKind = (kind) => Object.prototype.hasOwnProperty.call(COUPON_REWARDS, kind)

// Desconto do cupom sobre a conta do Mercadinho (valor já com as habilidades).
const foodCouponDiscount = (billValue) => cents(Number(billValue) * FOOD_COUPON_RATE)

// Conta do Mercadinho depois do cupom.
const foodBillWithCoupon = (billValue) => cents(Number(billValue) - foodCouponDiscount(billValue))

// Desconto total (em fração) somando o da habilidade com o do cupom:
// 10% da habilidade + 20% do cupom = 28%, porque o cupom vale sobre o que sobrou.
const combinedDiscount = (skillDiscount) =>
  Math.round((1 - (1 - Number(skillDiscount)) * (1 - FOOD_COUPON_RATE)) * 10000) / 10000

// O que o cupom entrega, para a resposta do resgate: { kind, title, description, amount }
function rewardInfo(kind, amount = 0) {
  const reward = COUPON_REWARDS[kind]
  if (!reward) return null
  return { kind, title: reward.title, description: reward.description, amount: cents(Number(amount)) }
}

module.exports = {
  COUPON_PHASES,
  COUPON_SPOTS,
  COUPON_REWARDS,
  REWARD_KINDS,
  FOOD_COUPON_RATE,
  FOOD_COUPON_NOTE,
  CASHBACK_AMOUNT,
  randomInt,
  shuffle,
  planCoupons,
  seededRandom,
  seedFrom,
  isRewardKind,
  foodCouponDiscount,
  foodBillWithCoupon,
  combinedDiscount,
  rewardInfo,
}
