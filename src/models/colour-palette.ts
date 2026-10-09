import type { MaterialName } from "./colour-materials.js";

// The colour trial (https://github.com/a2f0/skyline/issues/115), tier B: the colours of the
// buildings sourced so far, measured from the photograph the drawing traces, src/skyline.jpg,
// the 2013 night panorama from the Adler Planetarium's lakefront. They are what the camera
// recorded under the city's night lighting, not the materials' daylight colours: floodlit
// terracotta reads gold, granite a warm brown, crown lighting blue. Each value is the
// per-channel median, in sRGB, of one material's pixels in a box of the photograph; the
// building's reference audit records every box, the rule that picked its pixels, their count
// and quartiles, and scripts/sample-colours.ts measures them again. A material may instead name
// another of its building's materials, whose colour it takes at its own grey's brightness, for a
// surface the photograph does not resolve; null leaves it grey. A building with no entry stays
// grey. This is the one file in the repository allowed colours, which tests/grayscale.test.ts
// exempts by name.
export type Measurement = number | MaterialName | null;

export const measuredColours: Readonly<Record<string, Readonly<Partial<Record<MaterialName, Measurement>>>>> = {
  // docs/railway-exchange-reference.md, 2026-10-09 — Night colours from the panorama.
  "building-railway-exchange": {
    "white terracotta": 0xb08412,
    copper: 0x647673,
    glass: 0x402900,
    "lit window": 0xf8eee1,
    "dim window": "lit window",
    "common brick": "white terracotta",
    neutral: null,
  },
  // docs/crain-reference.md, 2026-10-09 — Night colours from the panorama.
  "building-crain-communications": {
    aluminium: 0xcbac7c,
    glass: 0x41302a,
    "lit window": 0xe8ded5,
    "dim window": "lit window",
    "crown glass": 0x131c3a,
    lamp: 0xc3d1ed,
    "dark metal": null,
    neutral: null,
  },
  // docs/one-prudential-reference.md, 2026-10-09 — Night colours from the panorama.
  "building-one-prudential-plaza": {
    limestone: 0x88603f,
    aluminium: "limestone",
    glass: 0x2f2022,
    "lit window": 0xfaf3f2,
    "dim window": "lit window",
    "sign board": 0x243980,
    "sign letters": 0xf9fbfe,
    "dark metal": null,
    stainless: null,
    neutral: null,
  },
  // docs/two-prudential-reference.md, 2026-10-09 — Night colours from the panorama.
  "building-two-prudential-plaza": {
    granite: 0x3a3236,
    glass: 0x17151c,
    "lit window": 0xe9e9e1,
    "dim window": "lit window",
    "crown glass": 0x4b5d89,
    "crown lights": 0xd5e1f4,
    stainless: 0xc1cfef,
    aluminium: null,
  },
  // docs/aon-reference.md, 2026-10-09 — Night colours from the panorama.
  layer3: {
    "white granite": 0x735a49,
    glass: 0x2b1c1b,
    "lit window": 0xf9f2ed,
    "dim window": "lit window",
    "cap lights": 0xf3efec,
    aluminium: null,
    stainless: null,
    neutral: null,
  },
  // docs/blue-cross-reference.md, 2026-10-09 — Night colours from the panorama.
  "building-blue-cross-blue-shield": {
    glass: 0x484050,
    "lit window": 0xefeef3,
    "dim window": "lit window",
    screen: 0x241d4a,
    "band lights": 0x0b21a1,
    "dark metal": null,
    neutral: null,
  },
};
