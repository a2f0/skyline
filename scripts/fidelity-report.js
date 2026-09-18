// Reports how closely the skyline study follows its drawing at every layout the skyline
// test checks: each landmark's error with per-viewport and per-building maxima, column
// residuals in layer units, sight-line gaps, each model's projected silhouette in layer
// space, and triangle counts. It reads tests/skyline-landmarks.js through the same maths
// as tests/skyline-study.test.js, so its numbers are the ones the test asserts on. --root
// serves another checkout, such as an archive of main, with this checkout's spec.
import { writeFileSync } from "node:fs";
import path from "node:path";
import { startServer } from "./lib/static-server.js";
import { launch, openStudy, command } from "./lib/study-page.js";
import { fitted, landmarks, landmarkTolerance, models } from "../tests/skyline-landmarks.js";
import { viewports, checkSpec, measureStudy } from "../tests/study-fidelity.js";

const usage = `Usage: bun scripts/fidelity-report.js [--json file] [--root dir]
  Prints landmark errors, column residuals, sight-line gaps, silhouettes, and triangles
  at the skyline test's five layouts. --json also writes the raw numbers; --root serves
  another checkout (default: this one).`;

const label = (id) => fitted.find((entry) => entry.id === id)?.label || models.find((model) => model.id === id).name;
const table = (title, columns, rows) => {
  const cells = [["", ...columns], ...rows];
  const widths = cells[0].map((_, i) => Math.max(...cells.map((row) => String(row[i]).length)));
  console.log(`\n${title}`);
  for (const row of cells) console.log(`  ${row.map((cell, i) => (i ? String(cell).padStart(widths[i]) : String(cell).padEnd(widths[i]))).join("  ")}`);
};

command(usage, { json: { type: "string" }, root: { type: "string" } }, async ({ values }) => {
  checkSpec({ fitted, models });
  const root = path.resolve(values.root || path.join(import.meta.dirname, ".."));
  const server = await startServer(root), results = {};
  let browser;
  try {
    browser = await launch();
    for (const { name, options } of viewports) {
      const { context, page, errors } = await openStudy(browser, server.origin, options);
      results[name] = await page.evaluate(measureStudy, { landmarks, landmarkTolerance, fitted, models, report: true });
      results[name].errors = errors;
      await context.close();
    }
  } finally {
    await browser?.close();
    await server.close();
  }
  const names = Object.keys(results), first = results[names[0]];
  console.log(`Skyline study fidelity for ${root}`);
  console.log(`  canvases: ${names.map((name) => `${name} ${results[name].canvas.map((v) => Math.round(v)).join("x")}`).join(", ")}`);

  const landmarkNames = Object.keys(first.deviations);
  table("Landmark error (normalized canvas units, max of |du| and |dv|; tolerance in brackets)", names, landmarkNames.map((landmark) => [
    `${landmark} [${first.deviations[landmark].tolerance}]`, ...names.map((name) => results[name].deviations[landmark].error.toFixed(5)),
  ]));
  const ids = [...new Set(landmarkNames.map((landmark) => first.deviations[landmark].id))];
  table("Landmark error maxima", names, [
    ...ids.map((id) => [`${label(id)} max`, ...names.map((name) => Math.max(...Object.values(results[name].deviations).filter((d) => d.id === id).map((d) => d.error)).toFixed(5))]),
    ["all landmarks max", ...names.map((name) => Math.max(...Object.values(results[name].deviations).map((d) => d.error)).toFixed(5))],
  ]);

  for (const [index, building] of first.buildings.entries()) {
    const spec = fitted.find((entry) => entry.id === building.id);
    const rows = (pick) => Object.keys(spec.columns).flatMap((group) => spec.columns[group].drawn.map((_, i) => [`${group} ${i + 1}`, ...names.map((name) => pick(results[name].buildings[index], group, i))]));
    table(`${spec.label} column residuals (layer units, model minus drawing; tolerance ${spec.columnTolerance} canvas units)`, names,
      rows((b, group, i) => (b.columns[group][i]?.residual ?? NaN).toFixed(2)));
    table(`${spec.label} sight-line gaps (m toward the camera; ${spec.sightGap.join("-")} m on the column's batch)`, names,
      rows((b, group, i) => { const hit = b.sightGaps[group][i]; return `${hit.gap.toFixed(3)}${hit.mesh === spec.columns[group].batch ? "" : ` on ${hit.mesh}`}`; }));
    if (Object.keys(spec.rows || {}).length) {
      const rowValues = (pick) => Object.keys(spec.rows).flatMap((group) => spec.rows[group].drawn.map((_, i) => [`${group} ${i + 1}`, ...names.map((name) => pick(results[name].buildings[index], group, i))]));
      table(`${spec.label} row residuals (layer units; tolerance in normalized canvas units)`, names,
        rowValues((b, group, i) => b.rows[group][i].residual.toFixed(2)));
    }
    table(`${spec.label} distance from features to built edges (m; tolerance ${spec.onGeometryTolerance})`, names,
      Object.keys(building.onGeometry).map((feature) => [feature, ...names.map((name) => results[name].buildings[index].onGeometry[feature].toExponential(2))]));
  }

  table("Projected silhouettes (layer space: left, right, top, bottom)", names, models.map((model, i) => [
    model.name, ...names.map((name) => Object.values(results[name].models[i].silhouette).map((v) => v.toFixed(1)).join(" ")),
  ]));
  table("Triangles", ["count"], [...first.models.map((model) => [label(model.id), model.triangles]), ["scene", first.sceneTriangles]]);
  const errors = names.flatMap((name) => results[name].errors.map((error) => `${name}: ${error}`));
  if (errors.length) console.log(`\nPage errors:\n  ${errors.join("\n  ")}`);
  if (values.json) {
    writeFileSync(values.json, `${JSON.stringify({ root, viewports: results }, null, 1)}\n`);
    console.log(`\nWrote ${values.json}`);
  }
});
