// Original neon-arcade fighter definitions for the Versus mode.
// All timing values are in frames @ 60fps. Distances are in logical stage units.

export type AttackKind = 'punch' | 'kick' | 'special'

export type ProjectileSpec = {
  speed: number
  life: number
  radius: number
  damage: number
  chipDamage: number
  knockback: number
  hitstun: number
  blockstun: number
  hitsMultiple: boolean
  color: string
  glow: string
  travelsLow: boolean
}

export type AttackDef = {
  startup: number
  active: number
  recovery: number
  damage: number
  chipDamage: number
  hitstun: number
  blockstun: number
  knockback: number
  range: number
  hitW: number
  hitH: number
  yOffset: number
  meterCost: number
  meterGain: number
  spawnsProjectile?: boolean
}

export type BodyType = 'lean' | 'heavy'

export type Palette = {
  label: string
  color: string
  glow: string
  accent: string
}

export type FighterDef = {
  id: string
  name: string
  maxHp: number
  walkSpeed: number
  jumpVelocity: number
  dashSpeed: number
  dashDuration: number
  bodyType: BodyType
  color: string
  glow: string
  accent: string
  palettes: Palette[]
  punch: AttackDef
  kick: AttackDef
  special: AttackDef
  projectile?: ProjectileSpec
}

// GLITCH -- a rogue data-construct. Lean, erratic, blindingly quick.
export const GLITCH: FighterDef = {
  id: 'glitch',
  name: 'GLITCH',
  maxHp: 92,
  walkSpeed: 7.2,
  jumpVelocity: 19,
  dashSpeed: 11.5,
  dashDuration: 13,
  bodyType: 'lean',
  color: '#23eaff',
  glow: '#23eaff',
  accent: '#bafcff',
  palettes: [
    { label: 'CYAN', color: '#23eaff', glow: '#23eaff', accent: '#bafcff' },
    { label: 'MAGENTA', color: '#ff3df0', glow: '#ff3df0', accent: '#ffd0fb' },
    { label: 'LIME', color: '#b6ff3d', glow: '#b6ff3d', accent: '#eaffb0' },
    { label: 'VOID', color: '#9aa6ff', glow: '#9aa6ff', accent: '#e6e9ff' },
  ],
  punch: {
    startup: 3, active: 3, recovery: 5,
    damage: 4, chipDamage: 1, hitstun: 13, blockstun: 8,
    knockback: 2.6, range: 80, hitW: 72, hitH: 16, yOffset: 96,
    meterCost: 0, meterGain: 6,
  },
  kick: {
    startup: 6, active: 4, recovery: 9,
    damage: 7, chipDamage: 1, hitstun: 18, blockstun: 10,
    knockback: 4.6, range: 98, hitW: 88, hitH: 18, yOffset: 92,
    meterCost: 0, meterGain: 8,
  },
  special: {
    startup: 9, active: 0, recovery: 16,
    damage: 0, chipDamage: 0, hitstun: 0, blockstun: 0,
    knockback: 0, range: 0, hitW: 0, hitH: 0, yOffset: 0,
    meterCost: 50, meterGain: 0, spawnsProjectile: true,
  },
  projectile: {
    speed: 11.5, life: 80, radius: 15,
    damage: 9, chipDamage: 2, hitstun: 16, blockstun: 10,
    knockback: 5.5, hitsMultiple: false,
    color: '#7df9ff', glow: '#23eaff', travelsLow: false,
  },
}

// FORGE -- an industrial power-frame brute. Slow, armored, devastating.
export const FORGE: FighterDef = {
  id: 'forge',
  name: 'FORGE',
  maxHp: 122,
  walkSpeed: 5.0,
  jumpVelocity: 17.5,
  dashSpeed: 8.5,
  dashDuration: 13,
  bodyType: 'heavy',
  color: '#ff4133',
  glow: '#ff4133',
  accent: '#ffb347',
  palettes: [
    { label: 'CRIMSON', color: '#ff4133', glow: '#ff4133', accent: '#ffb347' },
    { label: 'VOID', color: '#a23dff', glow: '#a23dff', accent: '#e0b3ff' },
    { label: 'GOLD', color: '#ffb347', glow: '#ffb347', accent: '#fff0c2' },
    { label: 'TOXIC', color: '#14ffc4', glow: '#14ffc4', accent: '#b0fff0' },
  ],
  punch: {
    startup: 6, active: 4, recovery: 9,
    damage: 7, chipDamage: 1, hitstun: 16, blockstun: 9,
    knockback: 4.4, range: 86, hitW: 78, hitH: 20, yOffset: 92,
    meterCost: 0, meterGain: 7,
  },
  kick: {
    startup: 10, active: 5, recovery: 15,
    damage: 12, chipDamage: 2, hitstun: 22, blockstun: 12,
    knockback: 8, range: 106, hitW: 96, hitH: 22, yOffset: 84,
    meterCost: 0, meterGain: 9,
  },
  special: {
    startup: 12, active: 0, recovery: 28,
    damage: 0, chipDamage: 0, hitstun: 0, blockstun: 0,
    knockback: 0, range: 0, hitW: 0, hitH: 0, yOffset: 0,
    meterCost: 50, meterGain: 0, spawnsProjectile: true,
  },
  projectile: {
    speed: 6.5, life: 110, radius: 28,
    damage: 17, chipDamage: 4, hitstun: 26, blockstun: 14,
    knockback: 10, hitsMultiple: false,
    color: '#ffb347', glow: '#ff4133', travelsLow: true,
  },
}

export const ROSTER: FighterDef[] = [GLITCH, FORGE]

export function getFighter(id: string): FighterDef {
  const found = ROSTER.find((f) => f.id === id)
  if (!found) return GLITCH
  return found
}

export function attackOf(def: FighterDef, kind: AttackKind): AttackDef {
  if (kind === 'punch') return def.punch
  if (kind === 'kick') return def.kick
  return def.special
}

// Returns a FighterDef clone with the chosen palette's colors applied.
// Index is wrapped modulo palette count; index 0 is always the canonical look.
export function resolvePalette(def: FighterDef, index: number): FighterDef {
  if (def.palettes.length === 0) return def
  const safe = ((index % def.palettes.length) + def.palettes.length) % def.palettes.length
  const p = def.palettes[safe]
  if (p.color === def.color && p.glow === def.glow && p.accent === def.accent) return def
  return { ...def, color: p.color, glow: p.glow, accent: p.accent }
}
