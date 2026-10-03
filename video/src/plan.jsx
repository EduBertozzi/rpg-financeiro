// Roteiro dos dois vídeos. Cada trecho de jogo: arquivo, de/até (segundos da
// gravação), velocidade, adesivo de título, legendas, zoom e sons (em segundos
// do trecho já acelerado).
import { C } from './parts'

const clip = (o) => ({ kind: 'clip', ...o, dur: (o.to - o.from) / (o.rate ?? 1) })

const ADMIN = (rate = 1.6, from = 9.8, to = 26.5) => clip({
  src: 'admin.webm', from, to, rate, hue: '#F2B53A',
  sticker: { text: 'O professor cria a sala', color: C.yellow, n: '1' },
  captions: [
    { t: 0.6, dur: 3.2, text: 'Painel do administrador', accent: '🧑‍🏫' },
    { t: (17.1 - from) / rate, dur: 3, text: 'Sala criada! O código vai pra turma', accent: '🔑' },
    { t: (22.6 - from) / rate, dur: 2.6, text: 'Todo mundo dentro? Iniciar partida!', accent: '🚀' },
  ],
  zooms: [{ at: 0, x: 960, y: 380, s: 1.4 }, { at: (17.4 - from) / rate, to: (21.5 - from) / rate, x: 1470, y: 170, s: 2.1 }],
  sfx: [[(16.8 - from) / rate, 'pop'], [(23.6 - from) / rate, 'tada']],
})

const CREATE = (rate = 1.8, from = 9.6, to = 34.8) => clip({
  src: 'player.webm', from, to, rate, hue: C.pink,
  sticker: { text: 'Quem é você?', color: C.pink, ink: '#fff', n: '2' },
  captions: [
    { t: 0.5, dur: 4.6, text: 'Cada personagem tem a sua cor', accent: '🎨' },
    { t: (27.2 - from) / rate, dur: 2.2, text: 'Escolha um dom', accent: '✨' },
    { t: (31.1 - from) / rate, dur: 2.2, text: 'Sua carteira profissional', accent: '🪪' },
  ],
  zooms: [{ at: 0.3, to: (19.6 - from) / rate, x: 760, y: 300, s: 1.7 }],
  sfx: [[(20.3 - from) / rate, 'pop'], [(27.9 - from) / rate, 'sparkle'], [(32.8 - from) / rate, 'tada']],
})

const JANUARY = clip({
  src: 'player.webm', from: 35, to: 56, rate: 2.4, hue: C.green,
  sticker: { text: 'Janeiro: o mês de aprender', color: C.green, ink: '#fff' },
  captions: [{ t: 1.6, dur: 6.6, text: 'Um tour mostra cada canto da tela', accent: '🗺️' }],
  sfx: [[0.3, 'sparkle']],
})

const DILEMMA = (rate = 1.5, from = 56.2, to = 65.5) => clip({
  src: 'player.webm', from, to, rate, hue: C.yellow,
  sticker: { text: 'Abra a carta do dilema', color: C.yellow, n: '1' },
  captions: [{ t: 0.4, dur: (to - from) / rate - 0.8, text: 'Não tem resposta certa. Toda escolha tem consequência.', accent: '✉️' }],
  zooms: [{ at: 0.2, x: 960, y: 520, s: 1.3 }],
  sfx: [[0.1, 'page'], [(60.3 - from) / rate, 'pop'], [(64.1 - from) / rate, 'sparkle']],
})

const LEISURE = clip({
  src: 'player.webm', from: 66.6, to: 76.2, rate: 2, hue: C.pink,
  sticker: { text: 'Escolha o lazer', color: '#EC4899', ink: '#fff', n: '2' },
  captions: [{ t: 0.5, dur: 4, text: 'Descansar também é parte do orçamento', accent: '🎡' }],
  sfx: [[2.0, 'coin']],
})

const BILLS = (rate = 2.6, from = 76.4, to = 99.5) => clip({
  src: 'player.webm', from, to, rate, hue: C.green,
  sticker: { text: 'Pague as três contas', color: C.green, ink: '#fff', n: '3' },
  captions: [
    { t: 0.4, dur: (94.4 - from) / rate - 0.6, text: 'Conta esquecida vira conta atrasada, com juros', accent: '🧾' },
    { t: (94.7 - from) / rate, dur: 2.6, text: 'Conquista: mês em dia!', accent: '🏅', color: C.ink, ink: '#fff' },
  ],
  sfx: [[(79.2 - from) / rate, 'coin'], [(86.8 - from) / rate, 'coin'], [(94.4 - from) / rate, 'coin'], [(94.9 - from) / rate, 'win']],
  coins: [[(94.4 - from) / rate, [960, 560], [140, 300]]],
})

const HUD = (rate = 1.3) => clip({
  src: 'hud.webm', from: 5.0, to: 13.6, rate, hue: C.pink,
  sticker: { text: 'A barra é sua', color: '#fff', x: 760 },
  captions: [
    { t: 0.3, dur: (9.4 - 5.0) / rate - 0.3, text: 'Patrimônio igual ao do banco, com o gráfico do ano', accent: '📊' },
    { t: (9.4 - 5.0) / rate, dur: (12.2 - 9.4) / rate, text: 'Tarefas do mês e quem da turma já terminou', accent: '✅' },
    { t: (12.2 - 5.0) / rate, dur: (13.6 - 12.2) / rate, text: 'Pontos para gastar', accent: '⭐' },
  ],
  zooms: [{ at: 0.6 / rate, x: 330, y: 480, s: 1.6 }],
  sfx: [[0.1, 'swoosh'], [(12.4 - 5.0) / rate, 'sparkle']],
})

const BANK = (rate = 2, from = 105.3, to = 119.5) => clip({
  src: 'player.webm', from, to, rate, hue: C.teal,
  sticker: { text: 'Guarde o que sobrar', color: C.teal, ink: '#fff', n: '4' },
  captions: [{ t: 0.5, dur: (to - from) / rate - 1, text: 'No Banco Maré o dinheiro parado rende', accent: '🏦' }],
  zooms: [{ at: (110 - from) / rate, x: 1000, y: 760, s: 1.45 }],
  sfx: [[(116 - from) / rate, 'coin'], [(116.4 - from) / rate, 'win']],
})

const TURN = (from = 122.6, to = 136) => clip({
  src: 'player.webm', from, to, rate: 1, hue: '#3B4BA8',
  sticker: { text: 'O professor vira o mês', color: '#3B4BA8', ink: '#fff', n: '5' },
  captions: [
    { t: Math.max(0.3, 123.9 - from), dur: 1.6, text: 'Encerrar mês', accent: '✅' },
    { t: 125.9 - from, dur: 2.6, text: 'A cidade anoitece…', accent: '🌙' },
    { t: 128.6 - from, dur: 2.8, text: 'Salário caiu! Moedas pra conta', accent: '💰' },
    { t: 131.9 - from, dur: to - 131.9 - 0.4, text: 'E o resumo mostra tudo o que aconteceu', accent: '📜' },
  ],
  sfx: [[Math.max(0.2, 124.1 - from), 'pop'], [125.7 - from, 'whoosh'], [127 - from, 'rip'], [127.9 - from, 'bell'], [128.7 - from, 'coin'], [129.1 - from, 'coin'], [129.5 - from, 'coin'], [132 - from, 'pop']],
  coins: [[128.7 - from, [960, 560], [70, 180]]],
})

const SKILLS = (rate = 1.5, from = 142.2, to = 153) => clip({
  src: 'player.webm', from, to, rate, hue: C.purple,
  sticker: { text: 'Cada dilema vira um ponto', color: C.purple, ink: '#fff' },
  captions: [{ t: 0.5, dur: (to - from) / rate - 1, text: 'Pontos viram habilidades na Universidade', accent: '⭐' }],
  sfx: [[(149.6 - from) / rate, 'tada'], [(149.7 - from) / rate, 'sparkle']],
  confetti: [(149.6 - from) / rate],
})

const NOTEBOOK = clip({
  src: 'player.webm', from: 153.6, to: 165.5, rate: 2, hue: C.blue,
  sticker: { text: 'O caderninho', color: C.blue, ink: '#fff' },
  captions: [{ t: 0.6, dur: 4.8, text: 'CDB, Selic, inflação… tudo explicado', accent: '📘' }],
  sfx: [[0.45, 'page'], [2.2, 'page'], [3.45, 'page']],
})

const HOWTO = clip({
  src: 'player.webm', from: 165.7, to: 176, rate: 2.2, hue: C.red,
  sticker: { text: 'Ficou com dúvida?', color: C.red, ink: '#fff' },
  captions: [{ t: 0.5, dur: 3.8, text: 'O ? vermelho ensina em 5 passos', accent: '❓' }],
  sfx: [[0.4, 'pop'], [1.7, 'page'], [2.9, 'page']],
})

const FINISHED = (rate = 1, from = 5, to = 13.7) => clip({
  src: 'finished.webm', from, to, rate, hue: C.yellow,
  sticker: { text: 'Dezembro: fechou o ano!', color: C.yellow, n: '12' },
  captions: [{ t: 0.8, dur: (to - from) / rate - 1.4, text: 'Vence quem terminar com mais patrimônio', accent: '🏆' }],
  sfx: [[0.3, 'tada']],
  confetti: [0.3],
})

export const FULL = [
  { kind: 'intro', dur: 6 },
  ADMIN(),
  CREATE(),
  JANUARY,
  { kind: 'chapter', dur: 2.2, text: 'Todo mês, 4 coisas', color: C.yellow },
  DILEMMA(),
  LEISURE,
  BILLS(),
  HUD(),
  BANK(),
  TURN(),
  SKILLS(),
  NOTEBOOK,
  HOWTO,
  FINISHED(),
  { kind: 'outro', dur: 7.5 },
]

export const SHORT = [
  { kind: 'intro', dur: 3.6, fast: true },
  ADMIN(4.2, 12, 26.5),
  CREATE(2.8, 9.8, 22),
  DILEMMA(2, 58, 65),
  BILLS(3.4, 84, 99.5),
  HUD(2.4),
  BANK(3.2, 108, 119),
  TURN(124.6, 131.8),
  SKILLS(2, 145, 152.5),
  FINISHED(2, 5, 13),
  { kind: 'outro', dur: 5 },
].map((s) => (s.captions ? { ...s, captions: s.captions.slice(0, s.kind === 'clip' && s.src === 'player.webm' && s.from > 120 && s.from < 125 ? 3 : 2) } : s))

export const totalSeconds = (plan) => plan.reduce((a, s) => a + s.dur, 0)
