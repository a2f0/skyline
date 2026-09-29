import * as THREE from "./vendor/three-r186.js";
import { geographicBuildings } from "./models/skyline-geography-data.js";
import { createGeographicBuilding, createGeographicGround, footprintMetrics, geographicOrigin } from "./models/skyline-geography.js";
import type { BuildingModel, Vec3 } from "./models/building-kit.js";
import type { StudyLayout, StudyView } from "./study-viewer.js";

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

// The panorama's viewBox, models/skyline-panorama.svg, in the drawing's layer units. Its
// centre is the skyline camera's sightline and its height the camera's vertical field of view.
const panorama = { x: -1400, y: -154.834, width: 9378.476, height: 3535.05 };
// The frame index.html shows the drawing in: skyline-animated.svg's viewBox, bottom-aligned
// and centred, in the same layer units. The file's `skyline-position` group translates the
// layer by (1105.5923, -87.26366) inside its viewBox.
const drawingFrame = { x: -1105.5923, y: 87.26366, width: 8501.0986, height: 2782.0373 };

// The geographic skyline, registered with Crain's mapped centre at `anchor`: every mapped
// building, their ground, the settings a study shows them with, and the drawing's camera.
export function createGeographicSkyline(anchor: Vec3 = [0, 0, 0]) {
  const offset: [number, number] = [anchor[0], anchor[2]];
  const models = geographicBuildings.map((record) => createGeographicBuilding(record, offset));
  const ground = createGeographicGround(offset);
  // The comparison views share a frame set in ground plan, which holds both layouts: the
  // original's platform, and every mapped footprint, from 330 North Wabash's west side to
  // The Buckingham's east, with about 50 m east and west even where a portrait phone's
  // width binds the frame. North and south it runs from about 100 m past River Plaza's north
  // side, across the river, to 127 m past the Railway Exchange's mapped south side at
  // Jackson. Height comparison sees it at an angle, and on a portrait phone can clip the
  // platform's south-west corner.
  const center: Vec3 = [anchor[0] + 128, 0, anchor[2] + 85];
  const planFit = { width: 1050, height: 1520 };
  const settings = {
    target: [center[0], 155, center[2]] as Vec3,
    fit: { width: 1100, height: 950 },
    platform: { width: 1200, depth: 1600, x: center[0], z: center[2] },
    clippingMargin: 1800,
    lightPosition: [-700, 1100, 500] as Vec3,
    // Wide enough for the platform's far corners, which the geography suite checks.
    shadowCamera: { left: -1300, right: 1300, top: 1300, bottom: -1300, near: 1, far: 2600 },
  };
  // The drawing traces a lakefront photograph. Fitting the mapped buildings'
  // roofs and tips to their drawn positions (scripts/fit-geographic-camera.ts)
  // puts its eye on the shore by the Adler Planetarium, 2 m above the street
  // datum, looking up at the skyline; it is held there while the angles and lens
  // are refitted, since the drawing barely tells its distance from its lens. The
  // buildings stay where they are mapped; only the camera is fitted. Eye positions
  // are meters east, up, and south of Crain's mapped centre.
  const photoEye: Vec3 = [1471.76, 2, 1948.8];
  const photoAzimuth = 36.1247 * Math.PI / 180, photoPolar = 94.0182 * Math.PI / 180;
  // The panorama's vertical field of view. The panorama is the reference excerpt's frame
  // widened about the same centre to every building the drawing shows, so the camera aims
  // where it always has.
  const frameFov = 10.5279 * Math.PI / 180;
  const back: Vec3 = [Math.sin(photoPolar) * Math.sin(photoAzimuth), Math.cos(photoPolar), Math.sin(photoPolar) * Math.cos(photoAzimuth)];
  // Orbit and zoom pivot on the sightline at Crain's depth.
  const photoDistance = photoEye[0] * back[0] + photoEye[1] * back[1] + photoEye[2] * back[2];
  const frameHeight = 2 * photoDistance * Math.tan(frameFov / 2);
  const photoView = {
    azimuth: photoAzimuth,
    polar: photoPolar,
    distance: photoDistance,
    target: [anchor[0] + photoEye[0] - photoDistance * back[0], photoEye[1] - photoDistance * back[1], anchor[2] + photoEye[2] - photoDistance * back[2]] as Vec3,
    fit: { width: frameHeight * panorama.width / panorama.height, height: frameHeight },
  };
  // The same camera framing what index.html frames: the drawing's viewBox, a lens shift off
  // the panorama's centre, held to the viewport's bottom edge. The mapped buildings then
  // stand where the drawing shows them in the skyline viewer.
  const unit = frameHeight / panorama.height;
  const drawingView: StudyView = {
    ...photoView,
    label: "skyline view",
    fit: { width: drawingFrame.width * unit, height: drawingFrame.height * unit },
    offset: [
      (drawingFrame.x + drawingFrame.width / 2 - panorama.x - panorama.width / 2) * unit,
      (panorama.y + panorama.height / 2 - drawingFrame.y - drawingFrame.height / 2) * unit,
    ],
    align: "bottom",
  };
  const layout: StudyLayout = { models, extras: [ground.group], defaultView: "skyline", ...settings, views: { skyline: photoView } };
  const comparisonViews: Record<string, StudyView> = {
    top: { azimuth: 0, polar: 0, projection: "orthographic", label: "ground plan · north up", fit: planFit, target: center },
    heights: { azimuth: 0.65, polar: 1.18, projection: "orthographic", label: "height comparison", fit: planFit, target: [center[0], 155, center[2]] },
  };
  // The names the comparison views show over each building.
  const labels = geographicBuildings.map(({ id, shortName }) => ({
    id, text: shortName,
    placement: id === "layer3" ? "right" : id === "building-one-prudential-plaza" ? "below" : "above",
  }));
  return { models, ground, center, settings, layout, drawingView, comparisonViews, labels };
}

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
    streetButton.disabled = !geographic;
    document.querySelector<HTMLElement>("#layout-status")!.textContent = geographic
      ? "Geographic layout · mapped footprints and published heights, or heights read on the drawing where none is published, with detailed facades on all thirty-four buildings. Skyline view: the drawing’s camera, on the lakefront by the Adler Planetarium. Cyan outlines: mapped ground coverage. Gold lines: street centerlines. Grid: 100 m."
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
