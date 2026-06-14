'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CyberCanvas } from '@/components/CyberCanvas'
import { ShopButton } from '@/components/ShopButton'
import { AI_NAMES, type Difficulty } from '@/lib/ai-opponents'
import styles from './page.module.css'

type TimeOption = { value: string; label: string; time: number; inc: number }

const BULLET: TimeOption[] = [
  { value: '1+0', label: '1 min', time: 60, inc: 0 },
  { value: '1+1', label: '1 min', time: 60, inc: 1 },
  { value: '2+1', label: '2 min', time: 120, inc: 1 },
  { value: '3+0', label: '3 min', time: 180, inc: 0 },
  { value: '3+2', label: '3 min', time: 180, inc: 2 },
]

const BLITZ: TimeOption[] = [
  { value: '5+0', label: '5 min', time: 300, inc: 0 },
  { value: '5+3', label: '5 min', time: 300, inc: 3 },
  { value: '5+5', label: '5 min', time: 300, inc: 5 },
  { value: '10+0', label: '10 min', time: 600, inc: 0 },
]

const RAPID: TimeOption[] = [
  { value: '15+10', label: '15 min', time: 900, inc: 10 },
  { value: '30+0', label: '30 min', time: 1800, inc: 0 },
  { value: '30+20', label: '30 min', time: 1800, inc: 20 },
]

function PlayTimeInner() {
  const router = useRouter()
  const search = useSearchParams()
  const mode = search.get('mode') === 'pvp' ? 'pvp' : 'ai'
  const diff = search.get('diff') ?? '1'

  const subtitle =
    mode === 'pvp'
      ? 'Two Player Mode'
      : `vs ${AI_NAMES[diff as Difficulty] ?? 'AI'}`

  const backHref = mode === 'pvp' ? '/play' : '/play/ai'

  function startGame(time: number, inc: number) {
    const params = new URLSearchParams()
    params.set('mode', mode)
    if (time > 0) {
      params.set('time', String(time))
      if (inc > 0) params.set('inc', String(inc))
    }
    if (mode === 'ai') {
      params.set('diff', diff)
    }
    router.push(`/game?${params.toString()}`)
  }

  return (
    <>
      <CyberCanvas skipIntro />
      <ShopButton />
      <div className={styles.pageWrap}>
        <div className={styles.pageTitle}>Select Time Control</div>
        <div className={styles.pageSubtitle}>{subtitle}</div>

        <div className={styles.timeSections}>
          <div className={styles.timeCategory}>
            <div className={`${styles.categoryLabel} ${styles.bullet}`}>Bullet</div>
            <div className={styles.timeRow}>
              {BULLET.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.timeCard} ${styles.bullet}`}
                  onClick={() => startGame(opt.time, opt.inc)}
                >
                  <div className={styles.timeValue}>{opt.value}</div>
                  <div className={styles.timeLabel}>{opt.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.timeCategory}>
            <div className={`${styles.categoryLabel} ${styles.blitz}`}>Blitz</div>
            <div className={styles.timeRow}>
              {BLITZ.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.timeCard} ${styles.blitz}`}
                  onClick={() => startGame(opt.time, opt.inc)}
                >
                  <div className={styles.timeValue}>{opt.value}</div>
                  <div className={styles.timeLabel}>{opt.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.timeCategory}>
            <div className={`${styles.categoryLabel} ${styles.rapid}`}>Rapid</div>
            <div className={styles.timeRow}>
              {RAPID.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.timeCard} ${styles.rapid}`}
                  onClick={() => startGame(opt.time, opt.inc)}
                >
                  <div className={styles.timeValue}>{opt.value}</div>
                  <div className={styles.timeLabel}>{opt.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.timeCategory}>
            <div className={`${styles.categoryLabel} ${styles.unlimitedLabel}`}>No Time Limit</div>
            <div className={styles.timeRow}>
              <button
                type="button"
                className={`${styles.timeCard} ${styles.unlimited}`}
                onClick={() => startGame(0, 0)}
              >
                <div className={styles.timeValue}>&infin;</div>
                <div className={styles.timeLabel}>Unlimited</div>
              </button>
            </div>
          </div>
        </div>

        <Link href={backHref} className={styles.backBtn}>
          &larr; Back
        </Link>
      </div>
    </>
  )
}

export default function PlayTimePage() {
  return (
    <Suspense fallback={null}>
      <PlayTimeInner />
    </Suspense>
  )
}
