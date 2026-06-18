'use client'

import { useCallback, useState } from 'react'
import { CyberCanvas } from '@/components/CyberCanvas'
import { ShopButton } from '@/components/ShopButton'
import { ArenaCanvas } from '@/components/arcade/ArenaCanvas'
import { CharSelect } from '@/components/arcade/CharSelect'
import { GLITCH, FORGE, type FighterDef } from '@/lib/arcade/characters'
import styles from './page.module.css'

export default function ArcadePage() {
  const [stage, setStage] = useState<'select' | 'fight'>('select')
  const [matchKey, setMatchKey] = useState(0)
  const [p1, setP1] = useState<FighterDef>(GLITCH)
  const [p2, setP2] = useState<FighterDef>(FORGE)

  const handleConfirm = useCallback((a: FighterDef, b: FighterDef) => {
    setP1(a)
    setP2(b)
    setMatchKey((k) => k + 1)
    setStage('fight')
  }, [])

  const handleExitToSelect = useCallback(() => {
    setStage('select')
  }, [])

  return (
    <main className="page-base page-vignette">
      <CyberCanvas skipIntro />
      <ShopButton />

      <h1 className={styles.title}>NEON VERSUS</h1>
      <p className={styles.subtitle}>2-Player Arcade Brawl · GLITCH vs FORGE</p>

      <div className={styles.arenaSlot}>
        {stage === 'select' ? (
          <CharSelect onConfirm={handleConfirm} />
        ) : (
          <ArenaCanvas key={matchKey} p1={p1} p2={p2} onExitToSelect={handleExitToSelect} />
        )}
      </div>

      <div className={styles.tipRow}>
        {stage === 'select' ? (
          <>
            <span className={styles.tip}>P1 </span>
            <kbd className={styles.kbd}>A/D</kbd>
            <span className={styles.tip}> fighter · </span>
            <kbd className={styles.kbd}>F/G</kbd>
            <span className={styles.tip}> color · </span>
            <kbd className={styles.kbd}>H</kbd>
            <span className={styles.tip}> ready &nbsp;|&nbsp; P2 </span>
            <kbd className={styles.kbd}>←/→</kbd>
            <span className={styles.tip}> · </span>
            <kbd className={styles.kbd}>J/K</kbd>
            <span className={styles.tip}> · </span>
            <kbd className={styles.kbd}>L</kbd>
          </>
        ) : (
          <>
            <span className={styles.tip}>Press </span>
            <kbd className={styles.kbd}>?</kbd>
            <span className={styles.tip}> in the arena for controls · </span>
            <kbd className={styles.kbd}>Esc</kbd>
            <span className={styles.tip}> to pause</span>
          </>
        )}
      </div>

      <a href="/" className={styles.backBtn}>
        &larr; Main Menu
      </a>
    </main>
  )
}
