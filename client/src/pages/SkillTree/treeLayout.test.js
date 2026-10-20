// Testes do desenho da árvore. Rodar com: npm test
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { PATH_ORDER, SPOTS, PATHS } from './skillData.js'
import { VIEW, labelBox, nodeRadius, splitName } from './treeLayout.js'

// nomes de verdade (server/src/utils/seed.js), do nível 1 ao 4
const NAMES = {
  technical: ['Fundamentos e Lógica', 'Resolução de Problemas', 'Pensamento Analítico Avançado', 'Inovação e Otimização'],
  communication: ['Comunicação Básica', 'Trabalho em Equipe', 'Negociação e Liderança', 'Liderança Estratégica'],
  management: ['Organização Financeira', 'Planejamento e Produtividade', 'Visão de Mercado', 'Estratégia e Empreendedorismo'],
}
const STATUSES = ['on', 'ready', 'poor', 'locked']

const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
const circleHitsBox = ([cx, cy], r, b) => {
  const nx = Math.max(b.x, Math.min(cx, b.x + b.w))
  const ny = Math.max(b.y, Math.min(cy, b.y + b.h))
  return Math.hypot(cx - nx, cy - ny) < r
}

const layout = (status) => PATH_ORDER.flatMap((path) => SPOTS[path].map(([x, y], i) => {
  const R = nodeRadius(status, i + 1)
  return { path, level: i + 1, x, y, R, box: labelBox(path, x, y, R, NAMES[path][i]) }
}))

describe('splitName', () => {
  it('nome curto fica numa linha', () => {
    assert.deepEqual(splitName('Visão de Mercado'), ['Visão de Mercado'])
  })
  it('nome longo quebra no espaço mais perto do meio', () => {
    assert.deepEqual(splitName('Planejamento e Produtividade'), ['Planejamento e', 'Produtividade'])
  })
  it('palavra única comprida não quebra', () => {
    assert.deepEqual(splitName('Empreendedorismoempreendedor'), ['Empreendedorismoempreendedor'])
  })
  it('as duas linhas juntas dão o nome de volta', () => {
    for (const list of Object.values(NAMES)) for (const n of list) assert.equal(splitName(n).join(' '), n)
  })
})

describe('nodeRadius', () => {
  it('desbloqueada é maior que pronta, que é maior que bloqueada', () => {
    for (const level of [1, 2, 3, 4]) {
      assert.ok(nodeRadius('on', level) > nodeRadius('ready', level))
      assert.ok(nodeRadius('ready', level) > nodeRadius('locked', level))
    }
  })
})

describe('etiquetas da árvore', () => {
  for (const status of STATUSES) {
    it(`cabem na tela (${status})`, () => {
      for (const n of layout(status)) {
        const b = n.box
        assert.ok(b.x >= VIEW.x && b.x + b.w <= VIEW.x + VIEW.w, `${n.path} ${n.level} sai pelos lados`)
        assert.ok(b.y >= VIEW.y && b.y + b.h <= VIEW.y + VIEW.h, `${n.path} ${n.level} sai por cima/baixo`)
      }
    })

    it(`não se cobrem nem cobrem outros frutos (${status})`, () => {
      const all = layout(status)
      for (const a of all) {
        for (const b of all) {
          if (a === b) continue
          assert.ok(!overlaps(a.box, b.box), `etiqueta ${a.path} ${a.level} cobre ${b.path} ${b.level}`)
          assert.ok(!circleHitsBox([b.x, b.y], b.R + 2, a.box), `etiqueta ${a.path} ${a.level} cobre o fruto ${b.path} ${b.level}`)
        }
      }
    })
  }

  it('não cobrem o nome dos caminhos (em cima do último fruto)', () => {
    for (const status of STATUSES) {
      const all = layout(status)
      for (const path of PATH_ORDER) {
        const [lx, ly] = SPOTS[path][3]
        const w = Math.max(PATHS[path].short.length * 12, PATHS[path].theme.length * 7)
        const title = { x: lx - w / 2, y: ly - 70, w, h: 34 }
        for (const n of all) assert.ok(!overlaps(n.box, title), `etiqueta ${n.path} ${n.level} cobre o título de ${path}`)
      }
    }
  })
})
