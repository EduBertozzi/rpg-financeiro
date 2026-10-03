// Quantas chamadas ao servidor estão esperando resposta. A tela de
// "acordando" aparece quando alguma demora (o servidor grátis dorme).
import { useSyncExternalStore } from 'react'

let pending = 0
let since = null // quando a fila deixou de estar vazia
const listeners = new Set()
const emit = () => listeners.forEach((fn) => fn())

export function requestStarted() {
  if (pending++ === 0) since = Date.now()
  emit()
}

export function requestEnded() {
  pending = Math.max(0, pending - 1)
  if (pending === 0) since = null
  emit()
}

// null quando não há nada esperando; senão, desde quando (ms).
export function useWaitingSince() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => since,
  )
}
