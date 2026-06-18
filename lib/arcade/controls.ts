// Keyboard input mapping for Neon Versus. Two players share one keyboard.

export const INPUT = {
  LEFT: 1 << 0,
  RIGHT: 1 << 1,
  UP: 1 << 2,
  DOWN: 1 << 3,
  PUNCH: 1 << 4,
  KICK: 1 << 5,
  SPECIAL: 1 << 6,
} as const

export type InputBits = number

// Physical KeyboardEvent.code -> { player, bit }
const KEY_MAP: Record<string, { player: 0 | 1; bit: number }> = {
  // Player 1 (left side): WASD + F/G/H
  KeyA: { player: 0, bit: INPUT.LEFT },
  KeyD: { player: 0, bit: INPUT.RIGHT },
  KeyW: { player: 0, bit: INPUT.UP },
  KeyS: { player: 0, bit: INPUT.DOWN },
  KeyF: { player: 0, bit: INPUT.PUNCH },
  KeyG: { player: 0, bit: INPUT.KICK },
  KeyH: { player: 0, bit: INPUT.SPECIAL },
  // Player 2 (right side): Arrows + J/K/L
  ArrowLeft: { player: 1, bit: INPUT.LEFT },
  ArrowRight: { player: 1, bit: INPUT.RIGHT },
  ArrowUp: { player: 1, bit: INPUT.UP },
  ArrowDown: { player: 1, bit: INPUT.DOWN },
  KeyJ: { player: 1, bit: INPUT.PUNCH },
  KeyK: { player: 1, bit: INPUT.KICK },
  KeyL: { player: 1, bit: INPUT.SPECIAL },
}

// Keys whose default action (page scroll, etc.) we must suppress during play.
export const PREVENT_DEFAULT_CODES = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Space',
])

export type PauseHandler = () => void

export class InputDevice {
  private keys = new Set<string>()
  private bits: [InputBits, InputBits] = [0, 0]
  private onKeyDown: (e: KeyboardEvent) => void
  private onKeyUp: (e: KeyboardEvent) => void
  private onBlur: () => void
  private onPause: PauseHandler | null

  constructor(onPause: PauseHandler | null = null) {
    this.onPause = onPause
    this.onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) {
        // still suppress default for game keys
        if (PREVENT_DEFAULT_CODES.has(e.code)) e.preventDefault()
        return
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        this.onPause?.()
        return
      }
      const m = KEY_MAP[e.code]
      if (m) {
        this.keys.add(e.code)
        this.recompute()
        if (PREVENT_DEFAULT_CODES.has(e.code)) e.preventDefault()
      }
    }
    this.onKeyUp = (e: KeyboardEvent) => {
      const m = KEY_MAP[e.code]
      if (m) {
        this.keys.delete(e.code)
        this.recompute()
      }
    }
    this.onBlur = () => {
      this.keys.clear()
      this.recompute()
    }
  }

  private recompute() {
    const out: [InputBits, InputBits] = [0, 0]
    for (const code of this.keys) {
      const m = KEY_MAP[code]
      if (m) out[m.player] |= m.bit
    }
    this.bits = out
  }

  attach() {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.onBlur)
  }

  detach() {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.onBlur)
  }

  read(): readonly [InputBits, InputBits] {
    return this.bits
  }

  clear() {
    this.keys.clear()
    this.recompute()
  }
}
