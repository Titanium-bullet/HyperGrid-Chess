'use client'

import { useState } from 'react'
import type { PanelProps } from './BankingClient'
import styles from './banking.module.css'

const RATE = 200 // coins per USD (approx)

type Pkg = {
  id: string
  coins: number
  priceUsd: number
  icon: string
  tag: string
  badge?: string
}

const PACKAGES: Pkg[] = [
  { id: 'starter', coins: 1000, priceUsd: 0.99, icon: '🪙', tag: 'Starter' },
  { id: 'popular', coins: 12000, priceUsd: 9.99, icon: '💰', tag: 'Popular', badge: 'Best value' },
  { id: 'pro', coins: 65000, priceUsd: 49.99, icon: '💵', tag: 'Pro' },
  { id: 'elite', coins: 300000, priceUsd: 199.99, icon: '🏦', tag: 'Elite', badge: 'Top tier' },
]

const PAY_METHODS = [
  { id: 'card', label: 'Credit / Debit', icon: '💳' },
  { id: 'paypal', label: 'PayPal', icon: '🅿️' },
  { id: 'crypto', label: 'Crypto', icon: '₿' },
  { id: 'redeem', label: 'Redeem Code', icon: '🎁' },
]

export function ExchangePanel({ profile, coins, pushToast }: PanelProps) {
  const [selPkg, setSelPkg] = useState<string>('popular')
  const [selPay, setSelPay] = useState<string>('card')
  const [promo, setPromo] = useState('')

  function handleCheckout() {
    if (!profile.openedCard) {
      pushToast('Open a card first.', true)
      return
    }
    pushToast('Checkout is a demo — real payments coming soon.', true)
  }

  return (
    <div className={styles.panel}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Currency Exchange</h2>
        <span className={styles.coinPill}>
          <span>🪙</span> {coins.toLocaleString()}
        </span>
      </div>
      <p className={styles.muted} style={{ marginTop: '-0.3rem' }}>
        Top up your coin balance. Secure checkout · instant delivery.
      </p>

      {/* Rate + balance */}
      <div className={styles.subPanel} style={{ margin: 0 }}>
        <div className={styles.kv}>
          <span className={styles.kvK}>Exchange rate</span>
          <span className={styles.kvV}>1 USD ≈ {RATE} 🪙</span>
        </div>
        <div className={styles.kv}>
          <span className={styles.kvK}>Current balance</span>
          <span className={styles.kvV}>{coins.toLocaleString()} 🪙</span>
        </div>
      </div>

      {/* Packages */}
      <div className={styles.subPanel}>
        <h3 className={styles.sectionTitle} style={{ marginBottom: '0.8rem' }}>
          Coin Packages
        </h3>
        <div className={styles.grid2}>
          {PACKAGES.map((p) => {
            const selected = selPkg === p.id
            return (
              <button
                key={p.id}
                type="button"
                className={`${styles.exchangePkg} ${selected ? styles.exchangePkgSelected : ''}`}
                onClick={() => setSelPkg(p.id)}
              >
                {p.badge && <span className={styles.exchangeBadge}>{p.badge}</span>}
                <span className={styles.exchangeIcon}>{p.icon}</span>
                <div className={styles.exchangeCoins}>{p.coins.toLocaleString()} 🪙</div>
                <div className={styles.exchangeTag}>{p.tag}</div>
                <div className={styles.exchangePrice}>${p.priceUsd.toFixed(2)}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Payment method */}
      <div className={styles.subPanel}>
        <h3 className={styles.sectionTitle} style={{ marginBottom: '0.7rem' }}>
          Payment Method
        </h3>
        <div className={styles.productRow}>
          {PAY_METHODS.map((m) => {
            const selected = selPay === m.id
            return (
              <div
                key={m.id}
                className={`${styles.itemRow} ${selected ? styles.itemRowSelected : ''}`}
                style={{ cursor: 'pointer', flexDirection: 'column', gap: '0.3rem' }}
                onClick={() => setSelPay(m.id)}
              >
                <span className={styles.itemIcon}>{m.icon}</span>
                <span className={styles.itemName} style={{ textAlign: 'center' }}>
                  {m.label}
                </span>
              </div>
            )
          })}
        </div>

        <div className={styles.field} style={{ marginTop: '0.9rem' }}>
          <label className={styles.label}>Promo / Redeem code</label>
          <div className={styles.inputRow}>
            <input
              className={styles.input}
              type="text"
              placeholder="Enter code"
              value={promo}
              onChange={(e) => setPromo(e.target.value)}
            />
            <button
              type="button"
              className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
              onClick={() => pushToast('Promo codes are not active yet.', true)}
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Order summary */}
      <div className={styles.subPanel}>
        <h3 className={styles.sectionTitle} style={{ marginBottom: '0.7rem' }}>
          Order Summary
        </h3>
        {(() => {
          const p = PACKAGES.find((x) => x.id === selPkg) ?? PACKAGES[0]
          const coinsNow = p.coins
          const bonus = promo.trim() ? Math.round(coinsNow * 0.05) : 0
          return (
            <>
              <div className={styles.kv}>
                <span className={styles.kvK}>Package</span>
                <span className={styles.kvV}>
                  {coinsNow.toLocaleString()} 🪙
                </span>
              </div>
              {bonus > 0 && (
                <div className={styles.kv}>
                  <span className={styles.kvK}>Promo bonus (+5%)</span>
                  <span className={styles.kvV} style={{ color: '#6cff9c' }}>
                    +{bonus.toLocaleString()} 🪙
                  </span>
                </div>
              )}
              <div className={styles.kv}>
                <span className={styles.kvK}>You receive</span>
                <span className={styles.kvV} style={{ color: '#ffd700' }}>
                  {(coinsNow + bonus).toLocaleString()} 🪙
                </span>
              </div>
              <div className={styles.kv}>
                <span className={styles.kvK}>Total due</span>
                <span className={styles.kvV}>${p.priceUsd.toFixed(2)}</span>
              </div>
            </>
          )
        })()}
        <button
          type="button"
          className={`${styles.btn} ${styles.btnGold}`}
          style={{ marginTop: '0.9rem', width: '100%' }}
          onClick={handleCheckout}
        >
          Pay ${((PACKAGES.find((x) => x.id === selPkg) ?? PACKAGES[0]).priceUsd).toFixed(2)}
        </button>
        <p className={styles.muted} style={{ marginTop: '0.6rem', fontSize: '0.72rem', textAlign: 'center' }}>
          🔒 Demo only — no real payment is processed.
        </p>
      </div>
    </div>
  )
}
