export type GiftRarity = 'epic' | 'legendary' | 'mythic'

export type GiftScreenFlash = { color: string; opacity: number; duration: number }

export type GiftEffectConfig = {
  id: string
  name: string
  icon: string
  rarity: GiftRarity
  rarityLabel: string
  rarityColor: string
  tier: number
  particleCount: number
  colors: string[]
  duration: number
  displayTime: number
  shakeIntensity: number
  shakeDuration: number
  screenFlash: GiftScreenFlash
  has3DModel: boolean
  modelType: 'car' | 'cruise' | 'island'
}

export const GIFT_EFFECTS: Record<string, GiftEffectConfig> = {
  car: {
    id: 'car',
    name: 'Luxury Car',
    icon: '🏎️',
    rarity: 'epic',
    rarityLabel: 'EPIC',
    rarityColor: '#FFD700',
    tier: 3,
    particleCount: 200,
    colors: ['#FFD700', '#FF8C00', '#FF4500', '#FF6347', '#FFA500'],
    duration: 4500,
    displayTime: 3000,
    shakeIntensity: 4,
    shakeDuration: 500,
    screenFlash: { color: '#FFD700', opacity: 0.3, duration: 600 },
    has3DModel: false,
    modelType: 'car',
  },
  cruise: {
    id: 'cruise',
    name: 'Cruise Ship',
    icon: '🚢',
    rarity: 'legendary',
    rarityLabel: 'LEGENDARY',
    rarityColor: '#1E90FF',
    tier: 4,
    particleCount: 350,
    colors: ['#00BFFF', '#1E90FF', '#4169E1', '#87CEEB', '#00CED1', '#FFFFFF'],
    duration: 6500,
    displayTime: 4000,
    shakeIntensity: 7,
    shakeDuration: 700,
    screenFlash: { color: '#1E90FF', opacity: 0.35, duration: 800 },
    has3DModel: false,
    modelType: 'cruise',
  },
  island: {
    id: 'island',
    name: 'Private Island',
    icon: '🏝️',
    rarity: 'mythic',
    rarityLabel: 'MYTHIC',
    rarityColor: '#FF69B4',
    tier: 5,
    particleCount: 600,
    colors: ['#00FF7F', '#FFD700', '#FFFFFF', '#FF69B4', '#00BFFF', '#FF4500', '#9370DB', '#7CFC00', '#FFD1DC', '#87CEFA'],
    duration: 9000,
    displayTime: 5000,
    shakeIntensity: 12,
    shakeDuration: 1000,
    screenFlash: { color: '#FFFFFF', opacity: 0.6, duration: 1200 },
    has3DModel: false,
    modelType: 'island',
  },
}

export const GIFT_PARTICLE_MAX = 2000
export const GIFT_COMBO_TIMEOUT = 3000
