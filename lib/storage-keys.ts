export const STORAGE_KEYS = {
  COINS: 'hypergrid_coins',
  INVENTORY: 'hypergrid_inventory',
  AFFINITY: 'hypergrid_affinity',
  STATS: 'hypergrid_stats',
  ACHIEVEMENTS: 'hypergrid_achievements',
  SOLVED: 'hypergrid_solved',
  SOLVED_NO_HINT: 'hypergrid_solved_no_hint',
  TRIAL_UNLOCKED: 'hypergrid_trial_unlocked',
  SOUND: 'hypergrid_sound',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]
