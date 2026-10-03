// Conquistas do caminho: pequenas comemorações durante o ano (as medalhas do
// fim de jogo são outras, na tela final). Cada uma aparece uma vez por
// personagem, quando a condição passa de falsa para verdadeira.
import { monthTasks } from './sidebarData.js'

export const ACHIEVEMENTS = [
  { id: 'month_clean', title: 'Mês em dia: tudo pago', test: (c, turn) => {
    const tasks = monthTasks(c.eventLog, turn)
    return tasks.length > 0 && tasks.every((t) => t.done)
  } },
  { id: 'first_box', title: 'Primeira caixinha no Banco Maré', test: (c) => (c.fixedInvestments ?? []).length > 0 },
  { id: 'first_stock', title: 'Primeira ação na carteira', test: (c) => (c.positions ?? []).some((p) => Number(p.quantity) > 0) },
  { id: 'first_skill', title: 'Primeira habilidade desbloqueada', test: (c) => (c.unlockedSkills ?? []).length > 0 },
  { id: 'out_of_red', title: 'Saiu do vermelho', test: (c, _turn, prev) => Number(prev?.cash) < 0 && Number(c.cash) >= 0 },
]

// Conquistas que acabaram de acontecer entre `prev` e `next` (mesmo personagem).
export function newAchievements(prev, next, turn, seen = new Set()) {
  if (!prev || !next || prev.id !== next.id) return []
  return ACHIEVEMENTS
    .filter((a) => !seen.has(a.id) && !a.test(prev, turn, null) && a.test(next, turn, prev))
    .map(({ id, title }) => ({ id, title }))
}

// Desbloqueou alguma habilidade agora? (confete toda vez, não só na primeira)
export const skillUnlocked = (prev, next) =>
  Boolean(prev && next && prev.id === next.id && (next.unlockedSkills ?? []).length > (prev.unlockedSkills ?? []).length)
