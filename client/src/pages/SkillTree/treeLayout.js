// Medidas do desenho da Árvore de habilidades: tamanho dos frutos e onde
// fica a etiqueta com o nome de cada um. Testado em treeLayout.test.js
// (as etiquetas cabem na tela e não cobrem outros frutos nem outras etiquetas).

// Área visível do SVG (x, y, largura, altura).
export const VIEW = { x: -40, y: 96, w: 1080, h: 700 }

export const LABEL_FONT = 16
const LINE = 19
const PAD_X = 10
const PAD_Y = 5
// largura média de uma letra na fonte do jogo, um pouco folgada
const CHAR_W = LABEL_FONT * 0.56

// Raio do fruto: o desbloqueado é o maior; o bloqueado, um botão pequeno.
export function nodeRadius(status, level) {
  if (status === 'on') return 23 + level
  if (status === 'ready') return 20 + level
  if (status === 'locked') return 15
  return 17
}

// Nomes longos quebram em duas linhas, no espaço mais perto do meio.
export function splitName(name) {
  if (name.length <= 20 || !name.includes(' ')) return [name]
  const mid = name.length / 2
  const spaces = [...name.matchAll(/ /g)].map((m) => m.index)
  const cut = spaces.reduce((best, i) => (Math.abs(i - mid) < Math.abs(best - mid) ? i : best), spaces[0])
  return [name.slice(0, cut), name.slice(cut + 1)]
}

// Etiqueta ao lado do fruto, para fora da árvore: o Técnico à esquerda, os
// outros à direita. Devolve a caixa (x, y, w, h), as linhas e onde começa o texto.
export function labelBox(path, x, y, R, name) {
  const lines = splitName(name)
  const w = Math.ceil(Math.max(...lines.map((l) => l.length)) * CHAR_W + PAD_X * 2)
  const h = lines.length * LINE + PAD_Y * 2
  const left = path === 'technical'
  const bx = left ? x - R - 10 - w : x + R + 10
  const by = y - h / 2
  return { x: bx, y: by, w, h, lines, textX: bx + PAD_X, textY: by + PAD_Y + LINE - 4.5, line: LINE }
}
