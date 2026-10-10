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
const glass = (colour: number, material: Extract<MaterialName, "glass" | "green glass" | "bronze glass"> = "glass"): Partial<Record<MaterialName, number>> =>
  ({ [material]: colour, "lit window": colour, "dim window": colour });

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
  // docs/willoughby-tower-reference.md, 2026-10-09 — Daytime colours from Chicago.jpg.
  "building-willoughby-tower": {
    limestone: 0xccbdab,
    ...glass(0x4d4541),
    "dark granite": null,
    neutral: null,
  },
  // docs/heritage-geographic-reference.md, 2026-10-09 — Daytime colours from Chicago.jpg.
  "building-heritage-at-millennium-park": {
    limestone: 0xd8dad6,
    "green glass": 0x475861,
    "lit window": 0x475861,
    bronze: 0x475861,
    concrete: null,
    "buff brick": null,
    neutral: null,
  },
  // docs/kemper-geographic-reference.md, 2026-10-09 — Daytime colours from Chicago.jpg.
  "building-kemper": {
    marble: 0xc3c0b6,
    ...glass(0x535455),
    aluminium: null,
  },
  // docs/north-wabash-reference.md, 2026-10-09 — Daytime colours from Chicago.jpg.
  "building-330-north-wabash": {
    ...glass(0x2f4052, "bronze glass"),
    bronze: 0x2f4052,
    "dark granite": null,
    neutral: null,
  },
  // docs/millennium-park-plaza-reference.md, 2026-10-09 — Daytime colours from Chicago.jpg.
  "building-michigan-plaza-front-tall": {
    concrete: 0xe5d6c9,
    ...glass(0x3c342a),
    neutral: null,
  },
  // docs/trump-reference.md, 2026-10-09 — Daytime colours from Chicago.jpg.
  "building-trump-tower-only": {
    ...glass(0x6f838e),
    stainless: null,
  },
  // docs/340-on-the-park-reference.md, 2026-10-09 — Daytime colours from Chicago.jpg.
  "building-340-on-the-park": {
    concrete: 0xdfe3e1,
    ...glass(0x637c84, "green glass"),
    aluminium: null,
    neutral: null,
  },
  // FID-COL-005, the Michigan Avenue wall. Its fronts face east, into the photograph's shade; where a
  // building shows only that front, its stone or terracotta is the shaded median's sunlit estimate,
  // through the panorama's shade-to-sun factors (scripts/sample-colours.ts, the day study's shade).
  // docs/borg-warner-reference.md, 2026-10-10 — Daytime colours from Chicago.jpg.
  "building-200-south-michigan": {
    "blue enamel": 0x828a93,
    ...glass(0x374147),
    aluminium: null,
    neutral: null,
  },
  // docs/peoples-gas-reference.md, 2026-10-10 — Daytime colours from Chicago.jpg.
  "building-peoples-gas": {
    "white terracotta": 0xafa7a0,
    "glazed brick": "white terracotta",
    ...glass(0x393939),
    "common brick": null,
    "dark granite": null,
    neutral: null,
  },
  // docs/lake-view-reference.md, 2026-10-10 — Daytime colours from Chicago.jpg; limestone estimated.
  "building-lakeview": {
    limestone: 0xc3bdb5,
    ...glass(0x0c161e),
    neutral: null,
  },
  // docs/maclean-center-reference.md, 2026-10-10 — Daytime colours from Chicago.jpg; limestone estimated.
  "building-maclean-center": {
    limestone: 0xd1bfb0,
    ...glass(0x2b3740),
    neutral: null,
  },
  // docs/monroe-reference.md, 2026-10-10 — Daytime colours from Chicago.jpg; terracotta estimated.
  "building-monroe": {
    "pink terracotta": 0xb7afa9,
    ...glass(0x353c43),
    "green tile": null,
    granite: null,
    neutral: null,
  },
  // docs/university-club-reference.md, 2026-10-10 — Daytime colours from Chicago.jpg.
  "building-university-club": {
    limestone: 0xafa59e,
    slate: 0x5f6065,
    ...glass(0x1d1510),
    neutral: null,
  },
  // docs/six-north-michigan-reference.md, 2026-10-10 — Daytime colours from Chicago.jpg.
  "building-six-north-michigan": {
    "buff brick": 0xbbaa9f,
    "white terracotta": "buff brick",
    ...glass(0x32363c),
    neutral: null,
  },
  // docs/michigan-boulevard-reference.md, 2026-10-10 — Daytime colours from Chicago.jpg; terracotta estimated.
  "building-six-north-far-east": {
    "white terracotta": 0xd4c6b8,
    "common brick": 0xa19085,
    ...glass(0x3b3f42),
    neutral: null,
  },
};

// The sunny day the colour toggle shows: the sky's blue at the top of the view and its haze just
// above the horizon, each the median of a clear box of the same panorama (scripts/sample-colours.ts,
// the day study's sky), and the sun's warm white, chosen.
export const daylightColours = { sky: 0x9ebbdb, horizon: 0xc4d1e1, sun: 0xfff4e6 } as const;
