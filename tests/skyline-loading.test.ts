import { describe, expect, test } from "bun:test";
import * as THREE from "../src/vendor/three-r186.js";
import { skylineTrace } from "../scripts/skyline-loading.js";

function box(width: number, height: number, x = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, 2));
  mesh.position.set(x, height / 2, z);
  return mesh;
}

function points(svg: string): [number, number][] {
  return [.../ d="([^"]+)"/.exec(svg)![1]!.matchAll(/[ML]([\d.]+) ([\d.]+)/g)]
    .map((match) => [Number(match[1]), Number(match[2])]);
}

describe("the loading skyline's flat elevation", () => {
  test("depth cannot change size or add perspective", () => {
    expect(skylineTrace([box(20, 50, 0, -500)], 0)).toBe(skylineTrace([box(20, 50, 0, 500)], 0));
  });
  test("an overlapping lower building adds no internal edges", () => {
    const tall = box(20, 50);
    expect(skylineTrace([tall, box(10, 20, 0, 100)], 0)).toBe(skylineTrace([tall], 0));
  });
  test("disconnected buildings return to the baseline between them", () => {
    const trace = points(skylineTrace([box(20, 50, -30), box(20, 30, 30)], 0));
    const baseline = trace[0]![1];
    expect(trace.some(([x, y], i) => {
      const next = trace[i + 1];
      return next !== undefined && x < 500 && y === baseline && next[0] > 500 && next[1] === baseline;
    })).toBe(true);
    expect(trace.every(([x], i) => !i || x >= trace[i - 1]![0])).toBe(true);
  });
  test("a spire thinner than a sample keeps its full height", () => {
    const trace = points(skylineTrace([box(100, 20), box(0.00001, 50, 1.1234)], 0));
    expect(Math.min(...trace.map(([, y]) => y))).toBe(16);
    const tip = trace.find(([, y]) => y === 16)!;
    expect(tip[0]).toBeGreaterThan(500);
    expect(tip[0]).toBeLessThan(512);
  });
});
