import { describe, expect, test } from "bun:test";
import { compactPath } from "../scripts/checks/skyline-loading.js";
import { bootOutline } from "../src/skyline-boot-outline.js";
import { BOOT_CSS, bootHostStyle, bootHtml, bootTree, type BootNode } from "../src/skyline-boot.js";

// Absolute points of a path made only of M, h, v and l commands.
function absolute(d: string): [number, number][] {
  const points: [number, number][] = [];
  let x = 0, y = 0;
  for (const [, command, args] of d.matchAll(/([Mhvl])([^Mhvl]*)/g)) {
    const values = [...args!.matchAll(/-?(?:\d+\.?\d*|\.\d+)/g)].map(([value]) => Number(value));
    if (command === "M") [x, y] = [values[0]!, values[1]!];
    else if (command === "h") x += values[0]!;
    else if (command === "v") y += values[0]!;
    else { x += values[0]!; y += values[1]!; }
    points.push([x, y]);
  }
  return points;
}

describe("the boot silhouette's outline", () => {
  test("a compact path keeps every point within a twentieth of a unit, without accumulating rounding", () => {
    const points: [number, number][] = [[0, 50], [24, 50], [24.04, 12.34], [38.27, 12.34], [38.27, 50.016], [1000, 50.016]];
    for (let i = 0; i < 500; i += 1) points.splice(3, 0, [24.04 + i * 0.0283, 12.34 + (i % 7) * 0.333]);
    points.sort(([a], [b]) => a - b);
    const decoded = absolute(compactPath(points));
    // Points that round onto their predecessor add no step.
    const kept = points.filter((point, i) => !i || Math.round(point[0] * 10) !== Math.round(points[i - 1]![0] * 10) || Math.round(point[1] * 10) !== Math.round(points[i - 1]![1] * 10));
    expect(decoded).toHaveLength(kept.length);
    decoded.forEach(([x, y], i) => {
      expect(Math.abs(x - kept[i]![0])).toBeLessThanOrEqual(0.05 + 1e-9);
      expect(Math.abs(y - kept[i]![1])).toBeLessThanOrEqual(0.05 + 1e-9);
    });
    expect(compactPath([[0, 10], [5, 10], [5, 2.5], [7.5, 0.25]])).toBe("M0 10h5v-7.5l2.5-2.2");
  });

  test("spans the view box, from ground line to ground line", () => {
    const points = absolute(bootOutline.d);
    expect(points[0]).toEqual([0, Math.round(bootOutline.height * 10) / 10]);
    expect(points.at(-1)![0]).toBeCloseTo(bootOutline.width, 6);
    expect(Math.max(...points.map(([x]) => x))).toBeLessThanOrEqual(bootOutline.width + 1e-9);
    expect(Math.min(...points.map(([, y]) => y))).toBeGreaterThan(0);
  });
});

describe("the boot silhouette", () => {
  // Every animation must run off the main thread, so the silhouette keeps moving while the
  // scene's first frame is built in one long task.
  test("animates only transform and opacity", () => {
    const keyframes = [...BOOT_CSS.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)];
    expect(keyframes.map(([, name]) => name).sort()).toEqual(["skyline-boot-fade", "skyline-boot-sweep"]);
    for (const [, , body] of keyframes) {
      for (const [, declarations] of body!.matchAll(/\{([^{}]*)\}/g)) {
        for (const declaration of declarations!.split(";").filter((text) => text.trim())) {
          expect(["transform", "opacity"]).toContain(declaration.split(":")[0]!.trim());
        }
      }
    }
    // Transitions would animate other properties on the main thread.
    expect(BOOT_CSS).not.toContain("transition");
  });

  test("stops moving, and shows the whole outline, with reduced motion", () => {
    const reduced = /@media \(prefers-reduced-motion:reduce\)\{(.*)\}$/.exec(BOOT_CSS)![1]!;
    expect(reduced).toContain(".skyline-boot-frame{animation:none;");
    expect(reduced).toContain(".skyline-boot-curtain{display:none;animation:none}");
  });

  test("keeps the loading palettes and fills its parent as the viewer's element does", () => {
    expect(bootHostStyle("dark")).toEndWith(";color-scheme:dark;background-color:#000;color:#aaa");
    expect(bootHostStyle("light")).toEndWith(";color-scheme:light;background-color:#f5f5f5;color:#444");
    expect(bootHostStyle("dark")).toStartWith("all:initial;direction:ltr;display:block;position:relative;isolation:isolate;width:100%;height:100%;overflow:hidden;");
    expect(BOOT_CSS).toContain('.skyline-boot[data-theme="light"]{--boot-ink:#555;--boot-backdrop:#f5f5f5}');
  });

  test("renders as HTML with escaped attributes and the styles as text", () => {
    const tree = bootTree("light");
    const html = bootHtml(tree);
    expect(html).toStartWith('<div class="skyline-boot" data-theme="light" aria-hidden="true"><style>');
    expect(html).toContain(`<style>${BOOT_CSS}</style>`);
    expect(html.match(/<svg /g)).toHaveLength(2);
    expect(html.match(new RegExp(`d="${bootOutline.d.replace(/[.]/g, "\\.")}"`, "g"))).toHaveLength(2);
    expect(html).not.toContain("<script");
    const node: BootNode = ["div", { title: `"a" & <b>` }, []];
    expect(bootHtml(node)).toBe('<div title="&quot;a&quot; &amp; &lt;b&gt;"></div>');
  });
});
