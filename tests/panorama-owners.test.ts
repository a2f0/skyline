import { describe, expect, test } from "bun:test";
import { boxShare, drawingEye, fitPanorama, line, meet, owners, panoramaColumns, panoramaRows } from "../scripts/lib/panorama.js";

// The colour trial's panorama audits (FID-COL-005 and FID-COL-006) quote this fit and place their
// samples by its pixel owners; these keep a geography change from moving them unnoticed.
const fit = fitPanorama();
const [x0, x1] = panoramaColumns, map = owners(fit, x0, x1, panoramaRows);

describe("panorama fit", () => {
  test("matches the silhouettes, corners and roofs within a few pixels, near the drawing's eye", () => {
    expect(fit.rms).toBeLessThan(2);
    expect(fit.residuals.filter(({ value }) => Math.abs(value) >= 4)).toEqual([]);
    expect(fit.residuals.map(({ label }) => label)).toContain("building-peoples-gas corner at row 432");
    // The audits give the eye as 10 m east and 100 m south of the drawing's, a point of the fit's grid.
    expect(fit.eye[0] - drawingEye[0]).toBeCloseTo(10, 6);
    expect(fit.eye[1] - drawingEye[1]).toBeCloseTo(-100, 6);
  });

  test("gives every wall sample of those audits wholly to its building and face", () => {
    const boxes: [building: string, face: number, box: [number, number, number, number]][] = [
      ["building-200-south-michigan", 180, [1135, 416, 1163, 455]],
      ["building-200-south-michigan", 90, [1166, 416, 1190, 455]],
      ["building-peoples-gas", 180, [1192, 408, 1207, 455]],
      ["building-peoples-gas", 90, [1210, 410, 1253, 455]],
      ["building-lakeview", 90, [1256, 420, 1263, 460]],
      ["building-maclean-center", 90, [1268, 415, 1281, 460]],
      ["building-monroe", 90, [1285, 431, 1304, 462]],
      ["building-university-club", 180, [1306, 438, 1317, 462]],
      ["building-six-north-michigan", 180, [1406, 412, 1420, 460]],
      ["building-six-north-michigan", 90, [1422, 412, 1437, 460]],
      ["building-six-north-far-east", 180, [1440, 418, 1466, 460]],
      ["building-six-north-far-east", 90, [1468, 418, 1485, 460]],
      ["building-the-buckingham", 180, [2086, 380, 2108, 465]],
      ["building-the-buckingham", 90, [2114, 380, 2123, 465]],
      ["building-buckingham-east", 180, [2129, 418, 2141, 466]],
      ["building-swissotel", 180, [2070, 372, 2077, 465]],
      ["building-michigan-plaza-front-middle", 180, [1612, 421, 1629, 465]],
      ["building-hyatt-regency-west-tower", 180, [1885, 400, 1889, 434]],
    ];
    const short = boxes.filter(([building, face, box]) => boxShare(map, x0, building, face, box) < 1).map(([building, face]) => `${building} at ${face}°`);
    expect(short).toEqual([]);
  });

  test("meets a ring at its nearest face and fits a line exactly", () => {
    // A square 10 to 20 m east of the eye: a ray due east meets its west face at 10 m, facing west.
    const square: [number, number][] = [[10, -5], [20, -5], [20, 5], [10, 5]];
    const [distance, facing] = meet(square, [0, 0], 90)!;
    expect(distance).toBeCloseTo(10, 9);
    expect(facing).toBeCloseTo(270, 9);
    expect(meet(square, [0, 0], 270)).toBeNull();
    const [a, b] = line([[0, 1], [1, 3], [2, 5]]);
    expect(a).toBeCloseTo(1, 12);
    expect(b).toBeCloseTo(2, 12);
  });
});
