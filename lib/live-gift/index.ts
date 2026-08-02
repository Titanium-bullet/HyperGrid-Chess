import { GIFT_EFFECTS, GIFT_COMBO_TIMEOUT, type GiftEffectConfig } from './config'
import { showGiftCard, removeGiftCard, clearAllGiftDom } from './ui'
import { playGiftVideo } from './video'

export type SendGiftOptions = {
  id: string
  sender?: string
  combo?: number
}

type QueueItem = { cfg: GiftEffectConfig; sender: string; combo: number }

let comboMap: Record<string, { count: number; lastTime: number }> = {}
let queue: QueueItem[] = []
let processing = false
let muted = false

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
  const card = showGiftCard(item.cfg, item.sender)
  playGiftVideo(item.cfg, () => {
    removeGiftCard(card)
    done()
  })
}

export function clearGiftQueue(): void {
  queue = []
  processing = false
  clearAllGiftDom()
}

export function destroyGiftSystem(): void {
  clearGiftQueue()
  comboMap = {}
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
