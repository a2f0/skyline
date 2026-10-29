// The colour trial's named materials (https://github.com/a2f0/skyline/issues/115), which
// colour-materials.ts assigns to every surface, colour-palette.ts measures and night-windows.ts
// lights. They live apart from all three so that each can name them without importing another.
export const materialNames = [
  "neutral", "glass", "green glass", "blue-green glass", "bronze glass", "lit window", "dim window", "lamp",
  "limestone", "marble", "white granite", "granite", "dark granite", "slate",
  "white terracotta", "pink terracotta", "green tile", "brick", "common brick", "orange brick", "brown brick", "buff brick", "glazed brick",
  "concrete", "precast", "copper", "maroon", "blue enamel", "bronze", "dark metal", "aluminium", "stainless", "opaque spandrel",
  // Parts the photographs show on their own, named as the night first showed them: crown glass
  // and crown lights, an emblem screen and the lights in its bands, a sign's board and letters,
  // and a lit cap.
  "crown glass", "crown lights", "screen", "band lights", "sign board", "sign letters", "cap lights",
] as const;
export type MaterialName = (typeof materialNames)[number];
