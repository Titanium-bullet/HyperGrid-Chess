'use client'

import Link from 'next/link'
import { showToast } from '@/lib/achievements'

export function HomeMenu() {
  function testAchievements() {
    showToast('First Blood', 'Bronze', '⚔')
    window.setTimeout(() => showToast('Nova Slayer', 'Silver', '🌟'), 1200)
    window.setTimeout(() => showToast('HyperGrid Slayer', 'Gold', '🔥'), 2400)
  }

  return (
    <div className="home-menu-container">
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
