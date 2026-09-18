import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chromium } from "playwright";
import targets from "./fixtures/building-hover.json" with { type: "json" };

const origin = process.env.SKYLINE_TEST_URL || "http://127.0.0.1:8000";
const settle = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
function project({ x, y }, width = 2000, height = 900) {
  const scale = Math.min(width / 8501.0986, height / 2782.0373);
  return {
    x: (width - 8501.0986 * scale) / 2 + (x + 1105.5923) * scale,
    y: height - 2782.0373 * scale + (y - 87.26366) * scale,
  };
}
const core = {
  trump: { x: 3980, y: 1250, key: "trump-tower-only", label: "Trump International Hotel and Tower" },
  prudential: { x: 3860, y: 1920, key: "one-prudential-plaza", label: "One Prudential Plaza" },
  gap: { x: 4430, y: 600, key: null },
};

describe("skyline hover", () => {
  let browser, page, mobile, errors = [];
  beforeAll(async () => {
    browser = await chromium.launch({ channel: "chrome", headless: true });
    page = await browser.newPage({ viewport: { width: 2000, height: 900 }, reducedMotion: "reduce" });
    page.on("pageerror", (error) => errors.push(error.message));
  });
  afterAll(async () => {
    await browser.close();
  });

  test("the SVG keeps building ownership and highlights only the hovered building", { timeout: 180_000 }, async () => {
    await page.goto(`${origin}/skyline-animated.svg`);
    const ownership = await page.evaluate(() => {
      const owner = (id) => document.getElementById(id).closest(".interactive-building").getAttribute("aria-label");
      const ids = [...document.querySelectorAll("[id]")].map((node) => node.id);
      return {
        monroeRoof: owner("path6640"), lakeviewWall: owner("path6658"), prudentialAntenna: owner("path6088"),
        nested: document.querySelectorAll(".interactive-building .interactive-building").length,
        duplicateIds: ids.length - new Set(ids).size,
      };
    });
    expect(ownership).toEqual({
      monroeRoof: "Monroe Building", lakeviewWall: "SAIC Lakeview Building", prudentialAntenna: "One Prudential Plaza",
      nested: 0, duplicateIds: 0,
    });
    for (const target of targets) {
      const point = project(target);
      await page.mouse.move(point.x, point.y);
      expect(await page.locator("#building-tooltip-text").textContent(), `SVG: ${target.id}`).toBe(target.label);
      const active = await page.evaluate(() => [...document.querySelectorAll(".is-active")].map((node) => node.dataset.buildingId || node.id));
      expect(active.length > 0 && active.every((key) => key === target.key), `SVG should highlight only ${target.key}`).toBe(true);
      if (target.key === "one-prudential-plaza") expect(active.length).toBe(2);
    }
    await page.mouse.move(5, 5);
    expect(await page.locator(".is-active").count()).toBe(0);
    expect(await page.locator("#building-tooltip").getAttribute("visibility")).toBe("hidden");
  });

  test("the WebGL view picks every building and illuminates independently", { timeout: 180_000 }, async () => {
    await page.goto(`${origin}/skyline-webgl.html`);
    await page.waitForFunction(() => window.__skylineWebGL?.ready);
    expect(await page.evaluate(() => window.__skylineWebGL.buildingCount)).toBe(31);
    for (const target of targets) {
      const point = project(target);
      await page.mouse.move(point.x, point.y);
      await settle(page);
      expect(await page.evaluate(() => window.__skylineWebGL.selectedBuilding), `WebGL: ${target.id}`).toBe(target.key);
      expect(await page.locator("#tooltip").textContent()).toBe(target.label);
    }
    const moveTo = async (target, width = 2000, height = 900) => {
      const point = project(target, width, height);
      await page.mouse.move(point.x, point.y);
      await settle(page);
      expect(await page.evaluate(() => window.__skylineWebGL.selectedBuilding)).toBe(target.key);
    };
    await moveTo(core.gap);
    expect(await page.locator("#tooltip").isHidden()).toBe(true);
    const patch = async (target) => {
      const point = project(target);
      return page.screenshot({ clip: { x: Math.floor(point.x) - 4, y: Math.floor(point.y) - 4, width: 8, height: 8 } });
    };
    const trumpBefore = await patch(core.trump), prudentialBefore = await patch(core.prudential);
    await moveTo(core.trump);
    expect(await patch(core.trump)).not.toEqual(trumpBefore);
    expect(await patch(core.prudential)).toEqual(prudentialBefore);
    await moveTo(core.prudential);
    expect(await patch(core.trump)).toEqual(trumpBefore);
    expect(await patch(core.prudential)).not.toEqual(prudentialBefore);
    await moveTo(targets.find((target) => target.id === "building-prudential-plaza-podium"));
    expect(await patch(core.prudential)).not.toEqual(prudentialBefore);
  });

  test("the WebGL view keeps picking across resizes and reduced motion", { timeout: 180_000 }, async () => {
    const moveTo = async (target, width, height) => {
      const point = project(target, width, height);
      await page.mouse.move(point.x, point.y);
      await settle(page);
      expect(await page.evaluate(() => window.__skylineWebGL.selectedBuilding)).toBe(target.key);
    };
    await page.setViewportSize({ width: 1280, height: 720 });
    for (const target of Object.values(core)) await moveTo(target, 1280, 720);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    for (const target of [core.trump, core.prudential]) await moveTo(target, 1280, 720);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await settle(page);
    expect(await page.evaluate(() => window.__skylineWebGL.selectedBuilding)).toBe(core.prudential.key);
    await page.mouse.move(-1, -1);
    await settle(page);
    expect(await page.locator("#tooltip").isHidden()).toBe(true);
    expect(await page.evaluate(() => window.__skylineWebGL.selectedBuilding)).toBeNull();
  });

  test("the WebGL view scales picking to mobile", { timeout: 180_000 }, async () => {
    mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
    mobile.on("pageerror", (error) => errors.push(error.message));
    await mobile.goto(`${origin}/skyline-webgl.html`);
    await mobile.waitForFunction(() => window.__skylineWebGL?.ready);
    for (const target of [core.trump, core.prudential]) {
      const point = project(target, 390, 844);
      await mobile.mouse.move(point.x, point.y);
      await settle(mobile);
      expect(await mobile.evaluate(() => window.__skylineWebGL.selectedBuilding)).toBe(target.key);
    }
  });

  test("hover runs without page errors", { timeout: 180_000 }, async () => {
    expect(errors).toEqual([]);
  });
});
