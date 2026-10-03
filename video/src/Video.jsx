import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { BODY, C, Caption, CoinBurst, Confetti, Footage, GameWindow, Logo, Sticker, Title, TOY, Background } from './parts'

const FPS = 30
const f = (s) => Math.round(s * FPS)

function Intro({ dur, fast }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const per = fast ? 3 : 6 // quadros por folha
  const flip = per * 12
  const logoScale = spring({ frame, fps, config: { damping: 12 } })
  const lift = interpolate(frame, [flip + 6, flip + 22], [0, -150], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const out = interpolate(frame, [f(dur) - 8, f(dur)], [1, 0], { extrapolateLeft: 'clamp' })
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: out }}>
      <div style={{ transform: `translateY(${lift}px) scale(${logoScale})` }}>
        <Logo size={300} flipFrames={flip} perPage={per} />
      </div>
      <div style={{ position: 'absolute', top: 600 }}>
        <Title delay={flip + 10} size={170}>Fecha o Mês</Title>
        <div style={{ textAlign: 'center', marginTop: 24, fontFamily: BODY, fontWeight: 700, fontSize: 46, color: C.mint, opacity: interpolate(frame, [flip + 34, flip + 46], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          Um ano de vida financeira em Santa Rita
        </div>
      </div>
      <Confetti delay={flip + 4} count={120} />
    </AbsoluteFill>
  )
}

function Chapter({ dur, text, color }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const s = spring({ frame, fps, config: { damping: 10, stiffness: 140 } })
  const out = interpolate(frame, [f(dur) - 8, f(dur)], [1, 0], { extrapolateLeft: 'clamp' })
  const icons = ['✉️', '🎡', '🧾', '🏦']
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: out, gap: 60 }}>
      <div style={{ transform: `scale(${s}) rotate(${(1 - s) * -10}deg)`, background: color, borderRadius: 50, padding: '30px 70px 18px', border: '8px solid #fff', boxShadow: '0 16px 0 rgba(0,0,0,.2)', fontFamily: TOY, fontWeight: 800, fontSize: 120, color: C.ink }}>{text}</div>
      <div style={{ display: 'flex', gap: 50 }}>
        {icons.map((ic, i) => {
          const k = spring({ frame: frame - 8 - i * 5, fps, config: { damping: 8, stiffness: 180 } })
          return <div key={ic} style={{ width: 150, height: 150, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', fontSize: 80, transform: `scale(${k}) translateY(${Math.sin((frame + i * 8) / 6) * 6}px)`, boxShadow: '0 10px 0 rgba(0,0,0,.18)' }}>{ic}</div>
        })}
      </div>
    </AbsoluteFill>
  )
}

function Outro({ dur }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const s = spring({ frame, fps, config: { damping: 11 } })
  const fade = interpolate(frame, [f(dur) - 20, f(dur)], [1, 0], { extrapolateLeft: 'clamp' })
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: fade }}>
      <div style={{ transform: `scale(${s})` }}><Logo size={210} /></div>
      <div style={{ marginTop: 40 }}><Title delay={6} size={130}>Bora fechar o mês?</Title></div>
      <div style={{ marginTop: 34, fontFamily: BODY, fontWeight: 800, fontSize: 44, color: C.ink, background: C.yellow, padding: '14px 40px', borderRadius: 999, boxShadow: '0 8px 0 rgba(0,0,0,.2)', transform: `scale(${spring({ frame: frame - 30, fps, config: { damping: 9 } })})` }}>
        rpg-financeiro.vercel.app
      </div>
      <div style={{ marginTop: 34, fontFamily: BODY, fontWeight: 700, fontSize: 30, letterSpacing: 6, color: C.mint, opacity: interpolate(frame, [40, 55], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
        SIMULADOR FINANCEIRO · INATEL
      </div>
      <Confetti delay={4} count={110} />
    </AbsoluteFill>
  )
}

function ClipScene({ seg }) {
  const df = f(seg.dur)
  return (
    <AbsoluteFill>
      <GameWindow dur={df}>
        <Footage src={seg.src} from={seg.from} rate={seg.rate} zooms={seg.zooms} />
      </GameWindow>
      {seg.sticker && <Sticker size={62} {...seg.sticker} delay={4} x={seg.sticker.x ?? 110} y={44} rotate={-3} />}
      {(seg.captions ?? []).map((c, i) => <Caption key={i} {...c} delay={f(c.t)} dur={f(c.dur)} />)}
      {(seg.confetti ?? []).map((t, i) => <Confetti key={i} delay={f(t)} />)}
      {(seg.coins ?? []).map(([t, from, to], i) => <CoinBurst key={i} delay={f(t)} from={from} to={to} />)}
    </AbsoluteFill>
  )
}

// fundo que muda de cor suavemente de um trecho para o outro
function MovingBackground({ plan }) {
  const frame = useCurrentFrame()
  let acc = 0
  let hue = C.teal
  for (const s of plan) {
    if (frame >= f(acc)) hue = s.hue ?? C.teal
    acc += s.dur
  }
  return <Background hue={hue} />
}

export function Movie({ plan, music }) {
  let at = 0
  const items = plan.map((seg) => {
    const start = f(at)
    at += seg.dur
    return { seg, start, len: f(seg.dur) }
  })
  return (
    <AbsoluteFill style={{ backgroundColor: C.deep }}>
      <MovingBackground plan={plan} />
      {items.map(({ seg, start, len }, i) => (
        <Sequence key={i} from={start} durationInFrames={len}>
          {seg.kind === 'intro' && <Intro dur={seg.dur} fast={seg.fast} />}
          {seg.kind === 'chapter' && <Chapter {...seg} />}
          {seg.kind === 'outro' && <Outro dur={seg.dur} />}
          {seg.kind === 'clip' && <ClipScene seg={seg} />}
        </Sequence>
      ))}
      {/* sons: transição a cada trecho, efeitos marcados no roteiro */}
      {items.map(({ seg, start }, i) => (
        <Sequence key={`w${i}`} from={start} durationInFrames={f(1.5)}>
          <Audio src={staticFile(seg.kind === 'intro' ? 'sfx-page.wav' : 'sfx-swoosh.wav')} volume={0.55} />
        </Sequence>
      ))}
      {items.flatMap(({ seg, start }, i) => (seg.sfx ?? []).map(([t, name], j) => (
        <Sequence key={`s${i}-${j}`} from={start + f(t)} durationInFrames={f(1.8)}>
          <Audio src={staticFile(`sfx-${name}.wav`)} volume={0.7} />
        </Sequence>
      )))}
      {items.filter(({ seg }) => seg.kind === 'intro').map(({ seg, start }) => {
        const per = seg.fast ? 3 : 6
        return Array.from({ length: 12 }, (_, k) => (
          <Sequence key={`ip${k}`} from={start + k * per} durationInFrames={f(0.5)}>
            <Audio src={staticFile('sfx-page.wav')} volume={0.35} />
          </Sequence>
        )).concat(
          <Sequence key="itada" from={start + per * 12} durationInFrames={f(1.8)}><Audio src={staticFile('sfx-tada.wav')} volume={0.8} /></Sequence>,
        )
      })}
      <Audio src={staticFile(music)} volume={0.42} />
    </AbsoluteFill>
  )
}
