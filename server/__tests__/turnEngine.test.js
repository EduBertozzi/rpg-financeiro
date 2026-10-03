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

  it('registra o aluguel descontado no eventLog', async () => {
    setupHappyPath({ turn: 1, character: makeCharacter({ housingCost: 1000 }) })

    await processTurn('room-1')

    expect(prismaMock.characterEventLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          turn: 2,
          cashImpact: -1000,
          description: expect.stringContaining('Aluguel: Casa'),
        }),
      })
    )
  })

  // Configura um turno de um personagem só, devolvendo o personagem fresco para o snapshot.
  function setupOne(character, fresh = {}) {
    prismaMock.room.findUnique.mockResolvedValueOnce({
      id: 'room-1', currentTurn: 1, maxTurns: 12, status: 'active', characters: [character],
    })
    prismaMock.marketAsset.findMany.mockResolvedValue([])
    prismaMock.fixedIncomeInvestment.findMany.mockResolvedValue([])
    prismaMock.debentureInvestment.findMany.mockResolvedValue([])
    prismaMock.characterEventLog.create.mockResolvedValue({})
    prismaMock.character.update.mockResolvedValue({})
    prismaMock.character.findUnique.mockResolvedValue({
      ...character, fixedInvestments: [], positions: [], debentures: [], ...fresh,
    })
    prismaMock.financialSnapshot.upsert.mockResolvedValue({})
    prismaMock.room.update.mockResolvedValue({ currentTurn: 2, status: 'active' })
  }

  const costsUpdate = () => prismaMock.character.update.mock.calls.find(([args]) => 'isBankrupt' in (args?.data ?? {}))[0]
  const logs = () => prismaMock.characterEventLog.create.mock.calls.map(([args]) => args.data)

  it('caixa + salário que não cobrem o aluguel ficam negativos com o valor inteiro', async () => {
    setupOne(makeCharacter({ cash: 100, housingCost: 8000 })) // 100 + 7000 - 8000
    await processTurn('room-1')

    expect(costsUpdate().data).toEqual({ cash: -900, overdraftDebt: 0, isBankrupt: true })
  })

  it('saldo negativo paga 8% de juros e registra no extrato', async () => {
    setupOne(makeCharacter({ cash: -1000, housingCost: 1000 }))
    await processTurn('room-1')

    expect(costsUpdate().data.cash).toBe(4920) // -1000 - 80 juros + 7000 salário - 1000 aluguel
    expect(logs()).toContainEqual(expect.objectContaining({
      turn: 2, cashImpact: -80, description: expect.stringContaining('Cheque especial: Juros de 8%'),
    }))
  })

  it('sem saldo negativo não há lançamento de juros', async () => {
    setupOne(makeCharacter({ cash: 5000 }))
    await processTurn('room-1')

    expect(logs().some((l) => l.description.startsWith('Cheque especial'))).toBe(false)
    expect(costsUpdate().data).toEqual({ cash: 11000, overdraftDebt: 0, isBankrupt: false })
  })

  it('dívida antiga (overdraftDebt) volta para o saldo e é zerada', async () => {
    setupOne(makeCharacter({ cash: 2000, overdraftDebt: 500, housingCost: 1000 }))
    await processTurn('room-1')

    expect(costsUpdate().data).toEqual({ cash: 7500, overdraftDebt: 0, isBankrupt: false })
  })

  it('o salário de R$ 7.000 entra todo mês e aparece no extrato', async () => {
    setupOne(makeCharacter({ cash: 0, housingCost: 1500 }))
    await processTurn('room-1')

    expect(costsUpdate().data.cash).toBe(5500)
    expect(logs()).toContainEqual(expect.objectContaining({
      turn: 2, cashImpact: 7000, description: expect.stringContaining('Salário'),
    }))
  })

  it('o salário abate o cheque especial antes de sobrar saldo', async () => {
    setupOne(makeCharacter({ cash: -3000, housingCost: 1500 }))
    await processTurn('room-1')

    // -3000 - 240 juros + 7000 - 1500 = 2260: sai do cheque especial
    expect(costsUpdate().data).toEqual({ cash: 2260, overdraftDebt: 0, isBankrupt: false })
  })

  it('dívida maior que o salário continua no cheque especial', async () => {
    setupOne(makeCharacter({ cash: -10000, housingCost: 1500 }))
    await processTurn('room-1')

    expect(costsUpdate().data).toEqual({ cash: -5300, overdraftDebt: 0, isBankrupt: true })
  })

  it('o snapshot conta o saldo negativo como dívida', async () => {
    setupOne(makeCharacter({ cash: 100 }), {
      cash: -900, overdraftDebt: 0, loanDebt: 0, fixedInvestments: [{ amount: 3000 }],
    })
    await processTurn('room-1')

    expect(prismaMock.financialSnapshot.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ cash: -900, totalAssets: 3000, totalDebts: 900, netWorth: 2100 }),
    }))
  })

  it('o resultado do mês inclui os juros no custo', async () => {
    setupOne(makeCharacter({ cash: -1000, housingCost: 1000 }))
    const { results } = await processTurn('room-1')

    // salário 7000 - 1000 aluguel - 80 juros; evento é aleatório
    const event = logs().find((l) => !/^(Aluguel|Cheque|Salário)/.test(l.description))
    expect(results[0].cashDelta).toBeCloseTo(7000 - 1080 + event.cashImpact, 2)
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
// ─── vantagens da Árvore de Habilidades ───────────────────────────────────────

describe('habilidades na virada do mês', () => {
  const { EVENTS } = require('../src/utils/turnEngine')
  const skill = (path, level) => ({ skillNode: { path, level, name: `${path}-${level}` } })
  const all = (path) => [1, 2, 3, 4].map((level) => skill(path, level))

  // índice do evento → valor de Math.random que o sorteia
  const randomFor = (index) => (index + 0.5) / EVENTS.length
  const QUIET = EVENTS.findIndex((e) => e.category === 'none')
  const pickEvent = (title) => jest.spyOn(Math, 'random').mockReturnValue(randomFor(EVENTS.findIndex((e) => e.title === title)))

  function setup(character, { investments = [] } = {}) {
    prismaMock.room.findUnique.mockResolvedValueOnce({
      id: 'room-1', currentTurn: 1, maxTurns: 12, status: 'active', characters: [character],
    })
    prismaMock.marketAsset.findMany.mockResolvedValue([])
    prismaMock.fixedIncomeInvestment.findMany.mockResolvedValue(investments)
    prismaMock.fixedIncomeInvestment.update.mockResolvedValue({})
    prismaMock.debentureInvestment.findMany.mockResolvedValue([])
    prismaMock.characterEventLog.create.mockResolvedValue({})
    prismaMock.character.update.mockResolvedValue({})
    prismaMock.character.findUnique.mockResolvedValue({
      ...character, fixedInvestments: [], positions: [], debentures: [],
    })
    prismaMock.financialSnapshot.upsert.mockResolvedValue({})
    prismaMock.room.update.mockResolvedValue({ currentTurn: 2, status: 'active' })
  }

  const costsUpdate = () => prismaMock.character.update.mock.calls.find(([args]) => 'isBankrupt' in (args?.data ?? {}))[0].data
  const logs = () => prismaMock.characterEventLog.create.mock.calls.map(([args]) => args.data)
  const logStarting = (prefix) => logs().filter((l) => l.description.startsWith(prefix))
  const cashIncrements = () => prismaMock.character.update.mock.calls
    .map(([args]) => args.data.cash)
    .filter((c) => c && typeof c === 'object' && 'increment' in c)
    .map((c) => c.increment)

  beforeEach(() => jest.spyOn(Math, 'random').mockReturnValue(randomFor(QUIET)))
  afterEach(() => Math.random.mockRestore())

  it('os dois imprevistos de casa estão marcados como conserto', () => {
    expect(EVENTS.filter((e) => e.repair).map((e) => e.title)).toEqual(['Resistência Queimada', 'Infiltração Grave'])
  })

  it('a carga inclui as habilidades desbloqueadas de cada personagem', async () => {
    setup(makeCharacter({ unlockedSkills: [] }))
    await processTurn('room-1')

    expect(prismaMock.room.findUnique).toHaveBeenCalledWith({
      where: { id: 'room-1' },
      include: { characters: { include: { unlockedSkills: { include: { skillNode: true } } } } },
    })
  })

  it('sem habilidades o mês fica igual: só salário de R$ 7.000 e aluguel cheio', async () => {
    setup(makeCharacter({ cash: 0, housingCost: 1000, unlockedSkills: [] }))
    await processTurn('room-1')

    expect(costsUpdate().cash).toBe(6000)
    expect(logs().map((l) => l.description.split(':')[0])).toEqual(['Salário', 'Aluguel', 'Nenhum imprevisto'])
  })

  it('personagem sem o campo unlockedSkills é tratado como sem habilidades', async () => {
    const character = makeCharacter({ cash: 0, housingCost: 1000 })
    delete character.unlockedSkills
    setup(character)
    await processTurn('room-1')

    expect(costsUpdate().cash).toBe(6000)
  })

  // ─── Técnico ────────────────────────────────────────────────────────────────

  it('Fundamentos e Lógica: +R$ 150 de freela no saldo e no extrato', async () => {
    setup(makeCharacter({ cash: 0, housingCost: 1000, unlockedSkills: [skill('technical', 1)] }))
    await processTurn('room-1')

    expect(costsUpdate().cash).toBe(6150)
    expect(logStarting('Freela')).toEqual([
      expect.objectContaining({ turn: 2, cashImpact: 150, description: 'Freela: Fundamentos e Lógica (+R$ 150.00)' }),
    ])
  })

  it('Pensamento Analítico Avançado: salário +R$ 300 numa linha à parte', async () => {
    setup(makeCharacter({ cash: 0, housingCost: 1000, unlockedSkills: [skill('technical', 1), skill('technical', 2), skill('technical', 3)] }))
    await processTurn('room-1')

    expect(costsUpdate().cash).toBe(6450) // 7000 + 300 + 150 - 1000
    expect(logStarting('Salário')).toEqual([expect.objectContaining({ cashImpact: 7000 })])
    expect(logStarting('Bônus salarial')).toEqual([
      expect.objectContaining({ cashImpact: 300, description: 'Bônus salarial: Pensamento Analítico Avançado (+R$ 300.00)' }),
    ])
  })

  it('Inovação e Otimização: +R$ 400 de projeto paralelo além do freela', async () => {
    setup(makeCharacter({ cash: 0, housingCost: 1000, unlockedSkills: all('technical') }))
    await processTurn('room-1')

    expect(costsUpdate().cash).toBe(6850) // 7000 + 300 + 150 + 400 - 1000
    expect(logStarting('Projeto paralelo')).toEqual([
      expect.objectContaining({ cashImpact: 400, description: 'Projeto paralelo: Inovação e Otimização (+R$ 400.00)' }),
    ])
    expect(logStarting('Freela')).toHaveLength(1)
  })

  it('o resultado do mês soma salário, bônus e rendas extras', async () => {
    setup(makeCharacter({ cash: 0, housingCost: 1000, unlockedSkills: all('technical') }))
    const { results } = await processTurn('room-1')

    expect(results[0].cashDelta).toBe(7000 + 300 + 150 + 400 - 1000)
  })

  it('Resolução de Problemas: Resistência Queimada custa R$ 100', async () => {
    pickEvent('Resistência Queimada')
    setup(makeCharacter({ unlockedSkills: [skill('technical', 1), skill('technical', 2)] }))
    await processTurn('room-1')

    expect(cashIncrements()).toContain(-100)
    expect(logStarting('Resistência Queimada')).toEqual([expect.objectContaining({ cashImpact: -100 })])
    expect(logStarting('Resistência Queimada')[0].description).toContain('50%')
  })

  it('Resolução de Problemas: Infiltração Grave custa R$ 1.750', async () => {
    pickEvent('Infiltração Grave')
    setup(makeCharacter({ unlockedSkills: [skill('technical', 2)] }))
    const { results } = await processTurn('room-1')

    expect(cashIncrements()).toContain(-1750)
    expect(logStarting('Infiltração Grave')).toEqual([expect.objectContaining({ cashImpact: -1750 })])
    expect(results[0].cashDelta).toBe(7000 - 1000 - 1750)
  })

  it('sem Resolução de Problemas a Infiltração Grave custa R$ 3.500', async () => {
    pickEvent('Infiltração Grave')
    setup(makeCharacter({ unlockedSkills: [skill('technical', 1)] }))
    await processTurn('room-1')

    expect(cashIncrements()).toContain(-3500)
    expect(logStarting('Infiltração Grave')[0].description).toBe('Infiltração Grave: Um cano estourou na parede.')
  })

  it('Resolução de Problemas não barateia outros imprevistos', async () => {
    pickEvent('Emergência Veterinária')
    setup(makeCharacter({ unlockedSkills: [skill('technical', 2)] }))
    await processTurn('room-1')

    expect(cashIncrements()).toContain(-600)
  })

  // ─── Comunicação ────────────────────────────────────────────────────────────

  it('Negociação e Liderança: aluguel 20% mais barato no saldo e no extrato', async () => {
    setup(makeCharacter({ cash: 0, housingCost: 1500, unlockedSkills: [skill('communication', 3)] }))
    await processTurn('room-1')

    expect(costsUpdate().cash).toBe(5800) // 7000 - 1200
    expect(logStarting('Aluguel')).toEqual([
      expect.objectContaining({ cashImpact: -1200, description: 'Aluguel: Casa — Pago (-R$ 1200) com 20% de desconto' }),
    ])
  })

  it('aluguel quebrado é arredondado em centavos', async () => {
    setup(makeCharacter({ cash: 0, housingCost: '1234.56', unlockedSkills: [skill('communication', 3)] }))
    await processTurn('room-1')

    expect(costsUpdate().cash).toBe(6012.35) // 7000 - 987.65
    expect(logStarting('Aluguel')[0].cashImpact).toBe(-987.65)
  })

  it('Liderança Estratégica: salário +R$ 400', async () => {
    setup(makeCharacter({ cash: 0, housingCost: 1000, unlockedSkills: all('communication') }))
    await processTurn('room-1')

    expect(costsUpdate().cash).toBe(6600) // 7000 + 400 - 800
    expect(logStarting('Bônus salarial')).toEqual([
      expect.objectContaining({ cashImpact: 400, description: 'Bônus salarial: Liderança Estratégica (+R$ 400.00)' }),
    ])
  })

  it('os dois bônus de salário aparecem em linhas separadas', async () => {
    setup(makeCharacter({ cash: 0, housingCost: 1000, unlockedSkills: [skill('technical', 3), skill('communication', 4)] }))
    await processTurn('room-1')

    expect(logStarting('Bônus salarial').map((l) => l.cashImpact)).toEqual([300, 400])
    expect(costsUpdate().cash).toBe(6700)
  })

  // ─── Gestão ─────────────────────────────────────────────────────────────────

  it('Planejamento e Produtividade: cheque especial cobra 4%', async () => {
    setup(makeCharacter({ cash: -1000, housingCost: 1000, unlockedSkills: [skill('management', 1), skill('management', 2)] }))
    await processTurn('room-1')

    expect(costsUpdate().cash).toBe(4960) // -1000 - 40 + 7000 - 1000
    expect(logStarting('Cheque especial')).toEqual([
      expect.objectContaining({ cashImpact: -40, description: 'Cheque especial: Juros de 4% sobre R$ 1000.00 (-R$ 40.00)' }),
    ])
  })

  it('sem Planejamento e Produtividade o cheque especial continua em 8%', async () => {
    setup(makeCharacter({ cash: -1000, housingCost: 1000, unlockedSkills: [skill('management', 1)] }))
    await processTurn('room-1')

    expect(costsUpdate().cash).toBe(4920)
    expect(logStarting('Cheque especial')[0].description).toContain('Juros de 8%')
  })

  it('dívida antiga também paga 4% com a habilidade', async () => {
    setup(makeCharacter({ cash: 0, overdraftDebt: 2500, housingCost: 1000, unlockedSkills: [skill('management', 2)] }))
    await processTurn('room-1')

    expect(costsUpdate()).toEqual({ cash: 3400, overdraftDebt: 0, isBankrupt: false }) // -2500 - 100 + 7000 - 1000
  })

  it('bônus de 0,6% sobre as caixinhas pago em dinheiro, depois do rendimento', async () => {
    setup(makeCharacter({ unlockedSkills: [skill('management', 1), skill('management', 2)] }), {
      investments: [{ id: 'fi-1', amount: 10000, monthlyRate: 0.01 }],
    })
    await processTurn('room-1')

    // caixinha rende 100 → 10.100; bônus = 10.100 * 0,6% = 60,60
    expect(prismaMock.fixedIncomeInvestment.update).toHaveBeenCalledWith({ where: { id: 'fi-1' }, data: { amount: { increment: 100 } } })
    expect(cashIncrements()).toContain(60.6)
    expect(logStarting('Gestão')).toEqual([
      expect.objectContaining({ turn: 2, cashImpact: 60.6, description: 'Gestão: Bônus de 0,6% sobre as caixinhas (+R$ 60.60)' }),
    ])
  })

  it('o bônus não entra no valor da caixinha', async () => {
    setup(makeCharacter({ unlockedSkills: all('management') }), {
      investments: [{ id: 'fi-1', amount: 10000, monthlyRate: 0.01 }],
    })
    await processTurn('room-1')

    expect(prismaMock.fixedIncomeInvestment.update).toHaveBeenCalledTimes(1)
    expect(prismaMock.fixedIncomeInvestment.update).toHaveBeenCalledWith({ where: { id: 'fi-1' }, data: { amount: { increment: 100 } } })
  })

  it('Gestão completa: 2,7% somando todas as caixinhas abertas', async () => {
    setup(makeCharacter({ unlockedSkills: all('management') }), {
      investments: [
        { id: 'fi-1', amount: 10000, monthlyRate: 0.01 },
        { id: 'fi-2', amount: '5000', monthlyRate: 0 },
      ],
    })
    const { results } = await processTurn('room-1')

    // (10.100 + 5.000) * 2,7% = 407,70
    expect(logStarting('Gestão')).toEqual([
      expect.objectContaining({ cashImpact: 407.7, description: 'Gestão: Bônus de 2,7% sobre as caixinhas (+R$ 407.70)' }),
    ])
    expect(results[0].cashDelta).toBeCloseTo(7000 - 1000 + 100 + 407.7, 2)
  })

  it('L2 + L3 pagam 1,5%', async () => {
    setup(makeCharacter({ unlockedSkills: [skill('management', 2), skill('management', 3)] }), {
      investments: [{ id: 'fi-1', amount: 2000, monthlyRate: 0 }],
    })
    await processTurn('room-1')

    expect(logStarting('Gestão')).toEqual([
      expect.objectContaining({ cashImpact: 30, description: 'Gestão: Bônus de 1,5% sobre as caixinhas (+R$ 30.00)' }),
    ])
  })

  it('o bônus é arredondado em centavos', async () => {
    setup(makeCharacter({ unlockedSkills: [skill('management', 2)] }), {
      investments: [{ id: 'fi-1', amount: 1234.56, monthlyRate: 0 }],
    })
    await processTurn('room-1')

    expect(logStarting('Gestão')[0].cashImpact).toBe(7.41)
  })

  it('sem caixinhas não há bônus nem linha no extrato', async () => {
    setup(makeCharacter({ unlockedSkills: all('management') }))
    await processTurn('room-1')

    expect(logStarting('Gestão')).toEqual([])
    expect(cashIncrements()).toEqual([])
  })

  it('caixinhas sem Gestão L2 não rendem bônus', async () => {
    setup(makeCharacter({ unlockedSkills: [skill('management', 1)] }), {
      investments: [{ id: 'fi-1', amount: 10000, monthlyRate: 0.01 }],
    })
    await processTurn('room-1')

    expect(logStarting('Gestão')).toEqual([])
  })

  // ─── tudo junto ─────────────────────────────────────────────────────────────

  it('árvore inteira num mês com Infiltração Grave', async () => {
    pickEvent('Infiltração Grave')
    setup(makeCharacter({
      cash: -1000, housingCost: 1500,
      unlockedSkills: [...all('technical'), ...all('communication'), ...all('management')],
    }), { investments: [{ id: 'fi-1', amount: 10000, monthlyRate: 0 }] })
    const { results } = await processTurn('room-1')

    // -1000 - 40 (4%) + 7000 + 700 + 550 - 1200 = 6010
    expect(costsUpdate().cash).toBe(6010)
    expect(cashIncrements()).toEqual([270, -1750])
    expect(results[0].cashDelta).toBeCloseTo(7000 + 700 + 550 - 1200 - 40 + 270 - 1750, 2)
  })
})

// ─── dons na virada do mês ────────────────────────────────────────────────────

describe('dons na virada do mês', () => {
  const { EVENTS } = require('../src/utils/turnEngine')
  const skill = (path, level) => ({ skillNode: { path, level, name: `${path}-${level}` } })

  const randomFor = (index) => (index + 0.5) / EVENTS.length
  const QUIET = EVENTS.findIndex((e) => e.category === 'none')
  const pickEvent = (title) => Math.random.mockReturnValue(randomFor(EVENTS.findIndex((e) => e.title === title)))

  function setup(character) {
    prismaMock.room.findUnique.mockResolvedValueOnce({
      id: 'room-1', currentTurn: 1, maxTurns: 12, status: 'active', characters: [character],
    })
    prismaMock.marketAsset.findMany.mockResolvedValue([])
    prismaMock.fixedIncomeInvestment.findMany.mockResolvedValue([])
    prismaMock.debentureInvestment.findMany.mockResolvedValue([])
    prismaMock.characterEventLog.create.mockResolvedValue({})
    prismaMock.character.update.mockResolvedValue({})
    prismaMock.character.findUnique.mockResolvedValue({
      ...character, fixedInvestments: [], positions: [], debentures: [],
    })
    prismaMock.financialSnapshot.upsert.mockResolvedValue({})
    prismaMock.room.update.mockResolvedValue({ currentTurn: 2, status: 'active' })
  }

  const costsUpdate = () => prismaMock.character.update.mock.calls.find(([args]) => 'isBankrupt' in (args?.data ?? {}))[0].data
  const logs = () => prismaMock.characterEventLog.create.mock.calls.map(([args]) => args.data)
  const logStarting = (prefix) => logs().filter((l) => l.description.startsWith(prefix))
  const cashIncrements = () => prismaMock.character.update.mock.calls
    .map(([args]) => args.data.cash)
    .filter((c) => c && typeof c === 'object' && 'increment' in c)
    .map((c) => c.increment)

  const agile = (overrides = {}) => makeCharacter({ cash: 0, housingCost: 1000, gift: 'agile', unlockedSkills: [], ...overrides })

  beforeEach(() => jest.spyOn(Math, 'random').mockReturnValue(randomFor(QUIET)))
  afterEach(() => Math.random.mockRestore())

  // ─── Desenrolado (agile) ────────────────────────────────────────────────────

  it('Desenrolado: +R$ 200 de freela no saldo do mês', async () => {
    setup(agile())
    await processTurn('room-1')

    expect(costsUpdate().cash).toBe(6200) // 7000 + 200 - 1000
  })

  it('Desenrolado: linha própria no extrato', async () => {
    setup(agile())
    await processTurn('room-1')

    expect(logStarting('Freela')).toEqual([
      expect.objectContaining({ characterId: 'char-1', turn: 2, cashImpact: 200, description: 'Freela: Desenrolado (+R$ 200.00)' }),
    ])
  })

  it('Desenrolado: o freela entra depois do salário e antes do aluguel', async () => {
    setup(agile())
    await processTurn('room-1')

    expect(logs().map((l) => l.description.split(':')[0])).toEqual(['Salário', 'Freela', 'Aluguel', 'Nenhum imprevisto'])
  })

  it('Desenrolado: o freela do dom vem depois das rendas das habilidades', async () => {
    setup(agile({ unlockedSkills: [skill('technical', 1)] }))
    await processTurn('room-1')

    expect(logStarting('Freela').map((l) => l.description)).toEqual([
      'Freela: Fundamentos e Lógica (+R$ 150.00)',
      'Freela: Desenrolado (+R$ 200.00)',
    ])
    expect(costsUpdate().cash).toBe(6350) // 7000 + 150 + 200 - 1000
  })

  it('Desenrolado: o freela entra no resultado do mês', async () => {
    setup(agile())
    const { results } = await processTurn('room-1')

    expect(results[0].cashDelta).toBe(7000 + 200 - 1000)
  })

  it('Desenrolado: o freela ajuda a cobrir o cheque especial', async () => {
    setup(agile({ cash: -1000 }))
    await processTurn('room-1')

    // -1000 - 80 de juros (8%) + 7000 + 200 - 1000
    expect(costsUpdate().cash).toBe(5120)
  })

  it('Desenrolado: Freelance Inesperado paga 50% a mais (800 → 1200)', async () => {
    pickEvent('Freelance Inesperado')
    setup(agile())
    await processTurn('room-1')

    expect(logStarting('Freelance Inesperado')).toEqual([expect.objectContaining({ cashImpact: 1200 })])
    expect(cashIncrements()).toContain(1200)
  })

  it('Desenrolado: Bônus no Trabalho paga 50% a mais (1500 → 2250)', async () => {
    pickEvent('Bônus no Trabalho')
    setup(agile())
    const { results } = await processTurn('room-1')

    expect(logStarting('Bônus no Trabalho')).toEqual([expect.objectContaining({ cashImpact: 2250 })])
    expect(cashIncrements()).toContain(2250)
    expect(results[0].cashDelta).toBe(7000 + 200 - 1000 + 2250)
  })

  it.each(['Resistência Queimada', 'Emergência Veterinária', 'Infiltração Grave', 'Promoção Relâmpago'])(
    'Desenrolado: evento negativo "%s" não muda', async (title) => {
      pickEvent(title)
      const event = EVENTS.find((e) => e.title === title)
      setup(agile())
      await processTurn('room-1')

      expect(logStarting(title)).toEqual([expect.objectContaining({ cashImpact: event.cashImpact })])
    })

  it('Desenrolado: mês tranquilo continua em zero', async () => {
    setup(agile())
    await processTurn('room-1')

    expect(logStarting('Nenhum imprevisto')).toEqual([expect.objectContaining({ cashImpact: 0 })])
    expect(cashIncrements()).toEqual([])
  })

  // ─── quem não é Desenrolado ─────────────────────────────────────────────────

  it.each(['frugal', 'smart', null])('dom %s não recebe o freela do dom', async (gift) => {
    setup(agile({ gift }))
    await processTurn('room-1')

    expect(costsUpdate().cash).toBe(6000)
    expect(logStarting('Freela')).toEqual([])
    expect(logs().map((l) => l.description.split(':')[0])).toEqual(['Salário', 'Aluguel', 'Nenhum imprevisto'])
  })

  it.each([
    ['frugal', 'Freelance Inesperado', 800],
    ['smart', 'Freelance Inesperado', 800],
    [null, 'Freelance Inesperado', 800],
    ['frugal', 'Bônus no Trabalho', 1500],
    ['smart', 'Bônus no Trabalho', 1500],
    [null, 'Bônus no Trabalho', 1500],
  ])('dom %s recebe "%s" sem bônus (R$ %i)', async (gift, title, value) => {
    pickEvent(title)
    setup(agile({ gift }))
    await processTurn('room-1')

    expect(logStarting(title)).toEqual([expect.objectContaining({ cashImpact: value })])
    expect(cashIncrements()).toContain(value)
  })
})
