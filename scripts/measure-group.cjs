// Measures one building of skyline-animated.svg for modeling. It writes JSON with every
// shape's id, fill, stroke, layer-space bounds, and flattened vertices, a PNG crop of the
// drawing, and the aligned crop of the source photo from skyline.svg.
//
// Layer space is the coordinate space of the group's parent, reached with
// parent.getScreenCTM().inverse().multiply(shape.getScreenCTM()). It equals skyline.svg's
// root space, not the animated root, and it is the space the skyline test's drawing
// points use. The photo crop hides skyline.svg's vector shapes and frames the shapes with
// the same ids, so both crops show the same rectangle.
const { mkdirSync, writeFileSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { startServer } = require("./lib/static-server.cjs");
const { launch, command } = require("./lib/study-page.cjs");

const usage = `Usage: node scripts/measure-group.cjs <group-id> [--out dir] [--padding fraction]
  <group-id> is a group id (building-kemper) or a data-building-id (one-prudential-plaza);
  every .interactive-building group that matches is measured. Writes <key>.json,
  <key>-drawing.png, and <key>-photo.png to --out (default: ${path.join(os.tmpdir(), "skyline-measure")}).`;
const shapes = "path, rect, polygon, polyline, line, circle, ellipse";

// Runs in the page: every shape's layer-space bounds and vertices, with curves and arcs
// flattened into short chords.
function measure({ key, shapes }) {
  const groups = [...document.querySelectorAll(".interactive-building")].filter((group) => [group.id, group.dataset.buildingId, group.id.replace(/^building-/, "")].includes(key));
  if (!groups.length) return null;
  const round = (value) => Math.round(value * 1000) / 1000;
  function arc([x1, y1], rx, ry, degrees, large, sweep, [x2, y2]) {
    if (!rx || !ry) return [[x2, y2]];
    const phi = degrees * Math.PI / 180, cos = Math.cos(phi), sin = Math.sin(phi);
    const x1p = cos * (x1 - x2) / 2 + sin * (y1 - y2) / 2, y1p = -sin * (x1 - x2) / 2 + cos * (y1 - y2) / 2;
    [rx, ry] = [Math.abs(rx), Math.abs(ry)];
    const lambda = x1p * x1p / (rx * rx) + y1p * y1p / (ry * ry);
    if (lambda > 1) [rx, ry] = [rx * Math.sqrt(lambda), ry * Math.sqrt(lambda)];
    const squared = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
    const coefficient = (large !== sweep ? 1 : -1) * Math.sqrt(Math.max(0, (rx * rx * ry * ry - squared) / squared));
    const cxp = coefficient * rx * y1p / ry, cyp = -coefficient * ry * x1p / rx;
    const cx = cos * cxp - sin * cyp + (x1 + x2) / 2, cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
    const angle = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    const start = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
    let delta = angle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!sweep && delta > 0) delta -= 2 * Math.PI;
    if (sweep && delta < 0) delta += 2 * Math.PI;
    return Array.from({ length: 16 }, (_, i) => {
      const t = start + delta * (i + 1) / 16;
      return i === 15 ? [x2, y2] : [cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin, cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos];
    });
  }
  function flatten(element) {
    const number = (name) => element[name].baseVal.value;
    if (element.tagName === "rect") { const [x, y, w, h] = ["x", "y", "width", "height"].map(number); return [[[x, y], [x + w, y], [x + w, y + h], [x, y + h]]]; }
    if (element.tagName === "line") return [[[number("x1"), number("y1")], [number("x2"), number("y2")]]];
    if (["polygon", "polyline"].includes(element.tagName)) return [[...element.points].map((p) => [p.x, p.y])];
    if (["circle", "ellipse"].includes(element.tagName)) {
      const [cx, cy] = [number("cx"), number("cy")], [rx, ry] = element.tagName === "circle" ? [number("r"), number("r")] : [number("rx"), number("ry")];
      return [Array.from({ length: 32 }, (_, i) => [cx + rx * Math.cos(i * Math.PI / 16), cy + ry * Math.sin(i * Math.PI / 16)])];
    }
    const tokens = (element.getAttribute("d") || "").match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) || [];
    const subpaths = [];
    let i = 0, command = "", current = [0, 0], start = [0, 0], control = null, points = null;
    // S and T reflect the previous control point only after a curve of their own kind.
    const reflect = (kind) => (control?.kind === kind ? [2 * current[0] - control.point[0], 2 * current[1] - control.point[1]] : current);
    const read = () => Number(tokens[i++]);
    const cubic = (p0, p1, p2, p3) => Array.from({ length: 8 }, (_, k) => { const t = (k + 1) / 8, u = 1 - t; return [0, 1].map((a) => u * u * u * p0[a] + 3 * u * u * t * p1[a] + 3 * u * t * t * p2[a] + t * t * t * p3[a]); });
    const quadratic = (p0, p1, p2) => Array.from({ length: 8 }, (_, k) => { const t = (k + 1) / 8, u = 1 - t; return [0, 1].map((a) => u * u * p0[a] + 2 * u * t * p1[a] + t * t * p2[a]); });
    while (i < tokens.length) {
      // Anchored: a lone letter is a command, while the e in 9.8e-4 belongs to its number.
      if (/^[a-zA-Z]$/.test(tokens[i])) command = tokens[i++];
      const relative = command === command.toLowerCase(), type = command.toUpperCase();
      const offset = (p) => (relative ? [p[0] + current[0], p[1] + current[1]] : p);
      if (type === "Z") {
        if (points) points.push([...start]);
        current = [...start];
        points = null;
        control = null;
        continue;
      }
      let next, added = null, nextControl = null;
      if (type === "M") {
        next = offset([read(), read()]);
        start = next;
        points = [next];
        subpaths.push(points);
        command = relative ? "l" : "L";
      } else if (type === "L") next = offset([read(), read()]);
      else if (type === "H") next = [relative ? current[0] + read() : read(), current[1]];
      else if (type === "V") next = [current[0], relative ? current[1] + read() : read()];
      else if (type === "C" || type === "S") {
        const first = type === "C" ? offset([read(), read()]) : reflect("cubic");
        const second = offset([read(), read()]);
        next = offset([read(), read()]);
        added = cubic(current, first, second, next);
        nextControl = { kind: "cubic", point: second };
      } else if (type === "Q" || type === "T") {
        const middle = type === "Q" ? offset([read(), read()]) : reflect("quadratic");
        next = offset([read(), read()]);
        added = quadratic(current, middle, next);
        nextControl = { kind: "quadratic", point: middle };
      } else if (type === "A") {
        const [rx, ry, rotation, large, sweep] = [read(), read(), read(), read(), read()];
        next = offset([read(), read()]);
        added = arc(current, rx, ry, rotation, Boolean(large), Boolean(sweep), next);
      } else throw new Error(`Unsupported path command ${command} in ${element.id}`);
      if (type !== "M") {
        if (!points) { points = [[...current]]; subpaths.push(points); }
        points.push(...(added || [next]));
      }
      control = nextControl;
      current = next;
    }
    return subpaths;
  }
  const result = [];
  for (const group of groups) {
    const toLayer = group.parentElement.getScreenCTM().inverse();
    for (const element of group.querySelectorAll(shapes)) {
      const matrix = toLayer.multiply(element.getScreenCTM());
      const map = ([x, y]) => { const p = new DOMPoint(x, y).matrixTransform(matrix); return [round(p.x), round(p.y)]; };
      const box = element.getBBox();
      const corners = [[box.x, box.y], [box.x + box.width, box.y], [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]].map(map);
      const xs = corners.map((p) => p[0]), ys = corners.map((p) => p[1]);
      result.push({
        id: element.id || null, group: group.id, tag: element.tagName, name: element.dataset.name || null,
        fill: element.getAttribute("fill") || getComputedStyle(element).fill, stroke: element.getAttribute("stroke") || getComputedStyle(element).stroke,
        bounds: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
        vertices: flatten(element).map((subpath) => subpath.map(map)),
      });
    }
  }
  const layerToRoot = document.documentElement.getScreenCTM().inverse().multiply(groups[0].parentElement.getScreenCTM());
  return {
    groups: groups.map((group) => ({ id: group.id, buildingId: group.dataset.buildingId || null, label: group.getAttribute("aria-label"), layer: group.parentElement.id })),
    layerToRoot: [layerToRoot.a, layerToRoot.b, layerToRoot.c, layerToRoot.d, layerToRoot.e, layerToRoot.f],
    shapes: result,
  };
}

// Frames a rectangle of the open SVG document at a fixed height on a black ground.
async function crop(page, file, [x0, y0, x1, y1]) {
  const height = 1100, width = Math.min(3000, Math.max(300, Math.round(height * (x1 - x0) / (y1 - y0))));
  await page.setViewportSize({ width, height });
  await page.evaluate(({ viewBox, width, height }) => {
    const svg = document.documentElement;
    Object.entries({ viewBox, width, height, preserveAspectRatio: "xMidYMid meet" }).forEach(([name, value]) => svg.setAttribute(name, value));
    svg.style.background = "#000";
  }, { viewBox: [x0, y0, x1 - x0, y1 - y0].join(" "), width, height });
  await page.screenshot({ path: file });
}

command(usage, { out: { type: "string" }, padding: { type: "string", default: "0.12" } }, async ({ values, positionals }) => {
  const [key] = positionals;
  if (!key || positionals.length > 1) throw new Error(usage);
  const out = path.resolve(values.out || path.join(os.tmpdir(), "skyline-measure")), padding = Number(values.padding);
  if (!Number.isFinite(padding) || padding < 0) throw new Error(`--padding takes a fraction of the group's size, not ${values.padding}.`);
  const name = key.replace(/^building-/, "");
  mkdirSync(out, { recursive: true });
  const server = await startServer(path.join(__dirname, ".."));
  let browser;
  try {
    browser = await launch();
    const drawing = await browser.newPage();
    await drawing.goto(`${server.origin}/skyline-animated.svg`);
    const measured = await drawing.evaluate(measure, { key, shapes });
    if (!measured) throw new Error(`skyline-animated.svg has no .interactive-building group with id or data-building-id ${key}.`);
    const all = measured.shapes.map((shape) => shape.bounds);
    const bounds = [Math.min(...all.map((b) => b[0])), Math.min(...all.map((b) => b[1])), Math.max(...all.map((b) => b[2])), Math.max(...all.map((b) => b[3]))];
    const pad = [(bounds[2] - bounds[0]) * padding, (bounds[3] - bounds[1]) * padding];
    const frame = [bounds[0] - pad[0], bounds[1] - pad[1], bounds[2] + pad[0], bounds[3] + pad[1]];
    // The drawing crop frames the layer rectangle in the animated root's space.
    const [a, b, c, d, e, f] = measured.layerToRoot, toRoot = ([x, y]) => [a * x + c * y + e, b * x + d * y + f];
    const rootCorners = [toRoot([frame[0], frame[1]]), toRoot([frame[2], frame[3]])];
    await crop(drawing, path.join(out, `${name}-drawing.png`), [Math.min(rootCorners[0][0], rootCorners[1][0]), Math.min(rootCorners[0][1], rootCorners[1][1]), Math.max(rootCorners[0][0], rootCorners[1][0]), Math.max(rootCorners[0][1], rootCorners[1][1])]);

    const photo = await browser.newPage();
    await photo.goto(`${server.origin}/skyline.svg`, { waitUntil: "load", timeout: 120000 });
    const ids = measured.shapes.map((shape) => shape.id).filter(Boolean);
    const photoBounds = await photo.evaluate(({ ids, shapes }) => {
      const toRoot = document.documentElement.getScreenCTM().inverse(), box = [Infinity, Infinity, -Infinity, -Infinity];
      let found = 0;
      for (const id of ids) {
        const element = document.getElementById(id);
        if (!element?.getBBox) continue;
        const bbox = element.getBBox(), matrix = toRoot.multiply(element.getScreenCTM());
        found += 1;
        for (const [x, y] of [[bbox.x, bbox.y], [bbox.x + bbox.width, bbox.y], [bbox.x, bbox.y + bbox.height], [bbox.x + bbox.width, bbox.y + bbox.height]]) {
          const p = new DOMPoint(x, y).matrixTransform(matrix);
          box.splice(0, 4, Math.min(box[0], p.x), Math.min(box[1], p.y), Math.max(box[2], p.x), Math.max(box[3], p.y));
        }
      }
      document.querySelectorAll(`${shapes}, text`).forEach((element) => { element.style.display = "none"; });
      return { found, box };
    }, { ids, shapes });
    await photo.waitForFunction(() => [...document.querySelectorAll("image")].every((image) => image.getBBox().width > 0), null, { timeout: 120000 });
    // Matching ids place the photo crop; without them the layer rectangle stands in.
    const matched = photoBounds.found > 0;
    const photoFrame = matched ? [photoBounds.box[0] - pad[0], photoBounds.box[1] - pad[1], photoBounds.box[2] + pad[0], photoBounds.box[3] + pad[1]] : frame;
    await crop(photo, path.join(out, `${name}-photo.png`), photoFrame);

    const report = {
      key, source: "skyline-animated.svg", space: "layer (the group parent's space, equal to skyline.svg's root space)",
      groups: measured.groups, bounds, frame,
      photo: { matchedIds: photoBounds.found, of: ids.length, bounds: matched ? photoBounds.box : null, maxOffsetFromLayerBounds: matched ? Math.max(...bounds.map((value, i) => Math.abs(value - photoBounds.box[i]))) : null },
      shapes: measured.shapes,
    };
    writeFileSync(path.join(out, `${name}.json`), `${JSON.stringify(report, null, 1)}\n`);
    console.log(`${key}: ${measured.shapes.length} shapes in ${measured.groups.length} group(s); layer bounds ${bounds.map((v) => v.toFixed(1)).join(", ")}`);
    console.log(`  photo ids matched ${photoBounds.found}/${ids.length}${matched ? `, bounds differ by at most ${report.photo.maxOffsetFromLayerBounds.toFixed(3)}` : "; photo crop uses the layer rectangle"}`);
    console.log(`  wrote ${name}.json, ${name}-drawing.png, ${name}-photo.png to ${out}`);
  } finally {
    await browser?.close();
    await server.close();
  }
});
