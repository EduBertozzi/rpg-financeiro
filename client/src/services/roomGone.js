// Sala apagada pelo professor: o personagem some do servidor. Quem estava
// jogando volta para a tela de criar personagem, para entrar numa sala nova.
const GONE = ['Personagem não encontrado', 'Sala não encontrada']
const PLAYER_URL = /^\/?(characters\/[^/?]+|rooms\/[^/?]+\/standing)/

export const DELETED_PATH = '/character?sala=apagada'

// Resposta que significa "a sua sala não existe mais" (só nas rotas do jogador).
export const isRoomGone = (status, url = '', message = '') =>
  status === 404 && PLAYER_URL.test(url) && GONE.includes(message)

// Esquece o personagem e a sala guardados e leva para a criação.
export function leaveDeletedRoom(store, location = window.location) {
  const { setCharacter, setRoom } = store.getState()
  setCharacter(null)
  setRoom(null)
  if (!location.pathname.startsWith('/character') && !location.pathname.startsWith('/admin')) location.href = DELETED_PATH
}
