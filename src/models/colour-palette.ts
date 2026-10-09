import type { MaterialName } from "./colour-materials.js";

// The colour trial (https://github.com/a2f0/skyline/issues/115), tier B: the colours of the
// buildings sourced so far on a sunny day, measured from Chicago.jpg on Wikimedia Commons, Daniel
// Schwen's panorama of the skyline from the Adler Planetarium on 16 August 2008, in its
// 3840-pixel rendition; a 2022 close-up fills in what Blue Cross lacked in 2008. Each
// value is the per-channel median, in sRGB, of one material's pixels in a box of the photograph,
// on a sunlit face where the photograph shows one; the building's reference audit records every
// box, the rule that picked its pixels, their count and quartiles, and
// scripts/sample-colours.ts measures them again. A material may instead name another of its
// building's materials, whose colour it takes at its own grey's brightness, for a surface the
// photograph does not resolve; null leaves it grey. A building with no entry stays grey. This is
// the one file in the repository allowed colours, which tests/grayscale.test.ts exempts by name.
export type Measurement = number | MaterialName | null;

// By day no office lights show: lit and dim windows are the glass, in its measured colour.
const glass = (colour: number) => ({ glass: colour, "lit window": colour, "dim window": colour });

export const measuredColours: Readonly<Record<string, Readonly<Partial<Record<MaterialName, Measurement>>>>> = {
  // docs/railway-exchange-reference.md, 2026-10-09 — Daytime colours from Chicago.jpg.
  "building-railway-exchange": {
    "white terracotta": 0xc8c1b3,
    ...glass(0x3d4243),
    copper: null,
    "common brick": null,
    neutral: null,
  },
  // docs/crain-reference.md, 2026-10-09 — Daytime colours from Chicago.jpg.
  "building-crain-communications": {
    aluminium: 0xfbfcfa,
    ...glass(0x1e2425),
    "crown glass": 0x79828c,
    lamp: "aluminium",
    "dark metal": null,
    neutral: null,
  },
  // docs/one-prudential-reference.md, 2026-10-09 — Daytime colours from Chicago.jpg.
  "building-one-prudential-plaza": {
    limestone: 0xc2bcb4,
    aluminium: "limestone",
    ...glass(0x625e59),
    "sign board": 0xc4c0b9,
    "sign letters": 0x6684a0,
    "dark metal": null,
    stainless: null,
    neutral: null,
  },
  // docs/two-prudential-reference.md, 2026-10-09 — Daytime colours from Chicago.jpg.
  "building-two-prudential-plaza": {
    granite: 0xb1b3b0,
    ...glass(0x424c55),
    "crown glass": 0x5e7686,
    "crown lights": 0xb6bbbb,
    stainless: null,
    aluminium: null,
  },
  // docs/aon-reference.md, 2026-10-09 — Daytime colours from Chicago.jpg.
  layer3: {
    "white granite": 0xdfdfdd,
    ...glass(0x424240),
    "cap lights": "white granite",
    aluminium: null,
    stainless: null,
    neutral: null,
  },
  // docs/blue-cross-reference.md, 2026-10-09 — Daytime colours from Chicago.jpg and a close-up.
  "building-blue-cross-blue-shield": {
    ...glass(0x7d8992),
    screen: 0x334a60,
    "band lights": 0xb0bdcd,
    "dark metal": null,
    neutral: null,
  },
};

// The sunny day the colour toggle shows: the sky's blue at the top of the view and its haze just
// above the horizon, each the median of a clear box of the same panorama (scripts/sample-colours.ts,
// the day study's sky), and the sun's warm white, chosen.
export const daylightColours = { sky: 0x9ebbdb, horizon: 0xc4d1e1, sun: 0xfff4e6 } as const;
