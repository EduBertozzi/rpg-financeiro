// Contas do resumo de fim de ano, em funções puras (sem banco de dados).
const { cents, balanceSheet } = require('./finance')
const { installmentDebt } = require('./dilemmas')

// Último preço de cada ação: { [assetId]: price }. `prices` são linhas de
// AssetPrice da sala (só até o mês atual); vale a do mês mais recente.
function latestPrices(prices = []) {
  const latest = {}
  const turnOf = {}
  for (const p of prices) {
    if (turnOf[p.assetId] == null || p.turn > turnOf[p.assetId]) {
      turnOf[p.assetId] = p.turn
      latest[p.assetId] = Number(p.price)
    }
  }
  return latest
}

// Valor das ações de um personagem: quantidade × último preço da sala (ou o
// preço base do ativo, se a sala ainda não tem cotação).
function stocksValueOf(positions = [], priceMap = {}) {
  return cents(positions.reduce((sum, pos) => {
    const price = priceMap[pos.assetId] ?? Number(pos.asset?.basePrice ?? pos.avgPrice ?? 0)
    return sum + price * Number(pos.quantity)
  }, 0))
}

// Patrimônio atual: { cash, fixedIncome, debentures, stocks, debts, netWorth }.
// `cash` é só o saldo positivo; saldo negativo entra em `debts` (junto com
// cheque especial antigo e empréstimo), como no balanceSheet. Assim
// cash + fixedIncome + debentures + stocks - debts = netWorth.
// Considera só as caixinhas abertas e as debêntures ativas.
function breakdownOf(character, priceMap = {}) {
  const fixedIncome = cents((character.fixedInvestments ?? [])
    .filter((inv) => inv.redeemedAt == null)
    .reduce((sum, inv) => sum + Number(inv.amount), 0))
  const debentures = cents((character.debentures ?? [])
    .filter((d) => (d.status ?? 'active') === 'active')
    .reduce((sum, d) => sum + Number(d.amount), 0))
  const stocks = stocksValueOf(character.positions ?? [], priceMap)
  const { totalDebts, netWorth } = balanceSheet({
    cash: character.cash, fixedIncome, debentures, stocks,
    overdraftDebt: character.overdraftDebt ?? 0, loanDebt: character.loanDebt ?? 0,
    installmentDebt: installmentDebt(character.effects ?? []),
  })
  return { cash: cents(Math.max(Number(character.cash), 0)), fixedIncome, debentures, stocks, debts: totalDebts, netWorth }
}

// Patrimônio mês a mês de um personagem: [{ turn, netWorth }] em ordem de mês.
const monthsOf = (snapshots = []) =>
  [...snapshots]
    .sort((a, b) => a.turn - b.turn)
    .map((s) => ({ turn: s.turn, netWorth: cents(Number(s.netWorth)) }))

// Média da sala mês a mês: para cada mês, a média de quem tem foto daquele mês
// (quem entrou depois ou não tem o mês simplesmente não entra na média).
// `snapshotLists` é uma lista de listas de snapshots (uma por personagem).
function roomAverageOf(snapshotLists = []) {
  const sums = new Map()
  for (const snapshots of snapshotLists) {
    for (const s of snapshots ?? []) {
      const acc = sums.get(s.turn) ?? { total: 0, count: 0 }
      acc.total += Number(s.netWorth)
      acc.count += 1
      sums.set(s.turn, acc)
    }
  }
  return [...sums.entries()]
    .sort(([a], [b]) => a - b)
    .map(([turn, { total, count }]) => ({ turn, netWorth: cents(total / count) }))
}

// Ranking da sala: maior patrimônio primeiro; empate fica com a mesma posição
// (1, 1, 3) e, na lista, em ordem de nome. Devolve { players, rank }.
// `players`: [{ characterId, name, avatarId, netWorth }].
function rankPlayers(players = [], selfId) {
  const sorted = [...players]
    .map((p) => ({ ...p, netWorth: cents(Number(p.netWorth)) }))
    .sort((a, b) =>
      b.netWorth - a.netWorth ||
      String(a.name).localeCompare(String(b.name), 'pt-BR') ||
      String(a.characterId).localeCompare(String(b.characterId)))
  const ranked = sorted.map((p) => ({
    characterId: p.characterId,
    name: p.name,
    avatarId: p.avatarId,
    netWorth: p.netWorth,
    rank: 1 + sorted.filter((o) => o.netWorth > p.netWorth).length,
    isSelf: p.characterId === selfId,
  }))
  const self = ranked.find((p) => p.isSelf)
  return { players: ranked, rank: self ? self.rank : null }
}

module.exports = { latestPrices, stocksValueOf, breakdownOf, monthsOf, roomAverageOf, rankPlayers }
