// Roteiro dos dois vídeos. Cada trecho de jogo: arquivo, de/até (segundos da
// gravação), velocidade, adesivo de título, legendas, zoom e sons (em segundos
// do trecho já acelerado).
import { C } from './parts'

const clip = (o) => ({ kind: 'clip', ...o, dur: (o.to - o.from) / (o.rate ?? 1) })

const ADMIN = (rate = 1.3, from = 10.6, to = 34.5) => clip({
  src: 'admin.webm', from, to, rate, hue: '#F2B53A',
  sticker: { text: 'O professor cria a sala', color: C.yellow, n: '1' },
  captions: [
    { t: 0.6, dur: (19.4 - from) / rate - 0.8, text: 'Painel do professor: nome da turma e minutos por mês', accent: '🧑‍🏫' },
    { t: (19.8 - from) / rate, dur: 3.2, text: 'Sala criada! O código vai pra turma', accent: '🔑' },
    { t: (25.3 - from) / rate, dur: 2.6, text: 'Todo mundo dentro? Iniciar partida!', accent: '🚀' },
    { t: (29.4 - from) / rate, dur: (to - 29.4) / rate - 0.4, text: 'O relógio do mês começa. Dá pra pausar no fim da aula', accent: '⏱️' },
  ],
  zooms: [
    { at: 0, x: 960, y: 380, s: 1.3 },
    { at: (20 - from) / rate, to: (24.4 - from) / rate, x: 1470, y: 170, s: 2.1 },
    { at: (29.4 - from) / rate, x: 960, y: 360, s: 1.7 },
  ],
  sfx: [[(19.5 - from) / rate, 'pop'], [(28.8 - from) / rate, 'tada']],
})

const CREATE = (rate = 1.6, from = 11.6, to = 39.5) => clip({
  src: 'player.webm', from, to, rate, hue: C.pink,
  sticker: { text: 'Quem é você?', color: C.pink, ink: '#fff', n: '2' },
  captions: [
    { t: 0.5, dur: (23.7 - from) / rate - 0.8, text: 'Cada personagem tem a sua cor', accent: '🎨' },
    { t: (31.6 - from) / rate, dur: 2.4, text: 'Escolha um dom', accent: '✨' },
    { t: (35.7 - from) / rate, dur: (to - 35.7) / rate - 0.3, text: 'Sua carteira profissional', accent: '🪪' },
  ],
  zooms: [{ at: 0.3, to: (23.4 - from) / rate, x: 760, y: 300, s: 1.6 }],
  sfx: [[(24.2 - from) / rate, 'pop'], [(32 - from) / rate, 'sparkle'], [(37.5 - from) / rate, 'tada']],
})

const JANUARY = (rate = 2, from = 39.6, to = 63.8) => clip({
  src: 'player.webm', from, to, rate, hue: C.green,
  sticker: { text: 'Janeiro: o mês de aprender', color: C.green, ink: '#fff' },
  captions: [
    { t: 0.4, dur: (43.6 - from) / rate - 0.5, text: 'O salário cai e o aluguel já sai', accent: '💸' },
    { t: (44 - from) / rate, dur: (to - 44) / rate - 0.5, text: 'Um tour mostra cada canto da tela', accent: '🗺️' },
  ],
  zooms: [{ at: 0.2, to: (43.4 - from) / rate, x: 960, y: 520, s: 1.5 }],
  sfx: [[0.3, 'sparkle']],
})

const TIMER = clip({
  src: 'player.webm', from: 63.8, to: 67.3, rate: 1, hue: C.red,
  sticker: { text: 'Cada mês tem um relógio', color: C.red, ink: '#fff' },
  captions: [{ t: 0.3, dur: 3, text: '10 minutos para fazer tudo. Acabou o tempo, o mês fecha', accent: '⏱️' }],
  zooms: [{ at: 0.4, x: 1700, y: 170, s: 2.2 }],
  sfx: [[0.4, 'click']],
})

const LEISURE = (rate = 1.5, from = 67.4, to = 80) => clip({
  src: 'player.webm', from, to, rate, hue: C.pink,
  sticker: { text: 'Escolha o lazer', color: '#EC4899', ink: '#fff', n: '1' },
  captions: [{ t: 0.5, dur: (to - from) / rate - 1, text: 'Descansar também é parte do orçamento', accent: '🎡' }],
  sfx: [[(70.5 - from) / rate, 'coin']],
})

const BILLS = (rate = 2.3, from = 80.2, to = 110.8) => clip({
  src: 'player.webm', from, to, rate, hue: C.green,
  sticker: { text: 'Pague as três contas', color: C.green, ink: '#fff', n: '2' },
  captions: [
    { t: 0.4, dur: (108.3 - from) / rate - 0.6, text: 'Conta esquecida vira conta atrasada, com juros', accent: '🧾' },
    { t: (108.6 - from) / rate, dur: (to - 108.6) / rate, text: 'Conquista: mês em dia!', accent: '🏅', color: C.ink, ink: '#fff' },
  ],
  sfx: [[(83 - from) / rate, 'coin'], [(92.5 - from) / rate, 'coin'], [(102 - from) / rate, 'coin'], [(108.6 - from) / rate, 'win']],
  coins: [[(108.4 - from) / rate, [960, 560], [140, 300]]],
})

const HUD = (rate = 1.1, from = 5.0, to = 15.2) => clip({
  src: 'hud.webm', from, to, rate, hue: C.pink,
  sticker: { text: 'A barra é sua', color: '#fff', x: 760 },
  captions: [
    { t: 0.3, dur: (9.8 - from) / rate - 0.3, text: 'Patrimônio igual ao do banco, com o gráfico do ano', accent: '📊' },
    { t: (9.8 - from) / rate, dur: (13 - 9.8) / rate, text: 'O relógio, as tarefas do mês e quem da turma já encerrou', accent: '⏱️' },
    { t: (13 - from) / rate, dur: (to - 13) / rate, text: 'Pontos para gastar na árvore', accent: '🌳' },
  ],
  zooms: [{ at: 0.6 / rate, x: 330, y: 480, s: 1.6 }],
  sfx: [[0.1, 'swoosh'], [(13.2 - from) / rate, 'sparkle']],
})

const BANK = (rate = 1.6, from = 114.9, to = 131) => clip({
  src: 'player.webm', from, to, rate, hue: C.teal,
  sticker: { text: 'Guarde o que sobrar', color: C.teal, ink: '#fff', n: '3' },
  captions: [{ t: 0.5, dur: (to - from) / rate - 1, text: 'No Inabank, o dinheiro investido rende', accent: '🏦' }],
  zooms: [{ at: (120 - from) / rate, x: 1000, y: 760, s: 1.45 }],
  sfx: [[(126 - from) / rate, 'coin'], [(126.4 - from) / rate, 'win']],
})

const CLOSE = (rate = 1.2, from = 132.3, to = 141.1) => clip({
  src: 'player.webm', from, to, rate, hue: '#3B4BA8',
  sticker: { text: 'Encerre o mês', color: '#3B4BA8', ink: '#fff', n: '4' },
  captions: [{ t: 0.4, dur: (to - from) / rate - 0.8, text: 'O pop-up mostra o que falta. Depois, a cidade fecha', accent: '✅' }],
  zooms: [{ at: (135 - from) / rate, x: 960, y: 560, s: 1.4 }],
  sfx: [[(134.2 - from) / rate, 'pop'], [(139.5 - from) / rate, 'bell']],
})

const DILEMMA = (rate = 1.5, from = 141.2, to = 163) => clip({
  src: 'player.webm', from, to, rate, hue: C.yellow,
  sticker: { text: 'O dilema chega no fim', color: C.yellow, n: '5' },
  captions: [
    { t: 0.4, dur: (149 - from) / rate, text: 'Com relógio próprio. E dá pra olhar o banco antes', accent: '✉️' },
    { t: (149.5 - from) / rate, dur: (to - 149.5) / rate - 0.6, text: 'Não tem resposta certa. Toda escolha tem consequência', accent: '⚖️' },
  ],
  zooms: [{ at: 0.3, to: (149 - from) / rate, x: 960, y: 420, s: 1.5 }],
  sfx: [[0.1, 'page'], [(154.5 - from) / rate, 'pop'], [(158.6 - from) / rate, 'sparkle']],
})

const TURN = (from = 163, to = 178.4) => clip({
  src: 'player.webm', from, to, rate: 1, hue: '#3B4BA8',
  sticker: { text: 'O mês vira sozinho', color: '#3B4BA8', ink: '#fff' },
  captions: [
    { t: 0.3, dur: 166.1 - from - 0.3, text: 'A cidade espera a turma terminar', accent: '⏳' },
    { t: 166.1 - from, dur: 3, text: 'Anoitece… a folha do mês cai', accent: '🌙' },
    { t: 169.2 - from, dur: 3, text: 'Salário caiu! Moedas pra conta', accent: '💰' },
    { t: 172.3 - from, dur: to - 172.3 - 0.4, text: 'E o resumo mostra tudo o que aconteceu', accent: '📜' },
  ],
  sfx: [[166.2 - from, 'whoosh'], [167.4 - from, 'rip'], [168.3 - from, 'bell'], [169.2 - from, 'coin'], [169.6 - from, 'coin'], [170 - from, 'coin'], [172.4 - from, 'pop']],
  coins: [[169.2 - from, [960, 560], [70, 180]]],
})

const SKILLS = (rate = 1.2, from = 179.3, to = 190.6) => clip({
  src: 'player.webm', from, to, rate, hue: C.green,
  sticker: { text: 'Árvore de habilidades', color: C.green, ink: '#fff' },
  captions: [{ t: 0.5, dur: (to - from) / rate - 1, text: 'Cada dilema vale 1 ponto. Pontos viram vantagens para o ano todo', accent: '🌳' }],
  sfx: [[(186.7 - from) / rate, 'tada'], [(186.8 - from) / rate, 'sparkle']],
  confetti: [(186.7 - from) / rate],
})

const NOTEBOOK = (rate = 1.7, from = 191.2, to = 204.6) => clip({
  src: 'player.webm', from, to, rate, hue: C.blue,
  sticker: { text: 'O caderninho', color: C.blue, ink: '#fff' },
  captions: [{ t: 0.6, dur: (to - from) / rate - 1, text: 'CDB, Selic, juros compostos… tudo explicado', accent: '📘' }],
  sfx: [[0.6, 'page'], [(195.2 - from) / rate, 'page'], [(197.8 - from) / rate, 'page']],
})

const HOWTO = (rate = 1.7, from = 204.8, to = 218) => clip({
  src: 'player.webm', from, to, rate, hue: C.red,
  sticker: { text: 'Ficou com dúvida?', color: C.red, ink: '#fff' },
  captions: [{ t: 0.5, dur: (to - from) / rate - 1, text: 'O ponto de interrogação vermelho ensina passo a passo', accent: '❓' }],
  sfx: [[0.4, 'pop'], [(207.5 - from) / rate, 'page'], [(209.3 - from) / rate, 'page']],
})

const FINISHED = (rate = 1, from = 5, to = 14) => clip({
  src: 'finished.webm', from, to, rate, hue: C.yellow,
  sticker: { text: 'Dezembro: fechou o ano!', color: C.yellow, n: '12' },
  captions: [{ t: 0.8, dur: (to - from) / rate - 1.4, text: 'Cada um vê o próprio ano: patrimônio, escolhas e conquistas', accent: '🏆' }],
  sfx: [[0.3, 'tada']],
  confetti: [0.3],
})

export const FULL = [
  { kind: 'intro', dur: 8 },
  ADMIN(),
  CREATE(),
  JANUARY(),
  TIMER,
  { kind: 'chapter', dur: 2.6, text: 'Todo mês, 5 passos', color: C.yellow },
  LEISURE(),
  BILLS(),
  HUD(),
  BANK(),
  CLOSE(),
  DILEMMA(),
  TURN(),
  SKILLS(),
  NOTEBOOK(),
  HOWTO(),
  FINISHED(),
  { kind: 'outro', dur: 8 },
]

const firstCaptions = (seg, n) => (seg.captions ? { ...seg, captions: seg.captions.slice(0, n) } : seg)

export const SHORT = [
  { kind: 'intro', dur: 4.5, fast: true },
  firstCaptions(ADMIN(3.4, 19, 34), 2),
  firstCaptions(CREATE(3.2, 14, 30), 1),
  TIMER,
  firstCaptions(BILLS(4, 92, 110.8), 2),
  firstCaptions(BANK(3.2, 119, 130), 1),
  firstCaptions(DILEMMA(3, 143, 158.6), 1),
  { ...TURN(166, 173.5), captions: TURN(166, 173.5).captions.slice(1, 3) },
  firstCaptions(SKILLS(2.2, 182, 190), 1),
  firstCaptions(FINISHED(2, 5, 13), 1),
  { kind: 'outro', dur: 5 },
]

export const totalSeconds = (plan) => plan.reduce((a, s) => a + s.dur, 0)
