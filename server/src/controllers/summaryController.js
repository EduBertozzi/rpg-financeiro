// Resumo de fim de ano: patrimônio mês a mês (o seu e a média da sala), como
// está o patrimônio agora, o ranking da sala e as conquistas.
const prisma = require('../lib/prisma')
const { evaluateBadges, monthlyBillsOf } = require('../utils/badges')
const { latestPrices, breakdownOf, monthsOf, roomAverageOf, rankPlayers } = require('../utils/yearSummary')

const byTurn = { orderBy: { turn: 'asc' } }

exports.getYearSummary = async (req, res) => {
  try {
    const character = await prisma.character.findUnique({
      where: { id: req.params.id },
      include: {
        room: true,
        snapshots: byTurn,
        eventLog: true,
        fixedInvestments: true, // inclusive as resgatadas (conquista Investidor)
        debentures: true,
        positions: { include: { asset: true } },
        trades: { take: 1 },
        unlockedSkills: true,
        coupons: true,
      },
    })
    if (!character) return res.status(404).json({ error: 'Personagem não encontrado' })
    if (character.userId !== req.user.id) return res.status(403).json({ error: 'Sem permissão' })

    const currentTurn = character.room?.currentTurn ?? 0

    const [roomCharacters, prices] = await Promise.all([
      prisma.character.findMany({
        where: { roomId: character.roomId },
        include: {
          snapshots: byTurn,
          fixedInvestments: { where: { redeemedAt: null } },
          debentures: { where: { status: 'active' } },
          positions: { include: { asset: true } },
        },
      }),
      prisma.assetPrice.findMany({ where: { roomId: character.roomId, turn: { lte: currentTurn } } }),
    ])
    const priceMap = latestPrices(prices ?? [])

    // o próprio personagem sempre entra, mesmo se a lista da sala vier sem ele
    const everyone = (roomCharacters ?? []).some((c) => c.id === character.id)
      ? roomCharacters
      : [...(roomCharacters ?? []), character]

    const { players, rank } = rankPlayers(
      everyone.map((c) => ({
        characterId: c.id,
        name: c.name,
        avatarId: c.avatarId,
        netWorth: breakdownOf(c, priceMap).netWorth,
      })),
      character.id
    )

    res.json({
      months: monthsOf(character.snapshots ?? []),
      roomAverage: roomAverageOf(everyone.map((c) => c.snapshots ?? [])),
      breakdown: breakdownOf(character, priceMap),
      players,
      rank,
      badges: evaluateBadges({
        snapshots: character.snapshots ?? [],
        eventLog: character.eventLog ?? [],
        cash: character.cash,
        fixedInvestments: character.fixedInvestments ?? [],
        monthlyBills: monthlyBillsOf(character),
        coupons: character.coupons ?? [],
        unlockedSkills: character.unlockedSkills ?? [],
        debentures: character.debentures ?? [],
        positions: character.positions ?? [],
        trades: character.trades ?? [],
        currentTurn,
      }),
    })
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message })
  }
}
