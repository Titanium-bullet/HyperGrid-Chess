'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { showToast } from '@/lib/achievements'
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

  function testAchievements() {
    showToast('First Blood', 'Bronze', '⚔')
    window.setTimeout(() => showToast('Nova Slayer', 'Silver', '🌟'), 1200)
    window.setTimeout(() => showToast('HyperGrid Slayer', 'Gold', '🔥'), 2400)
  }

  return (
    <div className={`home-menu-container${spectra ? ' home-menu-spectra' : ''}`}>
      <Link href="/play" className="home-menu-btn home-menu-btn--primary" style={{ animationDelay: '2.5s' }}>
        Chess
        <span className="home-menu-btn__subtitle">Play now</span>
      </Link>

      <button
        type="button"
        onClick={testAchievements}
        className="home-menu-btn home-menu-btn--secondary"
        style={{ animationDelay: '2.65s' }}
      >
        Test Achievements
        <span className="home-menu-btn__subtitle">Bronze → Silver → Gold</span>
      </button>

      <button
        type="button"
        disabled
        className="home-menu-btn home-menu-btn--disabled"
        style={{ animationDelay: '2.8s' }}
      >
        Gomoku
        <span className="home-menu-btn__subtitle">Coming soon</span>
      </button>

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
