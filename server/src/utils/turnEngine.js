const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

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
  {     // turno 1
    title: 'Reserva ou Investimento?',
    description: 'Você acabou de receber seu primeiro salário. Ainda não tem reserva de emergência, mas uma aplicação em renda variável está rendendo muito bem esse mês.',
    options: [
      { label: 'A', text: 'Guarda R$ 3.000 em renda fixa como reserva de emergência.', effectType: 'immediate_cash', effectValue: 0, probability: 1.0 },
      { label: 'B', text: 'Aplica R$ 3.000 em renda variável buscando mais retorno.', effectType: 'immediate_cash', effectValue: 300, probability: 0.5 },
    ]
  },
  {     // turno 2
    title: 'Cartão de Crédito',
    description: 'Seu cartão de crédito tem limite de R$ 5.000. Um amigo te convida para uma viagem que custa exatamente esse valor. Você não tem esse dinheiro em caixa agora.',
    options: [
      { label: 'A', text: 'Recusa a viagem e mantém o cartão quitado.', effectType: 'none', effectValue: 0, probability: 1.0 },
      { label: 'B', text: 'Vai na viagem e parcela no cartão (juros de 12% ao mês).', effectType: 'immediate_cash', effectValue: -600, probability: 1.0 },
    ]
  },
  {     // turno 3
    title: 'Proposta de Emprego',
    description: 'Uma empresa concorrente te oferece um salário 30% maior, mas você teria que abrir mão do seu plano de saúde atual e pagar do próprio bolso.',
    options: [
      { label: 'A', text: 'Aceita a proposta (+R$ 2.100/mês, mas +R$ 800/mês de plano de saúde).', effectType: 'income_change', effectValue: 1300, probability: 1.0 },
      { label: 'B', text: 'Recusa e mantém a estabilidade atual.', effectType: 'none', effectValue: 0, probability: 1.0 },
    ]
  },
  {     // turno 4
    title: 'O Amigo Caloteiro',
    description: 'Um amigo está desesperado e pede R$ 1.000 emprestados para pagar o aluguel, prometendo devolver com juros em 3 meses.',
    options: [
      { label: 'A', text: 'Empresta a grana.', effectType: 'loan_friend', effectValue: -1000, probability: 0.5 },
      { label: 'B', text: 'Declina educadamente.', effectType: 'none', effectValue: 0, probability: 1.0 },
    ]
  },
  {     // turno 5
    title: 'Carro Próprio',
    description: 'Você está cansado de transporte público. Pode financiar um carro em 48x de R$ 900, mas isso vai comprometer parte do seu orçamento mensal.',
    options: [
      { label: 'A', text: 'Financia o carro (-R$ 900/mês por 4 meses restantes do jogo).', effectType: 'immediate_cash', effectValue: -3600, probability: 1.0 },
      { label: 'B', text: 'Continua no transporte público e investe a diferença.', effectType: 'none', effectValue: 0, probability: 1.0 },
    ]
  },
  {     // turno 6
    title: 'Previdência Privada',
    description: 'Um gerente de banco te oferece um plano de previdência privada com taxa de administração de 3% ao ano. Você poderia aplicar o mesmo valor em renda fixa com taxa menor.',
    options: [
      { label: 'A', text: 'Contrata o plano de previdência (-R$ 500/mês, retorno de longo prazo).', effectType: 'immediate_cash', effectValue: 200, probability: 1.0 },
      { label: 'B', text: 'Aplica em renda fixa por conta própria com taxa menor.', effectType: 'immediate_cash', effectValue: 350, probability: 1.0 },
    ]
  },
  {     // turno 7
    title: 'Upgrade de Vida',
    description: 'Você recebeu um aumento e sente que merece um apartamento melhor. O novo aluguel custaria R$ 800 a mais por mês.',
    options: [
      { label: 'A', text: 'Muda para o apartamento melhor (+R$ 800/mês de custo fixo).', effectType: 'cost_change', effectValue: 800, probability: 1.0 },
      { label: 'B', text: 'Mantém o atual e investe a diferença.', effectType: 'none', effectValue: 0, probability: 1.0 },
    ]
  },
  {     // turno 8
    title: 'Dica Quente na Bolsa',
    description: 'Um colega de trabalho diz ter uma informação privilegiada sobre uma ação que vai disparar. Ele sugere que você invista R$ 3.000 agora.',
    options: [
      { label: 'A', text: 'Investe R$ 3.000 na dica do colega.', effectType: 'immediate_cash', effectValue: 3000, probability: 0.3 },
      { label: 'B', text: 'Ignora a dica e mantém sua estratégia.', effectType: 'none', effectValue: 0, probability: 1.0 },
    ]
  },
  {     // turno 9
    title: 'Herança',
    description: 'Você recebeu uma herança do seu tio. Para recebê-la, precisa pagar o inventário que custa R$ 2.000.',
    options: [
      { label: 'A', text: 'Paga o inventário e recebe R$ 8.000 líquidos.', effectType: 'inheritance', effectValue: 6000, probability: 1.0 },
      { label: 'B', text: 'Abre mão da herança para não ter trabalho.', effectType: 'none', effectValue: 0, probability: 1.0 },
    ]
  },
  {     // turno 10
    title: 'Consórcio',
    description: 'Você foi contemplado em um consórcio imobiliário. Pode usar a carta de crédito agora ou vender para outra pessoa com ágio de R$ 4.000.',
    options: [
      { label: 'A', text: 'Usa a carta de crédito para comprar um imóvel.', effectType: 'none', effectValue: 0, probability: 1.0 },
      { label: 'B', text: 'Vende a carta com ágio e embolsa R$ 4.000.', effectType: 'immediate_cash', effectValue: 4000, probability: 1.0 },
    ]
  },
  {     // turno 11
    title: 'Declaração do IR',
    description: 'Você percebeu que pode deduzir gastos com saúde e educação no IR, mas precisa organizar os comprovantes agora.',
    options: [
      { label: 'A', text: 'Organiza tudo e declara corretamente — recebe restituição de R$ 1.200.', effectType: 'immediate_cash', effectValue: 1200, probability: 1.0 },
      { label: 'B', text: 'Declara sem as deduções para economizar tempo.', effectType: 'none', effectValue: 0, probability: 1.0 },
    ]
  },
  {     // turno 12
    title: 'Resgate Final',
    description: 'Último mês! Você pode resgatar todos os seus investimentos agora ou manter aplicado até o fim do ciclo para maximizar o rendimento.',
    options: [
      { label: 'A', text: 'Resgata tudo e garante o valor atual.', effectType: 'none', effectValue: 0, probability: 1.0 },
      { label: 'B', text: 'Mantém aplicado até o último momento.', effectType: 'immediate_cash', effectValue: 500, probability: 0.7 },
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
    const change = (Math.random() * 2 - 1) * volatility
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