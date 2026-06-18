'use client'

import { useState } from 'react'
import {
  LIFE_PRESET,
  PERK_PRICES,
  advanceLifeDay,
  cancelLifePolicy,
  lifeTotals,
  openLifePolicy,
  purchasePerk,
  type LifeParams,
  type PerkKey,
} from '@/lib/finance'
import type { PanelProps } from './BankingClient'
import styles from './banking.module.css'

const PERKS: Array<{ key: PerkKey; title: string; desc: string; icon: string }> = [
  { key: 'noRatingLoss', title: 'No Rating Loss', desc: 'Protect your rating points on the next defeat', icon: '🛡' },
  { key: 'noCoinLoss', title: 'No Coin Loss', desc: 'Protect your coin balance on the next defeat', icon: '🪙' },
]

export function InsurancePanel({ profile, state, coins, pushToast }: PanelProps) {
  const opened = profile.openedCard
  const policy = state.lifePolicy
  const [premium, setPremium] = useState<number>(LIFE_PRESET.premium)
  const params: LifeParams = { ...LIFE_PRESET, premium }

  function handleOpenPolicy() {
    const res = openLifePolicy(params)
    if (res.ok) pushToast(`Life policy opened (-${params.premium.toLocaleString()} 🪙)`)
    else pushToast(res.reason, true)
  }

  function handleAdvance() {
    const res = advanceLifeDay()
    if (res.ok) {
      pushToast(res.matured ? `Maturity paid! +${policy!.params.maturity.toLocaleString()} 🪙` : `Annuity paid: +${policy!.params.dailyAnnuity.toLocaleString()} 🪙`)
    } else pushToast(res.reason, true)
  }

  function handleCancel() {
    cancelLifePolicy()
    pushToast('Life policy cancelled.')
  }

  function handlePurchase(key: PerkKey) {
    const res = purchasePerk(key)
    if (res.ok) pushToast('Protection purchased — active for your next defeat.')
    else pushToast(res.reason, true)
  }

  const totals = policy ? lifeTotals(policy.params, policy.elapsedDays) : null

  return (
    <div className={styles.panel}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Insurance</h2>
        <span className={styles.coinPill}>
          <span>🪙</span> {coins.toLocaleString()}
        </span>
      </div>

      <p className={styles.muted} style={{ marginBottom: '0.4rem' }}>
        One-time purchases — each perk is consumed after it protects you once. No rating system is live
        yet, so perks are simply held as active until ELO launches.
      </p>

      {/* ---------- One-time protection perks ---------- */}
      <div className={styles.subPanel}>
        <h3 className={styles.sectionTitle} style={{ marginBottom: '0.6rem' }}>
          Chess Protection
        </h3>
        {PERKS.map((perk) => {
          const owned = !!state.toggles[perk.key]
          const price = PERK_PRICES[perk.key]
          const affordable = coins >= price
          return (
            <div key={perk.key} className={styles.perkRow}>
              <div className={styles.perkText}>
                <p className={styles.perkTitle}>
                  <span className={styles.perkIcon}>{perk.icon}</span>
                  {perk.title}
                </p>
                <p className={styles.perkDesc}>{perk.desc}</p>
              </div>
              {owned ? (
                <span className={styles.ownedTag}>✓ Active</span>
              ) : (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSm} ${styles.btnPurple}`}
                  disabled={!opened || !affordable}
                  onClick={() => handlePurchase(perk.key)}
                >
                  {price.toLocaleString()} 🪙
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* ---------- Life insurance ---------- */}
      <div className={styles.subPanel}>
        <h3 className={styles.sectionTitle} style={{ color: '#ba55dc', marginBottom: '0.5rem' }}>
          Life Insurance
        </h3>
        <p className={styles.muted} style={{ marginBottom: '0.8rem' }}>
          Pay an upfront premium, then receive a daily annuity for {LIFE_PRESET.termDays} days plus a
          lump-sum maturity bonus at the end.
        </p>

        {!opened ? (
          <p className={styles.emptyNote}>Open a card first to purchase life insurance.</p>
        ) : !policy ? (
          <>
            <div className={styles.kv}>
              <span className={styles.kvK}>Premium (one-time)</span>
              <span className={styles.kvV}>{premium.toLocaleString()} 🪙</span>
            </div>
            <div className={styles.kv}>
              <span className={styles.kvK}>Daily annuity</span>
              <span className={styles.kvV}>{params.dailyAnnuity.toLocaleString()} 🪙 / day</span>
            </div>
            <div className={styles.kv}>
              <span className={styles.kvK}>Term</span>
              <span className={styles.kvV}>{params.termDays} days</span>
            </div>
            <div className={styles.kv}>
              <span className={styles.kvK}>Maturity bonus</span>
              <span className={styles.kvV}>{params.maturity.toLocaleString()} 🪙</span>
            </div>
            <div className={styles.kv}>
              <span className={styles.kvK}>Total returned</span>
              <span className={styles.kvV} style={{ color: '#6cff9c' }}>
                {(params.dailyAnnuity * params.termDays + params.maturity).toLocaleString()} 🪙
              </span>
            </div>
            <div className={styles.field} style={{ marginTop: '0.8rem' }}>
              <label className={styles.label}>Custom premium (optional)</label>
              <input
                className={styles.input}
                type="number"
                min={1000}
                value={premium}
                onChange={(e) => setPremium(Math.max(1000, Number(e.target.value) || 0))}
              />
            </div>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPurple}`}
              onClick={handleOpenPolicy}
              disabled={premium > coins}
            >
              Buy Policy ({premium.toLocaleString()} 🪙)
            </button>
          </>
        ) : (
          <>
            <div className={styles.kv}>
              <span className={styles.kvK}>Premium paid</span>
              <span className={styles.kvV}>{policy.params.premium.toLocaleString()} 🪙</span>
            </div>
            <div className={styles.kv}>
              <span className={styles.kvK}>Daily annuity</span>
              <span className={styles.kvV}>{policy.params.dailyAnnuity.toLocaleString()} 🪙 / day</span>
            </div>
            <div className={styles.kv}>
              <span className={styles.kvK}>Maturity bonus</span>
              <span className={styles.kvV}>{policy.params.maturity.toLocaleString()} 🪙</span>
            </div>

            <div style={{ marginTop: '0.9rem' }}>
              <div className={styles.muted} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.35rem' }}>
                <span>
                  Day {policy.elapsedDays}/{policy.params.termDays}
                </span>
                <span>{totals?.progressPct}%</span>
              </div>
              <div className={styles.progress}>
                <div className={styles.progressFill} style={{ width: `${totals?.progressPct ?? 0}%` }} />
              </div>
            </div>

            {totals && (
              <div className={styles.kv} style={{ marginTop: '0.8rem' }}>
                <span className={styles.kvK}>Total received so far</span>
                <span className={styles.kvV} style={{ color: '#6cff9c' }}>
                  {totals.received.toLocaleString()} 🪙
                </span>
              </div>
            )}
            {totals && (
              <div className={styles.kv}>
                <span className={styles.kvK}>Net (received − premium)</span>
                <span className={styles.kvV} style={{ color: totals.net >= 0 ? '#6cff9c' : '#ff6b6b' }}>
                  {totals.net >= 0 ? '+' : ''}
                  {totals.net.toLocaleString()} 🪙
                </span>
              </div>
            )}

            <div className={styles.btnRow} style={{ marginTop: '0.9rem' }}>
              {policy.matured ? (
                <span className={styles.muted} style={{ alignSelf: 'center' }}>
                  ✓ Policy matured — all payouts complete.
                </span>
              ) : (
                <button type="button" className={`${styles.btn} ${styles.btnPurple}`} onClick={handleAdvance}>
                  Advance 1 day (+{policy.params.dailyAnnuity.toLocaleString()} 🪙)
                </button>
              )}
              <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={handleCancel}>
                Cancel policy
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
