'use client'

import { useEffect, useRef } from 'react'

type CyberCanvasProps = {
  skipIntro?: boolean
}

type Vertex = { x: number; y: number; dist: number; brightness: number }
type HEdge = { x1: number; y: number; x2: number; dist: number; brightness: number }
type VEdge = { x: number; y1: number; y2: number; dist: number; brightness: number }
type Ring = { x: number; y: number; t: number; speed: number }

const GRID = 60
const GLYPH_SIZE = 40
const GLYPH_GAP = 55
const GLYPH_ARM = 22

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

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d')
    if (!ctx) return
    const c: HTMLCanvasElement = canvas
    const g: CanvasRenderingContext2D = ctx

    let W = 0
    let H = 0
    let verts: Vertex[] = []
    let hEdges: HEdge[] = []
    let vEdges: VEdge[] = []
    let rings: Ring[] = []
    let twinkleIdx = 0
    let nextTwinkle = 4000
    let nextRing = 1500
    let animId: number | null = null
    let paused = false
    const startTime = skipIntro ? Date.now() - 10000 : Date.now()
    const glyphFadeStart = 4000

    function buildGrid() {
      const cols = Math.ceil(W / GRID) + 2
      const rows = Math.ceil(H / GRID) + 2
      const cx = W / 2
      const cy = H / 2
      const maxDist = Math.sqrt(cx * cx + cy * cy)

      verts = []
      hEdges = []
      vEdges = []

      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
          const x = c * GRID
          const y = r * GRID
          const dx = x - cx
          const dy = y - cy
          const dist = Math.sqrt(dx * dx + dy * dy) / maxDist
          verts.push({ x, y, dist, brightness: 0 })
        }
      }
      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x1 = c * GRID
          const x2 = (c + 1) * GRID
          const y = r * GRID
          const mx = (x1 + x2) / 2
          const dist = Math.sqrt((mx - cx) ** 2 + (y - cy) ** 2) / maxDist
          hEdges.push({ x1, y, x2, dist, brightness: 0 })
        }
      }
      for (let c = 0; c <= cols; c++) {
        for (let r = 0; r < rows; r++) {
          const x = c * GRID
          const y1 = r * GRID
          const y2 = (r + 1) * GRID
          const my = (y1 + y2) / 2
          const dist = Math.sqrt((x - cx) ** 2 + (my - cy) ** 2) / maxDist
          vEdges.push({ x, y1, y2, dist, brightness: 0 })
        }
      }
    }

    function resize() {
      W = c.width = window.innerWidth
      H = c.height = window.innerHeight
      buildGrid()
    }
    resize()
    twinkleIdx = Math.floor(Math.random() * verts.length)

    function spawnRing() {
      const v = verts[Math.floor(Math.random() * verts.length)]
      rings.push({ x: v.x, y: v.y, t: 0, speed: 0.006 })
      nextRing = 1500 + Math.random() * 2500
    }

    function draw() {
      if (paused) return
      const elapsed = Date.now() - startTime
      g.clearRect(0, 0, W, H)

      const DRAW_PHASE = 2500
      const PULSE_START = 2500
      const PULSE_DURATION = 600
      const IDLE_START = PULSE_START + PULSE_DURATION

      if (elapsed < DRAW_PHASE) {
        const progress = elapsed / DRAW_PHASE
        const waveFront = progress * 1.3
        for (const e of hEdges) {
          if (e.dist < waveFront) {
            const edgeProgress = Math.min((waveFront - e.dist) / 0.15, 1)
            e.brightness = edgeProgress * 0.8
          }
        }
        for (const e of vEdges) {
          if (e.dist < waveFront) {
            const edgeProgress = Math.min((waveFront - e.dist) / 0.15, 1)
            e.brightness = edgeProgress * 0.8
          }
        }
        for (const v of verts) {
          if (v.dist < waveFront) {
            v.brightness = Math.min((waveFront - v.dist) / 0.1, 1) * 1.0
          }
        }
      } else if (elapsed < IDLE_START) {
        const pulseT = (elapsed - PULSE_START) / PULSE_DURATION
        const pulseRadius = pulseT * 1.4
        const pulseBright = (1 - pulseT) * 1.0
        for (const e of hEdges) {
          const d = Math.abs(e.dist - pulseRadius)
          const boost = d < 0.15 ? (1 - d / 0.15) * pulseBright : 0
          e.brightness = 0.8 + boost
        }
        for (const e of vEdges) {
          const d = Math.abs(e.dist - pulseRadius)
          const boost = d < 0.15 ? (1 - d / 0.15) * pulseBright : 0
          e.brightness = 0.8 + boost
        }
        for (const v of verts) {
          const d = Math.abs(v.dist - pulseRadius)
          const boost = d < 0.15 ? (1 - d / 0.15) * pulseBright : 0
          v.brightness = 1.0 + boost * 0.5
        }
      } else {
        const settleT = Math.min((elapsed - IDLE_START) / 1500, 1)
        const idleBase = 0.15 * settleT

        nextTwinkle -= 16
        if (nextTwinkle <= 0) {
          twinkleIdx = Math.floor(Math.random() * verts.length)
          nextTwinkle = 800 + Math.random() * 2000
        }
        for (const e of hEdges) e.brightness = idleBase
        for (const e of vEdges) e.brightness = idleBase
        for (const v of verts) v.brightness = idleBase * 1.5

        const twinkle = verts[twinkleIdx]
        if (twinkle) {
          const twinkleLife = nextTwinkle / (800 + 2000)
          const twinklePeak = Math.sin(twinkleLife * Math.PI) * 1.0
          twinkle.brightness = idleBase * 1.5 + twinklePeak
        }
        if (rings.length < 2) {
          nextRing -= 16
          if (nextRing <= 0) spawnRing()
        }
      }

      g.lineWidth = 1.5
      for (const e of hEdges) {
        if (e.brightness < 0.005) continue
        g.strokeStyle = `rgba(0,255,255,${e.brightness})`
        g.beginPath()
        g.moveTo(e.x1, e.y)
        g.lineTo(e.x2, e.y)
        g.stroke()
      }
      for (const e of vEdges) {
        if (e.brightness < 0.005) continue
        g.strokeStyle = `rgba(0,255,255,${e.brightness})`
        g.beginPath()
        g.moveTo(e.x, e.y1)
        g.lineTo(e.x, e.y2)
        g.stroke()
      }
      for (const v of verts) {
        if (v.brightness < 0.01) continue
        g.fillStyle = `rgba(0,255,255,${v.brightness})`
        g.beginPath()
        g.arc(v.x, v.y, 2.5, 0, Math.PI * 2)
        g.fill()
      }

      for (let i = rings.length - 1; i >= 0; i--) {
        const rn = rings[i]
        rn.t += rn.speed
        if (rn.t >= 1) {
          rings.splice(i, 1)
          continue
        }
        const radius = 2 + rn.t * 50
        const alpha = (1 - rn.t) * 0.8
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
        const ringGlow = g.createRadialGradient(rn.x, rn.y, radius * 0.5, rn.x, rn.y, radius + 15)
        ringGlow.addColorStop(0, 'rgba(0,255,255,0)')
        ringGlow.addColorStop(0.7, `rgba(0,255,255,${alpha * 0.2})`)
        ringGlow.addColorStop(1, 'rgba(0,255,255,0)')
        g.fillStyle = ringGlow
        g.beginPath()
        g.arc(rn.x, rn.y, radius + 15, 0, Math.PI * 2)
        g.fill()
      }

      if (elapsed > glyphFadeStart) {
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

    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)
    animId = requestAnimationFrame(draw)

    return () => {
      paused = true
      if (animId) cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [skipIntro])

  return <canvas id="cyberCanvas" ref={canvasRef} aria-hidden />
}
