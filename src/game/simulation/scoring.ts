export function scoreLines(linesCleared: number, level: number): number {
  const table = [0, 100, 300, 500, 800];
  return (table[linesCleared] ?? 0) * level;
}

export function gravityInterval(level: number, score = 0): number {
  const scoreTier = Math.min(14, Math.floor(score / 2500));
  return Math.max(70, 1000 - (level - 1) * 75 - scoreTier * 35);
}
