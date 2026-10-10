// Measures the colour trial's colours in photographs and prints each building's audit rows and
// colour-palette.ts entries. A study is a photograph and its samples, any of which may name
// another photograph: "day", Chicago.jpg, the 2008 sunny panorama from the Adler Planetarium on
// Wikimedia Commons, whose colours the trial shows, and "night", src/skyline.jpg, the photograph
// the drawing traces, measured first. Each sample is a box in the photograph's pixels (x0, y0,
// x1, y1, half-open) and a rule on hue (degrees), saturation and value (0–1) choosing one
// material's pixels in it, or all of them; the result is their per-channel sRGB median and
// quartiles, with their count and their share of the box. A photograph from the web is
// downloaded once into the repository's ignored node_modules/.cache, not a shared temporary
// directory, and checked against its SHA-256; Chrome decodes each without colour management, so
// the values are the file's own. A sample on a face in shade can be marked shaded: the palette
// then takes its sunlit estimate, through the shade factors the study's paired samples give. A
// sample in a second photograph, for a building the study's own does not resolve, takes that
// photograph's calibration where the study gives it a reference: the ratio between one material's
// medians in the study's photograph and in the second, measured beside it in the same light.
// Locate new boxes in skyline.jpg with scripts/measure-group.ts, whose photo crop frames a
// building there, and in the day panorama with scripts/panorama-owners.ts, which reports the
// share of a box a building owns on one face.
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Browser } from "playwright";
import { channelRatios, hex, scaled } from "./lib/shade.js";
import { startServer } from "./lib/static-server.js";
import { launch, command } from "./lib/study-page.js";

interface Sample {
  /** The audit row's name. */
  row: string;
  /** The colour-palette.ts material it measures, or null for a sample kept for comparison. */
  material: string | null;
  box: [number, number, number, number];
  /** The photograph, where it is not the study's own. */
  photo?: string;
  hue?: [number, number];
  sat?: [number, number];
  val?: [number, number];
  /** Measured on a face in shade: the palette takes its sunlit estimate, through the study's shade factors. */
  shaded?: boolean;
}
interface Photo {
  /** A path in the repository, or a URL to download. */
  source: string;
  sha256: string;
}
interface Study {
  photo: string;
  samples: Record<string, Sample[]>;
  /** Pairs of one material's sunlit and shaded samples, by building and row, whose mean per-channel
   *  ratio in linear light estimates a shaded sample's sunlit colour. One pair will do. */
  shade?: [building: string, sunlit: string, shaded: string][];
  /** For each second photograph, a reference material's rows, in the study's photograph and in the
   *  second, beside and in the same light as the samples it calibrates; its per-channel ratio in
   *  linear light carries a second photograph's samples into the study's. A second photograph
   *  without one gives its values as measured. */
  references?: Record<string, [building: string, study: string, photograph: string]>;
}
interface Result {
  count: number;
  share: number;
  median: number[];
  quartiles: [number, number][];
}

const photos: Record<string, Photo> = {
  "skyline.jpg": { source: "src/skyline.jpg", sha256: "f6001e46471ea59f6fc07ae0eb9e7d5d8d243666f57d96d7efc6f59f2d7d5db4" },
  // Commons serves its files' thumbnails at fixed widths; these are the 3840 and 1920 px ones.
  "chicago-2008.jpg": { source: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Chicago.jpg/3840px-Chicago.jpg", sha256: "a1d033489368cfa22a2d178d6a2ad82d00f9b529189836bee739b89b2e8cba41" },
  "blue-cross-2022.jpg": {
    source: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Blue_Cross_Blue_Shield_Tower%2C_Chicago%2C_Illinois%2C_US_%28PPL1-Corrected%29_julesvernex2.jpg/1920px-Blue_Cross_Blue_Shield_Tower%2C_Chicago%2C_Illinois%2C_US_%28PPL1-Corrected%29_julesvernex2.jpg",
    sha256: "0bbb057c7adae72dc5456c546b5109df56cec0f91bf81911f0f2bcb39f117edf",
  },
  "athletic-association-2012.jpg": {
    source: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Edificio_de_la_Chicago_Athletic_Association%2C_Chicago%2C_Illinois%2C_Estados_Unidos%2C_2012-10-20%2C_DD_01.jpg/960px-Edificio_de_la_Chicago_Athletic_Association%2C_Chicago%2C_Illinois%2C_Estados_Unidos%2C_2012-10-20%2C_DD_01.jpg",
    sha256: "444f4531e9f9f138dd5f7905f979984fc2a7e55dffb3ad8b4113f5b874900cc7",
  },
  "gage-group-2012.jpg": {
    source: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8a/Gage_Group_Buildings.jpg/1280px-Gage_Group_Buildings.jpg",
    sha256: "3156c19dee13fd217372d4972263e2e2cda1a77674d610aabf375a661afbb953",
  },
  "hyatt-regency-2007.jpg": {
    source: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/42/Hyatt_Regency_Chicago%2C_circa_2007.jpg/1280px-Hyatt_Regency_Chicago%2C_circa_2007.jpg",
    sha256: "a338fcff7fa4a962ff8a176d7a29158ce5f8da154e3e266bf3bcabc7a7499ac3",
  },
};

// FID-COL-001's night samples, as each building's reference audit records them.
const night: Record<string, Sample[]> = {
  "building-railway-exchange": [
    { row: "Terracotta", material: "white terracotta", box: [10830, 3010, 11110, 3240], hue: [25, 60], sat: [0.55, 1], val: [0.35, 0.97] },
    { row: "Frieze, for comparison", material: null, box: [10830, 2990, 11110, 3008], hue: [25, 60], sat: [0.55, 1], val: [0.35, 0.97] },
    { row: "Lit windows", material: "lit window", box: [10830, 3010, 11110, 3240], sat: [0, 0.35], val: [0.85, 1] },
    { row: "Unlit glass", material: "glass", box: [10830, 3010, 11110, 3240], val: [0, 0.3] },
    { row: "Copper roof", material: "copper", box: [10770, 2946, 10895, 2968], hue: [110, 210], sat: [0.1, 1] },
  ],
  "building-crain-communications": [
    { row: "Aluminium spandrels", material: "aluminium", box: [13735, 2900, 14065, 3290], hue: [10, 55], sat: [0.12, 0.65], val: [0.45, 0.97] },
    { row: "Unlit glass", material: "glass", box: [13735, 2900, 14065, 3290], val: [0, 0.35] },
    { row: "Lit windows", material: "lit window", box: [13735, 2900, 14065, 3290], sat: [0, 0.3], val: [0.85, 1] },
    { row: "Diamond glass", material: "crown glass", box: [13860, 2640, 13980, 2760], val: [0, 0.6] },
    { row: "Outline lights", material: "lamp", box: [13735, 2500, 14075, 2780], hue: [150, 240], sat: [0.08, 1], val: [0.75, 1] },
  ],
  "building-one-prudential-plaza": [
    { row: "Limestone, south", material: "limestone", box: [14400, 2560, 14760, 3290], hue: [10, 50], sat: [0.35, 1], val: [0.25, 0.92] },
    { row: "Limestone, east, for comparison", material: null, box: [14772, 2560, 14838, 3290], hue: [10, 50], sat: [0.35, 1], val: [0.25, 0.92] },
    { row: "Unlit glass", material: "glass", box: [14400, 2560, 14760, 3290], val: [0, 0.22] },
    { row: "Lit windows", material: "lit window", box: [14400, 2560, 14760, 3290], sat: [0, 0.35], val: [0.8, 1] },
    { row: "Sign board", material: "sign board", box: [14410, 2462, 14660, 2512], hue: [200, 250], sat: [0.3, 1], val: [0.15, 0.75] },
    { row: "Sign letters", material: "sign letters", box: [14410, 2462, 14660, 2512], sat: [0, 0.25], val: [0.85, 1] },
  ],
  "building-two-prudential-plaza": [
    { row: "Stone, lower shaft", material: "granite", box: [14865, 2650, 15045, 3250], sat: [0, 0.45], val: [0.12, 0.6] },
    { row: "Stone, upper shaft, for comparison", material: null, box: [14870, 2160, 14960, 2480], sat: [0, 0.45], val: [0.12, 0.98] },
    { row: "Unlit glass", material: "glass", box: [14865, 2650, 15045, 3250], val: [0, 0.12] },
    { row: "Lit windows", material: "lit window", box: [14865, 2650, 15045, 3250], sat: [0, 0.45], val: [0.75, 1] },
    { row: "Crown glass", material: "crown glass", box: [14985, 1890, 15065, 2000], hue: [185, 250], sat: [0.15, 1], val: [0.45, 1] },
    { row: "Crown lights", material: "crown lights", box: [14940, 1860, 15110, 2060], sat: [0, 0.3], val: [0.8, 1] },
    { row: "Spire", material: "stainless", box: [14995, 1720, 15020, 1880], sat: [0, 0.35], val: [0.55, 1] },
  ],
  layer3: [
    { row: "Granite, south", material: "white granite", box: [15275, 1600, 15520, 3300], hue: [10, 55], sat: [0.1, 0.65], val: [0.3, 0.88] },
    { row: "Granite, east, for comparison", material: null, box: [15545, 1600, 15700, 3300], hue: [10, 55], sat: [0.1, 0.65], val: [0.2, 0.88] },
    { row: "Unlit glass", material: "glass", box: [15275, 1600, 15520, 3300], val: [0, 0.2] },
    { row: "Lit windows", material: "lit window", box: [15275, 1600, 15520, 3300], sat: [0, 0.3], val: [0.8, 1] },
    { row: "Lit cap", material: "cap lights", box: [15275, 1400, 15520, 1490], sat: [0, 0.3], val: [0.75, 1] },
  ],
  "building-blue-cross-blue-shield": [
    { row: "Glass and spandrels", material: "glass", box: [15780, 2120, 16260, 3350], sat: [0, 0.4], val: [0.2, 0.6] },
    { row: "Unlit glass, for comparison", material: null, box: [15780, 2120, 16260, 3350], val: [0, 0.2] },
    { row: "Lit windows", material: "lit window", box: [15780, 2120, 16260, 3350], sat: [0, 0.35], val: [0.8, 1] },
    { row: "Screen", material: "screen", box: [15800, 1975, 16250, 2075], val: [0, 0.35] },
    { row: "Band lights", material: "band lights", box: [15800, 2610, 16260, 2710], hue: [205, 265], sat: [0.4, 1], val: [0.45, 1] },
    { row: "Screen's bars, for comparison", material: null, box: [15800, 1975, 16250, 2075], hue: [205, 265], sat: [0.4, 1], val: [0.45, 1] },
    { row: "Emblems, for comparison", material: null, box: [15800, 1975, 15950, 2075], sat: [0, 0.25], val: [0.85, 1] },
  ],
};

// FID-COL-003's and FID-COL-004's sunny samples, as each building's reference audit records them.
const day: Record<string, Sample[]> = {
  "building-railway-exchange": [
    { row: "Terracotta, Jackson front, sunlit", material: "white terracotta", box: [1066, 412, 1084, 458], sat: [0, 0.3], val: [0.6, 1] },
    { row: "Glass, Jackson front", material: "glass", box: [1066, 412, 1084, 458], val: [0, 0.4] },
    { row: "Terracotta, Michigan front, shaded, for comparison", material: null, box: [1086, 412, 1128, 470], sat: [0, 0.3], val: [0.45, 1] },
    { row: "Roof, for comparison", material: null, box: [1068, 402, 1128, 410] },
  ],
  "building-crain-communications": [
    { row: "Aluminium spandrels, sunlit", material: "aluminium", box: [1555, 420, 1583, 470], sat: [0, 0.15], val: [0.65, 1] },
    { row: "Glass", material: "glass", box: [1555, 420, 1583, 470], val: [0, 0.45] },
    { row: "Diamond glass", material: "crown glass", box: [1565, 355, 1600, 395], sat: [0, 0.4], val: [0, 0.7] },
    { row: "Shaded face, for comparison", material: null, box: [1590, 400, 1608, 470], sat: [0, 0.2], val: [0.45, 1] },
  ],
  "building-one-prudential-plaza": [
    { row: "Limestone, sunlit", material: "limestone", box: [1668, 350, 1718, 470], sat: [0, 0.25], val: [0.55, 1] },
    { row: "Glass", material: "glass", box: [1668, 350, 1718, 470], val: [0, 0.42] },
    { row: "Sign panel", material: "sign board", box: [1670, 326, 1712, 340], sat: [0, 0.2], val: [0.6, 1] },
    { row: "Sign letters and emblem", material: "sign letters", box: [1670, 326, 1712, 340], hue: [190, 250], sat: [0.2, 1] },
  ],
  "building-two-prudential-plaza": [
    { row: "Stone, sunlit", material: "granite", box: [1748, 300, 1772, 440], sat: [0, 0.3], val: [0.5, 1] },
    { row: "Glass", material: "glass", box: [1748, 300, 1795, 440], hue: [180, 240], sat: [0.08, 1] },
    { row: "Crown glass", material: "crown glass", box: [1755, 255, 1790, 290], hue: [180, 240], sat: [0.05, 1] },
    { row: "Crown bands and ribs", material: "crown lights", box: [1750, 255, 1795, 290], sat: [0, 0.3], val: [0.6, 1] },
  ],
  layer3: [
    { row: "Granite, sunlit", material: "white granite", box: [1815, 160, 1860, 450], sat: [0, 0.12], val: [0.6, 1] },
    { row: "Glass", material: "glass", box: [1815, 160, 1860, 450], val: [0, 0.4] },
    { row: "Shaded face, for comparison", material: null, box: [1852, 170, 1866, 440] },
    { row: "Granite, overcast", material: null, photo: "hyatt-regency-2007.jpg", box: [530, 130, 610, 380], sat: [0, 0.12], val: [0.6, 1] },
  ],
  "building-blue-cross-blue-shield": [
    { row: "Glass and spandrels", material: "glass", box: [1910, 375, 1980, 465] },
    { row: "Glass, looking up, for comparison", material: null, photo: "blue-cross-2022.jpg", box: [700, 900, 1300, 1150], hue: [190, 250], val: [0.15, 0.75] },
    { row: "Screen", material: "screen", photo: "blue-cross-2022.jpg", box: [720, 250, 1220, 300], val: [0, 0.5] },
    { row: "Band columns", material: "band lights", photo: "blue-cross-2022.jpg", box: [640, 630, 1290, 710], sat: [0, 0.2], val: [0.6, 1] },
  ],
  // FID-COL-004, the second group.
  "building-willoughby-tower": [
    { row: "Limestone, sunlit", material: "limestone", box: [1373, 357, 1386, 395], sat: [0, 0.35], val: [0.5, 1] },
    { row: "Glass", material: "glass", box: [1373, 357, 1386, 395], val: [0, 0.4] },
    { row: "Shaded face, for comparison", material: null, box: [1387, 357, 1395, 395] },
    { row: "Limestone, Michigan front, overcast", material: null, photo: "athletic-association-2012.jpg", box: [862, 0, 900, 780], sat: [0, 0.35], val: [0.5, 1] },
  ],
  "building-heritage-at-millennium-park": [
    { row: "Frame, sunlit", material: "limestone", box: [1468, 315, 1480, 395], sat: [0, 0.15], val: [0.65, 1] },
    { row: "Glass", material: "green glass", box: [1482, 315, 1514, 395], val: [0, 0.6] },
  ],
  "building-kemper": [
    { row: "Marble, sunlit", material: "marble", box: [1517, 362, 1529, 450], sat: [0, 0.2], val: [0.6, 1] },
    { row: "Glass", material: "glass", box: [1517, 362, 1529, 450], val: [0, 0.4] },
    { row: "Face, all, for comparison", material: null, box: [1517, 362, 1529, 450] },
    { row: "Darker face to the right, for comparison", material: null, box: [1532, 362, 1548, 450] },
  ],
  "building-330-north-wabash": [
    { row: "Glass, spandrels and mullions", material: "bronze glass", box: [1612, 330, 1658, 372] },
  ],
  "building-michigan-plaza-front-tall": [
    { row: "Precast, sunlit", material: "concrete", box: [1631, 385, 1645, 450], sat: [0, 0.3], val: [0.5, 1] },
    { row: "Glass", material: "glass", box: [1631, 385, 1645, 450], val: [0, 0.35] },
  ],
  "building-trump-tower-only": [
    { row: "Glass and spandrels, clad floors", material: "glass", box: [1690, 250, 1727, 318], hue: [180, 250], sat: [0.05, 1] },
    { row: "Left face, for comparison", material: null, box: [1690, 250, 1699, 318], hue: [180, 250], sat: [0.05, 1] },
    { row: "Right face, for comparison", material: null, box: [1708, 250, 1727, 318], hue: [180, 250], sat: [0.05, 1] },
  ],
  "building-340-on-the-park": [
    { row: "Concrete frame, sunlit", material: "concrete", box: [1998, 270, 2040, 440], sat: [0, 0.15], val: [0.7, 1] },
    { row: "Glass, south", material: "green glass", box: [2007, 290, 2032, 440], hue: [160, 230], sat: [0.1, 1], val: [0, 0.75] },
    { row: "Glass, east, for comparison", material: null, box: [2043, 270, 2060, 440] },
  ],
  // FID-COL-005, the Michigan Avenue wall: its east fronts are in shade, so a front measured only
  // there is marked shaded, and its south faces, where they show, are sunlit.
  "building-200-south-michigan": [
    { row: "Spandrels, south face, sunlit", material: "blue enamel", box: [1135, 416, 1163, 455], sat: [0, 0.35], val: [0.5, 1] },
    { row: "Glass, south face", material: "glass", box: [1135, 416, 1163, 455], val: [0, 0.3] },
    { row: "Spandrels, Michigan front, shaded, for comparison", material: null, box: [1166, 416, 1190, 455], sat: [0, 0.35], val: [0.45, 1] },
  ],
  "building-peoples-gas": [
    { row: "Terracotta, south face, sunlit", material: "white terracotta", box: [1192, 408, 1207, 455], sat: [0, 0.35], val: [0.5, 1] },
    { row: "Glass, south face", material: "glass", box: [1192, 408, 1207, 455], val: [0, 0.3] },
    { row: "Terracotta, Michigan front, shaded, for comparison", material: null, box: [1210, 410, 1253, 455], sat: [0, 0.35], val: [0.45, 1] },
  ],
  "building-lakeview": [
    { row: "Limestone, Michigan front, shaded", material: "limestone", box: [1256, 420, 1263, 460], sat: [0, 0.35], val: [0.45, 1], shaded: true },
    { row: "Glass, Michigan front", material: "glass", box: [1256, 420, 1263, 460], val: [0, 0.3] },
  ],
  "building-maclean-center": [
    { row: "Limestone, Michigan front, shaded", material: "limestone", box: [1268, 415, 1281, 460], sat: [0, 0.35], val: [0.45, 1], shaded: true },
    { row: "Glass, Michigan front", material: "glass", box: [1268, 415, 1281, 460], val: [0, 0.3] },
  ],
  "building-monroe": [
    { row: "Terracotta, Michigan front, shaded", material: "pink terracotta", box: [1285, 431, 1304, 462], sat: [0, 0.35], val: [0.45, 1], shaded: true },
    { row: "Glass, Michigan front", material: "glass", box: [1285, 431, 1304, 462], val: [0, 0.3] },
    { row: "Roof, for comparison", material: null, box: [1285, 424, 1304, 431] },
  ],
  "building-university-club": [
    { row: "Limestone, south face, sunlit", material: "limestone", box: [1306, 438, 1317, 462], sat: [0, 0.35], val: [0.5, 1] },
    { row: "Dark pixels, south face, for comparison", material: null, box: [1306, 438, 1317, 462], val: [0, 0.3] },
    { row: "Slate roof", material: "slate", box: [1310, 428, 1332, 436] },
    { row: "Limestone, Michigan front, sunlit", material: null, photo: "gage-group-2012.jpg", box: [10, 480, 125, 800], sat: [0, 0.35], val: [0.5, 1] },
  ],
  "building-six-north-michigan": [
    { row: "Brick, south face, sunlit", material: "buff brick", box: [1406, 412, 1420, 460], sat: [0, 0.35], val: [0.5, 1] },
    { row: "Glass, south face", material: "glass", box: [1406, 412, 1420, 460], val: [0, 0.3] },
    { row: "Michigan front, shaded, for comparison", material: null, box: [1422, 412, 1437, 460], sat: [0, 0.35], val: [0.45, 1] },
  ],
  "building-six-north-far-east": [
    { row: "Common brick, south wall, sunlit", material: "common brick", box: [1440, 418, 1466, 460], sat: [0, 0.35], val: [0.5, 1] },
    { row: "Terracotta, Michigan front, shaded", material: "white terracotta", box: [1468, 418, 1485, 460], sat: [0, 0.35], val: [0.45, 1], shaded: true },
    { row: "Glass, Michigan front", material: "glass", box: [1468, 418, 1485, 460], val: [0, 0.3] },
  ],
  // FID-COL-006, four towers the panorama shows, measured on their sunlit south faces.
  "building-the-buckingham": [
    { row: "Concrete, south face, sunlit", material: "concrete", box: [2086, 380, 2108, 465], sat: [0, 0.35], val: [0.5, 1] },
    { row: "Glass, south face", material: "bronze glass", box: [2086, 380, 2108, 465], val: [0, 0.3] },
    { row: "Concrete, east face, shaded, for comparison", material: null, box: [2114, 380, 2123, 465], sat: [0, 0.35], val: [0.4, 1] },
  ],
  "building-buckingham-east": [
    { row: "Precast, south face, sunlit", material: "precast", box: [2129, 418, 2141, 466], sat: [0, 0.35], val: [0.5, 1] },
    { row: "Glass, south face", material: "glass", box: [2129, 418, 2141, 466], val: [0, 0.3] },
  ],
  "building-swissotel": [
    { row: "Curtain wall, south face", material: "blue-green glass", box: [2070, 372, 2077, 465] },
  ],
  "building-michigan-plaza-front-middle": [
    { row: "Stone top floor, south face, sunlit", material: "limestone", box: [1619, 413, 1629, 420], sat: [0, 0.35], val: [0.5, 1] },
    { row: "Brick, south face, in Crain's shadow, for comparison", material: null, box: [1612, 421, 1629, 465], val: [0.15, 1] },
    { row: "Glass, south face, in Crain's shadow", material: null, box: [1612, 421, 1629, 465], val: [0, 0.15] },
  ],
  // FID-COL-006, Michigan Avenue fronts Grant Park's trees hide in the panorama, measured in a
  // close-up under an overcast sky and calibrated through a neighbour on the same front that the
  // panorama shows sunlit (the study's references).
  "building-chicago-athletic-association": [
    { row: "Brick, Michigan front, overcast", material: "brick", photo: "athletic-association-2012.jpg", box: [85, 95, 840, 780], hue: [340, 40], sat: [0.25, 1], val: [0.25, 1] },
    { row: "Limestone band, Michigan front, overcast", material: "limestone", photo: "athletic-association-2012.jpg", box: [85, 290, 840, 400], sat: [0, 0.2], val: [0.5, 1] },
    { row: "Brick, Michigan front, sunlit, for comparison", material: null, photo: "gage-group-2012.jpg", box: [1180, 400, 1280, 1300], hue: [340, 40], sat: [0.25, 1], val: [0.3, 1] },
  ],
  "building-michigan-west-right": [
    { row: "Terracotta pier, Michigan front, overcast", material: "white terracotta", photo: "athletic-association-2012.jpg", box: [44, 0, 72, 700], sat: [0, 0.35], val: [0.5, 1] },
  ],
  "building-michigan-west-front": [
    { row: "Brick, Michigan front, sunlit", material: "brick", photo: "gage-group-2012.jpg", box: [305, 750, 640, 1390], hue: [340, 40], sat: [0.25, 1], val: [0.3, 1] },
  ],
  "building-30-south-michigan": [
    { row: "Brick, Michigan front, sunlit", material: "brick", photo: "gage-group-2012.jpg", box: [90, 800, 295, 1390], hue: [340, 40], sat: [0.25, 1], val: [0.3, 1] },
  ],
  // The Hyatt Regency's west tower stands behind Aon and Blue Cross in the panorama, a few pixels
  // wide; measured in a close-up under an overcast sky, calibrated through Aon's granite behind it.
  "building-hyatt-regency-west-tower": [
    { row: "Brick, overcast", material: "orange brick", photo: "hyatt-regency-2007.jpg", box: [740, 150, 930, 550], hue: [340, 50], sat: [0.12, 1], val: [0.15, 1] },
    { row: "Brick, south face, panorama, for comparison", material: null, box: [1885, 400, 1889, 434], val: [0.35, 1] },
  ],
  // The sky, for colour-palette.ts's daylightColours.
  sky: [
    { row: "Sky, top of the frame", material: null, box: [3300, 0, 3800, 25] },
    { row: "Sky, near the horizon", material: null, box: [3000, 420, 3800, 470] },
  ],
};

const studies: Record<string, Study> = {
  day: {
    photo: "chicago-2008.jpg",
    samples: day,
    // One terracotta on a sunlit south face and a shaded Michigan front. Peoples Gas shows both too,
    // but its front is mostly windows at this scale, so its pair is a comparison, not an input.
    shade: [
      ["building-railway-exchange", "Terracotta, Jackson front, sunlit", "Terracotta, Michigan front, shaded, for comparison"],
    ],
    // Each close-up's reference: a material the panorama shows sunlit, on the close-up's front beside
    // the buildings it calibrates, in their light: Willoughby Tower's limestone beside the Athletic
    // Association and the Gage Building, the University Club's beside the Ascher and Keith
    // Buildings, and Aon's granite behind the Hyatt Regency.
    references: {
      "athletic-association-2012.jpg": ["building-willoughby-tower", "Limestone, sunlit", "Limestone, Michigan front, overcast"],
      "gage-group-2012.jpg": ["building-university-club", "Limestone, south face, sunlit", "Limestone, Michigan front, sunlit"],
      "hyatt-regency-2007.jpg": ["layer3", "Granite, sunlit", "Granite, overcast"],
    },
  },
  night: { photo: "skyline.jpg", samples: night },
};

// Runs in the page: one sample's pixels, chosen and summarised.
async function measure({ sample, photo }: { sample: Sample; photo: string }): Promise<Result> {
  // Each photograph is fetched once per page.
  const cache = ((window as unknown as { photos?: Map<string, Blob> }).photos ??= new Map<string, Blob>());
  if (!cache.has(photo)) cache.set(photo, await (await fetch(`/${photo}`)).blob());
  const blob = cache.get(photo)!;
  const [x0, y0, x1, y1] = sample.box;
  const bitmap = await createImageBitmap(blob, x0, y0, x1 - x0, y1 - y0, { colorSpaceConversion: "none", premultiplyAlpha: "none" });
  const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d", { colorSpace: "srgb" })!;
  context.drawImage(bitmap, 0, 0);
  const data = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
  // The photographs are opaque; a box past their edge reads transparent there.
  for (let i = 3; i < data.length; i += 4) if (data[i] !== 255) throw new Error(`"${sample.row}"'s box ${sample.box.join(", ")} runs past the edge of ${photo}.`);
  // Hue as Python's colorsys.rgb_to_hsv gives it, in degrees.
  const hueOf = (r: number, g: number, b: number) => {
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max === min) return 0;
    const [rc, gc, bc] = [r, g, b].map((channel) => (max - channel) / (max - min)) as [number, number, number];
    const h = r === max ? bc - gc : g === max ? 2 + rc - bc : 4 + gc - rc;
    return (((h / 6) % 1) + 1) % 1 * 360;
  };
  const within = (value: number, range?: [number, number]) => !range || (value >= range[0] && value <= range[1]);
  const chosen: [number[], number[], number[]] = [[], [], []];
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i]! / 255, data[i + 1]! / 255, data[i + 2]! / 255];
    const max = Math.max(r, g, b), min = Math.min(r, g, b), sat = max > 0 ? (max - min) / max : 0, hue = hueOf(r, g, b);
    const hueKept = !sample.hue || (sample.hue[0] <= sample.hue[1] ? hue >= sample.hue[0] && hue <= sample.hue[1] : hue >= sample.hue[0] || hue <= sample.hue[1]);
    if (!hueKept || !within(sat, sample.sat) || !within(max, sample.val)) continue;
    chosen[0].push(data[i]!);
    chosen[1].push(data[i + 1]!);
    chosen[2].push(data[i + 2]!);
  }
  // Percentiles interpolated linearly between ranks, as numpy's default.
  const percentile = (values: number[], p: number) => {
    const sorted = [...values].sort((a, b) => a - b), at = (sorted.length - 1) * p, low = Math.floor(at);
    return sorted[low]! + (sorted[Math.min(low + 1, sorted.length - 1)]! - sorted[low]!) * (at - low);
  };
  const count = chosen[0].length;
  if (!count) throw new Error(`"${sample.row}" matched no pixels in ${sample.box.join(", ")}.`);
  return {
    count,
    share: count / (data.length / 4),
    median: chosen.map((values) => Math.round(percentile(values, 0.5))),
    quartiles: chosen.map((values) => [Math.round(percentile(values, 0.25)), Math.round(percentile(values, 0.75))] as [number, number]),
  };
}

// A photograph in the cache, downloaded or copied once and checked.
async function fetchPhoto(name: string, directory: string): Promise<void> {
  const { source, sha256 } = photos[name]!, target = path.join(directory, name);
  const digest = () => createHash("sha256").update(readFileSync(target)).digest("hex");
  if (existsSync(target) && digest() === sha256) return;
  if (!/^https:/.test(source)) copyFileSync(path.join(import.meta.dirname, "..", source), target);
  else {
    // Wikimedia asks for a descriptive agent, and answers 429 to a busy address: wait and retry,
    // for about 25 minutes in all.
    for (let attempt = 1, wait = 30_000; ; attempt += 1, wait = Math.min(wait * 2, 600_000)) {
      const response = await fetch(source, { headers: { "User-Agent": "SkylineColourResearch/1.0 (https://github.com/a2f0/skyline)" } });
      if (response.ok) { writeFileSync(target, Buffer.from(await response.arrayBuffer())); break; }
      if (response.status !== 429) throw new Error(`${source} answered ${response.status}.`);
      if (attempt > 6) throw new Error(`${source} still answers 429 after ${attempt} tries; try again later.`);
      console.error(`${source} answered 429; trying again in ${wait / 1000} s.`);
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
  if (digest() !== sha256) throw new Error(`${name} does not match its SHA-256, ${sha256}; the source has changed.`);
}

const usage = `Usage: bun scripts/sample-colours.ts <day|night> [building-id]
  Measures a study's samples, or one building's, and prints its audit rows and colour-palette.ts
  entries.`;

command(usage, {}, async ({ positionals }) => {
  const [name, ...ids] = positionals;
  const study = studies[name ?? ""];
  if (!study) throw new Error(usage);
  const chosen = ids.length ? ids : Object.keys(study.samples);
  for (const id of chosen) if (!study.samples[id]) throw new Error(`No ${name} samples for ${id}; there are ${Object.keys(study.samples).join(", ")}.`);
  const directory = path.join(import.meta.dirname, "..", "node_modules", ".cache", "skyline-colour-photos");
  mkdirSync(directory, { recursive: true });
  // The chosen samples' photographs, and the shade pairs' where a chosen sample is shaded.
  const needed = chosen.flatMap((id) => study.samples[id]!);
  if (needed.some((sample) => sample.shaded)) for (const [building, ...rows] of study.shade ?? []) needed.push(...(study.samples[building] ?? []).filter((sample) => rows.includes(sample.row)));
  for (const photo of new Set(needed.flatMap((sample) => sample.photo ? [sample.photo] : []))) {
    const reference = study.references?.[photo];
    if (reference) needed.push(...(study.samples[reference[0]] ?? []).filter((sample) => reference.includes(sample.row)));
  }
  for (const photo of new Set(needed.map((sample) => sample.photo ?? study.photo))) await fetchPhoto(photo, directory);
  writeFileSync(path.join(directory, "blank.html"), "<!doctype html>");
  const server = await startServer(directory);
  let browser: Browser | undefined;
  try {
    browser = await launch();
    const page = await browser.newPage();
    await page.goto(`${server.origin}/blank.html`);
    const number = (value: number) => value.toLocaleString("en-GB");
    const range = (value?: [number, number]) => value && `${value[0]}–${value[1]}`;
    const find = (building: string, row: string) => {
      const sample = study.samples[building]?.find((each) => each.row === row);
      if (!sample) throw new Error(`No ${name} sample "${row}" for ${building}.`);
      return sample;
    };
    // The shade factors, measured when a chosen sample needs them.
    let factors: number[] | undefined;
    if (chosen.some((id) => study.samples[id]!.some((sample) => sample.shaded))) {
      if (!study.shade?.length) throw new Error(`The ${name} study has shaded samples but no shade pairs.`);
      const pairs: [number[], number[]][] = [];
      for (const [building, sunlit, shaded] of study.shade) {
        const [bright, dark] = await Promise.all([find(building, sunlit), find(building, shaded)].map((sample) => page.evaluate(measure, { sample, photo: sample.photo ?? study.photo })));
        pairs.push([bright!.median, dark!.median]);
        console.log(`Shade pair ${building}: \`${bright!.median.join(", ")}\` sunlit, \`${dark!.median.join(", ")}\` shaded, ratio ${channelRatios([pairs.at(-1)!]).map((ratio) => ratio.toFixed(2)).join(", ")}`);
      }
      factors = channelRatios(pairs);
      console.log(`Shade factors${pairs.length > 1 ? ", the pairs' mean" : ""}: ${factors.map((factor) => factor.toFixed(2)).join(", ")}`);
    }
    // Each second photograph's calibration, measured when a chosen sample is in it.
    const calibrations = new Map<string, number[]>();
    for (const photo of new Set(chosen.flatMap((id) => study.samples[id]!.flatMap((sample) => sample.photo ? [sample.photo] : [])))) {
      const reference = study.references?.[photo];
      if (!reference) continue;
      const [building, own, other] = reference, [inPanorama, inCloseUp] = [find(building, own), find(building, other)];
      if (inPanorama.photo || inCloseUp.photo !== photo) throw new Error(`${photo}'s reference rows must be in ${study.photo} and in ${photo}.`);
      const [panoramaMedian, closeUpMedian] = (await Promise.all([inPanorama, inCloseUp].map((sample) => page.evaluate(measure, { sample, photo: sample.photo ?? study.photo })))).map((result) => result.median);
      calibrations.set(photo, channelRatios([[panoramaMedian!, closeUpMedian!]]));
      console.log(`Calibration of ${photo} through ${building}: \`${panoramaMedian!.join(", ")}\` in ${study.photo}, \`${closeUpMedian!.join(", ")}\` in ${photo}, ratio ${calibrations.get(photo)!.map((ratio) => ratio.toFixed(2)).join(", ")}`);
    }
    for (const id of chosen) {
      console.log(`\n${id}\n`);
      const entries: string[] = [], calibrated: string[] = [];
      for (const sample of study.samples[id]!) {
        if (sample.photo && sample.shaded) throw new Error(`"${sample.row}" is in ${sample.photo} and shaded; a second photograph's samples take its own light.`);
        const result = await page.evaluate(measure, { sample, photo: sample.photo ?? study.photo });
        const rule = [sample.hue && `hue ${range(sample.hue)}`, sample.sat && `sat ${range(sample.sat)}`, sample.val && `val ${range(sample.val)}`].filter(Boolean).join(", ");
        console.log(`| ${sample.row} | ${sample.box.join(", ")}${sample.photo ? ` in ${sample.photo}` : ""} | ${rule || "all"} | ${number(result.count)} (${(result.share * 100).toFixed(1)}%) | \`${result.median.join(", ")}\` | ${result.quartiles.map(([low, high]) => `${low}–${high}`).join(" / ")} |`);
        if (sample.photo && calibrations.has(sample.photo) && !sample.material) calibrated.push(`"${sample.row}" calibrated: \`${scaled(result.median, calibrations.get(sample.photo)!).join(", ")}\``);
        if (!sample.material) continue;
        if (sample.photo && calibrations.has(sample.photo)) {
          const value = scaled(result.median, calibrations.get(sample.photo)!);
          entries.push(`    ${JSON.stringify(sample.material)}: ${hex(value)}, // calibrated \`${value.join(", ")}\` of \`${result.median.join(", ")}\` in ${sample.photo}`);
          continue;
        }
        if (!sample.shaded) { entries.push(`    ${JSON.stringify(sample.material)}: ${hex(result.median)},`); continue; }
        const estimate = scaled(result.median, factors!);
        entries.push(`    ${JSON.stringify(sample.material)}: ${hex(estimate)}, // sunlit estimate \`${estimate.join(", ")}\` of the shaded \`${result.median.join(", ")}\``);
      }
      if (calibrated.length) console.log(`\n${calibrated.join("\n")}`);
      console.log(`\n${entries.join("\n")}`);
    }
  } finally {
    await browser?.close();
    await server.close();
  }
});
