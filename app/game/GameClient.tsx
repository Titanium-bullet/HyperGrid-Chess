'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Board, type BoardHandles, type ChessJsInstance, type ChessJsMove, type ChessboardJsBoard } from '@/components/game/Board'
import { CyberCanvas } from '@/components/CyberCanvas'
import { ShopButton } from '@/components/ShopButton'
import { playSound } from '@/lib/game-audio'
import { asset } from '@/lib/assets'
import { createStockfish, type EvalScore, type SkillLevel, type StockfishEngine } from '@/lib/engine'
import {
  awardCoins,
  addAffinity,
  equip as shopEquip,
  getEquippedBoard,
  getEquippedPieces,
  getInventory,
  getItems,
  getPieceUrl,
} from '@/lib/shop'
import { trackGameEnd, trackMove, trackPuzzleSolved } from '@/lib/achievements'
import { STORAGE_KEYS } from '@/lib/storage-keys'
import { HYPERGRID_INVENTORY_CHANGED } from '@/lib/events'
import { loadPuzzles, type Puzzle, type PuzzlesData, type Tier as PuzzleTier } from '@/lib/puzzles'
import styles from './page.module.css'

type Difficulty = '1' | '2' | '3' | '4' | '5'
type GameMode = 'pvp' | 'ai' | 'puzzle'
type UrlMode = 'pvp' | 'ai' | 'puzzle' | 'trial'

type MoveRecord = {
  from: string
  to: string
  piece: string
  color: 'w' | 'b'
  captured?: string
  promotion?: string
  san: string
}

const SKILL_MAP: Record<Difficulty, SkillLevel> = {
  '1': 1,
  '2': 7,
  '3': 14,
  '4': 20,
  '5': 4,
}

const BASE_DEPTH: Record<Difficulty, number> = { '1': 2, '2': 8, '3': 14, '4': 20, '5': 4 }
const MAX_DEPTH: Record<Difficulty, number> = { '1': 4, '2': 14, '3': 20, '4': 26, '5': 10 }
const BASE_TIMEOUT: Record<Difficulty, number> = { '1': 300, '2': 1500, '3': 3000, '4': 5000, '5': 800 }
const MAX_TIMEOUT: Record<Difficulty, number> = { '1': 500, '2': 3000, '3': 6000, '4': 10000, '5': 2000 }

const AI_PROFILES: Record<Difficulty, { name: string; elo: string; img: string }> = {
  '1': { name: 'Nova', elo: '~600 ELO', img: asset('/images/beginner.jpg') },
  '2': { name: 'Phantom', elo: '~1400 ELO', img: asset('/images/medium1.jpg') },
  '3': { name: 'Overlord', elo: '~1800 ELO', img: asset('/images/medium2.jpg') },
  '4': { name: 'HyperGrid', elo: '3000+ ELO', img: asset('/images/master.jpg') },
  '5': { name: 'Blind', elo: '~1000 ELO', img: asset('/images/blind.jpg') },
}

const RIVAL_DIALOGUES: Record<string, string[]> = {
  start: ["Think you can solve this?", "Let's see if you're worthy...", "Don't disappoint me."],
  correct: ['Lucky guess.', 'Even a broken clock is right twice a day.', "Don't get cocky."],
  wrong: ['Is that the best you can do?', 'Pathetic.', 'Try harder, human.', 'Amateur move.'],
  hint: ['Taking the easy way out?', 'Need help already?', 'So predictable.'],
  solved_easy: ["Beginner's luck.", 'That was beneath me.', 'Cute.'],
  solved_medium: ['Not bad... for a human.', "You're starting to annoy me.", "I'll admit, that was decent."],
  solved_hard: ["Impressive. But you'll never beat me.", 'You got lucky.', 'Enjoy it while it lasts.'],
}

const BOARD_THEME_CLASSES = [
  'theme-cyber',
  'theme-dark',
  'theme-neon',
  'theme-inferno',
  'theme-arctic',
  'theme-royal',
  'theme-matrix',
  'theme-rose',
]

function formatTime(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return `${h}:${m < 10 ? '0' : ''}${m}`
  }
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

function flattenPuzzles(data: PuzzlesData): Puzzle[] {
  const out: Puzzle[] = []
  for (const t of data.tiers) for (const p of t.puzzles) out.push(p)
  return out
}

function safeGetSolved(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SOLVED) ?? '[]') as string[]
  } catch {
    return []
  }
}

function markPuzzleSolvedLocal(id: string): void {
  if (typeof window === 'undefined') return
  const solved = safeGetSolved()
  if (!solved.includes(id)) {
    solved.push(id)
    try {
      localStorage.setItem(STORAGE_KEYS.SOLVED, JSON.stringify(solved))
    } catch {
      // ignore
    }
  }
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

const VALID_DIFFS = new Set<string>(['1', '2', '3', '4', '5'])

export function GameClient() {
  const router = useRouter()
  const params = useSearchParams()
  const hasMode = params.get('mode') !== null
  const urlMode = (params.get('mode') ?? 'ai') as UrlMode
  const urlPuzzle = params.get('puzzle') ?? params.get('id')
  const urlDiffRaw = params.get('diff')
  const urlDiff: Difficulty | null =
    urlDiffRaw && VALID_DIFFS.has(urlDiffRaw) ? (urlDiffRaw as Difficulty) : null
  const urlTime = params.get('time')
  const urlInc = params.get('inc')

  // Redirect to home if no mode
  useEffect(() => {
    if (!hasMode) router.push('/')
  }, [hasMode, router])

  // Apply legacy chess-page body gradient while the game page is mounted
  useEffect(() => {
    document.body.classList.add('body-gradient')
    return () => document.body.classList.remove('body-gradient')
  }, [])

  // Game configuration derived from URL
  const initialConfig = useMemo(() => {
    let gameMode: GameMode = 'ai'
    let aiDifficulty: Difficulty = '1'
    let timeControl = 0
    let increment = 0
    let trial = false

    if (urlMode === 'pvp' || urlMode === 'ai') {
      gameMode = urlMode
      if (urlDiff && urlMode === 'ai') aiDifficulty = urlDiff
      if (urlTime) timeControl = parseInt(urlTime, 10) || 0
      else if (urlMode === 'pvp') timeControl = 600
      if (urlInc) increment = parseInt(urlInc, 10) || 0
    } else if (urlMode === 'puzzle') {
      gameMode = 'puzzle'
    } else if (urlMode === 'trial') {
      gameMode = 'ai'
      aiDifficulty = '3'
      trial = true
    }

    return { gameMode, aiDifficulty, timeControl, increment, trial }
  }, [urlMode, urlDiff, urlTime, urlInc])

  const blindfoldMode = initialConfig.gameMode === 'ai' && initialConfig.aiDifficulty === '5'
  const puzzleMode = initialConfig.gameMode === 'puzzle'

  // Refs for mutable game state (avoid stale closures)
  const boardRef = useRef<ChessboardJsBoard | null>(null)
  const chessRef = useRef<ChessJsInstance | null>(null)
  const moveHistoryRef = useRef<MoveRecord[]>([])
  const capturedWhiteRef = useRef<string[]>([])
  const capturedBlackRef = useRef<string[]>([])
  const playerColorRef = useRef<'w' | 'b'>('w')
  const gameStartedRef = useRef(false)
  const timeExpiredRef = useRef(false)
  const isAIMovingRef = useRef(false)
  const hintPendingRef = useRef(false)
  const pendingMoveRef = useRef<{ from: string; to: string } | null>(null)
  const stockfishRef = useRef<StockfishEngine | null>(null)
  const gameStartTimeRef = useRef<number>(Date.now())
  const muteSoundsRef = useRef(false)
  const blindfoldVisibleSquareRef = useRef<string | null>(null)
  const bfObserverRef = useRef<MutationObserver | null>(null)

  // Puzzle state refs
  const puzzleDataRef = useRef<Puzzle | null>(null)
  const puzzleSolutionIndexRef = useRef(0)
  const puzzleSolvedRef = useRef(false)
  const puzzleFailedRef = useRef(false)
  const puzzleHintShownRef = useRef(false)
  const puzzleHintUsedRef = useRef(false)
  const puzzleDataPayloadRef = useRef<PuzzlesData | null>(null)

  // React state
  const aiDifficulty: Difficulty = initialConfig.aiDifficulty
  const [whiteTime, setWhiteTime] = useState(initialConfig.timeControl)
  const [blackTime, setBlackTime] = useState(initialConfig.timeControl)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [statusKind, setStatusKind] = useState<'white-turn' | 'black-turn' | 'check' | 'gameover' | ''>('')
  const [statusColor, setStatusColor] = useState<string>('')
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([])
  const [capturedWhite, setCapturedWhite] = useState<string[]>([])
  const [capturedBlack, setCapturedBlack] = useState<string[]>([])
  const [aiThinking, setAiThinking] = useState(false)
  const [boardKey, setBoardKey] = useState(0)
  const [evalState, setEvalState] = useState<{ value: number; mate: number | null }>({ value: 0, mate: null })
  const [evalEnabled, setEvalEnabled] = useState(false)
  const [threatAlertEnabled, setThreatAlertEnabled] = useState(false)
  const [bestMoveEnabled, setBestMoveEnabled] = useState(false)
  const [legalMovesEnabled, setLegalMovesEnabled] = useState(false)
  const [undoUnlimited, setUndoUnlimited] = useState(false)
  const [hintActive, setHintActive] = useState<string | null>(null)
  const [legalPreviewSource, setLegalPreviewSource] = useState<string | null>(null)
  const MAX_FREE_UNDOS = 3
  const [undosLeft, setUndosLeft] = useState(MAX_FREE_UNDOS)
  const [threatMessage, setThreatMessage] = useState('')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showGameOver, setShowGameOver] = useState(false)
  const [gameOverTitle, setGameOverTitle] = useState('Game Over')
  const [gameOverMessage, setGameOverMessage] = useState('')
  const [gameOverDraw, setGameOverDraw] = useState(false)
  const [showPromotion, setShowPromotion] = useState(false)
  const [promotionColor, setPromotionColor] = useState<'w' | 'b'>('w')
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w')
  const [boardTheme, setBoardTheme] = useState<string>('theme-cyber')
  const [equippedPieces, setEquippedPieces] = useState<string>('pixel')
  const [puzzleStatus, setPuzzleStatus] = useState<string>('')
  const [puzzleDesc, setPuzzleDesc] = useState<string>('')
  const [puzzleDifficulty, setPuzzleDifficulty] = useState<string>('')
  const [puzzleMoves, setPuzzleMoves] = useState<string>('')
  const [puzzleHint, setPuzzleHint] = useState<string>('')
  const [coachDialogue, setCoachDialogue] = useState<string>('Think you can solve this?')
  const [showPuzzleComplete, setShowPuzzleComplete] = useState(false)
  const [puzzleCompleteMessage, setPuzzleCompleteMessage] = useState('')
  const [progressData, setProgressData] = useState<{ counts: number[]; totals: number[]; total: number; totalAll: number }>({
    counts: [0, 0, 0],
    totals: [0, 0, 0],
    total: 0,
    totalAll: 0,
  })

  playerColorRef.current = playerColor

  // Load initial equipped board/pieces and sound preference from shop/storage
  useEffect(() => {
    setBoardTheme(getEquippedBoard())
    setEquippedPieces(getEquippedPieces())
    try {
      const savedSound = localStorage.getItem(STORAGE_KEYS.SOUND)
      if (savedSound !== null) setSoundEnabled(savedSound === '1')
    } catch {
      // ignore
    }
    const refreshEvalEnabled = () => {
      try {
        const inv = getInventory()
        setEvalEnabled((inv.powerups.evalBar ?? 0) > 0)
        setThreatAlertEnabled((inv.powerups.threatAlert ?? 0) > 0)
        setBestMoveEnabled((inv.powerups.bestMove ?? 0) > 0)
        setLegalMovesEnabled((inv.powerups.legalMoves ?? 0) > 0)
        setUndoUnlimited((inv.powerups.undoPack ?? 0) > 0)
      } catch {
        setEvalEnabled(false)
        setThreatAlertEnabled(false)
        setBestMoveEnabled(false)
        setLegalMovesEnabled(false)
        setUndoUnlimited(false)
      }
    }
    refreshEvalEnabled()
    window.addEventListener(HYPERGRID_INVENTORY_CHANGED, refreshEvalEnabled)
    return () => window.removeEventListener(HYPERGRID_INVENTORY_CHANGED, refreshEvalEnabled)
  }, [])

  // Build piece theme function (uses current equipped pieces via shop helper)
  const pieceTheme = useCallback((piece: string) => {
    return getPieceUrl(piece)
  }, [])

  const setSafeStatus = useCallback((text: string, kind: typeof statusKind = '', color = '') => {
    setStatusText(text)
    setStatusKind(kind)
    setStatusColor(color)
  }, [])

  const clearHighlights = useCallback(() => {
    const boardDiv = document.getElementById('myBoard')
    if (!boardDiv) return
    boardDiv.querySelectorAll('.highlight-lastmove').forEach((el) => el.classList.remove('highlight-lastmove'))
  }, [])

  const highlightLastMove = useCallback(
    (from: string, to: string) => {
      clearHighlights()
      const boardDiv = document.getElementById('myBoard')
      if (!boardDiv) return
      const fromSq = boardDiv.querySelector(`[data-squareid="${from}"]`)
      const toSq = boardDiv.querySelector(`[data-squareid="${to}"]`)
      fromSq?.classList.add('highlight-lastmove')
      toSq?.classList.add('highlight-lastmove')
    },
    [clearHighlights],
  )

  const updateBlindfoldVisibility = useCallback(
    (square: string | null) => {
      if (!blindfoldMode) return
      const boardDiv = document.getElementById('myBoard')
      if (!boardDiv) return
      blindfoldVisibleSquareRef.current = square
      boardDiv.querySelectorAll('.bf-show').forEach((el) => el.classList.remove('bf-show'))
      if (!square) return
      const sqEl =
        boardDiv.querySelector(`[data-squareid="${square}"]`) ?? boardDiv.querySelector(`[data-square="${square}"]`)
      sqEl?.classList.add('bf-show')
    },
    [blindfoldMode],
  )

  const refreshBlindfoldVisibility = useCallback(() => {
    if (!blindfoldMode || !blindfoldVisibleSquareRef.current) return
    updateBlindfoldVisibility(blindfoldVisibleSquareRef.current)
  }, [blindfoldMode, updateBlindfoldVisibility])

  const startBlindfoldObserver = useCallback(() => {
    if (!blindfoldMode || bfObserverRef.current) return
    const boardDiv = document.getElementById('myBoard')
    if (!boardDiv) return
    bfObserverRef.current = new MutationObserver(() => {
      const sq = blindfoldVisibleSquareRef.current
      if (!sq) return
      const sqEl = boardDiv.querySelector(`[data-squareid="${sq}"]`) ?? boardDiv.querySelector(`[data-square="${sq}"]`)
      if (sqEl && !sqEl.classList.contains('bf-show')) sqEl.classList.add('bf-show')
    })
    bfObserverRef.current.observe(boardDiv, { childList: true, subtree: true })
  }, [blindfoldMode])

  const updateBoardThemeClass = useCallback(() => {
    const el = document.getElementById('myBoard')
    if (!el) return
    el.classList.remove(...BOARD_THEME_CLASSES)
    el.classList.add(boardTheme)
  }, [boardTheme])

  const updateGameTheme = useCallback(() => {
    const boardEl = document.getElementById('myBoard')
    const game = chessRef.current
    if (!boardEl || !game) return
    boardEl.classList.remove('theme-white', 'theme-black', 'theme-check', 'theme-gameover', 'theme-draw')
    document.querySelectorAll('#myBoard img').forEach((p) => p.classList.remove('mate-piece'))
    if (game.in_checkmate()) {
      boardEl.classList.add('theme-gameover')
      const defeated = game.turn()
      document.querySelectorAll(`#myBoard img[src*="${defeated}"]`).forEach((p) => p.classList.add('mate-piece'))
    } else if (game.in_draw()) {
      boardEl.classList.add('theme-draw')
    } else if (game.in_check()) {
      boardEl.classList.add('theme-check')
    } else if (game.turn() === 'w') {
      boardEl.classList.add('theme-white')
    } else {
      boardEl.classList.add('theme-black')
    }
  }, [])

  const trackGameAchievement = useCallback(
    (endType: 'checkmate' | 'timeout' | 'draw', loserOrWinner: string | null) => {
      const playTime = Math.round((Date.now() - gameStartTimeRef.current) / 1000)
      let result: 'win' | 'loss' | 'draw' = 'draw'
      let winnerColor: 'w' | 'b' | null = null
      let playerPiecesLost: number | undefined

      if (endType === 'checkmate') {
        const loserColor = loserOrWinner === 'White' ? 'w' : 'b'
        winnerColor = loserColor === 'w' ? 'b' : 'w'
      } else if (endType === 'timeout') {
        winnerColor = loserOrWinner as 'w' | 'b'
      }

      const gameMode = initialConfig.gameMode
      const isTrial = initialConfig.trial
      const color = playerColorRef.current

      if (gameMode === 'ai') {
        if (winnerColor === color) result = 'win'
        else if (winnerColor) result = 'loss'
        if (color === 'w') playerPiecesLost = capturedBlackRef.current.length
        else playerPiecesLost = capturedWhiteRef.current.length
      } else if (gameMode === 'pvp') {
        if (winnerColor) result = 'win'
      }

      if (isTrial) {
        if (winnerColor === color) result = 'win'
        else if (winnerColor) result = 'loss'
      }

      trackGameEnd(result, {
        mode: isTrial ? 'trial' : (gameMode as 'ai' | 'pvp'),
        difficulty: initialConfig.aiDifficulty,
        playerColor: color,
        winnerColor: winnerColor ?? undefined,
        moveCount: moveHistoryRef.current.length,
        playerPiecesLost,
        playTime,
      })

      if (result === 'win') {
        awardCoins(5)
        if (isTrial) awardCoins(45)
      }

      if (gameMode === 'ai' && !isTrial) {
        const affinityTable: Record<Difficulty, { loss: number; draw: number; win: number }> = {
          '1': { loss: 0.5, draw: 1, win: 2 },
          '2': { loss: 1, draw: 2, win: 4 },
          '3': { loss: 1.5, draw: 3, win: 6 },
          '4': { loss: 2.5, draw: 5, win: 10 },
          '5': { loss: 1, draw: 2, win: 4 },
        }
        const pts = affinityTable[initialConfig.aiDifficulty] ?? affinityTable['1']
        const earned = pts[result]
        if (earned > 0) addAffinity(initialConfig.aiDifficulty, earned)
      }
    },
    [initialConfig],
  )

  const refreshThreatAlert = useCallback(() => {
    const boardDiv = document.getElementById('myBoard')
    if (boardDiv) {
      boardDiv.querySelectorAll('.highlight-threatened').forEach((el) => el.classList.remove('highlight-threatened'))
    }
    const game = chessRef.current
    if (!game || !threatAlertEnabled) {
      setThreatMessage('')
      return
    }
    if (initialConfig.gameMode !== 'ai') {
      setThreatMessage('')
      return
    }
    if (game.game_over() || game.in_check() || game.turn() !== playerColorRef.current) {
      setThreatMessage('')
      return
    }

    const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
    const PIECE_NAME: Record<string, string> = { q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' }
    const Ctor = window.Chess
    if (!Ctor) {
      setThreatMessage('')
      return
    }

    const parts = game.fen().split(' ')
    parts[1] = playerColorRef.current === 'w' ? 'b' : 'w'
    let tmp: ChessJsInstance
    try {
      tmp = new Ctor(parts.join(' '))
    } catch {
      setThreatMessage('')
      return
    }

    const oppMoves = tmp.moves({ verbose: true }) as ChessJsMove[]
    const threatened = new Set<string>()
    const victimBySquare = new Map<string, string>()
    let mateThreat = false
    for (const m of oppMoves) {
      const played = tmp.move({ from: m.from, to: m.to, promotion: m.promotion })
      if (!played) continue
      if (m.captured) {
        const victim = m.captured.toLowerCase()
        if ((PIECE_VALUE[victim] ?? 0) >= 3) {
          victimBySquare.set(m.to, victim)
          const attackerValue = PIECE_VALUE[(m.piece ?? '').toLowerCase()] ?? 0
          const victimValue = PIECE_VALUE[victim] ?? 0
          const recaps = tmp.moves({ verbose: true }) as ChessJsMove[]
          const defended = recaps.some((rm) => rm.to === m.to && rm.captured)
          if (!defended || attackerValue < victimValue) threatened.add(m.to)
        }
      }
      if (!mateThreat && tmp.in_checkmate()) mateThreat = true
      tmp.undo()
    }

    if (threatened.size > 0 && boardDiv) {
      for (const sq of threatened) {
        const el = boardDiv.querySelector(`[data-squareid="${sq}"]`) ?? boardDiv.querySelector(`[data-square="${sq}"]`)
        el?.classList.add('highlight-threatened')
      }
    }

    if (mateThreat) {
      setThreatMessage('⚠ Checkmate threat — find a defense!')
    } else if (threatened.size > 0) {
      const names = [...threatened].map((sq) => PIECE_NAME[victimBySquare.get(sq) ?? ''] ?? 'Piece')
      const uniq = [...new Set(names)]
      const noun =
        uniq.length > 1
          ? `Your ${uniq.join(', ')} are under attack!`
          : `Your ${uniq[0]} is under attack!`
      setThreatMessage(`⚠ ${noun}`)
    } else {
      setThreatMessage('')
    }
  }, [threatAlertEnabled, initialConfig.gameMode])

  const updateStatus = useCallback(() => {
    const game = chessRef.current
    if (!game) return
    const moveColor = game.turn() === 'w' ? 'White' : 'Black'
    if (game.in_checkmate()) {
      setSafeStatus(`Game Over — ${moveColor} is checkmated`, 'gameover')
      if (!muteSoundsRef.current) playSound('gameover', soundEnabled)
      stopTimer()
      setGameOverTitle('Checkmate')
      setGameOverMessage(`${moveColor} is checkmated!`)
      setGameOverDraw(false)
      setShowGameOver(true)
      trackGameAchievement('checkmate', moveColor)
    } else if (game.in_draw()) {
      setSafeStatus('Game Over — Draw', 'gameover')
      if (!muteSoundsRef.current) playSound('gameover', soundEnabled)
      stopTimer()
      setGameOverTitle('Draw')
      setGameOverMessage('The game is a draw.')
      setGameOverDraw(true)
      setShowGameOver(true)
      trackGameAchievement('draw', null)
    } else {
      let text = `${moveColor}'s turn`
      const kind = game.turn() === 'w' ? 'white-turn' : 'black-turn'
      if (game.in_check()) {
        text += ' (CHECK!)'
        setSafeStatus(text, 'check')
        if (!muteSoundsRef.current) playSound('check', soundEnabled)
      } else {
        setSafeStatus(text, kind)
      }
    }
    refreshThreatAlert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundEnabled, trackGameAchievement, setSafeStatus, refreshThreatAlert])

  // Timer
  const timerIntervalRef = useRef<number | null>(null)
  const stopTimer = useCallback(() => {
    setIsTimerRunning(false)
    if (timerIntervalRef.current !== null) {
      window.clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
  }, [])
  const startTimer = useCallback(() => {
    if (initialConfig.timeControl === 0) return
    if (timerIntervalRef.current !== null) return
    setIsTimerRunning(true)
    timerIntervalRef.current = window.setInterval(() => {
      const game = chessRef.current
      if (!game) return
      if (game.game_over()) {
        stopTimer()
        return
      }
      if (game.turn() === 'w') {
        setWhiteTime((t) => {
          if (t <= 1) return 0
          return t - 1
        })
      } else {
        setBlackTime((t) => {
          if (t <= 1) return 0
          return t - 1
        })
      }
    }, 1000)
  }, [initialConfig.timeControl, stopTimer])

  // Handle timer expiration
  useEffect(() => {
    if (initialConfig.timeControl === 0) return
    if (timeExpiredRef.current) return
    if (whiteTime <= 0 || blackTime <= 0) {
      timeExpiredRef.current = true
      stopTimer()
      const winnerColor: 'w' | 'b' = whiteTime <= 0 ? 'b' : 'w'
      setSafeStatus(
        whiteTime <= 0 ? 'Game Over — Black wins on time' : 'Game Over — White wins on time',
        'gameover',
      )
      document.getElementById('myBoard')?.classList.add('theme-gameover')
      setGameOverTitle('Time Out')
      setGameOverMessage(whiteTime <= 0 ? 'Black wins on time!' : 'White wins on time!')
      setGameOverDraw(false)
      setShowGameOver(true)
      trackGameAchievement('timeout', winnerColor)
    }
  }, [whiteTime, blackTime, initialConfig.timeControl, stopTimer, setSafeStatus, trackGameAchievement])

  const applyIncrement = useCallback(
    (color: 'w' | 'b') => {
      if (initialConfig.increment <= 0 || initialConfig.timeControl === 0) return
      if (color === 'w') setWhiteTime((t) => t + initialConfig.increment)
      else setBlackTime((t) => t + initialConfig.increment)
    },
    [initialConfig.increment, initialConfig.timeControl],
  )

  // Puzzle helpers
  const updateRivalDialogue = useCallback((event: string) => {
    const messages = RIVAL_DIALOGUES[event] ?? RIVAL_DIALOGUES.start
    setCoachDialogue(pickRandom(messages))
  }, [])

  const updateProgressFromData = useCallback((data: PuzzlesData) => {
    const solved = safeGetSolved()
    const tiers: PuzzleTier[] = data.tiers ?? []
    const counts = [0, 0, 0]
    const totals = [0, 0, 0]
    for (let t = 0; t < tiers.length && t < 3; t++) {
      totals[t] = tiers[t].puzzles.length
      for (const p of tiers[t].puzzles) if (solved.includes(p.id)) counts[t]++
    }
    setProgressData({
      counts,
      totals,
      total: counts.reduce((a, b) => a + b, 0),
      totalAll: totals.reduce((a, b) => a + b, 0),
    })
  }, [])

  const loadPuzzle = useCallback(
    async (previousId: string | null) => {
      setSafeStatus('Loading puzzle...')
      try {
        const data = await loadPuzzles()
        puzzleDataPayloadRef.current = data
        const puzzles = flattenPuzzles(data)
        if (!puzzles.length) {
          setSafeStatus('No puzzles available')
          return
        }

        let idx: number
        if (previousId) {
          idx = puzzles.findIndex((p) => p.id === previousId)
          if (idx === -1) idx = 0
          idx = (idx + 1) % puzzles.length
        } else if (urlPuzzle) {
          idx = puzzles.findIndex((p) => p.id === urlPuzzle)
          if (idx === -1) idx = 0
        } else {
          const today = new Date()
          const daySeed = today.getFullYear() * 366 + (today.getMonth() + 1) * 31 + today.getDate()
          idx = daySeed % puzzles.length
        }
        const pd = puzzles[idx]
        puzzleDataRef.current = pd
        puzzleSolutionIndexRef.current = 0
        puzzleSolvedRef.current = false
        puzzleFailedRef.current = false
        puzzleHintShownRef.current = false
        puzzleHintUsedRef.current = false

        const game = chessRef.current
        const board = boardRef.current
        if (!game || !board) return

        const loaded = game.load(pd.fen)
        if (!loaded) {
          setSafeStatus('Error loading puzzle position')
          return
        }
        board.position(pd.fen)
        moveHistoryRef.current = []
        capturedWhiteRef.current = []
        capturedBlackRef.current = []
        setMoveHistory([])
        setCapturedWhite([])
        setCapturedBlack([])
        gameStartedRef.current = false
        stopTimer()

        const turn = game.turn()
        board.orientation(turn === 'b' ? 'black' : 'white')

        updateGameTheme()

        setPuzzleDesc(pd.description)
        setPuzzleDifficulty('★'.repeat(pd.difficulty) + '☆'.repeat(5 - pd.difficulty))
        setPuzzleMoves('Moves: ' + pd.solution.length)
        setPuzzleStatus('Difficulty ' + pd.difficulty + '/5')
        setPuzzleHint('')

        setSafeStatus('Find the best move!', '', turn === 'w' ? '#4ecdc4' : '#ba55d3')
        updateRivalDialogue('start')
        updateProgressFromData(data)
      } catch (err) {
        console.error('Failed to load puzzles:', err)
        setSafeStatus('Error loading puzzles. Try refreshing.')
      }
    },
    [urlPuzzle, setSafeStatus, stopTimer, updateGameTheme, updateRivalDialogue, updateProgressFromData],
  )

  // AI move logic
  const applyAIMoveFromSAN = useCallback(
    (san: string) => {
      const game = chessRef.current
      const board = boardRef.current
      if (!game || !board) return
      const move = game.move(san)
      if (!move) {
        isAIMovingRef.current = false
        setAiThinking(false)
        return
      }
      if (move.captured) {
        const capturedColor = move.color === 'w' ? 'b' : 'w'
        const capturedPiece = move.captured.toUpperCase()
        if (capturedColor === 'w') capturedWhiteRef.current.push(capturedPiece)
        else capturedBlackRef.current.push(capturedPiece)
        playSound('capture', soundEnabled)
      } else {
        playSound('move', soundEnabled)
      }
      moveHistoryRef.current.push({
        from: move.from,
        to: move.to,
        piece: move.piece,
        color: move.color,
        captured: move.captured,
        promotion: move.promotion,
        san: move.san,
      })
      try {
        board.position(game.fen(), !blindfoldMode)
      } catch {
        // ignore
      }
      highlightLastMove(move.from, move.to)
      updateBlindfoldVisibility(move.to)
      isAIMovingRef.current = false
      setAiThinking(false)
      updateStatus()
      updateGameTheme()
      setMoveHistory([...moveHistoryRef.current])
      setCapturedWhite([...capturedWhiteRef.current])
      setCapturedBlack([...capturedBlackRef.current])
    },
    [soundEnabled, blindfoldMode, highlightLastMove, updateBlindfoldVisibility, updateStatus, updateGameTheme],
  )

  const makeAIMove = useCallback(() => {
    const game = chessRef.current
    if (!game) return
    const sf = stockfishRef.current
    if (!sf) return
    const aiColor = playerColorRef.current === 'w' ? 'b' : 'w'
    if (game.game_over() || game.turn() !== aiColor) return
    if (isAIMovingRef.current) return

    isAIMovingRef.current = true
    setAiThinking(true)

    const moveCount = moveHistoryRef.current.length
    const skill = SKILL_MAP[aiDifficulty]

    // Random blunder for very low skill
    if (skill <= 1 && Math.random() < 0.15) {
      const moves = game.moves({ verbose: true }) as ChessJsMove[]
      if (moves.length) {
        const random = moves[Math.floor(Math.random() * moves.length)]
        window.setTimeout(() => applyAIMoveFromSAN(random.san), 400)
        return
      }
    }
    if (aiDifficulty === '5' && Math.random() < 0.1) {
      const moves = game.moves({ verbose: true }) as ChessJsMove[]
      if (moves.length) {
        const random = moves[Math.floor(Math.random() * moves.length)]
        window.setTimeout(() => applyAIMoveFromSAN(random.san), 400)
        return
      }
    }

    const baseDepth = BASE_DEPTH[aiDifficulty]
    const maxDepth = MAX_DEPTH[aiDifficulty]
    const progress = Math.min(moveCount / 20, 1)
    const depth = Math.round(baseDepth + (maxDepth - baseDepth) * progress)
    const baseTo = BASE_TIMEOUT[aiDifficulty]
    const maxTo = MAX_TIMEOUT[aiDifficulty]
    const timeoutMs = Math.round(baseTo + (maxTo - baseTo) * progress)

    sf.setSkill(skill)
    const movesStr = moveHistoryRef.current.map((m) => m.from + m.to + (m.promotion ?? '')).join(' ')
    sf.positionFromMoves(movesStr)
    sf.go(depth, timeoutMs)
  }, [aiDifficulty, applyAIMoveFromSAN])

  // Stockfish best move callback
  const handleBestMove = useCallback(
    (bestMove: string) => {
      if (!isAIMovingRef.current) return
      const game = chessRef.current
      const board = boardRef.current
      if (!game || !board) return
      setAiThinking(false)
      if (!bestMove || bestMove === '(none)') {
        isAIMovingRef.current = false
        return
      }
      const from = bestMove.substring(0, 2)
      const to = bestMove.substring(2, 4)
      const promotion = bestMove.length > 4 ? bestMove.substring(4, 5) : undefined
      const move = game.move({ from, to, promotion: promotion ?? 'q' })
      isAIMovingRef.current = false
      if (!move) return

      if (move.captured) {
        const capturedColor = move.color === 'w' ? 'b' : 'w'
        const piece = move.captured.toUpperCase()
        if (capturedColor === 'w') capturedWhiteRef.current.push(piece)
        else capturedBlackRef.current.push(piece)
        playSound('capture', soundEnabled)
      } else {
        playSound('move', soundEnabled)
      }
      moveHistoryRef.current.push({
        from,
        to,
        piece: move.piece,
        color: move.color,
        captured: move.captured,
        promotion: promotion,
        san: move.san,
      })
      try {
        board.position(game.fen(), !blindfoldMode)
      } catch {
        // ignore
      }
      highlightLastMove(from, to)
      updateBlindfoldVisibility(to)
      updateStatus()
      updateGameTheme()
      setMoveHistory([...moveHistoryRef.current])
      setCapturedWhite([...capturedWhiteRef.current])
      setCapturedBlack([...capturedBlackRef.current])
      applyIncrement(move.color)
    },
    [soundEnabled, blindfoldMode, highlightLastMove, updateBlindfoldVisibility, updateStatus, updateGameTheme, applyIncrement],
  )

  const handleEval = useCallback(
    (score: EvalScore) => {
      if (!evalEnabled) return
      const game = chessRef.current
      if (!game) return
      const sign = game.turn() === 'b' ? -1 : 1
      if (score.kind === 'mate') {
        setEvalState({ value: score.value * sign > 0 ? 10 : -10, mate: score.value * sign })
      } else {
        const v = (score.value / 100) * sign
        setEvalState({ value: Math.max(-10, Math.min(10, v)), mate: null })
      }
    },
    [evalEnabled],
  )

  // --- Best Move hint overlay ---
  const clearHint = useCallback(() => {
    const wasPending = hintPendingRef.current
    document.querySelectorAll('.best-move-highlight').forEach((n) => n.classList.remove('best-move-highlight'))
    const svg = document.getElementById('hintArrowSvg')
    if (svg) svg.remove()
    hintPendingRef.current = false
    setHintActive(null)
    if (wasPending) stockfishRef.current?.stop()
  }, [])

  const drawHintArrow = useCallback((from: string, to: string) => {
    const boardEl = document.getElementById('myBoard')
    if (!boardEl) return
    const fromSq = boardEl.querySelector<HTMLElement>(`[data-squareid="${from}"]`)
    const toSq = boardEl.querySelector<HTMLElement>(`[data-squareid="${to}"]`)
    if (!fromSq || !toSq) return
    const br = boardEl.getBoundingClientRect()
    const fr = fromSq.getBoundingClientRect()
    const tr = toSq.getBoundingClientRect()
    const x1 = fr.left - br.left + fr.width / 2
    const y1 = fr.top - br.top + fr.height / 2
    const x2 = tr.left - br.left + tr.width / 2
    const y2 = tr.top - br.top + tr.height / 2
    const SVGNS = 'http://www.w3.org/2000/svg'
    let svg = document.getElementById('hintArrowSvg') as SVGSVGElement | null
    if (!svg) {
      svg = document.createElementNS(SVGNS, 'svg')
      svg.id = 'hintArrowSvg'
      svg.style.position = 'absolute'
      svg.style.inset = '0'
      svg.style.width = '100%'
      svg.style.height = '100%'
      svg.style.pointerEvents = 'none'
      svg.style.zIndex = '50'
      boardEl.appendChild(svg)
    }
    svg.innerHTML = ''
    const w = boardEl.clientWidth
    const h = boardEl.clientHeight
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.hypot(dx, dy) || 1
    const ux = dx / len
    const uy = dy / len
    const headLen = Math.min(26, len * 0.4)
    const lineEndX = x2 - ux * headLen * 0.6
    const lineEndY = y2 - uy * headLen * 0.6
    const line = document.createElementNS(SVGNS, 'line')
    line.setAttribute('x1', String(x1))
    line.setAttribute('y1', String(y1))
    line.setAttribute('x2', String(lineEndX))
    line.setAttribute('y2', String(lineEndY))
    line.setAttribute('stroke', 'rgba(255,215,0,0.95)')
    line.setAttribute('stroke-width', '9')
    line.setAttribute('stroke-linecap', 'round')
    line.setAttribute('filter', 'drop-shadow(0 0 6px rgba(255,215,0,0.9))')
    svg.appendChild(line)
    const ang = Math.atan2(dy, dx)
    const a1 = ang + Math.PI - 0.5
    const a2 = ang + Math.PI + 0.5
    const p1x = x2 + Math.cos(a1) * headLen
    const p1y = y2 + Math.sin(a1) * headLen
    const p2x = x2 + Math.cos(a2) * headLen
    const p2y = y2 + Math.sin(a2) * headLen
    const head = document.createElementNS(SVGNS, 'polygon')
    head.setAttribute('points', `${x2},${y2} ${p1x},${p1y} ${p2x},${p2y}`)
    head.setAttribute('fill', 'rgba(255,215,0,0.95)')
    svg.appendChild(head)
  }, [])

  const showHintMove = useCallback(
    (best: string) => {
      if (!best || best === '(none)' || best.length < 4) return
      const from = best.slice(0, 2)
      const to = best.slice(2, 4)
      clearHint()
      ;[from, to].forEach((sq) => {
        document.querySelector(`[data-squareid="${sq}"]`)?.classList.add('best-move-highlight')
      })
      drawHintArrow(from, to)
      setHintActive(`${from}${to}`)
      window.setTimeout(() => clearHint(), 6000)
    },
    [clearHint, drawHintArrow],
  )

  // Route engine bestmove: hint request takes priority, otherwise AI move
  const dispatchBestMove = useCallback(
    (bestMove: string) => {
      if (hintPendingRef.current) {
        showHintMove(bestMove)
        return
      }
      handleBestMove(bestMove)
    },
    [handleBestMove, showHintMove],
  )

  const requestHint = useCallback(() => {
    const game = chessRef.current
    if (!game || game.game_over()) return
    if (!bestMoveEnabled) return
    // Only hint on the player's turn and when AI isn't thinking
    if (initialConfig.gameMode === 'ai' && game.turn() !== playerColorRef.current) return
    if (isAIMovingRef.current || aiThinking) return
    // Ensure engine exists (also supports non-AI modes)
    if (!stockfishRef.current) {
      const engine = createStockfish()
      if (!engine) return
      stockfishRef.current = engine
      engine.setCallbacks({ onBestMove: dispatchBestMove, onEval: handleEval })
    }
    const sf = stockfishRef.current
    clearHint()
    hintPendingRef.current = true
    setHintActive('...')
    sf.stop?.()
    sf.positionFen(game.fen())
    sf.setSkill(20)
    sf.go(15, 1200)
  }, [bestMoveEnabled, initialConfig.gameMode, aiThinking, clearHint, dispatchBestMove, handleEval])

  // --- Legal move dots ---
  const clearLegalDots = useCallback(() => {
    document.querySelectorAll('.highlight-legal').forEach((el) => el.classList.remove('highlight-legal'))
    setLegalPreviewSource(null)
  }, [])

  const showLegalDots = useCallback(
    (source: string) => {
      const game = chessRef.current
      if (!game) return
      clearLegalDots()
      const moves = game.moves({ square: source as never, verbose: true }) as ChessJsMove[]
      moves.forEach((m) => {
        document.querySelector(`[data-squareid="${m.to}"]`)?.classList.add('highlight-legal')
      })
      setLegalPreviewSource(source)
    },
    [clearLegalDots],
  )


  // Drop / drag handlers
  const onDragStart = useCallback(
    (_source: string, piece: string): boolean => {
      const game = chessRef.current
      if (!game) return false
      if (game.game_over()) return false
      if (timeExpiredRef.current) return false
      if (initialConfig.gameMode === 'ai' && game.turn() !== playerColorRef.current) return false
      if (puzzleMode && (puzzleSolvedRef.current || puzzleFailedRef.current)) return false
      if (
        (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)
      ) {
        return false
      }
      if (legalMovesEnabled && !puzzleMode) showLegalDots(_source)
      return true
    },
    [initialConfig.gameMode, puzzleMode, legalMovesEnabled, showLegalDots],
  )

  const handlePuzzleSolved = useCallback(
    (pd: Puzzle) => {
      puzzleSolvedRef.current = true
      markPuzzleSolvedLocal(pd.id)
      playSound('gameover', soundEnabled)
      setSafeStatus('Puzzle Solved! ✓', '', '#0f0')
      setPuzzleStatus('✓ Solved!')

      const tier = pd.id.charAt(0)
      if (tier === 'e') updateRivalDialogue('solved_easy')
      else if (tier === 'm') updateRivalDialogue('solved_medium')
      else updateRivalDialogue('solved_hard')

      trackPuzzleSolved(pd.id, puzzleHintUsedRef.current)
      puzzleHintUsedRef.current = false

      setPuzzleCompleteMessage(pd.description)
      setShowPuzzleComplete(true)

      if (puzzleDataPayloadRef.current) {
        updateProgressFromData(puzzleDataPayloadRef.current)
      } else {
        loadPuzzles()
          .then((d) => updateProgressFromData(d))
          .catch(() => {})
      }
    },
    [soundEnabled, setSafeStatus, updateRivalDialogue, updateProgressFromData],
  )

  const onPuzzleDrop = useCallback(
    (source: string, target: string): 'snapback' | void => {
      const game = chessRef.current
      const board = boardRef.current
      const pd = puzzleDataRef.current
      if (!game || !board) return 'snapback'
      if (puzzleSolvedRef.current || puzzleFailedRef.current) return 'snapback'
      if (!pd) return 'snapback'

      const move = game.move({ from: source, to: target, promotion: 'q' })
      if (move === null) {
        const el = document.getElementById('myBoard')
        if (el) {
          el.classList.add('flash-red')
          window.setTimeout(() => el.classList.remove('flash-red'), 450)
        }
        return 'snapback'
      }

      const expected = pd.solution[puzzleSolutionIndexRef.current]
      if (move.san === expected) {
        puzzleSolutionIndexRef.current++
        playSound(move.captured ? 'capture' : 'move', soundEnabled)
        updateRivalDialogue('correct')
        moveHistoryRef.current.push({
          from: source,
          to: target,
          piece: move.piece,
          color: move.color,
          captured: move.captured,
          promotion: move.promotion,
          san: move.san,
        })
        board.position(game.fen())
        setMoveHistory([...moveHistoryRef.current])
        setCapturedWhite([...capturedWhiteRef.current])
        setCapturedBlack([...capturedBlackRef.current])
        updateGameTheme()

        if (puzzleSolutionIndexRef.current >= pd.solution.length) {
          handlePuzzleSolved(pd)
        } else {
          setSafeStatus('Correct! Find the next move...', '', '#4ecdc4')
          if (puzzleSolutionIndexRef.current < pd.solution.length) {
            const oppSan = pd.solution[puzzleSolutionIndexRef.current]
            const oppMove = game.move(oppSan)
            if (oppMove) {
              puzzleSolutionIndexRef.current++
              if (oppMove.captured) {
                const cc = oppMove.color === 'w' ? 'b' : 'w'
                const piece = oppMove.captured.toUpperCase()
                if (cc === 'w') capturedWhiteRef.current.push(piece)
                else capturedBlackRef.current.push(piece)
              }
              moveHistoryRef.current.push({
                from: oppMove.from,
                to: oppMove.to,
                piece: oppMove.piece,
                color: oppMove.color,
                captured: oppMove.captured,
                promotion: oppMove.promotion,
                san: oppMove.san,
              })
              board.position(game.fen())
              setMoveHistory([...moveHistoryRef.current])
              setCapturedWhite([...capturedWhiteRef.current])
              setCapturedBlack([...capturedBlackRef.current])
              if (puzzleSolutionIndexRef.current >= pd.solution.length) {
                handlePuzzleSolved(pd)
              }
            }
          }
        }
        return
      }
      // wrong
      game.undo()
      puzzleFailedRef.current = true
      playSound('check', soundEnabled)
      updateRivalDialogue('wrong')
      setSafeStatus(`Incorrect! The best move was ${expected}`, '', '#e94560')
      setPuzzleStatus('✗ Try again')
      window.setTimeout(() => {
        puzzleFailedRef.current = false
        const g = chessRef.current
        setSafeStatus('Find the best move!', '', g ? (g.turn() === 'w' ? '#4ecdc4' : '#ba55d3') : '')
        if (puzzleDataRef.current) setPuzzleStatus('Difficulty ' + puzzleDataRef.current.difficulty + '/5')
      }, 2500)
      return 'snapback'
    },
    [soundEnabled, updateRivalDialogue, updateGameTheme, handlePuzzleSolved, setSafeStatus],
  )

  const onDrop = useCallback(
    (source: string, target: string): 'snapback' | void => {
      clearLegalDots()
      clearHint()
      if (puzzleMode) return onPuzzleDrop(source, target)
      const game = chessRef.current
      if (!game) return 'snapback'
      if (initialConfig.gameMode === 'ai' && game.turn() !== playerColorRef.current) return 'snapback'
      if (!gameStartedRef.current) {
        gameStartedRef.current = true
        startTimer()
      }
      const move = game.move({ from: source, to: target, promotion: 'q' })
      if (move !== null && move.promotion) {
        game.undo()
        pendingMoveRef.current = { from: source, to: target }
        setPromotionColor(game.turn())
        setShowPromotion(true)
        return 'snapback'
      }
      if (move === null) {
        const el = document.getElementById('myBoard')
        if (el) {
          el.classList.add('flash-red')
          window.setTimeout(() => el.classList.remove('flash-red'), 450)
        }
        return 'snapback'
      }
      if (move.captured) {
        const capturedColor = move.color === 'w' ? 'b' : 'w'
        const piece = move.captured.toUpperCase()
        if (capturedColor === 'w') capturedWhiteRef.current.push(piece)
        else capturedBlackRef.current.push(piece)
        playSound('capture', soundEnabled)
      } else {
        playSound('move', soundEnabled)
      }
      moveHistoryRef.current.push({
        from: source,
        to: target,
        piece: move.piece,
        color: move.color,
        captured: move.captured,
        promotion: move.promotion,
        san: move.san,
      })
      trackMove(move)
      const el = document.getElementById('myBoard')
      el?.setAttribute('data-valid-move', 'true')
      updateBlindfoldVisibility(target)
    },
    [puzzleMode, onPuzzleDrop, initialConfig.gameMode, startTimer, soundEnabled, updateBlindfoldVisibility, clearLegalDots, clearHint],
  )

  const onSnapEnd = useCallback(() => {
    const game = chessRef.current
    const board = boardRef.current
    if (!game || !board) return
    clearLegalDots()
    try {
      board.position(game.fen(), !blindfoldMode)
    } catch {
      // ignore
    }
    refreshBlindfoldVisibility()
    const el = document.getElementById('myBoard')
    if (el?.hasAttribute('data-valid-move')) {
      const last = moveHistoryRef.current[moveHistoryRef.current.length - 1]
      if (last) highlightLastMove(last.from, last.to)
      updateStatus()
      updateGameTheme()
      setMoveHistory([...moveHistoryRef.current])
      setCapturedWhite([...capturedWhiteRef.current])
      setCapturedBlack([...capturedBlackRef.current])
      el.removeAttribute('data-valid-move')
      if (last) applyIncrement(last.color)
      if (initialConfig.gameMode === 'ai' && !game.game_over() && game.turn() !== playerColorRef.current) {
        window.setTimeout(makeAIMove, 300)
      }
    }
    if (puzzleMode) {
      board.position(game.fen())
    }
  }, [
    blindfoldMode,
    refreshBlindfoldVisibility,
    highlightLastMove,
    updateStatus,
    updateGameTheme,
    applyIncrement,
    initialConfig.gameMode,
    makeAIMove,
    puzzleMode,
    clearLegalDots,
  ])

  const onBoardReady = useCallback(
    (handles: BoardHandles) => {
      boardRef.current = handles.board
      chessRef.current = handles.chess

      // Apply theme
      updateBoardThemeClass()

      // Start engine for AI mode (create once, survives Board remounts)
      if (!puzzleMode && initialConfig.gameMode === 'ai') {
        if (!stockfishRef.current) {
          const engine = createStockfish()
          if (engine) {
            stockfishRef.current = engine
            engine.setCallbacks({ onBestMove: dispatchBestMove, onEval: handleEval })
            engine.setSkill(SKILL_MAP[aiDifficulty])
          }
        } else {
          stockfishRef.current.setCallbacks({ onBestMove: dispatchBestMove, onEval: handleEval })
          stockfishRef.current.setSkill(SKILL_MAP[aiDifficulty])
        }
      }

      updateStatus()
      updateGameTheme()

      // Puzzle mode setup
      if (puzzleMode) {
        loadPuzzle(null)
      }

      // Blindfold mode setup
      if (blindfoldMode) {
        const el = document.getElementById('myBoard')
        el?.classList.add('blindfold-mode')
        startBlindfoldObserver()
      }
    },
    [
      updateBoardThemeClass,
      puzzleMode,
      initialConfig.gameMode,
      dispatchBestMove,
      handleEval,
      aiDifficulty,
      updateStatus,
      updateGameTheme,
      loadPuzzle,
      blindfoldMode,
      startBlindfoldObserver,
    ],
  )

  // Cleanup engine on unmount
  useEffect(() => {
    return () => {
      stockfishRef.current?.destroy()
      stockfishRef.current = null
      stopTimer()
      bfObserverRef.current?.disconnect()
      bfObserverRef.current = null
    }
  }, [stopTimer])

  // Re-apply board theme class when it changes (e.g., user selects from settings)
  useEffect(() => {
    updateBoardThemeClass()
  }, [boardTheme, updateBoardThemeClass])

  // Persist sound preference
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SOUND, soundEnabled ? '1' : '0')
    } catch {
      // ignore
    }
  }, [soundEnabled])

  // Promotion handler
  const handlePromote = useCallback(
    (pieceType: 'q' | 'r' | 'b' | 'n') => {
      setShowPromotion(false)
      const pending = pendingMoveRef.current
      if (!pending) return
      const game = chessRef.current
      const board = boardRef.current
      if (!game || !board) return
      const move = game.move({ from: pending.from, to: pending.to, promotion: pieceType })
      if (!move) {
        pendingMoveRef.current = null
        return
      }
      if (move.captured) {
        const capturedColor = move.color === 'w' ? 'b' : 'w'
        const piece = move.captured.toUpperCase()
        if (capturedColor === 'w') capturedWhiteRef.current.push(piece)
        else capturedBlackRef.current.push(piece)
        playSound('capture', soundEnabled)
      } else {
        playSound('move', soundEnabled)
      }
      moveHistoryRef.current.push({
        from: pending.from,
        to: pending.to,
        piece: move.piece,
        color: move.color,
        captured: move.captured,
        promotion: pieceType,
        san: move.san,
      })
      trackMove(move)
      try {
        board.position(game.fen(), !blindfoldMode)
      } catch {
        // ignore
      }
      updateBlindfoldVisibility(pending.to)
      pendingMoveRef.current = null
      updateStatus()
      updateGameTheme()
      setMoveHistory([...moveHistoryRef.current])
      setCapturedWhite([...capturedWhiteRef.current])
      setCapturedBlack([...capturedBlackRef.current])
      applyIncrement(move.color)
      if (initialConfig.gameMode === 'ai' && !game.game_over() && game.turn() !== playerColorRef.current) {
        window.setTimeout(makeAIMove, 300)
      }
    },
    [soundEnabled, blindfoldMode, updateBlindfoldVisibility, updateStatus, updateGameTheme, applyIncrement, initialConfig.gameMode, makeAIMove],
  )

  const cancelPendingAI = useCallback(() => {
    stockfishRef.current?.stop()
    isAIMovingRef.current = false
    setAiThinking(false)
  }, [])

  const resetGame = useCallback(() => {
    const game = chessRef.current
    const board = boardRef.current
    if (!game || !board) return
    cancelPendingAI()
    game.reset()
    board.start()
    clearHighlights()
    clearHint()
    clearLegalDots()
    moveHistoryRef.current = []
    capturedWhiteRef.current = []
    capturedBlackRef.current = []
    setMoveHistory([])
    setCapturedWhite([])
    setCapturedBlack([])
    gameStartedRef.current = false
    timeExpiredRef.current = false
    playerColorRef.current = 'w'
    setPlayerColor('w')
    board.orientation('white')
    gameStartTimeRef.current = Date.now()
    setWhiteTime(initialConfig.timeControl)
    setBlackTime(initialConfig.timeControl)
    stopTimer()
    isAIMovingRef.current = false
    pendingMoveRef.current = null
    setShowPromotion(false)
    setShowGameOver(false)
    setEvalState({ value: 0, mate: null })
    setUndosLeft(MAX_FREE_UNDOS)
    setHintActive(null)
    hintPendingRef.current = false
    updateBlindfoldVisibility(null)
    stockfishRef.current?.newGame()
    updateStatus()
    updateGameTheme()
  }, [
    cancelPendingAI,
    clearHighlights,
    clearHint,
    clearLegalDots,
    initialConfig.timeControl,
    stopTimer,
    updateBlindfoldVisibility,
    updateStatus,
    updateGameTheme,
  ])

  const undoMove = useCallback(() => {
    const game = chessRef.current
    const board = boardRef.current
    if (!game || !board) return
    if (moveHistoryRef.current.length === 0) return
    if (!undoUnlimited && undosLeft <= 0) return
    cancelPendingAI()
    clearHint()
    clearLegalDots()
    if (!game.undo()) return
    if (!undoUnlimited) setUndosLeft((n) => Math.max(0, n - 1))
    const last = moveHistoryRef.current.pop()
    if (last?.captured) {
      const cc = last.color === 'w' ? 'b' : 'w'
      if (cc === 'w' && capturedWhiteRef.current.length) capturedWhiteRef.current.pop()
      else if (cc === 'b' && capturedBlackRef.current.length) capturedBlackRef.current.pop()
    }
    if (initialConfig.gameMode === 'ai' && moveHistoryRef.current.length > 0 && game.turn() !== playerColorRef.current) {
      game.undo()
      const ai = moveHistoryRef.current.pop()
      if (ai?.captured) {
        const cc = ai.color === 'w' ? 'b' : 'w'
        if (cc === 'w' && capturedWhiteRef.current.length) capturedWhiteRef.current.pop()
        else if (cc === 'b' && capturedBlackRef.current.length) capturedBlackRef.current.pop()
      }
    }
    try {
      board.position(game.fen())
    } catch {
      // ignore
    }
    updateBlindfoldVisibility(null)
    muteSoundsRef.current = true
    updateStatus()
    muteSoundsRef.current = false
    updateGameTheme()
    setMoveHistory([...moveHistoryRef.current])
    setCapturedWhite([...capturedWhiteRef.current])
    setCapturedBlack([...capturedBlackRef.current])
  }, [cancelPendingAI, undoUnlimited, undosLeft, clearHint, clearLegalDots, initialConfig.gameMode, updateBlindfoldVisibility, updateStatus, updateGameTheme])

  const handleFlipOrSwitch = useCallback(() => {
    const board = boardRef.current
    if (!board) return
    if (initialConfig.gameMode === 'ai' && moveHistoryRef.current.length === 0) {
      const next: 'w' | 'b' = playerColorRef.current === 'w' ? 'b' : 'w'
      playerColorRef.current = next
      setPlayerColor(next)
      board.orientation(next === 'b' ? 'black' : 'white')
      if (next === 'b') window.setTimeout(makeAIMove, 500)
    } else {
      board.flip()
    }
    window.setTimeout(refreshBlindfoldVisibility, 100)
  }, [initialConfig.gameMode, makeAIMove, refreshBlindfoldVisibility])

  // Material advantage
  const materialAdvantage = useMemo(() => {
    const values: Record<string, number> = { P: 1, N: 3, B: 3, R: 5, Q: 9 }
    let whiteScore = 0
    let blackScore = 0
    for (const p of capturedBlack) whiteScore += values[p] ?? 0
    for (const p of capturedWhite) blackScore += values[p] ?? 0
    const diff = whiteScore - blackScore
    return { white: diff > 0 ? `+${diff}` : '', black: diff < 0 ? `+${Math.abs(diff)}` : '' }
  }, [capturedWhite, capturedBlack])

  // AI profile
  const aiProfile = AI_PROFILES[aiDifficulty]
  const showAiProfileSection = initialConfig.gameMode === 'ai' && !puzzleMode && !initialConfig.trial
  const showRivalProfileSection = initialConfig.trial
  const showPuzzleCoachSection = puzzleMode
  const showEvalBar = evalEnabled && !puzzleMode

  // Time label
  const timeLabel = useMemo(() => {
    if (initialConfig.timeControl <= 0) return ''
    const mins = Math.floor(initialConfig.timeControl / 60)
    return `${mins} min${initialConfig.increment > 0 ? ` +${initialConfig.increment}s` : ''}`
  }, [initialConfig.timeControl, initialConfig.increment])

  // Flip button label
  const flipBtnLabel = useMemo(() => {
    if (initialConfig.gameMode === 'ai' && moveHistory.length === 0) {
      return playerColor === 'w' ? 'Play as Black' : 'Play as White'
    }
    return 'Flip Board'
  }, [initialConfig.gameMode, moveHistory.length, playerColor])

  // Sorted captured pieces for rendering
  const sortedCapturedWhite = useMemo(() => {
    const values: Record<string, number> = { P: 1, N: 3, B: 3, R: 5, Q: 9 }
    return [...capturedWhite].sort((a, b) => (values[b] ?? 0) - (values[a] ?? 0))
  }, [capturedWhite])
  const sortedCapturedBlack = useMemo(() => {
    const values: Record<string, number> = { P: 1, N: 3, B: 3, R: 5, Q: 9 }
    return [...capturedBlack].sort((a, b) => (values[b] ?? 0) - (values[a] ?? 0))
  }, [capturedBlack])

  // Eval bar values
  const evalPct = useMemo(() => Math.max(3, Math.min(97, 50 + (evalState.value / 10) * 50)), [evalState.value])
  const evalLabelText = useMemo(() => {
    if (evalState.mate !== null) {
      const moves = Math.abs(evalState.mate)
      return evalState.mate > 0 ? `+M${moves}` : `-M${moves}`
    }
    if (Math.abs(evalState.value) >= 10) return evalState.value > 0 ? '+10.0' : '-10.0'
    return (evalState.value >= 0 ? '+' : '') + evalState.value.toFixed(1)
  }, [evalState])

  // Settings dropdown options
  const [inventoryVersion, setInventoryVersion] = useState(0)
  useEffect(() => {
    const handler = () => setInventoryVersion((v) => v + 1)
    window.addEventListener(HYPERGRID_INVENTORY_CHANGED, handler)
    return () => window.removeEventListener(HYPERGRID_INVENTORY_CHANGED, handler)
  }, [])
  const inventory = useMemo(() => (typeof window !== 'undefined' ? getInventory() : null), [inventoryVersion])
  const shopItems = useMemo(() => getItems(), [])
  const ownedBoards = useMemo(
    () => (inventory ? shopItems.boards.filter((b) => inventory.boards.includes(b.id)) : []),
    [inventory, shopItems],
  )
  const ownedPieces = useMemo(
    () => (inventory ? shopItems.pieces.filter((p) => inventory.pieces.includes(p.id)) : []),
    [inventory, shopItems],
  )
  const ownedPowerups = useMemo(
    () => (inventory ? shopItems.powerups.filter((pw) => (inventory.powerups[pw.id] ?? 0) > 0) : []),
    [inventory, shopItems],
  )

  const handleBoardThemeChange = (theme: string) => {
    setBoardTheme(theme)
    shopEquip('boards', theme)
  }
  const handlePieceSetChange = (set: string) => {
    shopEquip('pieces', set)
    setEquippedPieces(set)
    // Recreate the board so chessboardjs picks up the new pieceTheme
    setBoardKey((k) => k + 1)
  }

  // Status classes for `#status`
  const statusClassName = statusKind
  const statusStyle: React.CSSProperties = statusColor ? { color: statusColor } : {}

  // Move history rendering
  const moveRows = useMemo(() => {
    const rows: Array<{ num: number; white?: MoveRecord; black?: MoveRecord; isLast: boolean }> = []
    let n = 1
    for (let i = 0; i < moveHistory.length; i += 2) {
      const white = moveHistory[i]
      const black = moveHistory[i + 1]
      const isLast =
        i + 2 >= moveHistory.length ||
        (black !== undefined && i + 1 === moveHistory.length - 1) ||
        (!black && i === moveHistory.length - 1)
      rows.push({ num: n++, white, black, isLast })
    }
    return rows
  }, [moveHistory])

  const isInPuzzleMode = puzzleMode

  if (!hasMode) return null

  return (
    <div className={styles.gamePage}>
      <CyberCanvas skipIntro />
      <ShopButton />
      <h1 className="chess-game-title">
        HYPERGRID CHESS <span className="chess-icon">&#9823;</span>
      </h1>

      <div className="game-container">
        <div className="side-panel left-panel">
          {showAiProfileSection && (
            <div className="panel-widget ai-profile" id="aiProfileSection">
              <div className="ai-profile-body">
                <div className="ai-profile-img-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img id="aiProfileImg" src={aiProfile.img} alt="AI" />
                  <div className="ai-profile-placeholder" style={{ display: 'none' }}>
                    &#9818;
                  </div>
                </div>
                <div className="ai-profile-info">
                  <span className="ai-profile-name" id="aiProfileName">
                    {aiProfile.name}
                  </span>
                  <span className="ai-profile-elo" id="aiProfileElo">
                    {aiProfile.elo}
                  </span>
                </div>
              </div>
            </div>
          )}

          {showRivalProfileSection && (
            <div className="panel-widget ai-profile" id="rivalProfileSection">
              <div className="ai-profile-body">
                <div className="ai-profile-img-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset('/images/coach.jpg')} alt="SPECTRE" className="rival-profile-img" />
                  <div className="ai-profile-placeholder" style={{ display: 'none' }}>
                    &#9818;
                  </div>
                </div>
                <div className="ai-profile-info">
                  <span className="ai-profile-name rival-name-display">SPECTRE</span>
                  <span className="ai-profile-elo rival-elo-display">~1800 ELO</span>
                </div>
              </div>
            </div>
          )}

          {showPuzzleCoachSection && (
            <div className="panel-widget ai-profile" id="puzzleCoachSection">
              <div className="ai-profile-body">
                <div className="ai-profile-img-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset('/images/coach.jpg')} alt="SPECTRE" className="rival-profile-img" />
                  <div className="ai-profile-placeholder" style={{ display: 'none' }}>
                    &#9818;
                  </div>
                </div>
                <div className="ai-profile-info">
                  <span className="ai-profile-name rival-name-display">SPECTRE</span>
                  <span className="ai-profile-elo rival-elo-display">Puzzle Master</span>
                </div>
              </div>
              <div className="coach-dialogue" id="coachDialogue">
                {coachDialogue}
              </div>
            </div>
          )}

          {!isInPuzzleMode && (
            <div className="panel-widget capture-section" id="captureSection">
              <div className="widget-header">
                <span className="widget-title">CAPTURE</span>
              </div>
              <div className="capture-body">
                <div className="capture-group">
                  <div className="capture-label">
                    White taken <span id="materialWhite" className="material-advantage">{materialAdvantage.white}</span>
                  </div>
                  <div id="capturedWhite" className="captured-pieces">
                    {sortedCapturedWhite.map((p, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={getPieceUrl('w' + p)}
                        alt={p}
                        className="captured-piece white-captured"
                      />
                    ))}
                  </div>
                </div>
                <div className="capture-divider" />
                <div className="capture-group">
                  <div className="capture-label">
                    Black taken <span id="materialBlack" className="material-advantage">{materialAdvantage.black}</span>
                  </div>
                  <div id="capturedBlack" className="captured-pieces">
                    {sortedCapturedBlack.map((p, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={getPieceUrl('b' + p)}
                        alt={p}
                        className="captured-piece black-captured"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="center-section">
          {!isInPuzzleMode && (
            <div className="controls-top" id="controlsTop">
              <div className="control-group">
                {timeLabel && (
                  <span id="timeLabel" className="time-label-display">
                    {timeLabel}
                  </span>
                )}
              </div>
              {showEvalBar && (
                <div className="eval-bar-wrap" id="evalBarWrap" style={{ display: 'flex' }}>
                  <div className="eval-bar-container" id="evalBarContainer">
                    <div className="eval-bar-center" />
                    <div
                      className="eval-bar-fill"
                      id="evalBarFill"
                      style={{ width: `${evalPct}%` }}
                    >
                      <div className="eval-bar-fill-glow" />
                    </div>
                    <div
                      className="eval-bar-divider"
                      id="evalBarDivider"
                      style={{ left: `${evalPct}%` }}
                    />
                    <span
                      className="eval-bar-label"
                      id="evalBarLabel"
                      style={{
                        left: `${evalPct}%`,
                        transform: `translate(${evalPct > 80 ? '-110%' : evalPct < 20 ? '10%' : '-50%'}, -50%)`,
                      }}
                    >
                      {evalLabelText}
                    </span>
                  </div>
                </div>
              )}
              <div className="control-group">
                <button onClick={() => setShowSettings(true)} className="icon-btn" title="Settings">
                  &#9881;
                </button>
              </div>
            </div>
          )}

          {isInPuzzleMode && (
            <div id="puzzleBar" className="puzzle-bar" style={{ display: 'flex' }}>
              <div className="puzzle-info">
                <span id="puzzleDescription" className="puzzle-description">
                  {puzzleDesc}
                </span>
                <div className="puzzle-meta">
                  <span id="puzzleDifficulty" className="puzzle-difficulty">
                    {puzzleDifficulty}
                  </span>
                  <span id="puzzleMoves" className="puzzle-moves-count">
                    {puzzleMoves}
                  </span>
                  <span id="puzzleStatus" className="puzzle-status-badge">
                    {puzzleStatus}
                  </span>
                </div>
              </div>
              <div id="puzzleHint" className="puzzle-hint" style={{ color: '#f9ca24' }}>
                {puzzleHint}
              </div>
            </div>
          )}

          <Board
            boardKey={boardKey}
            pieceTheme={pieceTheme}
            onDragStart={onDragStart}
            onDrop={onDrop}
            onSnapEnd={onSnapEnd}
            onReady={onBoardReady}
            initialFen={chessRef.current?.fen()}
          />

          {blindfoldMode && (
            <div id="blindfoldBanner" className="blindfold-banner" style={{ display: 'flex' }}>
              <span className="blindfold-icon">&#128064;</span> BLINDFOLD MODE
            </div>
          )}

          {aiThinking && (
            <div id="aiThinking" className="ai-thinking" style={{ display: 'flex' }}>
              <span className="thinking-icon">&#9881;</span>
              AI is thinking<span className="thinking-dots">...</span>
            </div>
          )}

          <div id="openingName" className="opening-name" />

          {threatMessage && (
            <div className="threat-banner" role="status">
              {threatMessage}
            </div>
          )}

          <div id="status" className={statusClassName} style={statusStyle}>
            {statusText}
          </div>

          {!isInPuzzleMode && (
            <div className="controls-bottom" id="controlsBottom">
              <Link href="/" className="cb-link-btn">
                <button>&#8592; Menu</button>
              </Link>
              <button onClick={resetGame}>New Game</button>
              <button
                onClick={undoMove}
                disabled={!undoUnlimited && undosLeft <= 0}
                className={!undoUnlimited && undosLeft <= 0 ? 'cb-btn-disabled' : ''}
                title={undoUnlimited ? 'Unlimited undo (Undo Pack)' : `${undosLeft} undo${undosLeft === 1 ? '' : 's'} left`}
              >
                Undo{undoUnlimited ? ' \u221E' : ` (${undosLeft})`}
              </button>
              {bestMoveEnabled && (
                <button
                  id="hintBtn"
                  onClick={requestHint}
                  disabled={hintActive === '...'}
                  className={hintActive && hintActive !== '...' ? 'hint-btn-active' : ''}
                  title="Show the engine's best move"
                >
                  {hintActive === '...' ? '...' : '\u{1F4A1} Hint'}
                </button>
              )}
              <button id="flipBtn" onClick={handleFlipOrSwitch}>
                {flipBtnLabel}
              </button>
            </div>
          )}

          {isInPuzzleMode && (
            <div id="puzzleButtons" className="puzzle-buttons" style={{ display: 'flex' }}>
              <Link href="/" className="cb-link-btn">
                <button>&#8592; Menu</button>
              </Link>
              <Link href="/puzzles" className="cb-link-btn">
                <button>Map</button>
              </Link>
              <button
                onClick={() => {
                  const pd = puzzleDataRef.current
                  const game = chessRef.current
                  const board = boardRef.current
                  if (!pd || !game || !board) return
                  game.load(pd.fen)
                  board.position(pd.fen)
                  moveHistoryRef.current = []
                  capturedWhiteRef.current = []
                  capturedBlackRef.current = []
                  setMoveHistory([])
                  setCapturedWhite([])
                  setCapturedBlack([])
                  puzzleSolutionIndexRef.current = 0
                  puzzleSolvedRef.current = false
                  puzzleFailedRef.current = false
                  puzzleHintShownRef.current = false
                  puzzleHintUsedRef.current = false
                  setSafeStatus('Find the best move!', '', game.turn() === 'w' ? '#4ecdc4' : '#ba55d3')
                  setPuzzleHint('')
                  setPuzzleStatus('Difficulty ' + pd.difficulty + '/5')
                  updateGameTheme()
                }}
              >
                Retry
              </button>
              <button
                onClick={() => {
                  const pd = puzzleDataRef.current
                  if (!pd || puzzleSolvedRef.current) return
                  if (puzzleHintShownRef.current) {
                    setPuzzleHint('')
                    puzzleHintShownRef.current = false
                  } else {
                    setPuzzleHint(pd.hint)
                    puzzleHintShownRef.current = true
                    puzzleHintUsedRef.current = true
                    updateRivalDialogue('hint')
                  }
                }}
              >
                Hint
              </button>
              <button
                onClick={() => {
                  const currentId = puzzleDataRef.current?.id ?? null
                  puzzleDataRef.current = null
                  puzzleSolutionIndexRef.current = 0
                  puzzleSolvedRef.current = false
                  puzzleFailedRef.current = false
                  puzzleHintShownRef.current = false
                  puzzleHintUsedRef.current = false
                  setShowPuzzleComplete(false)
                  loadPuzzle(currentId)
                }}
              >
                Next Puzzle
              </button>
            </div>
          )}
        </div>

        <div className="side-panel right-panel">
          {!isInPuzzleMode && !blindfoldMode && initialConfig.timeControl > 0 && (
            <>
              <div className="panel-widget timer-section" id="timerSection">
                <div className={`timer white-timer${isTimerRunning && chessRef.current?.turn() === 'w' ? ' active' : ''}`} id="whiteTimer">
                  <span className="timer-label">WHITE</span>
                  <span className="timer-display">{formatTime(whiteTime)}</span>
                </div>
              </div>
              <div className="panel-widget timer-section" id="timerSection2">
                <div className={`timer black-timer${isTimerRunning && chessRef.current?.turn() === 'b' ? ' active' : ''}`} id="blackTimer">
                  <span className="timer-label">BLACK</span>
                  <span className="timer-display">{formatTime(blackTime)}</span>
                </div>
              </div>
            </>
          )}

          {!isInPuzzleMode && !blindfoldMode && (
            <div className="panel-widget move-history-section" id="moveHistorySection">
              <div className="widget-header">
                <span className="widget-title">MOVE HISTORY</span>
              </div>
              <div id="moveHistory" className="move-history">
                {moveRows.map((row, idx) => (
                  <div key={idx} className={`move-row${row.isLast ? ' last-move-row' : ''}`}>
                    <span className="move-number">{row.num}.</span>
                    <span className="move-white">{row.white ? row.white.san : ''}</span>
                    <span className="move-black">{row.black ? row.black.san : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isInPuzzleMode && (
            <Link href="/puzzles" className="panel-widget puzzle-progress-widget" id="puzzleProgressWidget" style={{ textDecoration: 'none' }}>
              <div className="widget-header">
                <span className="widget-title">PROGRESS</span>
              </div>
              <div className="puzzle-progress-body">
                <div className="puzzle-progress-tier">
                  <span className="puzzle-progress-tier-name easy-color">Rookie</span>
                  <span className="puzzle-progress-tier-count" id="progressEasy">
                    {progressData.counts[0]}/{progressData.totals[0]}
                  </span>
                </div>
                <div className="puzzle-progress-bar-mini">
                  <div
                    className="puzzle-progress-bar-fill easy-fill"
                    id="progressEasyBar"
                    style={{ width: progressData.totals[0] ? `${(progressData.counts[0] / progressData.totals[0]) * 100}%` : '0%' }}
                  />
                </div>
                <div className="puzzle-progress-tier">
                  <span className="puzzle-progress-tier-name medium-color">Tactical</span>
                  <span className="puzzle-progress-tier-count" id="progressMedium">
                    {progressData.counts[1]}/{progressData.totals[1]}
                  </span>
                </div>
                <div className="puzzle-progress-bar-mini">
                  <div
                    className="puzzle-progress-bar-fill medium-fill"
                    id="progressMediumBar"
                    style={{ width: progressData.totals[1] ? `${(progressData.counts[1] / progressData.totals[1]) * 100}%` : '0%' }}
                  />
                </div>
                <div className="puzzle-progress-tier">
                  <span className="puzzle-progress-tier-name hard-color">Master</span>
                  <span className="puzzle-progress-tier-count" id="progressHard">
                    {progressData.counts[2]}/{progressData.totals[2]}
                  </span>
                </div>
                <div className="puzzle-progress-bar-mini">
                  <div
                    className="puzzle-progress-bar-fill hard-fill"
                    id="progressHardBar"
                    style={{ width: progressData.totals[2] ? `${(progressData.counts[2] / progressData.totals[2]) * 100}%` : '0%' }}
                  />
                </div>
                <div className="puzzle-progress-total">
                  <span id="progressTotal">
                    {progressData.total} / {progressData.totalAll} solved
                  </span>
                </div>
                <div className="puzzle-progress-link">View full map &rarr;</div>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Game Over modal */}
      <div id="gameOverModal" className={`modal-overlay${showGameOver ? ' show' : ''}${gameOverDraw ? ' draw-result' : ''}`}>
        <div className="modal-content game-over-content">
          <h2 id="gameOverTitle">{gameOverTitle}</h2>
          <p id="gameOverMessage">{gameOverMessage}</p>
          <div id="gameOverStats" />
          <div className="game-over-buttons">
            <button
              onClick={() => {
                resetGame()
                setShowGameOver(false)
              }}
            >
              New Game
            </button>
            <button onClick={() => setShowGameOver(false)}>Close</button>
          </div>
        </div>
      </div>

      {/* Settings modal */}
      <div id="settingsModal" className={`modal-overlay${showSettings ? ' show' : ''}`}>
        <div className="modal-content settings-content">
          <h2>Settings</h2>
          <div className="settings-group">
            <label>Theme</label>
            <select
              id="themeSelect"
              value={boardTheme}
              onChange={(e) => handleBoardThemeChange(e.target.value)}
            >
              {ownedBoards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="settings-group">
            <label>Pieces</label>
            <select
              id="pieceSelect"
              value={equippedPieces}
              onChange={(e) => handlePieceSetChange(e.target.value)}
            >
              {ownedPieces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          {ownedPowerups.length > 0 && (
            <div className="settings-group" id="powerupSettings" style={{ display: 'block' }}>
              <label>Powerups</label>
              <div id="powerupList">
                {ownedPowerups.map((pw) => (
                  <div
                    key={pw.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '4px 0',
                      fontSize: '0.85rem',
                    }}
                  >
                    <span>
                      {pw.icon} {pw.name}
                    </span>
                    <span style={{ color: '#00ff88' }}>
                      {(inventory?.powerups[pw.id] ?? 0) > 0 ? 'Active' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="settings-group">
            <label>Sound</label>
            <button
              id="soundToggle"
              onClick={() => setSoundEnabled((s) => !s)}
              className="icon-btn"
            >
              {soundEnabled ? '\u{1F50A}' : '\u{1F507}'}
            </button>
          </div>
          <button onClick={() => setShowSettings(false)} className="btn-close-settings">
            Close
          </button>
        </div>
      </div>

      {/* Promotion modal */}
      <div id="promotionModal" className={`modal-overlay${showPromotion ? ' show' : ''}`}>
        <div className="modal-content">
          <h2>Select Promotion</h2>
          <div id="promoPieces">
            {(['q', 'r', 'b', 'n'] as const).map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p}
                src={getPieceUrl(promotionColor + p.toUpperCase())}
                alt={p}
                className="promo-piece"
                onClick={() => handlePromote(p)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Puzzle Complete modal */}
      <div id="puzzleCompleteModal" className={`modal-overlay${showPuzzleComplete ? ' show' : ''}`}>
        <div className="modal-content puzzle-complete-content">
          <h2 id="puzzleCompleteTitle">Puzzle Solved!</h2>
          <p id="puzzleCompleteMessage">{puzzleCompleteMessage}</p>
          <div className="puzzle-complete-buttons">
            <button
              onClick={() => {
                const currentId = puzzleDataRef.current?.id ?? null
                puzzleDataRef.current = null
                puzzleSolutionIndexRef.current = 0
                puzzleSolvedRef.current = false
                puzzleFailedRef.current = false
                puzzleHintShownRef.current = false
                puzzleHintUsedRef.current = false
                setShowPuzzleComplete(false)
                loadPuzzle(currentId)
              }}
            >
              Next Puzzle
            </button>
            <Link href="/puzzles" className="cb-link-btn">
              <button>Back to Map</button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
