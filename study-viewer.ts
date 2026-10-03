import * as THREE from "./vendor/three-r186.js";
import type { BuildingModel, Vec3 } from "./models/building-kit.js";

// Each model supplies its group, display controls, and triangle count. Camera
// and framing belong to the study, so the same viewer supports one tower or a scene.

export interface FitBox {
  width: number;
  height: number;
}

export interface PlatformOptions {
  width: number;
  depth: number;
  x?: number;
  z?: number;
  color?: number;
}

export interface ShadowCameraOptions {
  left: number;
  right: number;
  top: number;
  bottom: number;
  near: number;
  far: number;
}

export interface StudyView {
  azimuth: number;
  polar: number;
  label?: string;
  projection?: "orthographic" | "perspective";
  fit?: FitBox;
  target?: Vec3;
  // A fixed eye distance from the target. The eye then stays put at every
  // viewport, as a photograph's camera does, and the field of view frames the
  // fit box instead of the distance changing to fit it.
  distance?: number;
  // The fit box's centre, right of and above the sightline through the target, in
  // the fit box's units. A perspective frame off the sightline is a lens shift: the
  // eye and its direction stay put, and the orbit still pivots on the target.
  offset?: [number, number];
  // "bottom" holds the fit box's bottom edge on the viewport's where the viewport is
  // taller than the box, as an SVG's xMidYMax meet does, and the spare height goes
  // above it. Perspective views only; the default centres the box.
  align?: "center" | "bottom";
}

export interface StudyLayout {
  models?: BuildingModel[];
  extras?: THREE.Object3D[];
  defaultView?: string;
  target?: Vec3;
  fit?: FitBox;
  platform?: PlatformOptions;
  lightPosition?: Vec3;
  shadowCamera?: ShadowCameraOptions;
  clippingMargin?: number | null;
  views?: Record<string, Partial<StudyView>>;
}

export interface StudyLabel {
  id: string;
  text: string;
  placement?: string;
}

// The runtime surface the study pages and the browser tests read through
// window.__buildingStudy.
export interface BuildingStudyApi {
  ready: boolean;
  modelName: string;
  modelNames: string[];
  triangleCount: number;
  layout: string;
  projection: "orthographic" | "perspective";
  zoom: number;
  groundShadows: boolean;
  activeView: string | null;
  selectedBuilding: string | null;
  shadowBounds: { min: number[]; max: number[] };
  projectPoint(buildingId: string, coordinates: number[]): [number, number];
  cameraPosition: number[];
  highlighted: boolean;
  turning: boolean;
  renderCount: number;
  modelBounds: { id: string; min: number[]; max: number[] }[];
  platformBounds: { min: number[]; max: number[] };
}

declare global {
  interface Window {
    __buildingStudy?: BuildingStudyApi;
  }
}

// The vendored bundle includes the OrbitControls example module, whose
// published types live in the three examples tree. This declares the subset
// the viewer uses.
declare module "./vendor/three-r186.js" {
  export class OrbitControls extends THREE.EventDispatcher<{ change: Event; start: Event; end: Event }> {
    constructor(object: THREE.Camera, domElement?: HTMLElement);
    object: THREE.Camera;
    target: THREE.Vector3;
    enabled: boolean;
    enableDamping: boolean;
    enablePan: boolean;
    panSpeed: number;
    minPolarAngle: number;
    maxPolarAngle: number;
    minDistance: number;
    maxDistance: number;
    minZoom: number;
    maxZoom: number;
    rotateSpeed: number;
    zoomSpeed: number;
    update(): boolean;
  }
}

interface StudyConfig {
  models: BuildingModel[];
  fit: FitBox;
  target: Vec3;
  platform: PlatformOptions;
  lightPosition: Vec3;
  shadowCamera: ShadowCameraOptions;
  clippingMargin: number | null;
  extras?: THREE.Object3D[];
  defaultView?: string;
}

interface ModelLabel {
  element: HTMLSpanElement;
  position: THREE.Vector3;
}

type StudyCamera = (THREE.PerspectiveCamera | THREE.OrthographicCamera) & {
  aspect?: number;
  isOrthographicCamera?: boolean;
};

interface BuildingStudyOptions {
  models: BuildingModel[];
  defaultView?: string;
  views?: Record<string, StudyView>;
  fov?: number;
  near?: number;
  far?: number;
  clippingMargin?: number | null;
  minimumDistanceRatio?: number;
  maximumZoom?: number;
  enablePan?: boolean;
  target?: Vec3;
  minimumCameraHeight?: number | null;
  fit?: FitBox;
  platform?: PlatformOptions;
  lightPosition?: Vec3;
  shadowCamera?: ShadowCameraOptions;
  // Scene objects shown with the models that are not buildings, such as mapped streets.
  extras?: THREE.Object3D[];
  layouts?: Record<string, StudyLayout> | null;
  // The layout the page opens on; the original drawing's fit unless a page chooses another.
  initialLayout?: string;
  onLayoutChange?: (name: string) => void;
  labels?: StudyLabel[];
  // Whether the page opens on the turntable, where reduced motion allows it.
  turntable?: boolean;
}

export function createBuildingStudy({
  models,
  defaultView = "quarter",
  views = {
    front: { azimuth: Math.PI / 4, polar: Math.PI / 2 - 0.035, label: "front view" },
    quarter: { azimuth: Math.PI / 4 + 0.22, polar: Math.PI / 2 - 0.15, label: "three-quarter view" },
    side: { azimuth: Math.PI * 0.75, polar: Math.PI / 2 - 0.12, label: "side view" },
  },
  fov = 32,
  near = 1,
  far = 2000,
  clippingMargin = null,
  minimumDistanceRatio = 0.48,
  maximumZoom = 4,
  enablePan = false,
  target = [0, 85, 0],
  minimumCameraHeight = null,
  fit = { height: 230, width: 98 },
  platform = { width: 76, depth: 76 },
  lightPosition = [-110, 240, 170],
  shadowCamera = { left: -140, right: 140, top: 160, bottom: -160, near: 1, far: 600 },
  extras = [],
  layouts = null,
  initialLayout = "original",
  onLayoutChange = () => {},
  labels = [],
  turntable = false,
}: BuildingStudyOptions) {
  const original = { models, extras, fit, target, platform, lightPosition, shadowCamera, clippingMargin };
  let layout = "original";
  const viewport = document.querySelector<HTMLElement>("#viewport")!;
  const canvas = document.querySelector<HTMLCanvasElement>("#building")!;
  const tooltip = document.querySelector<HTMLElement>("#tooltip")!;
  // The studies name the active view in the viewport; the full-screen skyline leaves it to
  // the pressed button.
  const viewLabel = document.querySelector<HTMLElement>("#view-label");
  const wireframeButton = document.querySelector<HTMLElement>("#wireframe")!;
  const turntableButton = document.querySelector<HTMLButtonElement>("#turntable")!;
  const motionStatus = document.querySelector<HTMLElement>("#motion-status")!;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const labelLayer = document.createElement("div");
  labelLayer.className = "study-annotations";
  labelLayer.hidden = true;
  labelLayer.setAttribute("aria-hidden", "true");
  viewport.append(labelLayer);
  let modelLabels: ModelLabel[] = [];
  let labelsPrepared = false;
  function prepareLabels() {
    labelLayer.replaceChildren();
    // A label names a building only in the layouts that have it: the geographic layout
    // maps buildings the drawing does not model.
    modelLabels = labels.flatMap(({ id, text, placement = "above" }) => {
      const model = models.find((entry) => entry.building.userData["buildingId"] === id);
      if (!model) return [];
      const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      model.building.updateMatrixWorld(true);
      model.building.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        const positions = mesh.geometry.getAttribute("position"), point = new THREE.Vector3();
        for (let i = 0; i < positions.count; i += 1) {
          point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
          min[0] = Math.min(min[0]!, point.x); max[0] = Math.max(max[0]!, point.x);
          min[1] = Math.min(min[1]!, point.y); max[1] = Math.max(max[1]!, point.y);
          min[2] = Math.min(min[2]!, point.z); max[2] = Math.max(max[2]!, point.z);
        }
      });
      const element = document.createElement("span");
      element.textContent = text;
      element.dataset["placement"] = placement;
      labelLayer.append(element);
      return [{ element, position: new THREE.Vector3((min[0]! + max[0]!) / 2, max[1]! + 5, (min[2]! + max[2]!) / 2) }];
    });
    labelsPrepared = true;
  }
  const perspectiveCamera = new THREE.PerspectiveCamera(fov, 1, near, far);
  const planCamera = new THREE.OrthographicCamera(-500, 500, 500, -500, near, far);
  let camera: StudyCamera = perspectiveCamera;
  const controls = new THREE.OrbitControls(camera, canvas);
  controls.enablePan = enablePan;
  controls.enableDamping = false;
  controls.minPolarAngle = Math.PI * 0.12;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.target.fromArray(target);
  controls.rotateSpeed = 0.65;
  controls.zoomSpeed = 0.7;

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
  keyLight.position.fromArray(lightPosition);
  keyLight.target.position.set(0, 80, 0);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  Object.assign(keyLight.shadow.camera, shadowCamera);
  keyLight.shadow.normalBias = 0.2;
  scene.add(keyLight, keyLight.target);
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.55);
  fillLight.position.set(100, 140, -140);
  scene.add(fillLight);

  let modelOwners = new Map<THREE.Object3D, BuildingModel>(models.map((model) => [model.building, model]));
  models.forEach((model) => scene.add(model.building));
  extras.forEach((object) => scene.add(object));
  const base = new THREE.Mesh(new THREE.BoxGeometry(platform.width, 2, platform.depth), new THREE.MeshToonMaterial({ color: platform.color ?? 0x3a3a3a }));
  base.position.set(platform.x || 0, -1.1, platform.z || 0);
  base.receiveShadow = true;
  scene.add(base);
  const baseEdges = new THREE.LineSegments(new THREE.EdgesGeometry(base.geometry), new THREE.LineBasicMaterial({ color: 0x555555 }));
  baseEdges.position.copy(base.position);
  scene.add(baseEdges);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let selectedModel: BuildingModel | null = null;
  let wireframe = false;
  let turning = false;
  let interacting = false;
  let frameId = 0;
  let lastTime = 0;
  let fittedDistance = 400;
  let activeView: string | null = defaultView;
  let frameFit = fit;
  let frameDistance: number | null = null;
  let frameOffset: [number, number] = [0, 0];
  let frameAlign: StudyView["align"] = "center";


  function requestRender() {
    if (!frameId && !document.hidden) frameId = requestAnimationFrame(render);
  }

  function render(time: number) {
    frameId = 0;
    if (turning && !document.hidden) {
      const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0;
      const offset = camera.position.clone().sub(controls.target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), delta * 0.16);
      camera.position.copy(controls.target).add(offset);
      controls.update();
    }
    lastTime = time;
    renderer.render(scene, camera);
    labelLayer.hidden = !camera.isOrthographicCamera;
    const layerWidth = labelLayer.clientWidth, layerHeight = labelLayer.clientHeight;
    for (const { element, position } of modelLabels) {
      const point = position.clone().project(camera);
      element.hidden = Math.abs(point.x) > 0.95 || Math.abs(point.y) > 0.95 || Math.abs(point.z) > 1;
      // A label near the side slides along it rather than being cut by the layer's edge:
      // centred labels keep half their width in from it, and one set to the right its
      // whole width and offset. Near the top or bottom it slides the same way, by its
      // height and offset above or below its point, or half its height beside it.
      const x = (point.x + 1) / 2 * layerWidth, width = element.offsetWidth;
      const [lo, hi] = element.dataset["placement"] === "right" ? [0, layerWidth - width - 14] : [width / 2, layerWidth - width / 2];
      element.style.left = `${width && layerWidth ? Math.min(Math.max(x, lo), Math.max(lo, hi)) : x}px`;
      const y = (1 - point.y) / 2 * layerHeight, height = element.offsetHeight, placement = element.dataset["placement"];
      const [top, bottom] = placement === "right" ? [height / 2, layerHeight - height / 2]
        : placement === "below" ? [-12, layerHeight - height - 12] : [height + 10, layerHeight + 10];
      element.style.top = `${height && layerHeight ? Math.min(Math.max(y, top), Math.max(top, bottom)) : y}px`;
    }
    if (turning) requestRender();
  }

  function clearHighlight() {
    selectedModel?.setHighlighted(false);
    selectedModel = null;
    tooltip.hidden = true;
    requestRender();
  }

  function markView(name: string | null) {
    activeView = name;
    if (viewLabel) viewLabel.textContent = views[name!]?.label || "orbit view";
    document.querySelectorAll<HTMLElement>("[data-view]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset["view"] === name));
    });
  }

  function setTurning(enabled: boolean) {
    turning = enabled && !reducedMotion.matches;
    lastTime = 0;
    turntableButton.setAttribute("aria-pressed", String(turning));
    turntableButton.textContent = turning ? "stop turntable" : "turntable";
    if (turning) {
      markView(null);
      clearHighlight();
    }
    updateMotionStatus();
    requestRender();
  }

  // Says how the camera moves: held still by reduced motion, circling on the turntable, or
  // still until asked. The text changes only when that does, so it is not read out again.
  function updateMotionStatus() {
    const text = reducedMotion.matches
      ? "Reduced motion: turntable and drag movement paused. View buttons and keyboard controls change the view immediately."
      : turning
        ? "Turntable on: the camera circles the model until you stop the turntable, choose a view, or drag."
        : "Camera moves only when you interact or start the turntable.";
    if (motionStatus.textContent !== text) motionStatus.textContent = text;
  }

  function viewFor(name: string): StudyView {
    return { ...views[name]!, ...layouts?.[layout]?.views?.[name]! };
  }

  function positionView(name: string) {
    const view = viewFor(name);
    camera.position.set(
      fittedDistance * Math.sin(view.polar) * Math.sin(view.azimuth),
      fittedDistance * Math.cos(view.polar),
      fittedDistance * Math.sin(view.polar) * Math.cos(view.azimuth),
    ).add(controls.target);
    controls.update();
  }

  // The platform, and any extra marked as ground, such as mapped roads, take building
  // shadows in every view but ground plan.
  function setGroundShadows(enabled: boolean) {
    base.receiveShadow = enabled;
    extras.forEach((object) => object.traverse((child) => { if (child.userData["ground"]) child.receiveShadow = enabled; }));
  }

  function setView(name: string) {
    setTurning(false);
    if (!views[name]) return;
    const view = viewFor(name);
    camera = view.projection === "orthographic" ? planCamera : perspectiveCamera;
    // Labels appear only in orthographic views. Their exact bounds scan every mesh
    // vertex, so defer it until a view actually needs them and reuse it for this layout.
    if (camera.isOrthographicCamera && !labelsPrepared) prepareLabels();
    controls.object = camera;
    controls.enablePan = enablePan || !!camera.isOrthographicCamera;
    controls.minPolarAngle = camera.isOrthographicCamera ? 0 : Math.PI * 0.12;
    // A preset may look up further than free orbiting allows; OrbitControls
    // would otherwise clamp it on its first update.
    controls.maxPolarAngle = Math.max(Math.PI * 0.52, view.polar);
    controls.minZoom = 0.5;
    controls.maxZoom = maximumZoom;
    camera.zoom = 1;
    setGroundShadows(name !== "top");
    frameFit = view.fit || fit;
    frameDistance = view.distance ?? null;
    frameOffset = view.offset ?? [0, 0];
    frameAlign = view.align ?? "center";
    controls.target.fromArray(view.target || target);
    markView(name);
    updateCameraHint();
    resize();
    clearHighlight();
  }

  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    // A frame with no size, such as the skyline viewer's 3D scene while another mode shows,
    // has nothing to fit, and fitting to it would move an orbited eye.
    if (!width || !height) return;
    const previousFit = fittedDistance;
    const aspect = width / Math.max(height, 1);
    camera.aspect = aspect;
    renderer.setSize(width, height, false);
    // Fit both the tower's height and its footprint at narrow mobile widths:
    // by moving the eye, or at a fixed eye by widening the field of view.
    if (frameDistance === null) {
      const tangent = Math.tan(fov * Math.PI / 360);
      perspectiveCamera.fov = fov;
      fittedDistance = Math.max(frameFit.height / 2 / tangent, frameFit.width / 2 / (tangent * aspect));
    } else {
      perspectiveCamera.fov = Math.atan(Math.max(frameFit.height, frameFit.width / aspect) / 2 / frameDistance) * 360 / Math.PI;
      fittedDistance = frameDistance;
    }
    if (camera.isOrthographicCamera) {
      const plan = camera as THREE.OrthographicCamera;
      const height = Math.max(frameFit.height, frameFit.width / aspect);
      plan.top = height / 2; plan.bottom = -height / 2;
      plan.left = -height * aspect / 2; plan.right = height * aspect / 2;
      controls.panSpeed = 1;
    } else shiftLens(width, height, aspect);
    controls.minDistance = fittedDistance * minimumDistanceRatio;
    controls.maxDistance = fittedDistance * 2;
    updateClipping();
    camera.updateProjectionMatrix();
    if (activeView) positionView(activeView);
    else {
      camera.position.sub(controls.target).multiplyScalar(fittedDistance / previousFit).add(controls.target);
      controls.update();
    }
    requestRender();
  }

  // Frames the view's fit box off the sightline, or on the viewport's bottom edge, by
  // rendering the viewport as a window into a wider frustum about the same axis. Sizes are
  // in the fit box's units at the fitted distance, where the window is the visible frame.
  function shiftLens(width: number, height: number, aspect: number) {
    const visible = Math.max(frameFit.height, frameFit.width / aspect);
    const [x, y] = frameOffset;
    const centre = frameAlign === "bottom" ? y + (visible - frameFit.height) / 2 : y;
    if (!x && !centre) {
      perspectiveCamera.clearViewOffset();
      controls.panSpeed = 1;
      return;
    }
    const halfWidth = Math.abs(x) + visible * aspect / 2, halfHeight = Math.abs(centre) + visible / 2, pixel = visible / height;
    perspectiveCamera.fov = Math.atan(halfHeight / fittedDistance) * 360 / Math.PI;
    // OrbitControls pans by the field of view, now the wider frustum's; scale that back
    // to the window so the scene follows the pointer.
    controls.panSpeed = visible / 2 / halfHeight;
    perspectiveCamera.setViewOffset(
      2 * halfWidth / pixel, 2 * halfHeight / pixel,
      (halfWidth + x - visible * aspect / 2) / pixel, (halfHeight - centre - visible / 2) / pixel,
      width, height,
    );
  }

  function updateClipping() {
    if (clippingMargin === null) return;
    // Follow the eye's distance from the scene, including after panning.
    // A close near plane allows detail inspection; moving it out again at
    // wider views preserves depth precision between thin facade layers.
    const distance = Math.hypot(camera.position.x - target[0], camera.position.y - target[1], camera.position.z - target[2]);
    const nextNear = Math.max(near, distance - clippingMargin);
    const nextFar = Math.max(far, distance + clippingMargin);
    if (camera.near === nextNear && camera.far === nextFar) return;
    camera.near = nextNear; camera.far = nextFar;
    camera.updateProjectionMatrix();
  }

  controls.addEventListener("change", () => {
    // Long-lens scenes can reach below ground even at a shallow polar angle.
    // Preserve zoom distance and azimuth while keeping the eye above the base.
    if (minimumCameraHeight !== null && camera.position.y < minimumCameraHeight - 1e-6) {
      const offset = camera.position.clone().sub(controls.target);
      const distance = offset.length();
      // Panning can place the target so far below grade that no allowed polar
      // angle reaches the floor at this radius. Raise the target only enough
      // to make the constraint feasible before asking OrbitControls to update.
      // Otherwise its angle clamp undoes our correction and recurses forever.
      const vertical = Math.min(minimumCameraHeight - controls.target.y, distance * Math.cos(controls.minPolarAngle));
      controls.target.y = minimumCameraHeight - vertical;
      const horizontal = Math.sqrt(Math.max(0, distance * distance - vertical * vertical));
      const oldHorizontal = Math.hypot(offset.x, offset.z);
      const direction: [number, number] = oldHorizontal > 1e-9 ? [offset.x / oldHorizontal, offset.z / oldHorizontal] : [0, 1];
      camera.position.set(controls.target.x + direction[0] * horizontal, minimumCameraHeight, controls.target.z + direction[1] * horizontal);
      controls.update();
    }
    updateClipping();
    requestRender();
  });
  controls.addEventListener("start", () => {
    interacting = true;
    setTurning(false);
    markView(null);
    clearHighlight();
  });
  controls.addEventListener("end", () => { interacting = false; });

  // The building at a point in the window, if any: the nearest surface there, so a nearer
  // tower hides the one behind it.
  function buildingAt(x: number, y: number): BuildingModel | null {
    const bounds = canvas.getBoundingClientRect();
    pointer.set((x - bounds.left) / bounds.width * 2 - 1, -(y - bounds.top) / bounds.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    // Intersect the full scene so the pedestal can occlude the tower base.
    const hit = raycaster.intersectObjects(scene.children, true).find((intersection) => (intersection.object as THREE.Mesh).isMesh && intersection.object.visible);
    let owner: THREE.Object3D | null | undefined = hit?.object;
    while (owner && !modelOwners.has(owner)) owner = owner.parent;
    return modelOwners.get(owner as THREE.Object3D) || null;
  }

  canvas.addEventListener("pointermove", (event) => {
    if (interacting || turning || event.pointerType === "touch") return;
    const nextModel = buildingAt(event.clientX, event.clientY);
    if (nextModel !== selectedModel) {
      selectedModel?.setHighlighted(false);
      selectedModel = nextModel;
      selectedModel?.setHighlighted(true);
      requestRender();
    }
    tooltip.hidden = !selectedModel;
    if (selectedModel) {
      const data = selectedModel.building.userData["geography"];
      tooltip.textContent = data ? `${data.name} · ${data.height} m${data.tipHeight !== data.height ? ` / tip ${data.tipHeight} m` : ""}` : selectedModel.building.name;
      const tooltipBounds = tooltip.getBoundingClientRect();
      const x = event.clientX + 18 + tooltipBounds.width > innerWidth - 6 ? event.clientX - tooltipBounds.width - 18 : event.clientX + 18;
      const y = event.clientY + 18 + tooltipBounds.height > innerHeight - 6 ? event.clientY - tooltipBounds.height - 18 : event.clientY + 18;
      tooltip.style.left = `${Math.max(6, x)}px`;
      tooltip.style.top = `${Math.max(6, y)}px`;
    }
  }, { passive: true });
  canvas.addEventListener("pointerleave", clearHighlight);
  canvas.addEventListener("blur", clearHighlight);
  window.addEventListener("scroll", clearHighlight, { passive: true });

  canvas.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "=", "-", "Home"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") return setView(layouts?.[layout]?.defaultView || defaultView);
    setTurning(false);
    const offset = camera.position.clone().sub(controls.target);
    const distance = offset.length();
    let polar = Math.acos(offset.y / distance);
    let azimuth = Math.atan2(offset.x, offset.z);
    let nextDistance = distance;
    if (event.key === "ArrowLeft") azimuth -= Math.PI / 18;
    if (event.key === "ArrowRight") azimuth += Math.PI / 18;
    if (event.key === "ArrowUp") polar -= Math.PI / 36;
    if (event.key === "ArrowDown") polar += Math.PI / 36;
    if (camera.isOrthographicCamera && ["+", "=", "-"].includes(event.key)) {
      camera.zoom = Math.max(controls.minZoom, Math.min(controls.maxZoom, camera.zoom * (event.key === "-" ? 0.9 : 1 / 0.9)));
      camera.updateProjectionMatrix();
    } else {
      if (event.key === "+" || event.key === "=") nextDistance *= 0.9;
      if (event.key === "-") nextDistance /= 0.9;
    }
    polar = Math.max(controls.minPolarAngle, Math.min(controls.maxPolarAngle, polar));
    nextDistance = Math.max(controls.minDistance, Math.min(controls.maxDistance, nextDistance));
    camera.position.set(nextDistance * Math.sin(polar) * Math.sin(azimuth), nextDistance * Math.cos(polar), nextDistance * Math.sin(polar) * Math.cos(azimuth)).add(controls.target);
    controls.update();
    markView(null);
    clearHighlight();
  });

  document.querySelectorAll<HTMLElement>("[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset["view"]!)));
  document.querySelector<HTMLElement>("#reset")!.addEventListener("click", () => setView(layouts?.[layout]?.defaultView || defaultView));
  wireframeButton.addEventListener("click", () => {
    wireframe = !wireframe;
    models.forEach((model) => model.setWireframe(wireframe));
    wireframeButton.setAttribute("aria-pressed", String(wireframe));
    requestRender();
  });
  turntableButton.addEventListener("click", () => setTurning(!turning));

  function setLayout(name: string) {
    if (name === layout || (name !== "original" && !layouts?.[name])) return;
    const previousView = activeView;
    const keepPose = camera.isOrthographicCamera;
    const pose = { position: camera.position.clone(), target: controls.target.clone(), zoom: camera.zoom, groundShadows: base.receiveShadow };
    clearHighlight();
    setTurning(false);
    models.forEach((model) => scene.remove(model.building));
    extras.forEach((object) => scene.remove(object));
    const next: StudyConfig = { ...original, ...layouts?.[name]! };
    layout = name;
    ({ models, fit, target, platform, lightPosition, shadowCamera, clippingMargin } = next);
    extras = next.extras || [];
    models.forEach((model) => { scene.add(model.building); model.setWireframe(wireframe); });
    extras.forEach((object) => scene.add(object));
    modelOwners = new Map<THREE.Object3D, BuildingModel>(models.map((model) => [model.building, model]));
    labelsPrepared = false;
    base.geometry.dispose(); baseEdges.geometry.dispose();
    base.geometry = new THREE.BoxGeometry(platform.width, 2, platform.depth);
    baseEdges.geometry = new THREE.EdgesGeometry(base.geometry);
    base.position.set(platform.x || 0, -1.1, platform.z || 0);
    baseEdges.position.copy(base.position);
    keyLight.position.fromArray(lightPosition);
    Object.assign(keyLight.shadow.camera, shadowCamera);
    keyLight.shadow.camera.updateProjectionMatrix();
    const nextView = previousView && previousView !== defaultView ? previousView : next.defaultView || defaultView;
    setView(keepPose ? previousView || "top" : nextView);
    if (keepPose && camera.isOrthographicCamera) {
      camera.position.copy(pose.position); controls.target.copy(pose.target); camera.zoom = pose.zoom;
      setGroundShadows(pose.groundShadows);
      camera.updateProjectionMatrix(); controls.update();
      if (!previousView) markView(null);
    }
    markLayout(name);
    onLayoutChange(name);
    requestRender();
  }
  function markLayout(name: string) {
    document.querySelectorAll<HTMLElement>("[data-layout]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset["layout"] === name)));
  }
  document.querySelectorAll<HTMLElement>("[data-layout]").forEach((button) => button.addEventListener("click", () => setLayout(button.dataset["layout"]!)));

  function updateCameraHint() {
    document.querySelector<HTMLElement>("#camera-hint")!.innerHTML = reducedMotion.matches
      ? '<span class="wide-hint">Use the view buttons or arrow keys to inspect<br />+ / − zoom · Home resets</span><span class="narrow-hint">Use the view buttons to inspect</span>'
      : controls.enablePan
        ? '<span class="wide-hint">Drag to orbit · shift-drag to pan · scroll to zoom<br />Arrow keys rotate · + / − zoom · Home resets</span><span class="narrow-hint">Drag to orbit · two fingers pan / zoom</span>'
        : '<span class="wide-hint">Drag to orbit · scroll or pinch to zoom<br />Arrow keys rotate · + / − zoom · Home resets</span><span class="narrow-hint">Drag to orbit · pinch to zoom</span>';
  }

  function updateMotionPreference() {
    controls.enabled = !reducedMotion.matches;
    turntableButton.disabled = reducedMotion.matches;
    if (reducedMotion.matches) setTurning(false);
    updateMotionStatus();
    updateCameraHint();
    clearHighlight();
  }
  reducedMotion.addEventListener("change", updateMotionPreference);
  document.addEventListener("visibilitychange", () => {
    lastTime = 0;
    if (document.hidden) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    } else requestRender();
  });
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    setTurning(false);
    const loading = document.querySelector<HTMLElement>("#loading")!;
    loading.textContent = "The graphics context was interrupted. Reload to restore the 3D preview.";
    loading.hidden = false;
  });

  new ResizeObserver(resize).observe(viewport);
  updateMotionPreference();
  // Open on the default view with its own frame, target, and eye distance, if it sets any.
  setView(defaultView);
  // Open on the page's layout, and bring the page's controls and text to it, whichever
  // layout its markup starts in.
  if (initialLayout !== layout) setLayout(initialLayout);
  else { markLayout(layout); onLayoutChange(layout); }
  if (turntable) setTurning(true);
  renderer.render(scene, camera);
  document.querySelector<HTMLElement>("#loading")!.hidden = true;
  window.__buildingStudy = {
    ready: true,
    get modelName() { return models[0]!.building.name; },
    get modelNames() { return models.map((model) => model.building.name); },
    get triangleCount() { return models.reduce((total, model) => total + model.triangleCount, 0); },
    get layout() { return layout; },
    get projection() { return camera.isOrthographicCamera ? "orthographic" : "perspective"; },
    get zoom() { return camera.zoom; },
    get groundShadows() { return base.receiveShadow; },
    get activeView() { return activeView; },
    get selectedBuilding() { return selectedModel?.building.userData["buildingId"] || null; },
    get shadowBounds() {
      // Actual rendered geometry in the shadow camera's clip space, for coverage checks.
      const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      const point = new THREE.Vector3();
      for (const object of [...models.map((model) => model.building), base]) {
        object.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (!mesh.isMesh) return;
          const positions = mesh.geometry.getAttribute("position");
          for (let i = 0; i < positions.count; i += 1) {
            point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld).project(keyLight.shadow.camera);
            point.toArray().forEach((value, axis) => { min[axis] = Math.min(min[axis]!, value); max[axis] = Math.max(max[axis]!, value); });
          }
        });
      }
      return { min, max };
    },
    projectPoint(buildingId, coordinates) {
      const model = models.find((entry) => entry.building.userData["buildingId"] === buildingId)!;
      const point = model.building.localToWorld(new THREE.Vector3(...coordinates)).project(camera);
      return [(point.x + 1) / 2, (1 - point.y) / 2];
    },
    get cameraPosition() { return camera.position.toArray(); },
    get highlighted() { return Boolean(selectedModel); },
    get turning() { return turning; },
    get renderCount() { return renderer.info.render.frame; },
    get modelBounds() {
      return models.map((model) => {
        const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
        model.building.updateMatrixWorld(true);
        model.building.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (!mesh.isMesh) return;
          const positions = mesh.geometry.getAttribute("position"), point = new THREE.Vector3();
          for (let i = 0; i < positions.count; i += 1) {
            point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld).toArray().forEach((n, axis) => {
              min[axis] = Math.min(min[axis]!, n); max[axis] = Math.max(max[axis]!, n);
            });
          }
        });
        return { id: model.building.userData["buildingId"], min, max };
      });
    },
    get platformBounds() {
      base.geometry.computeBoundingBox();
      const { min, max } = base.geometry.boundingBox!;
      return { min: min.clone().add(base.position).toArray(), max: max.clone().add(base.position).toArray() };
    },
  };
  return { setLayout, setView, requestRender, buildingAt };
}
