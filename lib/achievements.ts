import { STORAGE_KEYS } from './storage-keys'
import { awardCoins } from './shop'
import { HYPERGRID_ACHIEVEMENT_TOAST, type AchievementToastDetail } from '@/lib/events'

export type Tier = 'Bronze' | 'Silver' | 'Gold'
export type Category = 'victories' | 'puzzles' | 'trial' | 'moves' | 'challenges' | 'stats'

export type Stats = {
  gamesPlayed: number
  gamesWon: number
  gamesLost: number
  gamesDrawn: number
  aiWins: Record<'1' | '2' | '3' | '4' | '5', number>
  pvpWins: { w: number; b: number }
  trialWins: number
  currentWinStreak: number
  bestWinStreak: number
  puzzlesSolved: number
  puzzlesSolvedNoHint: number
  totalMoves: number
  enPassants: number
  castles: number
  promotions: number
  queensCaptured: number
  gamesWonNoPieceLost: number
  fastestWinMoves: number
  totalPlayTimeSeconds: number
  aiWinsAsBlack?: number
  trialAttempts?: number
  gamesWonMaxLoss?: number
  easyPuzzlesSolved?: number
  mediumPuzzlesSolved?: number
  hardPuzzlesSolved?: number
  easyPuzzlesNoHint?: number
  mediumPuzzlesNoHint?: number
  hardPuzzlesNoHint?: number
}

export type AchievementDef = {
  name: string
  icon: string
  category: Category
  description: string
  tiers: [{ label: Tier; threshold: number }, { label: Tier; threshold: number }, { label: Tier; threshold: number }]
  getValue: (s: Stats) => number
  getExtra?: (s: Stats) => { goldMet: boolean }
  customCheck?: (s: Stats) => number
  customLevel?: (s: Stats) => 0 | 1 | 2 | 3
  bronzeOverride?: string
  silverOverride?: string
  goldOverride?: string
  formatValue?: (v: number) => string
}

export type AchievementState = { level: 0 | 1 | 2 | 3; unlockedAt: number[] }

export type TrackedMove = {
  san?: string
  flags?: string
  captured?: string
  promotion?: string
}

export type GameEndData = {
  mode?: 'ai' | 'pvp' | 'puzzle' | 'trial'
  difficulty?: '1' | '2' | '3' | '4' | '5'
  playerColor?: 'w' | 'b'
  winnerColor?: 'w' | 'b'
  moveCount?: number
  playerPiecesLost?: number
  playTime?: number
}

const DEFAULT_STATS: Stats = {
  gamesPlayed: 0,
  gamesWon: 0,
  gamesLost: 0,
  gamesDrawn: 0,
  aiWins: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
  pvpWins: { w: 0, b: 0 },
  trialWins: 0,
  currentWinStreak: 0,
  bestWinStreak: 0,
  puzzlesSolved: 0,
  puzzlesSolvedNoHint: 0,
  totalMoves: 0,
  enPassants: 0,
  castles: 0,
  promotions: 0,
  queensCaptured: 0,
  gamesWonNoPieceLost: 0,
  fastestWinMoves: 999,
  totalPlayTimeSeconds: 0,
}

export const ACHIEVEMENTS: Record<string, AchievementDef> = {
  first_blood: {
    name: 'First Blood',
    icon: '⚔',
    category: 'victories',
    description: 'Win games against AI',
    tiers: [
      { label: 'Bronze', threshold: 1 },
      { label: 'Silver', threshold: 5 },
      { label: 'Gold', threshold: 25 },
    ],
    getValue: (s) => s.gamesWon,
  },
  nova_slayer: {
    name: 'Nova Slayer',
    icon: '\u{1F31F}',
    category: 'victories',
    description: 'Defeat Nova (~600 ELO)',
    tiers: [
      { label: 'Bronze', threshold: 1 },
      { label: 'Silver', threshold: 3 },
      { label: 'Gold', threshold: 10 },
    ],
    getValue: (s) => s.aiWins['1'] || 0,
  },
  phantom_slayer: {
    name: 'Phantom Slayer',
    icon: '\u{1F47B}',
    category: 'victories',
    description: 'Defeat Phantom (~1400 ELO)',
    tiers: [
      { label: 'Bronze', threshold: 1 },
      { label: 'Silver', threshold: 3 },
      { label: 'Gold', threshold: 10 },
    ],
    getValue: (s) => s.aiWins['2'] || 0,
  },
  overlord_slayer: {
    name: 'Overlord Slayer',
    icon: '\u{1F451}',
    category: 'victories',
    description: 'Defeat Overlord (~1800 ELO)',
    tiers: [
      { label: 'Bronze', threshold: 1 },
      { label: 'Silver', threshold: 3 },
      { label: 'Gold', threshold: 10 },
    ],
    getValue: (s) => s.aiWins['3'] || 0,
  },
  hypergrid_slayer: {
    name: 'HyperGrid Slayer',
    icon: '\u{1F525}',
    category: 'victories',
    description: 'Defeat HyperGrid (3000+ ELO)',
    tiers: [
      { label: 'Bronze', threshold: 1 },
      { label: 'Silver', threshold: 3 },
      { label: 'Gold', threshold: 5 },
    ],
    getValue: (s) => s.aiWins['4'] || 0,
  },
  blind_slayer: {
    name: 'Blind Slayer',
    icon: '\u{1F441}',
    category: 'victories',
    description: 'Defeat Blind (~1000 ELO) in Blindfold Mode',
    tiers: [
      { label: 'Bronze', threshold: 1 },
      { label: 'Silver', threshold: 3 },
      { label: 'Gold', threshold: 10 },
    ],
    getValue: (s) => s.aiWins['5'] || 0,
  },
  rookie_solver: {
    name: 'Rookie Solver',
    icon: '\u{1F4A1}',
    category: 'puzzles',
    description: 'Solve Rookie (easy) puzzles',
    tiers: [
      { label: 'Bronze', threshold: 3 },
      { label: 'Silver', threshold: 10 },
      { label: 'Gold', threshold: 10 },
    ],
    getValue: (s) => s.easyPuzzlesSolved || 0,
    getExtra: (s) => ({ goldMet: (s.easyPuzzlesNoHint ?? 0) >= 10 }),
    goldOverride: 'Solve all 10 without hints',
  },
  tactician: {
    name: 'Tactician',
    icon: '\u{1F3AF}',
    category: 'puzzles',
    description: 'Solve Tactical (medium) puzzles',
    tiers: [
      { label: 'Bronze', threshold: 3 },
      { label: 'Silver', threshold: 10 },
      { label: 'Gold', threshold: 10 },
    ],
    getValue: (s) => s.mediumPuzzlesSolved || 0,
    getExtra: (s) => ({ goldMet: (s.mediumPuzzlesNoHint ?? 0) >= 10 }),
    goldOverride: 'Solve all 10 without hints',
  },
  mastermind: {
    name: 'Mastermind',
    icon: '\u{1F9E0}',
    category: 'puzzles',
    description: 'Solve Master (hard) puzzles',
    tiers: [
      { label: 'Bronze', threshold: 3 },
      { label: 'Silver', threshold: 10 },
      { label: 'Gold', threshold: 10 },
    ],
    getValue: (s) => s.hardPuzzlesSolved || 0,
    getExtra: (s) => ({ goldMet: (s.hardPuzzlesNoHint ?? 0) >= 10 }),
    goldOverride: 'Solve all 10 without hints',
  },
  puzzle_master: {
    name: 'Puzzle Master',
    icon: '\u{1F9E9}',
    category: 'puzzles',
    description: 'Solve puzzles in total',
    tiers: [
      { label: 'Bronze', threshold: 10 },
      { label: 'Silver', threshold: 20 },
      { label: 'Gold', threshold: 30 },
    ],
    getValue: (s) => s.puzzlesSolved,
  },
  spectre_challenger: {
    name: 'Spectre Challenger',
    icon: '\u{1F47E}',
    category: 'trial',
    description: 'Challenge SPECTRE in the Monster Trial',
    tiers: [
      { label: 'Bronze', threshold: 1 },
      { label: 'Silver', threshold: 1 },
      { label: 'Gold', threshold: 1 },
    ],
    getValue: (s) => s.trialAttempts || 0,
    silverOverride: 'Complete the trial',
    goldOverride: 'Defeat SPECTRE',
  },
  spectre_slayer: {
    name: 'Spectre Slayer',
    icon: '⚡',
    category: 'trial',
    description: 'Defeat SPECTRE in the Monster Trial',
    tiers: [
      { label: 'Bronze', threshold: 1 },
      { label: 'Silver', threshold: 3 },
      { label: 'Gold', threshold: 5 },
    ],
    getValue: (s) => s.trialWins,
  },
  en_passant: {
    name: 'En Passant',
    icon: '↔',
    category: 'moves',
    description: 'Perform en passant captures',
    tiers: [
      { label: 'Bronze', threshold: 1 },
      { label: 'Silver', threshold: 3 },
      { label: 'Gold', threshold: 10 },
    ],
    getValue: (s) => s.enPassants,
  },
  castle_master: {
    name: 'Castle Master',
    icon: '\u{1F3F0}',
    category: 'moves',
    description: 'Castle your king',
    tiers: [
      { label: 'Bronze', threshold: 1 },
      { label: 'Silver', threshold: 5 },
      { label: 'Gold', threshold: 20 },
    ],
    getValue: (s) => s.castles,
  },
  promotion_master: {
    name: 'Promotion Master',
    icon: '\u{1F451}',
    category: 'moves',
    description: 'Promote pawns',
    tiers: [
      { label: 'Bronze', threshold: 1 },
      { label: 'Silver', threshold: 3 },
      { label: 'Gold', threshold: 10 },
    ],
    getValue: (s) => s.promotions,
  },
  queen_hunter: {
    name: 'Queen Hunter',
    icon: '\u{1F5E1}',
    category: 'moves',
    description: 'Capture opponent queens',
    tiers: [
      { label: 'Bronze', threshold: 1 },
      { label: 'Silver', threshold: 3 },
      { label: 'Gold', threshold: 10 },
    ],
    getValue: (s) => s.queensCaptured,
  },
  speed_demon: {
    name: 'Speed Demon',
    icon: '⚡',
    category: 'challenges',
    description: 'Win a game in few moves',
    tiers: [
      { label: 'Bronze', threshold: 1 },
      { label: 'Silver', threshold: 1 },
      { label: 'Gold', threshold: 1 },
    ],
    getValue: (s) => (s.fastestWinMoves <= 30 ? 1 : 0),
    bronzeOverride: 'Win in under 30 moves',
    silverOverride: 'Win in under 20 moves',
    goldOverride: 'Win in under 15 moves',
    customCheck: (s) => (s.fastestWinMoves <= 30 ? 1 : 0),
    customLevel: (s) => {
      if (s.fastestWinMoves <= 15) return 3
      if (s.fastestWinMoves <= 20) return 2
      if (s.fastestWinMoves <= 30) return 1
      return 0
    },
  },
  iron_defense: {
    name: 'Iron Defense',
    icon: '\u{1F6E1}',
    category: 'challenges',
    description: 'Win without losing pieces',
    tiers: [
      { label: 'Bronze', threshold: 1 },
      { label: 'Silver', threshold: 1 },
      { label: 'Gold', threshold: 1 },
    ],
    getValue: (s) => (s.gamesWonNoPieceLost > 0 ? 1 : 0),
    bronzeOverride: 'Win losing 3 or fewer pieces',
    silverOverride: 'Win losing 1 or fewer pieces',
    goldOverride: 'Win losing no pieces',
    customCheck: (s) => ((s.gamesWonMaxLoss ?? 999) <= 3 ? 1 : 0),
    customLevel: (s) => {
      const loss = s.gamesWonMaxLoss ?? 999
      if (loss <= 0) return 3
      if (loss <= 1) return 2
      if (loss <= 3) return 1
      return 0
    },
  },
  on_fire: {
    name: 'On Fire',
    icon: '\u{1F525}',
    category: 'challenges',
    description: 'Build a win streak',
    tiers: [
      { label: 'Bronze', threshold: 2 },
      { label: 'Silver', threshold: 5 },
      { label: 'Gold', threshold: 10 },
    ],
    getValue: (s) => s.bestWinStreak,
  },
  dark_side: {
    name: 'Dark Side',
    icon: '\u{1F319}',
    category: 'challenges',
    description: 'Win games playing as Black',
    tiers: [
      { label: 'Bronze', threshold: 1 },
      { label: 'Silver', threshold: 3 },
      { label: 'Gold', threshold: 10 },
    ],
    getValue: (s) => (s.pvpWins.b || 0) + (s.aiWinsAsBlack || 0),
  },
  pvp_warrior: {
    name: 'PvP Warrior',
    icon: '\u{1F91D}',
    category: 'challenges',
    description: 'Win Two Player games',
    tiers: [
      { label: 'Bronze', threshold: 1 },
      { label: 'Silver', threshold: 5 },
      { label: 'Gold', threshold: 15 },
    ],
    getValue: (s) => (s.pvpWins.w || 0) + (s.pvpWins.b || 0),
  },
  dedicated: {
    name: 'Dedicated Player',
    icon: '⏳',
    category: 'stats',
    description: 'Play games',
    tiers: [
      { label: 'Bronze', threshold: 5 },
      { label: 'Silver', threshold: 25 },
      { label: 'Gold', threshold: 100 },
    ],
    getValue: (s) => s.gamesPlayed,
  },
  centurion: {
    name: 'Centurion',
    icon: '♟',
    category: 'stats',
    description: 'Make moves',
    tiers: [
      { label: 'Bronze', threshold: 50 },
      { label: 'Silver', threshold: 200 },
      { label: 'Gold', threshold: 1000 },
    ],
    getValue: (s) => s.totalMoves,
  },
  marathon: {
    name: 'Marathon',
    icon: '⏱',
    category: 'stats',
    description: 'Total time playing',
    tiers: [
      { label: 'Bronze', threshold: 600 },
      { label: 'Silver', threshold: 3600 },
      { label: 'Gold', threshold: 18000 },
    ],
    getValue: (s) => s.totalPlayTimeSeconds,
    formatValue: (v) => {
      if (v >= 3600) return `${Math.floor(v / 3600)}h ${Math.floor((v % 3600) / 60)}m`
      if (v >= 60) return `${Math.floor(v / 60)}m`
      return `${v}s`
    },
  },
  completionist: {
    name: 'Completionist',
    icon: '⭐',
    category: 'stats',
    description: 'Unlock all other achievements',
    tiers: [
      { label: 'Bronze', threshold: 50 },
      { label: 'Silver', threshold: 80 },
      { label: 'Gold', threshold: 100 },
    ],
    getValue: () => {
      const state = getState()
      const keys = Object.keys(ACHIEVEMENTS)
      let total = 0
      let unlocked = 0
      for (const id of keys) {
        if (id === 'completionist') continue
        total++
        if (state[id]?.level > 0) unlocked++
      }
      return total > 0 ? Math.round((unlocked / total) * 100) : 0
    },
  },
}

function hasWindow(): boolean {
  return typeof window !== 'undefined'
}

export function getDefinitions(): Record<string, AchievementDef> {
  return ACHIEVEMENTS
}

export function getStats(): Stats {
  if (!hasWindow()) return structuredClone(DEFAULT_STATS)
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATS)
    if (!raw) return structuredClone(DEFAULT_STATS)
    const parsed = JSON.parse(raw) as Partial<Stats>
    return { ...structuredClone(DEFAULT_STATS), ...parsed }
  } catch {
    return structuredClone(DEFAULT_STATS)
  }
}

export function saveStats(stats: Stats): void {
  if (!hasWindow()) return
  try {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats))
  } catch {
    // ignore
  }
}

export function getState(): Record<string, AchievementState> {
  if (!hasWindow()) return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, AchievementState>
  } catch {
    return {}
  }
}

export function saveState(state: Record<string, AchievementState>): void {
  if (!hasWindow()) return
  try {
    localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(state))
  } catch {
    // ignore
  }
}

export function enrichStatsWithPuzzles(stats: Stats): Stats {
  if (!hasWindow()) return stats
  let solvedIds: string[] = []
  let noHintIds: string[] = []
  try {
    solvedIds = JSON.parse(localStorage.getItem(STORAGE_KEYS.SOLVED) ?? '[]')
  } catch {
    // ignore
  }
  try {
    noHintIds = JSON.parse(localStorage.getItem(STORAGE_KEYS.SOLVED_NO_HINT) ?? '[]')
  } catch {
    // ignore
  }
  let easy = 0
  let medium = 0
  let hard = 0
  let easyNH = 0
  let mediumNH = 0
  let hardNH = 0
  for (const id of solvedIds) {
    const t = id.charAt(0)
    if (t === 'e') easy++
    else if (t === 'm') medium++
    else if (t === 'h') hard++
  }
  for (const id of noHintIds) {
    const t = id.charAt(0)
    if (t === 'e') easyNH++
    else if (t === 'm') mediumNH++
    else if (t === 'h') hardNH++
  }
  return {
    ...stats,
    easyPuzzlesSolved: easy,
    mediumPuzzlesSolved: medium,
    hardPuzzlesSolved: hard,
    easyPuzzlesNoHint: easyNH,
    mediumPuzzlesNoHint: mediumNH,
    hardPuzzlesNoHint: hardNH,
    puzzlesSolved: solvedIds.length,
  }
}

export function checkAchievements(): Array<{ id: string; level: number; def: AchievementDef; previousLevel: number }> {
  let stats = getStats()
  stats = enrichStatsWithPuzzles(stats)
  const state = getState()
  const newlyUnlocked: Array<{ id: string; level: number; def: AchievementDef; previousLevel: number }> = []

  for (const [id, def] of Object.entries(ACHIEVEMENTS)) {
    const current: AchievementState = state[id] ?? { level: 0, unlockedAt: [] }
    const previousLevel = current.level
    let newLevel: 0 | 1 | 2 | 3 = previousLevel
    if (def.customLevel) {
      const cl = def.customLevel(stats)
      if (cl > newLevel) newLevel = cl
    } else {
      const val = def.getValue(stats)
      for (let t = def.tiers.length - 1; t >= 0; t--) {
        let tierMet = false
        if (def.goldOverride && t === 2 && def.getExtra) {
          tierMet = def.getExtra(stats).goldMet
        } else {
          tierMet = val >= def.tiers[t].threshold
        }
        if (tierMet && t + 1 > newLevel) {
          newLevel = (t + 1) as 0 | 1 | 2 | 3
          break
        }
      }
    }
    while (current.unlockedAt.length < newLevel) current.unlockedAt.push(Date.now())
    current.level = newLevel
    state[id] = current
    if (newLevel > previousLevel) newlyUnlocked.push({ id, level: newLevel, def, previousLevel })
  }
  saveState(state)
  return newlyUnlocked
}

export function checkAndNotify(): void {
  const newly = checkAchievements()
  for (const n of newly) {
    const tierName = n.def.tiers[Math.min(n.level - 1, n.def.tiers.length - 1)].label
    showToast(n.def.name, tierName, n.def.icon)
    const reward = tierName === 'Bronze' ? 10 : tierName === 'Silver' ? 25 : tierName === 'Gold' ? 50 : 0
    if (reward > 0) awardCoins(reward)
  }
}

/**
 * Dispatches a `HYPERGRID_ACHIEVEMENT_TOAST` CustomEvent on `window` so
 * UI listeners (the global achievement-toast component) can render a
 * notification for a newly unlocked tier. The event's `detail` follows
 * the shared `AchievementToastDetail` shape: `{ name, tier, icon }`.
 * No-ops outside of a browser environment.
 */
export function showToast(name: string, tier: Tier, icon: string): void {
  if (!hasWindow()) return
  const detail: AchievementToastDetail = { name, tier, icon }
  const event = new CustomEvent<AchievementToastDetail>(HYPERGRID_ACHIEVEMENT_TOAST, { detail })
  window.dispatchEvent(event)
}

export function trackMove(move: TrackedMove): void {
  const stats = getStats()
  stats.totalMoves++
  if (move.san) {
    if (move.san.startsWith('O-O')) stats.castles++
    if (move.san === 'e.p.' || (move.flags && move.flags.includes('e'))) stats.enPassants++
  }
  if (move.captured === 'q') stats.queensCaptured++
  if (move.promotion) stats.promotions++
  saveStats(stats)
}

export function trackGameEnd(result: 'win' | 'loss' | 'draw', data?: GameEndData): void {
  const stats = getStats()
  stats.gamesPlayed++
  if (data?.playTime && data.playTime > 0) {
    stats.totalPlayTimeSeconds += data.playTime
  }
  if (result === 'win') {
    stats.gamesWon++
    stats.currentWinStreak++
    if (stats.currentWinStreak > stats.bestWinStreak) stats.bestWinStreak = stats.currentWinStreak
    if (data) {
      if (data.mode === 'ai' && data.difficulty) {
        stats.aiWins[data.difficulty] = (stats.aiWins[data.difficulty] ?? 0) + 1
      }
      if (data.mode === 'ai' && data.playerColor === 'b') {
        stats.aiWinsAsBlack = (stats.aiWinsAsBlack ?? 0) + 1
      }
      if (data.mode === 'pvp' && data.winnerColor) {
        stats.pvpWins[data.winnerColor] = (stats.pvpWins[data.winnerColor] ?? 0) + 1
      }
      if (data.mode === 'trial') {
        stats.trialWins = (stats.trialWins ?? 0) + 1
      }
      if (data.moveCount && data.moveCount < stats.fastestWinMoves) {
        stats.fastestWinMoves = data.moveCount
      }
      if (data.playerPiecesLost != null) {
        if (data.playerPiecesLost <= 0) {
          stats.gamesWonNoPieceLost = (stats.gamesWonNoPieceLost ?? 0) + 1
        }
        if (stats.gamesWonMaxLoss == null || data.playerPiecesLost < stats.gamesWonMaxLoss) {
          stats.gamesWonMaxLoss = data.playerPiecesLost
        }
      }
    }
  } else if (result === 'loss') {
    stats.gamesLost++
    stats.currentWinStreak = 0
  } else if (result === 'draw') {
    stats.gamesDrawn++
    stats.currentWinStreak = 0
  }
  if (data?.mode === 'trial') {
    stats.trialAttempts = (stats.trialAttempts ?? 0) + 1
  }
  saveStats(stats)
  checkAndNotify()
}

export function trackPuzzleSolved(puzzleId: string, usedHint: boolean): void {
  const stats = getStats()
  stats.puzzlesSolved = (stats.puzzlesSolved ?? 0) + 1
  if (!usedHint) stats.puzzlesSolvedNoHint = (stats.puzzlesSolvedNoHint ?? 0) + 1
  saveStats(stats)
  if (!usedHint && hasWindow()) {
    let noHintIds: string[] = []
    try {
      noHintIds = JSON.parse(localStorage.getItem(STORAGE_KEYS.SOLVED_NO_HINT) ?? '[]')
    } catch {
      // ignore
    }
    if (!noHintIds.includes(puzzleId)) {
      noHintIds.push(puzzleId)
      try {
        localStorage.setItem(STORAGE_KEYS.SOLVED_NO_HINT, JSON.stringify(noHintIds))
      } catch {
        // ignore
      }
    }
    awardCoins(3)
  }
  checkAndNotify()
}
