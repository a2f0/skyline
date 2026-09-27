import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { chromium } from "playwright";
import type { Browser, Page } from "playwright";
import type { Vec3 } from "../models/building-kit.js";
import { heritage, kemper, crain, michigan, trump, prudential, twoPrudential, aon, reference, models, landmarks, landmarkTolerance, fitted } from "./skyline-landmarks.js";
import { viewports, checkSpec, measureStudy, above } from "./study-fidelity.js";
import type { MeasureResult } from "./study-fidelity.js";


const origin = process.env["SKYLINE_TEST_URL"] || "http://127.0.0.1:8000";
const settle = (page: Page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const cameraPosition = (page: Page) => page.evaluate(() => window.__buildingStudy!.cameraPosition as [number, number, number]);
// Exclude tooltip overlap from pixel checks; its text is asserted separately.
const patch = (page: Page, point: { x: number; y: number }) => page.screenshot({ style: "#tooltip { visibility: hidden !important; }", clip: { x: Math.floor(point.x) - 4, y: Math.floor(point.y) - 4, width: 8, height: 8 } });
const heritageModule = models.find((model) => model.id === heritage)!.module;
const heritageSpec = fitted.find((spec) => spec.id === heritage)!;
const crainModule = models.find((model) => model.id === crain)!.module;
const crainSpec = fitted.find((spec) => spec.id === crain)!;
const trumpModule = models.find((model) => model.id === trump)!.module;
const trumpSpec = fitted.find((spec) => spec.id === trump)!;
const prudentialModule = models.find((model) => model.id === prudential)!.module;
const prudentialSpec = fitted.find((spec) => spec.id === prudential)!;
const twoPrudentialModule = models.find((model) => model.id === twoPrudential)!.module;
const twoPrudentialSpec = fitted.find((spec) => spec.id === twoPrudential)!;
const aonModule = models.find((model) => model.id === aon)!.module;
const aonSpec = fitted.find((spec) => spec.id === aon)!;
// The layouts come from the shared list, so scripts/fidelity-report.js measures the same pages.
const [desktop, laptop, tablet, tall, phone] = viewports;
const silhouetteSlack = 0.001 / 1.20834767 / 1.19979319;

async function checkReferenceMatch(page: Page) {
  // Landmarks, columns, and sight lines come from tests/skyline-landmarks.js through the
  // shared maths in tests/study-fidelity.js, which scripts/fidelity-report.js also uses.
  const { deviations, buildings } = await page.evaluate(
    measureStudy as unknown as (arg: unknown) => Promise<MeasureResult>,
    { landmarks, landmarkTolerance, fitted, models },
  );
  for (const [name, result] of Object.entries(deviations)) {
    expect(result.error, `${name} should follow source: ${JSON.stringify(result)}`).toBeLessThan(result.tolerance);
  }
  for (const building of buildings) {
    const { label, onGeometryTolerance } = fitted.find((spec) => spec.id === building.id)!;
    for (const [name, distance] of Object.entries(building.onGeometry)) {
      expect(distance, `${label} ${name} should lie on the model geometry: ${distance} m`).toBeLessThan(onGeometryTolerance);
    }
  }
  const { projected, columns, silhouette } = buildings.find((building) => building.id === heritage)!;
  expect(above(deviations, "Kemper near roof", "Kemper left roof", "Kemper right roof")).toBe(true);
  expect(above(deviations, "Michigan near roof", "Michigan left roof", "Michigan right roof")).toBe(true);
  // Crain's north-east half ends on a flat step above the south-west half's foot.
  expect(above(deviations, "crainStepEast", "crainFoot")).toBe(true);
  expect(above(deviations, "screenFrontTop", "screenNorthTop", "screenSouthTop")).toBe(true);
  expect(above(deviations, "stubFrontRoof", "stubLeftRoof")).toBe(true);
  expect(above(deviations, "roofNear", "roofLeft", "roofRight")).toBe(true);
  expect(above(deviations, "penthouseTopEast", "penthouseTopWest")).toBe(true);
  expect(above(deviations, "trumpSpireTip", "twoSpire", "mastTip")).toBe(true);
  expect(above(deviations, "twoSpire", "twoPyramid", "mastTip")).toBe(true);
  expect(above(deviations, "twoPyramid", "twoSouthChevron", "twoEastChevron")).toBe(true);
  expect(above(deviations, "twoSouthChevron", "twoEastChevron", "twoMiddleChevron")).toBe(true);
  expect(above(deviations, "twoMiddleChevron", "twoLowerChevron")).toBe(true);
  expect(above(deviations, "aonRoofNear", "aonRoofWest", "aonRoofEast")).toBe(true);
  expect(above(deviations, "aonRoofNear", "trumpSpireTip")).toBe(true);
  // Aon's notched corner is solid stone between the south face's east end and the east
  // face's south end: the drawing paints it from its front face's edge, x 5135.5, to its
  // first east strip, x 5212.07.
  const aonProjected = buildings.find((building) => building.id === aon)!.projected;
  const aonLayerUnit = (deviations["aonRoofEast"]!.expected[0] - deviations["aonRoofNear"]!.expected[0]) / (5401.877 - 5148.845);
  const aonNotch = (aonProjected["aonNotchEast"] as [number, number])[0] - (aonProjected["aonNotchFront"] as [number, number])[0];
  expect(Math.abs(aonNotch - (5212.07 - 5135.5) * aonLayerUnit), `Aon's notched corner should span the drawn stone: ${aonNotch}`).toBeLessThan(0.002);
  const cap = {
    apex: projected["capApex"] as [number, number],
    ends: [projected["capSouthEnd"], projected["capNorthEnd"]] as [number, number][],
  };
  expect(cap.ends.every((end) => cap.apex[1] < end[1]), `Heritage's crown cap should crest over the joint, above both of its ends: ${JSON.stringify(cap)}`).toBe(true);
  for (const building of buildings) {
    const spec = fitted.find((entry) => entry.id === building.id)!;
    for (const [name, list] of Object.entries(building.columns)) {
      const { batch, drawn, tolerance = spec.columnTolerance } = spec.columns[name]!;
      expect(list.length, `${spec.label} should export every drawn ${name}`).toBe(drawn.length);
      list.forEach((column, index) => {
        expect(Math.abs(column.actual - column.expected), `${spec.label} ${name} ${index + 1} should line up with the drawing: ${JSON.stringify(column)}`).toBeLessThan(tolerance);
      });
      building.sightGaps[name]!.forEach(({ gap, mesh }, index) => {
        expect(gap > spec.sightGap[0] && gap < spec.sightGap[1] && mesh === batch,
          `${spec.label} ${name} ${index + 1} should stand proud as the first surface on its sight line: ${gap} m on ${mesh}`).toBe(true);
      });
    }
    for (const [name, list] of Object.entries(building.rows)) {
      const { drawn, tolerance } = spec.rows![name]!;
      expect(list.length, `${spec.label} should export every drawn ${name}`).toBe(drawn.length);
      list.forEach((row, index) => {
        expect(Math.abs(row.actual - row.expected), `${spec.label} ${name} ${index + 1} should match the source row: ${JSON.stringify(row)}`).toBeLessThan(tolerance);
      });
    }
  }
  // Fin 3 stands on the joint and fin 11 on the bow's end; bays narrow as the bow turns away.
  const fins = columns["crownFins"]!.map((column) => column.actual);
  for (let index = 3; index < 10; index += 1) {
    expect(fins[index + 1]! - fins[index]! < fins[index]! - fins[index - 1]!,
      `Heritage's crown fin spacing should narrow across the bow: ${JSON.stringify(fins)}`).toBe(true);
  }
  const lowerSouthWest = (projected["lowerSouthWest"] as [number, number][]).map((uv) => uv[0]);
  expect(lowerSouthWest.every((u) => u >= silhouette! - silhouetteSlack),
    `Heritage's trimmed lower tier and its cap and band overhangs should stay inside the drawn left silhouette: ${JSON.stringify({ lowerSouthWest, silhouette })}`).toBe(true);
  // One Prudential's wing ends the drawn silhouette on the right, so the model is held to it.
  // Through this camera the real wing's 60.4 m east wall runs a little past the drawn podium,
  // its coping's outer north-east corner furthest, near 0.0029 at the desktop layout, so it
  // is held within the building's landmark tolerance rather than the bare drawn edge.
  const wing = buildings.find((building) => building.id === prudential)!;
  const wingEdge = [wing.projected["wingCorner"] as [number, number], wing.projected["wingEastEnd"] as [number, number], ...(wing.projected["wingRibEdge"] as [number, number][])].map(([u]) => u);
  expect(wingEdge.every((u) => u <= wing.silhouette! + prudentialSpec.tolerance),
    `One Prudential's wing and its coping should stay within the drawn right silhouette: ${JSON.stringify({ wingEdge, silhouette: wing.silhouette })}`).toBe(true);
}

async function checkCameraFloor(page: Page, screenshotPath?: string) {
  await page.locator("canvas").focus();
  for (let index = 0; index < 24; index += 1) await page.keyboard.press("ArrowDown");
  expect((await cameraPosition(page))[1] >= 0.999, "orbit should keep the camera above ground").toBe(true);
  for (let index = 0; index < 24; index += 1) await page.keyboard.press("-");
  expect((await cameraPosition(page))[1] >= 0.999, "zooming out at the lowest orbit should stay above ground").toBe(true);
  for (let index = 0; index < 24; index += 1) await page.keyboard.press("ArrowDown");
  expect((await cameraPosition(page))[1] >= 0.999, "lowest orbit at maximum distance should stay above ground").toBe(true);
  await checkVisibleHighlight(page, "far");
  if (screenshotPath) await page.locator("canvas").screenshot({ path: screenshotPath });
  for (let index = 0; index < 13; index += 1) await page.keyboard.press("+");
  await checkVisibleHighlight(page, "near");
  await page.keyboard.press("Home");
  const before = await cameraPosition(page);
  const distance = (position: [number, number, number]) => Math.hypot(position[0], position[1] - 172.5, position[2]);
  for (let index = 0; index < 40; index += 1) await page.keyboard.press("+");
  const close = await cameraPosition(page);
  expect(Math.abs(distance(close) / distance(before) - 0.1), "perspective zoom reaches one tenth of the fitted distance").toBeLessThan(1e-6);
  expect(close.every(Number.isFinite) && close[1] >= 0.999, "close-up camera stays finite and above ground").toBe(true);
  await checkVisibleHighlight(page, "close-up", [0, 165, 23.4]);
  await page.keyboard.press("Home");
}

async function checkVisibleHighlight(page: Page, clippingPlane: string, modelPoint: Vec3 = [0, 120, 23.4]) {
  const point = await screenPoint(page, michigan, modelPoint);
  await page.mouse.move(5, 5);
  await settle(page);
  const unlit = await patch(page, point);
  await page.mouse.move(point.x, point.y);
  await settle(page);
  expect(await page.evaluate(() => window.__buildingStudy!.selectedBuilding)).toBe(michigan);
  expect(await patch(page, point), `the tower must still render and illuminate within the ${clippingPlane} clipping plane`).not.toEqual(unlit);
  await page.mouse.move(5, 5);
  await settle(page);
}

async function screenPoint(page: Page, id: string, point: Vec3) {
  await settle(page);
  const uv = await page.evaluate(([id, point]) => window.__buildingStudy!.projectPoint(id, point), [id, point] as [string, Vec3]);
  const bounds = (await page.locator("canvas").boundingBox())!;
  return { x: bounds.x + uv[0] * bounds.width, y: bounds.y + uv[1] * bounds.height };
}

describe("eight-building skyline study", () => {
  let browser!: Browser, page!: Page, initial!: [number, number, number], errors: string[] = [], external: string[] = [];
  beforeAll(async () => {
    checkSpec({ fitted, models });
    browser = await chromium.launch({ channel: "chrome", headless: true });
    page = await browser.newPage(desktop.options);
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => { if (!request.url().startsWith(origin) && !request.url().startsWith("data:")) external.push(request.url()); });
    await page.goto(`${origin}/skyline-study.html`);
    await page.waitForFunction(() => window.__buildingStudy?.ready);
    await settle(page);
  }, { timeout: 180_000 });
  afterAll(async () => {
    await browser.close();
  }, { timeout: 60_000 });

  test("pans at first load and guards the camera floor around a below-grade target", async () => {
    // Pan must work on first load, before a view button initializes controls.
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.locator("canvas").scrollIntoViewIfNeeded();
    const panBefore = await cameraPosition(page), panBox = (await page.locator("canvas").boundingBox())!;
    await page.mouse.move(panBox.x + panBox.width / 2, panBox.y + panBox.height / 2);
    await page.keyboard.down("Shift");
    await page.mouse.down();
    await page.mouse.move(panBox.x + panBox.width / 2 + 40, panBox.y + panBox.height / 2, { steps: 4 });
    await page.mouse.up();
    await page.keyboard.up("Shift");
    expect(await cameraPosition(page), "perspective view can pan to a different building").not.toEqual(panBefore);
    // Lower the orbit target below grade, then zoom until a fixed target would
    // make the camera-floor and minimum-angle constraints incompatible.
    for (let drag = 0; drag < 3; drag += 1) {
      await page.mouse.move(panBox.x + panBox.width / 2, panBox.y + panBox.height * 0.85);
      await page.keyboard.down("Shift");
      await page.mouse.down();
      await page.mouse.move(panBox.x + panBox.width / 2, panBox.y + panBox.height * 0.15, { steps: 8 });
      await page.mouse.up();
      await page.keyboard.up("Shift");
    }
    await page.locator("canvas").focus();
    for (let step = 0; step < 40; step += 1) await page.keyboard.press("+");
    const pannedClose = await cameraPosition(page);
    expect(pannedClose.every(Number.isFinite) && pannedClose[1] >= 0.999, "zooming toward a below-ground target stays above grade").toBe(true);
    expect(errors, "panning and zooming cannot recursively overflow the camera-floor guard").toEqual([]);
    await page.locator("#reset").click();
    await page.emulateMedia({ reducedMotion: "reduce" });
    initial = await cameraPosition(page);
  }, { timeout: 180_000 });

  test("reports the eight models and keeps the scene inside its budgets", async () => {
    expect(await page.evaluate(() => window.__buildingStudy!.modelNames)).toEqual(models.map((model) => model.name));
    expect(await page.evaluate(() => window.__buildingStudy!.activeView)).toBe("skyline");
    // A budget for the whole scene; raise it deliberately when a detailed building lands.
    // Crain's banded curtain wall and glazed diamond raised it from 86,000 to 115,000, Aon's
    // columns, floor-by-floor glass, and louvered crown to 126,000, One Prudential's
    // limestone piers, window-by-window facade, wing, and sign penthouse to 142,000,
    // Trump's curtain wall on its mapped curves to 145,000, and Two Prudential's
    // window-by-window core, stepped gables, tiers, and stepped pyramid to 170,000.
    const triangles = await page.evaluate(() => window.__buildingStudy!.triangleCount);
    expect(triangles > 169000 && triangles < 171000, `the eight-building scene should stay within 169,000-171,000 triangles: ${triangles}`).toBe(true);
    const shadowBounds = await page.evaluate(() => window.__buildingStudy!.shadowBounds);
    expect(shadowBounds.min.every((v: number) => v > -1) && shadowBounds.max.every((v: number) => v < 1),
      `all buildings and the platform should stay within the light's shadow camera: ${JSON.stringify(shadowBounds)}`).toBe(true);
  }, { timeout: 180_000 });

  test("matches the reference drawing and its SVG geometry at the desktop layout", async () => {
    await checkReferenceMatch(page);
    const preserved = await page.evaluate(async ({ groups, path, sourcePath }) => {
      const parse = async (url: string) => new DOMParser().parseFromString(await (await fetch(url)).text(), "image/svg+xml");
      const source = await parse(sourcePath), reference = await parse(path);
      const expected = source.querySelectorAll(groups.map((id: string) => `#${id} path`).join(", "));
      const actual = [...reference.querySelectorAll("path")];
      const transforms = (part: SVGPathElement) => {
        const chain: (string | null)[] = [];
        for (let node: Element | null = part; node && !node.classList.contains("interactive-building"); node = node.parentElement) chain.push(node.getAttribute("transform"));
        return JSON.stringify(chain);
      };
      return actual.length === expected.length && actual.every((part, index) => part.id === expected[index]!.id && part.getAttribute("d") === expected[index]!.getAttribute("d") && transforms(part) === transforms(expected[index] as SVGPathElement));
    }, { groups: reference.groups, path: reference.path, sourcePath: reference.source });
    expect(preserved, "reference must preserve original path geometry, nested transforms, and draw order").toBe(true);
  }, { timeout: 180_000 });

  test("stays idle until the view changes", async () => {
    const idle = await page.evaluate(() => window.__buildingStudy!.renderCount);
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => window.__buildingStudy!.renderCount)).toBe(idle);
  }, { timeout: 180_000 });

  test("illuminates each building independently and keeps occlusion ownership", async () => {
    // The page serves the compiled site, so source module paths end in .js there.
    const features = async ([url, name]: [string, string]) => page.evaluate(async ([url, name]) => (await import(url))[name], [url.replace(/\.ts$/, ".js"), name] as [string, string]);
    const heritageFeatures = await features([heritageModule, heritageSpec.features]);
    const crainFeatures = await features([crainModule, crainSpec.features]);
    const trumpFeatures = await features([trumpModule, trumpSpec.features]);
    const prudentialFeatures = await features([prudentialModule, prudentialSpec.features]);
    const twoPrudentialFeatures = await features([twoPrudentialModule, twoPrudentialSpec.features]);
    const aonFeatures = await features([aonModule, aonSpec.features]);
    const points = [await screenPoint(page, heritage, heritageFeatures.bowFacade), await screenPoint(page, kemper, [-5, 75, 26.8]), await screenPoint(page, crain, crainFeatures.crainFacadeProbe), await screenPoint(page, michigan, [0, 120, 23.4]), await screenPoint(page, trump, trumpFeatures.trumpFacadeProbe), await screenPoint(page, prudential, prudentialFeatures.southFacade), await screenPoint(page, twoPrudential, twoPrudentialFeatures.twoFacade), await screenPoint(page, aon, aonFeatures.aonFrontFacade)];
    const before: Buffer[] = [];
    for (const point of points) before.push(await patch(page, point));
    for (const [index, id, label] of [[0, heritage, "The Heritage at Millennium Park"], [1, kemper, "Kemper Building"], [2, crain, "Crain Communications Building"], [3, michigan, "Michigan Plaza South"], [4, trump, "Trump International Hotel and Tower"], [5, prudential, "One Prudential Plaza"], [6, twoPrudential, "Two Prudential Plaza"], [7, aon, "Aon Center"]] as [number, string, string][]) {
      await page.mouse.move(points[index]!.x, points[index]!.y);
      await settle(page);
      expect(await page.evaluate(() => window.__buildingStudy!.selectedBuilding)).toBe(id);
      expect(await page.locator("#tooltip").textContent()).toBe(label);
      expect(await patch(page, points[index]!), `${label} should illuminate`).not.toEqual(before[index]);
      for (let neighbor = 0; neighbor < points.length; neighbor += 1) {
        if (neighbor !== index) {
          expect(await patch(page, points[neighbor]!), `neighbor ${neighbor} should stay unlit while hovering ${label}`).toEqual(before[neighbor]!);
        }
      }
    }
    // The drawing covers Michigan Plaza's rightmost 47 layer units with One Prudential, so
    // the nearer slab owns those pixels.
    const hiddenMichigan = await screenPoint(page, michigan, [23.35, 120, -20]);
    await page.mouse.move(hiddenMichigan.x, hiddenMichigan.y);
    await settle(page);
    expect(await page.evaluate(() => window.__buildingStudy!.selectedBuilding), "One Prudential should own the hover where the drawing covers Michigan Plaza's right edge").toBe(prudential);
    const hiddenTrump = await screenPoint(page, trump, trumpFeatures.trumpBehindPrudential);
    await page.mouse.move(hiddenTrump.x, hiddenTrump.y);
    await settle(page);
    expect(await page.evaluate(() => window.__buildingStudy!.selectedBuilding), "One Prudential should own the hover where it covers Trump's lower facade").toBe(prudential);
    const hiddenTwoPrudential = await screenPoint(page, twoPrudential, twoPrudentialFeatures.twoBehindPodium);
    await page.mouse.move(hiddenTwoPrudential.x, hiddenTwoPrudential.y);
    await settle(page);
    expect(await page.evaluate(() => window.__buildingStudy!.selectedBuilding), "One Prudential's podium should own the hover where it covers Two Prudential's lower facade").toBe(prudential);
    // Heritage's north strip continues behind Kemper's left face, so Kemper owns that hover.
    const hiddenHeritage = await screenPoint(page, heritage, heritageFeatures.northStripFacade);
    await page.mouse.move(hiddenHeritage.x, hiddenHeritage.y);
    await settle(page);
    expect(await page.evaluate(() => window.__buildingStudy!.selectedBuilding), "Kemper should own the hover where it hides Heritage in the skyline view").toBe(kemper);
    await page.mouse.move(5, 5);
  }, { timeout: 180_000 });

  test("renders views, wireframe, keyboard and camera-floor controls", async () => {
    await page.screenshot({ path: "/tmp/skyline-group-desktop.png", fullPage: true });
    const normal = await page.locator("canvas").screenshot();
    await page.locator("#wireframe").click();
    expect(await page.locator("canvas").screenshot()).not.toEqual(normal);
    await page.locator("#wireframe").click();
    await page.locator('[data-view="quarter"]').click();
    expect(await cameraPosition(page)).not.toEqual(initial);
    await page.screenshot({ path: "/tmp/skyline-group-quarter.png", fullPage: true });
    await page.locator('[data-view="side"]').click();
    expect(await page.locator("canvas").screenshot()).not.toEqual(normal);
    const hiddenCrain = await screenPoint(page, crain, [0, 70, 0]);
    await page.mouse.move(hiddenCrain.x, hiddenCrain.y);
    await settle(page);
    // Aon's new foreground depth puts its broad west face over this Crain point
    // from the side. The owner is the raycast result, not skyline x ordering.
    expect(await page.evaluate(() => window.__buildingStudy!.selectedBuilding), "Aon should own the hover where it occludes Crain in side view").toBe(aon);
    await page.locator("#reset").click();
    expect(await cameraPosition(page)).toEqual(initial);
    await page.locator("canvas").focus();
    await page.keyboard.press("ArrowLeft");
    expect(await cameraPosition(page)).not.toEqual(initial);
    await page.keyboard.press("Home");
    expect(await cameraPosition(page)).toEqual(initial);
    await page.keyboard.press("+");
    expect(await cameraPosition(page)).not.toEqual(initial);
    await page.keyboard.press("Home");
    await checkCameraFloor(page);
    expect(await cameraPosition(page)).toEqual(initial);
  }, { timeout: 180_000 });

  test("matches the drawing at the laptop layout and respects reduced motion", async () => {
    await page.setViewportSize(laptop.options.viewport!);
    await settle(page);
    await checkReferenceMatch(page);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.locator("#turntable").click();
    const started = await cameraPosition(page);
    await page.waitForTimeout(300);
    expect(await cameraPosition(page)).not.toEqual(started);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(() => !window.__buildingStudy!.turning);
    const stopped = await cameraPosition(page);
    await page.waitForTimeout(250);
    expect(await cameraPosition(page)).toEqual(stopped);
    expect(await page.locator("#turntable").isDisabled()).toBe(true);
  }, { timeout: 180_000 });

  test("matches the drawing at the tablet and tall layouts", async () => {
    // Tall two-column layouts need the most camera distance to fit the scene.
    for (const size of [tablet, tall].map(({ options }) => options.viewport!)) {
      await page.setViewportSize(size);
      await page.locator("#reset").click();
      await settle(page);
      await checkReferenceMatch(page);
      await checkCameraFloor(page, `/tmp/skyline-group-tablet-${size.width}-far.png`);
    }
    expect(external).toEqual([]);
  }, { timeout: 180_000 });

  test("works on mobile with touch", async () => {
    const mobile = await browser.newPage(phone.options);
    mobile.on("pageerror", (error) => errors.push(error.message));
    await mobile.goto(`${origin}/skyline-study.html`);
    await mobile.waitForFunction(() => window.__buildingStudy?.ready);
    expect(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await mobile.locator("canvas").scrollIntoViewIfNeeded();
    await checkReferenceMatch(mobile);
    const mobileInitial = await cameraPosition(mobile);
    const bounds = (await mobile.locator("canvas").boundingBox())!;
    const session = await mobile.context().newCDPSession(mobile);
    const touch = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [touch] });
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...touch, x: touch.x + 45 }] });
    // Rest before lifting, as a finger does after a drag. An instant release
    // reads as a fling, and Chrome may swallow the next tap to stop that fling.
    await mobile.waitForTimeout(100);
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    expect(await cameraPosition(mobile)).not.toEqual(mobileInitial);
    await mobile.locator("#reset").tap();
    expect(await cameraPosition(mobile)).toEqual(mobileInitial);
    await checkCameraFloor(mobile, "/tmp/skyline-group-mobile-far.png");
    expect(await cameraPosition(mobile)).toEqual(mobileInitial);
    await mobile.screenshot({ path: "/tmp/skyline-group-mobile.png", fullPage: true });
    await mobile.locator('a[href="building-study.html"]').tap();
    await mobile.waitForFunction(() => window.__buildingStudy?.ready);
    expect(await mobile.evaluate(() => window.__buildingStudy!.modelName)).toBe("Crain Communications Building");
    await mobile.locator(".back").tap();
    await mobile.locator('a[href="skyline-study.html"]').tap();
    await mobile.waitForFunction(() => window.__buildingStudy?.ready);
    await mobile.close();
  }, { timeout: 180_000 });

  test("shows fallback messages without WebGL and never throws", async () => {
    const fallback = await browser.newPage();
    await fallback.goto(pathToFileURL(path.resolve(import.meta.dirname, "../dist/skyline-study.html")).href);
    expect(await fallback.locator("#loading").textContent()).toMatch(/localhost:8000\/skyline-study.html/);
    expect(await fallback.locator("#reset").isDisabled()).toBe(true);
    await fallback.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null; });
    await fallback.goto(`${origin}/skyline-study.html`);
    await fallback.waitForFunction(() => document.querySelector("#loading")!.textContent!.includes("WebGL 2"));
    expect(await fallback.locator("#turntable").isDisabled()).toBe(true);
    await fallback.close();
    expect(errors).toEqual([]);
  }, { timeout: 180_000 });
});
