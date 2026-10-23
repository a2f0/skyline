// The full-screen 3D skyline's celebration lighting, time of day, colour and building details.
// Its loading, placement, camera, toolbar and controls are in skyline-3d.test.ts.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chromium } from "playwright";
import type { Browser, Frame, Page } from "playwright";
import { geographicBuildings } from "../src/models/skyline-geography-data.js";
import { createGeographicBuilding, footprintMetrics } from "../src/models/skyline-geography.js";
import { celebrations } from "../src/models/celebrations.js";
import type * as THREE from "../src/vendor/three-r186.js";
import { isThreeDeprecation } from "./three-warnings.js";
import { chroma, lampTints, litPixels, near, nightChanges, openScene, origin, pageWatch, pixelAt, settle, expectChangedPicture, expectSamePicture } from "./skyline-3d-page.js";

describe("full-screen 3D skyline", () => {
  let browser!: Browser;
  const { watch, expectClean } = pageWatch();
  beforeAll(async () => {
    // Linux Chrome antialiases text with coloured subpixel fringes, a display setting rather
    // than a colour the page draws; greyscale text keeps the chroma checks about the page.
    browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-lcd-text"] });
  }, { timeout: 180_000 });
  afterAll(async () => {
    await browser.close();
  }, { timeout: 60_000 });

  test("logo buttons light the actual windows, replace and restore messages, and preserve hover", async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    await watch(page);
    const shaderErrors: string[] = [];
    page.on("console", (message) => { if (message.type() === "error") shaderErrors.push(message.text()); });
    await page.goto(`${origin}/skyline-3d.html`);
    await page.waitForFunction(() => window.__buildingStudy?.ready);
    expect(await page.locator("#celebration-announcement").evaluate((element) => getComputedStyle(element).display)).not.toBe("none");
    await page.locator("#menu-toggle").click();
    await page.mouse.move(1, 1);
    await settle(page);
    const canvas = page.locator("#building");
    const snapshot = () => canvas.screenshot({ style: ".scene-notes { visibility: hidden !important; }" });
    const baseline = await snapshot();
    const identity = await page.evaluate(() => ({ names: window.__buildingStudy!.modelNames, triangles: window.__buildingStudy!.triangleCount, camera: window.__buildingStudy!.cameraPosition }));
    // Count actual rendered white pixels, so a correct controller with a broken
    // shader still fails. Baseline and active images have the same canvas size.
    const bright = async (png: Buffer) => page.evaluate(async (data) => {
      const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob());
      const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d")!;
      context.drawImage(bitmap, 0, 0);
      const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
      let count = 0;
      for (let i = 0; i < pixels.length; i += 4) if (pixels[i]! > 240) count += 1;
      return count;
    }, png.toString("base64"));
    const unlit = await bright(baseline);
    for (const preset of celebrations) {
      const button = page.locator(`[data-celebration="${preset.id}"]`);
      await button.focus();
      await button.press("Enter");
      await settle(page);
      expect(await page.locator("[data-celebration][aria-pressed=true]").count()).toBe(1);
      expect(await button.getAttribute("aria-pressed")).toBe("true");
      expect(await page.locator("#celebration-status").textContent()).toContain(preset.lines.join(" "));
      expect(await page.locator("#celebration-announcement").textContent()).toContain(preset.lines.join(" "));
      expect(await bright(await snapshot()), preset.id).toBeGreaterThan(unlit + 20);
      expect(await page.evaluate(() => window.__buildingStudy!.illuminations.find(({ building }) => building === "building-blue-cross-blue-shield")!.active)).toBe(preset.id);
    }
    expect(await chroma(page)).toBe(0);
    await page.locator("[data-celebration=thanks]").press("Space");
    await settle(page);
    await expectSamePicture(page, await snapshot(), baseline, "turning a celebration off restores the unlit scene");
    expect(await page.evaluate(() => ({ names: window.__buildingStudy!.modelNames, triangles: window.__buildingStudy!.triangleCount, camera: window.__buildingStudy!.cameraPosition }))).toEqual(identity);

    await page.locator("[data-celebration=cubs]").click();
    const model = createGeographicBuilding(geographicBuildings.find(({ id }) => id === "building-blue-cross-blue-shield")!);
    model.illumination!.set("cubs");
    const geometry = (model.building.getObjectByName("Blue Cross · glass, spandrels and bands") as THREE.Mesh).geometry;
    const light = geometry.getAttribute("windowLight"), positions = geometry.getAttribute("position");
    let vertex = 0;
    while (light.getX(vertex) === 0) vertex += 1;
    const point = [0, 1, 2].map((axis) => [0, 1, 2].reduce((sum, offset) => sum + positions.array[(vertex + offset) * 3 + axis]!, 0) / 3);
    const [x, y] = await page.evaluate((coordinates) => {
      const [u, v] = window.__buildingStudy!.projectPoint("building-blue-cross-blue-shield", coordinates);
      const box = document.querySelector("canvas")!.getBoundingClientRect();
      return [box.x + u * box.width, box.y + v * box.height];
    }, point) as [number, number];
    await page.mouse.move(x, y);
    await settle(page);
    expect(await page.evaluate(() => window.__buildingStudy!.selectedBuilding)).toBe("building-blue-cross-blue-shield");
    await page.locator("#wireframe").click();
    await page.locator("#wireframe").click();
    expect(await page.evaluate(() => window.__buildingStudy!.illuminations.find(({ building }) => building === "building-blue-cross-blue-shield")!.active)).toBe("cubs");
    await page.locator("[data-celebration=cubs]").focus();
    await page.keyboard.press("Escape");
    expect(await page.evaluate(() => document.activeElement?.id)).toBe("menu-toggle");
    expect(await page.locator("[data-celebration=cubs]").isHidden()).toBe(true);
    expect(await page.evaluate(() => window.__buildingStudy!.illuminations.find(({ building }) => building === "building-blue-cross-blue-shield")!.active)).toBe("cubs");
    expect(shaderErrors).toEqual([]);
    await page.close();
  }, { timeout: 60_000 });

  test("building lighting menus share toolbar state, support keyboard and touch, and fit short screens", async () => {
    for (const embedded of [false, true]) {
      const page = await browser.newPage({ viewport: embedded ? { width: 390, height: 844 } : { width: 1440, height: 900 }, hasTouch: embedded, reducedMotion: "reduce" });
      await watch(page);
      await page.goto(`${origin}/${embedded ? "index.html?controls=closed" : "skyline-3d.html"}`);
      const scene = embedded ? await openScene(page) : page;
      await scene.waitForFunction(() => window.__buildingStudy?.ready);
      expect(await scene.locator("[data-celebration=pride]").count()).toBe(0);
      expect(await scene.locator("[data-celebration]").count()).toBe(6);
      const record = geographicBuildings.find(({ id }) => id === "building-blue-cross-blue-shield")!;
      const { center } = footprintMetrics(record.footprint.coordinates);
      const open = async () => {
        const [u, v] = await scene.evaluate(([id, point]) => window.__buildingStudy!.projectPoint(id, [...point]), [record.id, [center[0], record.height * 0.75, -center[1]]] as const);
        if (embedded) {
          // Deliver the browser's long-press sequence in frame coordinates.
          await scene.evaluate(([u, v]) => {
            const canvas = window.__viewerRoot!.querySelector("#building")!, box = canvas.getBoundingClientRect();
            const at = { clientX: box.x + u * box.width, clientY: box.y + v * box.height, bubbles: true, cancelable: true };
            canvas.dispatchEvent(new PointerEvent("pointerdown", { ...at, pointerType: "touch", pointerId: 2 }));
            canvas.dispatchEvent(new MouseEvent("contextmenu", at));
            canvas.dispatchEvent(new PointerEvent("pointerup", { ...at, pointerType: "touch", pointerId: 2 }));
          }, [u, v] as const);
        } else {
          const box = (await scene.locator("#building").boundingBox())!;
          await page.mouse.click(box.x + u * box.width, box.y + v * box.height, { button: "right" });
        }
        expect(await scene.locator("#building-menu-title").textContent()).toBe(record.name);
        expect(await scene.locator("#building-menu").isVisible()).toBe(true);
      };
      const active = () => scene.evaluate(() => window.__buildingStudy!.illuminations.find(({ building }) => building === "building-blue-cross-blue-shield")!.active);
      const focused = () => scene.evaluate(() => window.__focused);
      await open();
      expect(await scene.locator('[role="menuitemradio"][aria-checked="true"]').getAttribute("data-lighting")).toBe("off");
      expect(await scene.locator('[role="menuitemradio"]').count()).toBe(7);
      await page.keyboard.press("End");
      expect(await focused()).toBe("thanks");
      await page.keyboard.press("ArrowDown");
      expect(await focused()).toBe("building-detail-link");
      await page.keyboard.press("ArrowUp");
      expect(await focused()).toBe("thanks");
      await page.keyboard.press("Home");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      expect(await focused()).toBe("bulls");
      await page.keyboard.press("Enter");
      expect(await active()).toBe("bulls");
      expect(await scene.locator("[data-celebration=bulls]").getAttribute("aria-pressed")).toBe("true");
      expect(await focused()).toBe("building");
      expect(await scene.locator("#building-menu").isHidden()).toBe(true);
      await open();
      await scene.locator("[data-lighting=bulls]").press("Space");
      expect(await active()).toBeNull();
      for (const preset of celebrations) {
        await open();
        const choice = scene.locator(`[data-lighting=${preset.id}]`);
        expect(await choice.textContent()).toContain(preset.lines.join(" "));
        if (embedded) await choice.tap(); else await choice.click();
        expect(await active()).toBe(preset.id);
        expect(await scene.locator("#celebration-announcement").textContent()).toContain(preset.lines.join(" "));
      }
      // A toolbar change is checked on the next menu opening, even with the toolbar folded.
      await scene.locator("#menu-toggle").click();
      await scene.locator("[data-celebration=cubs]").click();
      await scene.locator("#menu-toggle").click();
      await open();
      expect(await scene.locator('[role="menuitemradio"][aria-checked="true"]').getAttribute("data-lighting")).toBe("cubs");
      await settle(scene);
      await page.screenshot({ path: `/tmp/skyline-lighting-menu-${embedded ? "touch" : "desktop"}.png` });
      await scene.locator("[data-lighting=off]").click();
      expect(await active()).toBeNull();
      expect(await scene.locator('[data-celebration][aria-pressed="true"]').count()).toBe(0);
      if (!embedded) {
        await page.setViewportSize({ width: 844, height: 220 });
        await settle(scene);
        await open();
        const menuBox = (await scene.locator("#building-menu").boundingBox())!;
        expect(menuBox.y).toBeGreaterThanOrEqual(4);
        expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(216);
        await page.keyboard.press("End");
        const last = (await scene.locator("[data-lighting=thanks]").boundingBox())!;
        expect(last.y + last.height).toBeLessThanOrEqual(menuBox.y + menuBox.height);
        await page.keyboard.press("Space");
        expect(await active()).toBe("thanks");
        // Scaled by a transform, as a host may scale the viewer, the keys still bring each
        // item into the short menu's view.
        await page.evaluate(() => Object.assign(document.body.style, { transform: "scale(0.8)", transformOrigin: "0 0" }));
        await settle(scene);
        await open();
        const scaled = (await scene.locator("#building-menu").boundingBox())!;
        expect(scaled.y + scaled.height, "the scaled menu fits the scaled scene").toBeLessThanOrEqual(220 * 0.8);
        for (const key of ["End", "Home", "End"]) {
          await page.keyboard.press(key);
          const item = (await scene.locator(`[data-lighting=${key === "End" ? "thanks" : "off"}]`).boundingBox())!;
          expect(item.y >= scaled.y - 0.5 && item.y + item.height <= scaled.y + scaled.height + 0.5, `${key} shows its item`).toBe(true);
        }
        await page.keyboard.press("Escape");
        await page.evaluate(() => { document.body.style.transform = ""; });
      }
      await page.close();
    }
  }, { timeout: 60_000 });

  test("Crain's building menu offers no celebratory lighting", async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    await watch(page);
    await page.goto(`${origin}/skyline-3d.html`);
    await page.waitForFunction(() => window.__buildingStudy?.ready);
    expect(await page.evaluate(() => window.__buildingStudy!.illuminations.map(({ building }) => building))).toEqual(["building-blue-cross-blue-shield"]);
    await page.evaluate(() => {
      const canvas = document.querySelector("#building")!, box = canvas.getBoundingClientRect();
      const [u, v] = window.__buildingStudy!.projectPoint("building-crain-communications", [0, 145, 0]);
      canvas.dispatchEvent(new MouseEvent("contextmenu", { clientX: box.x + u * box.width, clientY: box.y + v * box.height, bubbles: true, cancelable: true }));
    });
    expect(await page.locator("#building-menu-title").textContent()).toBe("Crain Communications Building");
    expect(await page.locator("#building-menu").isVisible()).toBe(true);
    expect(await page.locator("#building-lighting-menu").isHidden()).toBe(true);
    expect(await page.locator("[data-lighting]").count()).toBe(0);
    await page.close();
  }, { timeout: 60_000 });

  test("celebration buttons fit on touch screens and survive original-artwork comparison", async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: "reduce" });
    await watch(page);
    await page.goto(`${origin}/?controls=closed`);
    const scene = await openScene(page);
    await scene.locator("#menu-toggle").tap();
    for (const button of await scene.locator("[data-celebration]").all()) {
      const box = (await button.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(390);
      expect(box.height).toBeGreaterThanOrEqual(36);
    }
    await scene.locator("[data-celebration=bears]").tap();
    await scene.locator("#show-original").tap();
    await page.locator("#return-skyline-3d").tap();
    expect(await scene.evaluate(() => window.__buildingStudy!.illuminations.find(({ building }) => building === "building-blue-cross-blue-shield")!.active)).toBe("bears");
    await scene.locator("[data-celebration=bears]").tap();
    expect(await scene.evaluate(() => window.__buildingStudy!.illuminations.find(({ building }) => building === "building-blue-cross-blue-shield")!.litWindows)).toBe(0);
    // The time slider adds two rows to the desktop display group. Folding it
    // returns that space to the canvas, including with the original-artwork shortcut.
    await page.setViewportSize({ width: 1440, height: 900 });
    await settle(scene);
    expect((await scene.locator(".control-bar").boundingBox())!.height).toBe(100);
    const expandedCanvas = (await scene.locator("#building").boundingBox())!.height;
    await scene.locator("#menu-toggle").tap();
    await settle(scene);
    expect((await scene.locator(".control-bar").boundingBox())!.height).toBe(39);
    expect((await scene.locator("#building").boundingBox())!.height).toBe(expandedCanvas + 61);
    await page.close();
  }, { timeout: 60_000 });

  test("keeps light controls readable and keyboard-operable independently of scene colour", async () => {
    for (const route of ["index.html", "skyline-3d.html"]) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
      await watch(page);
      // Explicit light controls over the original grayscale night scene.
      await page.goto(`${origin}/${route}?theme=light&controls=open`);
      await page.waitForFunction(() => window.__buildingStudy?.ready);
      const bar = page.locator(".control-bar");
      const palette = () => bar.evaluate((node) => [getComputedStyle(node).backgroundColor, getComputedStyle(node).colorScheme]);
      expect(await palette()).toEqual(["rgb(245, 245, 245)", "light"]);
      const button = page.locator("#colour");
      await button.focus();
      expect(await button.evaluate((node) => getComputedStyle(node).outlineColor)).toBe("rgb(17, 17, 17)");
      await button.press("Enter");
      expect(await button.getAttribute("aria-pressed")).toBe("true");
      expect(await page.locator("#time-of-day").evaluate((node) => getComputedStyle(node).colorScheme)).toBe("light");
      // All enabled opaque buttons, including the selected one, keep readable text.
      const contrast = await bar.locator("button:enabled:not(.menu-toggle)").evaluateAll((buttons) => {
        const luminance = (colour: string) => {
          const grey = Number(colour.match(/\d+/)![0]) / 255;
          return grey <= 0.04045 ? grey / 12.92 : ((grey + 0.055) / 1.055) ** 2.4;
        };
        return buttons.map((node) => {
          const style = getComputedStyle(node), a = luminance(style.color), b = luminance(style.backgroundColor);
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        });
      });
      expect(Math.min(...contrast)).toBeGreaterThanOrEqual(4.5);
      await button.press("Enter");
      expect(await button.getAttribute("aria-pressed")).toBe("false");
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator("#menu-toggle").click();
      expect(await palette()).toEqual(["rgb(245, 245, 245)", "light"]);
      await page.locator("#menu-toggle").press("Enter");
      expect(await page.locator("#camera-views").isVisible()).toBe(true);
      expect(await palette()).toEqual(["rgb(245, 245, 245)", "light"]);
      await page.close();
    }
  }, { timeout: 60_000 });

  test("scrubs Chicago sunlight, sky and reflections without moving the camera, and restores presets", async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce", timezoneId: "Asia/Tokyo" });
    await watch(page);
    await page.clock.setFixedTime(new Date("2026-10-15T17:00:00Z"));
    const shaderErrors: string[] = [];
    page.on("console", (message) => { if (message.type() === "error") shaderErrors.push(message.text()); });
    for (const route of ["index.html", "skyline-3d.html"]) {
      await page.goto(`${origin}/${route}?colour=1&controls=open`);
      await openScene(page);
      const slider = page.getByRole("slider", { name: "Chicago time" });
      expect(await page.locator("#time-date").textContent()).toBe("Oct 15, 2026");
      const canvas = page.locator("#building");
      const snapshot = () => canvas.screenshot({ style: ".scene-notes { visibility: hidden !important; }" });
      const preset = await snapshot();
      const originalCamera = await page.evaluate(() => window.__buildingStudy!.cameraPosition);
      const skies: number[][] = [];
      for (const minutes of [480, 720, 1020, 1100, 0]) {
        await slider.fill(String(minutes));
        await settle(page);
        const { direction, intensity, bounds, camera } = await page.evaluate(() => ({ direction: window.__buildingStudy!.sunDirection,
          intensity: window.__buildingStudy!.sunIntensity, bounds: window.__buildingStudy!.shadowBounds, camera: window.__buildingStudy!.cameraPosition }));
        expect(camera).toEqual(originalCamera);
        if (minutes === 480) expect(direction[0]!).toBeGreaterThan(0);
        if (minutes === 1020) expect(direction[0]!).toBeLessThan(0);
        if (minutes === 0) expect(intensity).toBe(0);
        if (intensity > 0) {
          expect(bounds.min.every((value) => value >= -1), `casters inside shadow camera at ${minutes}`).toBe(true);
          expect(bounds.max.every((value) => value <= 1), `receivers inside shadow camera at ${minutes}`).toBe(true);
        }
        skies.push(await pixelAt(page, await snapshot(), 0.5, 0.1));
      }
      expect(new Set(skies.map((pixel) => pixel.join(","))).size).toBe(5);
      expect(await slider.getAttribute("aria-valuetext")).toContain("12:00 AM CDT, Oct 15, 2026, Chicago");
      await slider.focus();
      await page.keyboard.press("End");
      expect(await slider.inputValue()).toBe("1439");
      expect(await page.locator("#time-value").textContent()).toBe("11:59 PM CDT");
      await page.keyboard.press("Home");
      await page.keyboard.press("ArrowRight");
      expect(await slider.inputValue()).toBe("1");
      expect(await page.evaluate(() => window.__buildingStudy!.cameraPosition)).toEqual(originalCamera);
      await slider.fill("1080");
      await page.locator(".control-bar #colour").click();
      await settle(page);
      expect(await chroma(page), "greyscale preview keeps the chosen time").toBe(0);
      expect(await page.locator("#time-value").textContent()).toBe("6:00 PM CDT");
      await page.locator(".control-bar #colour").click();
      await page.locator('[data-celebration="cubs"]').click();
      expect(await page.evaluate(() => window.__buildingStudy!.illuminations.some((light) => light.active === "cubs"))).toBe(true);
      await page.locator('[data-celebration="cubs"]').click();
      await page.locator("#reset-light").click();
      expect(await slider.evaluate((element) => (element.getRootNode() as Document | ShadowRoot).activeElement === element), "reset keeps keyboard focus in the controls").toBe(true);
      await settle(page);
      await expectSamePicture(page, await snapshot(), preset, "reset restores the exact sunny preset, including reflections and shadows");
      expect(await page.locator("#time-value").textContent()).toBe("sunny day");
      await page.locator(".control-bar #colour").click();
      await settle(page);
      const grey = await snapshot();
      await slider.fill("720");
      expect(await page.locator(".control-bar #colour").getAttribute("aria-pressed"), "first scrub enables colour").toBe("true");
      await page.locator(".control-bar #colour").click();
      await page.locator("#reset-light").click();
      expect(await slider.evaluate((element) => (element.getRootNode() as Document | ShadowRoot).activeElement === element), "reset keeps keyboard focus in the controls").toBe(true);
      await settle(page);
      await expectSamePicture(page, await snapshot(), grey, "reset restores the exact original night");
      await slider.fill("720");
      const box = (await canvas.boundingBox())!;
      const record = geographicBuildings.find(({ id }) => id === "layer3")!;
      const { center } = footprintMetrics(record.footprint.coordinates);
      const [u, v] = await page.evaluate((point) => window.__buildingStudy!.projectPoint("layer3", point), [center[0], record.height / 2, -center[1]]);
      await page.mouse.click(box.x + u * box.width, box.y + v * box.height, { button: "right" });
      await page.evaluate(async () => {
        const { DataTexture } = await import(new URL("vendor/three-r186.js", location.href).href) as typeof THREE;
        const dispose = DataTexture.prototype.dispose;
        const counts = window as unknown as { disposedSkies: number };
        counts.disposedSkies = 0;
        DataTexture.prototype.dispose = function (this: THREE.DataTexture) {
          if (this.image.width === 1 && this.image.height === 256) counts.disposedSkies += 1;
          dispose.call(this);
        };
      });
      await page.locator("#building-detail-link").click();
      await page.waitForFunction(() => window.__detailStudy?.ready);
      await settle(page);
      const sceneSun = await page.evaluate(() => window.__buildingStudy!.sunDirection);
      (await page.evaluate(() => window.__detailStudy!.sunDirection)).forEach((value, axis) => near(value, sceneSun[axis]!, 1e-12));
      await slider.fill("1080");
      await settle(page);
      expect(await page.evaluate(() => window.__detailStudy!.sunIntensity)).toBe(await page.evaluate(() => window.__buildingStudy!.sunIntensity));
      const detailAt = async (minute: number) => {
        await slider.fill(String(minute));
        await settle(page);
        return page.locator(".detail-host #building").screenshot();
      };
      const detailEvening = await detailAt(1200), detailEarly = await detailAt(240);
      const detailChange = await nightChanges(page, detailEvening, detailEarly), detailQuiet = await litPixels(page, detailEarly);
      expect(detailQuiet, "the floating detail keeps some overnight rooms lit").toBeGreaterThan(30);
      expect(detailChange.brighter, "the floating detail follows the skyline's occupancy cycle").toBeGreaterThan(100);
      expect(detailChange.dimmer).toBeLessThan(detailChange.brighter * 0.05);
      await expectSamePicture(page, await detailAt(1200), detailEvening, "the detail restores the same rooms when scrubbing back");
      await slider.fill("1080");
      await settle(page);
      const detailColour = page.locator(".detail-host #colour");
      await detailColour.click();
      await settle(page);
      expect(await page.locator(".control-bar #colour").getAttribute("aria-pressed")).toBe("false");
      expect(await page.locator("#time-value").textContent()).toBe("6:00 PM CDT");
      expect(await chroma(page), "the detail's colour toggle keeps both previews at the chosen time").toBe(0);
      await detailColour.click();
      expect(await page.locator(".control-bar #colour").getAttribute("aria-pressed")).toBe("true");
      expect(await page.locator("#time-value").textContent()).toBe("6:00 PM CDT");
      await page.locator("#detail-close").click();
      expect(await page.evaluate(() => (window as unknown as { disposedSkies: number }).disposedSkies), "closing the detail releases both its day and time-preview textures").toBe(2);
      await slider.fill("720");
      await settle(page);
      expect(await page.evaluate(() => window.__buildingStudy!.sunIntensity), "the parent sky survives closing its detail").toBeGreaterThan(0);
      const rendered = await page.evaluate(() => window.__buildingStudy!.renderCount);
      await page.waitForTimeout(150);
      expect(await page.evaluate(() => window.__buildingStudy!.renderCount), "an idle time preview schedules no more renders").toBe(rendered);
      await slider.focus();
      await page.keyboard.press("Escape");
      expect(await slider.isVisible()).toBe(false);
      expect(await page.locator("#menu-toggle").getAttribute("aria-expanded")).toBe("false");
    }
    expect(shaderErrors).toEqual([]);
    await page.close();
  }, { timeout: 180_000 });

  test("renders warm, neutral and cool fixture emission against an unlit baseline", async () => {
    const page = await browser.newPage();
    await watch(page);
    await page.goto(`${origin}/skyline-3d.html`);
    await openScene(page);
    const result = await page.evaluate(async () => {
      const T = await import(new URL("vendor/three-r186.js", location.href).href) as typeof THREE;
      const { glassReflection } = await import(new URL("models/colour-reflections.js", location.href).href) as typeof import("../src/models/colour-reflections.js");
      const renderer = new T.WebGLRenderer({ preserveDrawingBuffer: true });
      renderer.setSize(300, 100);
      const scene = new T.Scene(), camera = new T.OrthographicCamera(-3, 3, 1, -1, 0.1, 10);
      camera.position.z = 2;
      const fixtures = [0, 0.5, 1].map((tint, index) => {
        const geometry = new T.BufferGeometry(), material = new T.MeshToonMaterial({ color: 0 });
        geometry.setAttribute("position", new T.Float32BufferAttribute([-0.9, -0.9, 0, 0.9, -0.9, 0, 0.9, 0.9, 0, -0.9, -0.9, 0, 0.9, 0.9, 0, -0.9, 0.9, 0], 3));
        geometry.computeVertexNormals();
        const mask = new Float32Array(geometry.getAttribute("position").count);
        const windows = Float32Array.from(Array.from(mask).flatMap(() => [0, 0.6, 1, tint]));
        const light = glassReflection(material, geometry, mask, windows);
        const mesh = new T.Mesh(geometry, material);
        mesh.position.x = (index - 1) * 2;
        scene.add(mesh);
        return { geometry, material, light };
      });
      const sample = (darkness: number, coloured: boolean) => {
        for (const { light } of fixtures) light.setNight({ darkness, activity: 1, outlineStrength: 0 }, coloured, false);
        renderer.render(scene, camera);
        const gl = renderer.getContext();
        return [50, 150, 250].map((x) => {
          const pixel = new Uint8Array(4);
          gl.readPixels(x, 50, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
          return Array.from(pixel.slice(0, 3));
        });
      };
      try { return { off: sample(0, true), on: sample(1, true), grey: sample(1, false) }; }
      finally {
        for (const { geometry, material } of fixtures) { geometry.dispose(); material.dispose(); }
        renderer.dispose(); renderer.forceContextLoss();
      }
    });
    expect(result.off).toEqual([[0, 0, 0], [0, 0, 0], [0, 0, 0]]);
    const [warm, neutral, cool] = result.on as [number[], number[], number[]];
    expect(warm[0]! - warm[2]!).toBeGreaterThan(60);
    expect(neutral[0]! - neutral[2]!).toBeGreaterThan(0);
    expect(neutral[0]! - neutral[2]!).toBeLessThan((warm[0]! - warm[2]!) / 2);
    expect(cool[2]! - cool[0]!).toBeGreaterThan(15);
    for (const [r, g, b] of result.grey) { expect(r).toBeGreaterThan(0); expect(r).toBe(g); expect(r).toBe(b); }
    await page.close();
  }, { timeout: 60_000 });

  test("stages warm night windows, quietens before dawn, and preserves celebrations and presets", async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    await watch(page);
    await page.clock.setFixedTime(new Date("2026-10-15T17:00:00Z"));
    const shaderErrors: string[] = [];
    page.on("console", (message) => { if (message.type() === "error") shaderErrors.push(message.text()); });
    for (const route of ["index.html", "skyline-3d.html"]) {
      await page.goto(`${origin}/${route}?colour=1&controls=open`);
      await openScene(page);
      const slider = page.locator("#time-of-day");
      const snapshot = () => page.locator("#building").screenshot({ style: ".scene-notes { visibility: hidden !important; }" });
      const preset = await snapshot();
      const at = async (minute: number) => { await slider.fill(String(minute)); await settle(page); return snapshot(); };
      const evening = await at(1200), early = await at(240);
      const tints = await lampTints(page, evening);
      expect(tints.warm, "warm rooms remain visible").toBeGreaterThan(100);
      if (route === "skyline-3d.html") expect(tints.neutral, "neutral fixtures differ from amber rooms").toBeGreaterThan(100);
      expect(tints.cool, "cool white rooms render above the dark sky and facades").toBeGreaterThan(20);
      const change = await nightChanges(page, evening, early), quiet = await litPixels(page, early);
      expect(quiet, "some windows and architectural lights remain overnight").toBeGreaterThan(100);
      expect(change.brighter, "rooms light up above unchanged stars and architectural lamps").toBeGreaterThan(1000);
      expect(change.dimmer, "increasing occupancy overwhelmingly brightens rooms").toBeLessThan(change.brighter * 0.05);
      await expectSamePicture(page, await at(1200), evening, "scrubbing back recreates the same rooms");
      await page.locator('[data-celebration="cubs"]').click();
      await settle(page);
      await expectChangedPicture(page, await snapshot(), evening, "a celebration replaces ordinary windows on its tower");
      await page.locator('[data-celebration="cubs"]').click();
      await settle(page);
      await expectSamePicture(page, await snapshot(), evening, "switching a celebration off restores its ordinary rooms");
      await page.locator(".control-bar #colour").click();
      await settle(page);
      expect(await chroma(page), "window emission also obeys greyscale").toBe(0);
      await page.locator(".control-bar #colour").click();
      await settle(page);
      await expectSamePicture(page, await snapshot(), evening, "colour off and on again restores the evening");
      await page.locator("#reset-light").click();
      await settle(page);
      await expectSamePicture(page, await snapshot(), preset, "reset restores the exact daytime facades and outlines");
    }
    expect(shaderErrors).toEqual([]);
    await page.close();
  }, { timeout: 180_000 });

  test("lets touch and mouse scrub time in compact viewports under reduced motion", async () => {
    for (const [width, height, touch] of [[390, 844, true], [844, 390, false]] as const) {
      const page = await browser.newPage({ viewport: { width, height }, hasTouch: touch, reducedMotion: "reduce" });
      await watch(page);
      await page.clock.setFixedTime(new Date("2026-10-15T17:00:00Z"));
      await page.goto(`${origin}/index.html?controls=open`);
      await openScene(page);
      const slider = page.locator("#time-of-day"), box = (await slider.boundingBox())!;
      expect(box.width).toBeGreaterThan(200);
      expect(box.x >= 0 && box.x + box.width <= width && box.y + box.height <= height).toBe(true);
      if (touch) await page.touchscreen.tap(box.x + box.width * 0.6, box.y + box.height / 2);
      else {
        await page.mouse.move(box.x + 8, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2, { steps: 6 });
        await page.mouse.up();
      }
      expect(Number(await slider.inputValue())).toBeGreaterThan(700);
      expect(Number(await slider.inputValue())).toBeLessThan(1000);
      expect(await slider.getAttribute("aria-valuetext")).toContain("PM CDT");
      expect(await page.locator("#reset-light").isEnabled()).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight)).toBe(false);
      await page.close();
    }
  }, { timeout: 90_000 });

  test("starts in colour by URL and keeps building details, links and toggles in sync", async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    await watch(page);
    const shaderErrors: string[] = [];
    page.on("console", (message) => { if (message.type() === "error") shaderErrors.push(message.text()); });
    for (const route of ["index.html", "skyline-3d.html"]) {
      await page.goto(`${origin}/${route}?colour=1&controls=open`);
      await openScene(page);
      const toggle = page.locator(".control-bar #colour");
      expect(await toggle.getAttribute("aria-pressed")).toBe("true");
      expect(await chroma(page)).toBeGreaterThan(40);
      // Exercise the glass shader in perspective and orthographic cameras, including wireframe.
      for (const view of ["quarter", "top", "skyline"]) {
        await page.locator(`[data-view="${view}"]`).click();
        await settle(page);
      }
      await page.locator("#wireframe").click();
      await settle(page);
      await page.locator("#wireframe").click();
      await settle(page);
      const canvas = page.locator("#building"), box = (await canvas.boundingBox())!;
      const record = geographicBuildings.find(({ id }) => id === "layer3")!;
      const { center } = footprintMetrics(record.footprint.coordinates);
      const [u, v] = await page.evaluate((point) => window.__buildingStudy!.projectPoint("layer3", point), [center[0], record.height / 2, -center[1]]);
      await page.mouse.click(box.x + u * box.width, box.y + v * box.height, { button: "right" });
      const link = page.locator("#building-detail-link");
      expect(await link.getAttribute("href")).toBe(`${origin}/building-detail.html?building=layer3&colour=1`);
      await link.click();
      await page.waitForFunction(() => window.__detailStudy?.ready);
      const detail = page.locator(".detail-host"), detailToggle = detail.locator("#colour");
      expect(await detailToggle.getAttribute("aria-pressed")).toBe("true");
      await detailToggle.click();
      expect(await toggle.getAttribute("aria-pressed")).toBe("false");
      await settle(page);
      const grey = await detail.locator("canvas").screenshot();
      await toggle.click();
      expect(await detailToggle.getAttribute("aria-pressed")).toBe("true");
      await settle(page);
      await expectChangedPicture(page, await detail.locator("canvas").screenshot(), grey, "colour reaches the floating detail");
      await toggle.click();
      await settle(page);
      await expectSamePicture(page, await detail.locator("canvas").screenshot(), grey, "detail returns to exactly the same greys");
      await page.locator("#detail-close").click();
    }
    await page.goto(`${origin}/building-detail.html?building=building-three-illinois-center&colour=1`);
    await openScene(page);
    expect(await page.locator("#colour").getAttribute("aria-pressed")).toBe("true");
    expect(await chroma(page)).toBeGreaterThan(40);
    await page.locator("#colour").click();
    await settle(page);
    expect(await chroma(page)).toBe(0);
    expect(shaderErrors).toEqual([]);
    await page.close();
  }, { timeout: 120_000 });

  test("floats a building's detail over the skyline from its context menu, without leaving the viewer", async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await watch(page);
    await page.goto(`${origin}/index.html?controls=closed`);
    const scene = await openScene(page);
    const visits = await page.evaluate(() => history.length);
    const canvas = (await scene.locator("#building").boundingBox())!;
    // A point on a building, halfway up its mapped centre, in the viewer's window.
    const on = async (id: string) => {
      const record = geographicBuildings.find((building) => building.id === id)!;
      const { center } = footprintMetrics(record.footprint.coordinates);
      const point = [center[0], record.height / 2, -center[1]];
      const [u, v] = await scene.evaluate(([id, point]) => window.__buildingStudy!.projectPoint(id, point), [id, point] as const);
      return { x: canvas.x + u * canvas.width, y: canvas.y + v * canvas.height };
    };
    const aon = await on("layer3");
    const menu = scene.locator("#building-menu");
    const focused = (frame: Page | Frame) => frame.evaluate(() => window.__focused);
    // What the viewer's root, or the page, shows on top at the middle of a box.
    const topmost = (frame: Page | Frame, { x, y, width, height }: { x: number; y: number; width: number; height: number }, inViewer = true) =>
      frame.evaluate(([x, y, inViewer]) => (inViewer ? window.__viewerRoot! : document).elementFromPoint(x, y)?.id || (inViewer ? undefined : document.elementFromPoint(x, y)?.getAttribute("role")), [x + width / 2, y + height / 2, inViewer] as const);
    // The sky has no menu, and a right-drag across a building pans rather than opening one.
    await page.mouse.click(canvas.x + 60, canvas.y + 120, { button: "right" });
    expect(await menu.isHidden()).toBe(true);
    const eye = await scene.evaluate(() => window.__buildingStudy!.cameraPosition);
    await page.mouse.move(aon.x, aon.y);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(aon.x + 80, aon.y + 20, { steps: 6 });
    await page.mouse.up({ button: "right" });
    expect(await menu.isHidden()).toBe(true);
    expect(await scene.evaluate(() => window.__buildingStudy!.cameraPosition)).not.toEqual(eye);
    await scene.locator("#building").focus();
    await page.keyboard.press("Home");
    // A right-click on a building opens its menu at the pointer: its name over one item,
    // focused. Escape closes it and returns focus to the skyline.
    await page.mouse.click(aon.x, aon.y, { button: "right" });
    expect(await menu.isVisible()).toBe(true);
    expect(await scene.locator("#building-menu-title").textContent()).toBe("Aon Center");
    expect(await scene.locator('#building-menu [role="menuitem"]').allTextContents()).toEqual(["building detail"]);
    expect(await scene.locator("#building-lighting-menu").isHidden()).toBe(true);
    expect(await scene.locator('[role="menuitemradio"]').count()).toBe(0);
    expect(await scene.locator("#building-detail-link").getAttribute("href")).toBe(`${origin}/building-detail.html?building=layer3`);
    expect(await focused(scene)).toBe("building-detail-link");
    const box = (await menu.boundingBox())!;
    near(box.x, aon.x, 1);
    near(box.y, aon.y, 1);
    await page.keyboard.press("Escape");
    expect(await menu.isHidden()).toBe(true);
    expect(await focused(scene)).toBe("building");
    // Its item floats the building's detail over the skyline, below the viewer's controls,
    // and the panel takes focus. The viewer stays where it is, with no history of its own.
    // The detail renders in a shadow root of its own inside the panel, not in a frame.
    await page.mouse.click(aon.x, aon.y, { button: "right" });
    await scene.locator("#building-detail-link").click();
    expect(await menu.isHidden()).toBe(true);
    const panel = scene.locator("#building-detail");
    expect(await panel.isVisible()).toBe(true);
    const detail = page.locator(".detail-host");
    const openDetail = (name: string) => page.waitForFunction((name) => window.__detailStudy?.ready && window.__detailStudy.modelName === name, name, { timeout: 60_000 });
    await openDetail("Aon Center");
    expect(page.url()).toBe(`${origin}/index.html?controls=closed`);
    expect(await page.evaluate(() => history.length)).toBe(visits);
    expect(await page.locator("iframe").count()).toBe(0);
    expect(await detail.locator("h1").textContent()).toBe("Aon Center");
    expect(await panel.getAttribute("aria-label")).toBe("Aon Center — Building Detail");
    expect(await panel.getAttribute("aria-modal"), "the panel leaves the rest of the page usable").toBeNull();
    expect(await detail.locator(".study-links").isHidden(), "the panel closes the detail, not the page's own links").toBe(true);
    expect(await focused(scene)).toBe("detail-close");
    const floating = (await panel.boundingBox())!, controls = (await page.locator(".controls").boundingBox())!;
    const bar = (await scene.locator(".control-bar").boundingBox())!;
    expect(floating.x >= 0 && floating.x + floating.width <= 1440 && floating.y + floating.height <= bar.y, "the panel stays in the scene above the control bar").toBe(true);
    expect(controls.y + controls.height, "the panel stands below the viewer's controls").toBeLessThanOrEqual(floating.y);
    const close = (await scene.locator("#detail-close").boundingBox())!;
    expect([await topmost(page, close, false), await topmost(page, close)], "nothing covers the close button").toEqual(["region", "detail-close"]);
    await page.screenshot({ path: "/tmp/skyline-3d-detail.png" });
    // The skyline stays live beside it, and another building's menu, drawn over the panel
    // where it reaches it, replaces the detail.
    const park = await on("building-340-on-the-park");
    expect(park.x, "340 on the Park shows beside the panel").toBeGreaterThan(floating.x + floating.width);
    await page.mouse.click(park.x, park.y, { button: "right" });
    expect(await scene.locator("#building-menu-title").textContent()).toBe("340 on the Park");
    const item = (await scene.locator("#building-detail-link").boundingBox())!;
    expect(item.x, "the menu reaches over the panel").toBeLessThan(floating.x + floating.width);
    expect(await topmost(scene, item)).toBe("building-detail-link");
    await scene.locator("#building-detail-link").click();
    await openDetail("340 on the Park");
    expect(await panel.locator(".detail-host").count()).toBe(1);
    expect(await detail.locator("h1").textContent()).toBe("340 on the Park");
    // Escape inside the detail closes the panel, releasing the detail, and focus returns to
    // the skyline.
    await detail.locator("#building").focus();
    await page.keyboard.press("Escape");
    await scene.waitForFunction(() => !window.__viewerRoot!.querySelector(".detail-host"));
    expect(await panel.isHidden()).toBe(true);
    expect(await focused(scene)).toBe("building");
    // So does Escape once focus has left the panel for the skyline, but an open menu or
    // toolbar takes it first; and so does the close button.
    const reopen = async () => {
      await page.mouse.click(aon.x, aon.y, { button: "right" });
      await scene.locator("#building-detail-link").click();
      await openDetail("Aon Center");
    };
    await reopen();
    await page.mouse.click(park.x, park.y, { button: "right" });
    expect(await menu.isVisible()).toBe(true);
    await page.keyboard.press("Escape");
    expect([await menu.isHidden(), await panel.isVisible(), await focused(scene)]).toEqual([true, true, "building"]);
    const star = scene.locator("#menu-toggle");
    await star.click();
    // The scene's own toggle; the detail has one too, in its shadow root.
    await scene.locator(".control-bar #wireframe").focus();
    await page.keyboard.press("Escape");
    expect([await star.getAttribute("aria-expanded"), await panel.isVisible(), await focused(scene)]).toEqual(["false", true, "menu-toggle"]);
    await page.keyboard.press("Escape");
    await scene.waitForFunction(() => !window.__viewerRoot!.querySelector(".detail-host"));
    expect(await panel.isHidden()).toBe(true);
    await reopen();
    await scene.locator("#detail-close").click();
    await scene.waitForFunction(() => !window.__viewerRoot!.querySelector(".detail-host"));
    expect(await panel.isHidden()).toBe(true);
    expect(await page.evaluate(() => history.length)).toBe(visits);
    await page.close();
  }, { timeout: 180_000 });

  test("floats the detail on its own page too, at once under reduced motion, whatever order the menu event comes in", async () => {
    // Reduced motion stops the orbit controls, which otherwise take the right button; the
    // menu opens all the same. With nothing over the page's top, the panel is centred in the
    // scene above the control bar.
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    await watch(page);
    await page.goto(`${origin}/skyline-3d.html`);
    await page.waitForFunction(() => window.__buildingStudy?.ready);
    const [u, v] = await page.evaluate(() => window.__buildingStudy!.projectPoint("layer3", [284, 200, -50]));
    const canvas = (await page.locator("#building").boundingBox())!;
    const x = canvas.x + u * canvas.width, y = canvas.y + v * canvas.height;
    // Browsers send the menu event in different orders, and the pointer the other tests drive
    // sends it one way only. Where it comes with the press, as on macOS, the menu opens on the
    // release; where it follows the release, as on Windows and Linux, at once; after a drag,
    // neither; and for a long press on a touch screen, whose event comes while the finger is
    // still down, at once. Each step reports whether the menu shows after it, and whether the
    // browser's own menu was held back.
    type Step = [type: "pointerdown" | "pointermove" | "pointerup" | "contextmenu", dx?: number, touch?: boolean];
    const run = (steps: Step[]) => page.evaluate(([steps, x, y]) => steps.map(([type, dx = 0, touch = false]) => {
      const canvas = document.querySelector("#building")!, at = { clientX: x + dx, clientY: y, bubbles: true, cancelable: true };
      const delivered = type === "contextmenu" ? canvas.dispatchEvent(new MouseEvent(type, at))
        : canvas.dispatchEvent(new PointerEvent(type, { ...at, pointerId: touch ? 2 : 1, pointerType: touch ? "touch" : "mouse", button: type === "pointermove" ? -1 : 2 }));
      return [!document.querySelector<HTMLElement>("#building-menu")!.hidden, type === "contextmenu" ? !delivered : null];
    }), [steps, x, y] as const);
    expect(await run([["pointerdown"], ["contextmenu"], ["pointerup"]]), "the event with the press").toEqual([[false, null], [false, true], [true, null]]);
    expect(await run([["pointerdown"], ["pointerup"], ["contextmenu"]]), "the event after the release").toEqual([[false, null], [false, null], [true, true]]);
    expect(await run([["pointerdown"], ["contextmenu"], ["pointermove", 40], ["pointerup", 40]]), "a drag after the event").toEqual([[false, null], [false, true], [false, null], [false, null]]);
    expect(await run([["pointerdown"], ["pointermove", 40], ["pointerup", 40], ["contextmenu"]]), "the event after a drag").toEqual([[false, null], [false, null], [false, null], [false, true]]);
    expect(await run([["pointerdown", 0, true], ["contextmenu"], ["pointerup", 0, true]]), "a long press").toEqual([[false, null], [true, true], [true, null]]);
    await page.keyboard.press("Escape");
    expect(await page.locator("#building-menu").isHidden()).toBe(true);
    await page.mouse.click(x, y, { button: "right" });
    expect(await page.locator("#building-menu-title").textContent()).toBe("Aon Center");
    await page.locator("#building-detail-link").click();
    const panel = page.locator("#building-detail");
    expect(await panel.evaluate((element) => element.getAnimations().length)).toBe(0);
    const box = (await panel.boundingBox())!, bar = (await page.locator(".control-bar").boundingBox())!;
    expect([box.width, box.height]).toEqual([1040, 760]);
    near(box.x, (1440 - box.width) / 2, 1);
    near(box.y, (bar.y - box.height) / 2, 1);
    await page.waitForFunction(() => window.__detailStudy?.ready, null, { timeout: 60_000 });
    expect(await panel.locator(".detail-host h1").textContent()).toBe("Aon Center");
    expect(page.url()).toBe(`${origin}/skyline-3d.html`);
    await page.close();
  }, { timeout: 180_000 });

  test("releases a building detail that fails part way through starting", async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    await watch(page);
    // The detail's study fails after its renderer exists: its first resize observation throws.
    // The page keeps the detail's canvas, to read its WebGL context afterwards.
    await page.addInitScript(() => {
      const observe = ResizeObserver.prototype.observe;
      ResizeObserver.prototype.observe = function (target, options) {
        const root = target.getRootNode();
        if (root instanceof ShadowRoot && root.host.classList.contains("detail-host") && target.id === "viewport") {
          (window as unknown as { failedCanvas: HTMLCanvasElement }).failedCanvas = root.querySelector<HTMLCanvasElement>("#building")!;
          throw new Error("The detail failed to start.");
        }
        return observe.call(this, target, options);
      };
    });
    const errors: string[] = [];
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.goto(`${origin}/skyline-3d.html`);
    await page.waitForFunction(() => window.__buildingStudy?.ready);
    await page.evaluate(() => {
      const canvas = document.querySelector("#building")!, box = canvas.getBoundingClientRect();
      const [u, v] = window.__buildingStudy!.projectPoint("layer3", [284, 200, -50]);
      canvas.dispatchEvent(new MouseEvent("contextmenu", { clientX: box.x + u * box.width, clientY: box.y + v * box.height, bubbles: true, cancelable: true }));
    });
    await page.locator("#building-detail-link").click();
    const panel = page.locator("#building-detail");
    await panel.locator(".loading").filter({ hasText: "could not load" }).waitFor();
    // The panel still says so, and the failed detail let go of its graphics context.
    expect(await panel.isVisible()).toBe(true);
    expect(await page.evaluate(() => {
      const canvas = (window as unknown as { failedCanvas: HTMLCanvasElement }).failedCanvas;
      return { lost: canvas.getContext("webgl2")?.isContextLost(), study: Boolean(canvas.__buildingStudy) };
    })).toEqual({ lost: true, study: false });
    expect(errors.some((error) => error.includes("The detail failed to start."))).toBe(true);
    await page.locator("#detail-close").click();
    expect(await panel.isHidden()).toBe(true);
    await page.close();
  }, { timeout: 60_000 });

  test("boots the viewer and a building's detail without three.js deprecation warnings", async () => {
    // r186 removed PCFSoftShadowMap, and three said so on every host's console while the
    // scene still asked for it. Nothing the viewer or a detail starts with may be deprecated
    // or removed: not in the viewer as a host mounts it, with a detail floated from a
    // building's menu, nor on the detail's own page.
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    await watch(page);
    const logged: string[] = [];
    page.on("console", (message) => { if (isThreeDeprecation(message.text())) logged.push(`${page.url()}: ${message.text()}`); });
    await page.goto(`${origin}/index.html`);
    await openScene(page);
    await page.evaluate(() => {
      const canvas = window.__viewerRoot!.querySelector("#building")!, box = canvas.getBoundingClientRect();
      const [u, v] = window.__buildingStudy!.projectPoint("layer3", [284, 200, -50]);
      canvas.dispatchEvent(new MouseEvent("contextmenu", { clientX: box.x + u * box.width, clientY: box.y + v * box.height, bubbles: true, cancelable: true }));
    });
    await page.locator("#building-detail-link").click();
    await page.waitForFunction(() => window.__detailStudy?.ready, null, { timeout: 60_000 });
    await settle(page);
    await page.goto(`${origin}/building-detail.html?building=layer3`);
    await page.waitForFunction(() => window.__buildingStudy?.ready, null, { timeout: 60_000 });
    await settle(page);
    expect(logged).toEqual([]);
    await page.close();
  }, { timeout: 120_000 });

  test("loads only local assets without page errors or three.js deprecation warnings", expectClean);
});
