// The geographic ground plan's framing check, shared by the skyline study's geography suite
// and the full-screen 3D skyline suite, whose pages show the same plan view.
import { expect } from "bun:test";
import type { Frame, Page } from "playwright";
import { geographicBuildings } from "../models/skyline-geography-data.js";
import { footprintMetrics, projectGround } from "../models/skyline-geography.js";

// In the ground plan, every mapped footprint projects inside the canvas, and its centre
// inside the band where the viewer shows a building's label.
export async function expectPlanHolds(page: Page | Frame) {
  const footprints = geographicBuildings.map((record) => {
    const { center } = footprintMetrics(record.footprint.coordinates);
    const points = record.footprint.coordinates.map((p) => { const [east, north] = projectGround(p); return [east, 0, -north]; });
    return { id: record.id, points, centre: [center[0], 0, -center[1]] };
  });
  const projected = await page.evaluate((all) => all.map(({ id, points, centre }) => ({
    id, points: points.map((p) => window.__buildingStudy!.projectPoint(id, p)), centre: window.__buildingStudy!.projectPoint(id, centre),
  })), footprints);
  for (const { id, points, centre } of projected) {
    expect(points.every(([u, v]) => u > 0 && u < 1 && v > 0 && v < 1), `${id} inside the plan`).toBe(true);
    expect(Math.abs(centre[0] * 2 - 1) < 0.95 && Math.abs(centre[1] * 2 - 1) < 0.95, `${id}'s label inside the plan`).toBe(true);
  }
  // Every building's label shows, whole, inside the layer that would otherwise cut it.
  expect(await page.locator(".study-annotations").isVisible(), "the plan's labels show").toBe(true);
  const labels = await page.evaluate(() => {
    const layer = document.querySelector(".study-annotations")!.getBoundingClientRect();
    return [...document.querySelectorAll<HTMLElement>(".study-annotations span")].filter((label) => !label.hidden).map((label) => {
      const box = label.getBoundingClientRect();
      return { text: label.textContent, whole: box.left >= layer.left - 0.5 && box.right <= layer.right + 0.5 && box.top >= layer.top - 0.5 && box.bottom <= layer.bottom + 0.5 };
    });
  });
  expect(labels.length).toBe(geographicBuildings.length);
  expect(labels.filter((label) => !label.whole).map((label) => label.text), "labels cut by the plan's edge").toEqual([]);
}
