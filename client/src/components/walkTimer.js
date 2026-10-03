// Trava de "ir a pé" (dilema de agosto): a tela fica parada por alguns
// segundos. O fim da trava fica guardado no navegador para sobreviver a um F5.

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
