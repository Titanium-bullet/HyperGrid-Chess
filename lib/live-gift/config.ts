export type GiftRarity = 'epic' | 'legendary' | 'mythic'

export type GiftEffectConfig = {
  id: string
  name: string
  icon: string
  rarity: GiftRarity
  rarityLabel: string
  rarityColor: string
  tier: number
  duration: number
  video: string
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
    duration: 4500,
    video: '/videos/gifts/car.mp4',
  },
  cruise: {
    id: 'cruise',
    name: 'Cruise Ship',
    icon: '🚢',
    rarity: 'legendary',
    rarityLabel: 'LEGENDARY',
    rarityColor: '#1E90FF',
    tier: 4,
    duration: 6500,
    video: '/videos/gifts/cruise.mp4',
  },
  island: {
    id: 'island',
    name: 'Private Island',
    icon: '🏝️',
    rarity: 'mythic',
    rarityLabel: 'MYTHIC',
    rarityColor: '#FF69B4',
    tier: 5,
    duration: 9000,
    video: '/videos/gifts/island.mp4',
  },
}

export const GIFT_COMBO_TIMEOUT = 3000
