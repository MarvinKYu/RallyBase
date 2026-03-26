/**
 * Maps SE bracket round numbers to human-readable labels.
 *
 * Counting from the Final backward:
 *   offset 0 (last round)  → "Final"
 *   offset 1               → "Semifinal"
 *   offset 2               → "Quarterfinal"
 *   offset 3               → "Round of 16"
 *   offset 4               → "Round of 32"
 *   offset n (n >= 3)      → "Round of " + 2^(n+1)
 */
export function getRoundLabel(round: number, totalRounds: number): string {
  const offset = totalRounds - round; // 0 = Final, 1 = SF, 2 = QF, …
  switch (offset) {
    case 0:
      return "Final";
    case 1:
      return "Semifinal";
    case 2:
      return "Quarterfinal";
    default:
      return `Round of ${Math.pow(2, offset + 1)}`;
  }
}
