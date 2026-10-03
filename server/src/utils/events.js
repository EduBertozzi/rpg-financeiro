// Calendário de imprevistos (eventos). Eventos não têm escolha: acontecem na
// virada para o mês. Cada mês tem a sua lista; os `fixed` acontecem sempre e,
// dos outros, o jogo sorteia um (ou nenhum). Fonte: mural de game design.
//
// `repair`: conserto — o Técnico (Resolução de Problemas) paga metade.
// `salary`: verba do trabalho (13º) — não ganha o bônus do dom Desenrolado.

// chance de um mês passar sem imprevisto sorteado
const QUIET_CHANCE = 0.2

const QUIET = { title: 'Nenhum imprevisto', description: 'Mês tranquilo, sem surpresas.', cashImpact: 0, category: 'none' }

// Janeiro não tem virada: o presente de boas-vindas entra na criação do personagem.
const WELCOME_GIFT = {
  title: 'Presente de boas-vindas',
  description: 'Sua família fez um PIX para ajudar nos primeiros gastos do apartamento.',
  cashImpact: 500,
  category: 'positive',
}

const EVENT_CALENDAR = {
  2: [
    { title: 'Convite para casamento', description: 'Um grande amigo da faculdade se casou. Entre presente, roupa e viagem, surgiram uns gastos.', cashImpact: -500, category: 'daily' },
  ],
  3: [
    { title: 'Comparou preços', description: 'Você pesquisou antes de comprar e economizou numa compra grande.', cashImpact: 500, category: 'positive' },
    { title: 'Cashback do cartão', description: 'Caiu o cashback das compras do mês passado.', cashImpact: 85, category: 'positive' },
  ],
  4: [
    { title: 'Restituição do Imposto de Renda', description: 'A Receita Federal liberou a sua restituição.', cashImpact: 350, category: 'positive' },
    { title: 'Convênio reembolsou', description: 'O convênio aprovou o reembolso dos seus exames.', cashImpact: 280, category: 'positive' },
  ],
  5: [
    { title: 'Celular no chão', description: 'Na correria do trabalho o celular caiu e a tela quebrou.', cashImpact: -450, category: 'daily', repair: true },
    { title: 'Conta de luz alta', description: 'Com o frio, o chuveiro no máximo fez a conta de energia subir.', cashImpact: -200, category: 'daily' },
  ],
  6: [
    { title: 'Participação nos resultados', description: 'A empresa bateu a meta do semestre e dividiu um bônus.', cashImpact: 700, category: 'positive' },
    { title: 'Multa no transporte', description: 'Você esqueceu de validar o cartão no ônibus e a fiscalização multou.', cashImpact: -180, category: 'daily' },
  ],
  7: [
    { title: 'Multa de trânsito', description: 'Chegou uma multa por excesso de velocidade de semanas atrás.', cashImpact: -195, category: 'daily' },
    { title: 'Venda de usados', description: 'Você vendeu móveis e eletrônicos que não usava mais.', cashImpact: 600, category: 'positive' },
    { title: 'Chuva forte', description: 'Um vazamento no banheiro molhou seus móveis. O dono paga o cano; os móveis são com você.', cashImpact: -800, category: 'daily' },
  ],
  8: [
    { title: 'Multa do condomínio', description: 'A festinha em casa passou do horário e o condomínio multou pelo barulho.', cashImpact: -200, category: 'daily' },
    { title: 'Bonificação', description: 'Você bateu uma meta no trabalho e ganhou uma bonificação.', cashImpact: 85, category: 'positive' },
  ],
  9: [
    { title: 'Compra contestada', description: 'Uma compra indevida apareceu na fatura e o banco estornou.', cashImpact: 180, category: 'positive' },
    { title: 'Notebook na assistência', description: 'O notebook ficou lento e cheio de falhas e foi para o conserto.', cashImpact: -450, category: 'daily', repair: true },
  ],
  10: [
    { title: 'Venda de usados', description: 'Você vendeu móveis e eletrônicos que não usava mais.', cashImpact: 600, category: 'positive' },
    { title: 'Chuva forte', description: 'Um vazamento no banheiro molhou seus móveis. O dono paga o cano; os móveis são com você.', cashImpact: -800, category: 'daily' },
  ],
  11: [
    { title: 'Sorteio do Mercadinho', description: 'Você ganhou o sorteio de Natal do Mercadinho.', cashImpact: 150, category: 'positive' },
  ],
  12: [
    { title: '13º salário', description: 'Caiu o décimo terceiro.', cashImpact: 7000, category: 'salary', fixed: true },
    { title: 'Gastos de fim de ano', description: 'Confraternizações, amigo secreto e presentes apertaram o mês.', cashImpact: -550, category: 'daily', fixed: true },
  ],
}

// Eventos da virada para `turn`. `rng` devolve um número em [0, 1).
// Os fixos sempre acontecem; dos outros sai um ou nenhum (QUIET_CHANCE).
function eventsFor(turn, rng = Math.random) {
  const list = EVENT_CALENDAR[Number(turn)] ?? []
  const fixed = list.filter((e) => e.fixed)
  const pool = list.filter((e) => !e.fixed)
  if (pool.length === 0) return fixed.length ? fixed : [QUIET]

  const r = rng()
  if (r < QUIET_CHANCE) return fixed.length ? fixed : [QUIET]
  const index = Math.min(Math.floor(((r - QUIET_CHANCE) / (1 - QUIET_CHANCE)) * pool.length), pool.length - 1)
  return [...fixed, pool[index]]
}

// Valor esperado dos eventos positivos que ganham o bônus do Desenrolado
// numa partida (viradas 2 a 12) — usado para equilibrar o dom.
function expectedPositiveEvents() {
  let total = 0
  for (let turn = 2; turn <= 12; turn++) {
    const list = EVENT_CALENDAR[turn] ?? []
    const pool = list.filter((e) => !e.fixed)
    for (const e of list) {
      if (e.category !== 'positive') continue
      total += e.fixed ? e.cashImpact : (e.cashImpact * (1 - QUIET_CHANCE)) / pool.length
    }
  }
  return Math.round(total * 100) / 100
}

module.exports = { EVENT_CALENDAR, QUIET, QUIET_CHANCE, WELCOME_GIFT, eventsFor, expectedPositiveEvents }
