// Contas da tela de fim de ano: pódio, comparação com a sala e as decisões
// que mais pesaram no bolso. Funções puras (testes em yearRecap.test.js).

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100

// ─── pódio ────────────────────────────────────────────────────────────────

// Até 3 jogadores do topo, na ordem das colunas na tela (2º, 1º, 3º) e com a
// ordem de entrada: o 3º entra primeiro e o 1º por último.
// players chegam ordenados pelo ranking (como o servidor manda).
export function podiumSlots(players = []) {
  const top = players.slice(0, 3)
  const entered = top.map((p, i) => ({ player: p, place: p.rank ?? i + 1, enter: top.length - 1 - i }))
  const [first, second, third] = entered
  return [second, first, third].filter(Boolean)
}

// ─── você × sala ────────────────────────────────────────────────────────────

const brl0 = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

// Seu patrimônio final comparado com o 1º lugar e com a média da sala.
// mine = breakdown.netWorth; best = o 1º do ranking (se já houver);
// average = média da sala no último mês fechado.
export function roomComparison({ breakdown, players, roomAverage } = {}) {
  const mine = round2(breakdown?.netWorth)
  const leader = players?.[0] ?? null
  const self = players?.find((p) => p.isSelf) ?? null
  const isLeader = Boolean(leader && (leader.isSelf || (self && self.rank === leader.rank)))
  const best = leader ? round2(leader.netWorth) : null
  const lastAverage = roomAverage?.length ? roomAverage[roomAverage.length - 1] : null
  const average = lastAverage ? round2(lastAverage.netWorth) : null
  const toBest = best == null ? null : round2(best - mine)
  const vsAverage = average == null ? null : round2(mine - average)
  return {
    mine,
    best,
    bestName: leader?.name ?? null,
    isLeader,
    average,
    toBest,
    vsAverage,
    message: comparisonMessage({ isLeader, toBest, vsAverage, hasLeader: Boolean(leader) }),
  }
}

function comparisonMessage({ isLeader, toBest, vsAverage, hasLeader }) {
  if (isLeader) return 'Parabéns! Ninguém da sala cuidou tão bem do dinheiro quanto você.'
  if (vsAverage != null && vsAverage >= 0) {
    return hasLeader
      ? `Você ficou acima da média da sala. Faltaram ${brl0(toBest)} para chegar no topo.`
      : 'Você ficou acima da média da sala. Bom trabalho!'
  }
  if (vsAverage != null) return 'Você ficou abaixo da média desta vez. Olhe as decisões abaixo: dá para virar o jogo na próxima!'
  return 'Ano fechado! Veja abaixo as decisões que mais pesaram.'
}

// ─── decisões do ano ─────────────────────────────────────────────────────────

// Quanto uma escolha de dilema mexeu no bolso até o fim do ano:
// − o que saiu na hora + o que as consequências trouxeram (ou levaram)
// + o que ainda vai sair (parcelas depois de dezembro, que viram dívida).
export function decisionImpact(item) {
  const later = (item?.consequences ?? []).reduce(
    (sum, c) => sum + Number(c.amount || 0) + Number(c.pending || 0),
    0
  )
  return round2(later - Number(item?.amount || 0))
}

// A consequência com o maior valor (para explicar o número na tela).
function mainConsequence(item) {
  let main = null
  for (const c of item?.consequences ?? []) {
    const v = Math.abs(Number(c.amount || 0) + Number(c.pending || 0))
    if (v > 0 && (!main || v > main.v)) main = { v, c }
  }
  return main ? main.c.label.replace(/^[^:]+: /, '') : null
}

// A escolha que mais custou (só se custou algo e houver mais de uma escolha)
// e, entre as outras, as 3 que mais ajudaram (maior impacto; empate: a que
// trouxe algo de bom depois, depois a mais cedo).
export function pickDecisions(timeline = [], { best: bestCount = 3 } = {}) {
  const rows = timeline.map((t) => ({
    turn: t.turn,
    title: t.title,
    label: t.label,
    choice: t.choice,
    impact: decisionImpact(t),
    gained: (t.consequences ?? []).some((c) => Number(c.amount || 0) > 0),
    note: mainConsequence(t),
  }))
  const worst = rows.length > 1
    ? [...rows].filter((r) => r.impact < 0).sort((a, b) => a.impact - b.impact || a.turn - b.turn)[0] ?? null
    : null
  const best = rows
    .filter((r) => r !== worst)
    .sort((a, b) => b.impact - a.impact || Number(b.gained) - Number(a.gained) || a.turn - b.turn)
    .slice(0, bestCount)
  return { best, worst }
}
