import { useEffect, useRef } from 'react'

// Céu animado da constelação: estrelas em 3 camadas com paralaxe do mouse,
// nebulosas lentas, estrelas cadentes e o Cruzeiro do Sul no canto.
const CRUZEIRO = [[0.89, 0.66], [0.905, 0.84], [0.85, 0.76], [0.955, 0.74], [0.895, 0.78]]
const NEBULAS = [['90,162,255', 0.16], ['184,132,255', 0.14], ['63,212,138', 0.1]]

export default function StarSky() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mouse = { x: 0, y: 0 }
    const t0 = performance.now()
    let W = 0, H = 0, stars = [], dust = [], shooting = null, nextShot = 2600, frame = 0

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = r.width; H = r.height
      canvas.width = W * dpr; canvas.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      stars = Array.from({ length: Math.round((W * H) / 2600) }, (_, i) => ({
        x: Math.random() * W, y: Math.random() * H, z: [0.25, 0.55, 1][i % 3],
        r: Math.random() * 1.2 + 0.3, p: Math.random() * 6.28, s: Math.random() * 1.5 + 0.5,
      }))
      // poeira da Via Láctea, concentrada na faixa
      dust = Array.from({ length: Math.round((W * H) / 900) }, () => {
        const u = (Math.random() - 0.5) * 2.2 * W, v = (Math.random() + Math.random() + Math.random() - 1.5) * H * 0.12
        return { x: W * 0.5 + u * Math.cos(-0.42) - v * Math.sin(-0.42), y: H * 0.45 + u * Math.sin(-0.42) + v * Math.cos(-0.42), a: Math.random() * 0.5 + 0.1, p: Math.random() * 6.28 }
      })
      if (reduce) draw(performance.now())
    }

    const draw = (now) => {
      const t = (now - t0) / 1000
      ctx.clearRect(0, 0, W, H)
      const spots = [[0.25 + Math.sin(t * 0.05) * 0.05, 0.75], [0.72 + Math.cos(t * 0.04) * 0.05, 0.35], [0.5, 1.05]]
      NEBULAS.forEach(([c, a], i) => {
        const [nx, ny] = spots[i]
        const g = ctx.createRadialGradient(nx * W, ny * H, 0, nx * W, ny * H, Math.max(W, H) * 0.55)
        g.addColorStop(0, `rgba(${c},${a})`); g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
      })
      // Via Láctea: faixa diagonal suave
      ctx.save()
      ctx.translate(W * 0.5, H * 0.45); ctx.rotate(-0.42)
      const band = ctx.createLinearGradient(0, -H * 0.22, 0, H * 0.22)
      band.addColorStop(0, 'rgba(180,190,255,0)'); band.addColorStop(0.5, 'rgba(200,205,255,0.07)'); band.addColorStop(1, 'rgba(180,190,255,0)')
      ctx.fillStyle = band; ctx.fillRect(-W, -H * 0.22, W * 2, H * 0.44)
      ctx.restore()
      ctx.fillStyle = '#fff'
      for (const s of dust) {
        ctx.globalAlpha = s.a * (0.6 + 0.4 * Math.sin(t * 0.7 + s.p))
        ctx.fillRect(s.x + mouse.x * 4, s.y + mouse.y * 3, 1, 1)
      }
      for (const s of stars) {
        const x = (((s.x - t * 4 * s.z + mouse.x * 18 * s.z) % W) + W) % W
        const y = s.y + mouse.y * 12 * s.z
        ctx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.s + s.p)) * s.z
        ctx.beginPath(); ctx.arc(x, y, s.r * (0.6 + s.z * 0.6), 0, 6.283); ctx.fill()
      }
      const P = CRUZEIRO.map(([a, b]) => [a * W + mouse.x * 6, b * H + mouse.y * 4])
      ctx.globalAlpha = 0.35; ctx.strokeStyle = '#F6E7C1'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(...P[0]); ctx.lineTo(...P[1]); ctx.moveTo(...P[2]); ctx.lineTo(...P[3]); ctx.stroke()
      ctx.fillStyle = '#F6E7C1'
      P.forEach(([x, y], i) => {
        ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 1.3 + i)
        ctx.beginPath(); ctx.arc(x, y, i === 4 ? 1.2 : 2.2, 0, 6.283); ctx.fill()
      })
      if (!shooting && now - t0 > nextShot) {
        shooting = { x: Math.random() * W * 0.6 + W * 0.3, y: Math.random() * H * 0.3, l: 0 }
        nextShot = now - t0 + 5000 + Math.random() * 5000
      }
      if (shooting) {
        shooting.l += 1
        const k = shooting.l / 50, sx = shooting.x - k * 260, sy = shooting.y + k * 130
        const g = ctx.createLinearGradient(sx, sy, sx + 90, sy - 45)
        g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = g; ctx.lineWidth = 1.6
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 90, sy - 45); ctx.stroke()
        if (shooting.l > 50) shooting = null
      }
      ctx.globalAlpha = 1
    }

    const loop = (now) => {
      if (!document.hidden) draw(now)
      frame = requestAnimationFrame(loop)
    }
    const onMove = (e) => {
      mouse.x = e.clientX / window.innerWidth - 0.5
      mouse.y = e.clientY / window.innerHeight - 0.5
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onMove)
    if (!reduce) frame = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />
}
