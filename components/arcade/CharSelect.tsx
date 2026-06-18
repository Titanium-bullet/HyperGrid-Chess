'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { ROSTER, resolvePalette, type FighterDef } from '@/lib/arcade/characters'
import { drawFighter, resetSkeletonCache, type FighterView } from './ArenaCanvas'
import { playSound } from '@/lib/game-audio'
import styles from './CharSelect.module.css'

export type Pick = {
  charIdx: number
  paletteIdx: number
  ready: boolean
}

type Props = {
  onConfirm: (p1: FighterDef, p2: FighterDef) => void
}

const P1_COLOR = '#23eaff'
const P2_COLOR = '#ff5a3c'

export function CharSelect({ onConfirm }: Props) {
  const [p1, setP1] = useState<Pick>({ charIdx: 0, paletteIdx: 0, ready: false })
  const [p2, setP2] = useState<Pick>({ charIdx: 1, paletteIdx: 0, ready: false })
  const [countdown, setCountdown] = useState<number | null>(null)

  // keep latest values in refs so the global key handler never goes stale
  const p1Ref = useRef(p1)
  const p2Ref = useRef(p2)
  const cdRef = useRef(countdown)
  const confirmRef = useRef(onConfirm)
  p1Ref.current = p1
  p2Ref.current = p2
  cdRef.current = countdown
  confirmRef.current = onConfirm

  const locked = countdown !== null

  const setP1Pick = useCallback((fn: (s: Pick) => Pick) => {
    setP1((prev) => (prev.ready ? prev : fn(prev)))
  }, [])
  const setP2Pick = useCallback((fn: (s: Pick) => Pick) => {
    setP2((prev) => (prev.ready ? prev : fn(prev)))
  }, [])

  const toggleReady = useCallback((who: 0 | 1) => {
    if (cdRef.current !== null) return
    playSound('move')
    if (who === 0) setP1((s) => ({ ...s, ready: !s.ready }))
    else setP2((s) => ({ ...s, ready: !s.ready }))
  }, [])

  // keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (cdRef.current !== null) return
      switch (e.code) {
        // P1: A/D char, F/G color, H ready
        case 'KeyA':
          setP1Pick((s) => ({ ...s, charIdx: (s.charIdx + ROSTER.length - 1) % ROSTER.length }))
          playSound('move')
          break
        case 'KeyD':
          setP1Pick((s) => ({ ...s, charIdx: (s.charIdx + 1) % ROSTER.length }))
          playSound('move')
          break
        case 'KeyF':
          setP1Pick((s) => ({ ...s, paletteIdx: cyclePal(s.charIdx, s.paletteIdx, -1) }))
          break
        case 'KeyG':
          setP1Pick((s) => ({ ...s, paletteIdx: cyclePal(s.charIdx, s.paletteIdx, 1) }))
          break
        case 'KeyH':
          toggleReady(0)
          break
        // P2: arrows char, J/K color, L ready
        case 'ArrowLeft':
          setP2Pick((s) => ({ ...s, charIdx: (s.charIdx + ROSTER.length - 1) % ROSTER.length }))
          playSound('move')
          e.preventDefault()
          break
        case 'ArrowRight':
          setP2Pick((s) => ({ ...s, charIdx: (s.charIdx + 1) % ROSTER.length }))
          playSound('move')
          e.preventDefault()
          break
        case 'KeyJ':
          setP2Pick((s) => ({ ...s, paletteIdx: cyclePal(s.charIdx, s.paletteIdx, -1) }))
          break
        case 'KeyK':
          setP2Pick((s) => ({ ...s, paletteIdx: cyclePal(s.charIdx, s.paletteIdx, 1) }))
          break
        case 'KeyL':
          toggleReady(1)
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setP1Pick, setP2Pick, toggleReady])

  // start countdown once both ready
  useEffect(() => {
    if (p1.ready && p2.ready && countdown === null) {
      setCountdown(3)
    }
  }, [p1.ready, p2.ready, countdown])

  // drive countdown
  useEffect(() => {
    if (countdown === null) return
    if (countdown <= 0) {
      const a = p1Ref.current
      const b = p2Ref.current
      confirmRef.current(
        resolvePalette(ROSTER[a.charIdx], a.paletteIdx),
        resolvePalette(ROSTER[b.charIdx], b.paletteIdx),
      )
      return
    }
    playSound('round-bell')
    const t = window.setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 650)
    return () => window.clearTimeout(t)
  }, [countdown])

  const clickChar = (who: 0 | 1, idx: number) => {
    if (locked) return
    playSound('move')
    if (who === 0) setP1Pick((s) => ({ ...s, charIdx: idx }))
    else setP2Pick((s) => ({ ...s, charIdx: idx }))
  }
  const clickPal = (who: 0 | 1, idx: number) => {
    if (locked) return
    if (who === 0) setP1Pick((s) => ({ ...s, paletteIdx: idx }))
    else setP2Pick((s) => ({ ...s, paletteIdx: idx }))
  }

  return (
    <div className={styles.selectWrap}>
      <div className={styles.panels}>
        <Panel
          label="PLAYER 1"
          accent={P1_COLOR}
          pick={p1}
          facing={1}
          onChar={(i) => clickChar(0, i)}
          onPal={(i) => clickPal(0, i)}
          onReady={() => toggleReady(0)}
        />

        <div className={styles.centerVs}>
          {countdown !== null ? (
            <div className={styles.countdown}>{countdown <= 0 ? 'FIGHT!' : countdown}</div>
          ) : (
            <div className={styles.vsText}>VS</div>
          )}
          <div className={styles.hint}>
            {!p1.ready || !p2.ready ? 'Pick fighter + color, then READY' : 'Get ready...'}
          </div>
        </div>

        <Panel
          label="PLAYER 2"
          accent={P2_COLOR}
          pick={p2}
          facing={-1}
          mirror
          onChar={(i) => clickChar(1, i)}
          onPal={(i) => clickPal(1, i)}
          onReady={() => toggleReady(1)}
        />
      </div>
    </div>
  )
}

function cyclePal(charIdx: number, palIdx: number, dir: number): number {
  const n = ROSTER[charIdx].palettes.length
  return ((palIdx + dir) % n + n) % n
}

function Panel(props: {
  label: string
  accent: string
  pick: Pick
  facing: 1 | -1
  mirror?: boolean
  onChar: (idx: number) => void
  onPal: (idx: number) => void
  onReady: () => void
}) {
  const { label, accent, pick, facing, mirror, onChar, onPal, onReady } = props
  const def = ROSTER[pick.charIdx]
  const resolved = resolvePalette(def, pick.paletteIdx)
  const palCount = def.palettes.length

  return (
    <div
      className={`${styles.panel} ${mirror ? styles.panelMirror : ''}`}
      style={{ '--accent': accent } as CSSProperties}
    >
      <div className={styles.panelLabel} style={{ color: accent, textShadow: `0 0 12px ${accent}` }}>
        {label} {pick.ready && <span className={styles.readyTag}>READY</span>}
      </div>

      <div className={styles.portraitBox}>
        <Portrait def={resolved} facing={facing} />
        <div className={styles.portraitName} style={{ color: resolved.color, textShadow: `0 0 12px ${resolved.glow}` }}>
          {def.name}
        </div>
        <div className={styles.paletteTag}>{def.palettes[pick.paletteIdx].label}</div>
      </div>

      <div className={styles.charTiles}>
        {ROSTER.map((r, i) => (
          <button
            key={r.id}
            type="button"
            className={`${styles.charTile} ${i === pick.charIdx ? styles.charTileOn : ''}`}
            style={i === pick.charIdx ? { borderColor: accent, boxShadow: `0 0 14px ${accent}` } : undefined}
            onClick={() => onChar(i)}
          >
            <span className={styles.charTileLetter}>{r.name[0]}</span>
            <span className={styles.charTileName}>{r.name}</span>
          </button>
        ))}
      </div>

      <div className={styles.swatches}>
        {Array.from({ length: palCount }).map((_, i) => {
          const p = def.palettes[i]
          const on = i === pick.paletteIdx
          return (
            <button
              key={i}
              type="button"
              className={`${styles.swatch} ${on ? styles.swatchOn : ''}`}
              style={{
                background: `linear-gradient(135deg, ${p.color}, ${p.glow})`,
                boxShadow: on ? `0 0 12px ${p.glow}, 0 0 4px #fff inset` : undefined,
              }}
              onClick={() => onPal(i)}
              aria-label={p.label}
            />
          )
        })}
      </div>

      <button
        type="button"
        className={`${styles.readyBtn} ${pick.ready ? styles.readyBtnOn : ''}`}
        style={pick.ready ? { background: accent, color: '#06060f' } : { color: accent, borderColor: accent }}
        onClick={onReady}
      >
        {pick.ready ? 'READY!' : 'PRESS READY'}
      </button>
    </div>
  )
}

function Portrait({ def, facing }: { def: FighterDef; facing: 1 | -1 }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const defRef = useRef(def)
  defRef.current = def

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    let raf = 0
    let t = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      t++
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = cv.clientWidth
      const h = cv.clientHeight
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
        cv.width = Math.round(w * dpr)
        cv.height = Math.round(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const d = defRef.current
      const view: FighterView = {
        def: d,
        x: w / 2,
        y: h - 18,
        facing,
        action: 'idle',
        animPose: 'idle',
        actionTime: 0,
        walkPhase: 0,
        flash: 0,
        blockFlash: 0,
        squash: 0,
        onGround: true,
        flip: 0,
        victoryTime: t,
      }
      drawFighter(ctx, view, t, facing === 1 ? 0 : 1)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [facing])

  return <canvas ref={ref} className={styles.portrait} />
}
