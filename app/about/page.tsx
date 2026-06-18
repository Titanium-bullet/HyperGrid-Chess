import Link from 'next/link'
import Image from 'next/image'
import { CyberCanvas } from '@/components/CyberCanvas'
import { asset } from '@/lib/assets'
import styles from './page.module.css'

export default function AboutPage() {
  return (
    <main className="page-base page-vignette">
      <CyberCanvas skipIntro />

      <h1 className={styles.heroTitle}>EXPLORE MORE</h1>

      <div className={styles.exploreGrid}>
        <Link href="/about/info" className={styles.exploreCard}>
          <div className={`${styles.cardImage} cyan`}>
            <span className={styles.cardIcon}>&#x265F;</span>
          </div>
          <div className={styles.cardLabel}>About Game &amp; Dev</div>
        </Link>

        <Link href="/achievements" className={styles.exploreCard}>
          <div className={`${styles.cardImage} gold`}>
            <span className={styles.cardIcon}>🏆</span>
          </div>
          <div className={styles.cardLabel}>Player Achievement</div>
        </Link>

        <div className={`${styles.exploreCard} disabled`}>
          <div className={`${styles.cardImage} red`}>
            <span className={styles.cardIcon}>🎲</span>
            <span className={styles.comingSoonBadge}>Coming Soon</span>
          </div>
          <div className={styles.cardLabel}>3D Chess Beta</div>
        </div>

        <Link href="/shop" className={styles.exploreCard}>
          <div className={`${styles.cardImage} gold`}>
            <Image
              src={asset('/images/shop.jpg')}
              alt="Shop"
              fill
              sizes="(max-width: 440px) 100vw, (max-width: 700px) 50vw, 260px"
              style={{ objectFit: 'cover' }}
              className={styles.cardPhoto}
            />
          </div>
          <div className={styles.cardLabel}>Shop</div>
        </Link>

        <div className={`${styles.exploreCard} disabled`}>
          <div className={`${styles.cardImage} red`}>
            <span className={styles.cardIcon}>⚡</span>
            <span className={styles.comingSoonBadge}>Coming Soon</span>
          </div>
          <div className={styles.cardLabel}>Play Online</div>
        </div>
      </div>

      <Link href="/" className={styles.backBtn}>← Back to Menu</Link>
    </main>
  )
}
