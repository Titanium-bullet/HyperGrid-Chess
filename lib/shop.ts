import { STORAGE_KEYS } from './storage-keys'
import { HYPERGRID_COINS_CHANGED, HYPERGRID_INVENTORY_CHANGED, HYPERGRID_AFFINITY_CHANGED } from '@/lib/events'

export type ShopBoard = { id: string; name: string; price: number; description: string; preview: [string, string] }
export type ShopPiece = { id: string; name: string; price: number; description: string }
export type ShopPowerup = { id: string; name: string; price: number; qty: number; description: string; icon: string }
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
  gifts: ShopGift[]
}

export type Inventory = {
  equippedBoard: string
  equippedPieces: string
  boards: string[]
  pieces: string[]
  powerups: Record<string, number>
}

export type Category = 'boards' | 'pieces' | 'powerups'

export type BuyResult =
  | { success: true; item: ShopBoard | ShopPiece | ShopPowerup; coinsRemaining: number }
  | { success: false; reason: 'invalid_category' | 'not_found' | 'insufficient_coins' | 'already_owned' }

export type GiftResult =
  | { success: true; item: ShopGift; coinsRemaining: number }
  | { success: false; reason: 'not_found' | 'insufficient_coins' }

export type RelationshipLevel = { name: string; icon: string; color: string }

export const SHOP_ITEMS: ShopItems = {
  boards: [
    { id: 'theme-cyber', name: 'Midnight', price: 0, description: 'Dark navy/purple gradient', preview: ['#1a1a2e', '#0f3460'] },
    { id: 'theme-dark', name: 'Shadow', price: 0, description: 'Flat dark minimal', preview: ['#2a2a3a', '#1a1a2a'] },
    { id: 'theme-neon', name: 'Neon City', price: 0, description: 'Bright neon green/cyan squares', preview: ['#0a2a2a', '#003333'] },
    { id: 'theme-inferno', name: 'Inferno', price: 0, description: 'Red/orange fire gradient', preview: ['#2a0a0a', '#3a1500'] },
    { id: 'theme-arctic', name: 'Arctic', price: 0, description: 'Ice blue/white frosted', preview: ['#1a2a3a', '#0a1a2a'] },
    { id: 'theme-royal', name: 'Royal', price: 0, description: 'Gold/marble ornate', preview: ['#2a2a1a', '#1a1a0a'] },
    { id: 'theme-matrix', name: 'Matrix', price: 0, description: 'Green-on-black code aesthetic', preview: ['#0a0a0a', '#001a00'] },
    { id: 'theme-rose', name: 'Rose', price: 0, description: 'Dark dusty rose glow', preview: ['#2a1a20', '#3d1f2a'] },
  ],
  pieces: [
    { id: 'pixel', name: 'Pixel', price: 0, description: 'Retro pixel art style' },
    { id: 'alpha', name: 'Alpha', price: 0, description: 'Clean modern design' },
    { id: 'cburnett', name: 'CBurnett', price: 0, description: 'Detailed tournament style' },
    { id: 'maestro', name: 'Maestro', price: 0, description: 'Artistic stylized' },
    { id: 'merida', name: 'Merida', price: 0, description: 'Classic tournament style' },
    { id: 'tatiana', name: 'Tatiana', price: 0, description: 'Elegant classic Russian' },
  ],
  powerups: [
    { id: 'bestMove', name: 'Best Move Hint', price: 0, qty: 3, description: "Highlights the engine's top move", icon: '\u{1F4A1}' },
    { id: 'evalBar', name: 'Eval Bar', price: 0, qty: 1, description: 'Shows position advantage bar', icon: '\u{1F4CA}' },
    { id: 'legalMoves', name: 'Legal Move Highlights', price: 0, qty: 5, description: 'Highlights all legal moves on select', icon: '⭐' },
    { id: 'undoPack', name: 'Undo Pack', price: 0, qty: 5, description: 'Extra undo uses', icon: '↩' },
  ],
  gifts: [
    { id: 'coffee', name: 'Coffee', price: 0, affinity: 3, icon: '☕', description: 'A warm cup of comfort', universal: false },
    { id: 'rose', name: 'Rose', price: 0, affinity: 6, icon: '\u{1F339}', description: 'A symbol of affection', universal: false },
    { id: 'watch', name: 'Luxury Watch', price: 0, affinity: 12, icon: '⌚', description: 'Time is precious', universal: false },
    { id: 'giftbox', name: 'Gift Box', price: 0, affinity: 20, icon: '\u{1F381}', description: 'What could be inside?', universal: false },
    { id: 'diamond', name: 'Diamond Ring', price: 0, affinity: 30, icon: '\u{1F48E}', description: 'For someone truly special', universal: false },
    { id: 'car', name: 'Luxury Car', price: 0, affinity: 75, icon: '\u{1F3CE}', description: '+15 affinity for ALL AI opponents', universal: true },
    { id: 'cruise', name: 'Cruise Ship', price: 0, affinity: 100, icon: '\u{1F6A2}', description: '+20 affinity for ALL AI opponents', universal: true },
    { id: 'island', name: 'Private Island', price: 0, affinity: 125, icon: '\u{1F3D6}', description: '+25 affinity for ALL AI opponents', universal: true },
  ],
}

const DEFAULT_INVENTORY: Inventory = {
  equippedBoard: 'theme-cyber',
  equippedPieces: 'pixel',
  boards: ['theme-cyber', 'theme-dark'],
  pieces: ['pixel'],
  powerups: { bestMove: 0, evalBar: 0, legalMoves: 0, undoPack: 0 },
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
  return false
}

export function buy(category: Category, id: string): BuyResult {
  const items =
    category === 'boards' ? SHOP_ITEMS.boards : category === 'pieces' ? SHOP_ITEMS.pieces : category === 'powerups' ? SHOP_ITEMS.powerups : null
  if (!items) return { success: false, reason: 'invalid_category' }
  const item = items.find((i) => i.id === id)
  if (!item) return { success: false, reason: 'not_found' }
  let coins = getCoins()
  if (coins < item.price) return { success: false, reason: 'insufficient_coins' }
  const inv = getInventory()
  if (category === 'boards') {
    if (inv.boards.includes(id)) return { success: false, reason: 'already_owned' }
    coins = addCoins(-item.price)
    inv.boards.push(id)
  } else if (category === 'pieces') {
    if (inv.pieces.includes(id)) return { success: false, reason: 'already_owned' }
    coins = addCoins(-item.price)
    inv.pieces.push(id)
  } else if (category === 'powerups') {
    const pu = item as ShopPowerup
    coins = addCoins(-pu.price)
    inv.powerups[id] = (inv.powerups[id] ?? 0) + pu.qty
  }
  saveInventory(inv)
  return { success: true, item, coinsRemaining: coins }
}

export function equip(category: 'boards' | 'pieces', id: string): boolean {
  const inv = getInventory()
  if (category === 'boards') {
    if (!inv.boards.includes(id)) return false
    inv.equippedBoard = id
  } else {
    if (!inv.pieces.includes(id)) return false
    inv.equippedPieces = id
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
  if (getCoins() < item.price) return { success: false, reason: 'insufficient_coins' }
  const coinsRemaining = addCoins(-item.price)
  return { success: true, item, coinsRemaining }
}

export function applyGift(
  giftId: string,
  aiId: string
): { success: true; aiId: string; affinity: number; newAffinity?: number } | { success: false } {
  const item = SHOP_ITEMS.gifts.find((g) => g.id === giftId)
  if (!item) return { success: false }
  if (item.universal) {
    const keys: string[] = ['1', '2', '3', '4', '5']
    const perAi = Math.round((item.affinity / keys.length) * 100) / 100
    for (const k of keys) addAffinity(k, perAi)
    return { success: true, aiId: 'all', affinity: item.affinity }
  }
  const newAffinity = addAffinity(aiId, item.affinity)
  return { success: true, aiId, affinity: item.affinity, newAffinity }
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
