// Roteiro dos dois vídeos. Cada trecho de jogo: arquivo, de/até (segundos da
// gravação), velocidade, adesivo de título, legendas, zoom e sons.
// Os tempos saem das marcações das gravações (src/markers.json, escrito por
// scripts/record.mjs e scripts/record-hud.mjs): regravou, o roteiro acompanha.
// Dentro de cada trecho, T(s) converte um segundo da gravação para o segundo
// do trecho já acelerado; span(a, b) é a duração entre dois desses momentos.
import { C } from './parts'
import M from './markers.json'

const A = M.admin
const P = M.player
const H = M.hud
const F = M.finished

// trecho de jogo: `build` recebe T e span e devolve legendas, zoom e sons
const clip = (src, from, to, rate, build) => {
  const T = (s) => Math.max(0, (s - from) / rate)
  const span = (a, b) => Math.max(0.6, (Math.min(b, to) - Math.max(a, from)) / rate)
  return { kind: 'clip', src, from, to, rate, dur: (to - from) / rate, ...build(T, span, to) }
}

const ADMIN = (rate = 1.4, from = A.panel - 0.8, to = A.clock + 1.4) => clip('admin.webm', from, to, rate, (T, span) => ({
  hue: '#F2B53A',
  sticker: { text: 'O professor cria a sala', color: C.yellow, n: '1' },
  captions: [
    { t: 0.6, dur: span(from, A.roomCreated) - 0.8, text: 'Painel do professor: nome da turma e minutos por mês', accent: '🧑‍🏫' },
    { t: T(A.roomCreated + 0.2), dur: 3, text: 'Sala criada! O código vai pra turma', accent: '🔑' },
    { t: T(A.playersIn), dur: 2.6, text: 'Todo mundo dentro? Iniciar partida!', accent: '🚀' },
    { t: T(A.started + 0.6), dur: span(A.started + 0.6, to) - 0.4, text: 'O relógio do mês começa. Dá pra pausar no fim da aula', accent: '⏱️' },
  ],
  zooms: [
    { at: 0, x: 960, y: 380, s: 1.3 },
    { at: T(A.roomCreated + 0.4), to: T(A.playersIn - 0.6), x: 1470, y: 170, s: 2.1 },
    { at: T(A.started + 0.6), x: 960, y: 360, s: 1.7 },
  ],
  sfx: [[T(A.roomCreated - 0.1), 'pop'], [T(A.started - 0.4), 'tada']],
}))

const CREATE = (rate = 2.2, from = P.create - 2.4, to = P.januarySummary - 0.4) => clip('player.webm', from, to, rate, (T, span) => ({
  hue: C.pink,
  sticker: { text: 'Quem é você?', color: C.pink, ink: '#fff', n: '2' },
  captions: [
    { t: 0.5, dur: span(from, P.pickAvatar) - 0.8, text: 'Cada personagem tem a sua cor', accent: '🎨' },
    { t: T(P.gift), dur: 2.4, text: 'Escolha um dom', accent: '✨' },
    { t: T(P.card), dur: span(P.card, to) - 0.3, text: 'Sua carteira profissional', accent: '🪪' },
  ],
  zooms: [{ at: 0.3, to: T(P.pickAvatar - 0.3), x: 760, y: 300, s: 1.6 }],
  sfx: [[T(P.pickAvatar + 0.5), 'pop'], [T(P.gift + 0.4), 'sparkle'], [T(P.card + 1.6), 'tada']],
}))

const JANUARY = (rate = 2.8, from = P.januarySummary - 0.2, to = P.timer) => clip('player.webm', from, to, rate, (T, span) => ({
  hue: C.green,
  sticker: { text: 'Janeiro: o mês de aprender', color: C.green, ink: '#fff' },
  captions: [
    { t: 0.3, dur: span(from, P.tour) - 0.4, text: 'Salário de R$ 7.000 brutos: INSS e IR saem, o aluguel também', accent: '🧾' },
    { t: T(P.tour + 0.2), dur: span(P.tour, to) - 0.5, text: 'Um tour mostra cada canto da tela', accent: '🗺️' },
  ],
  zooms: [{ at: 0.2, to: T(P.tour - 0.6), x: 960, y: 470, s: 1.9 }],
  sfx: [[0.3, 'sparkle']],
}))

const TIMER = clip('player.webm', P.timer, P.town, 1, () => ({
  hue: C.red,
  sticker: { text: 'Cada mês tem um relógio', color: C.red, ink: '#fff' },
  captions: [{ t: 0.2, dur: P.town - P.timer - 0.3, text: 'Ele fica no canto. Acabou o tempo, o mês fecha', accent: '⏱️' }],
  zooms: [{ at: 0.3, x: 1720, y: 120, s: 2.2 }],
  sfx: [[0.4, 'click']],
}))

const TOWN = (rate = 1.8, from = P.town, to = P.leisure) => clip('player.webm', from, to, rate, (T, span) => ({
  hue: C.teal,
  sticker: { text: 'Uma cidade viva', color: C.teal, ink: '#fff' },
  captions: [
    { t: 0.3, dur: span(from, from + 9) - 0.3, text: 'Cada prédio tem a sua plaquinha. O "!" mostra o que falta', accent: '🏙️' },
    { t: T(from + 9.2), dur: span(from + 9.2, to) - 0.3, text: 'Os painéis abrem e fecham para ver a cidade inteira', accent: '🧭' },
  ],
  zooms: [{ at: 0.2, to: T(from + 9), x: 1000, y: 420, s: 1.25 }],
  sfx: [[T(from + 9.5), 'swoosh'], [T(from + 11.5), 'swoosh']],
}))

const LEISURE = (rate = 1.9, from = P.leisure, to = P.bills) => clip('player.webm', from, to, rate, (T, span) => ({
  hue: C.pink,
  sticker: { text: 'Escolha o lazer', color: '#EC4899', ink: '#fff', n: '1' },
  captions: [
    { t: 0.3, dur: 2.2, text: 'Clicou no prédio, a câmera chega perto', accent: '🎪' },
    { t: 2.7, dur: span(from, to) - 3.4, text: 'Descansar também é parte do orçamento', accent: '🎡' },
  ],
  zooms: [{ at: 0, to: 1.6, x: 1305, y: 640, s: 1.35 }],
  sfx: [[0.2, 'click'], [T(to - 4.5), 'coin']],
}))

const BILLS = (rate = 3, from = P.bills, to = P.monthClean + 2.4) => clip('player.webm', from, to, rate, (T, span) => ({
  hue: C.green,
  sticker: { text: 'Pague as três contas', color: C.green, ink: '#fff', n: '2' },
  captions: [
    { t: 0.4, dur: span(from, P.monthClean - 1) - 0.6, text: 'Pagou? O prédio ganha a faixa PAGO', accent: '🧾' },
    { t: T(P.monthClean - 0.8), dur: span(P.monthClean - 0.8, to), text: 'Conquista: mês em dia!', accent: '🏅', color: C.ink, ink: '#fff' },
  ],
  sfx: [[T(from + 5), 'coin'], [T(from + 17), 'coin'], [T(from + 29), 'coin'], [T(P.monthClean - 0.8), 'win']],
  coins: [[T(P.monthClean - 1), [960, 560], [140, 300]]],
}))

const HUD = (rate = 1.2, from = H.open - 0.6, to = H.chart) => clip('hud.webm', from, to, rate, (T, span) => ({
  hue: C.pink,
  sticker: { text: 'A barra é sua', color: '#fff', x: 760 },
  captions: [
    { t: 0.3, dur: span(from, H.open + 5) - 0.3, text: 'Patrimônio, as tarefas do mês e quem da turma já encerrou', accent: '📊' },
    { t: T(H.open + 5.2), dur: span(H.open + 5.2, to) - 0.2, text: 'O selo mostra os pontos para gastar na árvore', accent: '🌳' },
  ],
  zooms: [{ at: 0.6 / rate, x: 330, y: 420, s: 1.6 }],
  sfx: [[0.1, 'swoosh'], [T(H.open + 5.4), 'sparkle']],
}))

const CHART = (rate = 1.9, from = H.chart, to = H.chart + 18) => clip('hud.webm', from, to, rate, (T, span) => ({
  hue: C.blue,
  sticker: { text: 'O gráfico do ano', color: C.blue, ink: '#fff' },
  captions: [{ t: 0.4, dur: span(from, to) - 0.8, text: 'Clique no patrimônio: o ano inteiro, mês a mês', accent: '📈' }],
  zooms: [{ at: T(from + 2), x: 900, y: 420, s: 1.35 }],
  sfx: [[T(from + 0.9), 'pop']],
}))

const BANK = (rate = 2.2, from = P.bank, to = P.bankDone) => clip('player.webm', from, to, rate, (T, span) => ({
  hue: C.teal,
  sticker: { text: 'Guarde o que sobrar', color: C.teal, ink: '#fff', n: '3' },
  captions: [
    { t: 0.4, dur: span(from, P.box) - 0.6, text: 'O Inabank: o olhinho esconde os valores', accent: '🏦' },
    { t: T(P.box), dur: span(P.box, P.stocks) - 0.3, text: 'Sete caixinhas. A LCI rende sem IR, mas prende o dinheiro 6 meses', accent: '🔒' },
    { t: T(P.stocks), dur: span(P.stocks, P.statement) - 0.3, text: 'Ações: escolha a quantidade e compre', accent: '📈' },
    { t: T(P.statement), dur: span(P.statement, to) - 0.3, text: 'O extrato separa entradas e saídas, com horário', accent: '📃' },
  ],
  zooms: [
    { at: T(P.box + 1.5), to: T(P.stocks - 0.6), x: 960, y: 520, s: 1.45 },
    { at: T(P.statement + 1.5), x: 1100, y: 640, s: 1.3 },
  ],
  sfx: [[T(P.box + 5), 'coin'], [T(P.box + 5.4), 'win'], [T(P.stocks + 5), 'coin']],
}))

const CLOSE = (rate = 1.5, from = P.coin, to = P.dilemma) => clip('player.webm', from, to, rate, (T, span) => ({
  hue: '#3B4BA8',
  sticker: { text: 'Encerre o mês', color: '#3B4BA8', ink: '#fff', n: '4' },
  captions: [
    { t: 0.3, dur: span(from, P.close) - 0.3, text: 'Com dinheiro investido, a moeda do banco gira', accent: '🪙' },
    { t: T(P.close + 0.2), dur: span(P.close, to) - 0.6, text: 'O pop-up mostra o que falta. Depois, a cidade fecha', accent: '✅' },
  ],
  zooms: [{ at: 0, to: T(P.close - 0.4), x: 1010, y: 170, s: 1.8 }, { at: T(P.close + 2), x: 960, y: 560, s: 1.4 }],
  sfx: [[T(P.close + 1.6), 'pop'], [T(to - 1.5), 'bell']],
}))

const DILEMMA = (rate = 2.2, from = P.dilemma, to = P.waiting) => clip('player.webm', from, to, rate, (T, span) => ({
  hue: C.yellow,
  sticker: { text: 'O dilema chega no fim', color: C.yellow, n: '5' },
  captions: [
    { t: 0.4, dur: span(from, P.dilemmaBank) - 0.4, text: 'Com relógio próprio. Toda escolha tem consequência', accent: '✉️' },
    { t: T(P.dilemmaBank + 0.6), dur: span(P.dilemmaBank + 0.6, P.dilemmaResult - 3), text: '"Acessar o banco" divide a tela: banco de um lado, carta do outro', accent: '🏦' },
    { t: T(P.dilemmaResult - 1.8), dur: span(P.dilemmaResult - 1.8, to) - 0.4, text: 'Respondeu? +1 ponto para a árvore', accent: '⭐' },
  ],
  zooms: [{ at: 0.3, to: T(P.dilemmaBank), x: 960, y: 420, s: 1.5 }],
  sfx: [[0.1, 'page'], [T(P.dilemmaBank + 0.8), 'swoosh'], [T(P.dilemmaResult - 1.8), 'pop'], [T(P.dilemmaResult - 1.2), 'sparkle']],
}))

const TURN = (from = P.scene - 1.5, to = P.summary + 6.8, rate = 1) => clip('player.webm', from, to, rate, (T, span) => ({
  hue: '#3B4BA8',
  sticker: { text: 'O mês vira sozinho', color: '#3B4BA8', ink: '#fff' },
  captions: [
    { t: 0.2, dur: span(from, P.scene) - 0.2, text: 'A cidade espera a turma terminar', accent: '⏳' },
    { t: T(P.scene), dur: span(P.scene, P.summary) - 0.2, text: 'Carimbo de FECHADO e a folha do mês é arrancada', accent: '📅' },
    { t: T(P.summary), dur: span(P.summary, to) - 0.3, text: 'O holerite: salário bruto, INSS, IR, aluguel e imprevistos', accent: '🧾' },
  ],
  zooms: [{ at: T(P.summary + 0.8), x: 960, y: 560, s: 1.55 }],
  sfx: [[T(P.scene), 'whoosh'], [T(P.scene + 1.2), 'rip'], [T(P.scene + 2.2), 'bell'], [T(P.summary - 1), 'coin'], [T(P.summary - 0.6), 'coin'], [T(P.summary), 'pop']],
  coins: [[T(P.summary - 1), [960, 560], [70, 180]]],
}))

const SKILLS = (rate = 1.8, from = P.skills + 0.6, to = P.notebook - 1) => clip('player.webm', from, to, rate, (T, span) => ({
  hue: C.green,
  sticker: { text: 'Árvore de habilidades', color: C.green, ink: '#fff' },
  captions: [
    { t: 0.5, dur: span(from, P.confetti) - 0.6, text: 'Cada dilema vale 1 ponto. Pontos viram vantagens', accent: '🌳' },
    { t: T(P.confetti + 0.3), dur: span(P.confetti + 0.3, P.confetti + 3.4), text: 'Primeira habilidade!', accent: '🎉', color: C.ink, ink: '#fff' },
    { t: T(P.treeMap), dur: span(P.treeMap, to) - 0.3, text: 'E a árvore do mapa cresce junto', accent: '🌱' },
  ],
  zooms: [{ at: T(P.treeMap + 0.3), x: 1000, y: 440, s: 1.6 }],
  sfx: [[T(P.confetti), 'tada'], [T(P.confetti + 0.1), 'sparkle']],
  confetti: [T(P.confetti)],
}))

const NOTEBOOK = (rate = 2, from = P.notebook, to = P.howto) => clip('player.webm', from, to, rate, (T, span) => ({
  hue: C.blue,
  sticker: { text: 'O caderninho', color: C.blue, ink: '#fff' },
  captions: [{ t: 0.6, dur: span(from, to) - 1, text: 'Abre a capa e pronto: CDB, Selic, juros compostos… tudo explicado', accent: '📘' }],
  sfx: [[0.4, 'page'], [T(from + 4.2), 'page'], [T(from + 6.4), 'page']],
}))

const HOWTO = (rate = 2.2, from = P.howto, to = P.end) => clip('player.webm', from, to, rate, (T, span) => ({
  hue: C.red,
  sticker: { text: 'Ficou com dúvida?', color: C.red, ink: '#fff' },
  captions: [{ t: 0.5, dur: span(from, to) - 1, text: 'O ponto de interrogação vermelho ensina passo a passo', accent: '❓' }],
  sfx: [[0.4, 'pop'], [T(from + 3), 'page'], [T(from + 5.2), 'page']],
}))

const FINISHED = (rate = 1.2, from = F.finished - 0.5, to = F.end) => clip('finished.webm', from, to, rate, (T, span) => ({
  hue: C.yellow,
  sticker: { text: 'Dezembro: fechou o ano!', color: C.yellow, n: '12' },
  captions: [
    { t: 0.6, dur: span(from, F.scroll) - 0.6, text: 'O pódio da turma e você comparado com o melhor da sala', accent: '🏆' },
    { t: T(F.scroll + 0.3), dur: span(F.scroll + 0.3, to) - 0.6, text: 'O ano mês a mês e as decisões que mais pesaram', accent: '📊' },
  ],
  zooms: [{ at: 0.2, to: T(F.scroll - 0.4), x: 960, y: 330, s: 1.35 }],
  sfx: [[0.3, 'tada']],
  confetti: [0.3],
}))

export const FULL = [
  { kind: 'intro', dur: 8 },
  ADMIN(),
  CREATE(),
  JANUARY(),
  TIMER,
  TOWN(),
  { kind: 'chapter', dur: 2.6, text: 'Todo mês, 5 passos', color: C.yellow },
  LEISURE(),
  BILLS(),
  HUD(),
  CHART(),
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

const firstCaptions = (seg, n, from = 0) => (seg.captions ? { ...seg, captions: seg.captions.slice(from, from + n) } : seg)

export const SHORT = [
  { kind: 'intro', dur: 4.5, fast: true },
  firstCaptions(ADMIN(3.8, A.roomCreated - 0.6, A.clock), 2),
  firstCaptions(CREATE(3.4, P.create + 1, P.januarySummary - 0.4), 1),
  firstCaptions(TOWN(3.2, P.town, P.town + 9), 1),
  firstCaptions(LEISURE(2.2, P.leisure, P.leisure + 4), 1),
  firstCaptions(BILLS(4.5, P.bills + 24, P.monthClean + 2.4), 2),
  firstCaptions(BANK(3.6, P.box - 0.5, P.stocks + 6), 2, 1),
  firstCaptions(DILEMMA(3.6, P.dilemmaBank - 2, P.dilemmaResult + 1), 2, 1),
  firstCaptions(TURN(P.scene, P.summary + 3, 1.3), 2, 1),
  firstCaptions(SKILLS(2.8, P.skills + 6, P.confetti + 3.5), 2),
  firstCaptions(FINISHED(2, F.finished - 0.5, F.end - 4), 2),
  { kind: 'outro', dur: 5 },
]

export const totalSeconds = (plan) => plan.reduce((a, s) => a + s.dur, 0)
