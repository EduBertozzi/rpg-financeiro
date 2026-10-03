// Painel do administrador: o que cada jogador já fez no mês, resumo de cada
// sala e a ordem para apagar uma sala com tudo dentro (funções puras).
const { dilemmaFor } = require('./dilemmas')
const { leisureFor } = require('./leisure')

const NAME_MAX = 40

// Nome da turma: sem espaços sobrando e com limite de tamanho. null se vazio.
function cleanRoomName(name) {
  if (typeof name !== 'string') return null
  const clean = name.replace(/\s+/g, ' ').trim()
  return clean ? clean.slice(0, NAME_MAX) : null
}

const BILL_PREFIXES = {
  food: 'Conta: Mercadinho',
  utilities: 'Conta: Água e Luz',
  transport: 'Conta: Internet e Celular',
}

// Tarefas do mês de um jogador: true = feito, false = falta, null = não tem este mês.
function playerTasks(character, turn) {
  const choices = character.choices ?? []
  const logs = (character.eventLog ?? []).filter((l) => Number(l.turn) === Number(turn))
  const chose = (kind) => choices.some((c) => Number(c.turn) === Number(turn) && c.kind === kind)
  const tasks = {
    dilemma: dilemmaFor(turn) ? chose('dilemma') : null,
    leisure: leisureFor(turn) ? chose('leisure') : null,
  }
  for (const [type, prefix] of Object.entries(BILL_PREFIXES)) {
    tasks[type] = logs.some((l) => l.description.startsWith(prefix))
  }
  return tasks
}

// Linha do jogador no painel: tarefas, pronto e patrimônio (último snapshot ou saldo).
function playerProgress(character, turn) {
  const last = [...(character.snapshots ?? [])].sort((a, b) => b.turn - a.turn)[0]
  return {
    id: character.id,
    name: character.name,
    avatarId: character.avatarId,
    ready: Boolean(character.turnReady),
    tasks: turn > 0 ? playerTasks(character, turn) : null,
    netWorth: Number(last ? last.netWorth : character.cash ?? 0),
  }
}

// Resumo de uma sala na lista "Minhas salas".
function roomSummary(room) {
  const characters = room.characters ?? []
  const ready = characters.filter((c) => c.turnReady).length
  return {
    id: room.id,
    code: room.code,
    name: room.name || '',
    status: room.status,
    currentTurn: room.currentTurn,
    maxTurns: room.maxTurns,
    createdAt: room.createdAt,
    players: characters.length,
    ready,
    allReady: room.status === 'active' && characters.length > 0 && ready === characters.length,
  }
}

// Tabelas presas a um personagem, na ordem de apagar (antes do personagem).
const CHARACTER_CHILD_MODELS = [
  'characterSkill', 'characterSkillPoints', 'fixedIncomeInvestment', 'variableIncomePosition',
  'tradeHistory', 'debentureInvestment', 'characterEventLog', 'financialSnapshot',
  'characterCoupon', 'characterChoice', 'scheduledEffect',
]

// Senha provisória legível para o professor ditar: palavra + 3 números.
const TEMP_WORDS = ['maré', 'coreto', 'ipê', 'cupom', 'caixinha', 'cruzeiro', 'sapucaí', 'mercado', 'praça', 'boleto']
function temporaryPassword(random = Math.random) {
  const word = TEMP_WORDS[Math.floor(random() * TEMP_WORDS.length)]
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const digits = String(Math.floor(random() * 900) + 100)
  return `${word}${digits}`
}

module.exports = {
  TEMP_WORDS, temporaryPassword, NAME_MAX, BILL_PREFIXES, CHARACTER_CHILD_MODELS, cleanRoomName, playerTasks, playerProgress, roomSummary }
