// Testes das regras da constelação. Rodar com: npm test
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { PATH_ORDER, PERKS, SPOTS, perkOf, skillCost, skillStatus } from './skillData.js'

const skills = PATH_ORDER.flatMap((path, p) =>
  [1, 2, 3, 4].map((level) => ({ id: p * 4 + level, path, level, costPoints: level > 2 ? 2 : 1, name: `${path} ${level}`, description: 'x' })))
const byKey = (path, level) => skills.find((s) => s.path === path && s.level === level)
const ctx = (over = {}) => ({ skills, unlockedIds: [], totalPoints: 0, usedPoints: 0, maxPoints: 8, gift: null, ...over })

describe('skillStatus', () => {
  it('desbloqueada é "on"', () => {
    const s = byKey('technical', 1)
    assert.equal(skillStatus(s, ctx({ unlockedIds: [s.id], totalPoints: 1, usedPoints: 1 })), 'on')
  })

  it('nível 1 com ponto sobrando está pronta', () => {
    assert.equal(skillStatus(byKey('management', 1), ctx({ totalPoints: 1 })), 'ready')
  })

  it('nível 2 sem o nível 1 fica bloqueada, mesmo com pontos', () => {
    assert.equal(skillStatus(byKey('technical', 2), ctx({ totalPoints: 5 })), 'locked')
  })

  it('o pré-requisito é do mesmo caminho', () => {
    const other = byKey('communication', 1)
    assert.equal(skillStatus(byKey('technical', 2), ctx({ unlockedIds: [other.id], totalPoints: 5, usedPoints: 1 })), 'locked')
  })

  it('sem pontos suficientes é "poor"', () => {
    const l1 = byKey('technical', 1), l2 = byKey('technical', 2)
    const unlockedIds = [l1.id, l2.id]
    // nível 3 custa 2, sobra só 1
    assert.equal(skillStatus(byKey('technical', 3), ctx({ unlockedIds, totalPoints: 3, usedPoints: 2 })), 'poor')
    assert.equal(skillStatus(byKey('technical', 3), ctx({ unlockedIds, totalPoints: 4, usedPoints: 2 })), 'ready')
  })

  it('passar do limite de pontos é "cap"', () => {
    assert.equal(skillStatus(byKey('management', 1), ctx({ totalPoints: 12, usedPoints: 8 })), 'cap')
    assert.equal(skillStatus(byKey('management', 1), ctx({ totalPoints: 12, usedPoints: 8, maxPoints: 10 })), 'ready')
  })

  it('bloqueio vem antes de falta de pontos', () => {
    assert.equal(skillStatus(byKey('technical', 4), ctx()), 'locked')
  })
})

describe('skillCost', () => {
  it('custo é sempre o da habilidade, para qualquer dom', () => {
    for (const gift of [null, 'frugal', 'agile', 'smart']) {
      assert.equal(skillCost({ costPoints: 1 }, gift), 1)
      assert.equal(skillCost({ costPoints: 2 }, gift), 2)
    }
  })

  it('o Inteligente usa até 10 pontos (limite vem do servidor)', () => {
    const s = skills.find((x) => x.path === 'management' && x.level === 1)
    assert.equal(skillStatus(s, ctx({ totalPoints: 12, usedPoints: 9, maxPoints: 10, gift: 'smart' })), 'ready')
    assert.equal(skillStatus(s, ctx({ totalPoints: 12, usedPoints: 10, maxPoints: 10, gift: 'smart' })), 'cap')
  })
})

describe('dados da constelação', () => {
  it('as 12 habilidades têm vantagem descrita', () => {
    for (const s of skills) assert.ok(PERKS[`${s.path}-${s.level}`]?.perk, `${s.path} ${s.level}`)
  })

  it('habilidade desconhecida cai na descrição do banco', () => {
    assert.equal(perkOf({ path: 'x', level: 9, description: 'Algo' }).perk, 'Algo')
  })

  it('cada caminho tem 4 posições dentro do céu', () => {
    for (const path of PATH_ORDER) {
      assert.equal(SPOTS[path].length, 4)
      for (const [x, y] of SPOTS[path]) assert.ok(x > 100 && x < 900 && y > 150 && y < 700)
    }
  })
})
