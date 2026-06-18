// Pure fight engine for Neon Versus. No DOM / React.
// Fixed timestep @ 60fps. All state is mutable for performance; advanceFrame mutates it.

import {
  AttackDef,
  AttackKind,
  FighterDef,
  attackOf,
} from './characters'

import { INPUT, InputBits } from './controls'

export const STAGE_W = 1000
export const STAGE_H = 560
export const FLOOR_Y = 470
export const WALL_L = 70
export const WALL_R = STAGE_W - 70
export const FIXED_FPS = 60
export const STEP_MS = 1000 / FIXED_FPS
export const ROUND_SECONDS = 99
export const ROUNDS_TO_WIN = 2
export const MAX_METER = 100

// --- Tuned physics constants ---
const GRAVITY = 1.7
const GROUND_FRICTION = 0.5 // velocity retained per frame when coasting (lower = snappier stops)
const DASH_TAP_WINDOW = 12 // frames to register a double-tap
const DASH_CD = 8 // dash cooldown after ending

export type FighterActionState =
  | 'idle' | 'walk' | 'jump' | 'crouch'
  | 'attack' | 'hitstun' | 'block' | 'dash' | 'ko' | 'victory'

export type HitstunDir = 'fwd' | 'back'

export type Fighter = {
  def: FighterDef
  x: number
  y: number
  vx: number
  vy: number
  facing: 1 | -1
  hp: number
  meter: number
  action: FighterActionState
  actionTime: number
  actionDuration: number
  attackKind: AttackKind | null
  attackHasHit: boolean
  attackSpawned: boolean
  hitstun: number
  hitstunDir: HitstunDir
  blockstun: number
  crouching: boolean
  onGround: boolean
  flash: number
  blockFlash: number
  walkPhase: number
  // dash bookkeeping
  dashTime: number
  dashCd: number
  dashDir: number
  tapTimer: number
  tapDir: number
  // juice
  squash: number // >0 squashed (wide/short), <0 stretched (tall/thin); decays toward 0
  // victory celebration
  flip: number // tumble rotation (radians) while rolling
  victoryTime: number
  cheering: boolean // true once the roll ends and the cheer begins
  roundWins: number
  prevInput: InputBits
  animPose: string
}

export type Projectile = {
  owner: 0 | 1
  x: number
  y: number
  vx: number
  life: number
  radius: number
  damage: number
  chipDamage: number
  knockback: number
  hitstun: number
  blockstun: number
  hasHit: boolean
  color: string
  glow: string
  travelsLow: boolean
  spawnTrail: number
}

export type EffectType = 'spark' | 'block' | 'impact' | 'dust' | 'ko' | 'ring' | 'dash' | 'crackle' | 'confetti'

export type Effect = {
  type: EffectType
  x: number
  y: number
  t: number
  life: number
  color: string
  size: number
  dir: number // spark direction / facing
  vy: number
}

export type MatchPhase = 'intro' | 'fight' | 'roundEnd' | 'matchEnd' | 'paused'

export type MatchState = {
  fighters: [Fighter, Fighter]
  projectiles: Projectile[]
  effects: Effect[]
  phase: MatchPhase
  prevPhase: MatchPhase
  phaseTime: number
  roundNumber: number
  roundsToWin: number
  roundWinner: 0 | 1 | null
  matchWinner: 0 | 1 | null
  banner: string
  bannerSub: string
  showBanner: boolean
  roundTimer: number
  hitstop: number
  timeScale: number
  // camera / screen juice
  shake: number
  flash: number
  zoom: number
  soundQueue: string[]
  rematchToken: number
}

export type Inputs = readonly [InputBits, InputBits]

function makeFighter(def: FighterDef, x: number, facing: 1 | -1): Fighter {
  return {
    def,
    x,
    y: FLOOR_Y,
    vx: 0,
    vy: 0,
    facing,
    hp: def.maxHp,
    meter: 0,
    action: 'idle',
    actionTime: 0,
    actionDuration: 0,
    attackKind: null,
    attackHasHit: false,
    attackSpawned: false,
    hitstun: 0,
    hitstunDir: 'back',
    blockstun: 0,
    crouching: false,
    onGround: true,
    flash: 0,
    blockFlash: 0,
    walkPhase: 0,
    dashTime: 0,
    dashCd: 0,
    dashDir: 1,
    tapTimer: 0,
    tapDir: 0,
    squash: 0,
    flip: 0,
    victoryTime: 0,
    cheering: false,
    roundWins: 0,
    prevInput: 0,
    animPose: 'idle',
  }
}

export function createMatch(d1: FighterDef, d2: FighterDef): MatchState {
  const state: MatchState = {
    fighters: [makeFighter(d1, STAGE_W * 0.32, 1), makeFighter(d2, STAGE_W * 0.68, -1)],
    projectiles: [],
    effects: [],
    phase: 'intro',
    prevPhase: 'intro',
    phaseTime: 0,
    roundNumber: 1,
    roundsToWin: ROUNDS_TO_WIN,
    roundWinner: null,
    matchWinner: null,
    banner: '',
    bannerSub: '',
    showBanner: true,
    roundTimer: ROUND_SECONDS * FIXED_FPS,
    hitstop: 0,
    timeScale: 1,
    shake: 0,
    flash: 0,
    zoom: 1,
    soundQueue: [],
    rematchToken: 0,
  }
  beginIntro(state)
  return state
}

function beginIntro(state: MatchState) {
  resetRoundPositions(state)
  state.phase = 'intro'
  state.phaseTime = 0
  state.roundWinner = null
  state.projectiles = []
  state.effects = []
  state.roundTimer = ROUND_SECONDS * FIXED_FPS
  state.timeScale = 1
  state.hitstop = 0
  state.shake = 0
  state.flash = 0
  state.zoom = 1
  state.banner = `ROUND ${state.roundNumber}`
  state.bannerSub = `${state.fighters[0].def.name}  VS  ${state.fighters[1].def.name}`
  state.showBanner = true
}

function resetRoundPositions(state: MatchState) {
  const f0 = state.fighters[0]
  const f1 = state.fighters[1]
  f0.x = STAGE_W * 0.32
  f1.x = STAGE_W * 0.68
  f0.y = FLOOR_Y
  f1.y = FLOOR_Y
  f0.vx = f1.vx = 0
  f0.vy = f1.vy = 0
  f0.facing = 1
  f1.facing = -1
  f0.hp = f0.def.maxHp
  f1.hp = f1.def.maxHp
  f0.action = 'idle'
  f1.action = 'idle'
  f0.actionTime = f1.actionTime = 0
  f0.hitstun = f1.hitstun = 0
  f0.hitstunDir = f1.hitstunDir = 'back'
  f0.blockstun = f1.blockstun = 0
  f0.crouching = f1.crouching = false
  f0.onGround = f1.onGround = true
  f0.flash = f1.flash = 0
  f0.blockFlash = f1.blockFlash = 0
  f0.attackKind = f1.attackKind = null
  f0.attackHasHit = f1.attackHasHit = false
  f0.attackSpawned = f1.attackSpawned = false
  f0.dashTime = f1.dashTime = 0
  f0.dashCd = f1.dashCd = 0
  f0.tapTimer = f1.tapTimer = 0
  f0.tapDir = f1.tapDir = 0
  f0.squash = f1.squash = 0
  f0.flip = f1.flip = 0
  f0.victoryTime = f1.victoryTime = 0
  f0.cheering = f1.cheering = false
  f0.animPose = 'idle'
  f1.animPose = 'idle'
}

export function pause(state: MatchState) {
  if (state.phase === 'matchEnd') return
  if (state.phase === 'paused') {
    state.phase = state.prevPhase
  } else {
    state.prevPhase = state.phase
    state.phase = 'paused'
    state.banner = 'PAUSED'
    state.bannerSub = 'Press Esc to resume'
    state.showBanner = true
  }
}

export function rematch(state: MatchState) {
  state.fighters[0].roundWins = 0
  state.fighters[1].roundWins = 0
  state.fighters[0].meter = 0
  state.fighters[1].meter = 0
  state.roundNumber = 1
  state.matchWinner = null
  state.rematchToken++
  beginIntro(state)
}

function pushSound(state: MatchState, s: string) {
  state.soundQueue.push(s)
}

function spawnEffect(state: MatchState, e: Effect) {
  state.effects.push(e)
  if (state.effects.length > 90) state.effects.shift()
}

// hurtbox: returns [left, right, top, bottom] in world coords
function hurtbox(f: Fighter): [number, number, number, number] {
  const w = f.def.bodyType === 'heavy' ? 56 : 46
  const h = f.crouching ? 96 : 150
  return [f.x - w / 2, f.x + w / 2, f.y - h, f.y]
}

function aabbOverlap(
  a: [number, number, number, number],
  b: [number, number, number, number],
): boolean {
  return a[0] < b[1] && a[1] > b[0] && a[2] < b[3] && a[3] > b[2]
}

function meleeHitbox(f: Fighter, atk: AttackDef): [number, number, number, number] | null {
  const cx = f.x + f.facing * (atk.range / 2)
  return [
    cx - atk.hitW / 2,
    cx + atk.hitW / 2,
    f.y - atk.yOffset - atk.hitH / 2,
    f.y - atk.yOffset + atk.hitH / 2,
  ]
}

function isBlocking(f: Fighter, input: InputBits, attackerX: number): boolean {
  if (!f.onGround) return false
  if (f.action === 'attack' || f.action === 'hitstun' || f.action === 'ko' || f.action === 'dash') return false
  if (f.hitstun > 0) return false
  const away = f.x < attackerX ? INPUT.LEFT : INPUT.RIGHT
  return (input & away) !== 0
}

function spawnSparks(state: MatchState, attacker: Fighter, x: number, y: number, big: boolean) {
  const dir = attacker.facing
  spawnEffect(state, { type: 'spark', x, y, t: 0, life: big ? 26 : 18, color: attacker.def.accent, size: big ? 44 : 28, dir, vy: -1.2 })
  spawnEffect(state, { type: 'spark', x, y, t: 0, life: big ? 22 : 15, color: '#ffffff', size: big ? 30 : 20, dir, vy: -1.2 })
  spawnEffect(state, { type: 'impact', x, y, t: 0, life: 9, color: '#ffffff', size: big ? 64 : 38, dir, vy: 0 })
  if (big) {
    spawnEffect(state, { type: 'ring', x, y, t: 0, life: 20, color: attacker.def.glow, size: big ? 120 : 70, dir, vy: 0 })
    spawnEffect(state, { type: 'crackle', x, y, t: 0, life: 14, color: attacker.def.accent, size: big ? 80 : 50, dir, vy: 0 })
  }
}

function applyHit(
  state: MatchState,
  attacker: Fighter,
  victim: Fighter,
  dmg: number,
  chip: number,
  hitstun: number,
  blockstun: number,
  knockback: number,
  hitX: number,
  hitY: number,
  blocked: boolean,
  big = false,
) {
  const dir: 1 | -1 = victim.x >= attacker.x ? 1 : -1
  if (blocked) {
    victim.hp = Math.max(0, victim.hp - chip)
    victim.blockstun = blockstun > 0 ? blockstun : 8
    victim.hitstun = 0
    victim.blockFlash = 8
    victim.vx = dir * knockback * 0.45
    victim.squash = Math.max(victim.squash, big ? 0.7 : 0.45)
    spawnEffect(state, { type: 'block', x: hitX, y: hitY, t: 0, life: 16, color: '#9fe8ff', size: big ? 36 : 26, dir: -dir, vy: 0 })
    pushSound(state, 'block')
    attacker.meter = Math.min(MAX_METER, attacker.meter + (big ? 6 : 3))
    victim.meter = Math.min(MAX_METER, victim.meter + (big ? 5 : 3))
    state.shake = Math.max(state.shake, big ? 5 : 3)
    state.hitstop = big ? 6 : 4
  } else {
    victim.hp = Math.max(0, victim.hp - dmg)
    victim.hitstun = hitstun
    victim.hitstunDir = big ? 'fwd' : 'back'
    victim.action = 'hitstun'
    victim.actionTime = 0
    victim.actionDuration = hitstun
    victim.attackKind = null
    victim.vx = dir * knockback
    victim.flash = 10
    victim.squash = big ? -0.85 : -0.5 // stretch on heavy hit, light stretch on jab
    spawnSparks(state, attacker, hitX, hitY, big)
    pushSound(state, big ? 'special' : 'hit')
    attacker.meter = Math.min(MAX_METER, attacker.meter + dmg)
    victim.meter = Math.min(MAX_METER, victim.meter + dmg * 0.6)
    state.hitstop = big ? 12 : 7
    state.shake = Math.max(state.shake, big ? 16 : 9)
    state.flash = Math.max(state.flash, big ? 0.55 : 0.28)
    state.zoom = Math.max(state.zoom, big ? 1.04 : 1.02)
    if (victim.hp <= 0) {
      victim.hp = 0
      victim.action = 'ko'
      victim.actionTime = 0
      victim.vx = dir * (knockback * 1.5)
      victim.vy = -9
      victim.onGround = false
      victim.squash = -1.1
      spawnEffect(state, { type: 'ko', x: victim.x, y: victim.y - 60, t: 0, life: 44, color: '#ffffff', size: 130, dir, vy: 0 })
      spawnEffect(state, { type: 'ring', x: victim.x, y: victim.y - 60, t: 0, life: 38, color: attacker.def.glow, size: 170, dir, vy: 0 })
      spawnEffect(state, { type: 'crackle', x: victim.x, y: victim.y - 60, t: 0, life: 20, color: attacker.def.accent, size: 110, dir, vy: 0 })
      pushSound(state, 'ko')
      state.hitstop = 24
      state.timeScale = 0.3
      state.shake = 30
      state.flash = 0.85
      state.zoom = 1.07
    }
  }
}

function tryStartAttack(f: Fighter, input: InputBits, kind: AttackKind, state: MatchState) {
  const atk = attackOf(f.def, kind)
  if (atk.meterCost > 0 && f.meter < atk.meterCost) return
  if (atk.meterCost > 0) f.meter -= atk.meterCost
  f.action = 'attack'
  f.actionTime = 0
  f.actionDuration = atk.startup + atk.active + atk.recovery
  f.attackKind = kind
  f.attackHasHit = false
  f.attackSpawned = false
  f.crouching = false
  // small forward lunge on attack start (cancel dash momentum)
  if (kind !== 'special') {
    f.vx += f.facing * (kind === 'kick' ? 1.6 : 1.0)
  }
  // dash-cancel: ending a dash into an attack carries some momentum (a little lunge)
  if (f.dashTime > 0) {
    f.vx += f.facing * 2.0
  }
  f.dashTime = 0
  if (kind === 'special') pushSound(state, 'special')
  else pushSound(state, kind)
}

function updateFighter(
  state: MatchState,
  idx: 0 | 1,
  f: Fighter,
  opp: Fighter,
  input: InputBits,
) {
  const oppIdx: 0 | 1 = idx === 0 ? 1 : 0
  const pressed = (bit: number) => (input & bit) !== 0 && (f.prevInput & bit) === 0

  if (f.action === 'ko') {
    f.actionTime++
    integrate(state, f)
    return
  }

  // Blockstun countdown (defender locked in guard pose)
  if (f.blockstun > 0) {
    f.blockstun--
    f.action = 'block'
    integrate(state, f)
    f.actionTime++
    decayFlash(f)
    f.prevInput = input
    return
  }

  // Hitstun countdown
  if (f.hitstun > 0) {
    f.hitstun--
    f.action = 'hitstun'
    integrate(state, f)
    f.actionTime++
    if (f.hitstun === 0) {
      f.action = 'idle'
      f.actionTime = 0
    }
    decayFlash(f)
    f.prevInput = input
    return
  }

  // --- DASH state ---
  if (f.action === 'dash') {
    f.dashTime--
    // maintain dash velocity
    f.vx = f.dashDir * f.def.dashSpeed
    // dash-cancel into attack
    if (pressed(INPUT.PUNCH)) { tryStartAttack(f, input, 'punch', state); integrate(state, f); f.prevInput = input; return }
    if (pressed(INPUT.KICK)) { tryStartAttack(f, input, 'kick', state); integrate(state, f); f.prevInput = input; return }
    // dust trail
    if (f.onGround && Math.random() < 0.6) {
      spawnEffect(state, { type: 'dash', x: f.x - f.dashDir * 18, y: FLOOR_Y, t: 0, life: 12, color: f.def.accent, size: 22, dir: -f.dashDir, vy: -0.4 })
    }
    f.actionTime++
    if (f.dashTime <= 0) {
      f.dashCd = DASH_CD
      f.action = 'idle'
      f.actionTime = 0
    }
    integrate(state, f)
    decayFlash(f)
    f.prevInput = input
    return
  }

  if (f.action === 'attack') {
    const atk = attackOf(f.def, f.attackKind!)
    const prevActive = f.actionTime > atk.startup
    f.actionTime++

    // Projectile spawn at end of startup
    if (atk.spawnsProjectile && !f.attackSpawned && f.actionTime > atk.startup) {
      f.attackSpawned = true
      spawnProjectile(state, idx, f, opp)
    }

    // Attacker lunge on entering active frames (melee only)
    if (!atk.spawnsProjectile && !prevActive && f.actionTime > atk.startup && f.actionTime <= atk.startup + atk.active) {
      const lunge = f.attackKind === 'kick' ? 4.5 : 2.5
      f.vx += f.facing * lunge
    }

    // Melee hitbox check during active frames
    if (!atk.spawnsProjectile && atk.active > 0 && !f.attackHasHit) {
      const inActive = f.actionTime > atk.startup && f.actionTime <= atk.startup + atk.active
      if (inActive) {
        const hb = meleeHitbox(f, atk)
        const oh = hurtbox(opp)
        if (hb && aabbOverlap(hb, oh)) {
          f.attackHasHit = true
          const blocked = isBlocking(opp, _lastInputs[oppIdx], f.x)
          const hx = Math.max(hb[0], Math.min(oh[0], (hb[0] + hb[1]) / 2)) + 10
          const hy = (hb[2] + hb[3]) / 2
          applyHit(state, f, opp, atk.damage, atk.chipDamage, atk.hitstun, atk.blockstun, atk.knockback, hx, hy, blocked, f.attackKind === 'kick')
        }
      }
    }

    // Recovery cancel: chain into a normal (punch/kick) during recovery frames
    const inRecovery = f.actionTime > atk.startup + atk.active
    if (inRecovery && f.attackKind !== 'special') {
      if (pressed(INPUT.PUNCH)) { tryStartAttack(f, input, 'punch', state); integrate(state, f); decayFlash(f); f.prevInput = input; return }
      if (pressed(INPUT.KICK)) { tryStartAttack(f, input, 'kick', state); integrate(state, f); decayFlash(f); f.prevInput = input; return }
    }

    integrate(state, f)
    if (f.actionTime >= f.actionDuration) {
      f.action = 'idle'
      f.actionTime = 0
      f.attackKind = null
    }
    decayFlash(f)
    return
  }

  // --- FREE ACTION: handle inputs ---
  f.crouching = false
  if (f.tapTimer > 0) f.tapTimer--

  if (pressed(INPUT.PUNCH)) { tryStartAttack(f, input, 'punch', state); integrate(state, f); decayFlash(f); f.prevInput = input; return }
  if (pressed(INPUT.KICK)) { tryStartAttack(f, input, 'kick', state); integrate(state, f); decayFlash(f); f.prevInput = input; return }
  const wantSpecial = pressed(INPUT.SPECIAL)
  const specAtk = f.def.special
  if (wantSpecial && f.meter >= specAtk.meterCost) { tryStartAttack(f, input, 'special', state); integrate(state, f); decayFlash(f); f.prevInput = input; return }

  const left = (input & INPUT.LEFT) !== 0
  const right = (input & INPUT.RIGHT) !== 0
  const jump = pressed(INPUT.UP)
  const down = (input & INPUT.DOWN) !== 0

  // --- double-tap dash detection ---
  let dashRequested = 0
  if (f.dashCd <= 0 && f.onGround) {
    if (pressed(INPUT.LEFT)) {
      if (f.tapTimer > 0 && f.tapDir === -1) dashRequested = -1
      else { f.tapTimer = DASH_TAP_WINDOW; f.tapDir = -1 }
    } else if (pressed(INPUT.RIGHT)) {
      if (f.tapTimer > 0 && f.tapDir === 1) dashRequested = 1
      else { f.tapTimer = DASH_TAP_WINDOW; f.tapDir = 1 }
    }
  }
  if (dashRequested !== 0) {
    f.tapTimer = 0
    f.tapDir = 0
    f.action = 'dash'
    f.dashTime = f.def.dashDuration
    f.dashDir = dashRequested
    f.actionTime = 0
    f.vx = f.dashDir * f.def.dashSpeed
    spawnEffect(state, { type: 'dash', x: f.x - f.dashDir * 20, y: FLOOR_Y, t: 0, life: 16, color: f.def.accent, size: 30, dir: -f.dashDir, vy: -0.6 })
    integrate(state, f)
    decayFlash(f)
    f.prevInput = input
    return
  }

  if (jump && f.onGround) {
    f.vy = -f.def.jumpVelocity
    f.onGround = false
    f.action = 'jump'
    f.actionTime = 0
    f.squash = -0.7 // stretch on jump
    spawnEffect(state, { type: 'dust', x: f.x, y: f.y, t: 0, life: 14, color: f.def.accent, size: 20, dir: 0, vy: -0.3 })
  }

  // Determine blocking (walk back)
  const awayBit = f.x < opp.x ? INPUT.LEFT : INPUT.RIGHT
  const movingAway = (input & awayBit) !== 0 && f.onGround

  let move = 0
  if (left && !right) move = -1
  else if (right && !left) move = 1

  if (f.onGround) {
    if (down) {
      f.crouching = true
      f.action = 'crouch'
      f.vx = 0
    } else if (move !== 0) {
      f.vx = move * f.def.walkSpeed
      f.action = movingAway ? 'block' : 'walk'
      // footstep dust
      if (Math.random() < 0.12) {
        spawnEffect(state, { type: 'dust', x: f.x, y: FLOOR_Y, t: 0, life: 10, color: f.def.accent, size: 14, dir: -move, vy: -0.2 })
      }
    } else {
      f.action = 'idle'
    }
  } else {
    // air control
    if (move !== 0) f.vx = move * f.def.walkSpeed * 0.85
    f.action = 'jump'
  }

  integrate(state, f)

  if (f.action === 'walk') f.walkPhase += 0.34
  decayFlash(f)
  f.prevInput = input
}

function decayFlash(f: Fighter) {
  if (f.flash > 0) f.flash = Math.max(0, f.flash - 1)
  if (f.blockFlash > 0) f.blockFlash = Math.max(0, f.blockFlash - 1)
}

// Tracks the most recent inputs per fighter for cross-fighter block checks.
let _lastInputs: Inputs = [0, 0]

function integrate(state: MatchState, f: Fighter) {
  if (!f.onGround) f.vy += GRAVITY
  f.x += f.vx
  f.y += f.vy
  if (f.y >= FLOOR_Y) {
    const wasAir = !f.onGround
    const impactSpeed = Math.abs(f.vy)
    f.y = FLOOR_Y
    f.vy = 0
    if (wasAir) {
      f.onGround = true
      // landing squash scales with impact
      f.squash = Math.min(1, 0.4 + impactSpeed * 0.05)
      spawnEffect(state, { type: 'dust', x: f.x - 12, y: FLOOR_Y, t: 0, life: 14, color: f.def.accent, size: 20, dir: -1, vy: -0.4 })
      spawnEffect(state, { type: 'dust', x: f.x + 12, y: FLOOR_Y, t: 0, life: 14, color: f.def.accent, size: 20, dir: 1, vy: -0.4 })
      if (f.action === 'jump') {
        f.action = 'idle'
        f.actionTime = 0
      }
    }
  }
  // ground friction when not actively walking/dashing
  if (f.onGround && f.action !== 'walk' && f.action !== 'dash') {
    f.vx *= GROUND_FRICTION
    if (Math.abs(f.vx) < 0.15) f.vx = 0
  }
  // walls
  if (f.x < WALL_L) { f.x = WALL_L; if (f.vx < 0) f.vx = 0 }
  if (f.x > WALL_R) { f.x = WALL_R; if (f.vx > 0) f.vx = 0 }
  // dash cooldown
  if (f.dashCd > 0) f.dashCd--
}

function spawnProjectile(state: MatchState, owner: 0 | 1, f: Fighter, opp: Fighter) {
  const spec = f.def.projectile
  if (!spec) return
  const dir: number = f.facing
  const y = spec.travelsLow ? f.y - 30 : f.y - 96
  state.projectiles.push({
    owner,
    x: f.x + dir * 40,
    y,
    vx: dir * spec.speed,
    life: spec.life,
    radius: spec.radius,
    damage: spec.damage,
    chipDamage: spec.chipDamage,
    knockback: spec.knockback,
    hitstun: spec.hitstun,
    blockstun: spec.blockstun,
    hasHit: false,
    color: spec.color,
    glow: spec.glow,
    travelsLow: spec.travelsLow,
    spawnTrail: 0,
  })
  void opp
}

function updateProjectiles(state: MatchState) {
  const keep: Projectile[] = []
  for (const p of state.projectiles) {
    p.x += p.vx
    p.life--
    p.spawnTrail++
    if (Math.random() < 0.7) {
      spawnEffect(state, { type: 'dust', x: p.x, y: p.y, t: 0, life: 10, color: p.color, size: p.radius * 0.7, dir: -Math.sign(p.vx), vy: 0 })
    }
    const victimIdx: 0 | 1 = p.owner === 0 ? 1 : 0
    const victim = state.fighters[victimIdx]
    const attacker = state.fighters[p.owner]
    if (!p.hasHit) {
      const dx = p.x - victim.x
      const dy = p.y - (victim.y - (victim.crouching ? 48 : 75))
      if (Math.hypot(dx, dy) < p.radius + 34) {
        p.hasHit = true
        const blocked = isBlocking(victim, _lastInputs[victimIdx], attacker.x)
        applyHit(state, attacker, victim, p.damage, p.chipDamage, p.hitstun, p.blockstun, p.knockback, p.x, p.y, blocked, true)
        spawnEffect(state, { type: 'ring', x: p.x, y: p.y, t: 0, life: 20, color: p.glow, size: p.radius * 4, dir: -Math.sign(p.vx), vy: 0 })
        continue // projectile consumed
      }
    }
    if (p.life > 0 && p.x > -40 && p.x < STAGE_W + 40) keep.push(p)
  }
  state.projectiles = keep
}

function resolveBodyCollision(state: MatchState) {
  void state
  const [a, b] = _fighters()
  const minDist = 54
  const dx = b.x - a.x
  const dist = Math.abs(dx)
  if (dist < minDist) {
    const push = (minDist - dist) / 2
    const dir = dx >= 0 ? 1 : -1
    a.x -= push * dir
    b.x += push * dir
    if (a.x < WALL_L) a.x = WALL_L
    if (a.x > WALL_R) a.x = WALL_R
    if (b.x < WALL_L) b.x = WALL_L
    if (b.x > WALL_R) b.x = WALL_R
  }
}

let _stateRef: MatchState | null = null
function _fighters(): [Fighter, Fighter] {
  return _stateRef!.fighters
}

function autoFace(state: MatchState) {
  const [a, b] = state.fighters
  const freeActions = new Set(['idle', 'walk', 'jump', 'crouch', 'block', 'dash'])
  if (a.x < b.x) {
    if (freeActions.has(a.action)) a.facing = 1
    if (freeActions.has(b.action)) b.facing = -1
  } else {
    if (freeActions.has(a.action)) a.facing = -1
    if (freeActions.has(b.action)) b.facing = 1
  }
}

function updateEffects(state: MatchState) {
  const keep: Effect[] = []
  for (const e of state.effects) {
    e.t++
    if (e.type === 'confetti') {
      e.x += e.dir
      e.y += e.vy
      e.vy += 0.18 // gravity
      e.dir *= 0.99
    } else {
      e.y += e.vy
    }
    if (e.t < e.life) keep.push(e)
  }
  state.effects = keep
}

function setAnimPose(state: MatchState) {
  for (const f of state.fighters) {
    if (f.action === 'ko') f.animPose = 'ko'
    else if (f.action === 'victory') f.animPose = f.cheering ? 'victory' : 'victoryRoll'
    else if (f.action === 'dash') f.animPose = 'dash'
    else if (f.action === 'hitstun') f.animPose = f.hitstunDir === 'fwd' ? 'hitstunFwd' : 'hitstunBack'
    else if (f.action === 'attack') {
      const atk = f.attackKind ? attackOf(f.def, f.attackKind) : null
      if (f.attackKind === 'special') f.animPose = 'special'
      else if (atk && f.actionTime <= atk.startup + atk.active && f.actionTime > atk.startup) {
        f.animPose = f.attackKind === 'kick' ? 'kickActive' : 'punchActive'
      } else if (atk && f.actionTime <= atk.startup) {
        f.animPose = f.attackKind === 'kick' ? 'kickWind' : 'punchWind'
      } else {
        f.animPose = 'punchRecover'
      }
    } else if (f.action === 'jump') f.animPose = 'jump'
    else if (f.action === 'crouch') f.animPose = 'crouch'
    else if (f.action === 'walk') f.animPose = 'walk'
    else if (f.action === 'block') f.animPose = 'block'
    else f.animPose = 'idle'
  }
  void state
}

// Decays screen-juice fields every frame (shake/flash/zoom ease back to rest).
function decayJuice(state: MatchState) {
  if (state.shake > 0) {
    state.shake *= 0.84
    if (state.shake < 0.3) state.shake = 0
  }
  if (state.flash > 0) {
    state.flash *= 0.8
    if (state.flash < 0.02) state.flash = 0
  }
  if (state.zoom > 1) {
    state.zoom += (1 - state.zoom) * 0.12
    if (state.zoom < 1.002) state.zoom = 1
  }
  for (const f of state.fighters) {
    if (f.squash !== 0) {
      f.squash *= 0.82
      if (Math.abs(f.squash) < 0.02) f.squash = 0
    }
  }
}

// --- Victory celebration: traveling forward rolls, then a cheer with confetti ---
const VICTORY_ROLL_SPEED = 6.5
const VICTORY_ROLL_FRAMES = 85
const VICTORY_ROLL_SPIN = 0.42

function startVictory(state: MatchState, winner: 0 | 1) {
  const w = state.fighters[winner]
  const loser = state.fighters[winner === 0 ? 1 : 0]
  // roll away from the fallen opponent, toward open space
  const dir: 1 | -1 = w.x < loser.x ? -1 : 1
  w.action = 'victory'
  w.victoryTime = 0
  w.flip = 0
  w.cheering = false
  w.facing = dir
  w.attackKind = null
  w.hitstun = 0
  w.blockstun = 0
  w.crouching = false
  w.onGround = true
  w.vy = 0
  w.vx = dir * VICTORY_ROLL_SPEED
}

function atWall(f: Fighter): boolean {
  return f.x <= WALL_L + 1 || f.x >= WALL_R - 1
}

function updateVictory(state: MatchState, f: Fighter) {
  if (f.action !== 'victory') return
  f.victoryTime++
  if (!f.cheering) {
    if (f.victoryTime < VICTORY_ROLL_FRAMES && !atWall(f)) {
      f.vx = f.facing * VICTORY_ROLL_SPEED
      f.flip += VICTORY_ROLL_SPIN
    } else {
      // stop and start cheering -- turn to face the stage
      f.cheering = true
      f.flip = 0
      f.vx = 0
      f.facing = (f.facing === 1 ? -1 : 1) as 1 | -1
      spawnVictoryBurst(state, f)
      pushSound(state, 'round-bell')
    }
  } else {
    f.vx = 0
    if (f.victoryTime % 5 === 0) spawnConfetti(state, f)
  }
}

function spawnVictoryBurst(state: MatchState, f: Fighter) {
  const cx = f.x
  const cy = f.y - 70
  spawnEffect(state, { type: 'ring', x: cx, y: cy, t: 0, life: 34, color: f.def.glow, size: 150, dir: 0, vy: 0 })
  spawnEffect(state, { type: 'crackle', x: cx, y: cy, t: 0, life: 22, color: f.def.accent, size: 90, dir: 0, vy: 0 })
  for (let i = 0; i < 16; i++) {
    spawnConfetti(state, f, true)
  }
}

function spawnConfetti(state: MatchState, f: Fighter, burst = false) {
  const colors = [f.def.color, f.def.glow, f.def.accent, '#ffffff', '#ffd54a']
  const c = colors[(Math.random() * colors.length) | 0]
  const dx = (Math.random() - 0.5) * (burst ? 7 : 4)
  const vy = burst ? -(2 + Math.random() * 4) : -(1.5 + Math.random() * 2.5)
  spawnEffect(state, {
    type: 'confetti',
    x: f.x + (Math.random() - 0.5) * 60,
    y: f.y - (burst ? 60 + Math.random() * 40 : 140 + Math.random() * 20),
    t: 0,
    life: 45 + ((Math.random() * 25) | 0),
    color: c,
    size: 5 + Math.random() * 5,
    dir: dx,
    vy,
  })
}

export function advanceFrame(state: MatchState, inputs: Inputs) {
  _stateRef = state
  _lastInputs = inputs

  state.phaseTime++
  decayJuice(state)

  if (state.phase === 'paused') {
    return
  }

  if (state.phase === 'intro') {
    if (state.phaseTime === 60) {
      state.banner = 'FIGHT!'
      state.bannerSub = ''
      pushSound(state, 'round-bell')
    }
    if (state.phaseTime > 100) {
      state.phase = 'fight'
      state.phaseTime = 0
      state.showBanner = false
    }
    updateEffects(state)
    return
  }

  if (state.phase === 'roundEnd') {
    if (state.phaseTime > 60 && state.timeScale < 1) state.timeScale = 1
    updateEffects(state)
    updateProjectiles(state)
    for (const f of state.fighters) {
      updateVictory(state, f)
      integrate(state, f)
    }
    setAnimPose(state)
    if (state.phaseTime > 130) {
      const winner = state.roundWinner
      if (winner !== null && state.fighters[winner].roundWins >= state.roundsToWin) {
        state.matchWinner = winner
        state.phase = 'matchEnd'
        state.phaseTime = 0
        state.banner = `${state.fighters[winner].def.name} WINS!`
        state.bannerSub = 'Match Complete'
        state.showBanner = true
        state.timeScale = 1
      } else {
        state.roundNumber++
        beginIntro(state)
      }
    }
    return
  }

  if (state.phase === 'matchEnd') {
    updateEffects(state)
    if (state.phaseTime > 50 && state.timeScale < 1) state.timeScale = 1
    for (const f of state.fighters) {
      updateVictory(state, f)
      integrate(state, f)
    }
    setAnimPose(state)
    return
  }

  // FIGHT phase -- hitstop freezes only the fighters (effects/projectiles keep going)
  if (state.hitstop > 0) {
    state.hitstop--
    updateProjectiles(state)
    updateEffects(state)
    setAnimPose(state)
    return
  }

  state.roundTimer--
  updateFighter(state, 0, state.fighters[0], state.fighters[1], inputs[0])
  updateFighter(state, 1, state.fighters[1], state.fighters[0], inputs[1])
  resolveBodyCollision(state)
  autoFace(state)
  updateProjectiles(state)
  updateEffects(state)
  setAnimPose(state)

  // KO / timeout detection
  const f0 = state.fighters[0]
  const f1 = state.fighters[1]
  if (f0.hp <= 0 || f1.hp <= 0) {
    const winner: 0 | 1 = f0.hp <= 0 && f1.hp <= 0 ? (f0.hp >= f1.hp ? 0 : 1) : f0.hp <= 0 ? 1 : 0
    state.roundWinner = winner
    state.fighters[winner].roundWins++
    state.phase = 'roundEnd'
    state.phaseTime = 0
    state.hitstop = 0
    state.banner = 'K.O.'
    state.bannerSub = `${state.fighters[winner].def.name} takes the round`
    state.showBanner = true
    startVictory(state, winner)
  } else if (state.roundTimer <= 0) {
    let winner: 0 | 1
    if (f0.hp > f1.hp) winner = 0
    else if (f1.hp > f0.hp) winner = 1
    else winner = Math.random() < 0.5 ? 0 : 1 // tie -> coin flip (rare)
    state.roundWinner = winner
    state.fighters[winner].roundWins++
    state.phase = 'roundEnd'
    state.phaseTime = 0
    state.banner = 'TIME UP'
    state.bannerSub = `${state.fighters[winner].def.name} takes the round`
    state.showBanner = true
    state.timeScale = 0.6
    startVictory(state, winner)
  }
}
