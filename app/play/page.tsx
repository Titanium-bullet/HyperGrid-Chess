import Link from 'next/link'
import Image from 'next/image'
import { CyberCanvas } from '@/components/CyberCanvas'
import styles from './page.module.css'

export default function PlayPage() {
  return (
    <main className="page-base page-vignette">
      <CyberCanvas skipIntro />

      <h1 className={styles.title}>SELECT MODE</h1>

      <div className={styles.exploreGrid}>
        <Link href="/play/ai" className={`${styles.exploreCard} ${styles.span2x2}`}>
          <div className={`${styles.cardImage} ${styles.cyan}`}>
            <Image src="/images/vsai.jpg" alt="vs AI" fill style={{ objectFit: 'cover' }} sizes="(max-width: 700px) 100vw, 520px" priority />
          </div>
          <div className={styles.cardLabel}>
            vs AI
            <span className={styles.cardSublabel}>Challenge the machine</span>
          </div>
        </Link>

        <Link href="/play/time?mode=pvp" className={styles.exploreCard}>
          <div className={`${styles.cardImage} ${styles.purple}`}>
            <Image src="/images/2players.jpg" alt="Two Player" fill style={{ objectFit: 'cover' }} sizes="(max-width: 700px) 100vw, 260px" />
          </div>
          <div className={styles.cardLabel}>
            Two Player
            <span className={styles.cardSublabel}>Local multiplayer</span>
          </div>
        </Link>

        <Link href="/puzzles" className={styles.exploreCard}>
          <div className={`${styles.cardImage} ${styles.gold}`}>
            <Image src="/images/puzzle.jpg" alt="Puzzle Academy" fill style={{ objectFit: 'cover' }} sizes="(max-width: 700px) 100vw, 260px" />
          </div>
          <div className={styles.cardLabel}>
            Puzzle Academy
            <span className={styles.cardSublabel}>Train your tactics</span>
          </div>
        </Link>
      </div>

      <Link href="/" className={styles.backBtn}>&larr; Menu</Link>
    </main>
  )
}
