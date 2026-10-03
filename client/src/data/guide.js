// Caderninho: o guia do jogo que fica sempre no canto da tela. Aqui ficam os
// números e o glossário (texto puro); as páginas ficam em components/Notebook.jsx.

// taxas simuladas do jogo, as mesmas do servidor (server/src/utils/finance.js)
export const SELIC = 0.105
export const CDI = 0.104
export const OVERDRAFT_MONTHLY = 0.08

const pct = (v) => `${(Math.round(v * 1000) / 10).toLocaleString('pt-BR')}%`

// rendimento anual de cada caixinha e o IR cobrado sobre o rendimento
export const PRODUCTS = [
  { term: 'Poupança', annual: 0.065, ir: 0 },
  { term: 'CDB', annual: CDI * 1.06, ir: 0.175 },
  { term: 'Tesouro Selic', annual: SELIC + 0.006, ir: 0.15 },
  { term: 'LCI', annual: CDI * 1.08, ir: 0 },
  { term: 'LCA', annual: SELIC + 0.026, ir: 0 },
  { term: 'Tesouro Prefixado', annual: 0.135, ir: 0.15 },
  { term: 'Debênture', annual: 0.18, ir: 0 },
]

const cents = (n) => Math.round(n * 100) / 100

// quanto `amount` rende em 12 meses, já sem o IR
export const yearlyNet = (product, amount = 1000) => cents(amount * product.annual * (1 - product.ir))

// quanto uma dívida no cheque especial vira depois de `months` meses de juros compostos
export const overdraftAfter = (amount, months = 12, rate = OVERDRAFT_MONTHLY) => cents(amount * (1 + rate) ** months)

// caixinha do banco (tipo do servidor) → termo do glossário
export const BOX_TERM = {
  POUPANCA: 'Poupança',
  CDB: 'CDB',
  TESOURO_SELIC: 'Tesouro Selic',
  TESOURO_PRE: 'Tesouro Prefixado',
  LCI: 'LCI',
  LCA: 'LCA',
  DEBENTURE: 'Debênture',
}

export const GLOSSARY = [
  { term: 'Ações', kind: 'Investimento', text: 'Um pedacinho de uma empresa. Se a empresa vai bem, o preço sobe; se vai mal, cai. Pode ganhar muito ou perder.', facts: [['No jogo', 'ABEV3, VALE3, AMER3, PETR4'], ['Risco', 'Alto: o preço muda todo mês']], ingame: 'No Banco, na parte de Ações. Com a habilidade Análise de Mercado você recebe dicas do que vai acontecer.' },
  { term: 'CDB', kind: 'Renda fixa', text: 'Você empresta dinheiro para o banco e ele te devolve com juros. Pode resgatar quando quiser.', facts: [['Rende', `106% do CDI ≈ ${pct(CDI * 1.06)} ao ano`], ['Imposto', 'IR de 17,5% sobre o que rendeu'], ['Resgate', 'Quando quiser']], ingame: 'Caixinha CDB no Banco Maré.' },
  { term: 'CDI', kind: 'Taxa', text: 'A taxa que os bancos usam para emprestar dinheiro entre eles. Muitos investimentos rendem "uma porcentagem do CDI".', facts: [['No jogo', `${pct(CDI)} ao ano`]], ingame: '106% do CDI quer dizer 6% a mais do que o CDI.' },
  { term: 'Cheque especial', kind: 'Dívida', text: 'Quando a conta fica negativa, o banco empresta o que faltou. É um dos juros mais caros que existem.', facts: [['Juros no jogo', '8% ao mês'], ['Com habilidade', '4% ao mês (Gestão)'], ['Em um ano', `8% ao mês vira ${pct((1 + OVERDRAFT_MONTHLY) ** 12 - 1)} ao ano`]], ingame: 'Se faltar dinheiro para uma conta, você paga mesmo assim e entra no cheque especial. Os juros caem na virada do mês.' },
  { term: 'Debênture', kind: 'Renda fixa', text: 'Você empresta dinheiro para uma empresa. Paga mais que o banco, mas o dinheiro fica preso e a empresa pode não pagar (calote).', facts: [['Rende', '18% ao ano'], ['Prazo', '10 meses, sem resgate antes'], ['Nota (rating)', 'C: risco alto de calote']], ingame: 'Caixinha Debênture. Se a empresa der calote, você perde o que aplicou.' },
  { term: 'Diversificar', kind: 'Ideia', text: 'Não colocar todo o dinheiro num lugar só. Se um investimento vai mal, os outros seguram.', facts: [], ingame: 'A conquista Investidor pede pelo menos 4 tipos de investimento.' },
  { term: 'Imposto de Renda (IR)', kind: 'Imposto', text: 'Parte do que o investimento rendeu vai para o governo. É cobrado só sobre o lucro, na hora de resgatar.', facts: [['CDB', '17,5%'], ['Tesouro', '15% (22,5% se resgatar antes de 6 meses)'], ['Isentos', 'Poupança, LCI, LCA, debênture']], ingame: 'O resgate no Banco já mostra o IR descontado.' },
  { term: 'Inflação', kind: 'Ideia', text: 'Quando os preços sobem com o tempo. Com inflação, o mesmo dinheiro compra menos coisas. Um investimento só faz o dinheiro crescer de verdade se render mais que a inflação.', facts: [], ingame: 'No Fecha o Mês os preços das contas ficam iguais o ano todo, para facilitar. Na vida real, não.' },
  { term: 'Juros compostos', kind: 'Ideia', text: 'Juros sobre juros: o que rendeu no mês passa a render também no mês seguinte. Funciona a favor quando você investe e contra quando você deve.', facts: [['Exemplo', `8% ao mês por 12 meses = ${pct((1 + OVERDRAFT_MONTHLY) ** 12 - 1)} no ano, não 96%`]], ingame: 'As caixinhas rendem assim, e o cheque especial cobra assim.' },
  { term: 'LCA', kind: 'Renda fixa', text: 'Empréstimo para o banco financiar o agronegócio. Não paga imposto.', facts: [['Rende', `Selic + 2,6% = ${pct(SELIC + 0.026)} ao ano`], ['Imposto', 'Isenta'], ['Carência', '8 meses']], ingame: 'Caixinha LCA.' },
  { term: 'LCI', kind: 'Renda fixa', text: 'Empréstimo para o banco financiar imóveis. Não paga imposto.', facts: [['Rende', `108% do CDI ≈ ${pct(CDI * 1.08)} ao ano`], ['Imposto', 'Isenta'], ['Carência', '6 meses']], ingame: 'Caixinha LCI.' },
  { term: 'Liquidez', kind: 'Ideia', text: 'O quão rápido você consegue tirar o dinheiro de um investimento. Liquidez diária quer dizer que pode tirar todo dia.', facts: [['Alta', 'Poupança, CDB'], ['Baixa', 'Debênture (10 meses)']], ingame: 'Dinheiro para emergência precisa de liquidez alta.' },
  { term: 'Parcelamento', kind: 'Dívida', text: 'Pagar uma compra aos poucos. Quase sempre o total parcelado sai mais caro do que à vista, porque tem juros embutidos.', facts: [['Máquina de lavar', '12× R$ 335,20 = R$ 4.022,40'], ['À vista', 'R$ 3.620 (11% mais barato)']], ingame: 'Parcelas que ainda não venceram contam como dívida no seu patrimônio.' },
  { term: 'Patrimônio líquido', kind: 'Ideia', text: 'Tudo o que você tem menos tudo o que você deve. É o número que decide o ranking.', facts: [['Conta', 'Saldo + caixinhas + ações − dívidas']], ingame: 'Aparece no fim de cada mês e na tela de fim de ano.' },
  { term: 'Poupança', kind: 'Renda fixa', text: 'O investimento mais simples do Brasil. Rende pouco, mas não paga imposto e pode tirar quando quiser.', facts: [['Rende', '6,5% ao ano'], ['Imposto', 'Isenta'], ['Resgate', 'Quando quiser']], ingame: 'No jogo ela é a caixinha Reserva de Emergência.' },
  { term: 'Rating', kind: 'Ideia', text: 'Uma nota que diz o risco de uma empresa não pagar o que deve. AAA é muito seguro; C é bem arriscado.', facts: [], ingame: 'A debênture do jogo tem nota C.' },
  { term: 'Reserva de emergência', kind: 'Ideia', text: 'Dinheiro guardado só para imprevistos, num lugar seguro e com liquidez. O ideal é ter pelo menos 3 meses de contas.', facts: [['No jogo', '3 × (mercado + água e luz + internet)']], ingame: 'A conquista Reserva completa pede isso no fim do ano.' },
  { term: 'Selic', kind: 'Taxa', text: 'A taxa básica de juros do Brasil, definida pelo Banco Central. Quando ela sobe, investir rende mais e pegar empréstimo fica mais caro.', facts: [['No jogo', `${pct(SELIC)} ao ano`]], ingame: 'Tesouro Selic e LCA acompanham a Selic.' },
  { term: 'Tesouro Prefixado', kind: 'Renda fixa', text: 'Empréstimo para o governo com a taxa combinada na hora. Você já sabe quanto vai ganhar.', facts: [['Rende', '13,5% ao ano'], ['Imposto', 'IR 15% (22,5% antes de 6 meses)']], ingame: 'Caixinha Tesouro Prefixado.' },
  { term: 'Tesouro Selic', kind: 'Renda fixa', text: 'Empréstimo para o governo que acompanha a Selic. É considerado o investimento mais seguro do país.', facts: [['Rende', `Selic + 0,6% = ${pct(SELIC + 0.006)} ao ano`], ['Imposto', 'IR 15% (22,5% antes de 6 meses)']], ingame: 'Caixinha Tesouro Selic.' },
  { term: '13º salário', kind: 'Renda', text: 'Um salário extra que o trabalhador com carteira assinada recebe no fim do ano.', facts: [['No jogo', 'R$ 7.000 na virada para dezembro']], ingame: 'Chega mesmo se você for demitido em novembro: a rescisão paga.' },
]

export const termOf = (name) => GLOSSARY.find((g) => g.term === name) ?? null

// busca no nome e na explicação, sem ligar para acentos e maiúsculas
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
export const searchGlossary = (query = '') => {
  const q = fold(query.trim())
  if (!q) return GLOSSARY
  return GLOSSARY.filter((g) => fold(g.term).includes(q) || fold(g.text).includes(q))
}

// Abre o caderninho de qualquer tela (o Notebook escuta este evento).
export const GUIDE_EVENT = 'guide:open'
export function openGuide(term) {
  window.dispatchEvent(new CustomEvent(GUIDE_EVENT, { detail: { term } }))
}
