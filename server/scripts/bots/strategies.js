// Robôs de teste: cada um joga o ano com um jeito diferente de decidir.
// Aqui só ficam as decisões (funções puras); quem joga é o run.js.

const PRUDENT = [0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0]
const CARELESS = [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1]
// o melhor caminho em dinheiro: empresta para o amigo (+37) e o resto como o prudente
const SHREWD = [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0]

const BOTS = [
  { id: 'gastao', name: 'Zé Gastão', bio: 'Paga o que é obrigatório e gasta o resto. Escolhe sempre o que sai mais barato agora.', dilemma: 'barato', invest: 'nada', reserveMonths: 0 },
  { id: 'formiga', name: 'Dona Formiga', bio: 'Prudente nos dilemas e guarda tudo na poupança.', dilemma: 'prudente', invest: 'poupanca', reserveMonths: 0, coversOverdraft: true },
  { id: 'planilha', name: 'Tia Planilha', bio: 'Faz a conta de cada dilema e diversifica: LCA, Tesouro, CDB, debênture e ações.', dilemma: 'esperto', invest: 'diversificado', reserveMonths: 1, coversOverdraft: true },
  { id: 'lobinho', name: 'Lobinho da Bolsa', bio: 'Quase tudo em ações. Nos dilemas, vai no instinto.', dilemma: 'aleatorio', invest: 'acoes', reserveMonths: 0.5 },
  { id: 'parcelinha', name: 'Seu Parcelinha', bio: 'Parcela tudo, deixa tudo para depois e não investe.', dilemma: 'descuidado', invest: 'nada', reserveMonths: 0 },
  { id: 'prudencio', name: 'Prudêncio', bio: 'Sempre a escolha segura e reserva de três meses; o resto em LCA.', dilemma: 'prudente', invest: 'lca', reserveMonths: 3, coversOverdraft: true },
  { id: 'sorte', name: 'Sorte Grande', bio: 'Decide tudo no cara ou coroa e guarda na poupança.', dilemma: 'aleatorio', invest: 'poupanca', reserveMonths: 0.5, coversOverdraft: true },
  { id: 'cuponete', name: 'Cuponete', bio: 'Caça todos os cupons do mapa, decide com cuidado e guarda no CDB.', dilemma: 'esperto', invest: 'cdb', reserveMonths: 1, coversOverdraft: true, huntsCoupons: true },
  { id: 'drjuros', name: 'Dr. Juros', bio: 'Só investimento isento de IR: LCA e LCI.', dilemma: 'esperto', invest: 'isentos', reserveMonths: 1, coversOverdraft: true },
  { id: 'debi', name: 'Debi Debênture', bio: 'Aposta alto na debênture (18% ao ano, risco de calote).', dilemma: 'prudente', invest: 'debenture', reserveMonths: 1, coversOverdraft: true },
  { id: 'cofrinho', name: 'Seu Cofrinho', bio: 'Controle da turma: decide os dilemas com cuidado, mas deixa todo o dinheiro parado na conta.', dilemma: 'prudente', invest: 'nada', reserveMonths: 0 },
  { id: 'dorminhoco', name: 'Dorminhoco', bio: 'Esquece de jogar: não responde nada, não paga nada. O administrador fecha o mês mesmo assim.', idle: true },
]

const GIFTS = ['frugal', 'agile', 'smart']
const PATHS = ['technical', 'communication', 'management']

// Qual opção do dilema escolher. `options` vem da API (com `price`).
function dilemmaChoice(policy, turn, options, rng = Math.random) {
  const i = turn - 1
  if (policy === 'prudente') return PRUDENT[i] ?? 0
  if (policy === 'descuidado') return CARELESS[i] ?? 0
  if (policy === 'esperto') return SHREWD[i] ?? 0
  if (policy === 'barato') {
    let best = 0
    options.forEach((o, k) => { if (o.price < options[best].price) best = k })
    return best
  }
  return Math.floor(rng() * options.length)
}

const cents = (n) => Math.round(n * 100) / 100

// Quanto dá para investir: o saldo menos a reserva que o robô quer deixar na conta.
function investable(cash, monthlyNeed, reserveMonths = 0) {
  return Math.max(0, cents(Number(cash) - monthlyNeed * reserveMonths))
}

// Divide o valor entre os investimentos do jeito do robô.
// kind: 'fixed' (caixinha, com type), 'stocks' (ações) ou 'debenture'.
function investPlan(policy, amount, turn) {
  if (amount < 50) return []
  const part = (share) => cents(amount * share)
  const fixed = (type, share) => ({ kind: 'fixed', type, amount: part(share) })
  // debênture só até setembro: depois disso ela vence no mesmo mês
  const debentureOpen = turn <= 9
  switch (policy) {
    case 'poupanca': return [fixed('POUPANCA', 1)]
    case 'cdb': return [fixed('CDB', 1)]
    case 'lca': return [fixed('LCA', 1)]
    case 'isentos': return [fixed('LCA', 0.6), fixed('LCI', 0.4)]
    case 'acoes': return [{ kind: 'stocks', amount: part(0.8) }, fixed('CDB', 0.2)]
    case 'debenture': return debentureOpen ? [{ kind: 'debenture', amount: part(0.6) }, fixed('CDB', 0.4)] : [fixed('CDB', 1)]
    case 'diversificado': return [
      fixed('LCA', 0.35), fixed('TESOURO_SELIC', 0.2), fixed('CDB', 0.15),
      ...(debentureOpen ? [{ kind: 'debenture', amount: part(0.15) }] : [fixed('TESOURO_PRE', 0.15)]),
      { kind: 'stocks', amount: part(0.15) },
    ]
    default: return []
  }
}

// Quantas ações de cada papel comprar com `amount`, dividindo por igual.
function stockOrders(amount, assets) {
  if (!assets.length) return []
  const each = amount / assets.length
  return assets
    .map((a) => ({ assetId: a.id, quantity: Math.floor(each / Number(a.currentPrice)) }))
    .filter((o) => o.quantity > 0)
}

// Ordem em que o robô tenta desbloquear habilidades: o caminho dele inteiro,
// depois os outros na ordem.
function skillOrder(path) {
  const order = [path, ...PATHS.filter((p) => p !== path)]
  return order.flatMap((p) => [1, 2, 3, 4].map((level) => ({ path: p, level })))
}

// Gerador de números com semente (mulberry32), para repetir uma rodada de testes.
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

// Estatísticas de uma lista de números.
function stats(values) {
  const v = [...values].filter(Number.isFinite).sort((a, b) => a - b)
  if (!v.length) return { n: 0, mean: 0, min: 0, p10: 0, median: 0, p90: 0, max: 0 }
  const q = (p) => v[Math.min(v.length - 1, Math.floor(p * (v.length - 1)))]
  return {
    n: v.length,
    mean: cents(v.reduce((s, x) => s + x, 0) / v.length),
    min: v[0], p10: q(0.1), median: q(0.5), p90: q(0.9), max: v[v.length - 1],
  }
}

module.exports = { BOTS, GIFTS, PATHS, PRUDENT, CARELESS, SHREWD, dilemmaChoice, investable, investPlan, stockOrders, skillOrder, seededRandom, stats }
