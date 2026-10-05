import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

// Skyline is drawn in greys: every colour the repository writes, in its pages, styles,
// drawings, models, scripts and tests, has equal red, green and blue. The photograph the
// drawing was traced from, src/skyline.jpg, is the one exception, the vendored Three.js
// bundle's own constants are not Skyline's to change, and this file's samples are colours
// on purpose.
const root = path.resolve(import.meta.dirname, "..");
const exempt = new Set(["src/skyline.jpg", "src/vendor/three-r186.js", "bun.lock", "tests/grayscale.test.ts"]);
const files = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" })
  .split("\0").filter((file) => file && !exempt.has(file));

// Each pattern finds colours in one notation and gives each as CSS Bun.color parses, or as
// its channels. Hex needs no word character or hyphen after it, which leaves url(#facade-…)
// ids alone, and none follows "(" or "&", which leaves a pull request's "(#123)" and HTML's
// numeric character references alone.
const properties = "color|background(?:-color)?|border(?:-[a-z]+)?|outline(?:-color)?|fill|stroke|stop-color|flood-color|lighting-color|caret-color|accent-color|text-decoration-color|-webkit-tap-highlight-color|box-shadow|text-shadow|fillStyle|strokeStyle|shadowColor";
const notations: [RegExp, (match: RegExpExecArray) => (string | number[])[]][] = [
  [/(?<![\w(&])#([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/gi, (m) => [m[0]]],
  [/\b0x([0-9a-f]{6})\b/gi, (m) => [`#${m[1]}`]],
  [/\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\([^)]*\)/gi, (m) => [m[0]]],
  [new RegExp(`(?<![\\w-])(?:${properties})\\s*[:=]\\s*["'\`]?([^;"'\`}\\n]+)`, "gi"), (m) => m[1]!.split(/[^a-z]+/i).filter((word) => /^[a-z]{3,}$/i.test(word))],
  [/\bColor\(\s*["']([^"']+)["']/g, (m) => [m[1]!]],
  [/\b(?:Color|setRGB|clearColor|vec3)\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*[,)]/g, (m) => [[1, 2, 3].map((i) => Number(m[i]))]],
];

function colours(text: string) {
  const found: { colour: string; line: number }[] = [];
  for (const [pattern, read] of notations) {
    for (let match: RegExpExecArray | null; (match = pattern.exec(text));) {
      for (const value of read(match)) {
        const channels = typeof value === "string" ? Bun.color(value, "[rgb]") : value;
        // Words a colour property holds that name no colour, like "solid" or "inherit".
        if (!Array.isArray(channels)) continue;
        const [r, g, b] = channels;
        if (r !== g || g !== b) found.push({ colour: typeof value === "string" ? value : `(${value.join(", ")})`, line: text.slice(0, match.index).split("\n").length });
      }
    }
  }
  return found;
}

describe("grayscale", () => {
  test("every colour in the repository is a grey", () => {
    const coloured = files.flatMap((file) => {
      const bytes = readFileSync(path.join(root, file));
      if (bytes.includes(0)) return [];
      return colours(bytes.toString("utf8")).map(({ colour, line }) => `${file}:${line} ${colour}`);
    });
    expect(coloured).toEqual([]);
  });

  test("finds a colour in each notation", () => {
    const samples = [
      ".a { color: #a2b5b8; }", "fill=\"#0a1113d9\"", "lines(grid, 0x303b3e)", "rgba(10, 20, 30, 0.5)",
      "hsl(200 40% 50%)", ".b { border: 1px solid steelblue; }", "stroke=\"teal\"", "context.fillStyle = \"red\"",
      "new THREE.Color(\"gold\")", "new THREE.Color(0.2, 0.3, 0.4)", "vec3(1.0, 0.9, 0.8)", "gl.clearColor(0.1, 0, 0, 1)",
    ];
    expect(samples.filter((sample) => colours(sample).length !== 1)).toEqual([]);
    const greys = [
      ".a { color: #ddd; background: #080808cc; }", "url(#facade-depth)", "chore: change (#123)", "0x9e3779b1",
      "rgba(194, 194, 194, 0.72)", ".b { border: 1px solid #292929; color: inherit; fill: currentColor; }",
      "new THREE.Color(1, 1, 1)", "vec3(0.76)", "gl.clearColor(0, 0, 0, 0)", "the Blue Cross and Blue Shield Tower",
    ];
    expect(greys.filter((sample) => colours(sample).length)).toEqual([]);
  });
});
