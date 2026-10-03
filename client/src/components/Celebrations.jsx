import { useEffect, useRef, useState } from 'react'
import useGameStore from '../store/gameStore'
import { sfx } from '../services/sound'
import { newAchievements, skillUnlocked } from './achievements.js'

const seenKey = (id) => `conquistas:${id}`
function loadSeen(id) {
  try {
    return new Set(JSON.parse(localStorage.getItem(seenKey(id)) ?? '[]'))
  } catch {
    return new Set()
  }
}
function saveSeen(id, seen) {
  try {
    localStorage.setItem(seenKey(id), JSON.stringify([...seen]))
  } catch {
    // sem storage: a conquista pode aparecer de novo noutro dia
  }
}

// Papel picado saindo dos dois cantos de baixo, nas cores do personagem.
function confetti(canvas) {
  if (!canvas || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  const g = canvas.getContext('2d')
  const W = window.innerWidth
  const H = window.innerHeight
  canvas.width = W * devicePixelRatio
  canvas.height = H * devicePixelRatio
  g.scale(devicePixelRatio, devicePixelRatio)
  const css = getComputedStyle(document.documentElement)
  const colors = [css.getPropertyValue('--theme-primary'), css.getPropertyValue('--theme-secondary'), '#F4C430', '#FFFDF5', '#EC4899']
  const bits = Array.from({ length: 150 }, (_, i) => {
    const left = i % 2 === 0
    return {
      x: left ? 0 : W, y: H * 0.9,
      vx: (left ? 1 : -1) * (4 + Math.random() * 8), vy: -(10 + Math.random() * 10),
      w: 6 + Math.random() * 6, h: 3 + Math.random() * 4, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
      c: colors[i % colors.length],
    }
  })
  let frame = 0
  const tick = () => {
    g.clearRect(0, 0, W, H)
    for (const b of bits) {
      b.vy += 0.32
      b.vx *= 0.985
      b.x += b.vx
      b.y += b.vy
      b.r += b.vr
      g.save()
      g.translate(b.x, b.y)
      g.rotate(b.r)
      g.scale(1, Math.cos(frame / 6 + b.r))
      g.fillStyle = b.c
      g.fillRect(-b.w / 2, -b.h / 2, b.w, b.h)
      g.restore()
    }
    if (++frame < 180) requestAnimationFrame(tick)
    else g.clearRect(0, 0, W, H)
  }
  requestAnimationFrame(tick)
}

// Fica em todas as telas do jogo: olha o personagem mudar e comemora.
export default function Celebrations() {
  const character = useGameStore((s) => s.character)
  const room = useGameStore((s) => s.room)
  const prev = useRef(character)
  const canvas = useRef(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const before = prev.current
    prev.current = character
    if (!character?.id) return
    if (skillUnlocked(before, character)) confetti(canvas.current)
    const seen = loadSeen(character.id)
    const fresh = newAchievements(before, character, room?.status === 'active' ? room.currentTurn : 0, seen)
    if (!fresh.length) return
    fresh.forEach((a) => seen.add(a.id))
    saveSeen(character.id, seen)
    const timers = fresh.map((a, i) => setTimeout(() => {
      setToast(a)
      sfx.win()
    }, i * 3600))
    timers.push(setTimeout(() => setToast(null), fresh.length * 3600 - 400))
    return () => timers.forEach(clearTimeout)
  }, [character, room?.status, room?.currentTurn])

  return (
    <>
      <canvas ref={canvas} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[75] h-full w-full" />
      <div role="status" aria-live="polite" className={`pointer-events-none fixed left-1/2 top-4 z-[76] -translate-x-1/2 transition-transform duration-500 [transition-timing-function:cubic-bezier(.2,.9,.3,1.3)] ${toast ? 'translate-y-0' : '-translate-y-[160%]'}`}>
        <div className="flex items-center gap-3 rounded-[18px] bg-[#24331F] py-2.5 pl-2.5 pr-5 text-white shadow-[0_6px_0_rgba(0,0,0,0.25)]">
          <span className="grid h-11 w-11 place-items-center rounded-full border-[3px] border-white bg-[radial-gradient(circle_at_35%_35%,#FFF1B0,#F4C430_50%,#C8920A)] text-[#7A5200]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 2.6 5.5 6 .8-4.4 4.2 1.1 6L12 16.6 6.7 19.5l1.1-6L3.4 9.3l6-.8z" /></svg>
          </span>
          <span>
            <small className="block text-[10px] font-extrabold uppercase tracking-[0.18em] opacity-70">Conquista</small>
            <b className="font-toy text-[18px] font-extrabold">{toast?.title}</b>
          </span>
        </div>
      </div>
    </>
  )
}
