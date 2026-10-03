// Música e efeitos do vídeo, sintetizados aqui (sem arquivo de terceiros).
// Gera public/music-full.wav, public/music-short.wav e public/sfx-*.wav.
import fs from 'node:fs'
import path from 'node:path'

const SR = 44100
const OUT = path.resolve('public')
fs.mkdirSync(OUT, { recursive: true })

// ─── utilidades ──────────────────────────────────────────────────────────────
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12)
function buffer(seconds) {
  return [new Float32Array(Math.ceil(seconds * SR)), new Float32Array(Math.ceil(seconds * SR))]
}
function writeWav(file, [L, R], gain = 1) {
  const n = L.length
  let peak = 0
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]))
  const k = peak > 0 ? (0.89 / peak) * gain : 1
  const data = Buffer.alloc(44 + n * 4)
  data.write('RIFF', 0); data.writeUInt32LE(36 + n * 4, 4); data.write('WAVE', 8)
  data.write('fmt ', 12); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22)
  data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 4, 28); data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34)
  data.write('data', 36); data.writeUInt32LE(n * 4, 40)
  for (let i = 0; i < n; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * k)) * 32767), 44 + i * 4)
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * k)) * 32767), 46 + i * 4)
  }
  fs.writeFileSync(path.join(OUT, file), data)
}
const wave = {
  sine: (p) => Math.sin(2 * Math.PI * p),
  tri: (p) => 1 - 4 * Math.abs(((p + 0.25) % 1) - 0.5),
  square: (p) => ((p % 1) < 0.5 ? 1 : -1),
  saw: (p) => 2 * (p % 1) - 1,
}
// nota com envelope ADSR simples; pan -1..1
function note(buf, t, dur, freq, { type = 'tri', vol = 0.2, a = 0.005, d = 0.08, s = 0.6, r = 0.12, pan = 0, slide = 0, vib = 0 } = {}) {
  const [L, R] = buf
  const start = Math.floor(t * SR)
  const total = Math.floor((dur + r) * SR)
  const gl = vol * Math.min(1, 1 - pan)
  const gr = vol * Math.min(1, 1 + pan)
  let phase = 0
  for (let i = 0; i < total && start + i < L.length; i++) {
    const tt = i / SR
    let env
    if (tt < a) env = tt / a
    else if (tt < a + d) env = 1 - (1 - s) * ((tt - a) / d)
    else if (tt < dur) env = s
    else env = s * Math.max(0, 1 - (tt - dur) / r)
    const f = freq * (1 + slide * Math.min(1, tt / dur)) * (1 + vib * Math.sin(2 * Math.PI * 5.5 * tt))
    phase += f / SR
    const v = wave[type](phase) * env
    L[start + i] += v * gl
    R[start + i] += v * gr
  }
}
function noise(buf, t, dur, { vol = 0.2, hp = 0, lp = 1, decay = 6, pan = 0 } = {}) {
  const [L, R] = buf
  const start = Math.floor(t * SR)
  const total = Math.floor(dur * SR)
  let last = 0
  let lowLast = 0
  for (let i = 0; i < total && start + i < L.length; i++) {
    const tt = i / SR
    const x = Math.random() * 2 - 1
    lowLast = lowLast + lp * (x - lowLast) // passa-baixa simples
    const hpv = lowLast - last * hp // passa-alta grosseira
    last = lowLast
    const v = hpv * Math.exp(-decay * tt) * vol
    L[start + i] += v * Math.min(1, 1 - pan)
    R[start + i] += v * Math.min(1, 1 + pan)
  }
}
const kick = (b, t, vol = 0.9) => note(b, t, 0.16, 120, { type: 'sine', vol, a: 0.001, d: 0.12, s: 0.0, r: 0.05, slide: -0.6 })
const snare = (b, t, vol = 0.35) => { noise(b, t, 0.18, { vol, hp: 0.6, lp: 0.7, decay: 18 }); note(b, t, 0.08, 190, { type: 'tri', vol: vol * 0.5, s: 0, d: 0.07 }) }
const hat = (b, t, vol = 0.12, pan = 0.3) => noise(b, t, 0.05, { vol, hp: 0.95, lp: 1, decay: 60, pan })
const clap = (b, t, vol = 0.3) => { for (const o of [0, 0.012, 0.024]) noise(b, t + o, 0.12, { vol, hp: 0.8, lp: 0.8, decay: 25 }) }

// ─── música: pop alegre de videogame, 120 bpm, I–V–vi–IV ──────────────────────
// Dó maior: C G Am F. Melodia em pentatônica, baixo saltitante, acordes em
// pizzicato, bateria. Seções: intro (4 compassos), A, B, A', final.
function song(seconds, { introBars = 2, outroAt } = {}) {
  const bpm = 120
  const beat = 60 / bpm
  const bar = beat * 4
  const buf = buffer(seconds + 2)
  const chords = [[48, 52, 55], [43, 47, 50], [45, 48, 52], [41, 45, 48]] // C G Am F
  const bassRoots = [36, 31, 33, 29]
  // dois motivos de melodia (graus em semitons acima de C5=72), em colcheias
  const motifA = [[0, 2], [4, 1], [7, 1], [9, 2], [7, 1], [4, 1], [2, 2], [4, 2], [-1, 2], [0, 1], [2, 1], [4, 4]]
  const motifB = [[7, 1], [9, 1], [12, 2], [9, 1], [7, 1], [4, 2], [7, 2], [4, 1], [2, 1], [0, 2], [2, 2], [4, 4]]
  const bars = Math.ceil(seconds / bar)
  const end = outroAt ?? seconds - bar * 2
  for (let b = 0; b < bars; b++) {
    const t0 = b * bar
    if (t0 > seconds) break
    const c = chords[b % 4]
    const intro = b < introBars
    const fading = t0 >= end
    // bateria
    if (!intro) {
      for (let k = 0; k < 4; k++) {
        if (k === 0 || k === 2) kick(buf, t0 + k * beat, fading ? 0.5 : 0.85)
        if (k === 1 || k === 3) (b % 8 === 7 && k === 3 ? clap : snare)(buf, t0 + k * beat, 0.3)
        hat(buf, t0 + k * beat + beat / 2, 0.1, k % 2 ? 0.4 : -0.4)
        if (b % 2) hat(buf, t0 + k * beat, 0.05, -0.2)
      }
    } else {
      hat(buf, t0 + beat * 1.5, 0.06); hat(buf, t0 + beat * 3.5, 0.06)
    }
    // baixo saltitante (fundamental e oitava)
    for (let k = 0; k < 8; k++) {
      const m = bassRoots[b % 4] + (k % 2 ? 12 : 0)
      note(buf, t0 + k * (beat / 2), beat / 2 * 0.7, midi(m), { type: 'tri', vol: intro ? 0.12 : 0.22, d: 0.05, s: 0.5, r: 0.04 })
    }
    // acordes em pizzicato nos contratempos
    for (let k = 0; k < 4; k++) {
      for (const [i, m] of c.entries()) note(buf, t0 + k * beat + beat / 2, 0.12, midi(m + 12), { type: 'square', vol: 0.035, d: 0.08, s: 0.1, r: 0.06, pan: (i - 1) * 0.5 })
    }
    // melodia (não toca na introdução nem no último compasso)
    if (!intro && t0 < seconds - bar) {
      const motif = Math.floor(b / 4) % 2 === 0 ? motifA : motifB
      const phrase = b % 4 // cada motivo dura ~4 compassos de colcheias? usa 2 compassos e repete
      let t = t0
      const half = phrase % 2 === 0 ? motif.slice(0, 6) : motif.slice(6)
      for (const [deg, len] of half) {
        const d = len * (beat / 2)
        if (deg >= 0) note(buf, t, d * 0.85, midi(72 + deg), { type: 'square', vol: fading ? 0.05 : 0.075, a: 0.004, d: 0.06, s: 0.55, r: 0.08, vib: 0.004, pan: 0.15 })
        if (deg >= 0) note(buf, t, d * 0.85, midi(84 + deg), { type: 'sine', vol: 0.03, s: 0.4, pan: -0.2 }) // brilho
        t += d
      }
    }
    // glockenspiel a cada 4 compassos
    if (b % 4 === 0 && !intro) for (const [i, m] of [0, 4, 7, 12].entries()) note(buf, t0 + i * beat / 2, 0.3, midi(84 + m), { type: 'sine', vol: 0.05, d: 0.25, s: 0, r: 0.3 })
  }
  // final: acorde de Dó sustentado
  for (const m of [60, 64, 67, 72]) note(buf, seconds - 0.2, 1.5, midi(m), { type: 'tri', vol: 0.09, s: 0.7, r: 0.8 })
  // fade in / fade out
  const [L, R] = buf
  for (let i = 0; i < L.length; i++) {
    const t = i / SR
    const g = Math.min(1, t / 0.4) * (t > seconds ? Math.max(0, 1 - (t - seconds) / 1.6) : 1)
    L[i] *= g; R[i] *= g
  }
  return buf
}

writeWav('music-full.wav', song(121, { introBars: 2 }))
writeWav('music-short.wav', song(46, { introBars: 1 }))

// ─── efeitos (os mesmos do jogo, em versão de vídeo) ─────────────────────────
const sfx = {
  pop: (b) => note(b, 0, 0.1, 300, { type: 'sine', vol: 0.5, slide: 1.4, s: 0.3, d: 0.08 }),
  click: (b) => note(b, 0, 0.06, 620, { type: 'tri', vol: 0.4, slide: 0.45, s: 0.2 }),
  coin: (b) => { note(b, 0, 0.07, 988, { type: 'square', vol: 0.18, s: 0.6 }); note(b, 0.07, 0.25, 1319, { type: 'square', vol: 0.18, s: 0.5, r: 0.2 }) },
  page: (b) => noise(b, 0, 0.3, { vol: 0.5, hp: 0.5, lp: 0.6, decay: 9 }),
  rip: (b) => { noise(b, 0, 0.2, { vol: 0.6, hp: 0.9, lp: 1, decay: 10 }); noise(b, 0.12, 0.32, { vol: 0.5, hp: 0.85, lp: 0.9, decay: 8 }) },
  whoosh: (b) => { const [L, R] = b; for (let i = 0; i < 0.6 * SR; i++) { const t = i / SR; const x = (Math.random() * 2 - 1) * Math.sin(Math.PI * t / 0.6) * 0.35; L[i] += x * (1 - t / 0.6); R[i] += x * (t / 0.6) } },
  bell: (b) => { note(b, 0, 1.4, 1047, { type: 'sine', vol: 0.4, s: 0.2, d: 1, r: 0.6 }); note(b, 0, 1, 1568, { type: 'sine', vol: 0.15, s: 0.1, d: 0.8, r: 0.4 }); note(b, 0.02, 0.6, 2093, { type: 'sine', vol: 0.08, s: 0, d: 0.5 }) },
  win: (b) => [523, 659, 784, 1047].forEach((f, i) => note(b, i * 0.09, 0.28, f, { type: 'tri', vol: 0.35, s: 0.5, r: 0.2 })),
  swoosh: (b) => { note(b, 0, 0.25, 400, { type: 'sine', vol: 0.25, slide: 2.5, s: 0.4 }); noise(b, 0, 0.25, { vol: 0.15, hp: 0.7, decay: 8 }) },
  sparkle: (b) => [1568, 2093, 2637, 3136].forEach((f, i) => note(b, i * 0.05, 0.15, f, { type: 'sine', vol: 0.15, s: 0.2, d: 0.1, r: 0.2 })),
  tada: (b) => { [523, 659, 784].forEach((f, i) => note(b, i * 0.06, 0.15, f, { type: 'square', vol: 0.12 })); [1047, 1319, 1568].forEach((f) => note(b, 0.22, 0.7, f, { type: 'tri', vol: 0.18, s: 0.6, r: 0.5 })) },
}
for (const [name, fn] of Object.entries(sfx)) {
  const b = buffer(1.8)
  fn(b)
  writeWav(`sfx-${name}.wav`, b, name === 'whoosh' ? 0.7 : 0.85)
}
console.log('ok')
