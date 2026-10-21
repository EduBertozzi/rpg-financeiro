// Dons da criação de personagem (os números valem no servidor, em utils/gifts.js).
// `year` é a referência do balanceamento, só para os testes: a tela não mostra
// valores, o jogador escolhe pela descrição. Contas com as regras de 20/10/2026:
// - frugal: 5% de R$ 3.600 de custos fixos × 12 = R$ 2.160
// - agile: R$ 120 × 12 + 25% de R$ 1.392 de eventos bons esperados = R$ 1.788
// - smart: estimativa — as duas melhores habilidades de nível 1 o ano todo
//   (freela R$ 100 + Mercadinho 7,5% de R$ 1.000) × 12 = R$ 2.100
export const GIFTS = [
  {
    id: 'frugal',
    name: 'Mão de Vaca Estratégico',
    effect: 'Todas as contas fixas do mês ficam 5% mais baratas.',
    year: 2160,
    color: '#3DBE5A',
  },
  {
    id: 'agile',
    name: 'Desenrolado',
    effect: 'Um freela fixo de R$ 120 por mês, e eventos bons rendem 25% a mais.',
    year: 1788,
    color: '#F07A26',
  },
  {
    id: 'smart',
    name: 'Inteligente',
    effect: 'Começa com 2 pontos para gastar na Árvore de habilidades, onde pontos viram vantagens (salário maior, contas mais baratas…). E pode juntar até 10 pontos, em vez de 8.',
    year: 2100,
    color: '#3F84EA',
  },
]

export const giftById = (id) => GIFTS.find((g) => g.id === id) ?? null

export const PROFESSIONS = [
  'Engenheiro(a) de Produção',
  'Engenheiro(a) de Computação',
  'Engenheiro(a) de Software',
  'Engenheiro(a) de Controle e Automação',
  'Engenheiro(a) Eletricista',
  'Engenheiro(a) de Telecomunicações',
  'Engenheiro(a) Biomédico(a)',
]

// Número de registro da carteira profissional: sempre o mesmo para o mesmo nome.
export function registrationNumber(name) {
  let h = 2166136261
  for (const ch of String(name ?? '').trim().toLowerCase()) {
    h ^= ch.codePointAt(0)
    h = Math.imul(h, 16777619) >>> 0
  }
  return `FM-${String(h % 1000000).padStart(6, '0')}`
}
