'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { CyberCanvas } from '@/components/CyberCanvas'
import { ShopButton } from '@/components/ShopButton'
import { STORAGE_KEYS } from '@/lib/storage-keys'
import { loadPuzzles, type PuzzlesData } from '@/lib/puzzles'
import styles from './page.module.css'

const FALLBACK_QUOTES = [
  'Solve my puzzles... if you can.',
  "You'll never unlock the trial.",
  'Every puzzle is a lesson in failure.',
  "Come back when you've actually learned something.",
  "I've been waiting. Take your time — you'll need it.",
]

function pickRivalQuote(solvedCount: number, randomIndex: number): string {
  if (solvedCount === 0) return FALLBACK_QUOTES[0]
  if (solvedCount < 10) return FALLBACK_QUOTES[(randomIndex % 2) + 1]
  if (solvedCount < 20) return "You're persistent. I'll give you that."
  if (solvedCount < 30) return "So close... but close doesn't count in chess."
  return 'So you think you\'re ready? Come face me.'
}

export default function PuzzlesPage() {
  const [data, setData] = useState<PuzzlesData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [solved, setSolved] = useState<string[]>([])
  const [avatarError, setAvatarError] = useState(false)
  const [rivalQuote, setRivalQuote] = useState<string>(FALLBACK_QUOTES[0])
  const randomIndexRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false

    if (randomIndexRef.current === null) {
      randomIndexRef.current = Math.floor(Math.random() * 1_000_000)
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SOLVED)
      const parsed = raw ? (JSON.parse(raw) as unknown) : []
      if (Array.isArray(parsed)) {
        setSolved(parsed.filter((x): x is string => typeof x === 'string'))
      }
    } catch {
      setSolved([])
    }

    loadPuzzles()
      .then((json) => {
        if (cancelled) return
        setData(json)
      })
      .catch(() => {
        if (cancelled) return
        setError('Failed to load puzzles. Please refresh.')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const totalPuzzles = useMemo(() => {
    if (!data) return 0
    return data.tiers.reduce((acc, tier) => acc + tier.puzzles.length, 0)
  }, [data])

  const solvedCount = solved.length

  useEffect(() => {
    if (!data) return
    const idx = randomIndexRef.current ?? 0
    setRivalQuote(pickRivalQuote(solvedCount, idx))
  }, [data, solvedCount])

  useEffect(() => {
    if (!data) return
    if (solvedCount >= totalPuzzles && totalPuzzles > 0) {
      try {
        localStorage.setItem(STORAGE_KEYS.TRIAL_UNLOCKED, 'true')
      } catch {
        // ignore storage errors
      }
    }
  }, [data, solvedCount, totalPuzzles])

  const progressPercent = totalPuzzles > 0 ? (solvedCount / totalPuzzles) * 100 : 0

  return (
    <main className={styles.root}>
      <CyberCanvas skipIntro />
      <ShopButton />

      <div className={styles.mapContent}>
        <div className={styles.pageTitle}>Puzzle Academy</div>
        <div className={styles.pageSubtitle}>Train. Improve. Conquer.</div>

        <div className={styles.rivalBanner}>
          {!avatarError ? (
            <div className={styles.rivalAvatar}>
              <Image
                src="/images/coach.jpg"
                alt="SPECTRE"
                fill
                sizes="64px"
                style={{ objectFit: 'cover' }}
                onError={() => setAvatarError(true)}
              />
            </div>
          ) : (
            <div className={styles.rivalAvatarFallback}>&#9818;</div>
          )}
          <div className={styles.rivalInfo}>
            <span className={styles.rivalName}>SPECTRE</span>
            <span className={styles.rivalTitle}>Puzzle Master &bull; ~1800 ELO</span>
            <span className={styles.rivalQuote}>{rivalQuote}</span>
          </div>
        </div>

        <div className={styles.overallProgress}>
          <div className={styles.progressText}>
            <span>Overall Progress</span>
            <span>
              {solvedCount} / {totalPuzzles}
            </span>
          </div>
          <div className={styles.progressBarContainer}>
            <div
              className={styles.progressBarFill}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {error ? (
          <p className={styles.errorMsg}>{error}</p>
        ) : data ? (
          <PuzzleMap data={data} solved={solved} solvedCount={solvedCount} totalPuzzles={totalPuzzles} />
        ) : null}

        <Link href="/" className={styles.backBtn}>
          &larr; Menu
        </Link>
      </div>
    </main>
  )
}

function PuzzleMap({
  data,
  solved,
  solvedCount,
  totalPuzzles,
}: {
  data: PuzzlesData
  solved: string[]
  solvedCount: number
  totalPuzzles: number
}) {
  const solvedSet = useMemo(() => new Set(solved), [solved])

  const tierUnlocked = useMemo(() => {
    const result: boolean[] = []
    let prevTierSolved = true
    for (let t = 0; t < data.tiers.length; t++) {
      result.push(prevTierSolved)
      const tier = data.tiers[t]
      const allSolved = tier.puzzles.every((p) => solvedSet.has(p.id))
      prevTierSolved = prevTierSolved && allSolved
    }
    return result
  }, [data, solvedSet])

  const trialUnlocked = solvedCount >= totalPuzzles && totalPuzzles > 0

  return (
    <>
      {data.tiers.map((tier, tIdx) => {
        const tierSolvedCount = tier.puzzles.reduce(
          (acc, p) => acc + (solvedSet.has(p.id) ? 1 : 0),
          0,
        )
        const isTierUnlocked = tierUnlocked[tIdx]

        return (
          <div key={tier.id} className={styles.tierSection}>
            <div className={styles.tierHeader}>
              <span className={`${styles.tierName} ${styles[tier.id]}`}>{tier.name}</span>
              <span className={styles.tierProgress}>
                {tierSolvedCount} / {tier.puzzles.length}
              </span>
            </div>
            <div className={styles.tierDescription}>{tier.description}</div>

            {!isTierUnlocked ? (
              <div className={styles.tierLockedMsg}>Complete the previous tier to unlock</div>
            ) : (
              <div className={styles.puzzleGrid}>
                {tier.puzzles.map((puzzle, pIdx) => {
                  const isSolved = solvedSet.has(puzzle.id)
                  let isUnlocked = true
                  if (pIdx > 0) {
                    isUnlocked = solvedSet.has(tier.puzzles[pIdx - 1].id)
                  }
                  // Tier-gating already enforced by isTierUnlocked above for pIdx === 0

                  const stateClass = isSolved
                    ? styles.solved
                    : isUnlocked
                      ? styles.unlocked
                      : styles.locked
                  const label = puzzle.description.split('—')[0].trim()

                  if (isUnlocked || isSolved) {
                    return (
                      <Link
                        key={puzzle.id}
                        href={`/game?mode=puzzle&puzzle=${puzzle.id}`}
                        className={`${styles.puzzleNode} ${styles[tier.id]} ${stateClass}`}
                      >
                        <span className={styles.nodeNumber}>{pIdx + 1}</span>
                        <span className={styles.nodeLabel}>{label}</span>
                      </Link>
                    )
                  }
                  return (
                    <a
                      key={puzzle.id}
                      href="#"
                      tabIndex={-1}
                      aria-disabled="true"
                      onClick={(e) => e.preventDefault()}
                      className={`${styles.puzzleNode} ${styles[tier.id]} ${stateClass}`}
                    >
                      <span className={styles.nodeNumber}>{pIdx + 1}</span>
                      <span className={styles.nodeLabel}>{label}</span>
                    </a>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      <div className={styles.trialSection}>
        {trialUnlocked ? (
          <Link href="/game?mode=trial" className={`${styles.trialNode} ${styles.unlocked}`}>
            <span className={styles.trialIcon}>&#9818;</span>
            <div className={styles.trialInfo}>
              <div className={styles.trialName}>{data.trial.name}</div>
              <div className={styles.trialDesc}>{data.trial.rival_taunt}</div>
            </div>
          </Link>
        ) : (
          <a
            href="#"
            tabIndex={-1}
            aria-disabled="true"
            onClick={(e) => e.preventDefault()}
            className={`${styles.trialNode} ${styles.locked}`}
          >
            <span className={styles.trialIcon}>&#9818;</span>
            <div className={styles.trialInfo}>
              <div className={styles.trialName}>{data.trial.name}</div>
              <div className={styles.trialLockedText}>Defeat SPECTRE in a full game</div>
              <div className={styles.trialRequirement}>
                Solve all {totalPuzzles} puzzles to unlock
              </div>
            </div>
          </a>
        )}
      </div>
    </>
  )
}
