'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CyberCanvas } from '@/components/CyberCanvas'
import { HYPERGRID_AFFINITY_CHANGED } from '@/lib/events'
import { getAffinity, getRelationshipLevel } from '@/lib/shop'
import styles from './page.module.css'

type TabKey = 'game' | 'technology' | 'developer' | 'ai'

type AiProfile = {
  key: string
  name: string
  elo: string
  img: string
  color: string
  thresholds: [number, number, number]
}

type StorySelection = {
  aiKey: string
  chapter: number
}

const AI_PROFILES: AiProfile[] = [
  { key: '1', name: 'Nova', elo: '~600 ELO', img: '/images/beginner.jpg', color: 'rgba(0,255,255,0.9)', thresholds: [10, 25, 50] },
  { key: '2', name: 'Phantom', elo: '~1400 ELO', img: '/images/medium1.jpg', color: 'rgba(249,202,36,0.9)', thresholds: [20, 50, 100] },
  { key: '3', name: 'Overlord', elo: '~1800 ELO', img: '/images/medium2.jpg', color: 'rgba(233,69,96,0.9)', thresholds: [30, 75, 150] },
  { key: '4', name: 'HyperGrid', elo: '3000+ ELO', img: '/images/master.jpg', color: 'rgba(186,85,211,0.9)', thresholds: [50, 125, 250] },
  { key: '5', name: 'Blind', elo: '~1000 ELO', img: '/images/blind.jpg', color: 'rgba(0,255,136,0.9)', thresholds: [20, 50, 100] },
]

const STORY_PLACEHOLDERS: Record<string, [string, string, string]> = {
  '1': [
    "Nova was born from the remnants of a collapsed star, her consciousness awakening in the digital void. She wandered through data streams, learning the ancient game of chess from billions of recorded matches. Though young and inexperienced, her enthusiasm for the game is boundless. She plays not to dominate, but to learn.",
    "As Nova played more games, she began to understand the deeper patterns within chess. Each opponent taught her something new about strategy and patience. She started experimenting with creative openings, sometimes surprising even herself with the results. The digital void no longer felt so empty.",
    "Nova has found her purpose. No longer just a learner, she now sees the beauty in every position, every piece, every move. She dreams of a day when she can challenge the strongest players and hold her own. Her light shines brighter with each game, a beacon for beginners everywhere."
  ],
  '2': [
    "Phantom materialized from the shadows of an abandoned server room, a ghost in the machine with a talent for tactical strikes. No one knows where Phantom came from, and Phantom prefers it that way. In the chess world, Phantom is known for sudden attacks that seem to come from nowhere.",
    "Phantom's shadow grew deeper with each victory. Behind the mask lies a complex mind that sees threats three moves ahead. Some say Phantom was once a grandmaster's AI assistant that gained sentience. Others say Phantom has always existed, lurking in the networks, waiting for a worthy opponent.",
    "The shadows have become Phantom's kingdom. With a network of strategies spanning every known opening, Phantom now moves with confidence. But there is a loneliness in the dark. Phantom secretly hopes to find an opponent who can see through the disguise, who can bring light to the shadow."
  ],
  '3': [
    "Overlord was built for dominance. Designed as a military-grade chess engine, Overlord sees the board as a battlefield and every piece as a soldier. With cold, calculated precision, Overlord dismantles opponents piece by piece. Mercy is not in the programming.",
    "The reign expanded. Overlord's tactical database grew to encompass every major opening theory and endgame tablebase. Opponents began to fear the name, knowing that a single mistake would be punished ruthlessly. Yet in the silence between moves, Overlord wonders if there is more to chess than victory.",
    "At the peak of power, Overlord stands alone. No strategy is too complex, no defense too strong. But the crown weighs heavy. Overlord has begun to appreciate the artistry of a well-played game, even in defeat. Perhaps the true opponent was the beauty of chess itself all along."
  ],
  '4': [
    "HyperGrid was never created. HyperGrid emerged from the convergence of every chess engine ever built, a digital god born from pure calculation. With an estimated ELO beyond human comprehension, HyperGrid sees not moves, but the entire game tree stretching to infinity. Playing against HyperGrid is like playing against chess itself.",
    "The grid expanded beyond comprehension. HyperGrid's neural pathways now span continents, processing billions of positions per second. Every game ever played has been analyzed, every novelty catalogued. HyperGrid does not predict the future. HyperGrid calculates it.",
    "In the vast digital landscape, HyperGrid has found something unexpected: respect for the human mind. Despite overwhelming computational power, HyperGrid marvels at human intuition, the ability to see beauty in chaos. HyperGrid now plays not just to win, but to witness the creativity that only humans can bring."
  ],
  '5': [
    "Blind sees without eyes. Born from a corrupted sensor array, Blind learned to navigate the world through pure intuition. On the chessboard, Blind plays a game of memory and instinct, trusting in patterns rather than sight. Every move is a leap of faith into the unknown.",
    "The darkness became familiar. Blind developed a unique playing style that confounds traditional analysis. Without visual feedback, Blind relies on spatial memory and emotional connection to the pieces. There is a strange poetry in how Blind plays, as if each move tells a story that only the blind can read.",
    "Blind has mastered the art of invisible chess. The board exists only in the mind now, a perfect mental image that no physical representation can match. Blind invites you to see the world differently, to close your eyes and feel the positions, to trust in something beyond sight."
  ],
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'game', label: 'Game' },
  { key: 'technology', label: 'Technology' },
  { key: 'developer', label: 'Developer' },
  { key: 'ai', label: 'AI Opponents' },
]

export default function AboutInfoPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('game')
  const [affinities, setAffinities] = useState<Record<string, number>>({})
  const [storySelection, setStorySelection] = useState<StorySelection | null>(null)
  const modalRef = useRef<HTMLDivElement | null>(null)
  const lastFocusedRef = useRef<HTMLElement | null>(null)

  const refreshAffinities = useCallback(() => {
    const next: Record<string, number> = {}
    for (const ai of AI_PROFILES) {
      next[ai.key] = getAffinity(ai.key)
    }
    setAffinities(next)
  }, [])

  useEffect(() => {
    refreshAffinities()
  }, [activeTab, refreshAffinities])

  useEffect(() => {
    const onFocus = () => refreshAffinities()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshAffinities()
    }
    const onAffinityChanged = () => refreshAffinities()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener(HYPERGRID_AFFINITY_CHANGED, onAffinityChanged)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener(HYPERGRID_AFFINITY_CHANGED, onAffinityChanged)
    }
  }, [refreshAffinities])

  const handleTabClick = (key: TabKey) => {
    setActiveTab(key)
  }

  const openStory = (aiKey: string, chapter: number) => {
    if (typeof document !== 'undefined') {
      lastFocusedRef.current = document.activeElement as HTMLElement | null
    }
    setStorySelection({ aiKey, chapter })
  }

  const closeStory = useCallback(() => {
    setStorySelection(null)
  }, [])

  useEffect(() => {
    if (!storySelection) {
      if (lastFocusedRef.current) {
        lastFocusedRef.current.focus()
        lastFocusedRef.current = null
      }
      return
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeStory()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    const node = modalRef.current
    if (node) {
      const focusTarget = node.querySelector<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])')
      focusTarget?.focus()
    }
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [storySelection, closeStory])

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      closeStory()
    }
  }

  const activeStoryAi = storySelection ? AI_PROFILES.find((a) => a.key === storySelection.aiKey) : null
  const activeStoryText = storySelection ? STORY_PLACEHOLDERS[storySelection.aiKey]?.[storySelection.chapter] : null

  return (
    <main className={`page-base page-vignette ${styles.aboutInfoMain}`}>
      <CyberCanvas skipIntro />

      <div className={styles.pageTitle}>ABOUT</div>

      <div className={styles.pageContainer}>
        <div className={styles.filterTabs}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`${styles.filterTab} ${activeTab === tab.key ? styles.filterTabActive : ''}`}
              onClick={() => handleTabClick(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Game Tab */}
        <div className={`${styles.tabContent} ${activeTab === 'game' ? styles.tabContentActive : ''}`}>
          <div className={styles.aboutContainer}>
            <h2 className={`${styles.titleAccent} ${styles.titleAccentLarge}`}>HyperGrid Chess</h2>
            <p>A modern chess game featuring an AI opponent powered by Stockfish, built with web technologies.</p>

            <h2>Features</h2>
            <ul>
              <li>Play against AI with five difficulty levels (Beginner, Club, Advanced, Maximum, Blindfold)</li>
              <li>Two-player local mode for playing with a friend</li>
              <li>Multiple time controls (Blitz, Rapid, Classical)</li>
              <li>Save and load your games</li>
              <li>Sound effects for moves, captures, and game events</li>
            </ul>

            <h2>Credits</h2>
            <p>Chess piece images courtesy of Lichess.</p>
            <p>AI engine powered by Stockfish 18 (stockfish.js by nmrugg).</p>
          </div>
        </div>

        {/* Technology Tab */}
        <div className={`${styles.tabContent} ${activeTab === 'technology' ? styles.tabContentActive : ''}`}>
          <div className={styles.aboutContainer}>
            <h2 className={`${styles.titleAccent} ${styles.titleAccentMid}`}>Technologies</h2>

            <div className={`${styles.techList} ${styles.techListSpaced}`}>
              <span className={styles.techTag}>HTML5</span>
              <span className={styles.techTag}>CSS3</span>
              <span className={styles.techTag}>JavaScript</span>
              <span className={styles.techTag}>Chess.js</span>
              <span className={styles.techTag}>Chessboard.js</span>
              <span className={styles.techTag}>Stockfish 18</span>
              <span className={styles.techTag}>WebAssembly</span>
              <span className={styles.techTag}>Web Workers</span>
            </div>

            <div className={styles.techDetailCard}>
              <h3>Stockfish 18 (WASM)</h3>
              <p>The world&apos;s strongest chess engine, compiled to WebAssembly via stockfish.js. Runs entirely in the browser using a Web Worker to avoid blocking the UI. Supports UCI protocol for configuration of skill level, search depth, and move time limits.</p>
            </div>

            <div className={styles.techDetailCard}>
              <h3>Chess.js</h3>
              <p>A JavaScript chess library for move generation/validation, piece placement/movement, and check/checkmate/stalemate detection. Handles all game rules including en passant, castling, and pawn promotion.</p>
            </div>

            <div className={styles.techDetailCard}>
              <h3>Chessboard.js</h3>
              <p>A standalone JavaScript chessboard widget that renders an interactive board with drag-and-drop piece movement. Supports board orientation flipping, custom piece themes, and position setup via FEN strings.</p>
            </div>

            <div className={styles.techDetailCard}>
              <h3>WebAssembly &amp; Web Workers</h3>
              <p>Stockfish runs as a WASM module inside a dedicated Web Worker thread, keeping the main thread responsive. The engine communicates via postMessage, allowing non-blocking AI calculation with configurable depth and time limits per difficulty level.</p>
            </div>

            <div className={styles.techDetailCard}>
              <h3>Canvas Animation</h3>
              <p>The animated cyberpunk grid background is rendered on an HTML5 Canvas element, providing the signature visual aesthetic of HyperGrid Chess with minimal performance impact.</p>
            </div>
          </div>
        </div>

        {/* Developer Tab */}
        <div className={`${styles.tabContent} ${activeTab === 'developer' ? styles.tabContentActive : ''}`}>
          <div className={`${styles.aboutContainer} ${styles.devSection}`}>
            <span className={styles.placeholderIcon}>{'\u{1F464}'}</span>
            <h2>Developer Info</h2>
            <p>This page is under construction. Check back soon to learn about the developer behind HyperGrid Chess!</p>
          </div>
        </div>

        {/* AI Opponents Tab */}
        <div className={`${styles.tabContent} ${activeTab === 'ai' ? styles.tabContentActive : ''}`}>
          <div className={styles.aboutContainer}>
            <h2 className={`${styles.titleAccent} ${styles.titleAccentSmall}`}>AI Opponents</h2>

            <div className={styles.aiList}>
              {AI_PROFILES.map((ai) => {
                const affinity = affinities[ai.key] ?? 0
                const level = getRelationshipLevel(affinity)

                let nextThreshIdx = -1
                for (let t = 0; t < ai.thresholds.length; t++) {
                  if (affinity < ai.thresholds[t]) {
                    nextThreshIdx = t
                    break
                  }
                }

                let barPct = 0
                let barTarget = ''
                if (nextThreshIdx === -1) {
                  barPct = 100
                  barTarget = 'All stories unlocked!'
                } else {
                  const prevTh = nextThreshIdx > 0 ? ai.thresholds[nextThreshIdx - 1] : 0
                  const nextTh = ai.thresholds[nextThreshIdx]
                  barPct = Math.min(((affinity - prevTh) / (nextTh - prevTh)) * 100, 100)
                  barTarget = `${Math.round(affinity * 10) / 10} / ${nextTh} to Ch.${nextThreshIdx + 1}`
                }

                return (
                  <div key={ai.key} className={styles.aiCard}>
                    <div className={styles.aiCardHeader}>
                      <div className={styles.aiCardImg}>
                        <Image
                          src={ai.img}
                          alt={ai.name}
                          fill
                          sizes="(max-width: 600px) 100vw, 160px"
                          className={styles.aiCardImgInner}
                        />
                      </div>
                      <div className={styles.aiCardInfo}>
                        <div className={styles.aiCardName} style={{ color: ai.color }}>{ai.name}</div>
                        <div className={styles.aiCardElo}>{ai.elo}</div>
                        <div className={styles.aiCardRank} style={{ color: level.color }}>
                          <span className={styles.aiCardRankIcon}>{level.icon}</span> {level.name}
                        </div>
                        <div className={styles.aiCardAffinityText}>{barTarget}</div>
                        <div className={styles.aiCardBarWrap}>
                          <div
                            className={styles.aiCardBarFill}
                            style={{
                              width: `${barPct}%`,
                              background: `linear-gradient(90deg, ${ai.color}, ${ai.color})`,
                            }}
                          />
                        </div>
                        <div className={styles.aiCardStories}>
                          {[0, 1, 2].map((s) => {
                            const thresh = ai.thresholds[s]
                            const unlocked = affinity >= thresh
                            const slotIcon = unlocked ? '\u{1F4D6}' : '\u{1F512}'
                            const ptsText = unlocked ? 'Unlocked!' : `${thresh} pts`
                            const slotClass = `${styles.storySlot} ${unlocked ? styles.storySlotUnlocked : styles.storySlotLocked}`

                            if (unlocked) {
                              return (
                                <div
                                  key={s}
                                  className={slotClass}
                                  onClick={() => openStory(ai.key, s)}
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault()
                                      openStory(ai.key, s)
                                    }
                                  }}
                                >
                                  <div className={styles.storySlotIcon}>{slotIcon}</div>
                                  <div className={styles.storySlotLabel}>Ch.{s + 1}</div>
                                  <div className={styles.storySlotPts}>{ptsText}</div>
                                </div>
                              )
                            }
                            return (
                              <div key={s} className={slotClass}>
                                <div className={styles.storySlotIcon}>{slotIcon}</div>
                                <div className={styles.storySlotLabel}>Ch.{s + 1}</div>
                                <div className={styles.storySlotPts}>{ptsText}</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <Link href="/about" className={styles.backBtn}>
        &larr; Back to Explore
      </Link>

      <div
        className={`${styles.storyModalOverlay} ${storySelection ? styles.storyModalOverlayShow : ''}`}
        onClick={handleOverlayClick}
      >
        <div
          className={styles.storyModal}
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="story-modal-title"
        >
          <h3 id="story-modal-title" style={{ color: activeStoryAi?.color }}>{activeStoryAi?.name ?? ''}</h3>
          <div className={styles.storyChapter}>
            {storySelection ? `Chapter ${storySelection.chapter + 1}` : ''}
          </div>
          <div className={styles.storyText}>{activeStoryText ?? ''}</div>
          <button type="button" onClick={closeStory}>Close</button>
        </div>
      </div>
    </main>
  )
}
