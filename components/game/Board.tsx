'use client'

import { useEffect, useRef } from 'react'

const DEFAULT_BOARD_ELEMENT_ID = 'myBoard'

type ChessJsCtor = new (fen?: string) => ChessJsInstance

export type ChessJsMove = {
  from: string
  to: string
  piece: string
  color: 'w' | 'b'
  flags?: string
  san: string
  captured?: string
  promotion?: string
}

export type ChessJsInstance = {
  fen: () => string
  turn: () => 'w' | 'b'
  move: (m: string | { from: string; to: string; promotion?: string }) => ChessJsMove | null
  moves: (opts?: { verbose?: boolean; square?: string }) => ChessJsMove[] | string[]
  reset: () => void
  load: (fen: string) => boolean
  undo: () => ChessJsMove | null
  game_over: () => boolean
  in_checkmate: () => boolean
  in_check: () => boolean
  in_draw: () => boolean
  in_stalemate: () => boolean
  in_threefold_repetition: () => boolean
  insufficient_material: () => boolean
  history: (opts?: { verbose?: boolean }) => ChessJsMove[] | string[]
}

export type ChessboardJsConfig = {
  draggable?: boolean
  position?: string
  pieceTheme?: (piece: string) => string
  onDragStart?: (source: string, piece: string, position: object, orientation: string) => boolean | 'snapback'
  onDrop?: (source: string, target: string, piece: string, newPos: object, oldPos: object, orientation: string) => 'snapback' | void
  onSnapEnd?: () => void
}

export type ChessboardJsBoard = {
  position: (fen: string, useAnimation?: boolean) => void
  orientation: (side?: 'white' | 'black' | 'flip') => string
  start: (useAnimation?: boolean) => void
  flip: () => string
  destroy: () => void
  fen: () => string
}

type ChessboardJsCtor = (containerId: string, config: ChessboardJsConfig) => ChessboardJsBoard

declare global {
  interface Window {
    jQuery?: unknown
    $?: unknown
    Chess?: ChessJsCtor
    Chessboard?: ChessboardJsCtor
    ChessBoard?: ChessboardJsCtor
  }
}

const JQUERY_SRC = 'https://code.jquery.com/jquery-3.5.1.min.js'
const CHESSBOARDJS_CSS = 'https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/dist/chessboard-1.0.0.min.css'
const CHESSBOARDJS_JS = 'https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/dist/chessboard-1.0.0.min.js'
const CHESSJS_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js'

const loaded = new Map<string, Promise<void>>()

function ensureScript(src: string): Promise<void> {
  const existing = loaded.get(src)
  if (existing) return existing
  const promise = new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[data-game-script="${src}"]`)) {
      resolve()
      return
    }
    const tag = document.createElement('script')
    tag.src = src
    tag.async = false
    tag.dataset.gameScript = src
    tag.onload = () => resolve()
    tag.onerror = () => reject(new Error('Failed to load ' + src))
    document.head.appendChild(tag)
  })
  loaded.set(src, promise)
  return promise
}

function ensureStylesheet(href: string): void {
  if (document.querySelector(`link[data-game-style="${href}"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  link.dataset.gameStyle = href
  document.head.appendChild(link)
}

/**
 * Handles surfaced to the parent once the board has mounted.
 *
 * `chess` is a chess.js v0.10.3 instance loaded from CDN via `window.Chess`.
 * The v0 API uses snake_case method names (e.g. `game_over()`, `in_checkmate()`,
 * `in_check()`, `in_draw()`, `in_stalemate()`, `in_threefold_repetition()`,
 * `insufficient_material()`), not the camelCase names from newer chess.js
 * releases. Callers must use the v0 snake_case API.
 */
export type BoardHandles = {
  board: ChessboardJsBoard
  chess: ChessJsInstance
  Chess: ChessJsCtor
}

type BoardProps = {
  pieceTheme: (piece: string) => string
  onDragStart: (source: string, piece: string) => boolean
  onDrop: (source: string, target: string) => 'snapback' | void
  onSnapEnd: () => void
  onReady: (handles: BoardHandles) => void
  initialFen?: string
  initialOrientation?: 'white' | 'black'
  boardKey?: string | number
  elementId?: string
}

export function Board({
  pieceTheme,
  onDragStart,
  onDrop,
  onSnapEnd,
  onReady,
  initialFen,
  initialOrientation = 'white',
  boardKey = 'default',
  elementId = DEFAULT_BOARD_ELEMENT_ID,
}: BoardProps) {
  const handlersRef = useRef({ pieceTheme, onDragStart, onDrop, onSnapEnd, onReady })

  useEffect(() => {
    handlersRef.current.pieceTheme = pieceTheme
    handlersRef.current.onDragStart = onDragStart
    handlersRef.current.onDrop = onDrop
    handlersRef.current.onSnapEnd = onSnapEnd
    handlersRef.current.onReady = onReady
  })

  useEffect(() => {
    let cancelled = false
    let boardInstance: ChessboardJsBoard | null = null

    async function init() {
      ensureStylesheet(CHESSBOARDJS_CSS)
      await ensureScript(JQUERY_SRC)
      await ensureScript(CHESSJS_SRC)
      await ensureScript(CHESSBOARDJS_JS)
      if (cancelled) return

      const ChessCtor = window.Chess
      const ChessboardCtor: ChessboardJsCtor | undefined = (window.Chessboard ?? window.ChessBoard) as ChessboardJsCtor | undefined
      if (!ChessCtor || !ChessboardCtor) return

      const chess = initialFen ? new ChessCtor(initialFen) : new ChessCtor()

      boardInstance = ChessboardCtor(elementId, {
        draggable: true,
        position: initialFen ?? 'start',
        pieceTheme: (piece: string) => handlersRef.current.pieceTheme(piece),
        onDragStart: (source: string, piece: string) => handlersRef.current.onDragStart(source, piece),
        onDrop: (source: string, target: string) => handlersRef.current.onDrop(source, target),
        onSnapEnd: () => handlersRef.current.onSnapEnd(),
      })
      if (initialFen) {
        boardInstance.position(initialFen, false)
      }
      if (initialOrientation === 'black') {
        boardInstance.orientation('black')
      }
      if (!cancelled) {
        handlersRef.current.onReady({ board: boardInstance, chess, Chess: ChessCtor })
      }
    }

    init().catch((err) => {
      console.error('Board init failed:', err)
    })

    return () => {
      cancelled = true
      try {
        boardInstance?.destroy()
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardKey, elementId, initialFen])

  return <div id={elementId} />
}
