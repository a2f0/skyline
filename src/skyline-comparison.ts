import * as THREE from "./vendor/three-r186.js";
import { geographicBuildings } from "./models/skyline-geography-data.js";
import { footprintMetrics, geographicOrigin } from "./models/skyline-geography.js";
import type { BuildingModel } from "./models/building-kit.js";
import type { StudyLayout } from "./study-types.js";
import { createGeographicSkyline } from "./skyline-scene.js";
export { createGeographicSkyline, skylineAzimuth } from "./skyline-scene.js";

// The drawing has no geographic position. Register the two scenes at Crain's
// center without changing the original models, rotations, or skyline camera.
// The drawing shown under each layout's scene.
const drawings = {
  original: {
    src: "models/skyline-reference.svg",
    alt: "Original SVG geometry showing the Heritage at Millennium Park's bowed, finned crown and rooftop screen, Kemper's vertical ribs, Crain's diamond roof, the dark, gridded Michigan Plaza South tower, Trump International Hotel and Tower's stepped shaft and spire, One Prudential Plaza's punch-card slab under a tall antenna mast, Two Prudential Plaza's chevrons and spire, and Aon Center's granite piers",
  },
  geographic: {
    src: "models/skyline-panorama.svg",
    alt: "The whole drawn skyline, every building the drawing shows, from the Railway Exchange Building on the left to the towers around The Buckingham on the right",
  },
};

export function createSkylineComparison(models: BuildingModel[], anchor: THREE.Vector3) {
  const { ground, layout, comparisonViews: views, labels } = createGeographicSkyline([anchor.x, anchor.y, anchor.z]);
  const layouts: Record<string, StudyLayout> = { geographic: layout };

  const number = (n: number) => n.toFixed(1);
  const signed = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}`;
  const tbody = document.querySelector<HTMLElement>("#dimensions-body")!;
  for (const record of geographicBuildings) {
    // A mapped building the drawing does not model, such as 330 North Wabash, has no
    // original extents to compare.
    const model = models.find((entry) => entry.building.userData["buildingId"] === record.id);
    model?.building.updateMatrixWorld(true);
    const min = [Infinity, Infinity], max = [-Infinity, -Infinity];
    let highest = 0;
    model?.building.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const positions = mesh.geometry.getAttribute("position"), point = new THREE.Vector3();
      for (let i = 0; i < positions.count; i += 1) {
        point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
        highest = Math.max(highest, point.y);
        if (point.y > 0.2) continue;
        [point.x, point.z].forEach((n, axis) => { min[axis] = Math.min(min[axis]!, n); max[axis] = Math.max(max[axis]!, n); });
      }
    });
    const footprint = footprintMetrics(record.footprint.coordinates);
    const row = document.createElement("tr");
    const name = document.createElement("th");
    name.scope = "row";
    const link = document.createElement("a");
    link.href = `https://www.openstreetmap.org/way/${record.footprint.way}`;
    link.textContent = record.shortName;
    name.append(link);
    row.append(name);
    const values = [
      `${signed(footprint.center[0])}, ${signed(footprint.center[1])}`,
      model ? `${number(max[0]! - min[0]!)} × ${number(max[1]! - min[1]!)}` : "not modeled",
      `${number(footprint.size[0])} × ${number(footprint.size[1])}`,
      model ? `${number(highest)} → ${number(record.tipHeight)} (${signed(record.tipHeight - highest)})` : `— → ${number(record.tipHeight)}`,
    ];
    for (const value of values) { const cell = document.createElement("td"); cell.textContent = value; row.append(cell); }
    const source = document.createElement("td");
    const height = document.createElement("a");
    height.href = record.heightSource;
    height.textContent = record.heightFromDrawing ? `${record.height} m, measured on the drawing` : `${record.height} m architectural${record.heightSource.startsWith("https://www.openstreetmap.org/way/") ? " (OSM)" : ""}`;
    source.append(height, document.createElement("br"), record.note);
    row.append(source);
    tbody.append(row);
  }
  document.querySelector<HTMLElement>("#coordinate-origin")!.textContent = `${geographicOrigin[1].toFixed(7)}° N, ${Math.abs(geographicOrigin[0]).toFixed(7)}° W`;

  const streetButton = document.querySelector<HTMLButtonElement>("#streets")!;
  function onLayoutChange(name: string) {
    const geographic = name === "geographic";
    // Only the geographic layout maps streets; elsewhere the toggle is left out.
    streetButton.hidden = !geographic;
    document.querySelector<HTMLElement>("#layout-status")!.textContent = geographic
      ? "Geographic layout · mapped footprints and published heights, or heights read on the drawing where none is published, with detailed facades on all thirty-four buildings. Skyline view: the drawing’s camera, on the lakefront by the Adler Planetarium. Light grey outlines: mapped ground coverage. Grey lines: street centerlines. Grid: 100 m."
      : "Original layout · proportions and spacing fitted to the drawing. Use ground plan or height comparison, then toggle layouts to compare at the same camera scale.";
    document.querySelector<HTMLElement>("#model-caption")!.textContent = geographic ? "01 / geographic study" : "01 / original 3D study";
    // The drawing under the scene frames what the scene does: the whole skyline for the
    // geographic layout, the excerpt the original layout is fitted to otherwise.
    const drawing = document.querySelector<HTMLImageElement>(".reference img")!, { src, alt } = drawings[geographic ? "geographic" : "original"];
    if (drawing.getAttribute("src") !== src) drawing.src = src;
    drawing.alt = alt;
  }
  function connect(viewer: { requestRender(): void }) {
    streetButton.addEventListener("click", () => {
      ground.streets.visible = !ground.streets.visible;
      streetButton.setAttribute("aria-pressed", String(ground.streets.visible));
      viewer.requestRender();
    });
  }
  return { layouts, views, labels, onLayoutChange, connect };
}
