import { createBuildingStudy, frameBox } from "./study-viewer.js";
import { createGeographicSkyline } from "./skyline-scene.js";
import { createGeographicRoads } from "./models/skyline-geography.js";
import type { BuildingModel } from "./models/building-kit.js";
import { celebrations, type CelebrationId } from "./models/celebrations.js";
import { createSkylineColour } from "./models/colour-materials.js";
import { loadMarkup, loadStylesheet } from "./markup.js";

export interface SkylineSceneOptions {
  /** The scene's markup: skyline-3d.html's own document, or the viewer's shadow root. */
  readonly root: Document | ShadowRoot;
  /**
   * The scene's box, which holds its menus and tooltip: the page's body, or the viewer's
   * scene element.
   */
  readonly frame: HTMLElement;
  /** The directory the site's files are served from; building details load from it. */
  readonly assets: URL;
  /** Aborts when the scene leaves; it then releases everything it holds. */
  readonly signal: AbortSignal;
  /** Shows the control bar's show original shortcut, which calls this. */
  readonly onShowOriginal?: (() => void) | undefined;
  /** The first frame has rendered. */
  readonly onReady?: (() => void) | undefined;
  /** The graphics context was lost. */
  readonly onUnavailable?: (() => void) | undefined;
}

// The skyline viewer's full-screen 3D mode: every mapped building, seen through the
// drawing's own camera and framed as the viewer frames the drawing, so each tower stands
// where its drawn one does until the camera moves. It renders into skyline-3d.html's own
// document, or into the viewer's shadow root, from the same markup.
export function startSkyline3d({ root, frame, assets, signal, onShowOriginal, onReady, onUnavailable }: SkylineSceneOptions): void {
  const document = root instanceof Document ? root : root.ownerDocument;
  const listening = { signal };
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
  // The study renders its first frame as it starts; the scene says so once its controls,
  // menus and detail are wired too, at the end.
  const viewer = createBuildingStudy({
    root,
    frame,
    signal,
    onUnavailable,
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
    // Twice the viewer's default reach, so the whole mapped city sits well inside the frame
    // from every view.
    maximumDistanceRatio: 4,
    minimumZoom: 0.25,
    maximumZoom: 24,
    enablePan: true,
    minimumCameraHeight: 1,
  });
  // The colour trial's layer (models/colour-materials.ts), which the colour toggle turns on.
  const colour = createSkylineColour(models);
  // A toolbar badge applies one celebration across the skyline, using each
  // building's own supported wording. Context menus change only their building.
  const illuminated = models.filter((model) => model.illumination);
  const celebrationStatus = root.querySelector<HTMLElement>("#celebration-status")!;
  const celebrationAnnouncement = root.querySelector<HTMLElement>("#celebration-announcement")!;
  const celebrationButtons = [...root.querySelectorAll<HTMLButtonElement>("[data-celebration]")];
  function setCelebration(targets: readonly BuildingModel[], next: CelebrationId | null) {
    targets.forEach((model) => model.illumination!.set(model.illumination!.presets.some(({ id }) => id === next) ? next : null));
    colour.refresh();
    for (const button of celebrationButtons) {
      const eligible = illuminated.filter((model) => model.illumination!.presets.some(({ id }) => id === button.dataset["celebration"]));
      const active = eligible.filter((model) => model.illumination!.active === button.dataset["celebration"]).length;
      button.setAttribute("aria-pressed", active === 0 ? "false" : active === eligible.length ? "true" : "mixed");
    }
    celebrationStatus.hidden = false;
    celebrationStatus.textContent = targets.map((model) => {
      const preset = model.illumination!.presets.find(({ id }) => id === model.illumination!.active);
      const name = model.building.userData["geography"]?.name ?? model.building.name;
      return preset ? `${preset.lines.join(" ")} · ${name}${preset.adapted ? " · adapted tribute" : ""}` : `Celebratory lights off · ${name}`;
    }).join("; ");
    celebrationAnnouncement.textContent = celebrationStatus.textContent;
    viewer.requestRender();
  }
  for (const button of celebrationButtons) {
    const preset = celebrations.find(({ id }) => id === button.dataset["celebration"]);
    if (!preset) throw new Error(`Unknown toolbar celebration: ${button.dataset["celebration"]}`);
    const displays = illuminated.flatMap((model) => {
      const message = model.illumination!.presets.find(({ id }) => id === preset.id);
      return message ? [`${message.lines.join(" ")}${message.adapted ? " (adapted tribute)" : ""} · ${model.building.userData["geography"]?.name ?? model.building.name}`] : [];
    });
    button.title = `${preset.label}: ${displays.join("; ")} · click to light all; click again to turn off`;
    // A badge no mapped building can display is left out rather than greyed out.
    button.hidden = displays.length === 0;
    button.addEventListener("click", () => {
      const next = button.getAttribute("aria-pressed") === "true" ? null : preset.id;
      const targets = next === null ? illuminated.filter((model) => model.illumination!.active === preset.id) : illuminated;
      setCelebration(targets, next);
    }, listening);
  }
  // The control bar's ground toggles, each pressed while what it toggles shows.
  for (const [id, object] of [["streets", roads], ["footprints", ground.footprints]] as const) {
    const button = root.querySelector<HTMLButtonElement>(`#${id}`)!;
    button.addEventListener("click", () => {
      object.visible = !object.visible;
      button.setAttribute("aria-pressed", String(object.visible));
      viewer.requestRender();
    }, listening);
  }
  // The colour trial's toggle, pressed while the buildings show their materials' colours over
  // the greys, which it restores exactly when pressed again.
  const colourButton = root.querySelector<HTMLButtonElement>("#colour")!;
  colourButton.addEventListener("click", () => {
    colour.set(!colour.enabled);
    colourButton.setAttribute("aria-pressed", String(colour.enabled));
    viewer.requestRender();
  }, listening);
  // The star in the middle of the bar opens and closes the toolbar. Each group unfolds from
  // the star: clipped open from its `--fold` inset while it fades in, one beside the star
  // slides out from it to its edge of the bar, and it folds back the same way before it hides. A toggle mid-way reverses the moving
  // fold from where it is. Closing groups are inert at once, and focus inside them returns to
  // the star first; reduced motion shows and hides them at once. Escape closes the toolbar from
  // inside the bar.
  const bar = root.querySelector<HTMLElement>(".control-bar")!;
  const menuToggle = root.querySelector<HTMLButtonElement>("#menu-toggle")!;
  // This shortcut belongs to the viewer; the standalone scene has no drawing to switch to.
  // Returning from the drawing keeps this scene and its camera intact.
  const showOriginal = root.querySelector<HTMLButtonElement>("#show-original")!;
  if (onShowOriginal) {
    showOriginal.hidden = false;
    showOriginal.addEventListener("click", onShowOriginal, listening);
  }
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
    if (!open && groups.some((group) => group.contains(root.activeElement))) menuToggle.focus({ preventScroll: true });
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
  menuToggle.addEventListener("click", () => setMenu(menuToggle.getAttribute("aria-expanded") !== "true"), listening);
  bar.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || menuToggle.getAttribute("aria-expanded") !== "true") return;
    event.preventDefault();
    menuToggle.focus({ preventScroll: true });
    setMenu(false);
  }, listening);

  // Right-clicking a building, or a long press on it where the browser raises a context menu
  // for one, as Chrome on Android does, opens its context menu at the pointer: the building's
  // name over its detail link and available lighting choices. A right-drag still pans, so the menu opens only for a press that stays put: on
  // its release where the menu event comes with the press, as on macOS. Escape, Tab, a press
  // elsewhere, the wheel, or a resize closes it.
  const canvas = root.querySelector<HTMLCanvasElement>("#building")!;
  const menu = root.querySelector<HTMLElement>("#building-menu")!;
  const menuTitle = root.querySelector<HTMLElement>("#building-menu-title")!;
  const detailLink = root.querySelector<HTMLAnchorElement>("#building-detail-link")!;
  const lightingMenu = root.querySelector<HTMLElement>("#building-lighting-menu")!;
  let menuBuilding = "";
  let press: { x: number; y: number; mouse: boolean; down: boolean; moved: boolean } | null = null;
  let pendingMenu: { building: BuildingModel; x: number; y: number } | null = null;
  function openMenu(building: BuildingModel, x: number, y: number) {
    menuBuilding = building.building.userData["buildingId"];
    menuTitle.textContent = building.building.userData["geography"]?.name ?? building.building.name;
    detailLink.href = new URL(`building-detail.html?building=${encodeURIComponent(menuBuilding)}`, assets).href;
    lightingMenu.replaceChildren();
    lightingMenu.hidden = !building.illumination;
    if (building.illumination) {
      const choices = [
        { id: null, label: "Lights off", title: "Turn off this building's celebratory lights" },
        ...building.illumination.presets.map((preset) => ({
          id: preset.id,
          label: `${preset.label} · ${preset.lines.join(" ")}${preset.adapted ? " (adapted)" : ""}`,
          title: `${preset.label} lighting${preset.adapted ? " · adapted tribute" : ""} · select again to turn off`,
        })),
      ];
      for (const choice of choices) {
        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute("role", "menuitemradio");
        button.setAttribute("aria-checked", String(building.illumination.active === choice.id));
        button.tabIndex = -1;
        button.dataset["lighting"] = choice.id ?? "off";
        button.textContent = choice.label;
        button.title = choice.title;
        button.addEventListener("click", () => {
          setCelebration([building], building.illumination!.active === choice.id ? null : choice.id);
          closeMenu();
        });
        lightingMenu.append(button);
      }
    }
    menu.hidden = false;
    menu.scrollTop = 0;
    // At the pointer, turned back from the scene's right and bottom edges, in the scene's own
    // CSS pixels.
    const width = menu.offsetWidth, height = menu.offsetHeight, box = frameBox(frame);
    const left = (x - box.left) / box.scaleX, top = (y - box.top) / box.scaleY;
    menu.style.left = `${Math.max(4, left + width > box.width - 4 ? left - width : left)}px`;
    menu.style.top = `${Math.max(4, top + height > box.height - 4 ? top - height : top)}px`;
    detailLink.focus({ preventScroll: true });
  }
  function closeMenu() {
    pendingMenu = null;
    if (menu.hidden) return;
    if (menu.contains(root.activeElement)) canvas.focus({ preventScroll: true });
    menu.hidden = true;
  }
  // A press anywhere else on the page closes the menu. The window cannot see inside shadow
  // roots, the viewer's or a host's closed one around it, so the scene's own root marks a
  // press on the menu as it passes, and the window closes the menu for any other.
  let menuPress: Event | null = null;
  root.addEventListener("pointerdown", (event) => { if (event.composedPath().includes(menu)) menuPress = event; }, { capture: true, signal });
  window.addEventListener("pointerdown", (event) => {
    if (event !== menuPress) closeMenu();
    menuPress = null;
  }, listening);
  canvas.addEventListener("pointerdown", (event) => {
    press = { x: event.clientX, y: event.clientY, mouse: event.pointerType === "mouse", down: true, moved: false };
  }, listening);
  window.addEventListener("pointermove", (event) => {
    if (press?.down && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 4) press.moved = true;
  }, listening);
  window.addEventListener("pointerup", () => {
    if (!press?.down) return;
    press.down = false;
    const pending = pendingMenu;
    pendingMenu = null;
    if (pending && !press.moved) openMenu(pending.building, pending.x, pending.y);
  }, listening);
  window.addEventListener("pointercancel", () => {
    if (press) press.down = false;
    pendingMenu = null;
  }, listening);
  canvas.addEventListener("contextmenu", (event) => {
    const building = viewer.buildingAt(event.clientX, event.clientY);
    if (!building) return closeMenu();
    event.preventDefault();
    if (press?.down && press.mouse) pendingMenu = { building, x: event.clientX, y: event.clientY };
    else if (!(press?.mouse && press.moved)) openMenu(building, event.clientX, event.clientY);
  }, listening);
  canvas.addEventListener("wheel", closeMenu, { passive: true, signal });
  window.addEventListener("blur", closeMenu, listening);
  // A resize of the shown scene closes the menu, and settles a fold at once, since a fold
  // measures its slide from the layout it starts in. The scene first appearing, or appearing
  // again after the drawing, changes nothing that is open: its notice can come late, after a
  // menu has opened.
  let shown: DOMRectReadOnly | null = null;
  const resizing = new ResizeObserver(([entry]) => {
    const size = entry!.contentRect;
    if (shown?.width && shown.height && (shown.width !== size.width || shown.height !== size.height)) {
      closeMenu();
      folds.forEach((fold) => fold.finish());
    }
    shown = size;
  });
  resizing.observe(frame);
  // Released as soon as it exists, so a scene that fails part way lets it go too.
  signal.addEventListener("abort", () => {
    resizing.disconnect();
    folds.forEach((fold) => fold.cancel());
    folds = [];
  }, { once: true });
  menu.addEventListener("keydown", (event) => {
    if (event.key === "Escape" || event.key === "Tab") {
      event.preventDefault();
      closeMenu();
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const items = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemradio"]')];
      const index = items.findIndex((item) => item === root.activeElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1
        : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      const item = items[next];
      if (!item) return;
      // Focus without scrolling, which could scroll the host page, then bring the item into
      // the menu's own view, in the menu's own CSS pixels, which a host's transform leaves
      // alone. The menu is the item's offset parent.
      item.focus({ preventScroll: true });
      if (item.offsetTop < menu.scrollTop) menu.scrollTop = item.offsetTop;
      else if (item.offsetTop + item.offsetHeight > menu.scrollTop + menu.clientHeight) menu.scrollTop = item.offsetTop + item.offsetHeight - menu.clientHeight;
    }
  }, listening);
  detailLink.addEventListener("click", (event) => {
    closeMenu();
    // A modified click opens the detail's own page, as any link does.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openDetail(menuBuilding, menuTitle.textContent ?? "");
  }, listening);

  // The detail floats in a panel over the skyline, in a shadow root of its own, so its markup
  // and its study's element names stay apart from the scene's, as a frame once kept them. Each
  // detail gets a fresh one, so the page's history stays as it was, and closing the panel
  // releases it and its 3D view. The skyline stays live around it, and another building's menu
  // replaces the detail. Escape closes it from anywhere in the scene or the detail, unless an
  // open menu or toolbar takes it first, and focus returns to the skyline.
  const detailPanel = root.querySelector<HTMLElement>("#building-detail")!;
  const detailClose = root.querySelector<HTMLButtonElement>("#detail-close")!;
  let detail: AbortController | null = null;
  function clearDetail() {
    detail?.abort();
    detail = null;
    detailPanel.querySelector(".detail-host")?.remove();
  }
  function openDetail(id: string, name: string) {
    clearDetail();
    const controller = new AbortController();
    detail = controller;
    const host = document.createElement("div");
    host.className = "detail-host";
    const detailRoot = host.attachShadow({ mode: "open" });
    detailPanel.setAttribute("aria-label", `${name} — Building Detail`);
    detailPanel.append(host);
    detailPanel.hidden = false;
    detailClose.focus({ preventScroll: true });
    const page = new URL(`building-detail.html?building=${encodeURIComponent(id)}`, assets);
    const stylesheet = loadStylesheet(detailRoot, new URL("study.css", assets));
    Promise.all([loadMarkup(page, controller.signal), import("./building-detail.js"), stylesheet]).then(([markupPage, { showBuildingDetail }]) => {
      const markup = markupPage.querySelector<HTMLElement>(".detail-root");
      if (controller.signal.aborted) return;
      if (!markup) throw new Error(`${page.pathname} has no building detail.`);
      // The panel names the detail and closes it, so the detail leaves out its own links.
      markup.classList.add("framed");
      detailRoot.append(document.importNode(markup, true));
      showBuildingDetail({ root: detailRoot, id, frame: detailRoot.querySelector<HTMLElement>(".detail-root")!, signal: controller.signal });
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      // A detail that fails part way is released at once, renderer and listeners included,
      // rather than when the panel closes.
      controller.abort(error);
      console.error(error);
      const message = document.createElement("p");
      message.className = "loading";
      message.setAttribute("role", "status");
      message.textContent = "The building detail could not load. Check that WebGL 2 is enabled, then reload.";
      detailRoot.querySelector(".detail-root")?.remove();
      detailRoot.append(message);
    });
  }
  function closeDetail() {
    if (detailPanel.hidden) return;
    clearDetail();
    detailPanel.hidden = true;
    canvas.focus({ preventScroll: true });
  }
  function closeDetailOnEscape(event: Event) {
    if ((event as KeyboardEvent).key !== "Escape" || event.defaultPrevented || detailPanel.hidden) return;
    event.preventDefault();
    closeDetail();
  }
  root.addEventListener("keydown", closeDetailOnEscape, listening);
  detailClose.addEventListener("click", closeDetail, listening);

  signal.addEventListener("abort", clearDetail, { once: true });
  onReady?.();
}
