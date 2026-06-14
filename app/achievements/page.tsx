'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CyberCanvas } from '@/components/CyberCanvas'
import { ShopButton } from '@/components/ShopButton'
import {
  type AchievementDef,
  type AchievementState,
  type Category,
  type Stats,
  enrichStatsWithPuzzles,
  getDefinitions,
  getState,
  getStats,
} from '@/lib/achievements'
import { clearCoinsAndInventory } from '@/lib/shop'
import { STORAGE_KEYS } from '@/lib/storage-keys'
import styles from './page.module.css'

type FilterCategory = 'all' | Category

const FILTER_TABS: ReadonlyArray<{ id: FilterCategory; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'victories', label: 'Victories' },
  { id: 'puzzles', label: 'Puzzles' },
  { id: 'trial', label: 'Trial' },
  { id: 'moves', label: 'Moves' },
  { id: 'challenges', label: 'Challenges' },
  { id: 'stats', label: 'Stats' },
]

type StatItem = { value: string | number; label: string }

function formatPlayTime(seconds: number): string {
  if (seconds >= 3600) {
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }
  if (seconds >= 60) {
    return `${Math.floor(seconds / 60)}m`
  }
  return `${seconds}s`
}

type AchievementRender = {
  id: string
  def: AchievementDef
  level: 0 | 1 | 2 | 3
  tierFilled: [boolean, boolean, boolean]
  progressPct: number
  nextDesc: string
  fillClass: string
}

function buildAchievementRenders(
  defs: Record<string, AchievementDef>,
  stats: Stats,
  state: Record<string, AchievementState>,
): AchievementRender[] {
  const out: AchievementRender[] = []
  for (const id of Object.keys(defs)) {
    const def = defs[id]
    const aState = state[id] ?? { level: 0, unlockedAt: [] }
    const level = aState.level ?? 0

    let progressPct = 0
    let nextDesc = ''
    let fillClass = ''

    if (level === 0) {
      const thresh = def.tiers[0].threshold
      const curVal = def.getValue(stats)
      progressPct = Math.min(100, Math.round((curVal / thresh) * 100))
      nextDesc = def.bronzeOverride ?? `${thresh} to unlock Bronze`
      fillClass = 'bronzeFill'
    } else if (level === 1) {
      const thresh2 = def.tiers[1].threshold
      const curVal2 = def.getValue(stats)
      if (def.silverOverride) {
        progressPct = 0
        nextDesc = def.silverOverride
      } else {
        progressPct = Math.min(100, Math.round((curVal2 / thresh2) * 100))
        nextDesc = `${thresh2} for Silver`
      }
      fillClass = 'silverFill'
    } else if (level === 2) {
      if (def.goldOverride) {
        const extraMet = def.getExtra ? def.getExtra(stats).goldMet : false
        progressPct = extraMet ? 100 : 0
        nextDesc = def.goldOverride
      } else {
        const thresh3 = def.tiers[2].threshold
        const curVal3 = def.getValue(stats)
        progressPct = Math.min(100, Math.round((curVal3 / thresh3) * 100))
        nextDesc = `${thresh3} for Gold`
      }
      fillClass = 'goldFill'
    } else {
      progressPct = 100
      nextDesc = 'Completed!'
      fillClass = 'goldFill'
    }

    out.push({
      id,
      def,
      level,
      tierFilled: [level > 0, level > 1, level > 2],
      progressPct,
      nextDesc,
      fillClass,
    })
  }
  return out
}

export default function AchievementsPage() {
  const [hydrated, setHydrated] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [state, setState] = useState<Record<string, AchievementState>>({})
  const [filter, setFilter] = useState<FilterCategory>('all')
  const [resetOpen, setResetOpen] = useState(false)
  const resetTriggerRef = useRef<HTMLButtonElement | null>(null)
  const resetCancelRef = useRef<HTMLButtonElement | null>(null)

  const defs = useMemo(() => getDefinitions(), [])

  useEffect(() => {
    const s = enrichStatsWithPuzzles(getStats())
    setStats(s)
    setState(getState())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!resetOpen) return
    const previouslyFocused = resetTriggerRef.current
    resetCancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setResetOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previouslyFocused?.focus()
    }
  }, [resetOpen])

  const statItems = useMemo<StatItem[]>(() => {
    if (!stats) return []
    const winRate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0
    const playTime = stats.totalPlayTimeSeconds || 0
    const timeStr = formatPlayTime(playTime)

    let bronze = 0
    let silver = 0
    let gold = 0
    for (const id of Object.keys(defs)) {
      const aState = state[id]
      if (aState && aState.level >= 1) bronze++
      if (aState && aState.level >= 2) silver++
      if (aState && aState.level >= 3) gold++
    }

    return [
      { value: stats.gamesPlayed, label: 'Games Played' },
      { value: stats.gamesWon, label: 'Wins' },
      { value: stats.gamesLost, label: 'Losses' },
      { value: stats.gamesDrawn, label: 'Draws' },
      { value: `${winRate}%`, label: 'Win Rate' },
      { value: stats.bestWinStreak, label: 'Best Streak' },
      { value: `${stats.puzzlesSolved}/30`, label: 'Puzzles Solved' },
      { value: stats.totalMoves, label: 'Total Moves' },
      { value: timeStr, label: 'Play Time' },
      { value: bronze + silver + gold, label: 'Medals Earned' },
    ]
  }, [stats, state, defs])

  const progressInfo = useMemo(() => {
    let total = 0
    let unlocked = 0
    let goldCount = 0
    for (const id of Object.keys(defs)) {
      total++
      const a = state[id]
      if (a && a.level > 0) unlocked++
      if (a && a.level >= 3) goldCount++
    }
    const pct = total > 0 ? Math.round((goldCount / total) * 100) : 0
    return { total, unlocked, goldCount, pct }
  }, [defs, state])

  const renders = useMemo<AchievementRender[]>(() => {
    if (!stats) return []
    return buildAchievementRenders(defs, stats, state)
  }, [defs, stats, state])

  const filteredRenders = useMemo(() => {
    if (filter === 'all') return renders
    return renders.filter((r) => r.def.category === filter)
  }, [renders, filter])

  function handleReset() {
    if (typeof window === 'undefined') return
    localStorage.removeItem(STORAGE_KEYS.STATS)
    localStorage.removeItem(STORAGE_KEYS.ACHIEVEMENTS)
    localStorage.removeItem(STORAGE_KEYS.SOLVED)
    localStorage.removeItem(STORAGE_KEYS.SOLVED_NO_HINT)
    localStorage.removeItem(STORAGE_KEYS.TRIAL_UNLOCKED)
    clearCoinsAndInventory()
    setStats(enrichStatsWithPuzzles(getStats()))
    setState(getState())
    setResetOpen(false)
  }

  return (
    <main className="page-base page-vignette">
      <CyberCanvas skipIntro />
      <ShopButton />

      <h1 className={styles.heroTitle}>PLAYER ACHIEVEMENT</h1>

      <div className={styles.pageContainer}>
        <div className={styles.statsSection}>
          <h2>Player Statistics</h2>
          <div className={styles.statsGrid}>
            {hydrated &&
              statItems.map((item) => (
                <div key={item.label} className={styles.statCard}>
                  <span className={styles.statValue}>{item.value}</span>
                  <span className={styles.statLabel}>{item.label}</span>
                </div>
              ))}
          </div>
          <div className={styles.progressSection}>
            <div className={styles.progressText}>
              <span>Achievement Progress</span>
              <span>
                {hydrated
                  ? `${progressInfo.unlocked} unlocked, ${progressInfo.goldCount} gold / ${progressInfo.total}`
                  : '0 / 0'}
              </span>
            </div>
            <div className={styles.progressBarContainer}>
              <div
                className={styles.progressBarFill}
                style={{ width: `${hydrated ? progressInfo.pct : 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className={styles.filterTabs}>
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`${styles.filterTab} ${filter === tab.id ? styles.filterTabActive : ''}`}
              aria-pressed={filter === tab.id}
              onClick={() => setFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.achievementsGrid}>
          {hydrated &&
            filteredRenders.map((r) => {
              const levelClass =
                r.level === 0
                  ? styles.locked
                  : r.level === 1
                    ? styles.levelBronze
                    : r.level === 2
                      ? styles.levelSilver
                      : styles.levelGold

              const tierClasses: Array<'bronze' | 'silver' | 'gold'> = ['bronze', 'silver', 'gold']

              let displayedFillClass = ''
              if (r.fillClass === 'bronzeFill') displayedFillClass = styles.bronzeFill
              else if (r.fillClass === 'silverFill') displayedFillClass = styles.silverFill
              else if (r.fillClass === 'goldFill') displayedFillClass = styles.goldFill

              return (
                <div key={r.id} className={`${styles.achievementCard} ${levelClass}`}>
                  <div className={styles.achHeader}>
                    <div className={styles.achIcon}>{r.def.icon}</div>
                    <div className={styles.achInfo}>
                      <div className={styles.achName}>{r.def.name}</div>
                      <div className={styles.achDesc}>{r.def.description}</div>
                    </div>
                  </div>
                  <div className={styles.achTiers}>
                    {tierClasses.map((tier, idx) => {
                      const filled = r.tierFilled[idx]
                      const tierClass =
                        tier === 'bronze'
                          ? styles.bronze
                          : tier === 'silver'
                            ? styles.silver
                            : styles.gold
                      return (
                        <div
                          key={tier}
                          className={`${styles.achTierDot} ${tierClass} ${filled ? styles.filled : ''}`}
                        />
                      )
                    })}
                  </div>
                  <div className={styles.achProgress}>
                    <div
                      className={`${styles.achProgressFill} ${displayedFillClass}`}
                      style={{ width: `${r.progressPct}%` }}
                    />
                  </div>
                  <div className={styles.achNext}>{r.nextDesc}</div>
                </div>
              )
            })}
        </div>

        <div className={styles.resetBtnWrapper}>
          <button
            ref={resetTriggerRef}
            type="button"
            className={styles.resetBtn}
            aria-haspopup="dialog"
            aria-expanded={resetOpen}
            onClick={() => setResetOpen(true)}
          >
            Reset All Progress
          </button>
        </div>
      </div>

      <div
        className={`${styles.resetModalOverlay} ${resetOpen ? styles.resetModalOverlayShow : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setResetOpen(false)
        }}
      >
        <div
          className={styles.resetModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-modal-title"
        >
          <span className={styles.resetModalIcon}>&#9888;</span>
          <h3 id="reset-modal-title">Reset All Progress?</h3>
          <p>This will permanently erase all achievements, stats, and puzzle history. This cannot be undone.</p>
          <div className={styles.resetModalBtns}>
            <button
              ref={resetCancelRef}
              type="button"
              className={styles.resetCancelBtn}
              onClick={() => setResetOpen(false)}
            >
              Cancel
            </button>
            <button type="button" className={styles.resetConfirmBtn} onClick={handleReset}>
              Reset Everything
            </button>
          </div>
        </div>
      </div>

      <div className={styles.bottomNav}>
        <Link href="/" className={`${styles.backBtn} ${styles.primaryBtn}`}>
          &larr; Main Menu
        </Link>
        <Link href="/about" className={`${styles.backBtn} ${styles.secondaryBtn}`}>
          &larr; Explore
        </Link>
      </div>
    </main>
  )
}
