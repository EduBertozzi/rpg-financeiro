// Tour do primeiro mês: cada passo aponta para um pedaço da tela (data-tour)
// e explica o que ele faz. Sem `target`, o cartão aparece no meio da tela.
export const TOUR_STEPS = [
  {
    target: null,
    title: 'Janeiro é o mês de aprender',
    text: 'Você tem um ano em Santa Rita. Vence quem terminar dezembro com o maior patrimônio: tudo o que você tem menos tudo o que deve. Vamos dar uma volta rápida.',
  },
  {
    target: 'saldo',
    title: 'Seu dinheiro',
    text: 'O saldo da conta fica sempre aqui. Ficou vermelho? Você entrou no cheque especial, que cobra juros todo mês.',
  },
  {
    target: 'checklist',
    title: 'O que fazer no mês',
    text: 'Todo mês: responder o dilema, escolher um lazer e pagar as três contas. Clique num item para ir direto, ou clique nos prédios do mapa.',
  },
  {
    target: 'lugares',
    title: 'Banco e Universidade',
    text: 'No Banco Maré você guarda e investe o que sobrar. Na Universidade você troca pontos por vantagens: cada dilema respondido vale 1 ponto.',
  },
  {
    target: 'encerrar',
    title: 'Encerre o mês',
    text: 'Quando terminar tudo, encerre o mês. O administrador fecha para a turma inteira e o mês seguinte começa com o resumo da virada.',
  },
  {
    target: 'caderninho',
    title: 'Ficou com dúvida?',
    text: 'O caderninho explica como jogar e o que é CDB, Selic, inflação e outros termos. Agora, a carta do seu primeiro dilema.',
  },
]

const GAP = 16
const CARD_W = 340
const CARD_H = 220

// Onde o cartão do passo fica: ao lado do alvo, dentro da tela.
// rect = getBoundingClientRect() do alvo (ou null); view = { width, height }.
export function cardPosition(rect, view) {
  if (!rect) return { left: Math.round((view.width - CARD_W) / 2), top: Math.round((view.height - CARD_H) / 2) }
  const clampX = (x) => Math.max(GAP, Math.min(x, view.width - CARD_W - GAP))
  const clampY = (y) => Math.max(GAP, Math.min(y, view.height - CARD_H - GAP))
  // à direita, se couber; senão à esquerda; senão em cima/embaixo
  if (rect.right + GAP + CARD_W <= view.width - GAP) return { left: rect.right + GAP, top: clampY(rect.top) }
  if (rect.left - GAP - CARD_W >= GAP) return { left: rect.left - GAP - CARD_W, top: clampY(rect.top) }
  const below = rect.bottom + GAP
  if (below + CARD_H <= view.height - GAP) return { left: clampX(rect.left), top: below }
  return { left: clampX(rect.left), top: clampY(rect.top - GAP - CARD_H) }
}

export const tourKey = (characterId) => `tour:${characterId}`
