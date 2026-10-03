import { useEffect, useState } from 'react'
import { useWaitingSince } from '../services/loading'
import CalendarLoader from './CalendarLoader'

const DELAY = 2500 // resposta normal não pisca a tela

// Quando o servidor demora (o plano grátis dorme e leva até 1 minuto para
// acordar), mostra a logo perdendo folhas em vez de uma tela parada.
export default function SlowServer() {
  const since = useWaitingSince()
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    if (since === null) {
      const id = setTimeout(() => setSlow(false), 0)
      return () => clearTimeout(id)
    }
    const id = setTimeout(() => setSlow(true), Math.max(0, DELAY - (Date.now() - since)))
    return () => clearTimeout(id)
  }, [since])

  if (!slow) return null
  return <CalendarLoader text="Carregando Santa Rita…" hint="Na primeira vez do dia a cidade demora um pouquinho para acordar. Pode levar até 1 minuto." />
}
