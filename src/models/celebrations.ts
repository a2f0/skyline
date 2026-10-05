// Documented Chicago window displays, adapted to the modeled south facade.
// Sources and the limits of each reconstruction: docs/celebration-lighting.md.
// `adapted` identifies unverified wording; all window placements are reconstructed.
export const celebrations = [
  { id: "bulls", label: "Bulls", lines: ["GO", "BULLS"], adapted: true },
  { id: "cubs", label: "Cubs", lines: ["GO", "CUBS", "GO"], adapted: false },
  { id: "sox", label: "White Sox", lines: ["SOX", "PRIDE"], adapted: false },
  { id: "bears", label: "Bears", lines: ["BEAR", "DOWN"], adapted: false },
  { id: "hawks", label: "Blackhawks", lines: ["HAWKS", "WIN"], adapted: false },
  { id: "thanks", label: "Thanksgiving", lines: ["GIVE", "THANKS"], adapted: false },
] as const;
export type CelebrationId = typeof celebrations[number]["id"];
export interface Celebration {
  readonly id: CelebrationId;
  readonly label: string;
  readonly lines: readonly string[];
  readonly adapted: boolean;
}

// Five floors per letter, with a dark window between letters. These are compact
// reconstructions, not claims to reproduce an electrician's original shade plan.
const letters: Record<string, readonly string[]> = {
  A: ["01110", "10001", "11111", "10001", "10001"],
  B: ["11110", "10001", "11110", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "11110", "10000", "11111"],
  G: ["01111", "10000", "10111", "10001", "01111"],
  H: ["10001", "10001", "11111", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "11111"],
  K: ["10001", "10010", "11100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "11111"],
  N: ["10001", "11001", "10101", "10011", "10001"],
  O: ["01110", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "11110", "10000", "10000"],
  R: ["11110", "10001", "11110", "10010", "10001"],
  S: ["01111", "10000", "01110", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10101", "10101", "01010"],
  X: ["10001", "01010", "00100", "01010", "10001"],
};

export function windowWord(word: string): string[] {
  const glyphs = [...word].map((letter) => {
    const glyph = letters[letter];
    if (!glyph) throw new Error(`Unsupported window letter: ${letter}`);
    return glyph;
  });
  return Array.from({ length: 5 }, (_, row) => glyphs.map((glyph) => glyph[row]).join("0"));
}
