import { asset } from './assets'

export type SkillLevel = 1 | 4 | 7 | 14 | 20
export type EvalScore =
  | { kind: 'cp'; value: number }
  | { kind: 'mate'; value: number }

export type EngineCallbacks = {
  onBestMove?: (move: string) => void
  onEval?: (score: EvalScore) => void
}

export type StockfishEngine = {
  setSkill: (skill: SkillLevel) => void
  setCallbacks: (cb: EngineCallbacks) => void
  newGame: () => void
  positionFromMoves: (movesUci: string) => void
  positionFen: (fen: string) => void
  go: (depth: number, timeoutMs?: number) => void
  stop: () => void
  destroy: () => void
}

export function createStockfish(scriptUrl = asset('/engine/stockfish-18-lite-single.js')): StockfishEngine | null {
  if (typeof window === 'undefined') return null
  let worker: Worker | null = null
  try {
    worker = new Worker(scriptUrl)
  } catch {
    return null
  }

  let cb: EngineCallbacks = {}
  let timeoutId: number | null = null

  worker.onmessage = (e: MessageEvent<string>) => {
    const message = typeof e.data === 'string' ? e.data : ''
    if (!message) return
    if (message.startsWith('bestmove')) {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
        timeoutId = null
      }
      const parts = message.split(' ')
      const best = parts[1]
      if (best && cb.onBestMove) cb.onBestMove(best)
      return
    }
    if (message.indexOf('score') !== -1) {
      const cpMatch = message.match(/\bscore cp (-?\d+)/)
      const mateMatch = message.match(/\bscore mate (-?\d+)/)
      const pvMatch = message.match(/\bmultipv (\d+)/)
      if ((!pvMatch || pvMatch[1] === '1') && (cpMatch || mateMatch) && cb.onEval) {
        if (mateMatch) {
          cb.onEval({ kind: 'mate', value: parseInt(mateMatch[1], 10) })
        } else if (cpMatch) {
          cb.onEval({ kind: 'cp', value: parseInt(cpMatch[1], 10) })
        }
      }
    }
  }

  worker.postMessage('uci')
  worker.postMessage('isready')

  return {
    setSkill(skill) {
      worker?.postMessage('setoption name Skill Level value ' + skill)
    },
    setCallbacks(next) {
      cb = { ...cb, ...next }
    },
    newGame() {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
        timeoutId = null
      }
      worker?.postMessage('ucinewgame')
    },
    positionFromMoves(movesUci) {
      if (movesUci) worker?.postMessage('position startpos moves ' + movesUci)
      else worker?.postMessage('position startpos')
    },
    positionFen(fen) {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
        timeoutId = null
      }
      worker?.postMessage('position fen ' + fen)
    },
    go(depth, timeoutMs) {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
        timeoutId = null
      }
      if (timeoutMs && timeoutMs > 0) {
        timeoutId = window.setTimeout(() => {
          worker?.postMessage('stop')
          timeoutId = null
        }, timeoutMs)
      }
      worker?.postMessage('go depth ' + depth)
    },
    stop() {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
        timeoutId = null
      }
      worker?.postMessage('stop')
    },
    destroy() {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
        timeoutId = null
      }
      worker?.terminate()
      worker = null
    },
  }
}
