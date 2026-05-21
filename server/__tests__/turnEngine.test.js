// __tests__/turnEngine.test.js
jest.mock('@prisma/client')

const { prismaMock } = require('@prisma/client')
const { processTurn } = require('../src/utils/turnEngine')

const makeCharacter = (overrides = {}) => ({
  id: 'char-1',
  name: 'Dudu',
  cash: 10000,
  housingCost: 1000,
  foodCost: 500,
  utilitiesCost: 200,
  transportCost: 150,
  overdraftDebt: 0,
  loanDebt: 0,
  isBankrupt: false,
  gift: null,
  ...overrides,
})

// Configura todos os mocks necessários para um turno feliz
// O turnEngine chama room.findUnique DUAS vezes se isLast=true (processTurn + buildLeaderboard)
function setupHappyPath({ turn = 1, isLast = false, character = makeCharacter() } = {}) {
  // processTurn — primeira chamada
  prismaMock.room.findUnique.mockResolvedValueOnce({
    id: 'room-1',
    currentTurn: turn,
    maxTurns: 12,
    status: 'active',
    characters: [character],
  })

  // generateAssetPrices — sem ativos pra simplificar
  prismaMock.marketAsset.findMany.mockResolvedValue([])

  // applyFixedCosts
  prismaMock.character.update.mockResolvedValue({ ...character, cash: 8150 })

  // applyFixedIncomeReturns
  prismaMock.fixedIncomeInvestment.findMany.mockResolvedValue([])

  // applyEvent
  prismaMock.characterEventLog.create.mockResolvedValue({})

  // checkDebentures
  prismaMock.debentureInvestment.findMany.mockResolvedValue([])

  // saveSnapshot — character.findUnique (inclui fixedInvestments, positions, debentures)
  prismaMock.character.findUnique.mockResolvedValue({
    ...character,
    cash: 8150,
    overdraftDebt: 0,
    loanDebt: 0,
    fixedInvestments: [],
    positions: [],
    debentures: [],
  })
  prismaMock.financialSnapshot.upsert.mockResolvedValue({})

  // room.update final
  prismaMock.room.update.mockResolvedValue({
    currentTurn: turn + 1,
    status: isLast ? 'finished' : 'active',
  })

  if (isLast) {
    // buildLeaderboard — segunda chamada de room.findUnique
    prismaMock.room.findUnique.mockResolvedValueOnce({
      id: 'room-1',
      characters: [{ id: character.id, snapshots: [{ netWorth: 8150 }] }],
    })
    prismaMock.leaderboard.upsert.mockResolvedValue({})
  }
}

beforeEach(() => jest.clearAllMocks())

// ─── processTurn ──────────────────────────────────────────────────────────────

describe('processTurn', () => {
  it('avança o turno e retorna resultado correto', async () => {
    setupHappyPath({ turn: 1 })

    const result = await processTurn('room-1')

    expect(result.turn).toBe(2)
    expect(result.isFinished).toBe(false)
    expect(result.results).toHaveLength(1)
    expect(result.results[0].characterName).toBe('Dudu')
    expect(result.results[0]).toHaveProperty('netWorth')
    expect(result.results[0]).toHaveProperty('event')
  })

  it('retorna isFinished true no turno 12', async () => {
    // turn=11 → nextTurn=12 → 12 >= maxTurns(12) → isFinished=true
    setupHappyPath({ turn: 11, isLast: true })

    const result = await processTurn('room-1')

    expect(result.isFinished).toBe(true)
    expect(result.turn).toBe(12)
  })

  it('retorna dilemma com título definido', async () => {
    setupHappyPath({ turn: 1 })

    const result = await processTurn('room-1')

    // turn=1 → nextTurn=2 → DILEMMAS[2] = Jantar com amigos
    expect(result.dilemma).not.toBeNull()
    expect(result.dilemma.title).toBe('Jantar com amigos')
  })

  it('lança erro se sala não encontrada', async () => {
    prismaMock.room.findUnique.mockResolvedValueOnce(null)
    prismaMock.marketAsset.findMany.mockResolvedValue([])

    await expect(processTurn('sala-inexistente')).rejects.toThrow('Sala inválida ou não ativa')
  })

  it('lança erro se sala não está ativa', async () => {
    prismaMock.room.findUnique.mockResolvedValueOnce({
      id: 'room-1',
      status: 'waiting',
      currentTurn: 1,
      maxTurns: 12,
      characters: [],
    })
    prismaMock.marketAsset.findMany.mockResolvedValue([])

    await expect(processTurn('room-1')).rejects.toThrow('Sala inválida ou não ativa')
  })

  it('processa múltiplos personagens', async () => {
    const chars = [
      makeCharacter({ id: 'char-1', name: 'Dudu' }),
      makeCharacter({ id: 'char-2', name: 'Maria' }),
    ]

    prismaMock.room.findUnique.mockResolvedValueOnce({
      id: 'room-1', currentTurn: 3, maxTurns: 12, status: 'active', characters: chars,
    })
    prismaMock.marketAsset.findMany.mockResolvedValue([])
    prismaMock.fixedIncomeInvestment.findMany.mockResolvedValue([])
    prismaMock.debentureInvestment.findMany.mockResolvedValue([])
    prismaMock.characterEventLog.create.mockResolvedValue({})
    prismaMock.character.update.mockResolvedValue({})
    prismaMock.character.findUnique
      .mockResolvedValueOnce({ ...chars[0], cash: 8000, overdraftDebt: 0, loanDebt: 0, fixedInvestments: [], positions: [], debentures: [] })
      .mockResolvedValueOnce({ ...chars[1], cash: 9000, overdraftDebt: 0, loanDebt: 0, fixedInvestments: [], positions: [], debentures: [] })
    prismaMock.financialSnapshot.upsert.mockResolvedValue({})
    prismaMock.room.update.mockResolvedValue({ currentTurn: 4, status: 'active' })

    const result = await processTurn('room-1')

    expect(result.results).toHaveLength(2)
    expect(result.results.map(r => r.characterName)).toEqual(['Dudu', 'Maria'])
  })
})

// ─── applyFixedCosts ──────────────────────────────────────────────────────────

describe('custos fixos', () => {
  it('personagem com caixa suficiente — character.update é chamado', async () => {
    setupHappyPath({ turn: 1 })

    await processTurn('room-1')

    expect(prismaMock.character.update).toHaveBeenCalled()
  })

  it('personagem com caixa insuficiente entra em cheque especial', async () => {
    // cash=100, custos totais=1850 → fica negativo → isBankrupt=true
    const brokeChar = makeCharacter({ cash: 100 })

    prismaMock.room.findUnique.mockResolvedValueOnce({
      id: 'room-1', currentTurn: 1, maxTurns: 12, status: 'active', characters: [brokeChar],
    })
    prismaMock.marketAsset.findMany.mockResolvedValue([])
    prismaMock.fixedIncomeInvestment.findMany.mockResolvedValue([])
    prismaMock.debentureInvestment.findMany.mockResolvedValue([])
    prismaMock.characterEventLog.create.mockResolvedValue({})
    prismaMock.character.update.mockResolvedValue({})
    prismaMock.character.findUnique.mockResolvedValue({
      ...brokeChar, cash: 0, overdraftDebt: 208.2, isBankrupt: true,
      fixedInvestments: [], positions: [], debentures: [],
    })
    prismaMock.financialSnapshot.upsert.mockResolvedValue({})
    prismaMock.room.update.mockResolvedValue({ currentTurn: 2, status: 'active' })

    await processTurn('room-1')

    // O update com isBankrupt=true deve ter sido chamado
    const bankruptCall = prismaMock.character.update.mock.calls.find(
      ([args]) => args?.data?.isBankrupt === true
    )
    expect(bankruptCall).toBeDefined()
  })
})

// ─── applyFixedIncomeReturns ───────────────────────────────────────────────────

describe('rendimentos de renda fixa', () => {
  it('atualiza amount do investimento com o rendimento mensal', async () => {
    prismaMock.room.findUnique.mockResolvedValueOnce({
      id: 'room-1', currentTurn: 2, maxTurns: 12, status: 'active',
      characters: [makeCharacter()],
    })
    prismaMock.marketAsset.findMany.mockResolvedValue([])
    prismaMock.fixedIncomeInvestment.findMany.mockResolvedValue([
      { id: 'fi-1', amount: 10000, monthlyRate: 0.01 },
    ])
    prismaMock.fixedIncomeInvestment.update.mockResolvedValue({})
    prismaMock.debentureInvestment.findMany.mockResolvedValue([])
    prismaMock.characterEventLog.create.mockResolvedValue({})
    prismaMock.character.update.mockResolvedValue({})
    prismaMock.character.findUnique.mockResolvedValue({
      ...makeCharacter(), cash: 8150, overdraftDebt: 0, loanDebt: 0,
      fixedInvestments: [{ amount: 10100 }], positions: [], debentures: [],
    })
    prismaMock.financialSnapshot.upsert.mockResolvedValue({})
    prismaMock.room.update.mockResolvedValue({ currentTurn: 3, status: 'active' })

    await processTurn('room-1')

    // 10000 * 0.01 = 100
    expect(prismaMock.fixedIncomeInvestment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { amount: { increment: 100 } } })
    )
  })
})

// ─── buildLeaderboard ─────────────────────────────────────────────────────────

describe('buildLeaderboard', () => {
  it('chama leaderboard.upsert ao fim do jogo', async () => {
    setupHappyPath({ turn: 11, isLast: true })

    await processTurn('room-1')

    expect(prismaMock.leaderboard.upsert).toHaveBeenCalled()
  })

  it('não chama leaderboard.upsert antes do último turno', async () => {
    setupHappyPath({ turn: 5 })

    await processTurn('room-1')

    expect(prismaMock.leaderboard.upsert).not.toHaveBeenCalled()
  })
})

// ─── checkDebentures ──────────────────────────────────────────────────────────

describe('checkDebentures', () => {
  const setupWithDebenture = (debenture) => {
    prismaMock.room.findUnique.mockResolvedValueOnce({
      id: 'room-1', currentTurn: 5, maxTurns: 12, status: 'active',
      characters: [makeCharacter()],
    })
    prismaMock.marketAsset.findMany.mockResolvedValue([])
    prismaMock.fixedIncomeInvestment.findMany.mockResolvedValue([])
    prismaMock.debentureInvestment.findMany.mockResolvedValue([debenture])
    prismaMock.characterEventLog.create.mockResolvedValue({})
    prismaMock.character.update.mockResolvedValue({})
    prismaMock.debentureInvestment.update.mockResolvedValue({})
    prismaMock.$transaction.mockResolvedValue([])
    prismaMock.character.findUnique.mockResolvedValue({
      ...makeCharacter(), cash: 8150, overdraftDebt: 0, loanDebt: 0,
      fixedInvestments: [], positions: [], debentures: [],
    })
    prismaMock.financialSnapshot.upsert.mockResolvedValue({})
    prismaMock.room.update.mockResolvedValue({ currentTurn: 6, status: 'active' })
  }

  it('debênture com calote — atualiza status para defaulted e loga perda', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.01) // 0.01 < defaultProbability → calote

    setupWithDebenture({
      id: 'deb-1', amount: 5000, status: 'active', maturesAt: 6,
      investedAt: 3, annualRate: 0.12,
      company: { name: 'TechCorp', defaultProbability: 0.5 }
    })

    await processTurn('room-1')

    expect(prismaMock.debentureInvestment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'defaulted', returnedValue: 0 } })
    )
    expect(prismaMock.characterEventLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ cashImpact: -5000 }) })
    )

    jest.spyOn(Math, 'random').mockRestore()
  })

  it('debênture paga — credita valor com juros via $transaction', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99) // 0.99 > defaultProbability → paga

    setupWithDebenture({
      id: 'deb-1', amount: 5000, status: 'active', maturesAt: 6,
      investedAt: 3, annualRate: 0.12,
      company: { name: 'TechCorp', defaultProbability: 0.1 }
    })

    await processTurn('room-1')

    expect(prismaMock.$transaction).toHaveBeenCalled()
    expect(prismaMock.characterEventLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ cashImpact: expect.any(Number) })
      })
    )

    jest.spyOn(Math, 'random').mockRestore()
  })
})