'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  SHOP_ITEMS,
  buy,
  buyGift,
  applyGift,
  equip,
  getCoins,
  getInventory,
  getAffinity,
  getRelationshipLevel,
  type Inventory,
  type ShopBoard,
  type ShopPiece,
  type ShopPowerup,
  type ShopGift,
} from '@/lib/shop'
import { asset } from '@/lib/assets'
import { GIFT_EFFECTS, sendGift } from '@/lib/live-gift'
import { HYPERGRID_INVENTORY_CHANGED, HYPERGRID_AFFINITY_CHANGED } from '@/lib/events'
import styles from './page.module.css'

const isLuxury = (id: string): boolean => Boolean((GIFT_EFFECTS as Record<string, unknown>)[id])

type Category = 'boards' | 'pieces' | 'powerups' | 'gifts'

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
  boards: ['theme-cyber', 'theme-dark'],
  pieces: ['pixel'],
  powerups: { bestMove: 0, evalBar: 0, legalMoves: 0, undoPack: 0 },
}

export default function ShopClient() {
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
  const [affinities, setAffinities] = useState<Record<string, number>>({})

  const toastIdRef = useRef(0)
  const giftHideTimerRef = useRef<number | null>(null)
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
    const aff: Record<string, number> = {}
    for (const p of AI_SELECT_PROFILES) aff[p.id] = getAffinity(p.id)
    setAffinities(aff)
    const onInventoryChanged = () => refreshInventory()
    const onAffinityChanged = () => refreshAffinities()
    window.addEventListener(HYPERGRID_INVENTORY_CHANGED, onInventoryChanged)
    window.addEventListener(HYPERGRID_AFFINITY_CHANGED, onAffinityChanged)
    const timeouts = timeoutsRef.current
    return () => {
      window.removeEventListener(HYPERGRID_INVENTORY_CHANGED, onInventoryChanged)
      window.removeEventListener(HYPERGRID_AFFINITY_CHANGED, onAffinityChanged)
      for (const id of timeouts) window.clearTimeout(id)
      timeouts.clear()
      if (giftHideTimerRef.current !== null) {
        window.clearTimeout(giftHideTimerRef.current)
        giftHideTimerRef.current = null
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

  const closeAiSelect = useCallback(() => {
    setAiSelectVisible(false)
    setPendingGiftId(null)
  }, [])

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

  const handleBuy = useCallback(
    (item: ShopBoard | ShopPiece | ShopPowerup) => {
      const result = buy(currentCategory as 'boards' | 'pieces' | 'powerups', item.id)
      if (result.success) {
        refreshInventory()
        showToast(`Purchased ${result.item.name}!`)
      } else if (result.reason === 'insufficient_coins') {
        showToast('Not enough coins!', true)
      } else if (result.reason === 'already_owned') {
        showToast('Already owned!', true)
      }
    },
    [currentCategory, refreshInventory, showToast]
  )

  const handleBuyGift = useCallback(
    (item: ShopGift) => {
      const result = buyGift(item.id)
      if (result.success) {
        setCoins(result.coinsRemaining)
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
      } else if (result.reason === 'insufficient_coins') {
        showToast('Not enough coins!', true)
      }
    },
    [showGiftAnimation, showToast, refreshAffinities]
  )

  const handleEquip = useCallback(
    (id: string) => {
      if (currentCategory !== 'boards' && currentCategory !== 'pieces') return
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
      { id: 'gifts', label: 'Gifts', tabClass: styles.tabGifts },
    ],
    []
  )

  return (
    <>
      <div className={styles.pageTitle}>SHOP</div>
      <div className={styles.coinDisplay}>
        <span className={styles.coinIcon}>{'\u{1FA99}'}</span>
        <span className={styles.coinAmount}>{hydrated ? coins : 0}</span>
      </div>

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
                coins={coins}
                onBuy={() => handleBuy(item)}
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
                coins={coins}
                onBuy={() => handleBuy(item)}
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
                coins={coins}
                onBuy={() => handleBuy(item)}
              />
            ))}

          {currentCategory === 'gifts' &&
            SHOP_ITEMS.gifts.map((item, idx) => (
              <GiftCard
                key={item.id}
                item={item}
                idx={idx}
                coins={coins}
                onBuy={() => handleBuyGift(item)}
              />
            ))}
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

type PowerupCardProps = {
  item: ShopPowerup
  idx: number
  qty: number
  coins: number
  onBuy: () => void
}

function PowerupCard({ item, idx, qty, coins, onBuy }: PowerupCardProps) {
  return (
    <div className={styles.shopCard} style={{ animationDelay: `${idx * 0.08}s` }}>
      <div className={`${styles.cardPreview} ${styles.cardPreviewSolid}`}>
        <span className={styles.previewIcon}>{item.icon}</span>
      </div>
      <div className={styles.cardName}>{item.name}</div>
      <div className={styles.cardDesc}>{item.description}</div>
      <div className={styles.powerupQty}>
        Owned: {qty}
        {item.qty ? ` (buys +${item.qty})` : ''}
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

