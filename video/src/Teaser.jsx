// Spoiler vertical (9:16) para mandar no grupo da equipe: um calendário perde
// as folhas de JAN a DEZ no ritmo da música, cada folha com um relance do jogo
// (algumas borradas com fita de SPOILER), e termina na logo com "em breve".
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { BODY, C, Coin, Confetti, Logo, Star, Title, TOY } from './parts'

const W = 1080
const H = 1920
const START = 30 // primeira batida da bateria (a música entra 1 s adiantada)
const DURS = [15, 15, 15, 15, 15, 15, 8, 7, 8, 7, 8, 7] // acelera na segunda metade
const FALL = 12
const STARTS = DURS.map((_, i) => START + DURS.slice(0, i).reduce((a, d) => a + d, 0))
const END_FLIP = STARTS[11] + DURS[11]
const REVEAL = END_FLIP + 10
export const TEASER_FRAMES = REVEAL + 110

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
const FLASHES = [
  { src: 'player.webm', t: 20.6, x: 760, y: 330, s: 1.0 },
  { src: 'player.webm', t: 60.5, x: 960, y: 520, s: 0.95 },
  { src: 'player.webm', t: 100.4, x: 960, y: 540, s: 0.85 },
  { src: 'hud.webm', t: 9.0, x: 330, y: 480, s: 1.2, spoiler: true },
  { src: 'player.webm', t: 115.5, x: 1000, y: 700, s: 1.0 },
  { src: 'player.webm', t: 126.3, x: 960, y: 540, s: 0.8 },
  { src: 'player.webm', t: 128.0, x: 960, y: 500, s: 0.9 },
  { src: 'player.webm', t: 149.6, x: 960, y: 540, s: 0.85, spoiler: true },
  { src: 'player.webm', t: 156, x: 960, y: 540, s: 0.9 },
  { src: 'player.webm', t: 168, x: 960, y: 540, s: 0.9 },
  { src: 'admin.webm', t: 18.5, x: 1300, y: 300, s: 1.0 },
  { src: 'finished.webm', t: 7.5, x: 960, y: 540, s: 0.85, spoiler: true },
]

const CARD = { x: 90, y: 400, w: 900, head: 190 }
const PHOTO = { w: 840, h: 800 }

function VerticalBackground() {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 30% 18%, ${C.teal} 0%, ${C.deep} 72%)` }}>
      <AbsoluteFill style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.10) 2px, transparent 2.5px)', backgroundSize: '44px 44px', transform: `translateY(${(frame * 0.6) % 44}px)` }} />
      {Array.from({ length: 18 }, (_, i) => {
        const y = ((random(`ty${i}`) * H - frame * (1 + random(`tv${i}`) * 2)) % (H + 120) + H + 120) % (H + 120) - 100
        const x = random(`tx${i}`) * W + Math.sin((frame + i * 40) / 30) * 16
        return (
          <div key={i} style={{ position: 'absolute', left: x, top: y, opacity: 0.22, transform: `rotate(${random(`tr${i}`) * 360 + frame * (i % 2 ? 1 : -1)}deg) scale(${0.7 + random(`ts${i}`)})` }}>
            {i % 3 === 0 && <Coin size={46} />}
            {i % 3 === 1 && <div style={{ width: 40, height: 48, borderRadius: 8, background: '#fff', borderTop: `12px solid ${C.pink}` }} />}
            {i % 3 === 2 && <Star size={40} color="#fff" />}
          </div>
        )
      })}
    </AbsoluteFill>
  )
}

function Tape({ rotate, top, delay }) {
  const frame = useCurrentFrame()
  const k = interpolate(frame, [delay, delay + 4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <div style={{ position: 'absolute', left: -80, right: -80, top, transform: `rotate(${rotate}deg) scaleX(${k})`, background: C.yellow, borderTop: `8px solid ${C.ink}`, borderBottom: `8px solid ${C.ink}`, padding: '10px 0 2px', fontFamily: TOY, fontWeight: 800, fontSize: 64, color: C.ink, whiteSpace: 'nowrap', textAlign: 'center', letterSpacing: 4, boxShadow: '0 10px 0 rgba(0,0,0,.25)' }}>
      SPOILER ⚠ SPOILER ⚠ SPOILER ⚠ SPOILER
    </div>
  )
}

// uma folha do calendário: cabeçalho com o mês e o relance do jogo; cai quando chega a próxima
function Page({ i }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const fl = FLASHES[i]
  const dur = DURS[i]
  const f = Math.max(0, frame - dur)
  const fallen = interpolate(f, [0, FALL], [0, 1], { extrapolateRight: 'clamp' })
  const side = i % 2 ? 1 : -1
  const s = fl.s * (1 + frame * 0.004)
  const left = Math.min(0, Math.max(PHOTO.w - 1920 * s, PHOTO.w / 2 - fl.x * s))
  const top = Math.min(0, Math.max(PHOTO.h - 1080 * s, PHOTO.h / 2 - fl.y * s))
  return (
    <div style={{ position: 'absolute', inset: 0, transformOrigin: '50% 0', transform: `perspective(1600px) translateY(${fallen * fallen * 1500}px) rotateX(${-fallen * 50}deg) rotate(${side * fallen * 18}deg)`, opacity: 1 - interpolate(fallen, [0.7, 1], [0, 1], { extrapolateLeft: 'clamp' }), background: C.cream, borderRadius: 34, overflow: 'hidden' }}>
      <div style={{ height: CARD.head, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 46px 0' }}>
        <div style={{ fontFamily: TOY, fontWeight: 800, fontSize: 150, lineHeight: 1, color: C.deep, transform: `scale(${spring({ frame, fps, config: { damping: 9, stiffness: 260 } })})`, transformOrigin: 'left center' }}>{MONTHS[i]}</div>
        <div style={{ textAlign: 'right', fontFamily: BODY, fontWeight: 800, color: '#7C8B74', fontSize: 30, lineHeight: 1.25 }}>SANTA RITA<br /><span style={{ color: C.pink }}>mês {i + 1} de 12</span></div>
      </div>
      <div style={{ position: 'absolute', left: (CARD.w - PHOTO.w) / 2, top: CARD.head + 10, width: PHOTO.w, height: PHOTO.h, borderRadius: 24, overflow: 'hidden', background: C.mint }}>
        <div style={{ position: 'absolute', left, top, width: 1920 * s, height: 1080 * s, filter: fl.spoiler ? 'blur(16px) saturate(1.3)' : 'none' }}>
          <OffthreadVideo src={staticFile(fl.src)} startFrom={Math.round(fl.t * fps)} muted style={{ width: '100%', height: '100%' }} />
        </div>
        {fl.spoiler && <>
          <Tape rotate={-14} top={250} delay={2} />
          <Tape rotate={9} top={500} delay={5} />
        </>}
      </div>
    </div>
  )
}

// a folha em branco por baixo de dezembro: o check da logo se desenha
function LastSheet() {
  const frame = useCurrentFrame()
  const k = interpolate(frame, [END_FLIP + 2, END_FLIP + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.teal, borderRadius: 34, display: 'grid', placeItems: 'center' }}>
      <svg viewBox="21 29 22 18" width={660} height={540}>
        <path d="m24.5 38 5 5 10-10" fill="none" stroke="#FFD45C" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - k} />
      </svg>
    </div>
  )
}

function Calendar() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const enter = spring({ frame, fps, config: { damping: 13, stiffness: 120 } })
  const leave = spring({ frame: frame - REVEAL, fps, config: { damping: 14, stiffness: 140 } })
  const shake = frame >= START && frame < END_FLIP ? Math.sin(frame * 2.1) * (frame > STARTS[6] ? 3 : 1.5) : 0
  return (
    <div style={{ position: 'absolute', left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.head + PHOTO.h + 50, transform: `translateY(${(1 - enter) * 1400}px) rotate(${(1 - enter) * 10 + shake * 0.3}deg) scale(${1 - leave})`, opacity: 1 - leave }}>
      {/* argolas */}
      {[180, 720].map((x) => <div key={x} style={{ position: 'absolute', left: x - 22, top: -46, width: 44, height: 96, borderRadius: 22, background: C.ink, zIndex: 50, border: '8px solid #fff' }} />)}
      <div style={{ position: 'absolute', inset: 0, borderRadius: 34, background: '#fff', boxShadow: '0 26px 0 rgba(0,0,0,.18), 0 60px 110px rgba(0,0,0,.35)' }}>
        <LastSheet />
        {DURS.map((d, i) => (
          <Sequence key={i} from={STARTS[i]} durationInFrames={d + FALL} layout="none">
            <div style={{ position: 'absolute', inset: 0, zIndex: 40 - i }}><Page i={i} /></div>
          </Sequence>
        ))}
        {frame < START && <Page i={0} />}
      </div>
    </div>
  )
}

function Pill({ children, delay, top, bg = C.cream, ink = C.ink, size = 52, rotate = -3, out }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const s = spring({ frame: frame - delay, fps, config: { damping: 9, stiffness: 200, mass: 0.6 } })
  const o = out ? 1 - spring({ frame: frame - out, fps, config: { damping: 14, stiffness: 160 } }) : 1
  if (frame < delay) return null
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top, display: 'flex', justifyContent: 'center', zIndex: 60 }}>
      <div style={{ transform: `scale(${s * o}) rotate(${rotate + Math.sin(frame / 7) * 1.5}deg)`, background: bg, color: ink, fontFamily: TOY, fontWeight: 800, fontSize: size, padding: `${size * 0.3}px ${size * 0.7}px ${size * 0.16}px`, borderRadius: 999, border: '7px solid #fff', boxShadow: '0 12px 0 rgba(0,0,0,.22)', whiteSpace: 'nowrap' }}>{children}</div>
    </div>
  )
}

function Reveal() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const s = spring({ frame, fps, config: { damping: 10 } })
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 470, display: 'flex', justifyContent: 'center' }}>
        <div style={{ transform: `scale(${s}) rotate(${(1 - s) * -20}deg)` }}><Logo size={380} /></div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 960 }}><Title delay={6} size={170}>Fecha o Mês</Title></div>
      <Pill delay={26} top={1200} bg={C.yellow} size={64}>em breve 👀</Pill>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1420, textAlign: 'center', fontFamily: BODY, fontWeight: 800, fontSize: 38, letterSpacing: 6, color: C.mint, opacity: interpolate(frame, [40, 52], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
        SIMULADOR FINANCEIRO · INATEL
      </div>
    </AbsoluteFill>
  )
}

export function Teaser() {
  return (
    <AbsoluteFill style={{ backgroundColor: C.deep }}>
      <VerticalBackground />
      <Pill delay={2} top={150} size={60} out={REVEAL - 6}>psiu, equipe… 🤫</Pill>
      <Calendar />
      <Pill delay={START + 6} top={1500} bg={C.pink} ink="#fff" size={46} rotate={2} out={REVEAL - 6}>um spoiler do que vem aí</Pill>
      <Sequence from={REVEAL}><Reveal /></Sequence>
      <Confetti delay={REVEAL + 4} count={110} w={W} h={H} dur={120} />

      <Audio src={staticFile('music-short.wav')} startFrom={30} volume={(f) => interpolate(f, [TEASER_FRAMES - 20, TEASER_FRAMES], [0.5, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
      <Sequence from={0} durationInFrames={45}><Audio src={staticFile('sfx-whoosh.wav')} volume={0.6} /></Sequence>
      {STARTS.slice(1).concat(END_FLIP).map((at, i) => (
        <Sequence key={i} from={at} durationInFrames={15}><Audio src={staticFile('sfx-page.wav')} volume={0.55} /></Sequence>
      ))}
      {FLASHES.map((fl, i) => fl.spoiler && (
        <Sequence key={`s${i}`} from={STARTS[i] + 2} durationInFrames={20}><Audio src={staticFile('sfx-pop.wav')} volume={0.6} /></Sequence>
      ))}
      <Sequence from={END_FLIP} durationInFrames={30}><Audio src={staticFile('sfx-rip.wav')} volume={0.6} /></Sequence>
      <Sequence from={REVEAL} durationInFrames={60}><Audio src={staticFile('sfx-tada.wav')} volume={0.85} /></Sequence>
      <Sequence from={REVEAL + 26} durationInFrames={40}><Audio src={staticFile('sfx-sparkle.wav')} volume={0.6} /></Sequence>
    </AbsoluteFill>
  )
}
