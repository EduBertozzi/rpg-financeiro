import { useEffect, useRef } from 'react'
import { PARTICLES } from './weather'

const CONFETTI = ['#FF5C8A', '#FFC857', '#3DBE5A', '#5AA2FF', '#B884FF']
const rnd = (a, b) => a + Math.random() * (b - a)

// Chuva, neve, folhas, pétalas, confete e neblina por cima da cidade, em canvas.
export default function WeatherLayer({ fx }) {
  const canvasRef = useRef(null)
  const flashRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !fx) return undefined
    const ctx = canvas.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let W = 0, H = 0, parts = [], frame = 0, nextBolt = performance.now() + 3000

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      const d = Math.min(window.devicePixelRatio || 1, 2)
      W = r.width; H = r.height
      canvas.width = W * d; canvas.height = H * d
      ctx.setTransform(d, 0, 0, d, 0, 0)
      const n = Math.round((PARTICLES[fx] ?? 0) * (W * H) / (1300 * 820))
      parts = Array.from({ length: n }, () => ({ x: rnd(0, W), y: rnd(-H, H), v: rnd(0.6, 1.4), r: rnd(0, 6.28), s: rnd(0.6, 1.4), c: CONFETTI[Math.floor(rnd(0, 5))] }))
    }

    const draw = (now) => {
      const t = now / 1000
      ctx.clearRect(0, 0, W, H)
      if (fx === 'fog') {
        for (let i = 0; i < 4; i++) {
          const y = H * (0.35 + i * 0.16), x = ((t * (8 + i * 4)) % (W * 2)) - W
          const g = ctx.createLinearGradient(0, y - 70, 0, y + 70)
          g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)')
          ctx.fillStyle = g; ctx.fillRect(x, y - 70, W * 2, 140)
        }
      }
      for (const p of parts) {
        if (fx === 'rain' || fx === 'storm' || fx === 'drizzle') {
          const light = fx === 'drizzle'
          p.y += (light ? 6 : 14) * p.v; p.x += (fx === 'storm' ? 4 : 1.5) * p.v
          ctx.strokeStyle = `rgba(210,225,255,${light ? 0.45 : 0.6})`; ctx.lineWidth = 1.2
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - (fx === 'storm' ? 6 : 2), p.y - (light ? 7 : 16)); ctx.stroke()
        } else if (fx === 'snow') {
          p.y += 1.1 * p.v; p.x += Math.sin(t + p.r) * 0.6
          ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.2 * p.s, 0, 6.283); ctx.fill()
        } else if (fx === 'leaves' || fx === 'petals' || fx === 'wind') {
          p.y += (fx === 'wind' ? 0.6 : 1.2) * p.v; p.x += (fx === 'wind' ? 4 : 1.2) * p.v + Math.sin(t * 2 + p.r) * 0.8; p.r += 0.03
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r)
          ctx.fillStyle = fx === 'petals' ? (p.s > 1 ? '#FFD23F' : '#FF9CC8') : fx === 'wind' ? 'rgba(190,160,110,0.8)' : (p.s > 1 ? '#E8742C' : '#F2B53A')
          ctx.beginPath(); ctx.ellipse(0, 0, (fx === 'petals' ? 4 : 6) * p.s, (fx === 'petals' ? 2.6 : 3.4) * p.s, 0, 0, 6.283); ctx.fill(); ctx.restore()
        } else if (fx === 'confetti') {
          p.y += 1.8 * p.v; p.x += Math.sin(t * 3 + p.r) * 1.2; p.r += 0.1
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-3, -5, 6, 10); ctx.restore()
        } else if (fx === 'sparkle') {
          p.y += 0.25 * p.v
          ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + p.r)); ctx.fillStyle = p.s > 1 ? '#FFE08A' : '#FFFFFF'
          ctx.beginPath(); ctx.arc(p.x, p.y, 1.6 * p.s, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1
        }
        if (p.y > H + 20) { p.y = -20; p.x = rnd(-40, W) }
        if (p.x > W + 40) p.x = -30
      }
      if (fx === 'storm' && now > nextBolt && flashRef.current) {
        nextBolt = now + rnd(3000, 7000)
        flashRef.current.animate([{ opacity: 0 }, { opacity: 0.7 }, { opacity: 0.1 }, { opacity: 0.5 }, { opacity: 0 }], { duration: 600 })
      }
    }

    const loop = (now) => {
      if (!document.hidden) draw(now)
      frame = requestAnimationFrame(loop)
    }
    resize()
    window.addEventListener('resize', resize)
    if (reduce) draw(performance.now())
    else frame = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize) }
  }, [fx])

  if (!fx) return null
  return (
    <>
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
      <div ref={flashRef} aria-hidden="true" className="pointer-events-none absolute inset-0 bg-white opacity-0" />
    </>
  )
}
