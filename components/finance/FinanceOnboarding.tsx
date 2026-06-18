'use client'

import { useEffect, useState } from 'react'
import { CARDS, getCardDef, getProfile, saveProfile, type CardTier } from '@/lib/finance'
import { CardFace } from '@/components/finance/banking/CardFace'
import styles from './FinanceOnboarding.module.css'

export function FinanceOnboarding() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [card, setCard] = useState<CardTier | ''>('')

  useEffect(() => {
    const p = getProfile()
    if (!p.onboarded) {
      setName(p.name ?? '')
      setCard(p.openedCard ?? '')
      setOpen(true)
    }
  }, [])

  // Re-check if state is cleared elsewhere (e.g. achievements reset).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'hypergrid_finance_profile') {
        const p = getProfile()
        if (!p.onboarded && !open) {
          setName(p.name ?? '')
          setCard(p.openedCard ?? '')
          setOpen(true)
        }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [open])

  function handleConfirm() {
    const openedCard = card ? (card as CardTier) : null
    saveProfile({ name: name.trim(), openedCard, onboarded: true })
    setOpen(false)
  }

  function handleSkip() {
    saveProfile({ onboarded: true })
    setOpen(false)
  }

  const def = card ? getCardDef(card as CardTier) : null

  return (
    <div className={`${styles.overlay} ${open ? styles.show : ''}`} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.brand}>Bank of Hypergrid</div>
        <h2 className={styles.title}>Open Your Card</h2>
        <p className={styles.subtitle}>
          Welcome to Bank of Hypergrid. Tell us your name and pick a card to activate. You can skip and
          pay by cash instead.
        </p>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="fin-name">
            Name
          </label>
          <input
            id="fin-name"
            className={styles.input}
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            autoFocus
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="fin-card">
            Card
          </label>
          <select
            id="fin-card"
            className={styles.select}
            value={card}
            onChange={(e) => setCard(e.target.value as CardTier | '')}
          >
            <option value="">— Select a card —</option>
            {CARDS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.payLabel})
              </option>
            ))}
          </select>
        </div>

        <div className={styles.previewWrap}>
          {def ? (
            <CardFace tier={def.id} holder={name.trim() || 'Card holder'} />
          ) : (
            <div className={`${styles.preview} ${styles.previewDim}`}>
              <span className={styles.previewGlyph}>?</span>
              <div className={styles.previewMeta}>
                <div>No card selected</div>
                <div className={styles.previewPay}>Pay by cash</div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.btnRow}>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={handleSkip}>
            Skip
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleConfirm}
            disabled={!name.trim()}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
