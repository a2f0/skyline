import * as THREE from "./vendor/three-r186.js";
import { geographicBuildings } from "./models/skyline-geography-data.js";
import { createGeographicBuilding, createGeographicGround, footprintMetrics, geographicOrigin } from "./models/skyline-geography.js";
import type { BuildingModel, Vec3 } from "./models/building-kit.js";
import type { StudyLayout, StudyView } from "./study-viewer.js";

// The drawing has no geographic position. Register the two scenes at Crain's
// center without changing the original models, rotations, or skyline camera.
export function createSkylineComparison(models: BuildingModel[], anchor: THREE.Vector3) {
  const offset: [number, number] = [anchor.x, anchor.z];
  const geographicModels = geographicBuildings.map((record) => createGeographicBuilding(record, offset));
  const ground = createGeographicGround(offset);
  const commonTarget: Vec3 = [anchor.x + 60, 0, anchor.z - 180];
  const commonFit = { width: 1050, height: 1050 };
  const views: Record<string, StudyView> = {
    top: { azimuth: 0, polar: 0, projection: "orthographic", label: "ground plan · north up", fit: commonFit, target: commonTarget },
    heights: { azimuth: 0.65, polar: 1.18, projection: "orthographic", label: "height comparison", fit: commonFit, target: [commonTarget[0], 155, commonTarget[2]] },
  };
  const layouts: Record<string, StudyLayout> = {
    geographic: {
      models: geographicModels,
      extras: [ground.group],
      defaultView: "top",
      target: [commonTarget[0], 155, commonTarget[2]],
      fit: { width: 1100, height: 950 },
      platform: { width: 1200, depth: 1400, x: commonTarget[0], z: commonTarget[2] },
      clippingMargin: 1800,
      lightPosition: [-700, 1100, 500],
      shadowCamera: { left: -1100, right: 1100, top: 1100, bottom: -1100, near: 1, far: 2600 },
      views: { skyline: { polar: Math.PI / 2 - 0.08 } },
    },
  };

  const number = (n: number) => n.toFixed(1);
  const signed = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}`;
  const tbody = document.querySelector<HTMLElement>("#dimensions-body")!;
  for (const record of geographicBuildings) {
    const model = models.find((entry) => entry.building.userData["buildingId"] === record.id)!;
    model.building.updateMatrixWorld(true);
    const min = [Infinity, Infinity], max = [-Infinity, -Infinity];
    let highest = 0;
    model.building.traverse((child) => {
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
      `${number(max[0]! - min[0]!)} × ${number(max[1]! - min[1]!)}`,
      `${number(footprint.size[0])} × ${number(footprint.size[1])}`,
      `${number(highest)} → ${number(record.tipHeight)} (${signed(record.tipHeight - highest)})`,
    ];
    for (const value of values) { const cell = document.createElement("td"); cell.textContent = value; row.append(cell); }
    const source = document.createElement("td");
    const height = document.createElement("a");
    height.href = record.heightSource;
    height.textContent = `${record.height} m architectural${record.id === "building-kemper" ? " (OSM)" : ""}`;
    source.append(height, document.createElement("br"), record.note);
    row.append(source);
    tbody.append(row);
  }
  document.querySelector<HTMLElement>("#coordinate-origin")!.textContent = `${geographicOrigin[1].toFixed(7)}° N, ${Math.abs(geographicOrigin[0]).toFixed(7)}° W`;

  const streetButton = document.querySelector<HTMLButtonElement>("#streets")!;
  function onLayoutChange(name: string) {
    const geographic = name === "geographic";
    streetButton.disabled = !geographic;
    document.querySelector<HTMLElement>("#layout-status")!.textContent = geographic
      ? "Geographic layout · mapped footprints, published heights; detailed Crain, Heritage, Kemper, Michigan Plaza South, and Trump facades. Cyan outlines: mapped ground coverage. Gold lines: street centerlines. Grid: 100 m. Plain brown volumes: estimated heights or antenna placement."
      : "Original layout · proportions and spacing fitted to the drawing. Use ground plan or height comparison, then toggle layouts to compare at the same camera scale.";
    document.querySelector<HTMLElement>("#model-caption")!.textContent = geographic ? "02 / geographic study" : "02 / original 3D study";
  }
  function connect(viewer: { requestRender(): void }) {
    streetButton.addEventListener("click", () => {
      ground.streets.visible = !ground.streets.visible;
      streetButton.setAttribute("aria-pressed", String(ground.streets.visible));
      viewer.requestRender();
    });
  }
  const labels = geographicBuildings.map(({ id, shortName }) => ({
    id, text: shortName,
    placement: id === "layer3" ? "right" : id === "building-one-prudential-plaza" ? "below" : "above",
  }));
  return { layouts, views, labels, onLayoutChange, connect };
}
