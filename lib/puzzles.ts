export type Puzzle = {
  id: string;
  fen: string;
  solution: string[];
  hint: string;
  difficulty: number;
  description: string;
};

export type Tier = {
  id: string;
  name: string;
  description: string;
  rival_intro: string;
  puzzles: Puzzle[];
};

export type Trial = {
  name: string;
  description: string;
  ai_difficulty: string;
  rival_taunt: string;
};

export type PuzzlesData = {
  tiers: Tier[];
  trial: Trial;
};

export async function loadPuzzles(): Promise<PuzzlesData> {
  const r = await fetch("/data/puzzles.json");
  if (!r.ok) throw new Error("puzzles load failed");
  return r.json();
}
