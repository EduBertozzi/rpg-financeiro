import { useEffect, useRef, useState } from 'react'
import api from '../services/api'

// Posição na turma e quantos já encerraram o mês. Atualiza sozinho a cada
// 12 segundos enquanto a sala está jogando, e na hora quando alguém dispara
// o evento STANDING_EVENT (encerrou o mês, virou o mês).
export const STANDING_EVENT = 'fecha:standing'
export const refreshStanding = () => window.dispatchEvent(new Event(STANDING_EVENT))

export function useStanding(roomId, active) {
  const [standing, setStanding] = useState(null)
  useEffect(() => {
    if (!roomId || !active) return
    let alive = true
    const load = () => api.get(`/rooms/${roomId}/standing`)
      .then(({ data }) => alive && setStanding(data))
      .catch(() => {})
    load()
    const id = setInterval(load, 12000)
    window.addEventListener(STANDING_EVENT, load)
    return () => {
      alive = false
      clearInterval(id)
      window.removeEventListener(STANDING_EVENT, load)
    }
  }, [roomId, active])
  return active ? standing : null
}

// Número que rola até o valor novo em vez de trocar de uma vez.
export function useRolling(value, ms = 1100) {
  const target = Number(value) || 0
  const [shown, setShown] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    const start = from.current
    if (start === target) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const t0 = performance.now()
    let raf
    const step = (now) => {
      const k = reduced ? 1 : Math.min(1, (now - t0) / ms)
      const v = start + (target - start) * (1 - Math.pow(1 - k, 3))
      from.current = v
      setShown(v)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return shown
}
