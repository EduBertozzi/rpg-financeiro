// Caixinhas do Inabank, com os valores da tabela oficial de investimentos.
// `type` é o tipo usado pelo servidor (FixedIncomeInvestment.type), exceto
// DEBENTURE, que usa a rota de debêntures.
export const BOXES = [
  { type: 'POUPANCA', name: 'Poupança', short: 'Poupança', rate: '6,5% a.a.', liquidity: 'Diária', term: 'Imediato', tax: 'Isento', risk: 'Baixo', color: '#12B5A6', initial: true, desc: 'Sua reserva para imprevistos. Não paga IR e dá para resgatar quando quiser.' },
  { type: 'CDB', name: 'CDB', short: 'CDB', rate: '106% do CDI', liquidity: 'Diária', term: 'Imediato', tax: 'IR 17,5%', risk: 'Baixo', color: '#3B82F6', initial: true, desc: 'Rende mais que a poupança. Paga IR sobre o rendimento.' },
  { type: 'TESOURO_SELIC', name: 'Tesouro Selic', short: 'Tesouro', rate: 'Selic + 0,6% a.a.', liquidity: 'Diária', term: '6 meses', tax: 'IR 15%', earlyTaxMonths: 6, risk: 'Baixo', color: '#F59E0B', initial: true, desc: 'Título do governo. Resgate antes de 6 meses paga IR de 22,5%.' },
  { type: 'DEBENTURE', name: 'Debênture', short: 'Debênture', rate: '18% a.a.', liquidity: '10 meses', term: '10 meses', tax: 'Isento', rating: 'C', risk: 'Alto', color: '#8B5CF6', initial: true, desc: 'Empréstimo para uma empresa. Paga mais, mas o dinheiro fica preso e pode dar calote.' },
  { type: 'TESOURO_PRE', name: 'Tesouro Prefixado', short: 'Prefixado', rate: '13,5% a.a.', liquidity: 'Diária', term: '6 meses', tax: 'IR 15%', earlyTaxMonths: 6, risk: 'Baixo', color: '#EF4444', desc: 'Taxa fixa combinada na hora. Resgate antes de 6 meses paga IR de 22,5%.' },
  { type: 'LCI', name: 'LCI', short: 'LCI', rate: '108% do CDI', liquidity: 'após 6 meses', term: '6 meses', tax: 'Isento', risk: 'Baixo', color: '#0EA5E9', desc: 'Letra de crédito imobiliário. Isenta de IR, mas cada valor guardado fica preso 6 meses.' },
  { type: 'LCA', name: 'LCA', short: 'LCA', rate: 'Selic + 2,6% a.a.', liquidity: 'após 8 meses', term: '8 meses', tax: 'Isento', risk: 'Baixo', color: '#22C55E', desc: 'Letra de crédito do agronegócio. Isenta de IR, mas cada valor guardado fica preso 8 meses.' },
]

export const boxByType = (type) => BOXES.find((b) => b.type === type)

export const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
