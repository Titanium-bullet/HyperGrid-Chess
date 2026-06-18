'use client'

import { useEffect, useRef } from 'react'
import { getEquippedBackground } from '@/lib/shop'
import { HYPERGRID_INVENTORY_CHANGED } from '@/lib/events'

type CyberCanvasProps = {
  skipIntro?: boolean
}

type Vertex = { x: number; y: number; dist: number; hue: number; brightness: number }
type HEdge = { x1: number; y: number; x2: number; dist: number; hue: number; brightness: number }
type VEdge = { x: number; y1: number; y2: number; dist: number; hue: number; brightness: number }
type Ring = { x: number; y: number; t: number; speed: number }
type Particle = {
  ar: number; ac: number; br: number; bc: number
  t: number; speed: number; hue: number; hops: number
}
type Cell = { cx: number; cy: number; glyph: string; hue: number; reveal: number }

const GRID = 60
const GLYPH_SIZE = 40
const GLYPH_GAP = 55
const GLYPH_ARM = 22

const CORE_HUE = 185
const EDGE_HUE = 285
const WHITE_HUE = 185
const BLACK_HUE = 285
const PARTICLE_HUES = [180, 350, 285, 48]
const MOUSE_RADIUS = 220
const SCAN_BAND = 90
const REVEAL_BAND = 115
const MAX_PARTICLES = 14
const MAX_HOPS = 5
const SCAN_DURATION = 6500
const SCAN_DURATION_V = 7200
const PIECE_FONT = `${Math.floor(GRID * 0.6)}px "Segoe UI Symbol","Apple Symbols","Noto Sans Symbols2","DejaVu Sans",sans-serif`

const PIECE_TYPES = ['K', 'Q', 'R', 'B', 'N', 'P'] as const
const PIECE_COLORS = ['w', 'b'] as const
const PIECE_GLYPHS: Record<string, Record<string, string>> = {
  w: { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' },
  b: { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' },
}

function hueForDist(dist: number) {
  return CORE_HUE + Math.min(dist, 1) * (EDGE_HUE - CORE_HUE)
}

function drawGlyph(ctx: CanvasRenderingContext2D, cx: number, cy: number, angle: number, opacity: number) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angle)
  ctx.strokeStyle = `rgba(0,255,255,${opacity})`
  ctx.lineWidth = 1
  const draw = (x1: number, y1: number, x2: number, y2: number) => {
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }
  draw(-GLYPH_SIZE, -GLYPH_SIZE, -GLYPH_SIZE, -GLYPH_SIZE + GLYPH_ARM)
  draw(-GLYPH_SIZE, -GLYPH_SIZE, -GLYPH_SIZE + GLYPH_ARM, -GLYPH_SIZE)
  draw(GLYPH_SIZE, -GLYPH_SIZE, GLYPH_SIZE, -GLYPH_SIZE + GLYPH_ARM)
  draw(GLYPH_SIZE, -GLYPH_SIZE, GLYPH_SIZE - GLYPH_ARM, -GLYPH_SIZE)
  draw(-GLYPH_SIZE, GLYPH_SIZE, -GLYPH_SIZE, GLYPH_SIZE - GLYPH_ARM)
  draw(-GLYPH_SIZE, GLYPH_SIZE, -GLYPH_SIZE + GLYPH_ARM, GLYPH_SIZE)
  draw(GLYPH_SIZE, GLYPH_SIZE, GLYPH_SIZE, GLYPH_SIZE - GLYPH_ARM)
  draw(GLYPH_SIZE, GLYPH_SIZE, GLYPH_SIZE - GLYPH_ARM, GLYPH_SIZE)
  ctx.restore()
}

export function CyberCanvas({ skipIntro = false }: CyberCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const themeRef = useRef<string>('bg-nexus')

  // Keep the equipped background theme in sync with the shop inventory.
  useEffect(() => {
    const apply = () => {
      themeRef.current = getEquippedBackground()
    }
    apply()
    window.addEventListener(HYPERGRID_INVENTORY_CHANGED, apply)
    return () => window.removeEventListener(HYPERGRID_INVENTORY_CHANGED, apply)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d')
    if (!ctx) return
    const c: HTMLCanvasElement = canvas
    const g: CanvasRenderingContext2D = ctx

    let W = 0
    let H = 0
    let cols = 0
    let rows = 0
    let verts: Vertex[] = []
    let hEdges: HEdge[] = []
    let vEdges: VEdge[] = []
    let rings: Ring[] = []
    let particles: Particle[] = []
    let cells: Cell[] = []
    let twinkleIdx = 0
    let nextTwinkle = 4000
    let nextRing = 1500
    let nextParticle = 600
    let scanActive = false
    let scanDir: 'H' | 'V' = 'H'
    let scanProgress = 0
    let scanCooldown = 1500
    let animId: number | null = null
    let paused = false
    let arcadeInit = false
    let arcadeStars: { x: number; y: number; s: number; p: number }[] = []
    let arcadeMarquee: { x: number; y: number; on: boolean; next: number; hue: number }[] = []
    const ARCADE_PIX = 56
    const startTime = skipIntro ? Date.now() - 10000 : Date.now()
    const glyphFadeStart = 4000

    const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, inside: false }

    function vertAt(r: number, col: number): Vertex | null {
      if (r < 0 || r > rows || col < 0 || col > cols) return null
      return verts[r * (cols + 1) + col] || null
    }

    function pickNeighbor(r: number, col: number, avoidR: number, avoidC: number): [number, number] {
      const opts: [number, number][] = []
      if (r > 0) opts.push([r - 1, col])
      if (r < rows) opts.push([r + 1, col])
      if (col > 0) opts.push([r, col - 1])
      if (col < cols) opts.push([r, col + 1])
      const filtered = opts.filter(([nr, nc]) => !(nr === avoidR && nc === avoidC))
      const pool = filtered.length ? filtered : opts
      return pool[Math.floor(Math.random() * pool.length)]
    }

    function buildGrid() {
      cols = Math.ceil(W / GRID) + 2
      rows = Math.ceil(H / GRID) + 2
      const cx = W / 2
      const cy = H / 2
      const maxDist = Math.sqrt(cx * cx + cy * cy)

      verts = []
      hEdges = []
      vEdges = []
      cells = []

      for (let r = 0; r <= rows; r++) {
        for (let col = 0; col <= cols; col++) {
          const x = col * GRID
          const y = r * GRID
          const dx = x - cx
          const dy = y - cy
          const dist = Math.sqrt(dx * dx + dy * dy) / maxDist
          verts.push({ x, y, dist, hue: hueForDist(dist), brightness: 0 })
        }
      }
      for (let r = 0; r <= rows; r++) {
        for (let col = 0; col < cols; col++) {
          const x1 = col * GRID
          const x2 = (col + 1) * GRID
          const y = r * GRID
          const mx = (x1 + x2) / 2
          const dist = Math.sqrt((mx - cx) ** 2 + (y - cy) ** 2) / maxDist
          hEdges.push({ x1, y, x2, dist, hue: hueForDist(dist), brightness: 0 })
        }
      }
      for (let col = 0; col <= cols; col++) {
        for (let r = 0; r < rows; r++) {
          const x = col * GRID
          const y1 = r * GRID
          const y2 = (r + 1) * GRID
          const my = (y1 + y2) / 2
          const dist = Math.sqrt((x - cx) ** 2 + (my - cy) ** 2) / maxDist
          vEdges.push({ x, y1, y2, dist, hue: hueForDist(dist), brightness: 0 })
        }
      }
      for (let r = 0; r < rows; r++) {
        for (let col = 0; col < cols; col++) {
          const cellX = col * GRID + GRID / 2
          const cellY = r * GRID + GRID / 2
          const color = PIECE_COLORS[Math.floor(Math.random() * PIECE_COLORS.length)]
          const type = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)]
          cells.push({
            cx: cellX,
            cy: cellY,
            glyph: PIECE_GLYPHS[color][type],
            hue: color === 'w' ? WHITE_HUE : BLACK_HUE,
            reveal: 0,
          })
        }
      }
    }

    function resize() {
      W = c.width = window.innerWidth
      H = c.height = window.innerHeight
      buildGrid()
      arcadeInit = false
    }
    resize()
    twinkleIdx = Math.floor(Math.random() * verts.length)

    function spawnRing() {
      const v = verts[Math.floor(Math.random() * verts.length)]
      rings.push({ x: v.x, y: v.y, t: 0, speed: 0.006 })
      nextRing = 1800 + Math.random() * 2800
    }

    function spawnParticle() {
      const r = Math.floor(Math.random() * (rows + 1))
      const col = Math.floor(Math.random() * (cols + 1))
      const [nr, nc] = pickNeighbor(r, col, -1, -1)
      particles.push({
        ar: r,
        ac: col,
        br: nr,
        bc: nc,
        t: 0,
        speed: 0.005 + Math.random() * 0.007,
        hue: PARTICLE_HUES[Math.floor(Math.random() * PARTICLE_HUES.length)],
        hops: 0,
      })
    }

    function applyMouseBoost() {
      if (!mouse.inside) return
      const mx = mouse.x
      const my = mouse.y
      const r = MOUSE_RADIUS
      const r2 = r * r
      for (const v of verts) {
        const dx = v.x - mx
        const dy = v.y - my
        const d2 = dx * dx + dy * dy
        if (d2 < r2) {
          const f = 1 - Math.sqrt(d2) / r
          v.brightness += f * f * 0.7
        }
      }
      for (const e of hEdges) {
        const dx = (e.x1 + e.x2) / 2 - mx
        const dy = e.y - my
        const d2 = dx * dx + dy * dy
        if (d2 < r2) {
          const f = 1 - Math.sqrt(d2) / r
          e.brightness += f * f * 0.55
        }
      }
      for (const e of vEdges) {
        const dx = e.x - mx
        const dy = (e.y1 + e.y2) / 2 - my
        const d2 = dx * dx + dy * dy
        if (d2 < r2) {
          const f = 1 - Math.sqrt(d2) / r
          e.brightness += f * f * 0.55
        }
      }
    }

    function applyScanBoost(scanX: number) {
      const band = SCAN_BAND
      for (const v of verts) {
        const d = Math.abs(v.x - scanX)
        if (d < band) v.brightness += (1 - d / band) * 0.4
      }
      for (const e of hEdges) {
        const d = Math.abs((e.x1 + e.x2) / 2 - scanX)
        if (d < band) e.brightness += (1 - d / band) * 0.35
      }
      for (const e of vEdges) {
        const d = Math.abs(e.x - scanX)
        if (d < band) e.brightness += (1 - d / band) * 0.35
      }
    }

    function applyScanBoostV(scanY: number) {
      const band = SCAN_BAND
      for (const v of verts) {
        const d = Math.abs(v.y - scanY)
        if (d < band) v.brightness += (1 - d / band) * 0.4
      }
      for (const e of hEdges) {
        const d = Math.abs(e.y - scanY)
        if (d < band) e.brightness += (1 - d / band) * 0.35
      }
      for (const e of vEdges) {
        const d = Math.abs((e.y1 + e.y2) / 2 - scanY)
        if (d < band) e.brightness += (1 - d / band) * 0.35
      }
    }

    function updateCellReveal(scanXY: number, scanAlongX: boolean, scanOn: boolean) {
      const mx = mouse.x
      const my = mouse.y
      const mouseOn = mouse.inside
      for (const cell of cells) {
        let target = 0
        if (scanOn) {
          const pos = scanAlongX ? cell.cx : cell.cy
          const d = Math.abs(pos - scanXY)
          if (d < REVEAL_BAND) target = 1 - d / REVEAL_BAND
        }
        if (mouseOn) {
          const dx = cell.cx - mx
          const dy = cell.cy - my
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < MOUSE_RADIUS) {
            const m = (1 - d / MOUSE_RADIUS) * 0.95
            if (m > target) target = m
          }
        }
        cell.reveal += (target - cell.reveal) * 0.18
      }
    }

    function draw() {
      if (paused) return
      const elapsed = Date.now() - startTime
      const theme = themeRef.current
      const phantom = theme === 'bg-phantom'

      // ---------- Basic (normal) theme: plain static grid, no frills ----------
      if (theme === 'bg-basic') {
        g.globalCompositeOperation = 'source-over'
        g.fillStyle = '#0a0a14'
        g.fillRect(0, 0, W, H)
        g.strokeStyle = 'rgba(120,140,160,0.10)'
        g.lineWidth = 1
        g.beginPath()
        for (let x = 0; x <= W; x += GRID) {
          g.moveTo(x, 0)
          g.lineTo(x, H)
        }
        for (let y = 0; y <= H; y += GRID) {
          g.moveTo(0, y)
          g.lineTo(W, y)
        }
        g.stroke()
        animId = requestAnimationFrame(draw)
        return
      }

      // ---------- Arcade theme: retro CRT cabinet ----------
      if (theme === 'bg-arcade') {
        if (!arcadeInit) {
          arcadeInit = true
          arcadeStars = []
          const starCount = Math.min(180, Math.floor((W * H) / 11000))
          for (let i = 0; i < starCount; i++) {
            arcadeStars.push({
              x: Math.random() * W,
              y: Math.random() * H,
              s: Math.random() * 1.6 + 0.4,
              p: Math.random() * Math.PI * 2,
            })
          }
          const HUES = [325, 185, 50]
          arcadeMarquee = []
          const mw = Math.ceil(W / ARCADE_PIX)
          const mh = Math.ceil(H / ARCADE_PIX)
          for (let r = 0; r < mh; r++) {
            for (let cc = 0; cc < mw; cc++) {
              if (Math.random() < 0.15) {
                arcadeMarquee.push({
                  x: cc * ARCADE_PIX,
                  y: r * ARCADE_PIX,
                  on: Math.random() < 0.5,
                  next: elapsed + Math.random() * 700,
                  hue: HUES[Math.floor(Math.random() * HUES.length)],
                })
              }
            }
          }
        }

        const acx = W / 2
        const acy = H / 2

        g.globalCompositeOperation = 'source-over'
        const abg = g.createRadialGradient(acx, acy, 0, acx, acy, Math.max(W, H) * 0.7)
        abg.addColorStop(0, '#160a2c')
        abg.addColorStop(0.6, '#0a0414')
        abg.addColorStop(1, '#05030c')
        g.fillStyle = abg
        g.fillRect(0, 0, W, H)

        // twinkling starfield
        for (const st of arcadeStars) {
          const tw = 0.35 + 0.65 * (Math.sin(elapsed / 700 + st.p) * 0.5 + 0.5)
          g.globalAlpha = tw * 0.85
          g.fillStyle = '#cfe9ff'
          g.fillRect(st.x, st.y, st.s, st.s)
        }
        g.globalAlpha = 1

        // chunky pixel grid (faint)
        g.strokeStyle = 'rgba(150,90,220,0.10)'
        g.lineWidth = 1
        g.beginPath()
        for (let x = 0; x <= W; x += ARCADE_PIX) {
          g.moveTo(x, 0)
          g.lineTo(x, H)
        }
        for (let y = 0; y <= H; y += ARCADE_PIX) {
          g.moveTo(0, y)
          g.lineTo(W, y)
        }
        g.stroke()

        // blinking neon marquee pixels
        g.globalCompositeOperation = 'lighter'
        const half = ARCADE_PIX / 2
        const psz = ARCADE_PIX * 0.34
        for (const m of arcadeMarquee) {
          if (elapsed >= m.next) {
            m.on = !m.on
            m.next = elapsed + 350 + Math.random() * 650
          }
          if (m.on) {
            const col = `hsl(${m.hue}, 100%, 62%)`
            g.fillStyle = col
            g.shadowColor = col
            g.shadowBlur = 16
            g.fillRect(m.x + half - psz / 2, m.y + half - psz / 2, psz, psz)
          }
        }
        g.shadowBlur = 0
        g.globalCompositeOperation = 'source-over'

        // CRT scanlines
        g.fillStyle = 'rgba(0,0,0,0.18)'
        for (let y = 0; y < H; y += 3) {
          g.fillRect(0, y, W, 1)
        }

        // slow vertical refresh sweep
        const sweepY = (elapsed / 18) % (H + 200) - 100
        const sg = g.createLinearGradient(0, sweepY - 60, 0, sweepY + 60)
        sg.addColorStop(0, 'rgba(120,200,255,0)')
        sg.addColorStop(0.5, 'rgba(120,200,255,0.06)')
        sg.addColorStop(1, 'rgba(120,200,255,0)')
        g.fillStyle = sg
        g.fillRect(0, sweepY - 60, W, 120)

        // cabinet-glass vignette
        const vg = g.createRadialGradient(acx, acy, Math.min(W, H) * 0.3, acx, acy, Math.max(W, H) * 0.75)
        vg.addColorStop(0, 'rgba(0,0,0,0)')
        vg.addColorStop(1, 'rgba(0,0,0,0.55)')
        g.fillStyle = vg
        g.fillRect(0, 0, W, H)

        animId = requestAnimationFrame(draw)
        return
      }

      mouse.x += (mouse.tx - mouse.x) * 0.08
      mouse.y += (mouse.ty - mouse.y) * 0.08

      const cx = W / 2
      const cy = H / 2

      // ---------- Backdrop: slow-drifting radial depth ----------
      const bgHue = CORE_HUE + (Math.sin(elapsed / 18000) * 0.5 + 0.5) * (EDGE_HUE - CORE_HUE)
      const bg = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.75)
      bg.addColorStop(0, `hsla(${bgHue}, 70%, 10%, 1)`)
      bg.addColorStop(0.5, `hsla(${bgHue}, 70%, 5%, 1)`)
      bg.addColorStop(1, '#0a0a14')
      g.fillStyle = bg
      g.globalCompositeOperation = 'source-over'
      g.fillRect(0, 0, W, H)

      const DRAW_PHASE = 2500
      const PULSE_START = 2500
      const PULSE_DURATION = 600
      const IDLE_START = PULSE_START + PULSE_DURATION

      // ---------- Phase base brightness ----------
      if (elapsed < DRAW_PHASE) {
        const progress = elapsed / DRAW_PHASE
        const waveFront = progress * 1.3
        for (const e of hEdges) {
          e.brightness = e.dist < waveFront ? Math.min((waveFront - e.dist) / 0.15, 1) * 0.8 : 0
        }
        for (const e of vEdges) {
          e.brightness = e.dist < waveFront ? Math.min((waveFront - e.dist) / 0.15, 1) * 0.8 : 0
        }
        for (const v of verts) {
          v.brightness = v.dist < waveFront ? Math.min((waveFront - v.dist) / 0.1, 1) * 1.0 : 0
        }
      } else if (elapsed < IDLE_START) {
        const pulseT = (elapsed - PULSE_START) / PULSE_DURATION
        const pulseRadius = pulseT * 1.4
        const pulseBright = (1 - pulseT) * 1.0
        for (const e of hEdges) {
          const d = Math.abs(e.dist - pulseRadius)
          e.brightness = 0.8 + (d < 0.15 ? (1 - d / 0.15) * pulseBright : 0)
        }
        for (const e of vEdges) {
          const d = Math.abs(e.dist - pulseRadius)
          e.brightness = 0.8 + (d < 0.15 ? (1 - d / 0.15) * pulseBright : 0)
        }
        for (const v of verts) {
          const d = Math.abs(v.dist - pulseRadius)
          v.brightness = 1.0 + (d < 0.15 ? (1 - d / 0.15) * pulseBright * 0.5 : 0)
        }
      } else {
        const settleT = Math.min((elapsed - IDLE_START) / 1500, 1)
        const idleBase = 0.14 * settleT

        for (const e of hEdges) e.brightness = idleBase
        for (const e of vEdges) e.brightness = idleBase
        for (const v of verts) v.brightness = idleBase * 1.4

        if (phantom) applyMouseBoost()

        // Scan pulse scheduling — alternates H then V with a short gap (Nexus only)
        if (!phantom) {
          if (!scanActive) {
            scanCooldown -= 16
            if (scanCooldown <= 0) {
              scanActive = true
              scanProgress = 0
            }
          } else {
            const duration = scanDir === 'H' ? SCAN_DURATION : SCAN_DURATION_V
            scanProgress += 16 / duration
            if (scanProgress >= 1) {
              scanActive = false
              scanDir = scanDir === 'H' ? 'V' : 'H'
              scanCooldown = 1200 + Math.random() * 600
            } else if (scanDir === 'H') {
              applyScanBoost(scanProgress * (W + 200) - 100)
            } else {
              applyScanBoostV(scanProgress * (H + 200) - 100)
            }
          }
        }

        if (phantom) {
          const scanOn = scanActive
          const scanXY = scanOn
            ? scanDir === 'H'
              ? scanProgress * (W + 200) - 100
              : scanProgress * (H + 200) - 100
            : -1e9
          updateCellReveal(scanXY, scanDir === 'H', scanOn)
        } else {
          // Nexus extras: twinkle + particles + rings
          nextTwinkle -= 16
          if (nextTwinkle <= 0) {
            twinkleIdx = Math.floor(Math.random() * verts.length)
            nextTwinkle = 800 + Math.random() * 2000
          }
          const twinkle = verts[twinkleIdx]
          if (twinkle) {
            const twinkleLife = nextTwinkle / (800 + 2000)
            const twinklePeak = Math.sin(twinkleLife * Math.PI) * 1.0
            twinkle.brightness = idleBase * 1.4 + twinklePeak
          }

          if (rings.length < 2) {
            nextRing -= 16
            if (nextRing <= 0) spawnRing()
          }
        }
      }

      // ---------- Render grid lines (tinted by distance) ----------
      g.lineWidth = 1.5
      for (const e of hEdges) {
        if (e.brightness < 0.005) continue
        g.strokeStyle = `hsla(${e.hue},100%,62%,${Math.min(e.brightness, 1)})`
        g.beginPath()
        g.moveTo(e.x1, e.y)
        g.lineTo(e.x2, e.y)
        g.stroke()
      }
      for (const e of vEdges) {
        if (e.brightness < 0.005) continue
        g.strokeStyle = `hsla(${e.hue},100%,62%,${Math.min(e.brightness, 1)})`
        g.beginPath()
        g.moveTo(e.x, e.y1)
        g.lineTo(e.x, e.y2)
        g.stroke()
      }

      // ---------- Render verts (core dots) ----------
      for (const v of verts) {
        if (v.brightness < 0.01) continue
        g.fillStyle = `hsla(${v.hue},100%,70%,${Math.min(v.brightness, 1)})`
        g.beginPath()
        g.arc(v.x, v.y, 2.5, 0, Math.PI * 2)
        g.fill()
      }

      // ---------- Additive bloom layer ----------
      g.globalCompositeOperation = 'lighter'

      // Bright verts get a bloomed halo
      for (const v of verts) {
        if (v.brightness < 0.45) continue
        g.shadowBlur = 10
        g.shadowColor = `hsla(${v.hue},100%,60%,0.9)`
        g.fillStyle = `hsla(${v.hue},100%,75%,${Math.min(v.brightness, 1) * 0.6})`
        g.beginPath()
        g.arc(v.x, v.y, 3, 0, Math.PI * 2)
        g.fill()
      }
      g.shadowBlur = 0

      // Scan band glow
      if (scanActive && scanDir === 'H') {
        const scanX = scanProgress * (W + 200) - 100
        const sg = g.createLinearGradient(scanX - SCAN_BAND, 0, scanX + SCAN_BAND, 0)
        sg.addColorStop(0, 'rgba(0,255,255,0)')
        sg.addColorStop(0.5, 'rgba(0,255,255,0.07)')
        sg.addColorStop(1, 'rgba(0,255,255,0)')
        g.fillStyle = sg
        g.fillRect(scanX - SCAN_BAND, 0, SCAN_BAND * 2, H)
      }
      if (scanActive && scanDir === 'V') {
        const scanY = scanProgress * (H + 200) - 100
        const sg = g.createLinearGradient(0, scanY - SCAN_BAND, 0, scanY + SCAN_BAND)
        sg.addColorStop(0, 'rgba(160,120,255,0)')
        sg.addColorStop(0.5, 'rgba(160,120,255,0.07)')
        sg.addColorStop(1, 'rgba(160,120,255,0)')
        g.fillStyle = sg
        g.fillRect(0, scanY - SCAN_BAND, W, SCAN_BAND * 2)
      }

      // Mouse glow (Spectra only — complements the piece reveal)
      if (phantom && mouse.inside) {
        const mg = g.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, MOUSE_RADIUS)
        mg.addColorStop(0, 'rgba(150,255,255,0.10)')
        mg.addColorStop(0.4, 'rgba(0,255,255,0.05)')
        mg.addColorStop(1, 'rgba(0,255,255,0)')
        g.fillStyle = mg
        g.fillRect(mouse.x - MOUSE_RADIUS, mouse.y - MOUSE_RADIUS, MOUSE_RADIUS * 2, MOUSE_RADIUS * 2)
      }

      if (phantom) {
        // ---------- Spectra: revealed chess pieces ----------
        g.font = PIECE_FONT
        g.textAlign = 'center'
        g.textBaseline = 'middle'
        g.shadowBlur = 0
        for (const cell of cells) {
          const r = cell.reveal
          if (r < 0.02 || r > 0.5) continue
          g.fillStyle = `hsla(${cell.hue},100%,72%,${Math.min(r, 1)})`
          g.fillText(cell.glyph, cell.cx, cell.cy)
        }
        g.shadowBlur = 14
        for (const cell of cells) {
          if (cell.reveal <= 0.5) continue
          g.shadowColor = `hsla(${cell.hue},100%,60%,0.9)`
          g.fillStyle = `hsla(${cell.hue},100%,78%,${Math.min(cell.reveal, 1)})`
          g.fillText(cell.glyph, cell.cx, cell.cy)
        }
        g.shadowBlur = 0
      } else {
        // ---------- Nexus: rings (bloomed) ----------
        for (let i = rings.length - 1; i >= 0; i--) {
          const rn = rings[i]
          rn.t += rn.speed
          if (rn.t >= 1) {
            rings.splice(i, 1)
            continue
          }
          const radius = 2 + rn.t * 50
          const alpha = (1 - rn.t) * 0.8
          g.shadowBlur = 12
          g.shadowColor = `rgba(0,255,255,${alpha})`
          g.strokeStyle = `rgba(0,255,255,${alpha})`
          g.lineWidth = 1.5
          g.beginPath()
          g.arc(rn.x, rn.y, radius, 0, Math.PI * 2)
          g.stroke()
          if (radius > 10) {
            g.strokeStyle = `rgba(0,255,255,${alpha * 0.4})`
            g.lineWidth = 1
            g.beginPath()
            g.arc(rn.x, rn.y, radius * 0.6, 0, Math.PI * 2)
            g.stroke()
          }
          g.shadowBlur = 0
          const ringGlow = g.createRadialGradient(rn.x, rn.y, radius * 0.5, rn.x, rn.y, radius + 15)
          ringGlow.addColorStop(0, 'rgba(0,255,255,0)')
          ringGlow.addColorStop(0.7, `rgba(0,255,255,${alpha * 0.2})`)
          ringGlow.addColorStop(1, 'rgba(0,255,255,0)')
          g.fillStyle = ringGlow
          g.beginPath()
          g.arc(rn.x, rn.y, radius + 15, 0, Math.PI * 2)
          g.fill()
        }
      }

      g.globalCompositeOperation = 'source-over'

      // ---------- Corner glyphs (Nexus only) ----------
      if (!phantom && elapsed > glyphFadeStart) {
        const glyphAge = elapsed - glyphFadeStart
        const glyphAlpha = Math.min(glyphAge / 2000, 1) * (0.6 + 0.25 * Math.sin(elapsed / 4000))
        const glyphAngle = (elapsed / 30000) * Math.PI * 2
        drawGlyph(g, GLYPH_GAP, GLYPH_GAP, glyphAngle, glyphAlpha)
        drawGlyph(g, W - GLYPH_GAP, GLYPH_GAP, glyphAngle, glyphAlpha)
        drawGlyph(g, GLYPH_GAP, H - GLYPH_GAP, glyphAngle, glyphAlpha)
        drawGlyph(g, W - GLYPH_GAP, H - GLYPH_GAP, glyphAngle, glyphAlpha)
      }

      animId = requestAnimationFrame(draw)
    }

    function onVisibility() {
      if (document.hidden) {
        paused = true
        if (animId) {
          cancelAnimationFrame(animId)
          animId = null
        }
      } else {
        paused = false
        if (!animId) animId = requestAnimationFrame(draw)
      }
    }

    function onMouseMove(e: MouseEvent) {
      mouse.tx = e.clientX
      mouse.ty = e.clientY
      mouse.inside = true
    }
    function onMouseLeave() {
      mouse.inside = false
    }

    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseout', onMouseLeave)
    document.addEventListener('visibilitychange', onVisibility)
    animId = requestAnimationFrame(draw)

    return () => {
      paused = true
      if (animId) cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseout', onMouseLeave)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [skipIntro])

  return <canvas id="cyberCanvas" ref={canvasRef} aria-hidden />
}
