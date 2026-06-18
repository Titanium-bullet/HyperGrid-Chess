'use client'

import { useState } from 'react'
import { CARDS, getCardDef, projectReturn, saveProfile } from '@/lib/finance'
import { asset } from '@/lib/assets'
import { CardFace } from './CardFace'
import type { PanelProps } from './BankingClient'
import styles from './banking.module.css'

const PERKS: Record<string, string[]> = {
  everyday: [
    'No monthly keeping fees',
    'Free Titaium-pay®',
    'Scam protection',
  ],
  plus: [
    'Everything in Everyday',
    '1% cashback on shopping',
    'Priority support',
  ],
  gold: [
    'Everything in Plus',
    '2% cashback on shopping',
    'Eligible for unsecured loans',
    'Unlimited lounge access',
  ],
  platinum: [
    'Everything in Gold',
    '3% cashback on shopping',
    'Concierge service 24/7',
    'Lowest loan rate + exclusive investment options',
  ],
  aesculapius: [
    'Everything in Platinum + 5% cashback to charity',
    'Unlimited spending',
    'Private vault transfers',
    'Rod-of-Asclepius concierge',
  ],
}

export function CardsPanel({ profile, state, coins, selectedCard, setSelectedCard, goToTab, pushToast }: PanelProps) {
  const opened = profile.openedCard
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const view = selectedCard ?? opened ?? 'everyday'
  const def = getCardDef(view)
  const isActive = opened === view
  const perks = PERKS[def.id] ?? []

  const debt = state.loans.reduce((s, l) => s + l.remaining, 0)
  const investmentsValue = state.investments
    .filter((i) => !i.withdrawn)
    .reduce((s, i) => s + i.principal + projectReturn(i.principal, i.apyPct, i.periodDays), 0)
  const totalAssets = coins + investmentsValue

  const [loungeOpen, setLoungeOpen] = useState(false)
  const [loungeImgOk, setLoungeImgOk] = useState(true)
  const loungeEligible = opened === 'gold' || opened === 'platinum' || opened === 'aesculapius'

  return (
    <div className={styles.panel}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Card Details</h2>
        {opened && <span className={styles.muted}>Active: {getCardDef(opened).name}</span>}
      </div>

      {!opened ? (
        <p className={styles.emptyNote} style={{ padding: '1.5rem 0' }}>
          You have no active card yet. Return to the Finance menu to open one and start using Bank of
          Hypergrid services.
        </p>
      ) : (
        <>
          <div className={styles.grid2} style={{ marginTop: '0.5rem', alignItems: 'start' }}>
            <div className={styles.faceWrap} style={{ margin: 0 }}>
              <CardFace tier={view} holder={profile.name} locked={false} chip="none" />
            </div>
            <div className={styles.balanceBlock}>
              <div className={styles.balanceLabel}>Balance</div>
              <div className={styles.balanceBig}>{def.id === 'aesculapius' ? '∞' : `${coins.toLocaleString()} 🪙`}</div>
              <div className={styles.balanceRow}>
                <span className={styles.kvK}>Debt</span>
                <span style={{ color: '#ff6b6b', fontWeight: 700 }}>
                  {Math.round(debt).toLocaleString()} 🪙
                </span>
              </div>
              <div className={styles.balanceRow}>
                <span className={styles.kvK}>Total assets</span>
                <span style={{ color: '#6cff9c', fontWeight: 700 }}>
                  {def.id === 'aesculapius' ? '∞' : `${Math.round(totalAssets).toLocaleString()} 🪙`}
                </span>
              </div>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSm}`}
                style={{ marginTop: '0.9rem', width: '100%' }}
                onClick={() => goToTab('exchange')}
              >
                Currency Exchange
              </button>
              {loungeEligible && (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
                  style={{ marginTop: '0.9rem', width: '100%' }}
                  onClick={() => {
                    setLoungeImgOk(true)
                    setLoungeOpen(true)
                  }}
                >
                  Access Lounge
                </button>
              )}
            </div>
          </div>

          <div className={styles.grid2} style={{ marginTop: '1rem' }}>
            <div className={styles.subPanel} style={{ margin: 0 }}>
              <div className={styles.kv}>
                <span className={styles.kvK}>Cardholder</span>
                <span className={styles.kvV}>{profile.name || '—'}</span>
              </div>
              <div className={styles.kv}>
                <span className={styles.kvK}>Card no.</span>
                <span className={styles.kvV}>
                  •••• {String(def.id).slice(0, 4).padStart(4, '0').toUpperCase()}
                </span>
              </div>
              <div className={styles.kv}>
                <span className={styles.kvK}>Type</span>
                <span className={styles.kvV}>{def.payLabel}</span>
              </div>
              <div className={styles.kv}>
                <span className={styles.kvK}>{def.kind === 'credit' ? 'Credit limit' : 'Available'}</span>
                <span className={styles.kvV}>
                  {(def.kind === 'credit' ? def.creditLimit : def.startingBalance) >= Number.MAX_SAFE_INTEGER
                    ? 'Unlimited'
                    : `${(def.kind === 'credit' ? def.creditLimit : def.startingBalance).toLocaleString()} 🪙`}
                </span>
              </div>
              <div className={styles.kv}>
                <span className={styles.kvK}>Status</span>
                <span className={styles.kvV} style={{ color: isActive ? '#6cff9c' : '#ff6b6b' }}>
                  {isActive ? 'Active' : 'Locked'}
                </span>
              </div>
              {!isActive && (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSm}`}
                  style={{ marginTop: '0.7rem', width: '100%' }}
                  onClick={() => {
                    saveProfile({ openedCard: view })
                    pushToast(`${def.name} set as your default card`)
                  }}
                >
                  Set card default
                </button>
              )}
            </div>

            <div className={styles.subPanel} style={{ margin: 0 }}>
              <h3 className={styles.sectionTitle} style={{ marginBottom: '0.6rem' }}>
                Perks &amp; Benefits
              </h3>
              {perks.map((p) => (
                <div key={p} className={styles.kv}>
                  <span className={styles.kvK}>★ {p}</span>
                  <span className={styles.kvV} style={{ color: def.accent }}>
                    ✓
                  </span>
                </div>
              ))}
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSm}`}
                style={{ marginTop: '0.9rem', width: '100%' }}
                onClick={() => setSwitcherOpen(true)}
              >
                Switch Card
              </button>
            </div>
          </div>
        </>
      )}

      {/* Transaction History placeholder */}
      <div className={styles.subPanel}>
        <h3 className={styles.sectionTitle} style={{ marginBottom: '0.8rem' }}>
          Transaction History
        </h3>
        <div className={styles.placeholderBox}>
          <span className={styles.placeholderIcon}>🧾</span>
          <span>No transactions yet</span>
          <span className={styles.muted} style={{ fontSize: '0.75rem' }}>
            Your purchases, transfers and payments will appear here.
          </span>
        </div>
      </div>

      {/* Switch-card picker */}
      <div
        className={`${styles.switcherOverlay} ${switcherOpen ? styles.switcherOverlayShow : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setSwitcherOpen(false)
        }}
      >
        <div className={styles.switcherPanel}>
          <h3 className={styles.switcherTitle}>Switch Card</h3>
          <div className={styles.switcherGrid}>
            {CARDS.map((c) => {
              const active = opened === c.id
              const sel = view === c.id
              return (
                <div
                  key={c.id}
                  className={`${styles.switcherSlot} ${sel ? styles.switcherSlotSelected : ''}`}
                  onClick={() => {
                    setSelectedCard(c.id)
                    setSwitcherOpen(false)
                  }}
                >
                  <CardFace tier={c.id} holder={profile.name} locked={false} chip="small" />
                  <div className={styles.switcherCaption}>
                    {active ? '● Active' : 'Tap to view'}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ textAlign: 'center' }}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
              onClick={() => setSwitcherOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Lounge viewer (Gold & Platinum only) */}
      <div
        className={`${styles.loungeOverlay} ${loungeOpen ? styles.loungeOverlayShow : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setLoungeOpen(false)
        }}
      >
        <button
          type="button"
          className={styles.loungeClose}
          aria-label="Close lounge"
          onClick={() => setLoungeOpen(false)}
        >
          ✕
        </button>
        {loungeImgOk ? (
          <img
            className={styles.loungeImg}
            src={asset('/images/lounge.jpg')}
            alt="Airport Lounge"
            onError={() => setLoungeImgOk(false)}
          />
        ) : (
          <div className={styles.loungeFallback}>
            <span style={{ fontSize: '2.4rem' }}>🛋️</span>
            <span>Lounge image coming soon</span>
          </div>
        )}
      </div>
    </div>
  )
}
