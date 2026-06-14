'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getCoins } from '@/lib/shop'
import { HYPERGRID_COINS_CHANGED } from '@/lib/events'
import { STORAGE_KEYS } from '@/lib/storage-keys'

export function ShopButton({
  className = '',
  introAnimation = false,
}: {
  className?: string
  introAnimation?: boolean
}) {
  const [coins, setCoins] = useState<number>(0)

  useEffect(() => {
    setCoins(getCoins())
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.COINS) setCoins(getCoins())
    }
    const onCoinsChanged = () => setCoins(getCoins())
    window.addEventListener('storage', onStorage)
    window.addEventListener(HYPERGRID_COINS_CHANGED, onCoinsChanged)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(HYPERGRID_COINS_CHANGED, onCoinsChanged)
    }
  }, [])

  const composedClassName = [
    'shop-btn-floating',
    introAnimation ? '' : 'shop-btn-floating--no-intro',
    className,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  return (
    <Link
      href="/shop"
      prefetch={false}
      aria-label={`Shop, ${coins} coins`}
      className={composedClassName}
    >
      <span className="shop-btn-floating__icon" aria-hidden="true">🛒</span>
      <span className="shop-btn-floating__coins">{coins}</span>
    </Link>
  )
}
