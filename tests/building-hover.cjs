const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const targets = require("./fixtures/building-hover.json");

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

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 2000, height: 900 }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
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
    assert.deepEqual(ownership, {
      monroeRoof: "Monroe Building", lakeviewWall: "SAIC Lakeview Building", prudentialAntenna: "One Prudential Plaza",
      nested: 0, duplicateIds: 0,
    });
    for (const target of targets) {
      const point = project(target);
      await page.mouse.move(point.x, point.y);
      assert.equal(await page.locator("#building-tooltip-text").textContent(), target.label, `SVG: ${target.id}`);
      const active = await page.evaluate(() => [...document.querySelectorAll(".is-active")].map((node) => node.dataset.buildingId || node.id));
      assert.ok(active.length > 0 && active.every((key) => key === target.key), `SVG should highlight only ${target.key}`);
      if (target.key === "one-prudential-plaza") assert.equal(active.length, 2, "tower and podium should highlight together");
    }
    await page.mouse.move(5, 5);
    assert.equal(await page.locator(".is-active").count(), 0);
    assert.equal(await page.locator("#building-tooltip").getAttribute("visibility"), "hidden");

    await page.goto(`${origin}/skyline-webgl.html`);
    await page.waitForFunction(() => window.__skylineWebGL?.ready);
    assert.equal(await page.evaluate(() => window.__skylineWebGL.buildingCount), 31);
    for (const target of targets) {
      const point = project(target);
      await page.mouse.move(point.x, point.y);
      await settle(page);
      assert.equal(await page.evaluate(() => window.__skylineWebGL.selectedBuilding), target.key, `WebGL: ${target.id}`);
      assert.equal(await page.locator("#tooltip").textContent(), target.label);
    }
    const moveTo = async (target, width = 2000, height = 900) => {
      const point = project(target, width, height);
      await page.mouse.move(point.x, point.y);
      await settle(page);
      assert.equal(await page.evaluate(() => window.__skylineWebGL.selectedBuilding), target.key);
    };
    await moveTo(core.gap);
    assert.equal(await page.locator("#tooltip").isHidden(), true, "empty sky inside the old composite bounds must not pick a building");
    const patch = async (target) => {
      const point = project(target);
      return page.screenshot({ clip: { x: Math.floor(point.x) - 4, y: Math.floor(point.y) - 4, width: 8, height: 8 } });
    };
    const trumpBefore = await patch(core.trump), prudentialBefore = await patch(core.prudential);
    await moveTo(core.trump);
    assert.notDeepEqual(await patch(core.trump), trumpBefore, "Trump's facade should illuminate");
    assert.deepEqual(await patch(core.prudential), prudentialBefore, "Trump hover must not illuminate One Prudential");
    await moveTo(core.prudential);
    assert.deepEqual(await patch(core.trump), trumpBefore, "One Prudential hover must not illuminate Trump");
    assert.notDeepEqual(await patch(core.prudential), prudentialBefore);
    await moveTo(targets.find((target) => target.id === "building-prudential-plaza-podium"));
    assert.notDeepEqual(await patch(core.prudential), prudentialBefore, "podium hover should illuminate its tower across draw layers");

    await page.setViewportSize({ width: 1280, height: 720 });
    for (const target of Object.values(core)) await moveTo(target, 1280, 720);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    for (const target of [core.trump, core.prudential]) await moveTo(target, 1280, 720);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await settle(page);
    assert.equal(await page.evaluate(() => window.__skylineWebGL.selectedBuilding), core.prudential.key);
    await page.mouse.move(-1, -1);
    await settle(page);
    assert.equal(await page.locator("#tooltip").isHidden(), true);
    assert.equal(await page.evaluate(() => window.__skylineWebGL.selectedBuilding), null);

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
    mobile.on("pageerror", (error) => errors.push(error.message));
    await mobile.goto(`${origin}/skyline-webgl.html`);
    await mobile.waitForFunction(() => window.__skylineWebGL?.ready);
    for (const target of [core.trump, core.prudential]) {
      const point = project(target, 390, 844);
      await mobile.mouse.move(point.x, point.y);
      await settle(mobile);
      assert.equal(await mobile.evaluate(() => window.__skylineWebGL.selectedBuilding), target.key);
    }
    assert.deepEqual(errors, []);
    console.log(`PASS: ${targets.length} SVG/WebGL hover samples across 31 buildings, ownership, independent illumination, overlaps, sky gaps, resize, parallax, reduced motion, and mobile scaling.`);
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
