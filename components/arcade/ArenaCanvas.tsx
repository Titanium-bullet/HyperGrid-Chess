'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  advanceFrame,
  createMatch,
  pause,
  rematch,
  STAGE_H,
  STAGE_W,
  FLOOR_Y,
  STEP_MS,
  type MatchPhase,
  type MatchState,
  type Fighter,
} from '@/lib/arcade/engine'
import { InputDevice } from '@/lib/arcade/controls'
import { GLITCH, FORGE, type FighterDef } from '@/lib/arcade/characters'
import { playSound, type SoundType } from '@/lib/game-audio'
import { STORAGE_KEYS } from '@/lib/storage-keys'
import styles from './ArenaCanvas.module.css'

export type Pt = [number, number]

type Hud = {
  hp1: number
  hp2: number
  max1: number
  max2: number
  meter1: number
  meter2: number
  wins1: number
  wins2: number
  roundsToWin: number
  name1: string
  name2: string
  color1: string
  color2: string
  glow1: string
  glow2: string
  banner: string
  bannerSub: string
  showBanner: boolean
  phase: MatchPhase
  matchWinner: 0 | 1 | null
  roundTime: number
}

type Props = {
  p1?: FighterDef
  p2?: FighterDef
  onExitToSelect?: () => void
}

export function ArenaCanvas({ p1 = GLITCH, p2 = FORGE, onExitToSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const matchRef = useRef<MatchState | null>(null)
  const deviceRef = useRef<InputDevice | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)
  const accRef = useRef<number>(0)
  const hudTickRef = useRef<number>(0)
  const tickRef = useRef<number>(0)
  const soundOnRef = useRef<boolean>(true)

  const [hud, setHud] = useState<Hud>(() => initialHud(p1, p2))
  const [soundOn, setSoundOn] = useState(true)
  const [showHelp, setShowHelp] = useState(false)

  const syncHud = useCallback(
    (state: MatchState) => {
      const f0 = state.fighters[0]
      const f1 = state.fighters[1]
      setHud({
        hp1: Math.max(0, f0.hp),
        hp2: Math.max(0, f1.hp),
        max1: f0.def.maxHp,
        max2: f1.def.maxHp,
        meter1: f0.meter,
        meter2: f1.meter,
        wins1: f0.roundWins,
        wins2: f1.roundWins,
        roundsToWin: state.roundsToWin,
        name1: f0.def.name,
        name2: f1.def.name,
        color1: f0.def.color,
        color2: f1.def.color,
        glow1: f0.def.glow,
        glow2: f1.def.glow,
        banner: state.banner,
        bannerSub: state.bannerSub,
        showBanner: state.showBanner,
        phase: state.phase,
        matchWinner: state.matchWinner,
        roundTime: Math.max(0, Math.ceil(state.roundTimer / 60)),
      })
    },
    [],
  )

  const drainSounds = useCallback(
    (state: MatchState) => {
      if (state.soundQueue.length === 0) return
      const queue = state.soundQueue.splice(0, state.soundQueue.length)
      if (!soundOnRef.current) return
      for (const s of queue) {
        playSound(s as SoundType, true)
      }
    },
    [],
  )

  const render = useCallback(() => {
    const canvas = canvasRef.current
    const state = matchRef.current
    if (!canvas || !state) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const cssW = canvas.clientWidth
    const cssH = canvas.clientHeight
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr)
      canvas.height = Math.round(cssH * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)

    const scale = Math.min(cssW / STAGE_W, cssH / STAGE_H)
    const ox = (cssW - STAGE_W * scale) / 2
    const oy = (cssH - STAGE_H * scale) / 2
    ctx.translate(ox, oy)
    ctx.scale(scale, scale)

    // screen juice: punch-zoom + shake around stage center
    const cx = STAGE_W / 2
    const cy = STAGE_H / 2
    ctx.translate(cx, cy)
    ctx.scale(state.zoom, state.zoom)
    ctx.translate(-cx, -cy)
    if (state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake)
    }

    drawStage(ctx, state)
    // shadows + fighters + projectiles + effects
    for (const f of state.fighters) drawShadow(ctx, f)
    drawFighter(ctx, state.fighters[0], tickRef.current, 0)
    drawFighter(ctx, state.fighters[1], tickRef.current, 1)
    for (const p of state.projectiles) drawProjectile(ctx, p)
    for (const e of state.effects) drawEffect(ctx, e)

    // screen flash overlay (in stage space)
    if (state.flash > 0) {
      ctx.save()
      ctx.globalAlpha = Math.min(0.7, state.flash)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, STAGE_W, STAGE_H)
      ctx.restore()
    }
  }, [])

  useEffect(() => {
    resetSkeletonCache()
    const state = createMatch(p1, p2)
    matchRef.current = state

    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SOUND)
      if (saved !== null) {
        const on = saved === '1'
        soundOnRef.current = on
        setSoundOn(on)
      }
    } catch {
      // ignore
    }

    const togglePause = () => {
      pause(state)
    }
    const device = new InputDevice(togglePause)
    deviceRef.current = device
    device.attach()

    const loop = (now: number) => {
      rafRef.current = requestAnimationFrame(loop)
      const last = lastTimeRef.current || now
      let dt = now - last
      lastTimeRef.current = now
      if (dt > 100) dt = 100
      tickRef.current++

      if (state.phase === 'paused') {
        accRef.current = 0
      } else {
        accRef.current += dt * state.timeScale
        let steps = 0
        while (accRef.current >= STEP_MS && steps < 5) {
          advanceFrame(state, device.read())
          accRef.current -= STEP_MS
          steps++
        }
      }

      drainSounds(state)
      render()
      hudTickRef.current++
      if (hudTickRef.current % 2 === 0) syncHud(state)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      device.detach()
    }
  }, [p1, p2, render, syncHud, drainSounds])

  const handleRematch = useCallback(() => {
    const state = matchRef.current
    if (!state) return
    rematch(state)
    deviceRef.current?.clear()
    setHud((h) => ({ ...h, matchWinner: null }))
  }, [])

  const toggleSound = useCallback(() => {
    setSoundOn((prev) => {
      const next = !prev
      soundOnRef.current = next
      try {
        localStorage.setItem(STORAGE_KEYS.SOUND, next ? '1' : '0')
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  const hp1Pct = Math.max(0, Math.min(100, (hud.hp1 / hud.max1) * 100))
  const hp2Pct = Math.max(0, Math.min(100, (hud.hp2 / hud.max2) * 100))
  const showRematch = hud.phase === 'matchEnd' && hud.matchWinner !== null
  const winnerName = hud.matchWinner === 0 ? hud.name1 : hud.name2
  const winnerColor = hud.matchWinner === 0 ? hud.color1 : hud.color2

  return (
    <div className={styles.arenaWrap}>
      <canvas ref={canvasRef} className={styles.arenaCanvas} />

      <div className={styles.hudTop}>
        <FighterHud
          name={hud.name1}
          color={hud.color1}
          glow={hud.glow1}
          hpPct={hp1Pct}
          meter={hud.meter1}
          wins={hud.wins1}
          roundsToWin={hud.roundsToWin}
          flip={false}
        />

        <div className={styles.hudCenter}>
          <div className={styles.roundTime}>{hud.phase === 'fight' ? hud.roundTime : ''}</div>
          <div className={styles.roundPipsRow}>
            <Pips wins={hud.wins1} total={hud.roundsToWin} color={hud.color1} align="right" />
            <span className={styles.vsDot}>VS</span>
            <Pips wins={hud.wins2} total={hud.roundsToWin} color={hud.color2} align="left" />
          </div>
        </div>

        <FighterHud
          name={hud.name2}
          color={hud.color2}
          glow={hud.glow2}
          hpPct={hp2Pct}
          meter={hud.meter2}
          wins={hud.wins2}
          roundsToWin={hud.roundsToWin}
          flip
        />
      </div>

      {hud.showBanner && (
        <div className={styles.bannerWrap}>
          <div className={styles.bannerText}>{hud.banner}</div>
          {hud.bannerSub ? <div className={styles.bannerSub}>{hud.bannerSub}</div> : null}
        </div>
      )}

      <button
        type="button"
        className={styles.helpBtn}
        onClick={(e) => {
          setShowHelp((v) => !v)
          e.currentTarget.blur()
        }}
        aria-label="Controls help"
      >
        ?
      </button>
      <button
        type="button"
        className={styles.muteBtn}
        onClick={(e) => {
          toggleSound()
          e.currentTarget.blur()
        }}
        aria-label="Toggle sound"
      >
        {soundOn ? '♪' : '✕'}
      </button>

      {showHelp && (
        <div className={styles.helpPanel}>
          <div className={styles.helpTitle}>CONTROLS</div>
          <div className={styles.helpColumns}>
            <div>
              <div className={styles.helpName} style={{ color: hud.color1 }}>
                P1 — {hud.name1}
              </div>
              <Kbd label="Move" keys="A / D" />
              <Kbd label="Jump" keys="W" />
              <Kbd label="Crouch" keys="S" />
              <Kbd label="Punch" keys="F" />
              <Kbd label="Kick" keys="G" />
              <Kbd label="Special" keys="H" />
            </div>
            <div>
              <div className={styles.helpName} style={{ color: hud.color2 }}>
                P2 — {hud.name2}
              </div>
              <Kbd label="Move" keys="← / →" />
              <Kbd label="Jump" keys="↑" />
              <Kbd label="Crouch" keys="↓" />
              <Kbd label="Punch" keys="J" />
              <Kbd label="Kick" keys="K" />
              <Kbd label="Special" keys="L" />
            </div>
          </div>
          <div className={styles.helpFoot}>Block = hold away from opponent · Pause = Esc</div>
        </div>
      )}

      {showRematch && (
        <div className={styles.rematchOverlay}>
          <div className={styles.rematchCard}>
            <div className={styles.rematchTitle} style={{ color: winnerColor, textShadow: `0 0 24px ${winnerColor}` }}>
              {winnerName} WINS!
            </div>
            <div className={styles.rematchSub}>Match Complete</div>
            <div className={styles.rematchBtns}>
              {onExitToSelect ? (
                <button type="button" className={styles.rematchPrimary} onClick={onExitToSelect}>
                  Character Select
                </button>
              ) : (
                <button type="button" className={styles.rematchPrimary} onClick={handleRematch}>
                  Rematch
                </button>
              )}
              <button type="button" className={styles.rematchSecondary} onClick={handleRematch}>
                Fight Again
              </button>
              <Link href="/" className={styles.rematchSecondary}>
                Main Menu
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function initialHud(p1: FighterDef, p2: FighterDef): Hud {
  return {
    hp1: p1.maxHp,
    hp2: p2.maxHp,
    max1: p1.maxHp,
    max2: p2.maxHp,
    meter1: 0,
    meter2: 0,
    wins1: 0,
    wins2: 0,
    roundsToWin: 2,
    name1: p1.name,
    name2: p2.name,
    color1: p1.color,
    color2: p2.color,
    glow1: p1.glow,
    glow2: p2.glow,
    banner: '',
    bannerSub: '',
    showBanner: true,
    phase: 'intro',
    matchWinner: null,
    roundTime: 99,
  }
}

function FighterHud(props: {
  name: string
  color: string
  glow: string
  hpPct: number
  meter: number
  wins: number
  roundsToWin: number
  flip?: boolean
}) {
  const { name, color, glow, hpPct, meter, wins, roundsToWin, flip } = props
  const meterPct = Math.max(0, Math.min(100, meter))
  return (
    <div className={`${styles.fighterHud} ${flip ? styles.fighterHudFlip : ''}`}>
      <div className={styles.fighterNameRow}>
        <span className={styles.fighterName} style={{ color, textShadow: `0 0 10px ${glow}` }}>
          {name}
        </span>
        <div className={styles.winPips}>
          {Array.from({ length: roundsToWin }).map((_, i) => (
            <span
              key={i}
              className={`${styles.winPip} ${i < wins ? styles.winPipOn : ''}`}
              style={i < wins ? { background: color, boxShadow: `0 0 8px ${glow}` } : undefined}
            />
          ))}
        </div>
      </div>
      <div className={styles.hpBar}>
        <div className={styles.hpBarBg} />
        <div
          className={styles.hpBarFill}
          style={{ width: `${hpPct}%`, background: `linear-gradient(90deg, ${color}, ${glow})`, boxShadow: `0 0 10px ${glow}` }}
        />
      </div>
      <div className={styles.meterBar}>
        <div
          className={styles.meterBarFill}
          style={{ width: `${meterPct}%`, background: 'linear-gradient(90deg,#ffd54a,#ffec80)', boxShadow: '0 0 8px rgba(255,213,74,0.7)' }}
        />
      </div>
    </div>
  )
}

function Pips({ wins, total, color, align }: { wins: number; total: number; color: string; align: 'left' | 'right' }) {
  return (
    <div className={styles.pipsRow} style={{ justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`${styles.pip} ${i < wins ? styles.pipOn : ''}`}
          style={i < wins ? { background: color } : undefined}
        />
      ))}
    </div>
  )
}

function Kbd({ label, keys }: { label: string; keys: string }) {
  return (
    <div className={styles.kbdRow}>
      <span className={styles.kbdLabel}>{label}</span>
      <span className={styles.kbdKey}>{keys}</span>
    </div>
  )
}

/* ============================ Rendering ============================ */

type BodyParams = {
  legLen: number
  torsoLen: number
  shoulderW: number
  headR: number
  limbW: number
  torsoW: number
}

function bodyParams(def: FighterDef): BodyParams {
  if (def.bodyType === 'heavy') {
    return { legLen: 70, torsoLen: 56, shoulderW: 30, headR: 15, limbW: 11, torsoW: 26 }
  }
  return { legLen: 74, torsoLen: 58, shoulderW: 22, headR: 13, limbW: 8, torsoW: 18 }
}

type Skeleton = {
  spine: [Pt, Pt]
  head: { c: Pt; r: number }
  armF: [Pt, Pt, Pt]
  armB: [Pt, Pt, Pt]
  legF: [Pt, Pt, Pt]
  legB: [Pt, Pt, Pt]
}

function computeSkeleton(f: FighterView, tick: number): Skeleton {
  const bp = bodyParams(f.def)
  const { legLen, torsoLen, shoulderW: sw, headR } = bp
  const pose = f.animPose
  const t = tick

  // base standing (local, facing right, feet origin)
  const hipC: Pt = [0, -legLen]
  const neck: Pt = [0, hipC[1] - torsoLen]
  const headC: Pt = [0, neck[1] - headR - 3]
  const shF: Pt = [sw * 0.5, neck[1] + 6]
  const shB: Pt = [-sw * 0.5, neck[1] + 6]
  const hipF: Pt = [sw * 0.35, hipC[1]]
  const hipB: Pt = [-sw * 0.35, hipC[1]]

  let elF: Pt = [sw * 0.5 + 5, neck[1] + torsoLen * 0.5]
  let handF: Pt = [sw * 0.5 + 2, hipC[1] + 10]
  let elB: Pt = [-sw * 0.5 - 5, neck[1] + torsoLen * 0.5]
  let handB: Pt = [-sw * 0.5 - 2, hipC[1] + 8]

  let kneeF: Pt = [sw * 0.3, -legLen * 0.5]
  let footF: Pt = [sw * 0.5, 0]
  let kneeB: Pt = [-sw * 0.3, -legLen * 0.5]
  let footB: Pt = [-sw * 0.5, 0]

  let neckX = 0
  let headX = 0
  let lean = 0

  switch (pose) {
    case 'idle': {
      const bob = Math.sin(t * 0.06) * 2
      neckX = bob * 0.3
      headX = bob * 0.3
      handF = [handF[0], handF[1] + bob]
      handB = [handB[0], handB[1] + bob]
      break
    }
    case 'walk': {
      const s = Math.sin(f.walkPhase)
      const c = Math.cos(f.walkPhase)
      footF = [sw * 0.5 + s * 12, -Math.abs(c) * 4]
      footB = [-sw * 0.5 - s * 12, -Math.abs(c) * 4]
      kneeF = [(footF[0] + hipF[0]) / 2, -legLen * 0.5 - Math.max(0, s) * 4]
      kneeB = [(footB[0] + hipB[0]) / 2, -legLen * 0.5 - Math.max(0, -s) * 4]
      handF = [sw * 0.5 + 2 - s * 6, hipC[1] + 8]
      handB = [-sw * 0.5 - 2 + s * 6, hipC[1] + 8]
      elF = [sw * 0.5 + 5, neck[1] + torsoLen * 0.5]
      elB = [-sw * 0.5 - 5, neck[1] + torsoLen * 0.5]
      const bob = Math.abs(s) * 3
      neckX = bob * 0.3
      break
    }
    case 'jump': {
      footF = [sw * 0.3, -legLen * 0.55]
      footB = [-sw * 0.45, -legLen * 0.45]
      kneeF = [sw * 0.2, -legLen * 0.7]
      kneeB = [-sw * 0.35, -legLen * 0.65]
      handF = [sw * 0.5 + 6, neck[1] + torsoLen * 0.2]
      handB = [-sw * 0.5 - 6, neck[1] + torsoLen * 0.2]
      elF = [sw * 0.5 + 8, neck[1] + torsoLen * 0.35]
      elB = [-sw * 0.5 - 8, neck[1] + torsoLen * 0.35]
      break
    }
    case 'crouch': {
      const cl = legLen * 0.5
      hipC[1] = -cl
      neck[1] = hipC[1] - torsoLen * 0.92
      headC[1] = neck[1] - headR - 2
      shF[1] = neck[1] + 5
      shB[1] = neck[1] + 5
      hipF[1] = hipC[1]
      hipB[1] = hipC[1]
      footF = [sw * 0.7, 0]
      footB = [-sw * 0.7, 0]
      kneeF = [sw * 0.45, -cl * 0.5]
      kneeB = [-sw * 0.45, -cl * 0.5]
      handF = [sw * 0.5 + 4, hipC[1] + 6]
      handB = [-sw * 0.5 - 4, hipC[1] + 6]
      elF = [sw * 0.5 + 6, neck[1] + torsoLen * 0.45]
      elB = [-sw * 0.5 - 6, neck[1] + torsoLen * 0.45]
      break
    }
    case 'block': {
      handF = [sw * 0.5 + 10, neck[1] + 6]
      handB = [sw * 0.5 + 2, neck[1] + 14]
      elF = [sw * 0.5 + 8, neck[1] + torsoLen * 0.4]
      elB = [sw * 0.5, neck[1] + torsoLen * 0.5]
      footF = [sw * 0.6, 0]
      footB = [-sw * 0.6, 0]
      lean = -2
      break
    }
    case 'punchWind': {
      handF = [-2, neck[1] + 12]
      elF = [-sw * 0.5, neck[1] + torsoLen * 0.4]
      lean = -3
      break
    }
    case 'punchActive': {
      const reach = sw * 0.5 + 44
      handF = [reach, neck[1] + 8]
      elF = [sw * 0.5 + 20, neck[1] + 8]
      handB = [-sw * 0.5 - 6, hipC[1] + 6]
      elB = [-sw * 0.5 - 6, neck[1] + torsoLen * 0.5]
      lean = 4
      break
    }
    case 'punchRecover': {
      handF = [sw * 0.5 + 18, neck[1] + 12]
      elF = [sw * 0.5 + 10, neck[1] + torsoLen * 0.45]
      break
    }
    case 'kickActive': {
      footF = [legLen * 0.7, -legLen * 0.95]
      kneeF = [legLen * 0.4, -legLen * 0.85]
      handF = [-sw * 0.5 - 4, neck[1] + torsoLen * 0.4]
      handB = [-sw * 0.5 - 10, hipC[1] + 6]
      elF = [-sw * 0.5 - 2, neck[1] + torsoLen * 0.3]
      lean = -5
      break
    }
    case 'kickWind': {
      kneeF = [sw * 0.5, -legLen * 0.7]
      footF = [sw * 0.3, -legLen * 0.5]
      lean = -2
      break
    }
    case 'special': {
      const pulse = Math.sin(t * 0.5) * 2
      handF = [sw * 0.5 + 22 + pulse, neck[1] + torsoLen * 0.35]
      handB = [sw * 0.5 + 14 + pulse, neck[1] + torsoLen * 0.45]
      elF = [sw * 0.5 + 12, neck[1] + torsoLen * 0.4]
      elB = [sw * 0.5 + 4, neck[1] + torsoLen * 0.5]
      footF = [sw * 0.6, 0]
      footB = [-sw * 0.7, 0]
      kneeF = [sw * 0.4, -legLen * 0.5]
      lean = 2
      break
    }
    case 'hitstunBack': {
      // snapped backward -- head/chest recoil away from blow
      neckX = -10
      headX = -16
      handF = [-sw * 0.5 - 6, neck[1] + torsoLen * 0.25]
      handB = [-sw * 0.5 - 14, neck[1] + torsoLen * 0.5]
      elF = [-sw * 0.5 - 2, neck[1] + torsoLen * 0.15]
      footF = [sw * 0.1, 0]
      footB = [-sw * 0.9, 0]
      kneeF = [sw * 0.05, -legLen * 0.5]
      lean = -9
      break
    }
    case 'hitstunFwd': {
      // heavy crumple -- doubles over forward
      neckX = 10
      headX = 16
      neck[1] = hipC[1] - torsoLen * 0.8
      headC[1] = neck[1] - headR
      handF = [sw * 0.5 + 8, neck[1] + torsoLen * 0.5]
      handB = [sw * 0.5 - 4, neck[1] + torsoLen * 0.5]
      elF = [sw * 0.5 + 2, neck[1] + torsoLen * 0.3]
      elB = [sw * 0.5 - 8, neck[1] + torsoLen * 0.35]
      footF = [sw * 0.7, 0]
      footB = [-sw * 0.5, 0]
      kneeF = [sw * 0.5, -legLen * 0.55]
      lean = 12
      break
    }
    case 'dash': {
      // forward lean, trailing legs, streaming arms
      const leanDir = 1
      lean = 10 * leanDir
      neckX = 8 * leanDir
      headX = 10 * leanDir
      footF = [sw * 0.9, -legLen * 0.25]
      footB = [-sw * 0.9 - 10, -legLen * 0.5]
      kneeF = [sw * 0.6, -legLen * 0.45]
      kneeB = [-sw * 0.7, -legLen * 0.65]
      handF = [sw * 0.5 + 4, neck[1] + torsoLen * 0.2]
      handB = [-sw * 0.5 - 18, neck[1] + torsoLen * 0.35]
      elF = [sw * 0.5 + 6, neck[1] + torsoLen * 0.3]
      elB = [-sw * 0.5 - 10, neck[1] + torsoLen * 0.4]
      break
    }
    case 'victoryRoll': {
      // tucked ball -- spins while traveling forward
      hipC[1] = -legLen * 0.72
      neck[1] = hipC[1] - torsoLen * 0.82
      headC[1] = neck[1] - headR
      shF[1] = neck[1] + 6
      shB[1] = neck[1] + 6
      hipF[1] = hipC[1]
      hipB[1] = hipC[1]
      kneeF = [sw * 0.45, -legLen * 0.62]
      kneeB = [-sw * 0.45, -legLen * 0.62]
      footF = [sw * 0.2, -legLen * 0.5]
      footB = [-sw * 0.2, -legLen * 0.5]
      handF = [sw * 0.3, neck[1] + torsoLen * 0.35]
      handB = [-sw * 0.3, neck[1] + torsoLen * 0.35]
      elF = [sw * 0.2, neck[1] + torsoLen * 0.2]
      elB = [-sw * 0.2, neck[1] + torsoLen * 0.2]
      lean = 0
      break
    }
    case 'victory': {
      // triumphant cheer -- arms raised, rhythmic bounce
      const bob = Math.sin(f.victoryTime * 0.18) * 4
      neck[1] += bob
      shF[1] += bob
      shB[1] += bob
      headC[1] = neck[1] - headR - 3
      handF = [sw * 0.5 + 6, neck[1] - 22]
      handB = [-sw * 0.5 - 6, neck[1] - 16]
      elF = [sw * 0.5 + 10, neck[1] - 6]
      elB = [-sw * 0.5 - 10, neck[1] - 2]
      footF = [sw * 0.55, 0]
      footB = [-sw * 0.55, 0]
      kneeF = [sw * 0.4, -legLen * 0.5]
      kneeB = [-sw * 0.4, -legLen * 0.5]
      lean = -3
      break
    }
    case 'ko': {
      return {
        spine: [[-30, -12], [36, -12]],
        head: { c: [52, -16], r: headR },
        armF: [[10, -12], [24, -28], [42, -32]],
        armB: [[0, -12], [-14, -2], [-28, 4]],
        legF: [[-20, -12], [6, -2], [28, 4]],
        legB: [[-24, -12], [-6, -24], [8, -36]],
      }
    }
    default:
      break
  }

  const spine: [Pt, Pt] = [[hipC[0] + lean, hipC[1]], [neck[0] + neckX, neck[1]]]
  const head: { c: Pt; r: number } = { c: [headC[0] + headX, headC[1]], r: headR }
  const armF: [Pt, Pt, Pt] = [[shF[0] + neckX, shF[1]], elF, handF]
  const armB: [Pt, Pt, Pt] = [[shB[0] + neckX, shB[1]], elB, handB]
  const legF: [Pt, Pt, Pt] = [[hipF[0], hipF[1]], kneeF, footF]
  const legB: [Pt, Pt, Pt] = [[hipB[0], hipB[1]], kneeB, footB]

  return { spine, head, armF, armB, legF, legB }
}

function mapPt(p: Pt, ox: number, oy: number, facing: number): Pt {
  return [ox + p[0] * facing, oy + p[1]]
}

function drawTube(ctx: CanvasRenderingContext2D, pts: Pt[], width: number, color: string, glow: string, bright: string, alpha = 1) {
  if (pts.length < 2) return
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.shadowBlur = 16
  ctx.shadowColor = glow
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.strokeStyle = bright
  ctx.lineWidth = width * 0.38
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
  ctx.stroke()
  ctx.restore()
}

function drawOrb(ctx: CanvasRenderingContext2D, c: Pt, r: number, color: string, glow: string, bright = '#ffffff') {
  ctx.save()
  ctx.shadowBlur = 18
  ctx.shadowColor = glow
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(c[0], c[1], r, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.fillStyle = bright
  ctx.globalAlpha = 0.8
  ctx.beginPath()
  ctx.arc(c[0] - r * 0.25, c[1] - r * 0.25, r * 0.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

type FighterView = {
  def: FighterDef
  x: number
  y: number
  facing: 1 | -1
  action: string
  animPose: string
  actionTime: number
  walkPhase: number
  flash: number
  blockFlash: number
  squash: number
  onGround: boolean
  flip: number
  victoryTime: number
}

export type { FighterView }

// --- pose interpolation cache (one display skeleton per fighter slot) ---
let _dispSk: [Skeleton | null, Skeleton | null] = [null, null]
export function resetSkeletonCache() {
  _dispSk = [null, null]
}
const LERP_K = 0.45 // higher = snappier, lower = smoother/slower

function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k
}
function lerpPt(a: Pt, b: Pt, k: number): Pt {
  return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]
}
function lerpSkeleton(a: Skeleton, b: Skeleton, k: number): Skeleton {
  return {
    spine: [lerpPt(a.spine[0], b.spine[0], k), lerpPt(a.spine[1], b.spine[1], k)],
    head: { c: lerpPt(a.head.c, b.head.c, k), r: lerp(a.head.r, b.head.r, k) },
    armF: [lerpPt(a.armF[0], b.armF[0], k), lerpPt(a.armF[1], b.armF[1], k), lerpPt(a.armF[2], b.armF[2], k)] as [Pt, Pt, Pt],
    armB: [lerpPt(a.armB[0], b.armB[0], k), lerpPt(a.armB[1], b.armB[1], k), lerpPt(a.armB[2], b.armB[2], k)] as [Pt, Pt, Pt],
    legF: [lerpPt(a.legF[0], b.legF[0], k), lerpPt(a.legF[1], b.legF[1], k), lerpPt(a.legF[2], b.legF[2], k)] as [Pt, Pt, Pt],
    legB: [lerpPt(a.legB[0], b.legB[0], k), lerpPt(a.legB[1], b.legB[1], k), lerpPt(a.legB[2], b.legB[2], k)] as [Pt, Pt, Pt],
  }
}

function drawShadow(ctx: CanvasRenderingContext2D, f: { x: number; y: number; def: FighterDef }) {
  ctx.save()
  ctx.globalAlpha = 0.35
  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  ctx.beginPath()
  ctx.ellipse(f.x, FLOOR_Y + 2, f.def.bodyType === 'heavy' ? 42 : 34, 8, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export function drawFighter(ctx: CanvasRenderingContext2D, f: FighterView, tick: number, idx: 0 | 1) {
  const target = computeSkeleton(f, tick)
  // KO pose is absolute (lying down) -- don't lerp into it
  let sk: Skeleton
  if (f.animPose === 'ko') {
    sk = target
    _dispSk[idx] = target
  } else if (_dispSk[idx] === null) {
    sk = target
    _dispSk[idx] = target
  } else {
    sk = lerpSkeleton(_dispSk[idx]!, target, LERP_K)
    _dispSk[idx] = sk
  }

  const facing = f.facing
  const ox = f.x
  const oy = f.y
  const map = (p: Pt): Pt => mapPt(p, ox, oy, facing)

  const color = f.def.color
  const glow = f.def.glow
  const accent = f.def.accent
  const bp = bodyParams(f.def)
  const lw = bp.limbW

  const flash = f.flash > 0
  const mainColor = flash ? '#ffffff' : color
  const mainGlow = flash ? '#ffffff' : glow

  // squash & stretch centered on feet (ox, oy), plus continuous spin while victory-rolling
  const sq = f.squash
  const sx = 1 + sq * 0.16 // squashed>0 -> wider
  const sy = 1 - sq * 0.18 // squashed>0 -> shorter
  const spinning = f.animPose === 'victoryRoll'
  const pivotY = spinning ? oy - 55 : oy // roll around body center, not feet
  ctx.save()
  ctx.translate(ox, pivotY)
  if (spinning) ctx.rotate(f.flip)
  ctx.scale(sx, sy)
  ctx.translate(-ox, -pivotY)

  // back limbs (dimmer)
  drawTube(ctx, sk.legB.map(map) as Pt[], lw, color, glow, accent, 0.7)
  drawTube(ctx, sk.armB.map(map) as Pt[], lw, color, glow, accent, 0.7)

  // spine
  drawTube(ctx, sk.spine.map(map) as Pt[], bp.torsoW, mainColor, mainGlow, accent, 1)
  // head
  const hc = map(sk.head.c)
  drawOrb(ctx, hc, sk.head.r, mainColor, mainGlow, accent)

  // front limbs (bright)
  drawTube(ctx, sk.legF.map(map) as Pt[], lw, mainColor, mainGlow, accent, 1)
  drawTube(ctx, sk.armF.map(map) as Pt[], lw, mainColor, mainGlow, accent, 1)

  ctx.restore()

  // block aura
  if (f.blockFlash > 0) {
    ctx.save()
    ctx.globalAlpha = (f.blockFlash / 8) * 0.5
    ctx.shadowBlur = 24
    ctx.shadowColor = '#9fe8ff'
    ctx.fillStyle = 'rgba(120,220,255,0.25)'
    ctx.beginPath()
    ctx.arc(ox + 18 * facing, oy - 80, 46, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

function drawProjectile(
  ctx: CanvasRenderingContext2D,
  p: { x: number; y: number; radius: number; color: string; glow: string; vx: number; spawnTrail: number },
) {
  ctx.save()
  // trail
  const dir = Math.sign(p.vx) || 1
  for (let i = 1; i <= 5; i++) {
    ctx.globalAlpha = 0.18 * (1 - i / 6)
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x - dir * i * 6, p.y, p.radius * (1 - i * 0.13), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.shadowBlur = 22
  ctx.shadowColor = p.glow
  ctx.fillStyle = p.color
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.fillStyle = '#ffffff'
  ctx.globalAlpha = 0.85
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.radius * 0.4, 0, Math.PI * 2)
  ctx.fill()
  void p.spawnTrail
  ctx.restore()
}

function drawEffect(
  ctx: CanvasRenderingContext2D,
  e: { type: string; x: number; y: number; t: number; life: number; color: string; size: number; dir: number },
) {
  const p = e.t / e.life
  ctx.save()
  if (e.type === 'spark') {
    const r = e.size * (0.4 + p * 0.6)
    ctx.globalAlpha = 1 - p
    ctx.shadowBlur = 18
    ctx.shadowColor = e.color
    ctx.strokeStyle = e.color
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(e.x, e.y, r, 0, Math.PI * 2)
    ctx.stroke()
    // directional spark streaks (biased toward impact dir)
    const base = e.dir >= 0 ? 0 : Math.PI
    for (let i = 0; i < 7; i++) {
      const a = base + (i / 7 - 0.5) * Math.PI * 1.1 + e.t * 0.04
      const len = e.size * 0.6 * (1 - p)
      ctx.beginPath()
      ctx.moveTo(e.x, e.y)
      ctx.lineTo(e.x + Math.cos(a) * len, e.y + Math.sin(a) * len)
      ctx.stroke()
    }
  } else if (e.type === 'impact') {
    ctx.globalAlpha = (1 - p) * 0.9
    ctx.fillStyle = e.color
    ctx.beginPath()
    ctx.arc(e.x, e.y, e.size * (0.3 + p * 0.7), 0, Math.PI * 2)
    ctx.fill()
  } else if (e.type === 'block') {
    ctx.globalAlpha = 1 - p
    ctx.shadowBlur = 14
    ctx.shadowColor = e.color
    ctx.strokeStyle = e.color
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(e.x, e.y, e.size * (0.5 + p * 0.6), -1.2, 1.2)
    ctx.stroke()
  } else if (e.type === 'dust') {
    ctx.globalAlpha = (1 - p) * 0.5
    ctx.fillStyle = e.color
    ctx.beginPath()
    ctx.arc(e.x, e.y - p * 6, e.size * (0.6 + p), 0, Math.PI * 2)
    ctx.fill()
  } else if (e.type === 'dash') {
    // horizontal speed streaks
    ctx.globalAlpha = (1 - p) * 0.7
    ctx.strokeStyle = e.color
    ctx.lineWidth = 2
    const len = e.size * (1 + p)
    for (let i = 0; i < 3; i++) {
      const yy = e.y - 4 + i * 4
      ctx.beginPath()
      ctx.moveTo(e.x - e.dir * 4, yy)
      ctx.lineTo(e.x + e.dir * len, yy)
      ctx.stroke()
    }
  } else if (e.type === 'crackle') {
    // jagged energy bolts
    ctx.globalAlpha = 1 - p
    ctx.shadowBlur = 16
    ctx.shadowColor = e.color
    ctx.strokeStyle = e.color
    ctx.lineWidth = 2
    for (let b = 0; b < 3; b++) {
      const a0 = (b / 3) * Math.PI * 2 + e.t * 0.2
      let px = e.x
      let py = e.y
      ctx.beginPath()
      ctx.moveTo(px, py)
      for (let s = 1; s <= 4; s++) {
        const rad = (e.size * s) / 4
        const a = a0 + (Math.random() - 0.5) * 1.2
        px = e.x + Math.cos(a) * rad
        py = e.y + Math.sin(a) * rad
        ctx.lineTo(px, py)
      }
      ctx.stroke()
    }
  } else if (e.type === 'confetti') {
    const fade = p > 0.7 ? 1 - (p - 0.7) / 0.3 : 1
    ctx.globalAlpha = Math.max(0, fade)
    ctx.translate(e.x, e.y)
    ctx.rotate(e.t * 0.3)
    ctx.shadowBlur = 6
    ctx.shadowColor = e.color
    ctx.fillStyle = e.color
    ctx.fillRect(-e.size / 2, -e.size * 0.3, e.size, e.size * 0.6)
  } else if (e.type === 'ring' || e.type === 'ko') {
    ctx.globalAlpha = 1 - p
    ctx.shadowBlur = 20
    ctx.shadowColor = e.color
    ctx.strokeStyle = e.color
    ctx.lineWidth = e.type === 'ko' ? 6 : 4
    ctx.beginPath()
    ctx.arc(e.x, e.y, e.size * (0.2 + p * 0.8), 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
}

function drawStage(ctx: CanvasRenderingContext2D, state: MatchState) {
  void state
  // floor band
  const grad = ctx.createLinearGradient(0, FLOOR_Y - 40, 0, STAGE_H)
  grad.addColorStop(0, 'rgba(10,10,24,0)')
  grad.addColorStop(1, 'rgba(10,10,24,0.55)')
  ctx.fillStyle = grad
  ctx.fillRect(0, FLOOR_Y - 40, STAGE_W, STAGE_H - (FLOOR_Y - 40))

  // neon floor line
  ctx.save()
  ctx.shadowBlur = 16
  ctx.shadowColor = 'rgba(0,255,255,0.7)'
  ctx.strokeStyle = 'rgba(0,255,255,0.85)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, FLOOR_Y)
  ctx.lineTo(STAGE_W, FLOOR_Y)
  ctx.stroke()
  ctx.restore()

  // perspective grid
  ctx.save()
  ctx.strokeStyle = 'rgba(0,255,255,0.12)'
  ctx.lineWidth = 1
  const horizon = FLOOR_Y
  const bottom = STAGE_H + 40
  for (let i = -8; i <= 8; i++) {
    const x = STAGE_W / 2 + i * (STAGE_W / 8)
    ctx.beginPath()
    ctx.moveTo(STAGE_W / 2, horizon)
    ctx.lineTo(x, bottom)
    ctx.stroke()
  }
  for (let j = 1; j <= 5; j++) {
    const y = horizon + (bottom - horizon) * (j / 5) * (j / 5)
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(STAGE_W, y)
    ctx.stroke()
  }
  ctx.restore()
}
