'use client'

import Link from 'next/link'
import Image from 'next/image'
import { CyberCanvas } from '@/components/CyberCanvas'
import { ShopButton } from '@/components/ShopButton'
import { FinanceOnboarding } from '@/components/finance/FinanceOnboarding'
import { asset } from '@/lib/assets'
import styles from './page.module.css'

export default function FinanceLandingPage() {
  return (
    <main className="page-base page-vignette">
      <CyberCanvas skipIntro />
      <ShopButton />
      <FinanceOnboarding />

      <h1 className={styles.heroTitle}>FINANCE</h1>
      <p className={styles.sub}>Banking · Shopping · Entertainment</p>

      <div className={styles.grid}>
        <Link href="/finance/banking" className={`${styles.tile} ${styles.tileBank}`}>
          <span className={styles.bankGlyph}> BANK</span>
          <div className={styles.tileBankInner}>
            <div>
              <div className={styles.bankBrand}>Bank of Hypergrid</div>
              <h2 className={styles.bankTitle}>
                Banking &amp;
                <br />
                Insurance
              </h2>
              <p className={styles.bankDesc}>
                Manage your cards, take out loans, grow your wealth with investments, and protect your
                progress with insurance.
              </p>
              <div className={styles.bankTags}>
                <span className={styles.bankTag}>Cards</span>
                <span className={styles.bankTag}>Loan</span>
                <span className={styles.bankTag}>Investment</span>
                <span className={styles.bankTag}>Insurance</span>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/shop" className={`${styles.tile} ${styles.tileSmall} ${styles.tileShopping}`}>
          <Image
            src={asset('/images/shop.jpg')}
            alt="Shop"
            fill
            sizes="(max-width: 720px) 100vw, 400px"
            style={{ objectFit: 'cover' }}
            className={styles.tileBgImg}
          />
          <div className={styles.tileContent}>
            <div className={styles.iconRow}>🛒</div>
            <div>
              <h2 className={styles.tileTitle}>Shopping</h2>
              <div className={styles.tileSub}>Boards · Pieces · Gifts</div>
            </div>
          </div>
        </Link>

        <div
          className={`${styles.tile} ${styles.tileSmall} ${styles.tileEntertainment} ${styles.tileEntertainmentDisabled}`}
          aria-disabled="true"
        >
          <div className={styles.iconRow}>🎮</div>
          <div>
            <h2 className={styles.tileTitle}>Entertainment</h2>
            <span className={styles.comingSoon}>Coming Soon</span>
          </div>
        </div>
      </div>

      <Link href="/" className={styles.backBtn}>
        &larr; Main Menu
      </Link>
    </main>
  )
}
