var GIFT_EFFECTS = {
  car: {
    id: 'car',
    name: 'Luxury Car',
    icon: '\uD83C\uDFCE\uFE0F',
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
    specialEffect: 'fire',
    has3DModel: true,
    modelType: 'car',
    soundTrigger: 'gift-epic'
  },
  cruise: {
    id: 'cruise',
    name: 'Cruise Ship',
    icon: '\uD83D\uDEA2',
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
    specialEffect: 'ocean',
    has3DModel: true,
    modelType: 'cruise',
    soundTrigger: 'gift-legendary'
  },
  island: {
    id: 'island',
    name: 'Private Island',
    icon: '\uD83C\uDFD6\uFE0F',
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
    specialEffect: 'island',
    has3DModel: true,
    modelType: 'island',
    soundTrigger: 'gift-mythic'
  }
};

var GIFT_COMBO_THRESHOLDS = {
  10: { label: 'COMBO x10', bonusParticles: 40, color: '#FFD700' },
  30: { label: 'COMBO x30', bonusParticles: 80, color: '#FF4500' },
  50: { label: 'COMBO x50', bonusParticles: 150, color: '#FF69B4', upgradeRarity: true },
  100: { label: 'MEGA COMBO x100', bonusParticles: 300, color: '#FFFFFF' }
};

var GIFT_PARTICLE_MAX = 2000;
var GIFT_COMBO_TIMEOUT = 3000;
var GIFT_MAX_CONCURRENT = 3;
