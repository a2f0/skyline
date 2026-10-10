import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { channelRatios, hex, scaled } from "../scripts/lib/shade.js";
import { measuredColours } from "../src/models/colour-palette.js";

// The colour trial's Michigan Avenue fronts (FID-COL-005) estimate a shaded front's sunlit colour
// from the Railway Exchange's terracotta, sunlit and shaded; these re-derive the palette's
// estimates from the medians their audits record.
const factors = channelRatios([[[200, 193, 179], [117, 125, 128]]]);

describe("shade estimate", () => {
  test("takes the Railway Exchange's ratio as its factors", () => {
    expect(factors.map((factor) => Number(factor.toFixed(2)))).toEqual([3.25, 2.6, 2.09]);
  });

  test("gives the palette's estimates from the shaded medians the audits record", () => {
    const estimates: [building: string, material: string, shaded: number[]][] = [
      ["building-lakeview", "limestone", [117, 127, 134]],
      ["building-maclean-center", "limestone", [126, 128, 130]],
      ["building-monroe", "pink terracotta", [110, 117, 125]],
      ["building-six-north-far-east", "white terracotta", [128, 133, 136]],
    ];
    for (const [building, material, shaded] of estimates) {
      const entry = (measuredColours[building] as Record<string, unknown>)[material];
      expect(hex(scaled(shaded, factors)), `${building}'s ${material}`).toBe(`0x${(entry as number).toString(16).padStart(6, "0")}`);
    }
  });

  test("keeps an estimate's hue where it passes white", () => {
    const [red, green, blue] = scaled([250, 200, 100], [3, 3, 3]);
    expect(red).toBe(255);
    expect(green).toBeLessThan(255);
    expect(blue).toBeLessThan(green!);
    // Equal factors keep a grey grey, and unit factors change nothing.
    expect(scaled([120, 120, 120], [2, 2, 2]).every((channel, _, all) => channel === all[0])).toBe(true);
    expect(scaled([117, 127, 134], [1, 1, 1])).toEqual([117, 127, 134]);
  });
});

// The buildings the panorama hides (FID-COL-006) are measured in close-ups, each calibrated through a
// reference beside them that the panorama shows sunlit; these re-derive the palette's calibrated
// entries from the medians their audits record, and finds those medians in the audits. They are
// the audits' figures, not the sampler's live table (scripts/sample-colours.ts runs as a command
// and measures in a browser), so a changed sample row is caught here once its audit changes.
describe("close-up calibration", () => {
  test("gives the palette's calibrated colours from each close-up's reference and medians", () => {
    const references: Record<string, [panorama: number[], closeUp: number[]]> = {
      willoughby: [[204, 189, 171], [179, 174, 166]],
      universityClub: [[175, 165, 158], [171, 162, 152]],
      aon: [[223, 223, 221], [163, 165, 168]],
    };
    const calibrated: [building: string, material: string, reference: string, median: number[], audit: string][] = [
      ["building-chicago-athletic-association", "brick", "willoughby", [141, 103, 88], "chicago-athletic-association"],
      ["building-chicago-athletic-association", "limestone", "willoughby", [182, 173, 160], "chicago-athletic-association"],
      ["building-michigan-west-right", "white terracotta", "willoughby", [204, 199, 193], "gage"],
      ["building-michigan-west-front", "brick", "universityClub", [134, 96, 83], "keith-ascher"],
      ["building-30-south-michigan", "brick", "universityClub", [133, 102, 92], "keith-ascher"],
      ["building-hyatt-regency-west-tower", "orange brick", "aon", [72, 61, 55], "hyatt-west-tower"],
    ];
    for (const [building, material, reference, median, audit] of calibrated) {
      const entry = (measuredColours[building] as Record<string, unknown>)[material];
      expect(hex(scaled(median, channelRatios([references[reference]!]))), `${building}'s ${material}`).toBe(`0x${(entry as number).toString(16).padStart(6, "0")}`);
      // The audit records the median and its reference's two.
      const text = readFileSync(new URL(`../docs/${audit}-reference.md`, import.meta.url), "utf8").replace(/\s+/g, " ");
      for (const values of [median, ...references[reference]!]) expect(text, `${audit} records \`${values.join(", ")}\``).toContain(`\`${values.join(", ")}\``);
    }
  });
});
