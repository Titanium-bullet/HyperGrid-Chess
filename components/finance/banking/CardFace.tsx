'use client'

import { getCardDef, type CardTier } from '@/lib/finance'
import styles from './banking.module.css'

type CardFaceProps = {
  tier: CardTier
  holder?: string
  locked?: boolean
  showLock?: boolean
  chip?: 'none' | 'small' | 'large'
  className?: string
}

export function CardFace({ tier, holder, locked = false, showLock = true, chip = 'large', className = '' }: CardFaceProps) {
  const c = getCardDef(tier)
  return (
    <div
      className={`${styles.face} ${locked ? styles.faceLocked : ''} ${tier === 'aesculapius' ? styles.faceAesculapius : ''} ${className}`}
      style={{ background: `linear-gradient(135deg, ${c.gradient[0]}, ${c.gradient[1]} 60%, ${c.gradient[2]})`, color: c.accent }}
    >
      <span className={styles.faceWatermark}>{c.glyph}</span>

      <div className={styles.faceTop}>
        <div>
          <div className={styles.faceBrand} style={{ color: '#fff' }}>
            Bank of Hypergrid
          </div>
          {chip !== 'none' && (
            <div
              className={`${styles.faceChip} ${chip === 'small' ? styles.faceChipSmall : ''}`}
              style={{ marginTop: chip === 'small' ? 8 : 20 }}
            />
          )}
        </div>
        <div
          className={`${styles.faceNetwork} ${tier === 'platinum' ? styles.faceNetworkPlatinum : ''} ${tier === 'aesculapius' ? styles.faceNetworkAesculapius : ''}`}
          style={{ color: '#fff' }}
        >
          {c.name}
        </div>
      </div>

      <div className={styles.faceContact} style={{ color: '#fff' }}>
        {tier === 'aesculapius' ? (
          <span className={styles.faceContactInfinity}>∞</span>
        ) : (
          <>
            <span className={styles.faceContactDot} />
            <span className={styles.faceContactDot} />
          </>
        )}
      </div>

      <div className={styles.faceBottom} style={{ color: '#fff' }}>
        <div style={{ minWidth: 0 }}>
          <p className={styles.faceName}>{c.name}</p>
          <div className={styles.faceTier}>
            {c.kind === 'credit' ? 'CREDIT' : 'DEBIT'} · {c.payLabel}
          </div>
        </div>
        <div className={styles.faceHolder}>{holder || 'Card holder'}</div>
      </div>

      {locked && showLock && (
        <div className={styles.faceLockBadge}>
          <span>🔒 Locked</span>
        </div>
      )}
    </div>
  )
}
