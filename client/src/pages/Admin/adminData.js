// Painel do administrador: textos e regras da lista de salas (funções puras).

export const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export const STATUS_LABEL = { waiting: 'Esperando', active: 'Jogando', finished: 'Encerrada' }

// tarefas do mês de cada jogador, na ordem da tabela
export const TASKS = [
  ['dilemma', '✉', 'Dilema'],
  ['leisure', '★', 'Lazer'],
  ['food', '🛒', 'Mercadinho'],
  ['utilities', '💡', 'Água e Luz'],
  ['transport', '📶', 'Internet'],
]

export const FILTERS = [
  ['all', 'Todas'],
  ['active', 'Jogando'],
  ['waiting', 'Esperando'],
  ['finished', 'Encerradas'],
]

export const filterRooms = (rooms, filter) => (filter === 'all' ? rooms : rooms.filter((r) => r.status === filter))

// nome que aparece para a sala (salas antigas não têm nome)
export const roomTitle = (room) => room?.name?.trim() || `Sala ${room?.code ?? ''}`.trim()

export const monthName = (turn) => MONTHS[Number(turn) - 1] ?? ''

// texto do botão de fechar o mês
export function closeLabel(room) {
  if (!room) return ''
  if (room.currentTurn >= room.maxTurns) return 'Fechar o ano'
  return `Fechar ${monthName(room.currentTurn).toLowerCase()}`
}

// quantos jogadores ainda não terminaram o mês
export const missingCount = (players = []) => players.filter((p) => !p.ready).length

// tarefas feitas / tarefas do mês (as que valem neste mês)
export function taskCount(tasks) {
  if (!tasks) return { done: 0, total: 0 }
  const valid = Object.values(tasks).filter((v) => v !== null)
  return { done: valid.filter(Boolean).length, total: valid.length }
}

// ranking pelo patrimônio, do maior para o menor (sem mexer na lista original)
export const ranked = (players = []) => [...players].sort((a, b) => b.netWorth - a.netWorth)

// "jogador" / "jogadores"
export const playersLabel = (n) => `${n} ${n === 1 ? 'jogador' : 'jogadores'}`
