import { geographicBuildings } from "./models/skyline-geography-data.js";
import { createGeographicBuilding, createGeographicGround } from "./models/skyline-geography.js";
import type { BuildingModel, Vec3 } from "./models/building-kit.js";
import type { FitBox, PlatformOptions, ShadowCameraOptions, StudyLabel, StudyLayout, StudyView } from "./study-types.js";

export interface GeographicSkyline {
  models: BuildingModel[];
  ground: ReturnType<typeof createGeographicGround>;
  center: Vec3;
  settings: {
    target: Vec3;
    fit: FitBox;
    platform: PlatformOptions & { x: number; z: number };
    clippingMargin: number;
    lightPosition: Vec3;
    shadowCamera: ShadowCameraOptions;
  };
  layout: StudyLayout;
  drawingView: StudyView;
  comparisonViews: Record<string, StudyView>;
  labels: StudyLabel[];
}

// The panorama's viewBox, models/skyline-panorama.svg, in the drawing's layer units. Its
// centre is the skyline camera's sightline and its height the camera's vertical field of view.
const panorama = { x: -1400, y: -154.834, width: 9378.476, height: 3535.05 };
// The frame index.html shows the drawing in: skyline-animated.svg's viewBox, bottom-aligned
// and centred, in the same layer units. The file's `skyline-position` group translates the
// layer by (1105.5923, -87.26366) inside its viewBox.
const drawingFrame = { x: -1105.5923, y: 87.26366, width: 8501.0986, height: 2782.0373 };
// The direction the drawing's camera looks from, south-east of the skyline: its azimuth from
// south toward east. A building's detail faces it the same way.
export const skylineAzimuth = 36.1247 * Math.PI / 180;

// The geographic skyline, registered with Crain's mapped centre at `anchor`: every mapped
// building, their ground, the settings a study shows them with, and the drawing's camera.
export function createGeographicSkyline(anchor: Vec3 = [0, 0, 0]): GeographicSkyline {
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
  const photoAzimuth = skylineAzimuth, photoPolar = 94.0182 * Math.PI / 180;
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
