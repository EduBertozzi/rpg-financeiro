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
  // marcou "pronto": já resolveu o mês (sem cobranças de atraso na virada)
  turnReady: true,
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

  it('novembro vira para dezembro e o jogo continua (dezembro é jogado)', async () => {
    setupHappyPath({ turn: 11 })

    const result = await processTurn('room-1')

    expect(result.isFinished).toBe(false)
    expect(result.turn).toBe(12)
    expect(prismaMock.room.update.mock.calls[0][0].data.status).toBe('active')
  })

  it('o fechamento de dezembro encerra a partida', async () => {
    // turn=12 (dezembro, maxTurns=12) → fecha o ano → turn 13, isFinished
    setupHappyPath({ turn: 12, isLast: true })

    const result = await processTurn('room-1')

    expect(result.isFinished).toBe(true)
    expect(result.turn).toBe(13)
    expect(result.dilemma).toBeNull()
    expect(prismaMock.room.update.mock.calls[0][0].data.status).toBe('finished')
  })

  it('devolve o dilema do mês novo para o cliente abrir', async () => {
    setupHappyPath({ turn: 1 })

    const result = await processTurn('room-1')

    // turn=1 → nextTurn=2 → fevereiro: empréstimo para o amigo
    expect(result.dilemma).toEqual({ turn: 2, title: 'Empréstimo para o amigo' })
  })

  it('a virada para dezembro não traz dilema (só consequências)', async () => {
    setupHappyPath({ turn: 11 })

    const result = await processTurn('room-1')

    expect(result.dilemma).toBeNull()
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
    setupHappyPath({ turn: 12, isLast: true })

    await processTurn('room-1')

    expect(prismaMock.leaderboard.upsert).toHaveBeenCalled()
  })

  it('não chama leaderboard.upsert antes do último turno', async () => {
    setupHappyPath({ turn: 11 })

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

// Sorteio dos eventos do calendário: Math.random abaixo de QUIET_CHANCE dá mês
// tranquilo; acima, escolhe da lista do mês. `eventTurnFor` acha o mês do evento.
const { EVENT_CALENDAR, QUIET_CHANCE } = require('../src/utils/events')
const QUIET_RANDOM = QUIET_CHANCE / 2
function eventTurnFor(title) {
  for (const [turn, list] of Object.entries(EVENT_CALENDAR)) {
    const pool = list.filter((e) => !e.fixed)
    const index = pool.findIndex((e) => e.title === title)
    if (index >= 0) return { turn: Number(turn), random: QUIET_CHANCE + ((index + 0.5) / pool.length) * (1 - QUIET_CHANCE), event: pool[index] }
  }
  throw new Error(`evento ${title} não está no calendário`)
}

describe('habilidades na virada do mês', () => {
  const skill = (path, level) => ({ skillNode: { path, level, name: `${path}-${level}` } })
  const all = (path) => [1, 2, 3, 4].map((level) => skill(path, level))

  // o setup vira para o mês do evento escolhido (fevereiro sem escolha)
  let eventTurn = 2
  const pickEvent = (title) => {
    const { turn, random } = eventTurnFor(title)
    eventTurn = turn
    Math.random.mockReturnValue(random)
  }

  function setup(character, { investments = [] } = {}) {
    prismaMock.room.findUnique.mockResolvedValueOnce({
      id: 'room-1', currentTurn: eventTurn - 1, maxTurns: 12, status: 'active', characters: [character],
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

  beforeEach(() => {
    eventTurn = 2
    jest.spyOn(Math, 'random').mockReturnValue(QUIET_RANDOM)
  })
  afterEach(() => Math.random.mockRestore())

  it('os consertos do calendário são o celular e o notebook', () => {
    const repairs = Object.values(EVENT_CALENDAR).flat().filter((e) => e.repair).map((e) => e.title)
    expect(repairs).toEqual(['Celular no chão', 'Notebook na assistência'])
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

  it('Resolução de Problemas: tela do celular custa R$ 225 em maio', async () => {
    pickEvent('Celular no chão')
    setup(makeCharacter({ unlockedSkills: [skill('technical', 1), skill('technical', 2)] }))
    await processTurn('room-1')

    expect(cashIncrements()).toContain(-225)
    expect(logStarting('Celular no chão')).toEqual([expect.objectContaining({ turn: 5, cashImpact: -225 })])
    expect(logStarting('Celular no chão')[0].description).toContain('50%')
  })

  it('Resolução de Problemas: notebook custa R$ 225 em setembro', async () => {
    pickEvent('Notebook na assistência')
    setup(makeCharacter({ unlockedSkills: [skill('technical', 2)] }))
    const { results } = await processTurn('room-1')

    expect(cashIncrements()).toContain(-225)
    expect(logStarting('Notebook na assistência')).toEqual([expect.objectContaining({ turn: 9, cashImpact: -225 })])
    expect(results[0].cashDelta).toBe(7000 - 1000 - 225)
  })

  it('sem Resolução de Problemas o notebook custa R$ 450', async () => {
    pickEvent('Notebook na assistência')
    setup(makeCharacter({ unlockedSkills: [skill('technical', 1)] }))
    await processTurn('room-1')

    expect(cashIncrements()).toContain(-450)
    expect(logStarting('Notebook na assistência')[0].description).toBe('Notebook na assistência: O notebook ficou lento e cheio de falhas e foi para o conserto.')
  })

  it('Resolução de Problemas não barateia outros imprevistos', async () => {
    pickEvent('Multa de trânsito')
    setup(makeCharacter({ unlockedSkills: [skill('technical', 2)] }))
    await processTurn('room-1')

    expect(cashIncrements()).toContain(-195)
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

  it('árvore inteira num mês com o notebook no conserto', async () => {
    pickEvent('Notebook na assistência')
    setup(makeCharacter({
      cash: -1000, housingCost: 1500,
      unlockedSkills: [...all('technical'), ...all('communication'), ...all('management')],
    }), { investments: [{ id: 'fi-1', amount: 10000, monthlyRate: 0 }] })
    const { results } = await processTurn('room-1')

    // -1000 - 40 (4%) + 7000 + 700 + 550 - 1200 = 6010
    expect(costsUpdate().cash).toBe(6010)
    expect(cashIncrements()).toEqual([270, -225])
    expect(results[0].cashDelta).toBeCloseTo(7000 + 700 + 550 - 1200 - 40 + 270 - 225, 2)
  })
})

// ─── dons na virada do mês ────────────────────────────────────────────────────

describe('dons na virada do mês', () => {
  const skill = (path, level) => ({ skillNode: { path, level, name: `${path}-${level}` } })

  let eventTurn = 2
  const pickEvent = (title) => {
    const { turn, random } = eventTurnFor(title)
    eventTurn = turn
    Math.random.mockReturnValue(random)
  }

  function setup(character) {
    prismaMock.room.findUnique.mockResolvedValueOnce({
      id: 'room-1', currentTurn: eventTurn - 1, maxTurns: 12, status: 'active', characters: [character],
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

  beforeEach(() => {
    eventTurn = 2
    jest.spyOn(Math, 'random').mockReturnValue(QUIET_RANDOM)
  })
  afterEach(() => Math.random.mockRestore())

  // ─── Desenrolado (agile) ────────────────────────────────────────────────────

  it('Desenrolado: +R$ 220 de freela no saldo do mês', async () => {
    setup(agile())
    await processTurn('room-1')

    expect(costsUpdate().cash).toBe(6220) // 7000 + 220 - 1000
  })

  it('Desenrolado: linha própria no extrato', async () => {
    setup(agile())
    await processTurn('room-1')

    expect(logStarting('Freela')).toEqual([
      expect.objectContaining({ characterId: 'char-1', turn: 2, cashImpact: 220, description: 'Freela: Desenrolado (+R$ 220.00)' }),
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
      'Freela: Desenrolado (+R$ 220.00)',
    ])
    expect(costsUpdate().cash).toBe(6370) // 7000 + 150 + 220 - 1000
  })

  it('Desenrolado: o freela entra no resultado do mês', async () => {
    setup(agile())
    const { results } = await processTurn('room-1')

    expect(results[0].cashDelta).toBe(7000 + 220 - 1000)
  })

  it('Desenrolado: o freela ajuda a cobrir o cheque especial', async () => {
    setup(agile({ cash: -1000 }))
    await processTurn('room-1')

    // -1000 - 80 de juros (8%) + 7000 + 220 - 1000
    expect(costsUpdate().cash).toBe(5140)
  })

  it('Desenrolado: venda de usados paga 50% a mais (600 → 900)', async () => {
    pickEvent('Venda de usados')
    setup(agile())
    await processTurn('room-1')

    expect(logStarting('Venda de usados')).toEqual([expect.objectContaining({ cashImpact: 900 })])
    expect(cashIncrements()).toContain(900)
  })

  it('Desenrolado: participação nos resultados paga 50% a mais (700 → 1050)', async () => {
    pickEvent('Participação nos resultados')
    setup(agile())
    const { results } = await processTurn('room-1')

    expect(logStarting('Participação nos resultados')).toEqual([expect.objectContaining({ cashImpact: 1050 })])
    expect(cashIncrements()).toContain(1050)
    expect(results[0].cashDelta).toBe(7000 + 220 - 1000 + 1050)
  })

  it.each(['Celular no chão', 'Multa de trânsito', 'Chuva forte', 'Convite para casamento'])(
    'Desenrolado: evento negativo "%s" não muda', async (title) => {
      pickEvent(title)
      const { event } = eventTurnFor(title)
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
    ['frugal', 'Venda de usados', 600],
    ['smart', 'Venda de usados', 600],
    [null, 'Venda de usados', 600],
    ['frugal', 'Participação nos resultados', 700],
    ['smart', 'Participação nos resultados', 700],
    [null, 'Participação nos resultados', 700],
  ])('dom %s recebe "%s" sem bônus (R$ %i)', async (gift, title, value) => {
    pickEvent(title)
    setup(agile({ gift }))
    await processTurn('room-1')

    expect(logStarting(title)).toEqual([expect.objectContaining({ cashImpact: value })])
    expect(cashIncrements()).toContain(value)
  })
})

// ─── consequências dos dilemas na virada do mês ───────────────────────────────

describe('consequências dos dilemas na virada', () => {
  const skill = (path, level) => ({ skillNode: { path, level, name: `${path}-${level}` } })

  function setup(character, { turn = 4, effects = [], fresh = {} } = {}) {
    prismaMock.room.findUnique.mockResolvedValueOnce({
      id: 'room-1', currentTurn: turn, maxTurns: 12, status: 'active', characters: [character],
    })
    if (turn >= 12) {
      prismaMock.room.findUnique.mockResolvedValueOnce({ id: 'room-1', characters: [{ id: character.id, snapshots: [] }] })
      prismaMock.leaderboard.upsert.mockResolvedValue({})
    }
    prismaMock.marketAsset.findMany.mockResolvedValue([])
    prismaMock.fixedIncomeInvestment.findMany.mockResolvedValue([])
    prismaMock.debentureInvestment.findMany.mockResolvedValue([])
    prismaMock.characterEventLog.create.mockResolvedValue({})
    prismaMock.character.update.mockResolvedValue({})
    prismaMock.scheduledEffect.findMany.mockResolvedValue(effects)
    prismaMock.scheduledEffect.updateMany.mockResolvedValue({})
    prismaMock.character.findUnique.mockResolvedValue({
      ...character, fixedInvestments: [], positions: [], debentures: [], effects: [], ...fresh,
    })
    prismaMock.financialSnapshot.upsert.mockResolvedValue({})
    prismaMock.room.update.mockResolvedValue({})
  }

  const costsUpdate = () => prismaMock.character.update.mock.calls.find(([args]) => 'isBankrupt' in (args?.data ?? {}))[0].data
  const logs = () => prismaMock.characterEventLog.create.mock.calls.map(([args]) => args.data)
  const logStarting = (prefix) => logs().filter((l) => l.description.startsWith(prefix))
  const effect = (kind, amount, label, extra = {}) => ({ id: `fx-${label}`, kind, amount, label, appliedAt: null, ...extra })

  beforeEach(() => jest.spyOn(Math, 'random').mockReturnValue(0.1)) // mês tranquilo
  afterEach(() => Math.random.mockRestore())

  it('busca só os efeitos do mês novo que ainda não foram aplicados', async () => {
    setup(makeCharacter(), { turn: 4 })
    await processTurn('room-1')

    expect(prismaMock.scheduledEffect.findMany).toHaveBeenCalledWith({ where: { characterId: 'char-1', turn: 5, appliedAt: null } })
  })

  it('devolução do amigo entra no saldo e no extrato', async () => {
    setup(makeCharacter({ cash: 0, housingCost: 1000 }), {
      effects: [effect('cash', 537, 'Empréstimo: Seu amigo devolveu o dinheiro')],
    })
    const { results } = await processTurn('room-1')

    expect(costsUpdate().cash).toBe(6537) // 7000 + 537 - 1000
    expect(logStarting('Empréstimo')).toEqual([
      expect.objectContaining({ turn: 5, cashImpact: 537, description: 'Empréstimo: Seu amigo devolveu o dinheiro (+R$ 537.00)' }),
    ])
    expect(results[0].cashDelta).toBe(6537)
  })

  it('marca os efeitos como aplicados para não cobrar duas vezes', async () => {
    setup(makeCharacter(), { effects: [effect('cash', 537, 'a'), effect('installment', '-335.20', 'b')] })
    await processTurn('room-1')

    expect(prismaMock.scheduledEffect.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['fx-a', 'fx-b'] } }, data: { appliedAt: expect.any(Date) },
    })
  })

  it('sem efeitos, não marca nada', async () => {
    setup(makeCharacter())
    await processTurn('room-1')

    expect(prismaMock.scheduledEffect.updateMany).not.toHaveBeenCalled()
  })

  it('parcela sai do saldo como Decimal em texto', async () => {
    setup(makeCharacter({ cash: 0, housingCost: 1000 }), {
      effects: [effect('installment', '-335.20', 'Parcela: Máquina de lavar (2/12)')],
    })
    await processTurn('room-1')

    expect(costsUpdate().cash).toBe(5664.8)
    expect(logStarting('Parcela')).toEqual([
      expect.objectContaining({ cashImpact: -335.2, description: 'Parcela: Máquina de lavar (2/12) (-R$ 335.20)' }),
    ])
  })

  it('parcela também pode jogar no cheque especial', async () => {
    setup(makeCharacter({ cash: -7000, housingCost: 1000 }), {
      effects: [effect('installment', -335.2, 'Parcela: Academia (2/6)')],
    })
    await processTurn('room-1')

    // -7000 - 560 (8%) + 7000 - 335,20 - 1000
    expect(costsUpdate()).toEqual({ cash: -1895.2, overdraftDebt: 0, isBankrupt: true })
  })

  it('juros do cheque especial são sobre o saldo de antes das consequências', async () => {
    setup(makeCharacter({ cash: -1000, housingCost: 1000 }), { effects: [effect('cash', -2000, 'Saúde: Crise de coluna')] })
    await processTurn('room-1')

    expect(logStarting('Cheque especial')[0].cashImpact).toBe(-80)
  })

  it('promoção: salário +R$ 700 numa linha à parte', async () => {
    setup(makeCharacter({ cash: 0, housingCost: 1000 }), {
      turn: 9, effects: [effect('salary_raise', 700, 'Promoção: Salário 10% maior')],
    })
    await processTurn('room-1')

    expect(costsUpdate().cash).toBe(6700)
    expect(logStarting('Promoção')).toEqual([expect.objectContaining({ turn: 10, cashImpact: 700 })])
  })

  it('demitido: sem salário nem bônus de salário, mas freelas continuam', async () => {
    setup(makeCharacter({
      cash: 0, housingCost: 1000, gift: 'agile',
      unlockedSkills: [skill('technical', 1), skill('technical', 2), skill('technical', 3)],
    }), { turn: 11, effects: [effect('no_salary', 0, 'Sem salário: Você foi demitido em novembro')] })
    await processTurn('room-1')

    // 150 (freela Técnico) + 220 (freela dom) - 1000 aluguel
    expect(costsUpdate().cash).toBe(-630)
    expect(logStarting('Salário')).toEqual([])
    expect(logStarting('Bônus salarial')).toEqual([])
    expect(logStarting('Freela').map((l) => l.cashImpact)).toEqual([150, 220])
    expect(logStarting('Sem salário')).toEqual([expect.objectContaining({ cashImpact: 0 })])
  })

  it('demitido e promovido no mesmo mês: a promoção não paga sem salário', async () => {
    setup(makeCharacter({ cash: 0, housingCost: 1000 }), {
      turn: 11, effects: [effect('no_salary', 0, 'Sem salário'), effect('salary_raise', 700, 'Promoção')],
    })
    await processTurn('room-1')

    expect(costsUpdate().cash).toBe(-1000)
    expect(logStarting('Promoção')).toEqual([])
  })

  it('aviso de demissão só aparece no extrato', async () => {
    setup(makeCharacter({ cash: 0, housingCost: 1000 }), { turn: 10, effects: [effect('notice', 0, 'Demissão: A empresa te desligou')] })
    await processTurn('room-1')

    expect(costsUpdate().cash).toBe(6000)
    expect(logStarting('Demissão')).toEqual([expect.objectContaining({ cashImpact: 0, description: 'Demissão: A empresa te desligou' })])
  })

  it('aluguel adiantado: não cobra o aluguel do mês', async () => {
    setup(makeCharacter({ cash: 0, housingCost: 1500 }), { turn: 10, effects: [effect('rent_waived', 0, 'Aluguel: Já pago adiantado')] })
    const { results } = await processTurn('room-1')

    expect(costsUpdate().cash).toBe(7000)
    expect(logStarting('Aluguel').map((l) => l.description)).toEqual(['Aluguel: Já pago adiantado'])
    expect(results[0].cashDelta).toBe(7000)
  })

  it('a casa mais cara do incêndio já vem no housingCost', async () => {
    setup(makeCharacter({ cash: 0, housingCost: 2250 }), { turn: 10 })
    await processTurn('room-1')

    expect(logStarting('Aluguel')[0].cashImpact).toBe(-2250)
  })

  it('o snapshot conta as parcelas que faltam como dívida', async () => {
    setup(makeCharacter(), {
      fresh: {
        cash: 5000,
        effects: [
          { kind: 'installment', amount: '-335.20', appliedAt: null },
          { kind: 'installment', amount: '-335.20', appliedAt: null },
        ],
      },
    })
    await processTurn('room-1')

    expect(prismaMock.financialSnapshot.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ totalAssets: 5000, totalDebts: 670.4, netWorth: 4329.6 }),
    }))
  })

  it('o snapshot busca só as parcelas não pagas', async () => {
    setup(makeCharacter())
    await processTurn('room-1')

    const { include } = prismaMock.character.findUnique.mock.calls[0][0]
    expect(include.effects).toEqual({ where: { kind: 'installment', appliedAt: null } })
  })

  // ─── virada para dezembro e fechamento do ano ───────────────────────────────

  it('virada para dezembro: 13º e gastos de fim de ano sempre caem', async () => {
    setup(makeCharacter({ cash: 0, housingCost: 1000 }), { turn: 11 })
    const { results } = await processTurn('room-1')

    expect(logStarting('13º salário')).toEqual([expect.objectContaining({ turn: 12, cashImpact: 7000 })])
    expect(logStarting('Gastos de fim de ano')).toEqual([expect.objectContaining({ cashImpact: -550 })])
    expect(results[0].cashDelta).toBe(7000 - 1000 + 7000 - 550)
  })

  it('o 13º não ganha o bônus do Desenrolado', async () => {
    setup(makeCharacter({ gift: 'agile' }), { turn: 11 })
    await processTurn('room-1')

    expect(logStarting('13º salário')[0].cashImpact).toBe(7000)
  })

  it('demitido ainda recebe o 13º (a rescisão paga)', async () => {
    setup(makeCharacter({ cash: 0, housingCost: 1000 }), { turn: 11, effects: [effect('no_salary', 0, 'Sem salário')] })
    await processTurn('room-1')

    expect(logStarting('13º salário')).toHaveLength(1)
  })

  it('fechamento de dezembro: sem salário, sem aluguel, sem evento, sem efeitos', async () => {
    setup(makeCharacter({ cash: 3000, housingCost: 1000, gift: 'agile' }), { turn: 12 })
    const { results, isFinished } = await processTurn('room-1')

    expect(isFinished).toBe(true)
    expect(costsUpdate().cash).toBe(3000)
    expect(logs()).toEqual([])
    expect(prismaMock.scheduledEffect.findMany).not.toHaveBeenCalled()
    expect(results[0].events).toEqual([])
    expect(results[0].cashDelta).toBe(0)
  })

  it('fechamento de dezembro ainda cobra os juros do cheque especial', async () => {
    setup(makeCharacter({ cash: -2000, housingCost: 1000 }), { turn: 12 })
    await processTurn('room-1')

    expect(costsUpdate().cash).toBe(-2160)
    expect(logs().map((l) => l.description.split(':')[0])).toEqual(['Cheque especial'])
  })

  it('fechamento de dezembro ainda rende as caixinhas e guarda o snapshot 13', async () => {
    setup(makeCharacter(), { turn: 12 })
    prismaMock.fixedIncomeInvestment.findMany.mockResolvedValue([{ id: 'fi-1', amount: 10000, monthlyRate: 0.01 }])
    prismaMock.fixedIncomeInvestment.update.mockResolvedValue({})
    await processTurn('room-1')

    expect(prismaMock.fixedIncomeInvestment.update).toHaveBeenCalledWith({ where: { id: 'fi-1' }, data: { amount: { increment: 100 } } })
    expect(prismaMock.financialSnapshot.upsert.mock.calls[0][0].create.turn).toBe(13)
  })
})

// ─── o que ficou em aberto quando o mês fecha ─────────────────────────────────

describe('virada cobra o que ficou em aberto', () => {
  const skill = (path, level) => ({ skillNode: { path, level, name: `${path}-${level}` } })

  function setup(character, { turn = 3, logs = [], choices = [] } = {}) {
    prismaMock.room.findUnique.mockResolvedValueOnce({ id: 'room-1', currentTurn: turn, maxTurns: 12, status: 'active', characters: [character] })
    if (turn >= 12) {
      prismaMock.room.findUnique.mockResolvedValueOnce({ id: 'room-1', characters: [{ id: character.id, snapshots: [] }] })
      prismaMock.leaderboard.upsert.mockResolvedValue({})
    }
    prismaMock.marketAsset.findMany.mockResolvedValue([])
    prismaMock.fixedIncomeInvestment.findMany.mockResolvedValue([])
    prismaMock.debentureInvestment.findMany.mockResolvedValue([])
    prismaMock.characterEventLog.findMany.mockResolvedValue(logs)
    prismaMock.characterChoice.findMany.mockResolvedValue(choices)
    prismaMock.characterChoice.create.mockResolvedValue({})
    prismaMock.scheduledEffect.findMany.mockResolvedValue([])
    prismaMock.scheduledEffect.createMany.mockResolvedValue({})
    prismaMock.characterEventLog.create.mockResolvedValue({})
    prismaMock.character.update.mockResolvedValue({})
    prismaMock.character.findUnique.mockResolvedValue({ ...character, fixedInvestments: [], positions: [], debentures: [], effects: [] })
    prismaMock.financialSnapshot.upsert.mockResolvedValue({})
    prismaMock.room.update.mockResolvedValue({})
  }

  const logs = () => prismaMock.characterEventLog.create.mock.calls.map(([a]) => a.data)
  const logStarting = (prefix) => logs().filter((l) => l.description.startsWith(prefix))
  const costsUpdate = () => prismaMock.character.update.mock.calls.find(([a]) => 'isBankrupt' in (a?.data ?? {}))[0].data
  const lazy = (overrides = {}) => makeCharacter({ turnReady: false, cash: 10000, housingCost: 1000, foodCost: 1000, utilitiesCost: 250, transportCost: 250, ...overrides })
  const paid = (turn, label) => ({ turn, description: `Conta: ${label} — Pago (-R$ 1)` })

  beforeEach(() => jest.spyOn(Math, 'random').mockReturnValue(0.1))
  afterEach(() => Math.random.mockRestore())

  it('quem marcou pronto não é cobrado de nada (nem consulta)', async () => {
    setup(makeCharacter({ turnReady: true }))
    await processTurn('room-1')

    expect(prismaMock.characterChoice.findMany).not.toHaveBeenCalled()
    expect(logStarting('Conta atrasada')).toEqual([])
  })

  it('três contas em aberto viram contas atrasadas com 3% a mais, no mês que fechou', async () => {
    setup(lazy(), { choices: [{ turn: 3, kind: 'leisure' }, { turn: 3, kind: 'dilemma' }] })
    await processTurn('room-1')

    expect(logStarting('Conta atrasada').map((l) => [l.turn, l.cashImpact])).toEqual([[3, -1030], [3, -257.5], [3, -257.5]])
    expect(logStarting('Conta atrasada: Mercadinho')[0].description).toBe('Conta atrasada: Mercadinho — R$ 1000.00 + 2% de multa e 1% de juros (-R$ 1030.00)')
  })

  it('o saldo já sai com as contas atrasadas antes do salário e do aluguel', async () => {
    setup(lazy(), { choices: [{ turn: 3, kind: 'leisure' }, { turn: 3, kind: 'dilemma' }] })
    const { results } = await processTurn('room-1')

    // 10000 - 1545 (atrasadas) + 7000 - 1000
    expect(costsUpdate().cash).toBe(14455)
    expect(results[0].cashDelta).toBe(-1545 + 7000 - 1000)
  })

  it('não pagar nunca sai mais barato que pagar em dia', async () => {
    setup(lazy(), { choices: [{ turn: 3, kind: 'leisure' }, { turn: 3, kind: 'dilemma' }] })
    await processTurn('room-1')
    const late = -logStarting('Conta atrasada').reduce((s, l) => s + l.cashImpact, 0)
    expect(late).toBeGreaterThan(1000 + 250 + 250)
  })

  it('conta atrasada usa o desconto das habilidades', async () => {
    setup(lazy({ unlockedSkills: [skill('communication', 1)] }), { choices: [{ turn: 3, kind: 'leisure' }, { turn: 3, kind: 'dilemma' }] })
    await processTurn('room-1')

    // água e luz 250 - 30% = 175 → 180,25
    expect(logStarting('Conta atrasada: Água e Luz')[0].cashImpact).toBe(-180.25)
  })

  it('só cobra a conta que faltou', async () => {
    setup(lazy(), {
      logs: [paid(3, 'Mercadinho'), paid(3, 'Água e Luz')],
      choices: [{ turn: 3, kind: 'leisure' }, { turn: 3, kind: 'dilemma' }],
    })
    await processTurn('room-1')

    expect(logStarting('Conta atrasada').map((l) => l.description.split(' —')[0])).toEqual(['Conta atrasada: Internet e Celular'])
  })

  it('lazer não escolhido: cobra o primeiro passeio e guarda a escolha', async () => {
    setup(lazy(), { logs: [paid(3, 'Mercadinho'), paid(3, 'Água e Luz'), paid(3, 'Internet e Celular')], choices: [{ turn: 3, kind: 'dilemma' }] })
    await processTurn('room-1')

    expect(logStarting('Lazer')).toEqual([expect.objectContaining({ turn: 3, cashImpact: -200 })])
    expect(prismaMock.characterChoice.create).toHaveBeenCalledWith({ data: { characterId: 'char-1', turn: 3, kind: 'leisure', option: 0, amount: 200 } })
  })

  it('dilema sem resposta: a inércia decide, sem ponto de habilidade', async () => {
    setup(lazy(), {
      logs: [paid(3, 'Mercadinho'), paid(3, 'Água e Luz'), paid(3, 'Internet e Celular')],
      choices: [{ turn: 3, kind: 'leisure' }],
    })
    await processTurn('room-1')

    // março: deixar o dente para depois → canal em junho
    expect(prismaMock.characterChoice.create).toHaveBeenCalledWith({ data: { characterId: 'char-1', turn: 3, kind: 'dilemma', option: 0, amount: 0 } })
    expect(prismaMock.scheduledEffect.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ characterId: 'char-1', sourceTurn: 3, turn: 6, amount: -500 })],
    })
    expect(logStarting('Dilema "Dor de dente" — Sem resposta')).toHaveLength(1)
    expect(prismaMock.characterSkillPoints.update).not.toHaveBeenCalled()
  })

  it('dilema do incêndio sem resposta: casa mais cara, e o aluguel do mês já usa o novo valor', async () => {
    setup(lazy({ housingCost: 1500 }), {
      turn: 10,
      logs: [paid(10, 'Mercadinho'), paid(10, 'Água e Luz'), paid(10, 'Internet e Celular')],
      choices: [{ turn: 10, kind: 'leisure' }],
    })
    await processTurn('room-1')

    expect(prismaMock.character.update).toHaveBeenCalledWith({ where: { id: 'char-1' }, data: { housingCost: 2250 } })
    expect(logStarting('Aluguel')[0].cashImpact).toBe(-2250)
  })

  it('a inércia de setembro também demite quem foi a pé em agosto', async () => {
    setup(lazy(), {
      turn: 9,
      logs: [paid(9, 'Mercadinho'), paid(9, 'Água e Luz'), paid(9, 'Internet e Celular')],
      choices: [{ turn: 9, kind: 'leisure' }, { turn: 8, kind: 'dilemma', option: 1 }],
    })
    await processTurn('room-1')

    const effects = prismaMock.scheduledEffect.createMany.mock.calls[0][0].data
    expect(effects.map((e) => e.kind)).toEqual(['notice', 'no_salary'])
  })

  it('dezembro: cobra contas e lazer no fechamento do ano, sem dilema', async () => {
    setup(lazy(), { turn: 12 })
    await processTurn('room-1')

    expect(logStarting('Conta atrasada')).toHaveLength(3)
    expect(logStarting('Lazer')).toEqual([expect.objectContaining({ turn: 12, cashImpact: -1000 })])
    expect(logStarting('Dilema')).toEqual([])
    // 10000 - 1545 - 1000, sem salário nem aluguel no fechamento do ano
    expect(costsUpdate().cash).toBe(7455)
  })

  it('o Dorminhoco (não faz nada o ano todo) paga mais que quem faz tudo em dia', async () => {
    setup(lazy(), { turn: 3 })
    await processTurn('room-1')
    const lazyCost = -logs().filter((l) => /^(Conta atrasada|Lazer|Dilema)/.test(l.description)).reduce((s, l) => s + l.cashImpact, 0)
    expect(lazyCost).toBeGreaterThan(1000 + 250 + 250 + 200)
  })
})
