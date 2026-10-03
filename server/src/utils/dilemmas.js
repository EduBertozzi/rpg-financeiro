// Dilemas do ano: um por mês (janeiro a novembro), com duas escolhas. Algumas
// escolhas deixam consequências marcadas para meses seguintes (efeitos), que o
// turnEngine aplica na virada do mês. Dezembro não tem dilema: é o mês em que
// as consequências chegam. Fonte: mural de game design.
//
// Regras de dinheiro:
// - `cost` é o gasto imediato da escolha. Trabalho em Equipe deixa 30% mais
//   barato, exceto quando `noDiscount` (adiantar aluguel).
// - parcelas: a primeira sai na hora e as outras viram efeitos `installment`
//   nos meses seguintes. As que passam do fim do jogo contam como dívida.
// - consequências (efeitos) nunca têm desconto.
const { cents, SALARY } = require('./finance')
const { rentAmount } = require('./skills')

const FRIEND_LOAN = 500
const FRIEND_PAYBACK = 537
const MACHINE_CASH = 3620
const MACHINE_INSTALLMENT = { amount: 335.2, count: 12 }
const GYM_SEMESTER = 1200
const GYM_INSTALLMENT = { amount: 239.9, count: 6 }
const LAWYER_SHARE = 0.4
const LAWSUIT_WIN = 5000
const NEW_MACHINE = 1528.48
const RAISE = 0.10
const RAISE_MISSED_MEETING = 0.05
const FIRE_PREPAY_MONTHS = 3
const FIRE_PREPAY_DISCOUNT = 0.10
const FIRE_HOUSE_MULTIPLIER = 1.5
const FURNITURE = 2000
const WALK_LOCK_SECONDS = 30

const A = 0
const B = 1

const brl = (n) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// quanto foi pago na máquina de abril (à vista ou a soma das parcelas)
const machinePaid = (choices) =>
  choices[4] === A ? cents(MACHINE_INSTALLMENT.amount * MACHINE_INSTALLMENT.count) : MACHINE_CASH

const lawyerCost = (choices) => cents(machinePaid(choices) * LAWYER_SHARE)

// adiantar 3 meses do aluguel novo com 10% de desconto
const firePrepay = ({ housingCost, perks }) =>
  cents(rentAmount(housingCost, perks) * FIRE_PREPAY_MONTHS * (1 - FIRE_PREPAY_DISCOUNT))

const DILEMMAS = {
  1: {
    title: 'A rotina desandou',
    description: 'Com a correria da vida nova, a comida anda ruim e a casa está cada vez mais bagunçada. Dá para resolver só um dos dois por enquanto.',
    options: [
      { text: 'Comprar marmitas para comer melhor', cost: 300, result: 'Marmitas na geladeira. A semana ficou mais leve.' },
      { text: 'Contratar uma faxineira para organizar a casa', cost: 300, result: 'Casa arrumada. Dá até para receber visita.' },
    ],
  },
  2: {
    title: 'Empréstimo para o amigo',
    description: `Um amigo próximo pediu R$ ${brl(FRIEND_LOAN)} emprestados para pagar umas contas. Ele promete devolver R$ ${brl(FRIEND_PAYBACK)} em maio, como agradecimento.`,
    options: [
      {
        text: 'Emprestar o dinheiro',
        cost: FRIEND_LOAN,
        result: `Você emprestou R$ ${brl(FRIEND_LOAN)} para o seu amigo.`,
        effects: () => [{ turn: 5, kind: 'cash', amount: FRIEND_PAYBACK, label: 'Empréstimo: Seu amigo devolveu o dinheiro com um agradecimento' }],
      },
      { text: 'Não emprestar', cost: 0, result: 'Você explicou que não dava agora. Ele entendeu.' },
    ],
  },
  3: {
    title: 'Dor de dente',
    description: 'Você começou a sentir uma dor de dente.',
    options: [
      {
        text: 'Deixar para depois',
        cost: 0,
        result: 'A dor passou… por enquanto.',
        effects: () => [{ turn: 6, kind: 'cash', amount: -500, label: 'Dentista: O dente que ficou para depois virou tratamento de canal' }],
      },
      { text: 'Ir ao dentista e resolver', cost: 250, result: 'Dente tratado. Sem dor.' },
    ],
  },
  4: {
    title: 'A máquina de lavar morreu',
    description: 'O conserto não vale mais a pena. Você precisa de uma máquina nova: à vista ou parcelada?',
    options: [
      {
        text: `Parcelar em ${MACHINE_INSTALLMENT.count}x de R$ ${brl(MACHINE_INSTALLMENT.amount)}`,
        installment: { ...MACHINE_INSTALLMENT, label: 'Parcela: Máquina de lavar' },
        result: `Máquina nova em casa. Primeira parcela de R$ ${brl(MACHINE_INSTALLMENT.amount)} paga.`,
      },
      { text: `Pagar à vista R$ ${brl(MACHINE_CASH)}`, cost: MACHINE_CASH, result: 'Máquina nova em casa, já quitada.' },
    ],
  },
  5: {
    title: 'Chave perdida',
    description: 'Você perdeu a chave de casa poucas horas antes de uma reunião importante sobre uma possível promoção. Sem entrar em casa, precisa decidir rápido.',
    options: [
      {
        text: 'Arrombar a porta e ir à reunião',
        cost: 0,
        result: 'Você chegou a tempo da reunião.',
        effects: () => [{ turn: 6, kind: 'cash', amount: -300, label: 'Porta: Conserto da porta arrombada' }],
      },
      { text: 'Esperar o chaveiro e perder a reunião', cost: 180, result: 'O chaveiro abriu a porta. A reunião ficou para outra vez.' },
    ],
  },
  6: {
    title: 'À beira do esgotamento',
    description: 'A rotina ficou pesada e você sente que está perto de um esgotamento. Parar agora pode pesar no bolso.',
    options: [
      { text: 'Viajar e descansar uns dias', cost: 1000, result: 'Você voltou descansado.' },
      {
        text: 'Continuar trabalhando normalmente',
        cost: 0,
        result: 'Você seguiu firme no trabalho.',
        effects: () => [{ turn: 8, kind: 'cash', amount: -2000, label: 'Saúde: Crise de coluna. Foi preciso comprar uma cadeira ergonômica' }],
      },
    ],
  },
  7: {
    title: 'Hora de se mexer',
    description: 'Você percebeu que está muito sedentário e decidiu entrar numa academia.',
    options: [
      { text: `Plano semestral à vista (R$ ${brl(GYM_SEMESTER)})`, cost: GYM_SEMESTER, result: 'Plano de seis meses pago.' },
      {
        text: `Pagar por mês (${GYM_INSTALLMENT.count}x de R$ ${brl(GYM_INSTALLMENT.amount)})`,
        installment: { ...GYM_INSTALLMENT, label: 'Parcela: Academia' },
        result: `Primeira mensalidade de R$ ${brl(GYM_INSTALLMENT.amount)} paga.`,
      },
    ],
  },
  8: {
    title: 'O ônibus quebrou',
    description: 'O ônibus quebrou no caminho e o trabalho é longe.',
    options: [
      { text: 'Pagar um carro de aplicativo', cost: 45, result: 'Você chegou no horário.' },
      { text: 'Ir a pé', cost: 0, result: 'Você chegou atrasado ao trabalho.', lockSeconds: WALK_LOCK_SECONDS },
    ],
  },
  9: {
    title: 'Convite para a TV',
    description: 'Você foi convidado para um programa de TV sobre a sua área. Pode trazer reconhecimento e contatos, mas viagem, roupa e preparação são por sua conta.',
    options: [
      {
        text: 'Participar do programa',
        cost: 800,
        result: 'Você participou do programa. Muita gente viu.',
        effects: ({ choices }) => {
          const rate = choices[5] === B ? RAISE_MISSED_MEETING : RAISE
          const amount = cents(SALARY * rate)
          const pct = Math.round(rate * 100)
          return [10, 11, 12].map((turn) => ({
            turn, kind: 'salary_raise', amount, label: `Promoção: Salário ${pct}% maior depois do programa de TV`,
          }))
        },
      },
      {
        text: 'Não participar',
        cost: 0,
        result: 'Você preferiu ficar de fora desta vez.',
        // atrasou em agosto e faltou ao programa: demitido em novembro
        effects: ({ choices }) => choices[8] === B
          ? [
              { turn: 11, kind: 'notice', amount: 0, label: 'Demissão: Os atrasos e a falta de dedicação pesaram. A empresa te desligou' },
              { turn: 12, kind: 'no_salary', amount: 0, label: 'Sem salário: Você foi demitido em novembro' },
            ]
          : [],
      },
    ],
  },
  10: {
    title: 'Incêndio no apartamento',
    description: 'Seu apartamento pegou fogo e você precisa se mudar já. O Seu Jorge tem duas opções.',
    options: [
      {
        text: 'Adiantar 3 meses de aluguel do apartamento novo (10% de desconto)',
        cost: firePrepay,
        noDiscount: true,
        result: 'Mudança feita. Aluguel pago até o fim do ano.',
        effects: () => [
          { turn: 11, kind: 'rent_waived', amount: 0, label: 'Aluguel: Já pago adiantado' },
          { turn: 12, kind: 'rent_waived', amount: 0, label: 'Aluguel: Já pago adiantado' },
          { turn: 11, kind: 'cash', amount: -FURNITURE, label: 'Mudança: Mobiliar o apartamento novo depois do incêndio' },
        ],
      },
      {
        text: 'Alugar uma casa 50% mais cara, pagando mês a mês',
        cost: 0,
        result: 'Mudança feita para a casa nova.',
        housingMultiplier: FIRE_HOUSE_MULTIPLIER,
        effects: () => [
          { turn: 11, kind: 'notice', amount: 0, label: 'Casa nova: O aluguel ficou 50% mais caro' },
          { turn: 11, kind: 'cash', amount: -FURNITURE, label: 'Mudança: Mobiliar a casa nova depois do incêndio' },
        ],
      },
    ],
  },
  11: {
    title: 'A máquina quebrou de novo',
    description: 'A máquina de lavar que você comprou em abril deu problema e a garantia não responde. Processar a loja ou aproveitar a Black Friday?',
    options: [
      {
        text: 'Contratar um advogado (40% do que você pagou na máquina)',
        cost: ({ choices }) => lawyerCost(choices),
        result: 'O advogado entrou com o processo.',
        effects: () => [{ turn: 12, kind: 'cash', amount: LAWSUIT_WIN, label: 'Processo: Você ganhou a causa (máquina + danos morais)' }],
      },
      { text: `Comprar outra máquina na Black Friday (R$ ${brl(NEW_MACHINE)})`, cost: NEW_MACHINE, result: 'Máquina nova, de novo.' },
    ],
  },
}

const LABELS = ['A', 'B']

const dilemmaFor = (turn) => DILEMMAS[Number(turn)] ?? null

// gasto da escolha antes de desconto (custo ou primeira parcela)
function baseCost(option, ctx) {
  if (option.installment) return option.installment.amount
  return typeof option.cost === 'function' ? option.cost(ctx) : Number(option.cost ?? 0)
}

// gasto da escolha para este personagem (com Trabalho em Equipe quando vale)
function optionPrice(option, ctx) {
  const base = baseCost(option, ctx)
  const discount = option.installment || option.noDiscount ? 0 : (ctx.perks?.leisureDiscount ?? 0)
  return cents(base * (1 - discount))
}

// Resolve uma escolha: quanto sai agora, efeitos futuros e mudanças no personagem.
// ctx = { turn, perks, choices: { [turn]: optionIndex }, housingCost }
function resolveDilemma(turn, optionIndex, ctx) {
  const dilemma = dilemmaFor(turn)
  if (!dilemma) throw new Error('Dilema não encontrado')
  const option = dilemma.options[optionIndex]
  if (!option) throw new Error('Opção inválida')

  const full = { ...ctx, turn: Number(turn), choices: ctx.choices ?? {} }
  const price = optionPrice(option, full)
  const base = cents(baseCost(option, full))
  const effects = option.effects ? option.effects(full) : []

  if (option.installment) {
    const { amount, count, label } = option.installment
    for (let k = 2; k <= count; k++) {
      effects.push({ turn: full.turn + k - 1, kind: 'installment', amount: -amount, label: `${label} (${k}/${count})` })
    }
  }

  const updates = {}
  if (option.housingMultiplier) updates.housingCost = cents(Number(full.housingCost) * option.housingMultiplier)

  return {
    label: LABELS[optionIndex],
    text: option.text,
    result: option.result,
    cash: price ? -price : 0,
    discount: cents(base - price),
    effects,
    updates,
    lockSeconds: option.lockSeconds ?? 0,
  }
}

// Dilema como o cliente vê: opções com o preço já calculado, sem as consequências.
function publicDilemma(turn, ctx) {
  const dilemma = dilemmaFor(turn)
  if (!dilemma) return null
  const full = { ...ctx, turn: Number(turn), choices: ctx.choices ?? {} }
  return {
    turn: Number(turn),
    title: dilemma.title,
    description: dilemma.description,
    options: dilemma.options.map((option, index) => ({
      label: LABELS[index],
      text: option.text,
      price: optionPrice(option, full),
      installment: option.installment ? { amount: option.installment.amount, count: option.installment.count } : null,
    })),
  }
}

// Soma os efeitos que chegam numa virada de mês.
function summarizeEffects(effects = []) {
  let cash = 0
  let raise = 0
  let skipSalary = false
  let rentWaived = false
  for (const e of effects) {
    const amount = Number(e.amount ?? 0)
    if (e.kind === 'cash' || e.kind === 'installment') cash += amount
    if (e.kind === 'salary_raise') raise += amount
    if (e.kind === 'no_salary') skipSalary = true
    if (e.kind === 'rent_waived') rentWaived = true
  }
  return { cash: cents(cash), raise: cents(raise), skipSalary, rentWaived }
}

// Parcelas que ainda vão vencer: dívida no patrimônio.
const installmentDebt = (effects = []) =>
  cents(effects.filter((e) => e.kind === 'installment' && !e.appliedAt).reduce((sum, e) => sum - Number(e.amount), 0))

// Linha do tempo das escolhas para a tela de fim de ano: cada dilema
// respondido com o que custou na hora e as consequências que deixou.
// Parcelas viram uma linha só, com quantas foram pagas.
function choicesTimeline(choices = [], effects = []) {
  return choices
    .filter((c) => c.kind === 'dilemma' && dilemmaFor(c.turn))
    .sort((a, b) => a.turn - b.turn)
    .map((c) => {
      const dilemma = dilemmaFor(c.turn)
      const option = dilemma.options[c.option]
      const grouped = new Map()
      for (const e of effects.filter((x) => x.sourceTurn === c.turn)) {
        const key = e.label.replace(/\s\(\d+\/\d+\)$/, '')
        const g = grouped.get(key) ?? { label: key, turn: e.turn, amount: 0, count: 0, applied: 0 }
        g.amount = cents(g.amount + (e.appliedAt ? Number(e.amount) : 0))
        g.count += 1
        if (e.appliedAt) g.applied += 1
        g.turn = Math.min(g.turn, e.turn)
        grouped.set(key, g)
      }
      return {
        turn: c.turn,
        title: dilemma.title,
        label: LABELS[c.option],
        choice: option?.text ?? '',
        amount: cents(Number(c.amount)),
        consequences: [...grouped.values()],
      }
    })
}

module.exports = {
  choicesTimeline,
  DILEMMAS, LABELS, WALK_LOCK_SECONDS, FIRE_HOUSE_MULTIPLIER, RAISE, RAISE_MISSED_MEETING,
  dilemmaFor, optionPrice, resolveDilemma, publicDilemma, summarizeEffects, installmentDebt,
  machinePaid, lawyerCost, firePrepay,
}
