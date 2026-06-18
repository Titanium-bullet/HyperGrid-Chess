'use client'

import { useMemo, useState } from 'react'
import {
  getOwnedCollateral,
  getSecuredTerms,
  getUnsecuredTerms,
  monthlyPayment,
  openSecuredLoan,
  openUnsecuredLoan,
  repayLoan,
} from '@/lib/finance'
import type { PanelProps } from './BankingClient'
import styles from './banking.module.css'

export function LoanPanel({ profile, state, coins, pushToast, setSelectedCard: _setSelectedCard }: PanelProps) {
  const tier = profile.openedCard
  const unsecured = getUnsecuredTerms(tier)
  const secured = getSecuredTerms(tier)
  const collateral = useMemo(() => getOwnedCollateral(), [state.loans])

  const [unsecuredAmt, setUnsecuredAmt] = useState<number>(unsecured.eligible ? Math.round(unsecured.maxAmount / 2) : 0)
  const [securedSel, setSecuredSel] = useState<Set<string>>(new Set())
  const [securedAmt, setSecuredAmt] = useState<number>(0)

  const collateralValue = useMemo(
    () => collateral.filter((c) => securedSel.has(c.id)).reduce((s, c) => s + c.value, 0),
    [collateral, securedSel]
  )
  const securedMax = secured.eligible ? Math.floor(collateralValue * secured.ltv) : 0

  const existingDebt = useMemo(
    () => state.loans.filter((l) => l.kind === 'unsecured').reduce((s, l) => s + l.remaining, 0),
    [state.loans]
  )
  const availableCredit = unsecured.eligible ? Math.max(0, unsecured.maxAmount - existingDebt) : 0
  const pledgedIds = useMemo(() => {
    const set = new Set<string>()
    for (const l of state.loans) if (l.kind === 'secured') for (const id of l.collateralIds ?? []) set.add(id)
    return set
  }, [state.loans])

  const unsecuredMonthly =
    unsecured.eligible && unsecuredAmt > 0
      ? monthlyPayment(unsecuredAmt, unsecured.apr, unsecured.termMonths)
      : 0
  const securedMonthly =
    secured.eligible && securedAmt > 0 ? monthlyPayment(securedAmt, secured.apr, secured.termMonths) : 0

  function toggleCollateral(id: string) {
    setSecuredSel((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleUnsecured() {
    const res = openUnsecuredLoan(unsecuredAmt)
    if (res.ok) pushToast(`Loan approved: +${unsecuredAmt.toLocaleString()} 🪙`)
    else pushToast(res.reason, true)
  }

  function handleSecured() {
    const res = openSecuredLoan(securedAmt, Array.from(securedSel))
    if (res.ok) {
      pushToast(`Collateral loan approved: +${securedAmt.toLocaleString()} 🪙`)
      setSecuredSel(new Set())
      setSecuredAmt(0)
    } else pushToast(res.reason, true)
  }

  function handleRepay(id: string, remaining: number) {
    const res = repayLoan(id, remaining)
    if (res.ok) {
      pushToast(res.settled ? 'Loan fully repaid!' : 'Payment applied.')
    } else if (!res.ok) pushToast(res.reason, true)
  }

  return (
    <div className={styles.panel}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Loans</h2>
        <span className={styles.coinPill}>
          <span>🪙</span> {coins.toLocaleString()}
        </span>
      </div>

      {/* ---------- Unsecured ---------- */}
      <div className={styles.subPanel}>
        <h3 className={styles.sectionTitle} style={{ color: '#ff6b6b', marginBottom: '0.6rem' }}>
          Unsecured Loan
        </h3>
        {unsecured.eligible ? (
          <>
            <div className={styles.kv}>
              <span className={styles.kvK}>Card tier</span>
              <span className={styles.kvV}>{tier}</span>
            </div>
            <div className={styles.kv}>
              <span className={styles.kvK}>Credit limit</span>
              <span className={styles.kvV}>{unsecured.maxAmount.toLocaleString()} 🪙</span>
            </div>
            <div className={styles.kv}>
              <span className={styles.kvK}>Available credit</span>
              <span className={styles.kvV} style={{ color: '#6cff9c' }}>
                {availableCredit.toLocaleString()} 🪙
              </span>
            </div>
            <div className={styles.kv}>
              <span className={styles.kvK}>APR</span>
              <span className={styles.kvV}>{unsecured.apr}%</span>
            </div>
            <div className={styles.kv}>
              <span className={styles.kvK}>Term</span>
              <span className={styles.kvV}>{unsecured.termMonths} months</span>
            </div>

            <div className={styles.field} style={{ marginTop: '0.8rem' }}>
              <label className={styles.label}>Amount to borrow</label>
              <div className={styles.inputRow}>
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  max={availableCredit}
                  value={unsecuredAmt}
                  onChange={(e) => setUnsecuredAmt(Math.max(0, Number(e.target.value) || 0))}
                />
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnRed}`}
                  onClick={handleUnsecured}
                  disabled={unsecuredAmt <= 0 || unsecuredAmt > availableCredit}
                >
                  Apply
                </button>
              </div>
            </div>
            {unsecuredMonthly > 0 && (
              <p className={styles.muted}>Estimated monthly payment: ≈ {Math.round(unsecuredMonthly).toLocaleString()} 🪙 / mo</p>
            )}
          </>
        ) : (
          <p className={styles.emptyNote}>
            Unsecured loans are available to <strong>Gold</strong> and <strong>Platinum</strong> cardholders only.
            Upgrade your card to unlock instant credit.
          </p>
        )}
      </div>

      {/* ---------- Secured ---------- */}
      <div className={styles.subPanel}>
        <h3 className={styles.sectionTitle} style={{ color: '#ffd700', marginBottom: '0.6rem' }}>
          Secured (Collateral) Loan
        </h3>
        {secured.eligible ? (
          <>
            <div className={styles.kv}>
              <span className={styles.kvK}>LTV (loan-to-value)</span>
              <span className={styles.kvV}>{Math.round(secured.ltv * 100)}%</span>
            </div>
            <div className={styles.kv}>
              <span className={styles.kvK}>APR</span>
              <span className={styles.kvV}>{secured.apr}%</span>
            </div>
            <div className={styles.kv}>
              <span className={styles.kvK}>Term</span>
              <span className={styles.kvV}>{secured.termMonths} months</span>
            </div>

            <label className={styles.label} style={{ marginTop: '0.8rem' }}>
              Select collateral from your Shop items
            </label>
            {collateral.length === 0 ? (
              <p className={styles.emptyNote}>
                You have no Shop items to use as collateral. Visit the Shop to acquire boards, pieces or
                backgrounds.
              </p>
            ) : (
              <>
                <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: '0.6rem' }}>
                  {collateral.map((c) => {
                    const locked = pledgedIds.has(c.id)
                    return (
                      <div
                        key={c.id}
                        className={`${styles.itemRow} ${securedSel.has(c.id) ? styles.itemRowSelected : ''}`}
                        style={locked ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                        onClick={() => {
                          if (!locked) toggleCollateral(c.id)
                        }}
                      >
                        <span className={styles.itemIcon}>{c.icon}</span>
                        <span className={styles.itemName}>
                          {c.name}
                          {locked ? ' 🔒' : ''}
                        </span>
                        <span className={styles.itemVal}>
                          {locked ? 'Pledged' : `≈ ${c.value.toLocaleString()} 🪙`}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div className={styles.kv}>
                  <span className={styles.kvK}>Collateral value</span>
                  <span className={styles.kvV}>{collateralValue.toLocaleString()} 🪙</span>
                </div>
                <div className={styles.kv}>
                  <span className={styles.kvK}>Max borrowable</span>
                  <span className={styles.kvV} style={{ color: '#ffd700' }}>
                    {securedMax.toLocaleString()} 🪙
                  </span>
                </div>

                <div className={styles.field} style={{ marginTop: '0.8rem' }}>
                  <label className={styles.label}>Amount to borrow</label>
                  <div className={styles.inputRow}>
                    <input
                      className={styles.input}
                      type="number"
                      min={0}
                      max={securedMax}
                      value={securedAmt}
                      onChange={(e) => setSecuredAmt(Math.max(0, Number(e.target.value) || 0))}
                    />
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnGold}`}
                      onClick={handleSecured}
                      disabled={securedAmt <= 0 || securedAmt > securedMax || securedSel.size === 0}
                    >
                      Apply
                    </button>
                  </div>
                </div>
                {securedMonthly > 0 && (
                  <p className={styles.muted}>
                    Estimated monthly payment: ≈ {Math.round(securedMonthly).toLocaleString()} 🪙 / mo
                  </p>
                )}
              </>
            )}
          </>
        ) : (
          <p className={styles.emptyNote}>Open any card first to use collateral loans.</p>
        )}
      </div>

      {/* ---------- Open loans ---------- */}
      <div className={styles.subPanel}>
        <h3 className={styles.sectionTitle} style={{ marginBottom: '0.6rem' }}>
          Active Loans ({state.loans.length})
        </h3>
        {state.loans.length === 0 ? (
          <p className={styles.emptyNote}>No active loans.</p>
        ) : (
          state.loans.map((l) => (
            <div key={l.id} className={styles.itemRow} style={{ cursor: 'default', alignItems: 'flex-start', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span className={styles.itemName}>
                  {l.kind === 'unsecured' ? 'Unsecured' : 'Secured'} · {l.tier} · {l.apr}% APR
                </span>
                <span className={styles.itemVal}>{l.remaining.toLocaleString()} 🪙</span>
              </div>
              {l.remaining > l.principal && (
                <div style={{ width: '100%', fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)' }}>
                  Borrowed {l.principal.toLocaleString()} 🪙 · interest {(l.remaining - l.principal).toLocaleString()} 🪙
                </div>
              )}
              <div className={styles.btnRow}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
                  onClick={() => handleRepay(l.id, l.remaining)}
                >
                  Repay all
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSm}`}
                  onClick={() => handleRepay(l.id, Math.ceil(l.remaining / l.termMonths))}
                >
                  Pay 1 installment
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
