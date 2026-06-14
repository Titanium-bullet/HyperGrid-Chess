import type { GiftEffectConfig } from './config'
import type { GiftParticleEngine } from './particles'
import { playGiftSound } from './audio'
import { showGodRays } from './ui'

export type PlayEffectOptions = { reducedMotion?: boolean }

export class GiftEffectOrchestrator {
  private timers: number[] = []
  constructor(private particles: GiftParticleEngine) {}

  private addTimer(fn: () => void, delay: number): void {
    const id = window.setTimeout(fn, delay)
    this.timers.push(id)
  }

  cleanup(): void {
    this.timers.forEach((id) => window.clearTimeout(id))
    this.timers = []
    this.particles.clear()
    document.querySelectorAll('.gift-god-rays').forEach((el) => el.remove())
    document.querySelectorAll('.gift-brightness-boost').forEach((el) => el.remove())
  }

  playEffect(cfg: GiftEffectConfig, combo: number, opts: PlayEffectOptions = {}): void {
    if (typeof window === 'undefined') return
    this.timers.forEach((id) => window.clearTimeout(id))
    this.timers = []
    const W = window.innerWidth
    const H = window.innerHeight
    const cx = W / 2
    const cy = H / 2
    let count = cfg.particleCount
    if (combo >= 50) count = Math.floor(count * 1.5)
    if (combo >= 100) count = Math.floor(count * 2)
    if (opts.reducedMotion) count = Math.min(count, 60)
    if (cfg.rarity === 'epic') this.playEpic(cx, cy, cfg.colors, count, cfg.duration, combo)
    else if (cfg.rarity === 'legendary') this.playLegendary(cx, cy, cfg.colors, count, cfg.duration, combo)
    else if (cfg.rarity === 'mythic') this.playMythic(cx, cy, cfg.colors, count, cfg.duration, combo, opts.reducedMotion === true)
  }

  private playEpic(cx: number, cy: number, colors: string[], count: number, _dur: number, combo: number): void {
    this.particles.init()
    this.particles.burst(cx, cy, Math.floor(count * 0.6), {
      speed: 5, speedVar: 0.7, spread: 30, size: 5, endSize: 0, colors, alpha: 1, life: 2.5, drag: 0.955, z: 2, ay: 0.02,
    })
    this.particles.burst(cx, cy, Math.floor(count * 0.3), {
      speed: 8, speedVar: 0.5, spread: 5, size: 3, endSize: 0, colors, alpha: 0.8, life: 1.5, drag: 0.94, z: 1, ay: 0.04,
    })
    this.particles.fountain(cx, cy + 50, Math.floor(count * 0.1), {
      speed: 7, spread: 1.0, size: 6, endSize: 0, colors: ['#FFD700', '#FFFFFF'], alpha: 1, life: 2, drag: 0.96, z: 2, ay: 0.05,
    })
    this.addTimer(() => {
      this.particles.burst(cx + (Math.random() - 0.5) * 200, cy + (Math.random() - 0.5) * 100, Math.floor(count * 0.3), {
        speed: 4, speedVar: 0.6, spread: 20, size: 4, endSize: 0, colors, alpha: 0.9, life: 2, drag: 0.96, z: 2, ay: 0.03,
      })
    }, 800)
    this.addTimer(() => {
      this.particles.fountain(cx, cy, Math.floor(count * 0.15), {
        speed: 6, spread: 0.6, size: 5, endSize: 0, colors: ['#FF8C00', '#FFD700'], alpha: 1, life: 1.8, drag: 0.95, z: 2, ay: 0.06,
      })
    }, 1500)
    playGiftSound('epic', combo)
  }

  private playLegendary(cx: number, cy: number, colors: string[], count: number, _dur: number, combo: number): void {
    this.particles.init()
    this.particles.rain(Math.floor(count * 0.35), {
      colors, vy: 3, ay: 0.01, size: 4, endSize: 2, alpha: 0.6, life: 4, z: 0,
    })
    this.particles.burst(cx, cy, Math.floor(count * 0.3), {
      speed: 4, speedVar: 0.5, spread: 40, size: 6, endSize: 1, colors, alpha: 1, life: 3, drag: 0.97, z: 2, ay: 0.01,
    })
    this.particles.fountain(cx, cy + 80, Math.floor(count * 0.15), {
      speed: 6, spread: 0.5, size: 5, endSize: 0, colors: ['#FFFFFF', '#87CEEB'], alpha: 1, life: 2.5, drag: 0.96, z: 2, ay: 0.04,
    })
    this.addTimer(() => this.particles.firework(cx - 150, cy - 100, {
      count: 60, speed: 5, colors: ['#00BFFF', '#FFFFFF', '#87CEEB'], life: 1.8, size: 4, z: 2,
    }), 1000)
    this.addTimer(() => this.particles.firework(cx + 120, cy - 80, {
      count: 50, speed: 4.5, colors: ['#1E90FF', '#00CED1', '#FFFFFF'], life: 1.5, size: 3.5, z: 2,
    }), 2000)
    this.addTimer(() => this.particles.firework(cx, cy - 120, {
      count: 70, speed: 6, colors, life: 2, size: 5, z: 2,
    }), 3200)
    this.addTimer(() => this.particles.rain(Math.floor(count * 0.2), {
      colors, vy: 2.5, ay: 0.008, size: 3, endSize: 1, alpha: 0.5, life: 3.5, z: 0,
    }), 2500)
    playGiftSound('legendary', combo)
  }

  private playMythic(cx: number, cy: number, colors: string[], count: number, dur: number, combo: number, reducedMotion = false): void {
    this.particles.init()
    this.particles.rain(Math.floor(count * 0.15), {
      colors: ['#00FF7F', '#7CFC00', '#FFD700'], vy: 1.5, ay: 0.005, size: 8, endSize: 3, alpha: 0.3, life: 5, z: 0,
    })
    this.particles.rain(Math.floor(count * 0.2), {
      colors: ['#FFFFFF', '#FFD1DC', '#87CEFA'], vy: 2, ay: 0.008, size: 5, endSize: 2, alpha: 0.5, life: 4, z: 1,
    })
    this.particles.burst(cx, cy, Math.floor(count * 0.2), {
      speed: 5, speedVar: 0.6, spread: 50, size: 7, endSize: 1, colors, alpha: 1, life: 3.5, drag: 0.975, z: 2, ay: 0.008,
    })
    this.particles.fountain(cx, cy + 100, Math.floor(count * 0.1), {
      speed: 8, spread: 1.2, size: 6, endSize: 0, colors: ['#FFD700', '#FF69B4', '#FFFFFF'], alpha: 1, life: 2.5, drag: 0.96, z: 2, ay: 0.04,
    })
    const fwDelays = [600, 1400, 2400, 3600, 5000]
    const fwColors: string[][] = [
      ['#FF4500', '#FFD700', '#FF69B4'],
      ['#00BFFF', '#FFFFFF', '#9370DB'],
      ['#00FF7F', '#7CFC00', '#FFD700'],
      ['#FF69B4', '#FFD1DC', '#FFFFFF'],
      ['#FFD700', '#FF8C00', '#FFFFFF'],
    ]
    const fwX = [-200, 180, -100, 150, 0]
    const fwY = [-150, -120, -180, -100, -200]
    for (let i = 0; i < fwDelays.length; i++) {
      const idx = i
      this.addTimer(() => this.particles.firework(cx + fwX[idx], cy + fwY[idx], {
        count: 80, speed: 6, colors: fwColors[idx], life: 2, size: 5, z: 2,
      }), fwDelays[idx])
    }
    this.addTimer(() => this.particles.rain(Math.floor(count * 0.1), {
      colors, vy: 3, ay: 0.01, size: 4, endSize: 1, alpha: 0.4, life: 3, z: 2,
    }), 3000)
    this.addTimer(() => this.particles.fountain(cx - 100, cy + 60, 40, {
      speed: 6, spread: 0.8, size: 5, endSize: 0, colors: ['#FF69B4', '#FFD700'], alpha: 1, life: 2, drag: 0.95, z: 2, ay: 0.05,
    }), 2000)
    this.addTimer(() => this.particles.fountain(cx + 100, cy + 60, 40, {
      speed: 6, spread: 0.8, size: 5, endSize: 0, colors: ['#00BFFF', '#FFFFFF'], alpha: 1, life: 2, drag: 0.95, z: 2, ay: 0.05,
    }), 2200)
    if (!reducedMotion) showGodRays(colors, dur)
    playGiftSound('mythic', combo)
  }

  playComboEffect(combo: number, _rarityColor: string): void {
    if (!combo || combo < 10 || typeof window === 'undefined') return
    this.particles.init()
    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    if (combo >= 100) {
      this.particles.burst(cx, cy, 120, {
        speed: 7, speedVar: 0.6, spread: 10, size: 6, endSize: 0,
        colors: ['#FFD700', '#FF69B4', '#FFFFFF', '#00BFFF', '#FF4500'],
        alpha: 1, life: 2, drag: 0.95, z: 2, ay: 0.02,
      })
    } else if (combo >= 50) {
      this.particles.burst(cx, cy, 80, {
        speed: 6, spread: 10, size: 5, endSize: 0,
        colors: ['#FFD700', '#FF69B4', '#FFFFFF'], alpha: 1, life: 1.8, drag: 0.95, z: 2,
      })
    } else if (combo >= 30) {
      this.particles.burst(cx, cy, 50, {
        speed: 5, spread: 15, size: 4, endSize: 0,
        colors: ['#FFD700', '#FF4500'], alpha: 0.9, life: 1.5, drag: 0.96, z: 2,
      })
    } else {
      this.particles.burst(cx, cy, 25, {
        speed: 4, spread: 20, size: 3, endSize: 0,
        colors: ['#FFD700'], alpha: 0.8, life: 1.2, drag: 0.96, z: 2,
      })
    }
  }
}
