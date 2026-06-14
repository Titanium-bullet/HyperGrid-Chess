'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { HYPERGRID_ACHIEVEMENT_TOAST, type AchievementToastDetail } from '@/lib/events'
import { playSound } from '@/lib/game-audio'

type Tier = 'Bronze' | 'Silver' | 'Gold'

type ToastEntry = {
  id: number
  name: string
  tier: Tier
  icon: string
  tierLower: 'bronze' | 'silver' | 'gold'
  fading: boolean
  shaking: boolean
}

type FlashEntry = { id: number; kind: 'gold' | 'silver' }

let nextToastId = 0
let nextFlashId = 0

function normaliseTier(t: string): 'bronze' | 'silver' | 'gold' {
  const lower = (t || 'Bronze').toString().toLowerCase()
  if (lower === 'silver') return 'silver'
  if (lower === 'gold') return 'gold'
  return 'bronze'
}

function canonicalTier(tierLower: 'bronze' | 'silver' | 'gold'): Tier {
  if (tierLower === 'silver') return 'Silver'
  if (tierLower === 'gold') return 'Gold'
  return 'Bronze'
}

export function AchievementToastHost() {
  const [mounted, setMounted] = useState(false)
  const [toasts, setToasts] = useState<ToastEntry[]>([])
  const [flashes, setFlashes] = useState<FlashEntry[]>([])
  const timeoutIdsRef = useRef<Set<number>>(new Set())
  const toastTimeoutsRef = useRef<Map<number, Set<number>>>(new Map())

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const timeoutIds = timeoutIdsRef.current
    const toastTimeouts = toastTimeoutsRef.current

    function trackTimeout(toastId: number, handle: number) {
      timeoutIds.add(handle)
      let set = toastTimeouts.get(toastId)
      if (!set) {
        set = new Set<number>()
        toastTimeouts.set(toastId, set)
      }
      set.add(handle)
    }

    function clearToastTimeouts(toastId: number) {
      const set = toastTimeouts.get(toastId)
      if (!set) return
      for (const handle of set) {
        window.clearTimeout(handle)
        timeoutIds.delete(handle)
      }
      toastTimeouts.delete(toastId)
    }

    function scheduleToast(toastId: number, fn: () => void, delay: number): void {
      const handle = window.setTimeout(() => {
        timeoutIds.delete(handle)
        const set = toastTimeouts.get(toastId)
        if (set) {
          set.delete(handle)
          if (set.size === 0) toastTimeouts.delete(toastId)
        }
        fn()
      }, delay)
      trackTimeout(toastId, handle)
    }

    function scheduleFlash(fn: () => void, delay: number): void {
      const handle = window.setTimeout(() => {
        timeoutIds.delete(handle)
        fn()
      }, delay)
      timeoutIds.add(handle)
    }

    function onToast(e: Event) {
      const detail = (e as CustomEvent<AchievementToastDetail>).detail
      if (!detail) return
      const tierLower = normaliseTier(detail.tier)
      playSound('achievement-' + tierLower as 'achievement-bronze' | 'achievement-silver' | 'achievement-gold')
      const canonical = canonicalTier(tierLower)
      const displayTier: Tier = detail.tier === canonical ? detail.tier : canonical
      const toastId = ++nextToastId
      const entry: ToastEntry = {
        id: toastId,
        name: detail.name,
        tier: displayTier,
        icon: detail.icon,
        tierLower,
        fading: false,
        shaking: tierLower === 'gold',
      }
      setToasts((prev) => [...prev, entry])

      if (tierLower === 'silver') {
        const fid = ++nextFlashId
        setFlashes((prev) => [...prev, { id: fid, kind: 'silver' }])
        scheduleFlash(() => setFlashes((prev) => prev.filter((f) => f.id !== fid)), 1100)
      }
      if (tierLower === 'gold') {
        const fid = ++nextFlashId
        setFlashes((prev) => [...prev, { id: fid, kind: 'gold' }])
        scheduleFlash(() => setFlashes((prev) => prev.filter((f) => f.id !== fid)), 1500)
        scheduleToast(toastId, () => {
          setToasts((prev) => prev.map((t) => (t.id === entry.id ? { ...t, shaking: false } : t)))
        }, 1000)
      }

      scheduleToast(toastId, () => {
        setToasts((prev) => prev.map((t) => (t.id === entry.id ? { ...t, fading: true } : t)))
      }, 10000)
      scheduleToast(toastId, () => {
        setToasts((prev) => prev.filter((t) => t.id !== entry.id))
        clearToastTimeouts(entry.id)
      }, 10600)
    }
    window.addEventListener(HYPERGRID_ACHIEVEMENT_TOAST, onToast)
    return () => {
      window.removeEventListener(HYPERGRID_ACHIEVEMENT_TOAST, onToast)
      for (const handle of timeoutIds) window.clearTimeout(handle)
      timeoutIds.clear()
      toastTimeouts.clear()
    }
  }, [])

  if (!mounted) return null

  return createPortal(
    <>
      <div id="achievement-toast-container" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={[
              'achievement-toast',
              `toast-${t.tierLower}`,
              t.shaking ? 'toast-shake' : '',
              t.fading ? 'achievement-toast-fade' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="achievement-toast-icon">{t.icon}</div>
            <div className="achievement-toast-body">
              <div className="achievement-toast-label">Achievement Unlocked!</div>
              <div className="achievement-toast-name">
                {t.name}
                <span className={`toast-tier-dot ${t.tierLower}`} />
                <span className={`toast-tier-text ${t.tierLower}`}>{t.tier}</span>
              </div>
            </div>
            <span className="sr-only">{`Achievement unlocked: ${t.name}, ${t.tier} tier.`}</span>
          </div>
        ))}
      </div>
      {flashes.map((f) => (
        <div key={f.id} className={f.kind === 'gold' ? 'achievement-gold-flash' : 'achievement-silver-flash'} />
      ))}
    </>,
    document.body
  )
}
