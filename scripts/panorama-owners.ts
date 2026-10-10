// Locates the mapped buildings in the colour trial's daytime panorama, Chicago.jpg in its
// 3840 × 551 px rendition (scripts/sample-colours.ts, the day study), through the fit in
// scripts/lib/panorama.ts. It prints the fit and its residuals, each listed building's visible
// faces, and, for a box, the share of its pixels one building owns on one face.
import { command } from "./lib/command.js";
import { boxShare, drawingEye, fitPanorama, owners, panoramaColumns, panoramaRows, records } from "./lib/panorama.js";

const usage = `Usage: bun scripts/panorama-owners.ts [building-id...] [--box building,face,x0,y0,x1,y1]...
  Prints the panorama fit and, for each building, its visible faces in the rendition: each face's
  bearing, pixel count and column span, and the building's highest row. Each --box reports the
  share of its pixels (x0, y0, x1, y1, half-open) the building owns on the face within 20°.`;

command(usage, { box: { type: "string", multiple: true } }, async ({ values, positionals }) => {
  const fit = fitPanorama();
  console.log(`Eye ${(fit.eye[0] - drawingEye[0]).toFixed(0)} m east and ${(fit.eye[1] - drawingEye[1]).toFixed(0)} m north of the drawing's fitted eye.`);
  console.log(`Column = ${fit.a.toFixed(1)} + ${fit.b.toFixed(3)} × bearing (degrees east of north); row = ${fit.c.toFixed(1)} + ${fit.d.toFixed(1)} × tan(elevation).`);
  console.log(`Residual RMS ${fit.rms.toFixed(2)} px over the silhouettes, corners and roofs.`);
  for (const { label, value } of fit.residuals) console.log(`  ${label}: ${value >= 0 ? "+" : ""}${value.toFixed(1)}`);
  const [x0, x1] = panoramaColumns, height = panoramaRows, { owner, facing } = owners(fit, x0, x1, height);
  for (const building of positionals) {
    if (!records.has(building)) throw new Error(`No building ${building}.`);
    const faces = new Map<number, { count: number; min: number; max: number }>();
    let topRow = Infinity;
    owner.forEach((row, y) => row.forEach((id, column) => {
      if (id !== building) return;
      topRow = Math.min(topRow, y);
      const face = (Math.round(facing[y]![column]! / 5) * 5) % 360, entry = faces.get(face) ?? { count: 0, min: Infinity, max: -Infinity };
      entry.count += 1; entry.min = Math.min(entry.min, column + x0); entry.max = Math.max(entry.max, column + x0);
      faces.set(face, entry);
    }));
    const listed = [...faces].sort((p, q) => q[1].count - p[1].count).map(([face, { count, min, max }]) => `${face}° ×${count} at x ${min}–${max}`);
    console.log(`\n${building}: ${listed.length ? `highest row ${topRow}; ${listed.join("; ")}` : "not visible"}`);
  }
  for (const spec of (values["box"] as string[] | undefined) ?? []) {
    const [building, face, ...edges] = spec.split(","), [bx0, by0, bx1, by1] = edges.map(Number) as [number, number, number, number];
    if (!records.has(building ?? "") || edges.length !== 4 || ![face, ...edges].every((value) => value !== undefined && value.trim() !== "" && Number.isFinite(Number(value)))) throw new Error(`Box "${spec}" is not building,face,x0,y0,x1,y1.`);
    if (bx0 < x0 || bx1 > x1 || by0 < 0 || by1 > height || bx1 <= bx0 || by1 <= by0) throw new Error(`Box "${spec}" leaves columns ${x0}–${x1} and rows 0–${height}.`);
    const share = boxShare({ owner, facing }, x0, building!, Number(face), [bx0, by0, bx1, by1]);
    console.log(`\nbox ${edges.join(", ")}: ${(share * 100).toFixed(0)}% ${building} at ${face}°`);
  }
});
