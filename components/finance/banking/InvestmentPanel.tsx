'use client'

import { useState } from 'react'
import {
  INVEST_PRODUCTS,
  advanceInvestment,
  getInvestProduct,
  openInvestment,
  projectReturn,
  withdrawInvestment,
  type InvestProduct,
} from '@/lib/finance'
import type { PanelProps } from './BankingClient'
import styles from './banking.module.css'

export function InvestmentPanel({ profile, state, coins, pushToast }: PanelProps) {
  const [sel, setSel] = useState<InvestProduct>('saving')
  const [amt, setAmt] = useState<number>(1000)

  const opened = profile.openedCard
  const def = getInvestProduct(sel)
  const projected = projectReturn(amt, def.apyPct, def.periodDays)

  function handleOpen() {
    const res = openInvestment(sel, amt)
    if (res.ok) pushToast(`Invested ${amt.toLocaleString()} 🪙 in ${def.name}`)
    else pushToast(res.reason, true)
  }

  function handleAdvance(id: string) {
    const inv = state.investments.find((i) => i.id === id)
    const wasMatured = inv?.matured ?? false
    const willMature = inv ? inv.elapsedDays + 1 >= inv.periodDays : false
    const res = advanceInvestment(id, 1)
    if (res.ok) {
      if (!wasMatured && willMature) pushToast('Investment matured! You can withdraw now.')
    } else pushToast('Could not advance.', true)
  }

  function handleWithdraw(id: string) {
    const res = withdrawInvestment(id)
    if (res.ok) pushToast('Investment withdrawn with interest!')
    else pushToast(res.reason, true)
  }

  return (
    <div className={styles.panel}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Investments</h2>
        <span className={styles.coinPill}>
          <span>🪙</span> {coins.toLocaleString()}
        </span>
      </div>

      {!opened ? (
        <p className={styles.emptyNote} style={{ padding: '1.5rem 0' }}>
          Open a card first to start investing.
        </p>
      ) : (
        <>
          {/* Product picker */}
          <div className={styles.productRow}>
            {INVEST_PRODUCTS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`${styles.itemRow} ${sel === p.id ? styles.itemRowSelected : ''}`}
                style={{ flexDirection: 'column', alignItems: 'stretch', cursor: 'pointer', gap: '0.3rem' }}
                onClick={() => setSel(p.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className={styles.itemIcon}>{p.icon}</span>
                  <span
                    className={styles.itemVal}
                    style={{
                      color:
                        p.risk === 'Low' ? '#6cff9c' : p.risk === 'Medium' ? '#ffd700' : '#ff6b6b',
                    }}
                  >
                    {p.risk}
                  </span>
                </div>
                <span className={styles.itemName}>{p.name}</span>
                <span className={styles.muted} style={{ fontSize: '0.78rem' }}>
                  APY {p.apyPct}% · {p.periodDays}d
                </span>
                <span className={styles.muted} style={{ fontSize: '0.72rem' }}>
                  {p.blurb}
                </span>
              </button>
            ))}
          </div>

          {/* Deposit form */}
          <div className={styles.subPanel}>
            <h3 className={styles.sectionTitle} style={{ marginBottom: '0.7rem' }}>
              Open a {def.name} position
            </h3>
            <div className={styles.field}>
              <label className={styles.label}>Deposit amount</label>
              <div className={styles.inputRow}>
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  max={coins}
                  value={amt}
                  onChange={(e) => setAmt(Math.max(0, Number(e.target.value) || 0))}
                />
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGold}`}
                  onClick={handleOpen}
                  disabled={amt <= 0 || amt > coins}
                >
                  Invest
                </button>
              </div>
            </div>
            <div className={styles.kv}>
              <span className={styles.kvK}>APY</span>
              <span className={styles.kvV}>{def.apyPct}%</span>
            </div>
            <div className={styles.kv}>
              <span className={styles.kvK}>Term</span>
              <span className={styles.kvV}>{def.periodDays} days</span>
            </div>
            <div className={styles.kv}>
              <span className={styles.kvK}>Projected return after term</span>
              <span className={styles.kvV} style={{ color: '#6cff9c' }}>
                +{Math.round(projected).toLocaleString()} 🪙
              </span>
            </div>
            <p className={styles.muted} style={{ marginTop: '0.5rem' }}>
              Total at maturity: ≈ {Math.round(amt + projected).toLocaleString()} 🪙
            </p>
          </div>

          {/* Open positions */}
          <div className={styles.subPanel}>
            <h3 className={styles.sectionTitle} style={{ marginBottom: '0.6rem' }}>
              My Positions ({state.investments.filter((i) => !i.withdrawn).length})
            </h3>
            {state.investments.filter((i) => !i.withdrawn).length === 0 ? (
              <p className={styles.emptyNote}>No open positions.</p>
            ) : (
              state.investments
                .filter((i) => !i.withdrawn)
                .map((i) => {
                  const d = getInvestProduct(i.product)
                  const prog = Math.round((i.elapsedDays / i.periodDays) * 100)
                  const est = projectReturn(i.principal, i.apyPct, i.periodDays)
                  return (
                    <div key={i.id} className={styles.itemRow} style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className={styles.itemName}>
                          {d.icon} {d.name} · {i.apyPct}% APY
                        </span>
                        <span className={styles.itemVal}>{i.principal.toLocaleString()} 🪙</span>
                      </div>
                      <div className={styles.progress}>
                        <div className={styles.progressFill} style={{ width: `${prog}%` }} />
                      </div>
                      <div className={styles.muted} style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>
                          Day {i.elapsedDays}/{i.periodDays} {i.matured ? '· Matured' : ''}
                        </span>
                        <span>est. payout ≈ {Math.round(i.principal + est).toLocaleString()} 🪙</span>
                      </div>
                      <div className={styles.btnRow}>
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
                          onClick={() => handleAdvance(i.id)}
                          disabled={i.matured}
                        >
                          +1 day
                        </button>
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.btnSm} ${styles.btnGold}`}
                          onClick={() => handleWithdraw(i.id)}
                          disabled={!i.matured}
                        >
                          Withdraw
                        </button>
                      </div>
                    </div>
                  )
                })
            )}
          </div>
        </>
      )}
    </div>
  )
}
