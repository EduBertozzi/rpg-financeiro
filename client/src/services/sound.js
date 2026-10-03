// Sons curtos do jogo, gerados na hora pelo navegador (sem arquivos de áudio).
// O jogador liga e desliga no rodapé da barra; a escolha fica salva.
import { useSyncExternalStore } from 'react'

const KEY = 'som'
const listeners = new Set()
let enabled = readEnabled()
let ctx = null

function readEnabled() {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

export function isSoundOn() {
  return enabled
}

export function setSoundOn(on) {
  enabled = on
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    // sem storage: vale só até fechar a aba
  }
  listeners.forEach((fn) => fn())
}

export function useSoundOn() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => enabled,
  )
}

// O navegador só deixa tocar som depois de um clique; o contexto nasce no primeiro som.
function audio() {
  if (!enabled || typeof window === 'undefined') return null
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  if (!ctx) ctx = new Ctx()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone(c, freq, t0, dur, { type = 'sine', vol = 0.12, to } = {}) {
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t0)
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur)
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(vol, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g).connect(c.destination)
  o.start(t0)
  o.stop(t0 + dur + 0.02)
}

function noise(c, t0, dur, { vol = 0.18, from = 2000, to = 600, type = 'bandpass', q = 1 } = {}) {
  const len = Math.floor(c.sampleRate * dur)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = c.createBufferSource()
  const f = c.createBiquadFilter()
  const g = c.createGain()
  src.buffer = buf
  f.type = type
  f.Q.value = q
  f.frequency.setValueAtTime(from, t0)
  f.frequency.exponentialRampToValueAtTime(to, t0 + dur)
  g.gain.value = vol
  src.connect(f).connect(g).connect(c.destination)
  src.start(t0)
}

const play = (fn) => () => {
  try {
    const c = audio()
    if (c) fn(c, c.currentTime)
  } catch {
    // som é enfeite: se o navegador recusar, o jogo segue mudo
  }
}

export const sfx = {
  click: play((c, t) => tone(c, 620, t, 0.07, { type: 'triangle', to: 900, vol: 0.08 })),
  pop: play((c, t) => tone(c, 300, t, 0.12, { to: 700, vol: 0.12 })),
  coin: play((c, t) => {
    tone(c, 988, t, 0.08, { type: 'square', vol: 0.04 })
    tone(c, 1319, t + 0.07, 0.22, { type: 'square', vol: 0.04 })
  }),
  page: play((c, t) => noise(c, t, 0.28, { vol: 0.2, from: 3200, to: 900 })),
  letter: play((c, t) => {
    noise(c, t, 0.18, { vol: 0.14, from: 1800, to: 3600 })
    tone(c, 660, t + 0.12, 0.25, { type: 'triangle', vol: 0.07, to: 990 })
  }),
  rip: play((c, t) => {
    noise(c, t, 0.18, { vol: 0.24, from: 5000, to: 2500, type: 'highpass' })
    noise(c, t + 0.12, 0.3, { vol: 0.2, from: 4000, to: 1200, type: 'highpass' })
  }),
  whoosh: play((c, t) => noise(c, t, 0.9, { vol: 0.14, from: 300, to: 1800, type: 'lowpass', q: 0.7 })),
  bell: play((c, t) => {
    tone(c, 1047, t, 1.4, { vol: 0.1 })
    tone(c, 1568, t, 1, { vol: 0.04 })
    tone(c, 2093, t + 0.02, 0.6, { vol: 0.025 })
  }),
  win: play((c, t) => [523, 659, 784, 1047].forEach((f, i) => tone(c, f, t + i * 0.09, 0.3, { type: 'triangle', vol: 0.1 }))),
}
