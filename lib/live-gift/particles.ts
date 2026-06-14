import { GIFT_PARTICLE_MAX } from './config'

type RGB = { r: number; g: number; b: number }

type Particle = {
  alive: boolean
  x: number
  y: number
  z: 0 | 1 | 2
  vx: number
  vy: number
  ay: number
  drag: number
  size: number
  startSize: number
  endSize: number
  r: number
  g: number
  b: number
  alpha: number
  life: number
  maxLife: number
}

export type EmitOptions = {
  x?: number
  y?: number
  z?: 0 | 1 | 2
  vx?: number
  vy?: number
  ay?: number
  drag?: number
  size?: number
  endSize?: number
  color?: string | RGB
  alpha?: number
  life?: number
}

export type BurstOptions = {
  speed?: number
  speedVar?: number
  spread?: number
  size?: number
  endSize?: number
  colors?: string[]
  alpha?: number
  life?: number
  drag?: number
  z?: 0 | 1 | 2
  ay?: number
}

export type RainOptions = BurstOptions & {
  vx?: number
  vy?: number
}

export type FountainOptions = BurstOptions
export type FireworkOptions = BurstOptions & { count?: number }
export type TrailOptions = BurstOptions

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function hexToRgb(hex: string): RGB {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 255, g: 255, b: 255 }
}

export class GiftParticleEngine {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private pool: Particle[] = []
  private active = false
  private animId: number | null = null
  private lastTime = 0
  private resizeHandler: (() => void) | null = null

  constructor() {
    for (let i = 0; i < GIFT_PARTICLE_MAX; i++) {
      this.pool.push({
        alive: false,
        x: 0,
        y: 0,
        z: 1,
        vx: 0,
        vy: 0,
        ay: 0,
        drag: 0.97,
        size: 4,
        startSize: 4,
        endSize: 0,
        r: 255,
        g: 255,
        b: 255,
        alpha: 1,
        life: 0,
        maxLife: 2,
      })
    }
  }

  init(): void {
    if (this.canvas || typeof document === 'undefined') return
    const canvas = document.createElement('canvas')
    canvas.id = 'giftParticleCanvas'
    canvas.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9001;pointer-events:none;'
    document.body.appendChild(canvas)
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.resize()
    this.resizeHandler = () => this.resize()
    window.addEventListener('resize', this.resizeHandler)
  }

  private resize(): void {
    if (!this.canvas) return
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  private grab(): Particle | null {
    for (const p of this.pool) if (!p.alive) return p
    let oldest: Particle | null = null
    let oldestLife = -1
    for (const p of this.pool) {
      if (p.alive && p.life > oldestLife) {
        oldest = p
        oldestLife = p.life
      }
    }
    if (oldest) {
      oldest.alive = false
      return oldest
    }
    return null
  }

  emit(o: EmitOptions): void {
    if (!this.canvas) return
    const p = this.grab()
    if (!p) return
    p.alive = true
    p.x = o.x ?? this.canvas.width / 2
    p.y = o.y ?? this.canvas.height / 2
    p.z = (o.z ?? 1) as 0 | 1 | 2
    p.vx = o.vx ?? 0
    p.vy = o.vy ?? 0
    p.ay = o.ay ?? 0
    p.drag = o.drag ?? 0.97
    p.size = o.size ?? 4
    p.startSize = p.size
    p.endSize = o.endSize ?? 0
    const c = o.color ? (typeof o.color === 'string' ? hexToRgb(o.color) : o.color) : { r: 255, g: 255, b: 255 }
    p.r = c.r
    p.g = c.g
    p.b = c.b
    p.alpha = o.alpha ?? 1
    p.life = 0
    p.maxLife = o.life ?? 2
    if (!this.active) {
      this.active = true
      this.lastTime = performance.now()
      this.animId = requestAnimationFrame((t) => this.loop(t))
    }
  }

  private loop(now: number): void {
    if (!this.active || !this.ctx || !this.canvas) return
    const dt = Math.min((now - this.lastTime) / 1000, 0.05)
    this.lastTime = now
    const { ctx, canvas } = this
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.globalCompositeOperation = 'lighter'
    let any = false
    for (let layer: 0 | 1 | 2 = 0; layer <= 2; layer = ((layer + 1) as 0 | 1 | 2)) {
      for (const p of this.pool) {
        if (!p.alive || p.z !== layer) continue
        any = true
        p.life += dt
        if (p.life >= p.maxLife) {
          p.alive = false
          continue
        }
        p.vy += p.ay * dt * 60
        p.vx *= p.drag
        p.vy *= p.drag
        p.x += p.vx * dt * 60
        p.y += p.vy * dt * 60
        const t = p.life / p.maxLife
        const sz = p.startSize + (p.endSize - p.startSize) * t
        const a = p.alpha * (1 - t) * (t < 0.08 ? t / 0.08 : 1)
        if (a < 0.01 || sz < 0.2) {
          p.alive = false
          continue
        }
        const col = `rgb(${p.r},${p.g},${p.b})`
        if (sz > 3) {
          ctx.globalAlpha = a * 0.15
          ctx.fillStyle = col
          ctx.beginPath()
          ctx.arc(p.x, p.y, sz * 3, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = a
        ctx.fillStyle = col
        ctx.beginPath()
        ctx.arc(p.x, p.y, sz, 0, Math.PI * 2)
        ctx.fill()
      }
      if (layer === 2) break
    }
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    if (any) {
      this.animId = requestAnimationFrame((t) => this.loop(t))
    } else {
      this.active = false
    }
  }

  burst(x: number, y: number, count: number, o: BurstOptions): void {
    const colors = o.colors
    for (let i = 0; i < count; i++) {
      const angle = ((Math.PI * 2) / count) * i + (Math.random() - 0.5) * 0.5
      const spd = (o.speed ?? 3) * (1 + (Math.random() - 0.5) * (o.speedVar ?? 0.5))
      this.emit({
        x: x + (Math.random() - 0.5) * (o.spread ?? 15),
        y: y + (Math.random() - 0.5) * (o.spread ?? 15),
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        ay: o.ay ?? 0.03,
        size: o.size ?? 4,
        endSize: o.endSize ?? 0,
        color: colors ? pick(colors) : '#fff',
        alpha: o.alpha ?? 1,
        life: o.life ?? 2,
        drag: o.drag ?? 0.96,
        z: o.z ?? 2,
      })
    }
  }

  rain(count: number, o: RainOptions): void {
    if (!this.canvas) return
    const w = this.canvas.width
    const colors = o.colors
    for (let i = 0; i < count; i++) {
      this.emit({
        x: Math.random() * w,
        y: -10 - Math.random() * 200,
        vx: o.vx ?? (Math.random() - 0.5) * 0.3,
        vy: o.vy ?? 2 + Math.random() * 4,
        ay: o.ay ?? 0.015,
        size: o.size ?? 3,
        endSize: o.endSize ?? 1,
        color: colors ? pick(colors) : '#fff',
        alpha: o.alpha ?? 0.6,
        life: o.life ?? 3.5,
        drag: o.drag ?? 0.999,
        z: o.z ?? 0,
      })
    }
  }

  fountain(x: number, y: number, count: number, o: FountainOptions): void {
    const colors = o.colors
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * (o.spread ?? 0.8)
      const spd = (o.speed ?? 5) * (0.5 + Math.random())
      this.emit({
        x: x + (Math.random() - 0.5) * 10,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        ay: o.ay ?? 0.06,
        size: o.size ?? 3,
        endSize: o.endSize ?? 0,
        color: colors ? pick(colors) : '#fff',
        alpha: o.alpha ?? 1,
        life: o.life ?? 2,
        drag: o.drag ?? 0.97,
        z: o.z ?? 2,
      })
    }
  }

  firework(x: number, y: number, o: FireworkOptions): void {
    this.burst(x, y, o.count ?? 60, {
      speed: o.speed ?? 5,
      speedVar: 0.6,
      spread: 5,
      size: o.size ?? 4,
      endSize: 0,
      colors: o.colors ?? ['#FF0000', '#FFD700', '#FFFFFF'],
      alpha: 1,
      life: o.life ?? 1.5,
      drag: 0.955,
      z: o.z ?? 2,
      ay: o.ay ?? 0.03,
    })
  }

  clear(): void {
    for (const p of this.pool) p.alive = false
    if (this.ctx && this.canvas) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.active = false
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId)
      this.animId = null
    }
  }

  destroy(): void {
    this.clear()
    if (this.canvas?.parentNode) this.canvas.parentNode.removeChild(this.canvas)
    if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler)
    this.canvas = null
    this.ctx = null
    this.resizeHandler = null
  }

  static hexToRgb = hexToRgb
}
