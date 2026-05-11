export function scoreLines(linesCleared: number, level: number): number {
  const table = [0, 100, 300, 500, 800];
  return (table[linesCleared] ?? 0) * level;
}

export function gravityInterval(level: number): number {
  return Math.max(85, 1000 - (level - 1) * 75);
}
