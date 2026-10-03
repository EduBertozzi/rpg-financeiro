// Dons da criação de personagem (os números valem no servidor, em utils/gifts.js).
// `year` é a referência do balanceamento, só para os testes: a tela não mostra
// valores, o jogador escolhe pela descrição.
export const GIFTS = [
  {
    id: 'frugal',
    name: 'Mão de Vaca Estratégico',
    effect: 'Todas as contas fixas do mês ficam 10% mais baratas.',
    style: 'Garantido',
    year: 3600,
    color: '#3DBE5A',
  },
  {
    id: 'agile',
    name: 'Desenrolado',
    effect: 'Um freela fixo de R$ 200 por mês, e eventos bons rendem 50% a mais.',
    style: 'Parte sorte',
    year: 3550,
    color: '#F07A26',
  },
  {
    id: 'smart',
    name: 'Inteligente',
    effect: 'Começa com 2 pontos de habilidade e pode usar até 10, em vez de 8.',
    style: 'Acelera a Universidade',
    year: 3640,
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
  return `SR-${String(h % 1000000).padStart(6, '0')}`
}
