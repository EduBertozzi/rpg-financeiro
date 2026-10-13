// Trava de "ir a pé" (dilema de agosto): quem vai a pé chega atrasado e perde
// o começo do mês seguinte (o dilema é a última coisa do mês). A trava fica
// marcada para o mês seguinte e, quando ele começa, vira um horário de fim
// guardado no navegador para sobreviver a um F5.

export const walkLockKey = (characterId, turn) => `walk:${characterId}:${turn}`

// segundos que faltam (inteiros, nunca negativos)
export const remainingSeconds = (until, now = Date.now()) => Math.max(0, Math.ceil((Number(until) - now) / 1000))

export function saveWalkLock(characterId, turn, seconds, now = Date.now()) {
  const until = now + seconds * 1000
  try {
    localStorage.setItem(walkLockKey(characterId, turn), String(until))
  } catch {
    // sem storage: a trava vale só enquanto a página estiver aberta
  }
  return until
}

export function loadWalkLock(characterId, turn, now = Date.now()) {
  try {
    const until = Number(localStorage.getItem(walkLockKey(characterId, turn)))
    return until > now ? until : null
  } catch {
    return null
  }
}

// marca a caminhada para o começo do mês `turn`
export const pendingWalkKey = (characterId, turn) => `walk-next:${characterId}:${turn}`

export function savePendingWalk(characterId, turn, seconds) {
  try {
    localStorage.setItem(pendingWalkKey(characterId, turn), String(seconds))
  } catch {
    // sem storage: não tem como lembrar no mês seguinte
  }
}

// segundos de caminhada marcados para o mês `turn` (e apaga a marca)
export function takePendingWalk(characterId, turn) {
  try {
    const key = pendingWalkKey(characterId, turn)
    const seconds = Number(localStorage.getItem(key)) || 0
    localStorage.removeItem(key)
    return seconds
  } catch {
    return 0
  }
}
