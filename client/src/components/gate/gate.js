// Trava de surpresa: enquanto LOCKED for true, o site mostra "em breve" para
// quem não tem a chave. Quem abre uma vez com ?chave=… fica liberado naquele
// navegador. Não é segurança (a chave fica no navegador e o servidor segue
// aberto): é só para a equipe não ver o jogo antes da hora.
// Para abrir para todo mundo: LOCKED = false.
export const LOCKED = false
export const KEY_HASH = '5e183656'
export const STORAGE_KEY = 'chave-surpresa'

// FNV-1a de 32 bits: basta para não deixar a chave escrita no código.
export function hashKey(text) {
  let h = 0x811c9dc5
  for (const ch of String(text)) {
    h ^= ch.codePointAt(0)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

// search = location.search; stored = o que está salvo no navegador.
// Devolve se libera e o que salvar (null = nada a salvar).
export function gateState({ locked = LOCKED, search = '', stored = null, keyHash = KEY_HASH } = {}) {
  if (!locked) return { open: true, save: null }
  if (stored === keyHash) return { open: true, save: null }
  const key = new URLSearchParams(search).get('chave')
  if (key && hashKey(key.trim()) === keyHash) return { open: true, save: keyHash }
  return { open: false, save: null }
}
