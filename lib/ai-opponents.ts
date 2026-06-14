import { asset } from './assets'

export type Difficulty = '1' | '2' | '3' | '4' | '5'

export type AiOpponent = {
  diff: Difficulty
  name: string
  elo: string
  image: string
  mode?: 'BLINDFOLD MODE'
  colorClass: 'diff1' | 'diff2' | 'diff3' | 'diff4' | 'diff5'
}

export const AI_OPPONENTS: AiOpponent[] = [
  { diff: '1', name: 'Nova', elo: '~600 ELO', image: asset('/images/beginner.jpg'), colorClass: 'diff1' },
  { diff: '2', name: 'Phantom', elo: '~1400 ELO', image: asset('/images/medium1.jpg'), colorClass: 'diff2' },
  { diff: '3', name: 'Overlord', elo: '~1800 ELO', image: asset('/images/medium2.jpg'), colorClass: 'diff3' },
  { diff: '4', name: 'HyperGrid', elo: '3000+ ELO', image: asset('/images/master.jpg'), colorClass: 'diff4' },
  { diff: '5', name: 'Blind', elo: '~1000 ELO', image: asset('/images/blind.jpg'), mode: 'BLINDFOLD MODE', colorClass: 'diff5' },
]

export const AI_NAMES: Record<Difficulty, string> = {
  '1': 'Nova',
  '2': 'Phantom',
  '3': 'Overlord',
  '4': 'HyperGrid',
  '5': 'Blind',
}

export function getAiByDiff(diff: string | null | undefined): AiOpponent {
  return AI_OPPONENTS.find((o) => o.diff === diff) ?? AI_OPPONENTS[0]
}
