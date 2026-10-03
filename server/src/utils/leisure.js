// Lazer do mês: duas opções com o mesmo preço. A escolha é de gosto, não de
// dinheiro, e é obrigatória para fechar o mês. Fonte: mural de game design.
const { cents } = require('./finance')

const LEISURE = {
  1: {
    price: 500,
    options: [
      { title: 'Ano Novo na praia', description: 'Comemorar a virada do ano com os amigos na praia.' },
      { title: 'Viagem em família', description: 'Aproveitar o recesso de fim de ano e viajar com a família.' },
    ],
  },
  2: {
    price: 300,
    options: [
      { title: 'Carnaval de rua', description: 'Cair no bloquinho e curtir o carnaval de rua.' },
      { title: 'Festa de carnaval', description: 'Organizar uma festa de carnaval com os amigos.' },
    ],
  },
  3: {
    price: 200,
    options: [
      { title: 'Dia do Consumidor', description: 'Aproveitar as promoções do Dia do Consumidor e fazer umas compras.' },
      { title: 'Combo de hambúrguer', description: 'Pedir um combo de hambúrguer, batata e refri para você e um amigo.' },
    ],
  },
  4: {
    price: 350,
    options: [
      { title: 'Ovos de Páscoa', description: 'Comprar ovos de Páscoa para presentear a família.' },
      { title: 'Feriado de Tiradentes', description: 'Aproveitar o feriado e turistar numa cidade próxima.' },
    ],
  },
  5: {
    price: 250,
    options: [
      { title: 'Jantar romântico', description: 'Um jantar a dois num restaurante bonito.' },
      { title: 'Barzinho da firma', description: 'Sair para o barzinho com os novos amigos da empresa.' },
    ],
  },
  6: {
    price: 150,
    options: [
      { title: 'Festa junina em casa', description: 'Fazer uma festa junina em casa e dividir os gastos com os amigos.' },
      { title: 'Arraiá da empresa', description: 'Alugar uma roupa caipira para a festa junina da empresa.' },
    ],
  },
  7: {
    price: 100,
    options: [
      { title: 'Noite da pizza', description: 'Sair para comer uma pizza.' },
      { title: 'Shopping com o primo', description: 'O primo mais novo está de férias: levar ele para passear no shopping.' },
    ],
  },
  8: {
    price: 600,
    options: [
      { title: 'Dia de compras', description: 'Ir ao shopping e fazer umas compras.' },
      { title: 'Festival de música', description: 'Ir a um festival de música.' },
    ],
  },
  9: {
    price: 300,
    options: [
      { title: 'Kart', description: 'Andar de kart no fim de semana com os amigos.' },
      { title: 'Boliche', description: 'Passar uma tarde no boliche com os amigos.' },
    ],
  },
  10: {
    price: 450,
    options: [
      { title: 'Halloween no parque', description: 'Ir ao parque de diversões na temporada de Halloween.' },
      { title: 'Festa à fantasia', description: 'Organizar uma festa à fantasia com os amigos.' },
    ],
  },
  11: {
    price: 650,
    options: [
      { title: 'Black Friday', description: 'Aproveitar a Black Friday para comprar algo que você queria.' },
      { title: 'Open house', description: 'Fazer um open house para mostrar a casa aos amigos.' },
    ],
  },
  12: {
    price: 1000,
    options: [
      { title: 'Presentes de Natal', description: 'Comprar presentes de Natal para toda a família.' },
      { title: 'Viagem de Ano Novo', description: 'Fazer uma viagem para passar o Ano Novo.' },
    ],
  },
}

const leisureFor = (turn) => LEISURE[Number(turn)] ?? null

// Preço do lazer para o personagem (Trabalho em Equipe: 30% mais barato).
const leisurePrice = (turn, perks = { leisureDiscount: 0 }) => {
  const month = leisureFor(turn)
  if (!month) return null
  return cents(month.price * (1 - (perks.leisureDiscount ?? 0)))
}

// Total do ano sem desconto (para conferir o equilíbrio do jogo).
const yearlyLeisureCost = () => Object.values(LEISURE).reduce((sum, m) => sum + m.price, 0)

module.exports = { LEISURE, leisureFor, leisurePrice, yearlyLeisureCost }
