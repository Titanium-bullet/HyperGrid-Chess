'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  getProfile,
  getState,
  type CardTier,
  type FinanceProfile,
  type FinanceState,
} from '@/lib/finance'
import { getCoins } from '@/lib/shop'
import { HYPERGRID_FINANCE_CHANGED, HYPERGRID_COINS_CHANGED } from '@/lib/events'
import styles from './banking.module.css'
import { CardsPanel } from './CardsPanel'
import { LoanPanel } from './LoanPanel'
import { ExchangePanel } from './ExchangePanel'
import { InvestmentPanel } from './InvestmentPanel'
import { InsurancePanel } from './InsurancePanel'

export type Tab = 'cards' | 'loan' | 'exchange' | 'investment' | 'insurance'

type Toast = { id: number; msg: string; err: boolean }

const DEFAULT_PROFILE: FinanceProfile = { name: '', openedCard: null, onboarded: false }
const DEFAULT_STATE: FinanceState = {
  loans: [],
  investments: [],
  lifePolicy: null,
  toggles: { noRatingLoss: false, noCoinLoss: false },
}

export type PanelProps = {
  profile: FinanceProfile
  state: FinanceState
  coins: number
  selectedCard: CardTier | null
  setSelectedCard: (c: CardTier) => void
  pushToast: (msg: string, err?: boolean) => void
  goToTab: (tab: Tab) => void
}

const TABS: Array<{ id: Tab; label: string; cls: string }> = [
  { id: 'cards', label: 'Cards', cls: styles.tabCards },
  { id: 'loan', label: 'Loan', cls: styles.tabLoan },
  { id: 'exchange', label: 'Exchange', cls: styles.tabExchange },
  { id: 'investment', label: 'Investment', cls: styles.tabInvestment },
  { id: 'insurance', label: 'Insurance', cls: styles.tabInsurance },
]

export function BankingClient() {
  const [profile, setProfile] = useState<FinanceProfile>(DEFAULT_PROFILE)
  const [fstate, setFstate] = useState<FinanceState>(DEFAULT_STATE)
  const [coins, setCoins] = useState<number>(0)
  const [activeTab, setActiveTab] = useState<Tab>('cards')
  const [selectedCard, setSelectedCard] = useState<CardTier | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  const refresh = useCallback(() => {
    const p = getProfile()
    setProfile(p)
    setFstate(getState())
    setCoins(getCoins())
    setSelectedCard((prev) => prev ?? p.openedCard)
  }, [])

  useEffect(() => {
    refresh()
    const onChange = () => refresh()
    window.addEventListener(HYPERGRID_FINANCE_CHANGED, onChange)
    window.addEventListener(HYPERGRID_COINS_CHANGED, onChange)
    return () => {
      window.removeEventListener(HYPERGRID_FINANCE_CHANGED, onChange)
      window.removeEventListener(HYPERGRID_COINS_CHANGED, onChange)
    }
  }, [refresh])

  const pushToast = useCallback((msg: string, err = false) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, msg, err }])
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 2600)
  }, [])

  const panelProps: PanelProps = {
    profile,
    state: fstate,
    coins,
    selectedCard,
    setSelectedCard,
    pushToast,
    goToTab: setActiveTab,
  }

  return (
    <>
      <div className={styles.sectionHead} style={{ maxWidth: 1000, width: '100%', position: 'relative', zIndex: 1, marginBottom: '0.4rem', justifyContent: 'center' }}>
        <h1 className={styles.heroTitle} style={{ margin: 0 }}>BANK OF HYPERGRID</h1>
      </div>
      <p className={styles.brand}>Banking &amp; Insurance</p>

      <div className={styles.pageWrap}>
        {/* ---------------- Tabs ---------------- */}
        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`${styles.tab} ${t.cls} ${activeTab === t.id ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ---------------- Panels ---------------- */}
        {activeTab === 'investment' && (
          <div className={styles.rateBlock}>
            <span className={styles.rateLabel}>Current Reserve Bank of Hypergrid cash rate target:</span>
            <span className={styles.rateValue}>4.35%</span>
          </div>
        )}
        {activeTab === 'cards' && <CardsPanel {...panelProps} />}
        {activeTab === 'loan' && <LoanPanel {...panelProps} />}
        {activeTab === 'exchange' && <ExchangePanel {...panelProps} />}
        {activeTab === 'investment' && <InvestmentPanel {...panelProps} />}
        {activeTab === 'insurance' && <InsurancePanel {...panelProps} />}

        <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
          <Link href="/finance" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}>
            &larr; Finance
          </Link>
        </div>
      </div>

      <div className={styles.toastWrap}>
        {toasts.map((t) => (
          <div key={t.id} className={`${styles.toast} ${t.err ? styles.toastErr : ''}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </>
  )
}
