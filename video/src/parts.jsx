import { AbsoluteFill, Easing, OffthreadVideo, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { loadFont as loadBaloo } from '@remotion/google-fonts/Baloo2'
import { loadFont as loadOutfit } from '@remotion/google-fonts/Outfit'

export const { fontFamily: TOY } = loadBaloo('normal', { weights: ['700', '800'] })
export const { fontFamily: BODY } = loadOutfit('normal', { weights: ['500', '700', '800'] })

export const C = {
  teal: '#12B5A6', deep: '#0A7F75', mint: '#D7F5F1', cream: '#FFFDF7', ink: '#24331F',
  pink: '#DB2777', yellow: '#F4C430', gold: '#B07A0C', blue: '#2457C5', green: '#3DBE5A', purple: '#7C3AED', night: '#1B2A6B', red: '#E5484D',
}

const pop = (frame, fps, delay = 0, cfg = { damping: 11, stiffness: 160, mass: 0.7 }) => spring({ frame: frame - delay, fps, config: cfg })

// ─── fundo: gradiente e coisas flutuando (moedas, folhas de calendário, estrelas)
export function Background({ hue = C.teal }) {
  const frame = useCurrentFrame()
  const items = Array.from({ length: 22 }, (_, i) => ({
    kind: i % 3,
    x: random(`x${i}`) * 1920,
    y: random(`y${i}`) * 1080,
    s: 0.6 + random(`s${i}`) * 0.9,
    speed: 0.25 + random(`v${i}`) * 0.5,
    rot: random(`r${i}`) * 360,
  }))
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 30% 20%, ${hue} 0%, ${C.deep} 70%)` }}>
      <AbsoluteFill style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.10) 2px, transparent 2.5px)', backgroundSize: '44px 44px', transform: `translateY(${(frame * 0.4) % 44}px)` }} />
      {items.map((it, i) => {
        const y = ((it.y - frame * it.speed * 2) % 1180 + 1180) % 1180 - 100
        const x = it.x + Math.sin((frame + i * 40) / 40) * 18
        const r = it.rot + frame * (i % 2 ? 0.6 : -0.6)
        return (
          <div key={i} style={{ position: 'absolute', left: x, top: y, transform: `rotate(${r}deg) scale(${it.s})`, opacity: 0.22 }}>
            {it.kind === 0 && <Coin size={46} />}
            {it.kind === 1 && <div style={{ width: 40, height: 48, borderRadius: 8, background: '#fff', borderTop: `12px solid ${C.pink}` }} />}
            {it.kind === 2 && <Star size={40} color="#fff" />}
          </div>
        )
      })}
    </AbsoluteFill>
  )
}

export const Coin = ({ size = 40 }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', border: `${size * 0.07}px solid ${C.gold}`, background: 'radial-gradient(circle at 35% 35%, #FFF1B0, #F4C430 45%, #C8920A)', display: 'grid', placeItems: 'center', fontFamily: TOY, fontWeight: 800, fontSize: size * 0.5, color: '#7A5200' }}>$</div>
)
export const Star = ({ size = 40, color = C.yellow }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"><path d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2l-6.1 3.4 1.4-6.8L2.2 9.1l6.9-.8z" fill={color} /></svg>
)

// ─── a logo: calendário com check; `flip` folhas caindo antes do check
const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
export function Logo({ size = 260, flipFrames = 0, perPage = 6 }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const page = Math.min(11, Math.floor(frame / perPage))
  const local = frame - page * perPage
  const flipping = frame < flipFrames
  const checkIn = interpolate(frame, [flipFrames, flipFrames + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
  const bounce = pop(frame, fps, flipFrames)
  const u = size / 64
  return (
    <div style={{ position: 'relative', width: size, height: size, borderRadius: 16 * u, background: C.teal, boxShadow: `0 ${4 * u}px 0 rgba(0,0,0,.2)`, transform: `scale(${flipping ? 1 : 0.92 + bounce * 0.08})` }}>
      <svg viewBox="0 0 64 64" width={size} height={size} style={{ position: 'absolute', inset: 0 }}>
        <rect x="14" y="17" width="36" height="33" rx="7" fill="none" stroke="#fff" strokeWidth="4.5" />
        <path d="M14 27h36" stroke="#fff" strokeWidth="4.5" />
        <path d="M23 12v9M41 12v9" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" />
        {!flipping && <path d="m24.5 38 5 5 10-10" fill="none" stroke="#FFD45C" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - checkIn} />}
      </svg>
      {flipping && (
        <div style={{ position: 'absolute', left: 17 * u, right: 17 * u, top: 30 * u, bottom: 17 * u, perspective: 400 }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 3 * u, background: '#E6FAF7', display: 'grid', placeItems: 'center', fontFamily: TOY, fontWeight: 800, fontSize: 8 * u, color: C.deep }}>{MONTHS[Math.min(11, page + 1)]}</div>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 3 * u, background: '#fff', display: 'grid', placeItems: 'center', fontFamily: TOY, fontWeight: 800, fontSize: 8 * u, color: C.deep, transformOrigin: '50% 0', transform: `translateY(${interpolate(local, [perPage * 0.3, perPage], [0, 80 * u], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px) rotateX(${interpolate(local, [0, perPage], [0, -75], { extrapolateRight: 'clamp' })}deg) rotate(${interpolate(local, [0, perPage], [0, 9], { extrapolateRight: 'clamp' })}deg)`, opacity: interpolate(local, [perPage * 0.6, perPage], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>{MONTHS[page]}</div>
        </div>
      )}
    </div>
  )
}

// ─── título "adesivo": entra quicando, gira de leve e fica balançando
export function Sticker({ text, color = C.yellow, ink = C.ink, delay = 0, x = 120, y = 60, rotate = -4, size = 74, n }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const s = pop(frame, fps, delay)
  const wobble = Math.sin((frame - delay) / 9) * 1.2
  if (frame < delay) return null
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: `scale(${s}) rotate(${rotate + wobble * (1 - Math.min(1, (frame - delay) / 60))}deg)`, transformOrigin: 'left center', display: 'flex', alignItems: 'center', gap: 22, zIndex: 20 }}>
      {n !== undefined && (
        <div style={{ width: size * 1.25, height: size * 1.25, borderRadius: '50%', background: '#fff', color, display: 'grid', placeItems: 'center', fontFamily: TOY, fontWeight: 800, fontSize: size * 0.9, boxShadow: `0 8px 0 rgba(0,0,0,.18)` }}>{n}</div>
      )}
      <div style={{ background: color, color: ink, fontFamily: TOY, fontWeight: 800, fontSize: size, lineHeight: 1, padding: `${size * 0.22}px ${size * 0.42}px ${size * 0.12}px`, borderRadius: size * 0.36, boxShadow: `0 ${size * 0.12}px 0 rgba(0,0,0,.22), inset 0 -${size * 0.08}px 0 rgba(0,0,0,.12)`, whiteSpace: 'nowrap', border: '6px solid #fff' }}>{text}</div>
    </div>
  )
}

// ─── legenda em balão, embaixo
export function Caption({ text, delay = 0, dur = 90, color = C.cream, ink = C.ink, accent }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  if (frame < delay || frame > delay + dur) return null
  const s = pop(frame, fps, delay, { damping: 12, stiffness: 190, mass: 0.6 })
  const out = interpolate(frame, [delay + dur - 8, delay + dur], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 54, display: 'flex', justifyContent: 'center', zIndex: 25, opacity: out }}>
      <div style={{ transform: `translateY(${(1 - s) * 80}px) scale(${0.8 + s * 0.2})`, background: color, color: ink, fontFamily: BODY, fontWeight: 800, fontSize: 46, padding: '20px 40px', borderRadius: 40, boxShadow: '0 10px 0 rgba(0,0,0,.2), 0 24px 50px rgba(0,0,0,.25)', display: 'flex', alignItems: 'center', gap: 18, maxWidth: 1600 }}>
        {accent && <span style={{ fontSize: 52 }}>{accent}</span>}
        {text}
      </div>
    </div>
  )
}

// ─── janela do navegador com o jogo dentro; entra pulando e sai deslizando
export function GameWindow({ children, dur, tilt = 0, scale = 0.8, y = 40 }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const enter = pop(frame, fps, 0, { damping: 14, stiffness: 120, mass: 0.8 })
  const exit = interpolate(frame, [dur - 9, dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic) })
  const W = 1920 * scale
  const H = 1080 * scale
  return (
    <div style={{ position: 'absolute', left: (1920 - W) / 2, top: (1080 - H) / 2 + y, width: W, height: H + 44, transform: `translateY(${(1 - enter) * 700 + exit * -40}px) rotate(${(1 - enter) * 6 + tilt}deg) scale(${1 - exit * 0.06})`, opacity: 1 - exit, borderRadius: 28, overflow: 'hidden', background: '#fff', boxShadow: '0 22px 0 rgba(0,0,0,.18), 0 50px 90px rgba(0,0,0,.35)', border: '6px solid #fff' }}>
      <div style={{ height: 44, background: '#F1EBDD', display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px' }}>
        {['#E5484D', '#F4C430', '#3DBE5A'].map((c) => <span key={c} style={{ width: 16, height: 16, borderRadius: '50%', background: c }} />)}
        <span style={{ marginLeft: 18, background: '#fff', borderRadius: 999, padding: '4px 22px', fontFamily: BODY, fontWeight: 700, fontSize: 18, color: '#6B7A62' }}>Fecha o Mês · Santa Rita</span>
      </div>
      <div style={{ position: 'relative', width: W, height: H, overflow: 'hidden' }}>{children}</div>
    </div>
  )
}

// ─── o vídeo gravado, com zoom para onde importa
// zooms: [{ at: s, to: s, x, y, s }] em segundos do trecho e pixels do vídeo (1920×1080)
export function Footage({ src, from, rate = 1, zooms = [], scale = 0.8 }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = frame / fps
  let z = { x: 960, y: 540, s: 1 }
  for (const k of zooms) {
    const ease = Easing.inOut(Easing.cubic)
    const inK = interpolate(t, [k.at, k.at + 0.6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease })
    const outK = k.to !== undefined ? interpolate(t, [k.to, k.to + 0.6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease }) : 0
    const k2 = inK * (1 - outK)
    // cada zoom parte de onde o anterior deixou a câmera
    if (k2 > 0) z = { x: z.x + (k.x - z.x) * k2, y: z.y + (k.y - z.y) * k2, s: z.s + (k.s - z.s) * k2 }
  }
  const tx = 960 - z.x * z.s
  const ty = 540 - z.y * z.s
  return (
    <div style={{ width: 1920, height: 1080, transformOrigin: '0 0', transform: `scale(${scale}) translate(${Math.min(0, Math.max(1920 - 1920 * z.s, tx))}px, ${Math.min(0, Math.max(1080 - 1080 * z.s, ty))}px) scale(${z.s})` }}>
      <OffthreadVideo src={staticFile(src)} startFrom={Math.round(from * fps)} playbackRate={rate} muted style={{ width: 1920, height: 1080 }} />
    </div>
  )
}

// ─── confete determinístico (papel picado saindo dos cantos)
export function Confetti({ delay = 0, count = 140, dur = 110, w = 1920, h = 1080 }) {
  const frame = useCurrentFrame() - delay
  if (frame < 0 || frame > dur) return null
  const colors = [C.pink, C.yellow, C.teal, '#fff', C.blue, C.green]
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 30 }}>
      {Array.from({ length: count }, (_, i) => {
        const left = i % 2 === 0
        const vx = (left ? 1 : -1) * (9 + random(`cx${i}`) * 16)
        const vy = -(22 + random(`cy${i}`) * 20)
        const t = frame
        const x = (left ? 0 : w) + vx * t * 0.98
        const y = h - 80 + vy * t + 0.45 * t * t
        const r = random(`cr${i}`) * 360 + t * (8 + random(`cs${i}`) * 10)
        const size = 12 + random(`cw${i}`) * 12
        return <div key={i} style={{ position: 'absolute', left: x, top: y, width: size, height: size * 0.5, background: colors[i % colors.length], transform: `rotate(${r}deg) scaleY(${Math.cos(t / 5 + i)})`, borderRadius: 2 }} />
      })}
    </AbsoluteFill>
  )
}

// ─── moedas voando de um ponto até outro
export function CoinBurst({ delay = 0, from = [960, 540], to = [140, 160], count = 10 }) {
  const frame = useCurrentFrame() - delay
  if (frame < 0 || frame > 50) return null
  return (
    <AbsoluteFill style={{ zIndex: 31 }}>
      {Array.from({ length: count }, (_, i) => {
        const t = Math.max(0, Math.min(1, (frame - i * 2) / 28))
        if (frame - i * 2 < 0) return null
        const e = Easing.inOut(Easing.cubic)(t)
        const sx = from[0] + (random(`bx${i}`) - 0.5) * 220
        const sy = from[1] + (random(`by${i}`) - 0.5) * 120
        const mx = (sx + to[0]) / 2
        const my = Math.min(sy, to[1]) - 220
        const x = (1 - e) * (1 - e) * sx + 2 * (1 - e) * e * mx + e * e * to[0]
        const y = (1 - e) * (1 - e) * sy + 2 * (1 - e) * e * my + e * e * to[1]
        return <div key={i} style={{ position: 'absolute', left: x, top: y, transform: `scale(${1.2 - e * 0.6})`, opacity: t >= 1 ? 0 : 1 }}><Coin size={54} /></div>
      })}
    </AbsoluteFill>
  )
}

export const Title = ({ children, size = 150, color = '#fff', delay = 0, stagger = 2 }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return (
    <div style={{ fontFamily: TOY, fontWeight: 800, fontSize: size, color, lineHeight: 0.95, display: 'flex', justifyContent: 'center', textShadow: '0 10px 0 rgba(0,0,0,.18)' }}>
      {[...children].map((ch, i) => {
        const s = pop(frame, fps, delay + i * stagger, { damping: 9, stiffness: 200, mass: 0.6 })
        return <span key={i} style={{ display: 'inline-block', transform: `translateY(${(1 - s) * 120}px) scale(${s}) rotate(${(1 - s) * (i % 2 ? 20 : -20)}deg)`, whiteSpace: 'pre' }}>{ch}</span>
      })}
    </div>
  )
}
