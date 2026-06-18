import { STORAGE_KEYS } from './storage-keys'
import { HYPERGRID_COINS_CHANGED, HYPERGRID_INVENTORY_CHANGED, HYPERGRID_AFFINITY_CHANGED } from '@/lib/events'

export type ShopBoard = { id: string; name: string; price: number; description: string; preview: [string, string] }
export type ShopPiece = { id: string; name: string; price: number; description: string }
export type ShopPowerup = { id: string; name: string; price: number; qty: number; description: string; icon: string }
export type ShopBackground = {
  id: string
  name: string
  price: number
  description: string
  preview: [string, string]
  tier: 'normal' | 'divine'
}
export type ShopGift = {
  id: string
  name: string
  price: number
  affinity: number
  icon: string
  description: string
  universal: boolean
}

export type ShopItems = {
  boards: ShopBoard[]
  pieces: ShopPiece[]
  powerups: ShopPowerup[]
  backgrounds: ShopBackground[]
  gifts: ShopGift[]
}

export type Inventory = {
  equippedBoard: string
  equippedPieces: string
  equippedBackground: string
  boards: string[]
  pieces: string[]
  backgrounds: string[]
  powerups: Record<string, number>
}

export type Category = 'boards' | 'pieces' | 'powerups' | 'backgrounds'

export type BuyResult =
  | { success: true; item: ShopBoard | ShopPiece | ShopPowerup | ShopBackground; coinsRemaining: number }
  | { success: false; reason: 'invalid_category' | 'not_found' | 'insufficient_coins' | 'already_owned' }

export type GiftResult =
  | { success: true; item: ShopGift; coinsRemaining: number }
  | { success: false; reason: 'not_found' | 'insufficient_coins' }

/** Maximum fraction of an item's price refunded when selling it back at the bank. */
export const REFUND_RATE = 0.8

export type SellResult =
  | { success: true; item: ShopBoard | ShopPiece | ShopPowerup | ShopBackground; refund: number; coinsRemaining: number }
  | {
      success: false
      reason:
        | 'invalid_category'
        | 'not_found'
        | 'not_owned'
        | 'equipped'
        | 'not_sellable'
    }

export type RelationshipLevel = { name: string; icon: string; color: string }

export const SHOP_ITEMS: ShopItems = {
  boards: [
    { id: 'theme-cyber', name: 'Midnight', price: 0, description: 'Dark navy/purple gradient', preview: ['#1a1a2e', '#0f3460'] },
    { id: 'theme-dark', name: 'Shadow', price: 0, description: 'Flat dark minimal', preview: ['#2a2a3a', '#1a1a2a'] },
    { id: 'theme-rose', name: 'Rose', price: 900, description: 'Dark dusty rose glow', preview: ['#2a1a20', '#3d1f2a'] },
    { id: 'theme-neon', name: 'Neon City', price: 800, description: 'Bright neon green/cyan squares', preview: ['#0a2a2a', '#003333'] },
    { id: 'theme-arctic', name: 'Arctic', price: 1000, description: 'Ice blue/white frosted', preview: ['#1a2a3a', '#0a1a2a'] },
    { id: 'theme-inferno', name: 'Inferno', price: 1200, description: 'Red/orange fire gradient', preview: ['#2a0a0a', '#3a1500'] },
    { id: 'theme-matrix', name: 'Matrix', price: 1500, description: 'Green-on-black code aesthetic', preview: ['#0a0a0a', '#001a00'] },
    { id: 'theme-royal', name: 'Royal', price: 2000, description: 'Gold/marble ornate', preview: ['#2a2a1a', '#1a1a0a'] },
  ],
  pieces: [
    { id: 'pixel', name: 'Pixel', price: 0, description: 'Retro pixel art style' },
    { id: 'alpha', name: 'Alpha', price: 1000, description: 'Clean modern design' },
    { id: 'merida', name: 'Merida', price: 1200, description: 'Classic tournament style' },
    { id: 'tatiana', name: 'Tatiana', price: 1400, description: 'Elegant classic Russian' },
    { id: 'cburnett', name: 'CBurnett', price: 1500, description: 'Detailed tournament style' },
    { id: 'maestro', name: 'Maestro', price: 1800, description: 'Artistic stylized' },
  ],
  powerups: [
    { id: 'legalMoves', name: 'Legal Move Highlights', price: 1500, qty: 1, description: 'Highlights legal moves when you pick up a piece', icon: '\u2316' },
    { id: 'threatAlert', name: 'Threat Alert', price: 1800, qty: 1, description: 'Warns when your pieces are attacked or checkmate is threatened', icon: '\u26A0' },
    { id: 'evalBar', name: 'Eval Bar', price: 2000, qty: 1, description: 'Shows the position evaluation bar', icon: '\u{1F4CA}' },
    { id: 'undoPack', name: 'Undo Pack', price: 2500, qty: 1, description: 'Grants unlimited undo takebacks', icon: '\u21A9' },
    { id: 'bestMove', name: 'Best Move Hint', price: 3000, qty: 1, description: 'Reveals the engine\u2019s best move on demand', icon: '\u{1F4A1}' },
  ],
  backgrounds: [
    { id: 'bg-basic', name: 'Basic', price: 0, description: 'A plain static grid — no frills', preview: ['#0a0a14', '#555555'], tier: 'normal' },
    { id: 'bg-nexus', name: 'Nexus', price: 0, description: 'Cyber grid with pulses, sparks & twinkles', preview: ['#0a0a14', '#00ffff'], tier: 'divine' },
    { id: 'bg-phantom', name: 'Spectra', price: 8000, description: 'Hidden chess pieces revealed by the wave', preview: ['#0a0a14', '#ba55dc'], tier: 'divine' },
    { id: 'bg-arcade', name: 'Arcade', price: 20000, description: 'Retro CRT cabinet — neon pixels & scanlines', preview: ['#0a0414', '#ff2d95'], tier: 'divine' },
  ],
  gifts: [
    { id: 'coffee', name: 'Coffee', price: 100, affinity: 3, icon: '☕', description: 'A warm cup of comfort', universal: false },
    { id: 'rose', name: 'Rose', price: 300, affinity: 6, icon: '\u{1F339}', description: 'A symbol of affection', universal: false },
    { id: 'watch', name: 'Luxury Watch', price: 800, affinity: 12, icon: '⌚', description: 'Time is precious', universal: false },
    { id: 'giftbox', name: 'Gift Box', price: 1500, affinity: 20, icon: '\u{1F381}', description: 'What could be inside?', universal: false },
    { id: 'diamond', name: 'Diamond Ring', price: 2500, affinity: 30, icon: '\u{1F48E}', description: 'For someone truly special', universal: false },
    { id: 'car', name: 'Luxury Car', price: 15000, affinity: 75, icon: '\u{1F3CE}', description: '+15 affinity for ALL AI opponents', universal: true },
    { id: 'cruise', name: 'Cruise Ship', price: 25000, affinity: 100, icon: '\u{1F6A2}', description: '+20 affinity for ALL AI opponents', universal: true },
    { id: 'island', name: 'Private Island', price: 50000, affinity: 125, icon: '\u{1F3D6}', description: '+25 affinity for ALL AI opponents', universal: true },
  ],
}

const DEFAULT_INVENTORY: Inventory = {
  equippedBoard: 'theme-cyber',
  equippedPieces: 'pixel',
  equippedBackground: 'bg-nexus',
  boards: ['theme-cyber', 'theme-dark'],
  pieces: ['pixel'],
  backgrounds: ['bg-nexus', 'bg-basic'],
  powerups: { bestMove: 0, evalBar: 0, legalMoves: 0, undoPack: 0, threatAlert: 0 },
}

function hasWindow(): boolean {
  return typeof window !== 'undefined'
}

export function getCoins(): number {
  if (!hasWindow()) return 0
  try {
    return parseInt(localStorage.getItem(STORAGE_KEYS.COINS) ?? '0', 10) || 0
  } catch {
    return 0
  }
}

function saveCoins(amount: number): void {
  if (!hasWindow()) return
  try {
    localStorage.setItem(STORAGE_KEYS.COINS, JSON.stringify(amount))
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(HYPERGRID_COINS_CHANGED, { detail: amount }))
  } catch {
    // ignore quota errors
  }
}

export function addCoins(amount: number): number {
  const next = getCoins() + amount
  saveCoins(next)
  return next
}

export function getInventory(): Inventory {
  if (!hasWindow()) return structuredClone(DEFAULT_INVENTORY)
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INVENTORY)
    if (!raw) return structuredClone(DEFAULT_INVENTORY)
    const inv = JSON.parse(raw) as Partial<Inventory>
    const def = structuredClone(DEFAULT_INVENTORY)
    return { ...def, ...inv, powerups: { ...def.powerups, ...(inv.powerups ?? {}) } }
  } catch {
    return structuredClone(DEFAULT_INVENTORY)
  }
}

function saveInventory(inv: Inventory): void {
  if (!hasWindow()) return
  try {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inv))
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(HYPERGRID_INVENTORY_CHANGED, { detail: inv }))
  } catch {
    // ignore
  }
}

export function owns(category: Category, id: string): boolean {
  const inv = getInventory()
  if (category === 'boards') return inv.boards.includes(id)
  if (category === 'pieces') return inv.pieces.includes(id)
  if (category === 'backgrounds') return inv.backgrounds.includes(id)
  return false
}

/** True when the active BofH card is the unlimited Aesculapius credit card. */
export function hasUnlimitedCard(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FINANCE_PROFILE)
    if (!raw) return false
    const p = JSON.parse(raw) as { openedCard?: string | null }
    return p?.openedCard === 'aesculapius'
  } catch {
    return false
  }
}

export function buy(category: Category, id: string): BuyResult {
  const items =
    category === 'boards' ? SHOP_ITEMS.boards : category === 'pieces' ? SHOP_ITEMS.pieces : category === 'powerups' ? SHOP_ITEMS.powerups : category === 'backgrounds' ? SHOP_ITEMS.backgrounds : null
  if (!items) return { success: false, reason: 'invalid_category' }
  const item = items.find((i) => i.id === id)
  if (!item) return { success: false, reason: 'not_found' }
  const unlimited = hasUnlimitedCard()
  let coins = getCoins()
  if (!unlimited && coins < item.price) return { success: false, reason: 'insufficient_coins' }
  const inv = getInventory()
  if (category === 'boards') {
    if (inv.boards.includes(id)) return { success: false, reason: 'already_owned' }
    if (!unlimited) coins = addCoins(-item.price)
    inv.boards.push(id)
  } else if (category === 'pieces') {
    if (inv.pieces.includes(id)) return { success: false, reason: 'already_owned' }
    if (!unlimited) coins = addCoins(-item.price)
    inv.pieces.push(id)
  } else if (category === 'backgrounds') {
    if (inv.backgrounds.includes(id)) return { success: false, reason: 'already_owned' }
    if (!unlimited) coins = addCoins(-item.price)
    inv.backgrounds.push(id)
  } else if (category === 'powerups') {
    const pu = item as ShopPowerup
    if ((inv.powerups[id] ?? 0) > 0) return { success: false, reason: 'already_owned' }
    if (!unlimited) coins = addCoins(-pu.price)
    inv.powerups[id] = (inv.powerups[id] ?? 0) + pu.qty
  }
  saveInventory(inv)
  return { success: true, item, coinsRemaining: coins }
}

/** Find a shop item definition by category + id (boards/pieces/powerups/backgrounds). */
export function findShopItem(
  category: Category,
  id: string
): ShopBoard | ShopPiece | ShopPowerup | ShopBackground | null {
  const items =
    category === 'boards'
      ? SHOP_ITEMS.boards
      : category === 'pieces'
        ? SHOP_ITEMS.pieces
        : category === 'powerups'
          ? SHOP_ITEMS.powerups
          : category === 'backgrounds'
            ? SHOP_ITEMS.backgrounds
            : null
  if (!items) return null
  return items.find((i) => i.id === id) ?? null
}

/** Coins refunded when selling an item back (80% of price, rounded). Free items refund 0. */
export function getRefundValue(category: Category, id: string): number {
  const item = findShopItem(category, id)
  if (!item || item.price <= 0) return 0
  return Math.round(item.price * REFUND_RATE)
}

/**
 * Sell an owned shop item back to the bank for `REFUND_RATE` of its price.
 * Refuses free/default items, currently-equipped items, and items pledged as
 * loan collateral (caller is expected to skip pledged items in the UI).
 */
export function sellItem(category: Category, id: string): SellResult {
  const item = findShopItem(category, id)
  if (!item) return { success: false, reason: 'not_found' }
  if (item.price <= 0) return { success: false, reason: 'not_sellable' }

  const inv = getInventory()
  if (category === 'boards') {
    if (!inv.boards.includes(id)) return { success: false, reason: 'not_owned' }
    if (inv.equippedBoard === id) return { success: false, reason: 'equipped' }
    inv.boards = inv.boards.filter((b) => b !== id)
  } else if (category === 'pieces') {
    if (!inv.pieces.includes(id)) return { success: false, reason: 'not_owned' }
    if (inv.equippedPieces === id) return { success: false, reason: 'equipped' }
    inv.pieces = inv.pieces.filter((p) => p !== id)
  } else if (category === 'backgrounds') {
    if (!inv.backgrounds.includes(id)) return { success: false, reason: 'not_owned' }
    if (inv.equippedBackground === id) return { success: false, reason: 'equipped' }
    inv.backgrounds = inv.backgrounds.filter((b) => b !== id)
  } else if (category === 'powerups') {
    if ((inv.powerups[id] ?? 0) <= 0) return { success: false, reason: 'not_owned' }
    inv.powerups[id] = Math.max(0, (inv.powerups[id] ?? 0) - 1)
  } else {
    return { success: false, reason: 'invalid_category' }
  }

  const refund = Math.round(item.price * REFUND_RATE)
  const coinsRemaining = addCoins(refund)
  saveInventory(inv)
  return { success: true, item, refund, coinsRemaining }
}

export function equip(category: 'boards' | 'pieces' | 'backgrounds', id: string): boolean {
  const inv = getInventory()
  if (category === 'boards') {
    if (!inv.boards.includes(id)) return false
    inv.equippedBoard = id
  } else if (category === 'pieces') {
    if (!inv.pieces.includes(id)) return false
    inv.equippedPieces = id
  } else {
    if (!inv.backgrounds.includes(id)) return false
    inv.equippedBackground = id
  }
  saveInventory(inv)
  return true
}

export function usePowerup(id: string): boolean {
  const inv = getInventory()
  if (!inv.powerups[id] || inv.powerups[id] <= 0) return false
  inv.powerups[id]--
  saveInventory(inv)
  return true
}

export function getEquippedBoard(): string {
  return getInventory().equippedBoard || 'theme-cyber'
}

export function getEquippedPieces(): string {
  return getInventory().equippedPieces || 'pixel'
}

export function getEquippedBackground(): string {
  const inv = getInventory()
  return inv.equippedBackground || 'bg-nexus'
}

export function getPieceUrl(piece: string): string {
  return `https://lichess1.org/assets/piece/${getEquippedPieces()}/${piece}.svg`
}

export function getPowerupCount(id: string): number {
  return getInventory().powerups[id] ?? 0
}

export function awardCoins(amount: number, _reason?: string): number {
  return addCoins(amount)
}

export function getAffinity(aiId: string): number {
  if (!hasWindow()) return 0
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AFFINITY)
    if (!raw) return 0
    const data = JSON.parse(raw) as Record<string, number>
    return Number(data[aiId]) || 0
  } catch {
    return 0
  }
}

export function addAffinity(aiId: string, amount: number): number {
  if (!hasWindow()) return 0
  let data: Record<string, number> = {}
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AFFINITY)
    if (raw) data = JSON.parse(raw)
  } catch {
    // ignore
  }
  const current = Number(data[aiId]) || 0
  data[aiId] = Math.round((current + amount) * 100) / 100
  try {
    localStorage.setItem(STORAGE_KEYS.AFFINITY, JSON.stringify(data))
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(HYPERGRID_AFFINITY_CHANGED, { detail: { aiId, newAffinity: data[aiId] } }))
  } catch {
    // ignore
  }
  return data[aiId]
}

export function getRelationshipLevel(points: number): RelationshipLevel {
  if (points >= 300) return { name: 'Soulmate', icon: '\u{1F496}', color: '#ff69b4' }
  if (points >= 150) return { name: 'Close Friend', icon: '\u{1F91D}', color: '#ffd700' }
  if (points >= 50) return { name: 'Friend', icon: '\u{1F44B}', color: '#4ecdc4' }
  if (points >= 10) return { name: 'Acquaintance', icon: '\u{1F60A}', color: '#88cc88' }
  return { name: 'Stranger', icon: '\u{1F464}', color: '#888' }
}

export function buyGift(id: string): GiftResult {
  const item = SHOP_ITEMS.gifts.find((g) => g.id === id)
  if (!item) return { success: false, reason: 'not_found' }
  const unlimited = hasUnlimitedCard()
  if (!unlimited && getCoins() < item.price) return { success: false, reason: 'insufficient_coins' }
  const coinsRemaining = unlimited ? getCoins() : addCoins(-item.price)
  return { success: true, item, coinsRemaining }
}

export function applyGift(
  giftId: string,
  aiId: string
): { success: true; aiId: string; affinity: number; newAffinity?: number } | { success: false } {
  const item = SHOP_ITEMS.gifts.find((g) => g.id === giftId)
  if (!item) return { success: false }
  if (item.universal) {
    // The stored `affinity` is a total split across the original 5-AI roster,
    // so per-AI = affinity / 5 (matches the "+N for ALL" item descriptions).
    // SPECTRE ('6') is a non-combatant who also benefits from universal gifts.
    const keys: string[] = ['1', '2', '3', '4', '5', '6']
    const perAi = Math.round((item.affinity / 5) * 100) / 100
    for (const k of keys) addAffinity(k, perAi)
    return { success: true, aiId: 'all', affinity: item.affinity }
  }
  const newAffinity = addAffinity(aiId, item.affinity)
  return { success: true, aiId, affinity: item.affinity, newAffinity }
}

export type DonateResult =
  | { success: true; coinsRemaining: number }
  | { success: false; reason: 'invalid_amount' | 'insufficient_coins' }

/** Donate any amount of coins to charity. No upper cap beyond the holder's balance. */
export function donate(amount: number): DonateResult {
  if (!Number.isFinite(amount) || amount <= 0) return { success: false, reason: 'invalid_amount' }
  if (getCoins() < amount) return { success: false, reason: 'insufficient_coins' }
  const coinsRemaining = addCoins(-amount)
  return { success: true, coinsRemaining }
}

export function getItems(): ShopItems {
  return SHOP_ITEMS
}

export function clearCoinsAndInventory(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEYS.COINS)
    localStorage.removeItem(STORAGE_KEYS.INVENTORY)
    window.dispatchEvent(new CustomEvent(HYPERGRID_COINS_CHANGED, { detail: 0 }))
    window.dispatchEvent(new CustomEvent(HYPERGRID_INVENTORY_CHANGED, { detail: null }))
  } catch {}
}
