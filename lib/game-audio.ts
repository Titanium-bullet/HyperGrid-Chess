export type SoundType =
  | 'move'
  | 'capture'
  | 'check'
  | 'gameover'
  | 'achievement-bronze'
  | 'achievement-silver'
  | 'achievement-gold'

type AudioCtxLike = AudioContext
let audioCtx: AudioCtxLike | null = null

function getCtx(): AudioCtxLike | null {
  if (typeof window === 'undefined') return null
  if (audioCtx) return audioCtx
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  audioCtx = new Ctor()
  return audioCtx
}

export function playSound(type: SoundType, enabled = true): void {
  if (!enabled) return
  const ctx = getCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()

  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()
  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  switch (type) {
    case 'move':
      oscillator.frequency.value = 440
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.1)
      break
    case 'capture':
      oscillator.frequency.value = 220
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.15)
      break
    case 'check':
      oscillator.type = 'square'
      oscillator.frequency.value = 880
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.3)
      break
    case 'gameover': {
      const notes = [523, 659, 784]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.2)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.2 + 0.3)
        osc.start(ctx.currentTime + i * 0.2)
        osc.stop(ctx.currentTime + i * 0.2 + 0.3)
      })
      break
    }
    case 'achievement-bronze': {
      const notes = [523, 659]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.15)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.25)
        osc.start(ctx.currentTime + i * 0.15)
        osc.stop(ctx.currentTime + i * 0.15 + 0.25)
      })
      break
    }
    case 'achievement-silver': {
      const notes = [523, 659, 784]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.14)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.14 + 0.25)
        osc.start(ctx.currentTime + i * 0.14)
        osc.stop(ctx.currentTime + i * 0.14 + 0.25)
      })
      break
    }
    case 'achievement-gold': {
      const notes = [523, 659, 784, 1047]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.13)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.13 + 0.3)
        osc.start(ctx.currentTime + i * 0.13)
        osc.stop(ctx.currentTime + i * 0.13 + 0.3)
      })
      const shimmer = ctx.createOscillator()
      const shimGain = ctx.createGain()
      shimmer.type = 'sine'
      shimmer.connect(shimGain)
      shimGain.connect(ctx.destination)
      shimmer.frequency.value = 2093
      shimGain.gain.setValueAtTime(0.06, ctx.currentTime + 0.5)
      shimGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.9)
      shimmer.start(ctx.currentTime + 0.5)
      shimmer.stop(ctx.currentTime + 0.9)
      break
    }
  }
}
