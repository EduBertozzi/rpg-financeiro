const prisma = require('../lib/prisma')

const EVENTS = [
  { title: 'Resistência Queimada', description: 'A resistência do seu chuveiro queimou.', cashImpact: -200, category: 'daily' },
  { title: 'Emergência Veterinária', description: 'Seu pet passou mal de madrugada.', cashImpact: -600, category: 'daily' },
  { title: 'Dor de Dente Noturna', description: 'Tratamento de canal de emergência.', cashImpact: -600, category: 'daily' },
  { title: 'Infiltração Grave', description: 'Um cano estourou na parede.', cashImpact: -3500, category: 'daily' },
  { title: 'Sorteio de Ingressos', description: 'Você ganhou ingressos VIP para um festival!', cashImpact: -30, category: 'leisure' },
  { title: 'Intoxicação Alimentar', description: 'A comida do rolê não caiu bem.', cashImpact: -150, category: 'leisure' },
  { title: 'Promoção Relâmpago', description: 'Pacote de viagem imperdível de última hora!', cashImpact: -300, category: 'leisure' },
  { title: 'Freelance Inesperado', description: 'Um conhecido te indicou para um freela rápido!', cashImpact: 800, category: 'positive' },
  { title: 'Bônus no Trabalho', description: 'Seu desempenho foi reconhecido esse mês!', cashImpact: 1500, category: 'positive' },
  { title: 'Nenhum imprevisto', description: 'Mês tranquilo, sem surpresas.', cashImpact: 0, category: 'none' },
  { title: 'Nenhum imprevisto', description: 'Mês tranquilo, sem surpresas.', cashImpact: 0, category: 'none' },
  { title: 'Nenhum imprevisto', description: 'Mês tranquilo, sem surpresas.', cashImpact: 0, category: 'none' },
]

const DILEMMAS = [
  null, // turno 0
  {     // turno 1 - Janeiro
    title: 'Aniversário do seu amigo',
    description: 'É aniversário do seu melhor amigo e você precisa comprar um presente e rachar a conta da comemoração.',
    options: [
      { label: 'A', text: 'Participar da comemoração (- R$ 100)', effectType: 'immediate_cash', effectValue: -100, probability: 1.0 }
    ]
  },
  {     // turno 2 - Fevereiro
    title: 'Jantar com amigos',
    description: 'A galera marcou um jantar naquele restaurante novo que acabou de abrir na cidade.',
    options: [
      { label: 'A', text: 'Ir ao jantar (- R$ 150)', effectType: 'immediate_cash', effectValue: -150, probability: 1.0 }
    ]
  },
  {     // turno 3 - Março
    title: 'Carnaval',
    description: 'Chegou o Carnaval! Bloquinhos, fantasias e muita curtição.',
    options: [
      { label: 'A', text: 'Pular carnaval (- R$ 300)', effectType: 'immediate_cash', effectValue: -300, probability: 1.0 }
    ]
  },
  {     // turno 4 - Abril
    title: 'Páscoa',
    description: 'Época de comprar ovos de Páscoa e chocolates para a família.',
    options: [
      { label: 'A', text: 'Comprar chocolates (- R$ 100)', effectType: 'immediate_cash', effectValue: -100, probability: 1.0 }
    ]
  },
  {     // turno 5 - Maio
    title: 'Festa da cidade',
    description: 'A cidade está de aniversário e tem shows e barracas de comida na praça principal.',
    options: [
      { label: 'A', text: 'Aproveitar a festa (- R$ 80)', effectType: 'immediate_cash', effectValue: -80, probability: 1.0 }
    ]
  },
  {     // turno 6 - Junho
    title: 'Festa junina do bairro',
    description: 'Quentão, pipoca e quadrilha! A festa junina do seu bairro já começou.',
    options: [
      { label: 'A', text: 'Comer as comidas típicas (- R$ 50)', effectType: 'immediate_cash', effectValue: -50, probability: 1.0 }
    ]
  },
  {     // turno 7 - Julho
    title: 'Férias',
    description: 'Mês de férias! Você planejou uma viagem para descansar.',
    options: [
      { label: 'A', text: 'Viajar (- R$ 1.500)', effectType: 'immediate_cash', effectValue: -1500, probability: 1.0 }
    ]
  },
  {     // turno 8 - Agosto
    title: 'Show do Michael Jackson',
    description: 'Um cover oficial incrível (ou um holograma?) do Rei do Pop vai se apresentar perto daqui.',
    options: [
      { label: 'A', text: 'Comprar ingresso (- R$ 400)', effectType: 'immediate_cash', effectValue: -400, probability: 1.0 }
    ]
  },
  {     // turno 9 - Setembro
    title: 'Hacktown',
    description: 'O maior festival de inovação, tecnologia e criatividade de Santa Rita do Sapucaí!',
    options: [
      { label: 'A', text: 'Ir ao Hacktown (- R$ 600)', effectType: 'immediate_cash', effectValue: -600, probability: 1.0 }
    ]
  },
  {     // turno 10 - Outubro
    title: 'Rock in Rio',
    description: 'Festival de música gigante! A viagem e os ingressos não são baratos.',
    options: [
      { label: 'A', text: 'Ir ao Rock in Rio (- R$ 800)', effectType: 'immediate_cash', effectValue: -800, probability: 1.0 }
    ]
  },
  {     // turno 11 - Novembro
    title: 'Black Friday',
    description: 'Muitas promoções! Você acabou não resistindo e trocou de celular ou TV.',
    options: [
      { label: 'A', text: 'Aproveitar promoções (- R$ 1.000)', effectType: 'immediate_cash', effectValue: -1000, probability: 1.0 }
    ]
  },
  {     // turno 12 - Dezembro
    title: 'Natal e Ano Novo',
    description: 'Festas de fim de ano, presentes, ceia e viagem de réveillon.',
    options: [
      { label: 'A', text: 'Comemorar festas (- R$ 500)', effectType: 'immediate_cash', effectValue: -500, probability: 1.0 }
    ]
  },
]

function pickEvent() {
  return EVENTS[Math.floor(Math.random() * EVENTS.length)]
}

async function applyFixedCosts(character) {
  const totalCosts = Number(character.housingCost) +
    Number(character.foodCost) +
    Number(character.utilitiesCost) +
    Number(character.transportCost)

  let newCash = Number(character.cash) - totalCosts
  let overdraftDebt = Number(character.overdraftDebt)
  let isBankrupt = character.isBankrupt

  if (newCash < 0) {
    overdraftDebt += Math.abs(newCash) * 0.12 // 12% de juros no cheque especial
    newCash = 0
    isBankrupt = true
  } else {
    isBankrupt = false
  }

  await prisma.character.update({
    where: { id: character.id },
    data: { cash: newCash, overdraftDebt, isBankrupt }
  })

  return { totalCosts, newCash, overdraftDebt }
}

async function applyFixedIncomeReturns(character, turn) {
  const investments = await prisma.fixedIncomeInvestment.findMany({
    where: { characterId: character.id, redeemedAt: null }
  })

  let totalReturns = 0
  for (const inv of investments) {
    const monthlyReturn = Number(inv.amount) * Number(inv.monthlyRate)
    totalReturns += monthlyReturn
    await prisma.fixedIncomeInvestment.update({
      where: { id: inv.id },
      data: { amount: { increment: monthlyReturn } }
    })
  }

  return totalReturns
}

async function applyEvent(character, turn) {
  const event = pickEvent()
  let cashImpact = event.cashImpact

  // dom agile recebe 20% a mais em eventos positivos
  if (cashImpact > 0 && character.gift === 'agile') {
    cashImpact = Math.round(cashImpact * 1.2)
  }

  if (cashImpact !== 0) {
    await prisma.character.update({
      where: { id: character.id },
      data: { cash: { increment: cashImpact } }
    })
  }

  await prisma.characterEventLog.create({
    data: {
      characterId: character.id,
      turn,
      cashImpact,
      description: `${event.title}: ${event.description}`
    }
  })

  return { event, cashImpact }
}

async function generateAssetPrices(roomId, turn) {
  const assets = await prisma.marketAsset.findMany()

  for (const asset of assets) {
    const prev = await prisma.assetPrice.findUnique({
      where: { assetId_turn_roomId: { assetId: asset.id, turn: turn - 1, roomId } }
    })

    const basePrice = prev ? Number(prev.price) : Number(asset.basePrice)

    // variação aleatória baseada no nível de risco
    const volatility = asset.riskLevel === 'low' ? 0.03 : asset.riskLevel === 'medium' ? 0.07 : 0.15
    let change = (Math.random() * 2 - 1) * volatility

    // Eventos específicos para ações (Historinhas)
    if (asset.ticker === 'VALE3' && turn === 3) {
      change += 0.40 // Valoriza 40%
    } else if (asset.ticker === 'PETR4' && turn === 10) {
      change -= 0.35 // Cai 35% por evento político (eleição)
    } else if (asset.ticker === 'ECOP4' && turn === 5) {
      change += 0.25 // Valoriza por incentivo verde
    } else if (asset.ticker === 'TECH3' && turn === 7) {
      change -= 0.20 // Cai por balanço ruim
    } else if (asset.ticker === 'SAUD3' && turn === 8) {
      change += 0.30 // Valoriza por nova patente médica
    } else if (asset.ticker === 'CONS4' && turn === 4) {
      change -= 0.15 // Cai por crise imobiliária
    }

    const newPrice = Math.max(basePrice * (1 + change), 0.01)

    await prisma.assetPrice.upsert({
      where: { assetId_turn_roomId: { assetId: asset.id, turn, roomId } },
      update: { price: Math.round(newPrice * 100) / 100 },
      create: { assetId: asset.id, turn, roomId, price: Math.round(newPrice * 100) / 100 }
    })
  }
}

async function checkDebentures(character, turn) {
  const debentures = await prisma.debentureInvestment.findMany({
    where: { characterId: character.id, status: 'active', maturesAt: turn },
    include: { company: true }
  })

  for (const deb of debentures) {
    const rolled = Math.random()
    const defaulted = rolled < Number(deb.company.defaultProbability)

    if (defaulted) {
      await prisma.debentureInvestment.update({
        where: { id: deb.id },
        data: { status: 'defaulted', returnedValue: 0 }
      })
      await prisma.characterEventLog.create({
        data: {
          characterId: character.id, turn,
          cashImpact: -Number(deb.amount),
          description: `${deb.company.name} entrou em calote! Você perdeu R$ ${deb.amount}.`
        }
      })
    } else {
      const months = deb.maturesAt - deb.investedAt
      const monthlyRate = Math.pow(1 + Number(deb.annualRate), 1 / 12) - 1
      const returnedValue = Number(deb.amount) * Math.pow(1 + monthlyRate, months)
      const rounded = Math.round(returnedValue * 100) / 100

      await prisma.$transaction([
        prisma.debentureInvestment.update({
          where: { id: deb.id },
          data: { status: 'paid', returnedValue: rounded }
        }),
        prisma.character.update({
          where: { id: character.id },
          data: { cash: { increment: rounded } }
        })
      ])

      await prisma.characterEventLog.create({
        data: {
          characterId: character.id, turn,
          cashImpact: rounded,
          description: `Debênture da ${deb.company.name} venceu! Você recebeu R$ ${rounded.toFixed(2)}.`
        }
      })
    }
  }
}

async function saveSnapshot(character, turn) {
  const fresh = await prisma.character.findUnique({
    where: { id: character.id },
    include: {
      fixedInvestments: { where: { redeemedAt: null } },
      positions: true,
      debentures: { where: { status: 'active' } }
    }
  })

  const fixedIncome = fresh.fixedInvestments.reduce((sum, i) => sum + Number(i.amount), 0)
  const debentures = fresh.debentures.reduce((sum, d) => sum + Number(d.amount), 0)
  const totalDebts = Number(fresh.overdraftDebt) + Number(fresh.loanDebt)
  const totalAssets = Number(fresh.cash) + fixedIncome + debentures
  const netWorth = totalAssets - totalDebts

  await prisma.financialSnapshot.upsert({
    where: { characterId_turn: { characterId: character.id, turn } },
    update: { cash: Number(fresh.cash), fixedIncome, debentures, totalAssets, totalDebts, netWorth },
    create: { characterId: character.id, turn, cash: Number(fresh.cash), fixedIncome, debentures, totalAssets, totalDebts, netWorth }
  })

  return { netWorth, cash: Number(fresh.cash), fixedIncome, debentures }
}

async function processTurn(roomId) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { characters: true }
  })

  if (!room || room.status !== 'active') throw new Error('Sala inválida ou não ativa')

  const nextTurn = room.currentTurn + 1
  const results = []

  await generateAssetPrices(roomId, nextTurn)

  for (const character of room.characters) {
    const costs = await applyFixedCosts(character)
    const returns = await applyFixedIncomeReturns(character, nextTurn)
    const eventResult = await applyEvent(character, nextTurn)
    await checkDebentures(character, nextTurn)
    const snapshot = await saveSnapshot(character, nextTurn)

    results.push({
      characterId: character.id,
      characterName: character.name,
      cashDelta: -costs.totalCosts + returns + eventResult.cashImpact,
      event: eventResult.event,
      netWorth: snapshot.netWorth
    })
  }

  const isFinished = nextTurn >= room.maxTurns

  await prisma.room.update({
    where: { id: roomId },
    data: {
      currentTurn: nextTurn,
      status: isFinished ? 'finished' : 'active',
      finishedAt: isFinished ? new Date() : null,
      characters: { updateMany: { where: {}, data: { turnReady: false } } }
    }
  })

  if (isFinished) await buildLeaderboard(roomId)

  const dilemma = DILEMMAS[nextTurn] ?? null

  return { turn: nextTurn, results, dilemma, isFinished }
}

async function buildLeaderboard(roomId) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      characters: {
        include: {
          snapshots: { orderBy: { turn: 'desc' }, take: 1 }
        }
      }
    }
  })

  const sorted = room.characters
    .map(c => ({ characterId: c.id, netWorth: c.snapshots[0]?.netWorth ?? 0 }))
    .sort((a, b) => Number(b.netWorth) - Number(a.netWorth))

  for (let i = 0; i < sorted.length; i++) {
    await prisma.leaderboard.upsert({
      where: { characterId: sorted[i].characterId },
      update: { finalRank: i + 1, netWorth: sorted[i].netWorth },
      create: { roomId, characterId: sorted[i].characterId, finalRank: i + 1, netWorth: sorted[i].netWorth }
    })
  }
}

module.exports = { processTurn, DILEMMAS }