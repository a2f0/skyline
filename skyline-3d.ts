import { createBuildingStudy } from "./study-viewer.js";
import { createGeographicSkyline } from "./skyline-comparison.js";
import { createGeographicRoads } from "./models/skyline-geography.js";

// The skyline viewer's full-screen 3D mode: every mapped building, seen through the
// drawing's own camera and framed as index.html frames the drawing, so each tower stands
// where its drawn one does until the camera moves.
const { models, ground, settings, drawingView, comparisonViews, labels } = createGeographicSkyline();
// The mapped streets show as grey roadways across the whole platform. The study's
// centerlines, footprint outlines and grid are annotations; the outlines return with the
// footprints control.
ground.group.children.forEach((child) => { child.visible = false; });
const { platform } = settings;
const roads = createGeographicRoads({
  x: [platform.x - platform.width / 2, platform.x + platform.width / 2],
  z: [platform.z - platform.depth / 2, platform.z + platform.depth / 2],
}, 0x2c2c2c);
const { azimuth } = drawingView;
const viewer = createBuildingStudy({
  models,
  extras: [ground.group, roads],
  defaultView: "skyline",
  // The skyline study's presets, so reduced motion, which stops dragging, still leaves
  // views to step between, and its ground plan and height comparison, which name each
  // building.
  views: {
    skyline: drawingView,
    quarter: { azimuth: azimuth + 0.3, polar: Math.PI / 2 - 0.28, label: "three-quarter view" },
    side: { azimuth: azimuth + Math.PI / 2, polar: Math.PI / 2 - 0.14, label: "side view" },
    ...comparisonViews,
  },
  labels,
  fov: 6,
  ...settings,
  platform: { ...settings.platform, color: 0x161616 },
  near: 10,
  far: 10000,
  minimumDistanceRatio: 0.1,
  maximumZoom: 24,
  enablePan: true,
  minimumCameraHeight: 1,
});
// The control bar's ground toggles, each pressed while what it toggles shows.
for (const [id, object] of [["streets", roads], ["footprints", ground.footprints]] as const) {
  const button = document.querySelector<HTMLButtonElement>(`#${id}`)!;
  button.addEventListener("click", () => {
    object.visible = !object.visible;
    button.setAttribute("aria-pressed", String(object.visible));
    viewer.requestRender();
  });
}
// The star in the middle of the bar opens and closes the toolbar. Each group unfolds from
// the star's side of it, clipped open from its `--fold` inset while it fades in and slides
// out, and folds back the same way before it hides. A toggle mid-way reverses the moving
// fold from where it is. Closing groups are inert at once, and focus inside them returns to
// the star first; reduced motion shows and hides them at once. Escape closes the toolbar from
// inside the bar.
const bar = document.querySelector<HTMLElement>(".control-bar")!;
const menuToggle = document.querySelector<HTMLButtonElement>("#menu-toggle")!;
const groups = [...bar.querySelectorAll<HTMLElement>(".button-group")];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
// The groups' folds while they move, and which way: toward open, or back toward closed.
const foldDuration = 300;
let folds: Animation[] = [];
let unfolding = false;
function unfold(group: HTMLElement) {
  const style = getComputedStyle(group);
  // Open, the clip stands off the group far enough to keep its buttons' focus rings.
  return group.animate([
    { clipPath: style.getPropertyValue("--fold").trim(), opacity: 0, translate: `${style.getPropertyValue("--fold-shift").trim()} 0` },
    { clipPath: "inset(-4px)", opacity: 1, translate: "0 0" },
  ], { duration: foldDuration, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)", fill: "both" });
}
function setMenu(open: boolean) {
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.title = open ? "Hide the controls" : "Show the controls";
  if (!open && groups.some((group) => group.contains(document.activeElement))) menuToggle.focus();
  groups.forEach((group) => { group.inert = !open; });
  if (open) bar.classList.add("open");
  if (reducedMotion.matches) {
    folds.forEach((fold) => fold.cancel());
    folds = [];
    bar.classList.toggle("open", open);
    return;
  }
  // Reverse a fold still moving the other way; otherwise start a fresh one from its end. A
  // fold that has yet to leave its starting end, toggled back before its first frame, would
  // seek to its far end on reverse(), so it settles where it stands instead.
  if (folds.length && folds.every((fold) => fold.playState === "running" || fold.playState === "paused")) {
    if (unfolding !== open) {
      const unmoved = folds.every((fold) => { const time = Number(fold.currentTime ?? 0); return unfolding ? time <= 0 : time >= foldDuration; });
      if (unmoved) {
        folds.forEach((fold) => fold.cancel());
        folds = [];
        unfolding = open;
        bar.classList.toggle("open", open);
        return;
      }
      folds.forEach((fold) => fold.reverse());
    }
  } else {
    folds.forEach((fold) => fold.cancel());
    folds = groups.map(unfold);
    if (!open) folds.forEach((fold) => fold.reverse());
  }
  unfolding = open;
  const moving = folds;
  void Promise.allSettled(moving.map((fold) => fold.finished)).then(() => {
    if (folds !== moving || (menuToggle.getAttribute("aria-expanded") === "true") !== open) return;
    folds.forEach((fold) => fold.cancel());
    folds = [];
    if (!open) bar.classList.remove("open");
  });
}
menuToggle.addEventListener("click", () => setMenu(menuToggle.getAttribute("aria-expanded") !== "true"));
bar.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || menuToggle.getAttribute("aria-expanded") !== "true") return;
  menuToggle.focus();
  setMenu(false);
});
