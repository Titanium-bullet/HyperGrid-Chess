export type SoundType =
  | 'move'
  | 'capture'
  | 'check'
  | 'gameover'
  | 'achievement-bronze'
  | 'achievement-silver'
  | 'achievement-gold'
  // Arcade / Versus sounds
  | 'punch'
  | 'kick'
  | 'special'
  | 'block'
  | 'hit'
  | 'ko'
  | 'round-bell'

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
    case 'punch': {
      // short Whoosh + thud
      oscillator.type = 'sawtooth'
      oscillator.frequency.setValueAtTime(420, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.07)
      gainNode.gain.setValueAtTime(0.18, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.09)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.1)
      break
    }
    case 'kick': {
      oscillator.type = 'square'
      oscillator.frequency.setValueAtTime(260, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.14)
      gainNode.gain.setValueAtTime(0.22, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.16)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.17)
      break
    }
    case 'special': {
      // rising energy charge + release
      oscillator.type = 'sawtooth'
      oscillator.frequency.setValueAtTime(180, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.22)
      gainNode.gain.setValueAtTime(0.16, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.02, ctx.currentTime + 0.26)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.28)
      const spark = ctx.createOscillator()
      const sparkGain = ctx.createGain()
      spark.type = 'triangle'
      spark.connect(sparkGain)
      sparkGain.connect(ctx.destination)
      spark.frequency.setValueAtTime(1200, ctx.currentTime + 0.18)
      sparkGain.gain.setValueAtTime(0.12, ctx.currentTime + 0.18)
      sparkGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
      spark.start(ctx.currentTime + 0.18)
      spark.stop(ctx.currentTime + 0.42)
      break
    }
    case 'block': {
      // metallic clang
      oscillator.type = 'triangle'
      oscillator.frequency.setValueAtTime(1400, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.08)
      gainNode.gain.setValueAtTime(0.12, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.11)
      break
    }
    case 'hit': {
      // impactful body blow
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(180, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.13)
      gainNode.gain.setValueAtTime(0.26, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.16)
      break
    }
    case 'ko': {
      // dramatic descending tone + crash
      const notes = [659, 523, 392, 262]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.14)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.14 + 0.3)
        osc.start(ctx.currentTime + i * 0.14)
        osc.stop(ctx.currentTime + i * 0.14 + 0.32)
      })
      break
    }
    case 'round-bell': {
      const notes = [784, 1047]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.1)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.5)
        osc.start(ctx.currentTime + i * 0.1)
        osc.stop(ctx.currentTime + i * 0.1 + 0.52)
      })
      break
    }
  }
}
