import { useEffect, useRef, useState } from 'react'
import api from '../services/api'
import { clockState } from './monthClock'

// Relógio do mês e quantos da turma já encerraram (sem ranking). Uma busca
// só para a tela inteira: a barra lateral, o mapa e o aviso do mês leem o
// mesmo relógio. Atualiza a cada 8 segundos enquanto a sala joga, e na hora
// quando alguém dispara STANDING_EVENT (encerrou o mês, respondeu, virou).
export const STANDING_EVENT = 'fecha:standing'
export const refreshStanding = () => window.dispatchEvent(new Event(STANDING_EVENT))

const POLL_MS = 8000
let shared = { roomId: null, clock: null, offset: 0 }
const subscribers = new Set()
let timer = null
let loading = false

function publish(next) {
  shared = { ...shared, ...next }
  subscribers.forEach((fn) => fn(shared))
}

async function load() {
  const roomId = shared.roomId
  if (!roomId || loading) return
  loading = true
  try {
    const t0 = Date.now()
    const { data } = await api.get(`/rooms/${roomId}/standing`)
    const t1 = Date.now()
    // diferença entre o relógio do servidor e o daqui (meio da ida e volta)
    if (shared.roomId === roomId) publish({ clock: data, offset: data.serverNow ? data.serverNow - (t0 + t1) / 2 : 0 })
  } catch {
    // sem relógio por agora; tenta de novo na próxima volta
  } finally {
    loading = false
  }
}

export function useStanding(roomId, active) {
  const [state, setState] = useState(shared)
  useEffect(() => {
    if (!roomId || !active) return
    subscribers.add(setState)
    if (shared.roomId !== roomId) publish({ roomId, clock: null, offset: 0 })
    load()
    if (!timer) timer = setInterval(load, POLL_MS)
    window.addEventListener(STANDING_EVENT, load)
    return () => {
      subscribers.delete(setState)
      window.removeEventListener(STANDING_EVENT, load)
      if (!subscribers.size) {
        clearInterval(timer)
        timer = null
      }
    }
  }, [roomId, active])
  return active && state.roomId === roomId ? state.clock : null
}

// Fase e tempos do mês, recalculados a cada segundo (ver monthClock.js).
// answered: o jogador já respondeu o dilema deste mês.
export function useMonthClock(roomId, active, answered) {
  const clock = useStanding(roomId, active)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!clock) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [clock])
  return clockState(clock, { now, offset: shared.offset, answered })
}

// Número que rola até o valor novo em vez de trocar de uma vez.
export function useRolling(value, ms = 1100) {
  const target = Number(value) || 0
  const [shown, setShown] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    const start = from.current
    if (start === target) return
    const t0 = performance.now()
    let raf
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms)
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
