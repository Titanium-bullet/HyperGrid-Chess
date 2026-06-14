import { GIFT_EFFECTS, GIFT_COMBO_TIMEOUT, type GiftEffectConfig } from './config'
import { GiftParticleEngine } from './particles'
import { GiftEffectOrchestrator } from './effects'
import { showGiftCard, screenFlash, screenShake, showBrightnessBoost, clearAllGiftDom } from './ui'
import { closeGiftAudioContext } from './audio'

export type SendGiftOptions = {
  id: string
  sender?: string
  combo?: number
}

type QueueItem = { cfg: GiftEffectConfig; sender: string; combo: number }

let particleEngine: GiftParticleEngine | null = null
let orchestrator: GiftEffectOrchestrator | null = null
let comboMap: Record<string, { count: number; lastTime: number }> = {}
let queue: QueueItem[] = []
let processing = false
let muted = false
let deferredClearId: number | null = null

function isReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function getEngine(): { particles: GiftParticleEngine; orchestrator: GiftEffectOrchestrator } {
  if (!particleEngine) particleEngine = new GiftParticleEngine()
  if (!orchestrator) orchestrator = new GiftEffectOrchestrator(particleEngine)
  return { particles: particleEngine, orchestrator }
}

export function sendGift(opts: SendGiftOptions): void {
  if (typeof window === 'undefined') return
  const cfg = GIFT_EFFECTS[opts.id]
  if (!cfg) return
  const sender = opts.sender ?? 'You'
  let combo = opts.combo
  if (combo == null) {
    const now = Date.now()
    const existing = comboMap[opts.id]
    if (existing && now - existing.lastTime < GIFT_COMBO_TIMEOUT) {
      existing.count++
      existing.lastTime = now
      combo = existing.count
    } else {
      comboMap[opts.id] = { count: 1, lastTime: now }
      combo = 1
    }
  }
  queue.push({ cfg, sender, combo })
  if (!processing) processQueue()
}

function processQueue(): void {
  if (queue.length === 0) {
    processing = false
    return
  }
  processing = true
  const item = queue.shift()
  if (!item) {
    processing = false
    return
  }
  executeGift(item, () => window.setTimeout(processQueue, 200))
}

function executeGift(item: QueueItem, done: () => void): void {
  if (muted) {
    done()
    return
  }
  if (deferredClearId !== null) {
    window.clearTimeout(deferredClearId)
    deferredClearId = null
  }
  const reduced = isReducedMotion()
  const { particles, orchestrator } = getEngine()
  particles.init()
  showGiftCard(item.cfg, item.sender, item.combo)
  window.setTimeout(() => {
    screenFlash(item.cfg.screenFlash.color, item.cfg.screenFlash.opacity, item.cfg.screenFlash.duration)
  }, 300)
  if (!reduced && item.cfg.shakeIntensity > 0) {
    window.setTimeout(() => screenShake(item.cfg.shakeIntensity, item.cfg.shakeDuration), 400)
  }
  if (!reduced && item.cfg.rarity === 'mythic') showBrightnessBoost(0.1, item.cfg.duration)
  orchestrator.playEffect(item.cfg, item.combo, { reducedMotion: reduced })
  orchestrator.playComboEffect(item.combo, item.cfg.rarityColor)
  window.setTimeout(() => {
    if (queue.length === 0) {
      deferredClearId = window.setTimeout(() => {
        deferredClearId = null
        if (queue.length === 0 && !processing) particles.clear()
      }, 1000)
    }
    done()
  }, item.cfg.duration + 500)
}

export function clearGiftQueue(): void {
  queue = []
  processing = false
  if (deferredClearId !== null) {
    window.clearTimeout(deferredClearId)
    deferredClearId = null
  }
  orchestrator?.cleanup()
  particleEngine?.clear()
  clearAllGiftDom()
}

export function destroyGiftSystem(): void {
  clearGiftQueue()
  particleEngine?.destroy()
  particleEngine = null
  orchestrator = null
  comboMap = {}
  closeGiftAudioContext()
}

export function setGiftMuted(v: boolean): void {
  muted = v
}

export function isGiftMuted(): boolean {
  return muted
}

export function getGiftCombo(id: string): number {
  return comboMap[id]?.count ?? 0
}

export function resetGiftCombo(id: string): void {
  delete comboMap[id]
}

export { GIFT_EFFECTS } from './config'
export type { GiftEffectConfig, GiftRarity } from './config'
