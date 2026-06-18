'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getEquippedBackground } from '@/lib/shop'
import { HYPERGRID_INVENTORY_CHANGED } from '@/lib/events'

export function HomeMenu() {
  const [spectra, setSpectra] = useState(false)

  useEffect(() => {
    const apply = () => setSpectra(getEquippedBackground() === 'bg-phantom')
    apply()
    window.addEventListener(HYPERGRID_INVENTORY_CHANGED, apply)
    return () => window.removeEventListener(HYPERGRID_INVENTORY_CHANGED, apply)
  }, [])

  return (
    <div className={`home-menu-container${spectra ? ' home-menu-spectra' : ''}`}>
      <Link href="/play" className="home-menu-btn home-menu-btn--primary" style={{ animationDelay: '2.5s' }}>
        Chess
        <span className="home-menu-btn__subtitle">Play now</span>
      </Link>

      <Link
        href="/arcade"
        className="home-menu-btn home-menu-btn--secondary"
        style={{ animationDelay: '2.65s' }}
      >
        Arcade: Versus
        <span className="home-menu-btn__subtitle">2-Player Neon Brawl</span>
      </Link>

      <Link
        href="/finance"
        className="home-menu-btn home-menu-btn--secondary"
        style={{ animationDelay: '2.8s' }}
      >
        Finance
        <span className="home-menu-btn__subtitle">Bank of Hypergrid</span>
      </Link>

      <Link
        href="/about"
        className="home-menu-btn home-menu-btn--secondary"
        style={{ animationDelay: '2.95s, 0s' }}
      >
        Explore More
        <span className="home-menu-btn__subtitle">Discover more features</span>
      </Link>
    </div>
  )
}
