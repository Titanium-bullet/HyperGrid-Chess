'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  SHOP_ITEMS,
  buy,
  buyGift,
  applyGift,
  donate,
  hasUnlimitedCard,
  equip,
  getCoins,
  getInventory,
  getAffinity,
  getRelationshipLevel,
  type Inventory,
  type ShopBoard,
  type ShopPiece,
  type ShopPowerup,
  type ShopBackground,
  type ShopGift,
} from '@/lib/shop'
import { getPaymentLabel, getProfile, type CardTier } from '@/lib/finance'
import { asset } from '@/lib/assets'
import { GIFT_EFFECTS, sendGift } from '@/lib/live-gift'
import { HYPERGRID_INVENTORY_CHANGED, HYPERGRID_AFFINITY_CHANGED, HYPERGRID_FINANCE_CHANGED } from '@/lib/events'
import { FinanceOnboarding } from '@/components/finance/FinanceOnboarding'
import { CardFace } from '@/components/finance/banking/CardFace'
import styles from './page.module.css'

const isLuxury = (id: string): boolean => Boolean((GIFT_EFFECTS as Record<string, unknown>)[id])

let payAudioCtx: AudioContext | null = null

function playPaySound() {
  if (typeof window === 'undefined') return
  try {
    const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }
    const AC = w.AudioContext || w.webkitAudioContext
    if (!AC) return
    let ctx = payAudioCtx
    if (!ctx) {
      ctx = new AC()
      payAudioCtx = ctx
    }
    if (ctx.state === 'suspended') void ctx.resume()
    const t0 = ctx.currentTime + 0.22
    const hit = (freq: number, start: number, dur: number, peak: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, start)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + dur + 0.02)
    }
    hit(990, t0, 0.18, 0.3)
    hit(1480, t0 + 0.11, 0.22, 0.28)
  } catch {
    // audio unavailable — overlay still plays silently
  }
}

type Category = 'boards' | 'pieces' | 'powerups' | 'backgrounds' | 'gifts'

/** Close an overlay when Escape is pressed while it is visible. */
function useEscapeClose(visible: boolean, onClose: () => void) {
  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, onClose])
}

type AiSelectProfile = {
  id: string
  name: string
  img: string
  color: string
}

const AI_SELECT_PROFILES: AiSelectProfile[] = [
  { id: '1', name: 'Nova', img: asset('/images/beginner.jpg'), color: 'rgba(0,255,255,0.9)' },
  { id: '2', name: 'Phantom', img: asset('/images/medium1.jpg'), color: 'rgba(249,202,36,0.9)' },
  { id: '3', name: 'Overlord', img: asset('/images/medium2.jpg'), color: 'rgba(233,69,96,0.9)' },
  { id: '4', name: 'HyperGrid', img: asset('/images/master.jpg'), color: 'rgba(186,85,211,0.9)' },
  { id: '5', name: 'Blind', img: asset('/images/blind.jpg'), color: 'rgba(0,255,136,0.9)' },
  { id: '6', name: 'Spectre', img: asset('/images/coach.jpg'), color: 'rgba(201,139,255,0.95)' },
]

type ToastEntry = {
  id: number
  msg: string
  error: boolean
  fading: boolean
}

const DEFAULT_INVENTORY: Inventory = {
  equippedBoard: 'theme-cyber',
  equippedPieces: 'pixel',
  equippedBackground: 'bg-nexus',
  boards: ['theme-cyber', 'theme-dark'],
  pieces: ['pixel'],
  backgrounds: ['bg-nexus', 'bg-basic'],
  powerups: { bestMove: 0, evalBar: 0, legalMoves: 0, undoPack: 0, threatAlert: 0 },
}

export default function ShopClient() {
  const router = useRouter()
  const [hydrated, setHydrated] = useState(false)
  const [currentCategory, setCurrentCategory] = useState<Category>('boards')
  const [coins, setCoins] = useState<number>(0)
  const [inv, setInv] = useState<Inventory>(DEFAULT_INVENTORY)
  const [toasts, setToasts] = useState<ToastEntry[]>([])
  const [giftAmount, setGiftAmount] = useState<number>(0)
  const [giftTarget, setGiftTarget] = useState<string>('')
  const [giftModalVisible, setGiftModalVisible] = useState(false)
  const [aiSelectVisible, setAiSelectVisible] = useState(false)
  const [pendingGiftId, setPendingGiftId] = useState<string | null>(null)
  const [donateVisible, setDonateVisible] = useState(false)
  const [donateAmount, setDonateAmount] = useState<number>(0)
  const [affinities, setAffinities] = useState<Record<string, number>>({})
  const [paymentLabel, setPaymentLabel] = useState<string>('')
  const [unlimited, setUnlimited] = useState(false)
  const [paySuccess, setPaySuccess] = useState<{ name: string; price: number } | null>(null)
  const [payVisible, setPayVisible] = useState(false)
  const [cardTier, setCardTier] = useState<CardTier | null>(null)
  const [confirmItem, setConfirmItem] = useState<{
    item: ShopBoard | ShopPiece | ShopPowerup | ShopBackground
    name: string
    price: number
  } | null>(null)

  const toastIdRef = useRef(0)
  const giftHideTimerRef = useRef<number | null>(null)
  const payHideTimerRef = useRef<number | null>(null)
  const timeoutsRef = useRef<Set<number>>(new Set())

  const refreshInventory = useCallback(() => {
    setInv(getInventory())
    setCoins(getCoins())
  }, [])

  const refreshAffinities = useCallback(() => {
    const aff: Record<string, number> = {}
    for (const p of AI_SELECT_PROFILES) aff[p.id] = getAffinity(p.id)
    setAffinities(aff)
  }, [])

  useEffect(() => {
    setHydrated(true)
    setCoins(getCoins())
    setInv(getInventory())
    setPaymentLabel(getPaymentLabel())
    setUnlimited(hasUnlimitedCard())
    setCardTier(getProfile().openedCard)
    const aff: Record<string, number> = {}
    for (const p of AI_SELECT_PROFILES) aff[p.id] = getAffinity(p.id)
    setAffinities(aff)
    const onInventoryChanged = () => refreshInventory()
    const onAffinityChanged = () => refreshAffinities()
    const onFinanceChanged = () => {
      setPaymentLabel(getPaymentLabel())
      setUnlimited(hasUnlimitedCard())
      setCardTier(getProfile().openedCard)
    }
    window.addEventListener(HYPERGRID_INVENTORY_CHANGED, onInventoryChanged)
    window.addEventListener(HYPERGRID_AFFINITY_CHANGED, onAffinityChanged)
    window.addEventListener(HYPERGRID_FINANCE_CHANGED, onFinanceChanged)
    const timeouts = timeoutsRef.current
    return () => {
      window.removeEventListener(HYPERGRID_INVENTORY_CHANGED, onInventoryChanged)
      window.removeEventListener(HYPERGRID_AFFINITY_CHANGED, onAffinityChanged)
      window.removeEventListener(HYPERGRID_FINANCE_CHANGED, onFinanceChanged)
      for (const id of timeouts) window.clearTimeout(id)
      timeouts.clear()
      if (giftHideTimerRef.current !== null) {
        window.clearTimeout(giftHideTimerRef.current)
        giftHideTimerRef.current = null
      }
      if (payHideTimerRef.current !== null) {
        window.clearTimeout(payHideTimerRef.current)
        payHideTimerRef.current = null
      }
    }
  }, [refreshInventory, refreshAffinities])

  const showToast = useCallback((msg: string, error = false) => {
    const id = ++toastIdRef.current
    setToasts((t) => [...t, { id, msg, error, fading: false }])
    const fadeTimer = window.setTimeout(() => {
      timeoutsRef.current.delete(fadeTimer)
      setToasts((t) => t.map((entry) => (entry.id === id ? { ...entry, fading: true } : entry)))
      const removeTimer = window.setTimeout(() => {
        timeoutsRef.current.delete(removeTimer)
        setToasts((t) => t.filter((entry) => entry.id !== id))
      }, 400)
      timeoutsRef.current.add(removeTimer)
    }, 2500)
    timeoutsRef.current.add(fadeTimer)
  }, [])

  const showGiftAnimation = useCallback((amount: number, aiName: string) => {
    if (giftHideTimerRef.current !== null) {
      window.clearTimeout(giftHideTimerRef.current)
      giftHideTimerRef.current = null
    }
    setGiftAmount(amount)
    setGiftTarget(aiName ? `Gifted to ${aiName}!` : '')
    // briefly reset to retrigger animation — flushSync commits the false update
    // before rAF schedules the true update, so the modal restarts its keyframes.
    flushSync(() => {
      setGiftModalVisible(false)
    })
    requestAnimationFrame(() => {
      setGiftModalVisible(true)
      const hideTimer = window.setTimeout(() => {
        timeoutsRef.current.delete(hideTimer)
        setGiftModalVisible(false)
        giftHideTimerRef.current = null
      }, 3000)
      giftHideTimerRef.current = hideTimer
      timeoutsRef.current.add(hideTimer)
    })
  }, [])

  const handleGiftModalClick = useCallback(() => {
    if (giftHideTimerRef.current !== null) {
      window.clearTimeout(giftHideTimerRef.current)
      giftHideTimerRef.current = null
    }
    setGiftModalVisible(false)
  }, [])

  const showPaySuccess = useCallback((name: string, price: number) => {
    if (payHideTimerRef.current !== null) {
      window.clearTimeout(payHideTimerRef.current)
      payHideTimerRef.current = null
    }
    playPaySound()
    setPaySuccess({ name, price })
    flushSync(() => {
      setPayVisible(false)
    })
    requestAnimationFrame(() => {
      setPayVisible(true)
      const hideTimer = window.setTimeout(() => {
        timeoutsRef.current.delete(hideTimer)
        setPayVisible(false)
        payHideTimerRef.current = null
      }, 3200)
      payHideTimerRef.current = hideTimer
      timeoutsRef.current.add(hideTimer)
    })
  }, [])

  const handlePayClick = useCallback(() => {
    if (payHideTimerRef.current !== null) {
      window.clearTimeout(payHideTimerRef.current)
      payHideTimerRef.current = null
    }
    setPayVisible(false)
  }, [])

  const closeAiSelect = useCallback(() => {
    setAiSelectVisible(false)
    setPendingGiftId(null)
  }, [])

  const closeDonate = useCallback(() => {
    setDonateVisible(false)
    setDonateAmount(0)
  }, [])

  const handleDonate = useCallback(() => {
    const res = donate(donateAmount)
    if (res.success) {
      const amt = donateAmount
      setCoins(res.coinsRemaining)
      setDonateVisible(false)
      setDonateAmount(0)
      showPaySuccess('Donation', amt)
    } else if (res.reason === 'insufficient_coins') {
      showToast('Not enough coins!', true)
    } else {
      showToast('Enter a valid amount.', true)
    }
  }, [donateAmount, showPaySuccess, showToast])

  const confirmGift = useCallback(
    (profile: AiSelectProfile) => {
      if (!pendingGiftId) return
      const result = applyGift(pendingGiftId, profile.id)
      if (result.success) {
        setAiSelectVisible(false)
        if (isLuxury(pendingGiftId)) {
          sendGift({ id: pendingGiftId, sender: 'You' })
        } else {
          showGiftAnimation(result.affinity, profile.name)
        }
        refreshAffinities()
        setPendingGiftId(null)
      }
    },
    [pendingGiftId, showGiftAnimation, refreshAffinities]
  )

  const doBuy = useCallback(
    (item: ShopBoard | ShopPiece | ShopPowerup | ShopBackground) => {
      const result = buy(currentCategory as 'boards' | 'pieces' | 'powerups' | 'backgrounds', item.id)
      if (result.success) {
        refreshInventory()
        showPaySuccess(result.item.name, item.price)
      } else if (result.reason === 'insufficient_coins') {
        showToast('Not enough coins!', true)
      } else if (result.reason === 'already_owned') {
        showToast('Already owned!', true)
      }
    },
    [currentCategory, refreshInventory, showToast, showPaySuccess]
  )

  const requestBuy = useCallback(
    (item: ShopBoard | ShopPiece | ShopPowerup | ShopBackground) => {
      if (item.price <= 0) {
        doBuy(item)
        return
      }
      setConfirmItem({ item, name: item.name, price: item.price })
    },
    [doBuy]
  )

  const confirmPurchase = useCallback(() => {
    if (!confirmItem) return
    const item = confirmItem.item
    setConfirmItem(null)
    doBuy(item)
  }, [confirmItem, doBuy])

  useEscapeClose(giftModalVisible, handleGiftModalClick)
  useEscapeClose(aiSelectVisible, closeAiSelect)
  useEscapeClose(donateVisible, closeDonate)
  useEscapeClose(Boolean(confirmItem), () => setConfirmItem(null))

  const handleBuyGift = useCallback(
    (item: ShopGift) => {
      const result = buyGift(item.id)
      if (result.success) {
        setCoins(result.coinsRemaining)
        showPaySuccess(item.name, item.price)
        const afterPay = () => {
          if (result.item.universal) {
            applyGift(item.id, '1')
            if (isLuxury(item.id)) {
              sendGift({ id: item.id, sender: 'You' })
            } else {
              showGiftAnimation(result.item.affinity, 'All AI')
            }
            refreshAffinities()
          } else {
            setPendingGiftId(item.id)
            setAiSelectVisible(true)
          }
        }
        const t = window.setTimeout(afterPay, 3200)
        timeoutsRef.current.add(t)
      } else if (result.reason === 'insufficient_coins') {
        showToast('Not enough coins!', true)
      }
    },
    [showPaySuccess, showGiftAnimation, showToast, refreshAffinities]
  )

  const handleEquip = useCallback(
    (id: string) => {
      if (currentCategory !== 'boards' && currentCategory !== 'pieces' && currentCategory !== 'backgrounds') return
      if (equip(currentCategory, id)) {
        refreshInventory()
        showToast('Equipped!')
      }
    },
    [currentCategory, refreshInventory, showToast]
  )

  const tabs = useMemo<Array<{ id: Category; label: string; tabClass: string }>>(
    () => [
      { id: 'boards', label: 'Boards', tabClass: styles.tabBoards },
      { id: 'pieces', label: 'Pieces', tabClass: styles.tabPieces },
      { id: 'powerups', label: 'Powerups', tabClass: styles.tabPowerups },
      { id: 'backgrounds', label: 'Backgrounds', tabClass: styles.tabBackgrounds },
      { id: 'gifts', label: 'Gifts', tabClass: styles.tabGifts },
    ],
    []
  )

  const affordCoins = unlimited ? Number.POSITIVE_INFINITY : coins

  return (
    <>
      <FinanceOnboarding />
      <div className={styles.pageTitle}>SHOP</div>
      <button
        type="button"
        className={styles.paymentCoinBar}
        onClick={() => router.push('/finance/banking')}
        title="Open bank"
      >
        <span className={styles.coinIcon}>{'\u{1FA99}'}</span>
        <span className={styles.coinAmount} aria-live="polite">
          {hydrated ? coins : <span className={styles.skeleton}>·····</span>}
        </span>
        <span className={styles.barDivider} />
        <span className={styles.barLabel}>
          Payment method {hydrated ? paymentLabel : <span className={styles.skeleton}>·········</span>}
        </span>
      </button>

      <div className={styles.pageContainer}>
        <div className={styles.filterTabs}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`${styles.filterTab} ${tab.tabClass} ${
                currentCategory === tab.id ? styles.active : ''
              }`}
              onClick={() => setCurrentCategory(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.shopGrid} data-cat={currentCategory}>
          {currentCategory === 'boards' &&
            SHOP_ITEMS.boards.map((item, idx) => (
              <BoardCard
                key={item.id}
                item={item}
                idx={idx}
                isOwned={inv.boards.includes(item.id)}
                isEquipped={inv.equippedBoard === item.id}
                coins={affordCoins}
                onBuy={() => requestBuy(item)}
                onEquip={() => handleEquip(item.id)}
              />
            ))}

          {currentCategory === 'pieces' &&
            SHOP_ITEMS.pieces.map((item, idx) => (
              <PieceCard
                key={item.id}
                item={item}
                idx={idx}
                isOwned={inv.pieces.includes(item.id)}
                isEquipped={inv.equippedPieces === item.id}
                coins={affordCoins}
                onBuy={() => requestBuy(item)}
                onEquip={() => handleEquip(item.id)}
              />
            ))}

          {currentCategory === 'powerups' &&
            SHOP_ITEMS.powerups.map((item, idx) => (
              <PowerupCard
                key={item.id}
                item={item}
                idx={idx}
                qty={inv.powerups[item.id] ?? 0}
                coins={affordCoins}
                onBuy={() => requestBuy(item)}
              />
            ))}

          {currentCategory === 'backgrounds' &&
            SHOP_ITEMS.backgrounds.map((item, idx) => (
              <BackgroundCard
                key={item.id}
                item={item}
                idx={idx}
                isOwned={inv.backgrounds.includes(item.id)}
                isEquipped={inv.equippedBackground === item.id}
                coins={affordCoins}
                onBuy={() => requestBuy(item)}
                onEquip={() => handleEquip(item.id)}
              />
            ))}

          {currentCategory === 'gifts' &&
            SHOP_ITEMS.gifts.map((item, idx) => (
              <GiftCard
                key={item.id}
                item={item}
                idx={idx}
                coins={affordCoins}
                onBuy={() => handleBuyGift(item)}
              />
            ))}

          {currentCategory === 'gifts' && (
            <DonateCard
              idx={SHOP_ITEMS.gifts.length}
              coins={coins}
              onDonate={() => {
                setDonateAmount(0)
                setDonateVisible(true)
              }}
            />
          )}
        </div>
      </div>

      <div className={styles.btnRow}>
        <Link href="/" className={styles.backBtn}>
          &larr; Main Menu
        </Link>
        <Link href="/about" className={`${styles.backBtn} ${styles.backBtnExplore}`}>
          &larr; Explore
        </Link>
      </div>

      <div className={styles.toastContainer}>
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${styles.shopToast} ${t.error ? styles.error : ''} ${
              t.fading ? styles.fadeOut : ''
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>

      <div
        className={`${styles.giftModalOverlay} ${giftModalVisible ? styles.show : ''}`}
        onClick={handleGiftModalClick}
        role="dialog"
        aria-modal="true"
        aria-label="Gift received"
      >
        <div className={styles.giftModalContent}>
          <div className={styles.giftBoxWrap}>
            <div>
              <div className={styles.giftBoxLid}></div>
              <div className={styles.giftBoxBody}></div>
            </div>
            <div className={styles.giftSparkles}></div>
          </div>
          <div className={styles.giftReveal}>
            <div className={styles.giftAffinityAmount}>{giftAmount > 0 ? `+${giftAmount}` : ''}</div>
            <div className={styles.giftAffinityLabel}>Affinity Points!</div>
            <div className={styles.giftAiTarget}>{giftTarget}</div>
          </div>
        </div>
      </div>

      <div
        className={`${styles.aiSelectOverlay} ${aiSelectVisible ? styles.show : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeAiSelect()
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Choose a recipient"
      >
        <div className={styles.aiSelectContent}>
          <h3 className={styles.aiSelectTitle}>Gift to who?</h3>
          <div className={styles.aiSelectGrid}>
            {AI_SELECT_PROFILES.map((profile) => {
              const aff = affinities[profile.id] ?? 0
              const rel = getRelationshipLevel(aff)
              return (
                <button
                  key={profile.id}
                  type="button"
                  className={styles.aiSelectBtn}
                  onClick={() => confirmGift(profile)}
                >
                  {/* legacy used <img> with the local image path; we keep <img> here
                      since this is a small profile thumbnail inside a modal grid. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={profile.img} alt={profile.name} className={styles.aiSelectBtnImg} />
                  <div className={styles.aiSelectBtnName} style={{ color: profile.color }}>
                    {profile.name}
                  </div>
                  <div className={styles.aiSelectAffinity} style={{ color: rel.color }}>
                    <span>{rel.icon}</span>
                    <span>{Math.round(aff)}</span>
                  </div>
                </button>
              )
            })}
          </div>
          <button type="button" className={styles.aiSelectCancel} onClick={closeAiSelect}>
            Cancel
          </button>
        </div>
      </div>

      <div
        className={`${styles.aiSelectOverlay} ${donateVisible ? styles.show : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeDonate()
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Donate to charity"
      >
        <div className={styles.aiSelectContent}>
          <h3 className={styles.aiSelectTitle}>Donate to Charity ❤️</h3>
          <p className={styles.donateBalance}>Balance: {coins.toLocaleString()} 🪙</p>
          <div className={styles.donateRow}>
            <input
              className={styles.donateInput}
              type="number"
              min={1}
              max={coins}
              value={donateAmount}
              onChange={(e) => setDonateAmount(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
            />
          </div>
          <div className={styles.donateQuick}>
            {[0.25, 0.5, 1].map((f) => (
              <button
                key={f}
                type="button"
                className={styles.aiSelectCancel}
                style={{ marginTop: 0 }}
                onClick={() => setDonateAmount(Math.max(0, Math.floor(coins * f)))}
              >
                {f === 1 ? 'All' : `${f * 100}%`}
              </button>
            ))}
          </div>
          <div className={styles.donateActions}>
            <button
              type="button"
              className={styles.aiSelectCancel}
              style={{ marginTop: 0 }}
              onClick={closeDonate}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`${styles.cardBtn} ${styles.buy}`}
              disabled={donateAmount <= 0 || donateAmount > coins}
              onClick={handleDonate}
            >
              Donate
            </button>
          </div>
        </div>
      </div>

      <div
        className={`${styles.payOverlay} ${payVisible ? styles.show : ''}`}
        onClick={handlePayClick}
      >
        {paySuccess && (
          <div
            className={`${styles.paySheet} ${unlimited ? styles.payTheme : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.payMethodRow}>
              {cardTier ? (
                <div className={styles.payCardWrap}>
                  <CardFace tier={cardTier} holder={getProfile().name} chip="small" showLock={false} />
                </div>
              ) : (
                <div className={styles.payMethod}>{hydrated ? paymentLabel || 'Apple Pay' : 'Apple Pay'}</div>
              )}
            </div>
            <div className={styles.payCheck}>
              <svg className={styles.payCheckSvg} viewBox="0 0 80 80" aria-hidden="true">
                <circle className={styles.payCheckCircle} cx="40" cy="40" r="34" />
                <path className={styles.payCheckMark} d="M24 41 L36 53 L57 30" pathLength={1} />
              </svg>
            </div>
            <div className={styles.payLabel}>Paid by Titanium-pay&reg;</div>
          </div>
        )}
      </div>

      <div
        className={`${styles.aiSelectOverlay} ${confirmItem ? styles.show : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setConfirmItem(null)
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Confirm purchase"
      >
        {confirmItem && (
          <div className={styles.aiSelectContent}>
            <h3 className={styles.aiSelectTitle}>Confirm Purchase</h3>
            <p className={styles.donateBalance}>
              Buy <strong style={{ color: '#fff' }}>{confirmItem.name}</strong> for{' '}
              <span style={{ color: '#ffd700' }}>
                {confirmItem.price.toLocaleString()} 🪙
              </span>
              ?
            </p>
            <p className={styles.mutedSmall} style={{ marginTop: '-0.2rem' }}>
              Balance after: {Math.max(0, coins - confirmItem.price).toLocaleString()} 🪙
            </p>
            <div className={styles.donateActions}>
              <button
                type="button"
                className={styles.aiSelectCancel}
                style={{ marginTop: 0 }}
                onClick={() => setConfirmItem(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.cardBtn} ${styles.buy}`}
                onClick={confirmPurchase}
              >
                Confirm
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

type BoardCardProps = {
  item: ShopBoard
  idx: number
  isOwned: boolean
  isEquipped: boolean
  coins: number
  onBuy: () => void
  onEquip: () => void
}

function BoardCard({ item, idx, isOwned, isEquipped, coins, onBuy, onEquip }: BoardCardProps) {
  const cardClass = `${styles.shopCard} ${isEquipped ? styles.equipped : isOwned ? styles.owned : ''}`
  const w = item.preview ? item.preview[0] : '#1a1a2e'
  const b = item.preview ? item.preview[1] : '#0f3460'

  return (
    <div className={cardClass} style={{ animationDelay: `${idx * 0.08}s` }}>
      <div className={styles.cardPreview}>
        <div className={styles.previewBoard}>
          {Array.from({ length: 8 }).map((_, sq) => (
            <div
              key={sq}
              className={styles.previewSquare}
              style={{ background: sq % 2 === 0 ? w : b }}
            />
          ))}
        </div>
      </div>
      <div className={styles.cardName}>{item.name}</div>
      <div className={styles.cardDesc}>{item.description}</div>
      <div className={styles.cardFooter}>
        <PriceTag price={item.price} />
        {isEquipped ? (
          <button
            type="button"
            disabled
            aria-label="Equipped"
            className={`${styles.cardBtn} ${styles.equippedBtn}`}
          >
            Equipped
          </button>
        ) : isOwned ? (
          <button type="button" className={`${styles.cardBtn} ${styles.equip}`} onClick={onEquip}>
            Equip
          </button>
        ) : (
          <button
            type="button"
            className={`${styles.cardBtn} ${styles.buy} ${coins < item.price ? styles.disabled : ''}`}
            disabled={coins < item.price}
            onClick={onBuy}
          >
            Buy
          </button>
        )}
      </div>
    </div>
  )
}

type PieceCardProps = {
  item: ShopPiece
  idx: number
  isOwned: boolean
  isEquipped: boolean
  coins: number
  onBuy: () => void
  onEquip: () => void
}

function PieceCard({ item, idx, isOwned, isEquipped, coins, onBuy, onEquip }: PieceCardProps) {
  const cardClass = `${styles.shopCard} ${isEquipped ? styles.equipped : isOwned ? styles.owned : ''}`
  return (
    <div className={cardClass} style={{ animationDelay: `${idx * 0.08}s` }}>
      <div className={`${styles.cardPreview} ${styles.cardPreviewSolid}`}>
        <div className={styles.previewPieces}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://lichess1.org/assets/piece/${item.id}/wK.svg`} alt="K" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://lichess1.org/assets/piece/${item.id}/wQ.svg`} alt="Q" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://lichess1.org/assets/piece/${item.id}/bK.svg`} alt="k" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://lichess1.org/assets/piece/${item.id}/bQ.svg`} alt="q" />
        </div>
      </div>
      <div className={styles.cardName}>{item.name}</div>
      <div className={styles.cardDesc}>{item.description}</div>
      <div className={styles.cardFooter}>
        <PriceTag price={item.price} />
        {isEquipped ? (
          <button
            type="button"
            disabled
            aria-label="Equipped"
            className={`${styles.cardBtn} ${styles.equippedBtn}`}
          >
            Equipped
          </button>
        ) : isOwned ? (
          <button type="button" className={`${styles.cardBtn} ${styles.equip}`} onClick={onEquip}>
            Equip
          </button>
        ) : (
          <button
            type="button"
            className={`${styles.cardBtn} ${styles.buy} ${coins < item.price ? styles.disabled : ''}`}
            disabled={coins < item.price}
            onClick={onBuy}
          >
            Buy
          </button>
        )}
      </div>
    </div>
  )
}

type BackgroundCardProps = {
  item: ShopBackground
  idx: number
  isOwned: boolean
  isEquipped: boolean
  coins: number
  onBuy: () => void
  onEquip: () => void
}

function BackgroundCard({ item, idx, isOwned, isEquipped, coins, onBuy, onEquip }: BackgroundCardProps) {
  const cardClass = `${styles.shopCard} ${isEquipped ? styles.equipped : isOwned ? styles.owned : ''}`
  const accent = item.preview ? item.preview[1] : '#00ffff'
  const glyph = item.id === 'bg-phantom' ? '\u265A' : item.id === 'bg-arcade' ? '\u265C' : '\u265E'
  return (
    <div className={cardClass} style={{ animationDelay: `${idx * 0.08}s` }}>
      <div
        className={`${styles.cardPreview} ${styles.cardPreviewSolid} ${styles.previewBackground}`}
        data-bg={item.id}
      >
        <span className={styles.previewGlyph} style={{ color: accent, textShadow: `0 0 12px ${accent}` }}>
          {glyph}
        </span>
      </div>
      <div className={styles.cardName}>
        {item.name}
        <span
          className={`${styles.tierBadge} ${item.tier === 'divine' ? styles.tierDivine : styles.tierNormal}`}
        >
          {item.tier === 'divine' ? 'Divine' : 'Normal'}
        </span>
      </div>
      <div className={styles.cardDesc}>{item.description}</div>
      <div className={styles.cardFooter}>
        <PriceTag price={item.price} />
        {isEquipped ? (
          <button
            type="button"
            disabled
            aria-label="Equipped"
            className={`${styles.cardBtn} ${styles.equippedBtn}`}
          >
            Equipped
          </button>
        ) : isOwned ? (
          <button type="button" className={`${styles.cardBtn} ${styles.equip}`} onClick={onEquip}>
            Equip
          </button>
        ) : (
          <button
            type="button"
            className={`${styles.cardBtn} ${styles.buy} ${coins < item.price ? styles.disabled : ''}`}
            disabled={coins < item.price}
            onClick={onBuy}
          >
            Buy
          </button>
        )}
      </div>
    </div>
  )
}

type PowerupCardProps = {
  item: ShopPowerup
  idx: number
  qty: number
  coins: number
  onBuy: () => void
}

function PowerupCard({ item, idx, qty, coins, onBuy }: PowerupCardProps) {
  const owned = qty > 0
  return (
    <div className={`${styles.shopCard} ${owned ? styles.owned : ''}`} style={{ animationDelay: `${idx * 0.08}s` }}>
      <div className={`${styles.cardPreview} ${styles.cardPreviewSolid}`}>
        <span className={styles.previewIcon}>{item.icon}</span>
      </div>
      <div className={styles.cardName}>{item.name}</div>
      <div className={styles.cardDesc}>{item.description}</div>
      <div className={styles.powerupQty}>
        {owned ? (
          <span className={styles.powerupActive}>&#10003; Active</span>
        ) : (
          <span>Not active</span>
        )}
      </div>
      <div className={styles.cardFooter}>
        <PriceTag price={item.price} />
        {owned ? (
          <button type="button" className={`${styles.cardBtn} ${styles.ownedBtn}`} disabled>
            &#10003; Owned
          </button>
        ) : (
          <button
            type="button"
            className={`${styles.cardBtn} ${styles.buy} ${coins < item.price ? styles.disabled : ''}`}
            disabled={coins < item.price}
            onClick={onBuy}
          >
            {item.price === 0 ? 'Activate' : 'Buy'}
          </button>
        )}
      </div>
    </div>
  )
}

type GiftCardProps = {
  item: ShopGift
  idx: number
  coins: number
  onBuy: () => void
}

function GiftCard({ item, idx, coins, onBuy }: GiftCardProps) {
  return (
    <div className={styles.shopCard} style={{ animationDelay: `${idx * 0.08}s` }}>
      <div className={`${styles.cardPreview} ${styles.cardPreviewSolid}`}>
        <span className={styles.previewIcon}>{item.icon}</span>
      </div>
      <div className={styles.cardName}>
        {item.name}
        {item.universal ? <span className={styles.giftCardBadge}>Universal</span> : null}
      </div>
      <div className={styles.cardDesc}>{item.description}</div>
      <div className={styles.powerupQty}>
        +{item.affinity} affinity{item.universal ? ' (ALL)' : ''}
      </div>
      <div className={styles.cardFooter}>
        <PriceTag price={item.price} />
        <button
          type="button"
          className={`${styles.cardBtn} ${styles.buy} ${coins < item.price ? styles.disabled : ''}`}
          disabled={coins < item.price}
          onClick={onBuy}
        >
          Buy
        </button>
      </div>
    </div>
  )
}

function DonateCard({ idx, coins, onDonate }: { idx: number; coins: number; onDonate: () => void }) {
  return (
    <div className={styles.shopCard} style={{ animationDelay: `${idx * 0.08}s` }}>
      <div className={`${styles.cardPreview} ${styles.cardPreviewSolid}`}>
        <span className={styles.previewIcon}>❤️</span>
      </div>
      <div className={styles.cardName}>Donate to Charity</div>
      <div className={styles.cardDesc}>Give any amount to those in need</div>
      <div className={styles.powerupQty}>No limit · pure goodwill</div>
      <div className={styles.cardFooter}>
        <span className={`${styles.cardPrice} ${styles.free}`}>Any amount</span>
        <button
          type="button"
          className={`${styles.cardBtn} ${styles.buy} ${coins <= 0 ? styles.disabled : ''}`}
          disabled={coins <= 0}
          onClick={onDonate}
        >
          Donate
        </button>
      </div>
    </div>
  )
}

function PriceTag({ price }: { price: number }) {
  if (price === 0) {
    return <span className={`${styles.cardPrice} ${styles.free}`}>Free</span>
  }
  return (
    <span className={styles.cardPrice}>
      <span className={styles.coinSm}>{'\u{1FA99}'}</span> {price}
    </span>
  )
}

