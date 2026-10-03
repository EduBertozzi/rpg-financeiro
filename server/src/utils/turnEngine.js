const prisma = require('../lib/prisma')
const { monthlyReturn, debentureReturn, nextStockPrice, closeMonth, balanceSheet, cents, SALARY } = require('./finance')
const { perksOf, rentAmount, eventImpact, savingsBonus, percentLabel, billAmount } = require('./skills')
const { giftIncome, giftIncomeEntry, giftEventImpact } = require('./gifts')
const { eventsFor } = require('./events')
const { dilemmaFor, summarizeEffects, installmentDebt, resolveDilemma, inertiaOption } = require('./dilemmas')
const { leisureFor, leisurePrice } = require('./leisure')
const { BILLS, LATE_FEE, LATE_INTEREST, lateBillAmount, pendingForMonth } = require('./settle')

const brl = (n) => Number(n).toFixed(2)

// O que ficou em aberto no mês que está fechando (ver settle.js): conta não
// paga vira conta atrasada com multa e juros, lazer não escolhido é cobrado e
// dilema sem resposta é decidido pela inércia. Quem marcou "pronto" já
// resolveu tudo (o servidor confere), então só olha quem não marcou.
// O saldo é ajustado no `character` em memória: o applyFixedCosts grava.
async function settleMonth(character, turn, perks = perksOf()) {
  if (character.turnReady || turn < 1) return 0
  const [logs, choices] = await Promise.all([
    prisma.characterEventLog.findMany({ where: { characterId: character.id, turn } }),
    prisma.characterChoice.findMany({ where: { characterId: character.id } }),
  ])
  const pending = pendingForMonth({
    logs: logs ?? [], choices: choices ?? [], turn,
    hasLeisure: Boolean(leisureFor(turn)), hasDilemma: Boolean(dilemmaFor(turn)),
  })
  const log = (cashImpact, description) =>
    prisma.characterEventLog.create({ data: { characterId: character.id, turn, cashImpact, description } })
  let total = 0

  for (const type of pending.bills) {
    const { field, label } = BILLS[type]
    const base = billAmount(type, character[field], perks)
    const amount = lateBillAmount(base)
    total = cents(total - amount)
    await log(-amount, `Conta atrasada: ${label} — R$ ${brl(base)} + ${percentLabel(LATE_FEE)} de multa e ${percentLabel(LATE_INTEREST)} de juros (-R$ ${brl(amount)})`)
  }

  if (pending.leisure) {
    const price = leisurePrice(turn, perks)
    const option = leisureFor(turn).options[0]
    await prisma.characterChoice.create({ data: { characterId: character.id, turn, kind: 'leisure', option: 0, amount: price } })
    total = cents(total - price)
    await log(-price, `Lazer: ${option.title} (-R$ ${brl(price)}) — o mês fechou sem lazer escolhido`)
  }

  if (pending.dilemma) {
    const option = inertiaOption(turn)
    const answered = Object.fromEntries((choices ?? []).filter((c) => c.kind === 'dilemma').map((c) => [c.turn, c.option]))
    const outcome = resolveDilemma(turn, option, { perks, choices: answered, housingCost: character.housingCost })
    await prisma.characterChoice.create({ data: { characterId: character.id, turn, kind: 'dilemma', option, amount: outcome.cash ? -outcome.cash : 0 } })
    if (outcome.effects.length) {
      await prisma.scheduledEffect.createMany({ data: outcome.effects.map((e) => ({ characterId: character.id, sourceTurn: turn, ...e })) })
    }
    if (outcome.updates.housingCost) {
      await prisma.character.update({ where: { id: character.id }, data: outcome.updates })
      character.housingCost = outcome.updates.housingCost
    }
    total = cents(total + outcome.cash)
    await log(outcome.cash, `Dilema "${dilemmaFor(turn).title}" — Sem resposta: ${outcome.text}. ${outcome.result}`)
  }

  character.cash = cents(Number(character.cash) + total)
  return total
}

// Virada do mês na conta. Na ordem: juros do cheque especial sobre o saldo com
// que o mês fechou, salário do mês novo (com os bônus e as rendas extras das
// habilidades e do dom), consequências de dilemas marcadas para este mês
// (parcelas, devoluções, promoção, demissão) e aluguel.
// Na última virada (fechamento de dezembro) só entram os juros: não existe mês
// novo para receber salário nem pagar aluguel.
// foodCost, utilitiesCost e transportCost são pagos pelo jogador durante o mês
// (Mercadinho, Água e Luz, Internet e Celular — ver billController.js).
async function applyFixedCosts(character, turn, perks = perksOf(), { effects = [], final = false } = {}) {
  const fx = summarizeEffects(effects)
  const rent = final || fx.rentWaived ? 0 : rentAmount(character.housingCost, perks)
  const paidSalary = !final && !fx.skipSalary
  const salary = paidSalary ? cents(SALARY + perks.salaryBonus + fx.raise) : 0
  // renda fixa do dom (Desenrolado: freela de R$ 220) entra junto com o salário
  const extras = final ? 0 : cents(perks.extraIncome + giftIncome(character.gift))
  const income = cents(salary + extras)
  const giftExtra = final ? null : giftIncomeEntry(character.gift)
  const month = closeMonth(character.cash, rent, character.overdraftDebt, cents(income + fx.cash), perks.overdraftRate)

  await prisma.character.update({
    where: { id: character.id },
    data: { cash: month.closing, overdraftDebt: 0, isBankrupt: month.inOverdraft }
  })

  const log = (cashImpact, description) =>
    prisma.characterEventLog.create({ data: { characterId: character.id, turn, cashImpact, description } })

  if (month.interest > 0) {
    await log(-month.interest, `Cheque especial: Juros de ${percentLabel(perks.overdraftRate)} sobre R$ ${(-month.opening).toFixed(2)} (-R$ ${month.interest.toFixed(2)})`)
  }

  if (paidSalary) {
    await log(SALARY, `Salário: Depósito do mês (+R$ ${SALARY.toFixed(2)})`)
    // uma linha no extrato para cada bônus de salário das habilidades
    for (const bonus of perks.salaryBonuses) {
      await log(bonus.amount, `Bônus salarial: ${bonus.skill} (+R$ ${bonus.amount.toFixed(2)})`)
    }
  }
  if (!final) {
    for (const extra of perks.incomes) {
      await log(extra.amount, `${extra.label}: ${extra.skill} (+R$ ${extra.amount.toFixed(2)})`)
    }
  }
  if (giftExtra) {
    await log(giftExtra.amount, `${giftExtra.label}: ${giftExtra.skill} (+R$ ${giftExtra.amount.toFixed(2)})`)
  }

  // consequências dos dilemas, cada uma na sua linha
  for (const e of effects) {
    if (e.kind === 'salary_raise' && !paidSalary) continue
    const value = ['cash', 'installment', 'salary_raise'].includes(e.kind) ? Number(e.amount ?? 0) : 0
    const suffix = value ? ` (${value > 0 ? '+' : '-'}R$ ${Math.abs(value).toFixed(2)})` : ''
    await log(value, `${e.label}${suffix}`)
  }

  if (!final && !fx.rentWaived) {
    await log(-rent, `Aluguel: Casa — Pago (-R$ ${rent})${perks.rentDiscount ? ` com ${percentLabel(perks.rentDiscount)} de desconto` : ''}`)
  }

  return { totalCosts: rent + month.interest, interest: month.interest, salary: income, effectsCash: fx.cash, newCash: month.closing }
}

async function applyFixedIncomeReturns(character, turn) {
  const investments = await prisma.fixedIncomeInvestment.findMany({
    where: { characterId: character.id, redeemedAt: null }
  })

  let totalReturns = 0
  let balance = 0 // saldo das caixinhas depois do rendimento do mês
  for (const inv of investments) {
    const gain = monthlyReturn(inv.amount, inv.monthlyRate)
    totalReturns += gain
    balance += Number(inv.amount) + gain
    await prisma.fixedIncomeInvestment.update({
      where: { id: inv.id },
      data: { amount: { increment: gain } }
    })
  }

  return { totalReturns, balance }
}

// Bônus de Gestão sobre as caixinhas: calculado sobre o saldo delas depois do
// rendimento do mês e pago em dinheiro na conta (não entra no `amount` do
// investimento, para não bagunçar o principal e o IR do resgate).
async function applySavingsBonus(character, turn, balance, perks) {
  const bonus = savingsBonus(balance, perks)
  if (bonus <= 0) return 0

  await prisma.character.update({
    where: { id: character.id },
    data: { cash: { increment: bonus } }
  })
  await prisma.characterEventLog.create({
    data: {
      characterId: character.id,
      turn,
      cashImpact: bonus,
      description: `Gestão: Bônus de ${percentLabel(perks.savingsBonusRate)} sobre as caixinhas (+R$ ${bonus.toFixed(2)})`
    }
  })
  return bonus
}

// Imprevistos do calendário para a virada deste mês (ver events.js).
async function applyEvents(character, turn, perks = perksOf()) {
  const events = eventsFor(turn)
  let total = 0

  for (const event of events) {
    // imprevistos de casa custam menos com Resolução de Problemas
    let cashImpact = eventImpact(event, perks)
    const repaired = cashImpact !== event.cashImpact

    // dom Desenrolado recebe 50% a mais em eventos positivos (13º não conta)
    if (event.category !== 'salary') cashImpact = giftEventImpact(cashImpact, character.gift)

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
        description: `${event.title}: ${event.description}${repaired ? ` Você mesmo resolveu e pagou só ${percentLabel(1 - perks.repairDiscount)} do conserto.` : ''}`
      }
    })
    total = cents(total + cashImpact)
  }

  return { events, cashImpact: total }
}

async function generateAssetPrices(roomId, turn) {
  const assets = await prisma.marketAsset.findMany()

  for (const asset of assets) {
    const prev = await prisma.assetPrice.findUnique({
      where: { assetId_turn_roomId: { assetId: asset.id, turn: turn - 1, roomId } }
    })

    const basePrice = prev ? Number(prev.price) : Number(asset.basePrice)
    const price = nextStockPrice(basePrice, asset.riskLevel, asset.ticker, turn)

    await prisma.assetPrice.upsert({
      where: { assetId_turn_roomId: { assetId: asset.id, turn, roomId } },
      update: { price },
      create: { assetId: asset.id, turn, roomId, price }
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
      const rounded = debentureReturn(deb.amount, deb.annualRate, deb.maturesAt - deb.investedAt)

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
      debentures: { where: { status: 'active' } },
      effects: { where: { kind: 'installment', appliedAt: null } }
    }
  })

  const fixedIncome = fresh.fixedInvestments.reduce((sum, i) => sum + Number(i.amount), 0)
  const debentures = fresh.debentures.reduce((sum, d) => sum + Number(d.amount), 0)
  const { totalAssets, totalDebts, netWorth } = balanceSheet({
    cash: fresh.cash, fixedIncome, debentures, overdraftDebt: fresh.overdraftDebt, loanDebt: fresh.loanDebt,
    installmentDebt: installmentDebt(fresh.effects ?? []),
  })

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
    include: { characters: { include: { unlockedSkills: { include: { skillNode: true } } } } }
  })

  if (!room || room.status !== 'active') throw new Error('Sala inválida ou não ativa')

  // a partida acaba no fechamento do último mês (dezembro, com maxTurns = 12)
  const final = room.currentTurn >= room.maxTurns
  const nextTurn = room.currentTurn + 1
  const results = []

  await generateAssetPrices(roomId, nextTurn)

  for (const character of room.characters) {
    const perks = perksOf(character.unlockedSkills)
    // o que ficou em aberto no mês que fecha
    const settled = await settleMonth(character, room.currentTurn, perks)
    // consequências de dilemas marcadas para esta virada (na última, as
    // parcelas que sobram ficam como dívida)
    const effects = final
      ? []
      : (await prisma.scheduledEffect.findMany({ where: { characterId: character.id, turn: nextTurn, appliedAt: null } })) ?? []
    const costs = await applyFixedCosts(character, nextTurn, perks, { effects, final })
    if (effects.length) {
      await prisma.scheduledEffect.updateMany({
        where: { id: { in: effects.map((e) => e.id) } },
        data: { appliedAt: new Date() }
      })
    }
    const { totalReturns: returns, balance } = await applyFixedIncomeReturns(character, nextTurn)
    const bonus = await applySavingsBonus(character, nextTurn, balance, perks)
    const eventResult = final ? { events: [], cashImpact: 0 } : await applyEvents(character, nextTurn, perks)
    await checkDebentures(character, nextTurn)
    const snapshot = await saveSnapshot(character, nextTurn)

    results.push({
      characterId: character.id,
      characterName: character.name,
      cashDelta: cents(settled + costs.salary - costs.totalCosts + costs.effectsCash + returns + bonus + eventResult.cashImpact),
      event: eventResult.events[0] ?? null,
      events: eventResult.events,
      netWorth: snapshot.netWorth
    })
  }

  const isFinished = final

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

  // o cliente abre o dilema do mês novo assim que o mês vira
  const next = isFinished ? null : dilemmaFor(nextTurn)
  const dilemma = next ? { turn: nextTurn, title: next.title } : null

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

module.exports = { processTurn, settleMonth }