// Exportação dos dados de uma sala para pesquisa: uma linha por jogador por
// mês. Os jogadores saem com código (J01, J02…), sem nome nem e-mail (LGPD).
// CSV com ";" e vírgula decimal, para abrir direto no Excel em português.
const { dilemmaFor, LABELS } = require('./dilemmas')
const { leisureFor } = require('./leisure')
const { eventTitles } = require('./turnSummary')

const HEADER = [
  'jogador', 'dom', 'habilidades', 'mes', 'patrimonio_fim_do_mes', 'saldo_fim_do_mes',
  'evento_da_virada', 'dilema', 'opcao_dilema', 'respondeu_no_mes', 'lazer', 'contas_em_dia', 'contas_atrasadas',
]

const playerCode = (i) => `J${String(i + 1).padStart(2, '0')}`
const num = (v) => (v == null || v === '' ? '' : Number(v).toFixed(2).replace('.', ','))
const cell = (v) => {
  const s = v == null ? '' : String(v)
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// linhas (sem o cabeçalho) de um personagem
function playerRows(character, index, months = 12) {
  const code = playerCode(index)
  const logs = character.eventLog ?? []
  const choices = character.choices ?? []
  const snapshot = (turn) => (character.snapshots ?? []).find((s) => Number(s.turn) === turn)
  const rows = []
  for (let m = 1; m <= months; m++) {
    // a foto do patrimônio da virada para m+1 é o fim do mês m
    const snap = snapshot(m + 1)
    const ofMonth = logs.filter((l) => Number(l.turn) === m)
    const titles = eventTitles(m)
    const events = ofMonth.filter((l) => titles.some((t) => l.description.startsWith(`${t}:`))).map((l) => l.description.split(':')[0])
    const dilemma = dilemmaFor(m)
    const dChoice = choices.find((c) => c.kind === 'dilemma' && Number(c.turn) === m)
    const answeredLate = logs.some((l) => Number(l.turn) === m && l.description.includes('— Sem resposta:'))
    const lChoice = choices.find((c) => c.kind === 'leisure' && Number(c.turn) === m)
    rows.push([
      code, character.gift, (character.unlockedSkills ?? []).length, m, num(snap?.netWorth), num(snap?.cash),
      events.join(' + '),
      dilemma ? dilemma.title : '',
      dChoice ? LABELS[dChoice.option] : '',
      dilemma ? (dChoice && !answeredLate ? 'sim' : 'não') : '',
      lChoice ? leisureFor(m)?.options[lChoice.option]?.title ?? '' : '',
      ofMonth.filter((l) => l.description.startsWith('Conta: ')).length,
      ofMonth.filter((l) => l.description.startsWith('Conta atrasada:')).length,
    ])
  }
  return rows
}

function roomCsv(characters = [], months = 12) {
  const lines = [HEADER, ...characters.flatMap((c, i) => playerRows(c, i, months))]
  // BOM para o Excel reconhecer UTF-8
  return '﻿' + lines.map((r) => r.map(cell).join(';')).join('\r\n') + '\r\n'
}

module.exports = { HEADER, playerCode, playerRows, roomCsv }
