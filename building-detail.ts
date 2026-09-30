import * as THREE from "./vendor/three-r186.js";
import { createBuildingStudy } from "./study-viewer.js";
import { skylineAzimuth } from "./skyline-comparison.js";
import { geographicBuildings } from "./models/skyline-geography-data.js";
import type { GeoBuilding } from "./models/skyline-geography-data.js";
import { createGeographicBuilding, footprintMetrics } from "./models/skyline-geography.js";

// One mapped building of the 3D skyline, alone on its own platform, as the building study
// shows Crain: building-detail.html?building=<id>. The skyline viewer floats it over the
// skyline from a building's context menu.
const id = new URLSearchParams(location.search).get("building");
const record = geographicBuildings.find((entry) => entry.id === id);
if (record) showBuilding(record);
else {
  document.querySelector<HTMLElement>("#loading")!.textContent = "No mapped building by that name. Right-click a building on the 3D skyline to see its detail.";
  document.querySelectorAll<HTMLButtonElement>("button").forEach((button) => { button.disabled = true; });
}

function showBuilding(record: GeoBuilding) {
  const footprint = footprintMetrics(record.footprint.coordinates);
  // Centred on its mapped outline: ground coordinates are east and north, the scene's x and -z.
  const model = createGeographicBuilding(record, [-footprint.center[0], footprint.center[1]]);
  // The page names the building before the 3D view starts, so a failed start leaves it named.
  document.title = `${record.name} — Building Detail`;
  document.querySelector<HTMLElement>("#building-name")!.textContent = record.name;
  document.querySelector<HTMLElement>("#building")!.setAttribute("aria-label", `Interactive 3D model of ${record.name}`);
  const number = (n: number) => `${Number(n.toFixed(1))} m`;
  const heights = document.querySelector<HTMLElement>("#building-heights")!;
  // As the skyline study's table gives them.
  const osm = record.heightSource.startsWith("https://www.openstreetmap.org/way/") ? " (OSM)" : "";
  const source = link(record.heightSource, record.heightFromDrawing ? `${number(record.height)}, measured on the drawing` : `${number(record.height)} architectural${osm}`);
  heights.replaceChildren(source, ...record.tipHeight !== record.height ? [` · tip ${number(record.tipHeight)}`] : []);
  document.querySelector<HTMLElement>("#building-note")!.textContent = record.note;
  const way = link(`https://www.openstreetmap.org/way/${record.footprint.way}`, `OpenStreetMap way ${record.footprint.way}`);
  document.querySelector<HTMLElement>("#building-facts")!.replaceChildren(
    `Mapped outline ${footprint.size[0].toFixed(1)} × ${footprint.size[1].toFixed(1)} m, from `, way,
    `. Model: ${model.triangleCount.toLocaleString("en-US")} triangles.`,
  );
  const min = new THREE.Vector3(Infinity, Infinity, Infinity), max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  model.building.updateMatrixWorld(true);
  model.building.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const positions = mesh.geometry.getAttribute("position"), point = new THREE.Vector3();
    for (let i = 0; i < positions.count; i += 1) {
      point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
      min.min(point); max.max(point);
    }
  });
  // The platform reaches past the building on every side, and the frame holds the building
  // and its platform from any side: its height, and its plan's diagonal.
  const height = max.y;
  const reach = Math.max(-min.x, max.x, -min.z, max.z);
  const margin = Math.max(10, reach * 0.35);
  const platform = { width: 2 * (Math.max(-min.x, max.x) + margin), depth: 2 * (Math.max(-min.z, max.z) + margin) };
  const across = Math.hypot(platform.width, platform.depth);
  const size = Math.max(height, across);
  // The building study's views, turned so the front view faces the building as the skyline
  // camera does.
  const views = {
    front: { azimuth: skylineAzimuth, polar: Math.PI / 2 - 0.035, label: "front view · as the skyline shows it" },
    quarter: { azimuth: skylineAzimuth + 0.22, polar: Math.PI / 2 - 0.15, label: "three-quarter view" },
    side: { azimuth: skylineAzimuth + Math.PI / 2, polar: Math.PI / 2 - 0.12, label: "side view" },
  };
  createBuildingStudy({
    models: [model],
    views,
    target: [0, height * 0.48, 0],
    fit: { height: height * 1.3 + across * 0.4, width: across * 1.2 },
    platform,
    lightPosition: [-0.62 * size, 1.36 * size, 0.96 * size],
    shadowCamera: { left: -size, right: size, top: size, bottom: -size, near: 1, far: 4 * size },
    far: 12 * size,
    // The detail opens circling the building, which any view, drag, or the turntable
    // button stops.
    turntable: true,
  });
}

// Sources open beside the page, so a detail floated over the skyline stays where it is.
function link(href: string, text: string) {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.textContent = text;
  anchor.target = "_blank";
  anchor.rel = "noopener";
  return anchor;
}
