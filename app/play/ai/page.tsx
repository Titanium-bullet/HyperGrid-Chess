import Image from 'next/image'
import Link from 'next/link'
import { CyberCanvas } from '@/components/CyberCanvas'
import { ShopButton } from '@/components/ShopButton'
import { AI_OPPONENTS } from '@/lib/ai-opponents'
import styles from './page.module.css'

export default function AiSelectPage() {
  return (
    <main className="page-base page-vignette">
      <CyberCanvas skipIntro />
      <ShopButton />

      <h1 className={styles.title}>CHOOSE YOUR OPPONENT</h1>

      <div className={styles.grid}>
        {AI_OPPONENTS.map((ai) => (
          <Link
            key={ai.diff}
            href={`/play/time?mode=ai&diff=${ai.diff}`}
            className={`${styles.card} ${styles[ai.colorClass]}`}
          >
            <div className={`${styles.cardImage} ${styles[ai.colorClass]}`}>
              <Image
                src={ai.image}
                alt={ai.name}
                fill
                sizes="(max-width: 700px) 180px, 225px"
                style={{ objectFit: 'cover' }}
                priority
              />
            </div>
            <div className={styles.cardInfo}>
              <div className={styles.cardName}>{ai.name}</div>
              <div className={styles.cardElo}>{ai.elo}</div>
              {ai.mode && <div className={styles.cardMode}>{ai.mode}</div>}
            </div>
          </Link>
        ))}
      </div>

      <Link href="/play" className={styles.backBtn}>
        &larr; Back
      </Link>
    </main>
  )
}
