import { createBuildingStudy } from "./study-viewer.js";
import { createGeographicSkyline } from "./skyline-scene.js";
import { createGeographicRoads } from "./models/skyline-geography.js";
import type { BuildingModel } from "./models/building-kit.js";
import { celebrations } from "./models/celebrations.js";

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
// All presets use the documented south-facing window billboard. A selected
// logo toggles off; another replaces it, so two messages never overlap.
const illuminated = models.filter((model) => model.illumination);
const celebrationStatus = document.querySelector<HTMLElement>("#celebration-status")!;
const celebrationAnnouncement = document.querySelector<HTMLElement>("#celebration-announcement")!;
const celebrationButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-celebration]")];
for (const button of celebrationButtons) {
  const preset = celebrations.find(({ id }) => id === button.dataset["celebration"]);
  if (!preset) throw new Error(`Unknown toolbar celebration: ${button.dataset["celebration"]}`);
  const message = preset.lines.join(" ");
  button.title = `${preset.label}: ${message}${preset.adapted ? " (adapted tribute)" : ""} · Blue Cross and Blue Shield Tower · click again to turn off`;
  button.disabled = illuminated.length === 0;
  button.addEventListener("click", () => {
    const next = button.getAttribute("aria-pressed") === "true" ? null : preset.id;
    illuminated.forEach((model) => model.illumination!.set(next));
    celebrationButtons.forEach((other) => other.setAttribute("aria-pressed", String(other.dataset["celebration"] === next)));
    celebrationStatus.hidden = false;
    celebrationStatus.textContent = next ? `${message} · Blue Cross and Blue Shield Tower${preset.adapted ? " · adapted tribute" : ""}` : "Celebratory lights off";
    celebrationAnnouncement.textContent = celebrationStatus.textContent;
    viewer.requestRender();
  });
}
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
// the star: clipped open from its `--fold` inset while it fades in, one beside the star
// slides out from it to its edge of the bar, and it folds back the same way before it hides. A toggle mid-way reverses the moving
// fold from where it is. Closing groups are inert at once, and focus inside them returns to
// the star first; reduced motion shows and hides them at once. Escape closes the toolbar from
// inside the bar.
const bar = document.querySelector<HTMLElement>(".control-bar")!;
const menuToggle = document.querySelector<HTMLButtonElement>("#menu-toggle")!;
// This shortcut belongs to the index viewer; the standalone scene has no drawing to
// switch to. Returning from the drawing keeps this frame and its camera intact.
const showOriginal = document.querySelector<HTMLButtonElement>("#show-original")!;
try {
  if (parent !== window && parent.document.querySelector<HTMLIFrameElement>("#skyline-3d-scene")?.contentWindow === window) {
    showOriginal.hidden = false;
    showOriginal.addEventListener("click", () => parent.postMessage({ type: "skyline:show-original" }, location.origin));
  }
} catch { /* A scene embedded on another origin has no viewer switch. */ }
const groups = [...bar.querySelectorAll<HTMLElement>(".button-group")];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
// The groups' folds while they move, and which way: toward open, or back toward closed.
const foldDuration = 300;
let folds: Animation[] = [];
let unfolding = false;
function unfold(group: HTMLElement) {
  // A group in the star's row starts against the star; one in a row under it opens in place.
  const star = menuToggle.getBoundingClientRect(), box = group.getBoundingClientRect();
  const beside = box.top < star.bottom && box.bottom > star.top;
  const shift = !beside ? 0 : box.right <= star.left ? star.left - box.right : box.left >= star.right ? star.right - box.left : 0;
  // Open, the clip stands off the group far enough to keep its buttons' focus rings.
  return group.animate([
    { clipPath: getComputedStyle(group).getPropertyValue("--fold").trim(), opacity: 0, translate: `${shift}px 0` },
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
// A fold measures its slide from the layout it starts in, so a resize settles it at once.
addEventListener("resize", () => folds.forEach((fold) => fold.finish()));
bar.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || menuToggle.getAttribute("aria-expanded") !== "true") return;
  event.preventDefault();
  menuToggle.focus();
  setMenu(false);
});

// Right-clicking a building, or a long press on it where the browser raises a context menu
// for one, as Chrome on Android does, opens its context menu at the pointer: the building's
// name over one item, which floats the building's detail over the skyline. A right-drag still pans, so the menu opens only for a press that stays put: on
// its release where the menu event comes with the press, as on macOS. Escape, Tab, a press
// elsewhere, the wheel, or a resize closes it.
const canvas = document.querySelector<HTMLCanvasElement>("#building")!;
const menu = document.querySelector<HTMLElement>("#building-menu")!;
const menuTitle = document.querySelector<HTMLElement>("#building-menu-title")!;
const detailLink = document.querySelector<HTMLAnchorElement>("#building-detail-link")!;
let menuBuilding = "";
let press: { x: number; y: number; mouse: boolean; down: boolean; moved: boolean } | null = null;
let pendingMenu: { building: BuildingModel; x: number; y: number } | null = null;
function openMenu(building: BuildingModel, x: number, y: number) {
  menuBuilding = building.building.userData["buildingId"];
  menuTitle.textContent = building.building.userData["geography"]?.name ?? building.building.name;
  detailLink.href = `building-detail.html?building=${encodeURIComponent(menuBuilding)}`;
  menu.hidden = false;
  // At the pointer, turned back from the window's right and bottom edges.
  const { width, height } = menu.getBoundingClientRect();
  menu.style.left = `${Math.max(4, x + width > innerWidth - 4 ? x - width : x)}px`;
  menu.style.top = `${Math.max(4, y + height > innerHeight - 4 ? y - height : y)}px`;
  detailLink.focus({ preventScroll: true });
}
function closeMenu() {
  pendingMenu = null;
  if (menu.hidden) return;
  if (menu.contains(document.activeElement)) canvas.focus({ preventScroll: true });
  menu.hidden = true;
}
window.addEventListener("pointerdown", (event) => { if (!menu.contains(event.target as Node)) closeMenu(); }, { capture: true });
canvas.addEventListener("pointerdown", (event) => {
  press = { x: event.clientX, y: event.clientY, mouse: event.pointerType === "mouse", down: true, moved: false };
});
window.addEventListener("pointermove", (event) => {
  if (press?.down && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 4) press.moved = true;
});
window.addEventListener("pointerup", () => {
  if (!press?.down) return;
  press.down = false;
  const pending = pendingMenu;
  pendingMenu = null;
  if (pending && !press.moved) openMenu(pending.building, pending.x, pending.y);
});
window.addEventListener("pointercancel", () => {
  if (press) press.down = false;
  pendingMenu = null;
});
canvas.addEventListener("contextmenu", (event) => {
  const building = viewer.buildingAt(event.clientX, event.clientY);
  if (!building) return closeMenu();
  event.preventDefault();
  if (press?.down && press.mouse) pendingMenu = { building, x: event.clientX, y: event.clientY };
  else if (!(press?.mouse && press.moved)) openMenu(building, event.clientX, event.clientY);
});
canvas.addEventListener("wheel", closeMenu, { passive: true });
window.addEventListener("resize", closeMenu);
window.addEventListener("blur", closeMenu);
menu.addEventListener("keydown", (event) => {
  if (event.key === "Escape" || event.key === "Tab") {
    event.preventDefault();
    closeMenu();
  } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
    event.preventDefault();
    detailLink.focus();
  }
});
detailLink.addEventListener("click", (event) => {
  closeMenu();
  // A modified click opens the detail's own page, as any link does.
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  openDetail(menuBuilding, menuTitle.textContent ?? "");
});

// The detail floats in a panel over the skyline, in a frame of its own. Each detail gets a
// fresh frame, so the page's history stays as it was, and closing the panel removes the frame
// and its 3D view. The skyline stays live around it, and another building's menu replaces the
// detail. Escape closes it from anywhere on the page or in the detail, unless an open menu or
// toolbar takes it first, and focus returns to the skyline.
const detailPanel = document.querySelector<HTMLDialogElement>("#building-detail")!;
const detailClose = document.querySelector<HTMLButtonElement>("#detail-close")!;
function openDetail(id: string, name: string) {
  detailPanel.querySelector("iframe")?.remove();
  const frame = document.createElement("iframe");
  frame.title = `${name} — Building Detail`;
  frame.src = `building-detail.html?building=${encodeURIComponent(id)}`;
  frame.addEventListener("load", () => frame.contentWindow?.addEventListener("keydown", closeDetailOnEscape));
  detailPanel.append(frame);
  if (!detailPanel.open) detailPanel.show();
  detailClose.focus();
}
function closeDetailOnEscape(event: KeyboardEvent) {
  if (event.key !== "Escape" || event.defaultPrevented || !detailPanel.open) return;
  event.preventDefault();
  detailPanel.close();
}
window.addEventListener("keydown", closeDetailOnEscape);
detailPanel.addEventListener("close", () => {
  detailPanel.querySelector("iframe")?.remove();
  canvas.focus({ preventScroll: true });
});
detailClose.addEventListener("click", () => detailPanel.close());
