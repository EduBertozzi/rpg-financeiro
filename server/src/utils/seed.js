const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function seed() {
  console.log('Populando skill tree...')

  await prisma.skillNode.deleteMany()

  await prisma.skillNode.createMany({
    data: [
      { path: 'technical', level: 1, name: 'Fundamentos e Lógica', description: 'Desenvolvimento do pensamento lógico e organização de ideias.', costPoints: 1 },
      { path: 'technical', level: 2, name: 'Resolução de Problemas', description: 'Aplicação prática do raciocínio para resolver desafios reais.', costPoints: 1 },
      { path: 'technical', level: 3, name: 'Pensamento Analítico Avançado', description: 'Capacidade de lidar com problemas complexos e tomar decisões estruturadas.', costPoints: 2 },
      { path: 'technical', level: 4, name: 'Inovação e Otimização', description: 'Criação de soluções eficientes e inovadoras.', costPoints: 2 },

      { path: 'communication', level: 1, name: 'Comunicação Básica', description: 'Clareza na transmissão de ideias.', costPoints: 1 },
      { path: 'communication', level: 2, name: 'Trabalho em Equipe', description: 'Colaboração eficiente com outras pessoas.', costPoints: 1 },
      { path: 'communication', level: 3, name: 'Negociação e Liderança', description: 'Capacidade de influenciar decisões e coordenar tarefas.', costPoints: 2 },
      { path: 'communication', level: 4, name: 'Liderança Estratégica', description: 'Gestão de equipes e tomada de decisões importantes.', costPoints: 2 },

      { path: 'management', level: 1, name: 'Organização Financeira', description: 'Controle básico de gastos e planejamento.', costPoints: 1 },
      { path: 'management', level: 2, name: 'Planejamento e Produtividade', description: 'Uso eficiente do tempo e recursos.', costPoints: 1 },
      { path: 'management', level: 3, name: 'Visão de Mercado', description: 'Entendimento de oportunidades e riscos.', costPoints: 2 },
      { path: 'management', level: 4, name: 'Estratégia e Empreendedorismo', description: 'Capacidade de criar e expandir projetos.', costPoints: 2 },
    ]
  })

  console.log('Skill tree populada! 12 nós criados.')

  await prisma.marketAsset.deleteMany()

  await prisma.marketAsset.createMany({
    data: [
      { ticker: 'VALE3', name: 'Vale', type: 'stock', sector: 'Mineração', riskLevel: 'medium', basePrice: 83.79 },
      { ticker: 'PETR4', name: 'Petrobras', type: 'stock', sector: 'Energia', riskLevel: 'high', basePrice: 45.22 },
      { ticker: 'AMER3', name: 'Americanas', type: 'stock', sector: 'Varejo', riskLevel: 'high', basePrice: 5.29 },
      { ticker: 'ABEV3', name: 'Ambev', type: 'stock', sector: 'Bebidas', riskLevel: 'low', basePrice: 15.90 },
      { ticker: 'ECOP4', name: 'EcoPlanet', type: 'stock', sector: 'Sustentabilidade', riskLevel: 'medium', basePrice: 12.50 },
      { ticker: 'TECH3', name: 'TechFuture', type: 'stock', sector: 'Tecnologia', riskLevel: 'high', basePrice: 55.00 },
      { ticker: 'SAUD3', name: 'SaúdeMais', type: 'stock', sector: 'Saúde', riskLevel: 'low', basePrice: 30.20 },
      { ticker: 'CONS4', name: 'ConstruBem', type: 'stock', sector: 'Construção', riskLevel: 'medium', basePrice: 22.10 },
    ]
  })

  console.log('Ativos de mercado populados! 5 ativos criados.')

  await prisma.company.deleteMany()

  await prisma.company.createMany({
    data: [
      { name: 'Milhas Fácil', description: 'Empresa de programas de fidelidade e milhas.', riskRating: 'BBB', riskLevel: 'medium', annualRate: 0.18, defaultProbability: 0.05 },
    ]
  })

  console.log('Empresas populadas! 3 empresas criadas.')
  await prisma.$disconnect()
}

seed().catch(console.error)