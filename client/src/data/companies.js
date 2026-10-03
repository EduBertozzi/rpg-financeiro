// Quem é quem em Santa Rita: o nome, a história e uma dica de dinheiro de cada
// empresa da cidade. Aparece no botão "i" dos prédios e no Guia rápido.
export const COMPANIES = {
  bank: {
    name: 'Banco Maré',
    story: 'Banco digital que nasceu numa garagem de Santa Rita. Guarda as caixinhas, as ações e as debêntures da cidade.',
    pays: 'Contas do mês, investimentos e o cheque especial.',
    tip: 'Dinheiro parado na conta não rende. O que sobrar, guarde numa caixinha.',
  },
  leisure: {
    name: 'Praça do Coreto',
    story: 'Onde a cidade se encontra. Bandeirinhas em junho, luzinhas em dezembro e, às vezes, um cupom perdido.',
    pays: 'O lazer do mês: você escolhe entre dois passeios do mesmo preço.',
    tip: 'Lazer também é gasto fixo. Conte com ele no orçamento do mês.',
  },
  mercadinho: {
    name: 'Mercadinho da Dona Cida',
    story: 'Aberto desde 1987. Fiado só para quem é de casa. Todo Natal tem sorteio para os clientes.',
    pays: 'As compras do mês.',
    tip: 'Lista de compras e comparar preços economizam mais do que parece.',
  },
  utilities: {
    name: 'Sapucaí Água e Luz',
    story: 'A companhia que leva água e energia para o vale. No frio, a conta de luz costuma subir.',
    pays: 'A conta de água e luz.',
    tip: 'Banho mais curto e luz apagada pesam menos no fim do mês.',
  },
  internet: {
    name: 'Vale Conecta',
    story: 'Provedor do Vale da Eletrônica. Fibra na cidade inteira; o sinal só fica fraco na praça.',
    pays: 'A conta de internet e celular.',
    tip: 'Confira se o plano não tem mais do que você usa.',
  },
  landlord: {
    name: 'Imóveis do Seu Jorge',
    story: 'O Seu Jorge é dono de metade dos apartamentos da cidade. Cobra o aluguel todo fim de mês, sem atrasar um dia.',
    pays: 'O aluguel, que sai sozinho na virada do mês.',
    tip: 'Aluguel é o maior gasto fixo. Negociar faz diferença.',
  },
  university: {
    name: 'Universidade de Santa Rita',
    story: 'Onde fica o Cruzeiro, a constelação de habilidades. Cada estrela é um curso que vira vantagem no seu bolso.',
    pays: 'Nada em dinheiro: você paga com pontos de habilidade.',
    tip: 'Estudar cedo rende o ano inteiro.',
  },
}

export const COMPANY_IDS = Object.keys(COMPANIES)
