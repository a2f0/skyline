import { describe, expect, test } from "bun:test";
import * as THREE from "../src/vendor/three-r186.js";
import { chicagoDay, chicagoTime, solarPosition } from "../src/solar-time.js";
import { createTimeLighting } from "../src/time-of-day.js";
import { geographicOrigin } from "../src/models/skyline-geography.js";
import { glassReflection } from "../src/models/colour-reflections.js";
import { daylightColours } from "../src/models/colour-palette.js";
import { nightWindowMask, windowActivity } from "../src/models/night-windows.js";

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
    const twilight = light.update(new Date("2026-10-15T23:50:00Z"), false);
    expect(pixels[3]).toBeGreaterThan(100);
    expect(pixels[3]).toBeLessThan(220);
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

  test("lights evenings, quietens late nights, and fades into daylight across seasons", () => {
    expect(windowActivity(20)).toBeGreaterThan(windowActivity(0));
    expect(windowActivity(0)).toBeGreaterThan(windowActivity(4));
    expect(windowActivity(7)).toBeGreaterThan(windowActivity(4));
    expect(windowActivity(24)).toBeCloseTo(windowActivity(0), 10);
    expect(windowActivity(12 - 0.0001)).toBeCloseTo(windowActivity(12), 6);
    const light = createTimeLighting(latitude, longitude, false);
    const evening = light.update(new Date("2026-10-16T01:00:00Z"), true);
    const early = light.update(new Date("2026-10-15T09:00:00Z"), true);
    expect(evening.night.darkness).toBe(1);
    expect(early.night.darkness).toBe(1);
    expect(evening.night.activity).toBeGreaterThan(early.night.activity);
    expect(early.night.outlineStrength).toBeLessThan(0.1);
    const summer = light.update(new Date("2026-06-21T17:52:00Z"), true);
    const winter = light.update(new Date("2026-12-21T17:49:00Z"), true);
    expect(summer.night.darkness).toBe(0);
    expect(winter.night.darkness).toBe(0);
    expect(summer.night.outlineStrength).toBe(1);
    expect(summer.ambient[1]).toBeGreaterThan(early.ambient[1] * 4);
    light.dispose();
  });

  test("night lights share stable uniforms, stay grey when requested, and yield to celebrations", () => {
    const material = new THREE.MeshToonMaterial(), geometry = new THREE.BufferGeometry();
    const original = material.onBeforeCompile;
    const facade = glassReflection(material, geometry, new Float32Array([1]), new Float32Array([0.2, 0.5, 1, 0.4]));
    const night = { darkness: 1, activity: 0.7, outlineStrength: 0.05 };
    facade.setNight(night, true, false);
    const shader = { vertexShader: "#include <common>\n#include <begin_vertex>", fragmentShader: "#include <common>\n#include <opaque_fragment>", uniforms: {} };
    material.onBeforeCompile(shader as Parameters<typeof material.onBeforeCompile>[0], {} as THREE.WebGLRenderer);
    const uniforms = shader.uniforms as Record<string, { value: number | THREE.Color }>;
    const version = material.version, key = material.customProgramCacheKey();
    facade.setNight({ ...night, activity: 0.24 }, false, false);
    expect(uniforms["skylineActivity"]!.value).toBe(0.24);
    for (const name of ["skylineWindowWarm", "skylineWindowWhite", "skylineWindowCool"]) {
      const tint = uniforms[name]!.value as THREE.Color;
      expect(tint.r).toBe(tint.g);
      expect(tint.r).toBe(tint.b);
    }
    facade.setNight(night, true, true);
    expect(uniforms["skylineDarkness"]!.value, "architectural lighting stays on during a celebration").toBe(1);
    expect(uniforms["skylineWindowsSuppressed"]!.value).toBe(1);
    facade.setNight(night, true, false);
    expect(uniforms["skylineDarkness"]!.value).toBe(1);
    expect(uniforms["skylineWindowsSuppressed"]!.value).toBe(0);
    expect(material.version).toBe(version);
    expect(material.customProgramCacheKey()).toBe(key);
    facade.setNight(null, false, false);
    expect(material.onBeforeCompile).toBe(original);
    material.dispose(); geometry.dispose();
  });

  test("gives buildings coherent fixture mixes independent of room brightness and occupancy", () => {
    const positions: number[] = [];
    for (let floor = 0; floor < 20; floor += 1) for (let bay = 0; bay < 12; bay += 1) {
      for (const [x, y] of [[0, 0], [2, 0], [2, 3], [0, 0], [2, 3], [0, 3]]) {
        positions.push(bay * 7 + x!, floor * 3.4 + y!, 0);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    const means: number[] = [];
    for (const id of ["layer3", "building-kemper", "building-blue-cross-blue-shield", "building-crain-communications", "building-swissotel", "building-river-plaza"]) {
      const mask = nightWindowMask(geometry, id, () => "lit window");
      const tints = Array.from({ length: 240 }, (_, pane) => mask[pane * 24 + 3]!);
      const mean = tints.reduce((sum, tint) => sum + tint, 0) / tints.length;
      means.push(mean);
      expect(Math.min(...tints)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...tints)).toBeLessThanOrEqual(1);
      expect(Math.max(...tints) - Math.min(...tints)).toBeGreaterThan(0.15);
      // Rooms on one tenant floor share more of their fixture mix than the
      // whole building does; neither schedule nor brightness determines tint.
      for (let floor = 0; floor < 20; floor += 1) {
        const row = tints.slice(floor * 12, (floor + 1) * 12);
        expect(Math.max(...row) - Math.min(...row)).toBeLessThan(0.151);
      }
      for (const component of [0, 1]) {
        const values = tints.map((_, pane) => mask[pane * 24 + component]!);
        const average = values.reduce((sum, value) => sum + value, 0) / values.length;
        const covariance = values.reduce((sum, value, i) => sum + (value - average) * (tints[i]! - mean), 0);
        const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) * tints.reduce((sum, tint) => sum + (tint - mean) ** 2, 0);
        expect(Math.abs(covariance / Math.sqrt(variance))).toBeLessThan(0.25);
      }
      const lamps = nightWindowMask(geometry, id, () => "crown lights");
      expect(new Set(Array.from({ length: 240 }, (_, pane) => lamps[pane * 24 + 3])).size, "an architectural lamp assembly uses one fixture tint").toBe(1);
    }
    expect(Math.max(...means) - Math.min(...means), "buildings must not converge on the same mix").toBeGreaterThan(0.4);
    geometry.dispose();
  });

  test("keeps both triangles of a pane together after odd triangles, and separates diagonal bays", () => {
    const pane = [0, 0, 0, 2, 0, -2, 2, 3, -2, 0, 0, 0, 2, 3, -2, 0, 3, 0];
    const triangle = [0, 5, 0, 1, 6, 0, 2, 5, 0];
    const geometry = (positions: number[]) => {
      const result = new THREE.BufferGeometry();
      result.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      result.setAttribute("normal", new THREE.Float32BufferAttribute(Array.from({ length: positions.length }, (_, index) => index % 3 === 1 ? 0 : Math.SQRT1_2), 3));
      return result;
    };
    const plain = geometry(pane), prefixed = geometry([...triangle, ...pane]);
    const ordinary = nightWindowMask(plain, "fixture", () => "lit window");
    const shifted = nightWindowMask(prefixed, "fixture", (vertex) => vertex < 3 ? "concrete" : "lit window");
    expect([...shifted.slice(0, 12)]).toEqual(Array(12).fill(0));
    expect([...shifted.slice(12)]).toEqual([...ordinary]);
    for (let vertex = 1; vertex < 6; vertex += 1) expect(ordinary.slice(vertex * 4, vertex * 4 + 4)).toEqual(ordinary.slice(0, 4));
    const diagonal = geometry(pane.map((coordinate, index) => coordinate + (index % 3 === 0 ? 14 : index % 3 === 2 ? -14 : 0)));
    expect(nightWindowMask(diagonal, "fixture", () => "lit window")).not.toEqual(ordinary);
    expect(nightWindowMask(plain, "another building", () => "lit window")).not.toEqual(ordinary);
    plain.dispose(); prefixed.dispose(); diagonal.dispose();
  });

  test("spreads adjacent room schedules across east and south facades instead of lighting whole rows", () => {
    for (const axis of [0, 2]) for (const start of [-10, 0, 10]) {
      const positions: number[] = [];
      for (let bay = start; bay < start + 10; bay += 1) {
        for (const [across, height] of [[0, 0], [2, 0], [2, 3], [0, 0], [2, 3], [0, 3]]) {
          const point = [0, height!, 0];
          point[axis] = 7 * bay + 1 + across!;
          positions.push(...point);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geometry.computeVertexNormals();
      const mask = nightWindowMask(geometry, "building-blue-cross-blue-shield", () => "lit window");
      const ranks = Array.from({ length: 10 }, (_, bay) => mask[bay * 6 * 4]!);
      expect(Math.max(...ranks) - Math.min(...ranks), `ten adjacent bays on axis ${axis} from ${start}`).toBeGreaterThan(0.4);
      expect(ranks.some((rank) => rank < 0.35)).toBe(true);
      expect(ranks.some((rank) => rank > 0.55)).toBe(true);
      expect(nightWindowMask(geometry, "building-blue-cross-blue-shield", () => "lit window")).toEqual(mask);
      geometry.dispose();
    }
  });
});
