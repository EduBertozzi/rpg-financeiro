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
      { ticker: 'INVI3', name: 'InvestTech Soluções', type: 'stock', sector: 'Tecnologia', riskLevel: 'low',    basePrice: 18.50 },
      { ticker: 'VALE4', name: 'ValeMais Energia',    type: 'stock', sector: 'Energia',    riskLevel: 'medium', basePrice: 32.00 },
      { ticker: 'STRT3', name: 'StartUp Veloz',       type: 'stock', sector: 'Logística',  riskLevel: 'high',   basePrice: 8.20  },
      { ticker: 'INFT11', name: 'INATEL FII',         type: 'fii',   sector: 'Imóveis',    riskLevel: 'low',    basePrice: 105.00 },
      { ticker: 'TECH11', name: 'TechFundo FII',      type: 'fii',   sector: 'Tecnologia', riskLevel: 'medium', basePrice: 88.00  },
    ]
  })

  console.log('Ativos de mercado populados! 5 ativos criados.')

  await prisma.company.deleteMany()

  await prisma.company.createMany({
    data: [
      { name: 'InvestTech Soluções', description: 'Empresa consolidada de tecnologia financeira.', riskRating: 'AAA', riskLevel: 'low',    annualRate: 0.095, defaultProbability: 0.005 },
      { name: 'ValeMais Energia',    description: 'Empresa de energia renovável em expansão.',     riskRating: 'BBB', riskLevel: 'medium', annualRate: 0.145, defaultProbability: 0.035 },
      { name: 'StartUp Veloz',       description: 'Startup de logística com alto potencial.',      riskRating: 'CCC', riskLevel: 'high',   annualRate: 0.220, defaultProbability: 0.120 },
    ]
  })

  console.log('Empresas populadas! 3 empresas criadas.')
  await prisma.$disconnect()
}

seed().catch(console.error)