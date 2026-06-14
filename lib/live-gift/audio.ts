import type { GiftRarity } from './config'

declare global {
  interface Window {
    _giftAudioCtx?: AudioContext
    webkitAudioContext?: typeof AudioContext
  }
}

let cachedCtx: AudioContext | undefined

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC: typeof AudioContext | undefined = window.AudioContext ?? window.webkitAudioContext
  if (!AC) return null
  if (!cachedCtx) {
    cachedCtx = new AC()
    window._giftAudioCtx = cachedCtx
  }
  const ctx = cachedCtx
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

export function closeGiftAudioContext(): void {
  if (typeof window === 'undefined') return
  const ctx = window._giftAudioCtx
  if (ctx) {
    ctx.close().catch(() => {})
  }
  delete window._giftAudioCtx
  cachedCtx = undefined
}

function tone(ctx: AudioContext, freq: number, when: number, dur: number, gain: number, type: OscillatorType): void {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.connect(g)
  g.connect(ctx.destination)
  osc.frequency.value = freq
  g.gain.setValueAtTime(gain, when)
  g.gain.exponentialRampToValueAtTime(0.01, when + dur)
  osc.start(when)
  osc.stop(when + dur)
}

export function playGiftSound(rarity: GiftRarity, combo: number): void {
  const ctx = getCtx()
  if (!ctx) return
  const now = ctx.currentTime
  try {
    if (rarity === 'epic') {
      ;[523, 659, 784, 1047].forEach((f, i) => tone(ctx, f, now + i * 0.1, 0.3, 0.1, 'triangle'))
    } else if (rarity === 'legendary') {
      ;[392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(ctx, f, now + i * 0.08, 0.35, 0.08, 'sine'))
    } else {
      const chords = [
        [523, 659, 784],
        [587, 740, 880],
        [659, 831, 988],
        [784, 988, 1175],
        [1047, 1319, 1568],
      ]
      chords.forEach((chord, ci) => chord.forEach((f) => tone(ctx, f, now + ci * 0.2, 0.6, 0.06, 'triangle')))
      tone(ctx, 2637, now + 1.2, 0.8, 0.04, 'sine')
    }
    if (combo >= 10) {
      tone(ctx, 880, now + 0.5, 0.2, 0.05, 'square')
    }
  } catch {
    // ignore audio errors
  }
}
