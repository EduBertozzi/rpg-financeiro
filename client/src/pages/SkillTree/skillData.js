// Dados e regras da Árvore de habilidades.
// As regras de desbloqueio espelham server/src/controllers/skillController.js
// e são testadas em skillData.test.js.

export const PATHS = {
  technical: { short: 'Técnico', label: 'Raciocínio Lógico e Técnico', theme: 'Renda garantida', hex: '#2F7FE0' },
  communication: { short: 'Comunicação', label: 'Comunicação e Trabalho em Equipe', theme: 'Contas mais baratas', hex: '#E0762B' },
  management: { short: 'Gestão', label: 'Gestão e Visão de Negócio', theme: 'Rende sobre o que você guarda', hex: '#8A5CF6' },
}

export const PATH_ORDER = ['technical', 'communication', 'management']

// Vantagem de cada habilidade (os números são aplicados no servidor, em utils/skills.js).
export const PERKS = {
  'technical-1': { desc: 'Você começa a pegar trabalhos extras nos finais de semana.', perk: '+R$ 100 por mês' },
  'technical-2': { desc: 'Você mesmo conserta o chuveiro e o vazamento.', perk: 'Imprevistos de casa 25% mais baratos', note: 'O conserto do celular ou do notebook (R$ 450) sai por R$ 337,50.' },
  'technical-3': { desc: 'Seu trabalho chama atenção e vem a promoção.', perk: 'Salário +R$ 200 (R$ 7.200 brutos)' },
  'technical-4': { desc: 'Você vira referência e ganha um projeto paralelo fixo.', perk: '+R$ 200 por mês' },
  'communication-1': { desc: 'Você liga na operadora e na companhia de luz e consegue um desconto.', perk: 'Água, luz e internet 15% mais baratas', note: 'R$ 75 por mês sobre os R$ 500 dessas contas.' },
  'communication-2': { desc: 'A galera racha tudo certinho com você.', perk: 'Lazer e dilemas 15% mais baratos', note: 'Em média R$ 100 por mês.' },
  'communication-3': { desc: 'Você senta com o dono do apê e negocia.', perk: 'Aluguel 7,5% mais barato', note: 'R$ 157,50 por mês sobre os R$ 2.100 do aluguel.' },
  'communication-4': { desc: 'Você passa a coordenar uma equipe.', perk: 'Salário +R$ 200 (cargo de coordenação)' },
  'management-1': { desc: 'Você passa a fazer uma lista de compras e comparar os preços dos supermercados.', perk: 'Mercadinho 7,5% mais barato', note: 'R$ 75 por mês sobre os R$ 1.000 do mercado.' },
  'management-2': { desc: 'Você conversa com o gerente do Inabank e consegue condições melhores.', perk: 'Caixinhas +0,4% ao mês e cheque especial a 4%', note: 'Com R$ 20 mil guardados, são R$ 80 a mais por mês.' },
  'management-3': { desc: 'Você lê o jornal com outros olhos.', perk: 'Caixinhas +0,65% ao mês e dica das ações', note: 'A dica do evento das ações chega um mês antes.' },
  'management-4': { desc: 'Investidores passam a te chamar para rodadas fechadas.', perk: 'Caixinhas +0,85% ao mês', note: 'Com R$ 30 mil guardados, são R$ 255 a mais por mês.' },
}

export const perkOf = (skill) => PERKS[`${skill.path}-${skill.level}`] ?? { desc: skill.description, perk: skill.description }

// Posições na árvore (viewBox 1000 × 740), do nível 1 ao 4: o tronco embaixo
// e um galho para cada caminho.
export const CORE = [500, 670]
export const SPOTS = {
  technical: [[388, 592], [296, 490], [222, 380], [166, 262]],
  communication: [[500, 550], [500, 442], [500, 332], [500, 216]],
  management: [[612, 592], [704, 490], [778, 380], [834, 262]],
}

export const STATUS_TEXT = {
  on: 'Já é sua',
  locked: 'Desbloqueie o nível anterior primeiro',
  poor: 'Faltam pontos. Cada dilema respondido dá 1',
  cap: 'Limite de pontos atingido',
  ready: 'Pronta para desbloquear',
}

// Custo em pontos: sempre o da habilidade (o dom Inteligente dá pontos a mais, não desconto).
export const skillCost = (skill) => skill.costPoints

// Estado de uma habilidade, na mesma ordem de checagem do servidor.
export function skillStatus(skill, { skills, unlockedIds, totalPoints, usedPoints, maxPoints, gift }) {
  if (unlockedIds.includes(skill.id)) return 'on'
  if (skill.level > 1) {
    const prev = skills.find((s) => s.path === skill.path && s.level === skill.level - 1)
    if (!prev || !unlockedIds.includes(prev.id)) return 'locked'
  }
  const cost = skillCost(skill, gift)
  if (usedPoints + cost > totalPoints) return 'poor'
  if (usedPoints + cost > maxPoints) return 'cap'
  return 'ready'
}
