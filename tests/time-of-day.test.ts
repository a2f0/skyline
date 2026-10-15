import { describe, expect, test } from "bun:test";
import * as THREE from "../src/vendor/three-r186.js";
import { chicagoDay, chicagoTime, solarPosition } from "../src/solar-time.js";
import { createTimeLighting } from "../src/time-of-day.js";
import { geographicOrigin } from "../src/models/skyline-geography.js";
import { glassReflection } from "../src/models/colour-reflections.js";
import { daylightColours } from "../src/models/colour-palette.js";

const [longitude, latitude] = geographicOrigin;
const sun = (instant: string) => solarPosition(new Date(instant), latitude, longitude);

describe("Chicago time and sunlight", () => {
  test("uses Chicago's date, and reaches both repeated hours on DST days", () => {
    const winter = chicagoDay(new Date("2026-01-01T03:00:00Z"));
    expect(winter.label).toBe("Dec 31, 2025");
    expect(new Date(winter.start).toISOString()).toBe("2025-12-31T06:00:00.000Z");
    expect(winter.minutes).toBe(1440);
    const spring = chicagoDay(new Date("2026-03-08T17:00:00Z"));
    expect(spring.minutes).toBe(1380);
    expect(chicagoTime(new Date(spring.start + 120 * 60_000))).toBe("3:00 AM CDT");
    const autumn = chicagoDay(new Date("2026-11-01T18:00:00Z"));
    expect(autumn.minutes).toBe(1500);
    expect(chicagoTime(new Date(autumn.start + 60 * 60_000))).toBe("1:00 AM CDT");
    expect(chicagoTime(new Date(autumn.start + 120 * 60_000))).toBe("1:00 AM CST");
    expect(chicagoTime(new Date(autumn.start + 1499 * 60_000))).toBe("11:59 PM CST");
  });

  test("follows the seasonal solar-noon heights and east/up/south axes", () => {
    // At the solstices, noon height is 90 - latitude ± Earth's ~23.44° tilt.
    const summer = sun("2026-06-21T17:52:00Z"), winter = sun("2026-12-21T17:49:00Z");
    expect(Math.abs(summer.elevation - (90 - latitude + 23.44))).toBeLessThan(0.4);
    expect(Math.abs(winter.elevation - (90 - latitude - 23.44))).toBeLessThan(0.4);
    for (const position of [summer, winter]) {
      expect(Math.abs(position.direction[0])).toBeLessThan(0.02);
      expect(position.direction[1]).toBeGreaterThan(0);
      expect(position.direction[2]).toBeGreaterThan(0);
      expect(Math.hypot(...position.direction)).toBeCloseTo(1, 10);
    }
    expect(sun("2026-10-15T13:00:00Z").direction[0]).toBeGreaterThan(0);
    expect(sun("2026-10-15T22:00:00Z").direction[0]).toBeLessThan(0);
    expect(sun("2026-10-15T05:00:00Z").elevation).toBeLessThan(-18);
  });

  test("updates one sky texture, reveals stars at night, and keeps greyscale neutral", () => {
    const light = createTimeLighting(latitude, longitude, true);
    const noon = light.update(new Date("2026-06-21T17:52:00Z"), true);
    expect(noon.reflections.sky).toBe(daylightColours.sky);
    expect(noon.sun[1]).toBeGreaterThan(3);
    const texture = light.sky, pixels = texture.image.data!, version = texture.version;
    const night = light.update(new Date("2026-06-21T05:00:00Z"), true);
    expect(night.sky).toBe(texture);
    expect(texture.image.data).toBe(pixels);
    expect(texture.version).toBeGreaterThan(version);
    expect(night.sun[1]).toBe(0);
    expect([...pixels].every((channel) => channel === 0)).toBe(true);
    const twilight = light.update(new Date("2026-10-15T23:20:00Z"), false);
    expect(pixels[3]).toBeGreaterThan(0);
    expect(pixels[3]).toBeLessThan(255);
    for (let i = 0; i < pixels.length; i += 4) expect([pixels[i], pixels[i + 1], pixels[i + 2]]).toEqual([pixels[i], pixels[i], pixels[i]]);
    for (const hex of [twilight.sun[0], twilight.ambient[0], twilight.fill[0], ...Object.values(twilight.reflections)]) {
      expect((hex >> 16) & 255).toBe((hex >> 8) & 255);
      expect(hex & 255).toBe((hex >> 8) & 255);
    }
    let disposed = false;
    texture.addEventListener("dispose", () => { disposed = true; });
    light.dispose();
    expect(disposed).toBe(true);
    const standalone = createTimeLighting(latitude, longitude, false);
    standalone.update(new Date("2026-06-21T05:00:00Z"), true);
    expect(standalone.sky.image.data![3]).toBe(255);
    standalone.dispose();
  });

  test("changes compiled reflection uniforms without recompiling the glass", () => {
    const material = new THREE.MeshToonMaterial(), geometry = new THREE.BufferGeometry();
    const reflection = glassReflection(material, geometry, new Float32Array([1]));
    reflection(true);
    const shader = { vertexShader: "#include <common>\n#include <begin_vertex>", fragmentShader: "#include <common>\n#include <opaque_fragment>", uniforms: {} };
    material.onBeforeCompile(shader as Parameters<typeof material.onBeforeCompile>[0], {} as THREE.WebGLRenderer);
    const uniforms = shader.uniforms as Record<string, { value: THREE.Color }>;
    const version = material.version, key = material.customProgramCacheKey();
    reflection.setSky({ sky: 0x111111, horizon: 0x222222, ground: 0x333333 });
    expect(uniforms["skylineSky"]!.value.getHex()).toBe(0x111111);
    expect(uniforms["skylineHorizon"]!.value.getHex()).toBe(0x222222);
    expect(material.version).toBe(version);
    expect(material.customProgramCacheKey()).toBe(key);
    material.dispose(); geometry.dispose();
  });
});
