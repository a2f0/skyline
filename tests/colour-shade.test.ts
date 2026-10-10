import { describe, expect, test } from "bun:test";
import { hex, shadeFactors, sunlitEstimate } from "../scripts/lib/shade.js";
import { measuredColours } from "../src/models/colour-palette.js";

// The colour trial's Michigan Avenue fronts (FID-COL-005) estimate a shaded front's sunlit colour
// from the Railway Exchange's terracotta, sunlit and shaded; these re-derive the palette's
// estimates from the medians their audits record.
const factors = shadeFactors([[[200, 193, 179], [117, 125, 128]]]);

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
      expect(hex(sunlitEstimate(shaded, factors)), `${building}'s ${material}`).toBe(`0x${(entry as number).toString(16).padStart(6, "0")}`);
    }
  });

  test("keeps an estimate's hue where it passes white", () => {
    const [red, green, blue] = sunlitEstimate([250, 200, 100], [3, 3, 3]);
    expect(red).toBe(255);
    expect(green).toBeLessThan(255);
    expect(blue).toBeLessThan(green!);
    // Equal factors keep a grey grey, and unit factors change nothing.
    expect(sunlitEstimate([120, 120, 120], [2, 2, 2]).every((channel, _, all) => channel === all[0])).toBe(true);
    expect(sunlitEstimate([117, 127, 134], [1, 1, 1])).toEqual([117, 127, 134]);
  });
});
