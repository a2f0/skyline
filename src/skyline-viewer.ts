// The viewer's module, served with the assets as skyline-viewer.js: the shell
// (skyline-shell.ts) imports it and mounts the viewer into a shadow root, for a host's
// `mountSkyline` and for the site's own index.html alike. It composes, in that one root, what
// used to be a page of frames: the stars, the 3D skyline (skyline-3d.ts, from
// skyline-3d.html's markup), the original drawing, and, on the site's own page, its toolbar.
// They call each other directly; nothing is posted between documents.
import type { ViewerContext } from "./skyline-shell.js";
import { loadMarkup } from "./markup.js";
import { provideThree } from "./three-engine.js";

type Mode = "3d" | "original" | "enhanced" | "webgl";

// What each of the site toolbar's mode buttons shows, says and announces. The viewer opens
// on the 3D skyline; each toggle shows its mode and, pressed again, returns to it.
const home = { label: "3d skyline", title: "Return to the 3D skyline", status: "3D skyline displayed" };
const toggles = {
  original: { id: "toggle-skyline", label: "show original", title: "Compare with the original skyline SVG", status: "Original skyline displayed" },
  webgl: { id: "toggle-webgl", label: "show webgl", title: "Preview the WebGL skyline prototype", status: "WebGL skyline prototype displayed" },
  enhanced: { id: "toggle-enhanced", label: "show enhanced", title: "Show the enhanced interactive skyline drawing", status: "Enhanced interactive skyline displayed" },
} as const;

// The two prototypes the site's toolbar shows in place are pages of their own, as the
// studies are: the hover-scripted drawing and the WebGL prototype. Only the site's own
// index.html shows them, in frames; a host's viewer never does.
const prototypes = {
  enhanced: { src: "skyline-animated.svg", title: "Animated Chicago skyline at night" },
  webgl: { src: "skyline-webgl.html", title: "WebGL Chicago skyline prototype" },
} as const;

const SCENE_FAILURE = "The 3D preview could not load. Check that WebGL 2 is enabled, then reload. You can still compare the SVG or return to the skyline.";

function element<K extends keyof HTMLElementTagNameMap>(document: Document, tag: K, properties: Partial<HTMLElementTagNameMap[K]> = {}, attributes: Record<string, string> = {}): HTMLElementTagNameMap[K] {
  const created = Object.assign(document.createElement(tag), properties);
  for (const [name, value] of Object.entries(attributes)) created.setAttribute(name, value);
  return created;
}

export function mount(root: ShadowRoot, { assets, signal, controls, attribution, navigation, page, three }: ViewerContext): Promise<void> {
  const document = root.ownerDocument;
  const host = root.host as HTMLElement;
  const listening = { signal };
  // The host's engine, if it shares one, before the scene's code first loads.
  if (three) provideThree(three);
  // The scene's code and markup load together, while the stars and the controls show.
  const sceneCode = import("./skyline-3d.js");
  sceneCode.catch(() => {});
  const sceneMarkup = loadMarkup(new URL("skyline-3d.html", assets), signal);
  sceneMarkup.catch(() => {});

  const viewer = element(document, "div", { className: "skyline-viewer" });
  if (!navigation) viewer.dataset["embedded"] = "";
  const stars = element(document, "div", { className: "stars", id: "stars" }, { "aria-hidden": "true" });
  const scene = element(document, "div", { className: "skyline-3d", id: "skyline-3d-scene" });
  const drawing = element(document, "img", { className: "scene drawing", id: "drawing", alt: "Original Chicago skyline", hidden: true });
  const originalReturn = element(document, "button", { type: "button", className: "original-return", id: "return-skyline-3d", title: home.title, hidden: true, textContent: home.label });
  const embeddedOriginal = element(document, "button", { type: "button", className: "original-return", id: "embedded-original", title: toggles.original.title, hidden: true, textContent: toggles.original.label });
  const status = element(document, "p", { className: "visually-hidden", id: "status" }, { "aria-live": "polite" });
  viewer.append(stars, scene, drawing, originalReturn, embeddedOriginal, status);
  root.append(viewer);

  let mode: Mode = "3d";
  // Keep the drawing reachable until the first 3D frame succeeds, even if the scene's
  // markup or code never loads, and again if its graphics context is lost.
  let sceneUnavailable = true;
  const frames: Partial<Record<keyof typeof prototypes, HTMLIFrameElement>> = {};
  const toolbar = navigation ? createToolbar() : null;

  function updateView() {
    scene.hidden = mode !== "3d";
    if (mode === "original" && !drawing.getAttribute("src")) drawing.src = new URL("skyline-original-fit.svg", assets).href;
    drawing.hidden = mode !== "original";
    if (mode === "enhanced" || mode === "webgl") frames[mode] ??= createPrototype(mode);
    for (const [name, frame] of Object.entries(frames)) frame.hidden = name !== mode;
    originalReturn.hidden = mode !== "original";
    embeddedOriginal.hidden = navigation || mode !== "3d" || !sceneUnavailable;
    if (toolbar) {
      for (const [name, toggle] of Object.entries(toggles)) {
        const button = toolbar.querySelector<HTMLButtonElement>(`#${toggle.id}`)!, showing = name === mode;
        button.textContent = showing ? home.label : toggle.label;
        button.setAttribute("aria-pressed", String(showing));
        button.title = showing ? home.title : toggle.title;
      }
    }
  }
  function showMode(next: Mode) {
    mode = next;
    updateView();
    status.textContent = next === "3d" ? home.status : toggles[next].status;
  }
  // The scene's show original shortcut and the embedded button both open the drawing, and
  // focus its way back.
  function showOriginal() {
    if (mode !== "3d") return;
    showMode("original");
    originalReturn.focus({ preventScroll: true });
  }
  embeddedOriginal.addEventListener("click", showOriginal, listening);
  // Returning focuses the scene's own way to the drawing again: the shortcut where the bar
  // is open, the star where it is folded, or, while the scene can't take focus, a visible
  // way back to the drawing.
  originalReturn.addEventListener("click", () => {
    showMode("3d");
    const star = root.querySelector<HTMLButtonElement>("#menu-toggle");
    const focus = star?.getAttribute("aria-expanded") === "true" ? root.querySelector<HTMLButtonElement>("#show-original") : star;
    const target = !sceneUnavailable && focus?.matches(":enabled") ? focus : null;
    target?.focus({ preventScroll: true });
    if (!target || root.activeElement !== target) {
      (embeddedOriginal.hidden ? toolbar?.querySelector<HTMLButtonElement>(`#${toggles.original.id}`) : embeddedOriginal)?.focus({ preventScroll: true });
    }
  }, listening);
  updateView();

  // The stars come from stars.svg, the sky's own drawing, without its script: the viewer
  // places them and picks the twinkling ones itself.
  loadStars();

  // Fullscreen shows the viewer's element alone; F toggles it from anywhere in the viewer,
  // or, on the site's own page, from anywhere on the page.
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === host) await document.exitFullscreen();
      else await host.requestFullscreen();
    } catch {
      status.textContent = "Fullscreen is not available in this browser";
    }
  }
  function fullscreenShortcut(event: Event) {
    const key = event as KeyboardEvent;
    if (key.defaultPrevented || key.key?.toLowerCase() !== "f" || key.metaKey || key.ctrlKey || key.altKey) return;
    key.preventDefault();
    void toggleFullscreen();
  }
  (page ? document : root).addEventListener("keydown", fullscreenShortcut, listening);
  let fullscreen = false;
  document.addEventListener("fullscreenchange", () => {
    const now = document.fullscreenElement === host;
    if (now === fullscreen) return;
    fullscreen = now;
    const button = toolbar?.querySelector<HTMLButtonElement>("#fullscreen");
    if (button) {
      button.textContent = now ? "exit fullscreen" : "fullscreen";
      button.setAttribute("aria-pressed", String(now));
    }
    status.textContent = now ? "Fullscreen enabled" : "Fullscreen exited";
  }, listening);

  return startScene();

  async function startScene(): Promise<void> {
    let markup: Document;
    try {
      markup = await sceneMarkup;
    } catch (error) {
      if (signal.aborted) return new Promise(() => {});
      const message = element(document, "p", { className: "loading", textContent: SCENE_FAILURE }, { role: "status" });
      scene.append(message);
      throw error;
    }
    if (signal.aborted) return new Promise(() => {});
    // The scene's markup, set as its options ask before its first frame: the bar open, with
    // no fold, and the credit left out, as skyline-3d.html's own script does for its address.
    for (const child of markup.body.children) scene.append(document.importNode(child, true));
    if (controls === "open") {
      const toggle = scene.querySelector<HTMLButtonElement>("#menu-toggle")!;
      toggle.setAttribute("aria-expanded", "true");
      toggle.title = "Hide the controls";
      scene.querySelector(".control-bar")!.classList.add("open");
    }
    if (!attribution) scene.querySelector<HTMLElement>(".attribution")!.hidden = true;
    if (toolbar) insetScene(toolbar);
    // The scene's own lifetime: the viewer's, or shorter, if it fails to start.
    const sceneLife = new AbortController();
    signal.addEventListener("abort", () => sceneLife.abort(signal.reason), { once: true });
    try {
      const { startSkyline3d } = await sceneCode;
      if (signal.aborted) return new Promise(() => {});
      await new Promise<void>((resolve) => {
        startSkyline3d({
          root,
          frame: scene,
          assets,
          signal: sceneLife.signal,
          onShowOriginal: showOriginal,
          onReady() {
            sceneUnavailable = false;
            updateView();
            resolve();
          },
          onUnavailable() {
            sceneUnavailable = true;
            updateView();
          },
        });
      });
    } catch (error) {
      if (signal.aborted) return new Promise(() => {});
      sceneLife.abort(error);
      // As the scene's own page says it: its controls stay, disabled, and the drawing one
      // press away.
      scene.querySelector<HTMLElement>("#loading")!.textContent = SCENE_FAILURE;
      scene.querySelectorAll<HTMLButtonElement>("button").forEach((button) => { button.disabled = true; });
      throw error;
    }
  }

  async function loadStars() {
    try {
      const response = await fetch(new URL("stars.svg", assets), { signal });
      if (!response.ok) throw new Error(`Couldn't load stars.svg (${response.status}).`);
      const sky = new DOMParser().parseFromString(await response.text(), "image/svg+xml").documentElement;
      if (signal.aborted || sky.nodeName !== "svg") return;
      // Its title, description and element names describe the standalone file; here the sky
      // is decoration, and names would meet the viewer's own.
      sky.querySelectorAll("script, title, desc").forEach((node) => node.remove());
      for (const node of [sky, ...sky.querySelectorAll("[id]")]) node.removeAttribute("id");
      sky.removeAttribute("role");
      sky.removeAttribute("aria-labelledby");
      const svg = document.importNode(sky, true) as Element as SVGSVGElement;
      twinkle(svg);
      stars.append(svg);
    } catch (error) {
      // The sky is decoration: the viewer works on its black without it.
      if (!signal.aborted) console.warn("The skyline's stars could not load:", error);
    }
  }

  // Places the 96 stars at random and picks about a tenth to twinkle, each on its own slow
  // cycle; a cycle ends at a fixed brightness, so the next joins it smoothly.
  function twinkle(svg: SVGSVGElement) {
    const atmosphere = svg.querySelector(".atmosphere")!;
    const all = [...atmosphere.querySelectorAll<SVGCircleElement>("circle")];
    const randomize = (star: SVGElement) => {
      star.style.setProperty("--twinkle-dim", String(0.42 + Math.random() * 0.05));
      star.style.setProperty("--twinkle-peak", String(0.54 + Math.random() * 0.06));
      star.style.setProperty("--twinkle-afterglow", String(0.47 + Math.random() * 0.06));
    };
    for (const star of all) {
      star.setAttribute("cx", `${1 + Math.random() * 98}%`);
      star.setAttribute("cy", `${2 + Math.random() * 96}%`);
    }
    const count = Math.round(all.length * 0.1);
    for (let i = 0; i < count; i += 1) {
      const selected = i + Math.floor(Math.random() * (all.length - i));
      [all[i], all[selected]] = [all[selected]!, all[i]!];
      const star = all[i]!, duration = (60 + Math.random() * 40) / 1.5;
      star.style.setProperty("--twinkle-duration", `${duration}s`);
      star.style.setProperty("--twinkle-delay", `${-Math.random() * duration}s`);
      randomize(star);
      star.classList.add("twinkle");
    }
    atmosphere.addEventListener("animationiteration", (event) => {
      if ((event as AnimationEvent).animationName === "star-twinkle") randomize(event.target as SVGElement);
    }, listening);
  }

  // The site's toolbar, along the viewer's top.
  function createToolbar(): HTMLElement {
    const nav = element(document, "nav", { className: "controls" }, { "aria-label": "Skyline controls" });
    const button = (id: string, text: string, attributes: Record<string, string> = {}) =>
      element(document, "button", { type: "button", id, textContent: text }, { "aria-pressed": "false", ...attributes });
    const fullscreenButton = button("fullscreen", "fullscreen");
    fullscreenButton.hidden = !document.fullscreenEnabled;
    fullscreenButton.addEventListener("click", () => void toggleFullscreen(), listening);
    nav.append(fullscreenButton);
    for (const [name, toggle] of Object.entries(toggles) as [keyof typeof toggles, (typeof toggles)[keyof typeof toggles]][]) {
      const toggleButton = button(toggle.id, toggle.label);
      toggleButton.addEventListener("click", () => showMode(mode === name ? "3d" : name), listening);
      nav.append(toggleButton);
    }
    nav.append(
      element(document, "a", { href: new URL("building-study.html", assets).href, textContent: "3d building" }),
      element(document, "a", { href: new URL("skyline-study.html", assets).href, textContent: "skyline study" }),
    );
    const debugButton = button("debug-motion", "debug motion", { "aria-describedby": "stars-motion-status" });
    const motionStatus = element(document, "p", { className: "motion-status", id: "stars-motion-status" }, { role: "status" });
    nav.append(debugButton, motionStatus);
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    let debugMotion = false;
    const updateMotionStatus = () => {
      const preference = reducedMotion.matches ? "reduced" : "allowed";
      const animation = debugMotion ? (reducedMotion.matches ? "debug override active" : "debug animation") : (reducedMotion.matches ? "stars paused" : "stars twinkling");
      motionStatus.textContent = `System motion: ${preference} · ${animation}`;
      debugButton.textContent = debugMotion ? "stop debug" : "debug motion";
      debugButton.setAttribute("aria-pressed", String(debugMotion));
      debugButton.title = debugMotion
        ? "Return to the system motion setting"
        : "Preview slightly stronger brightness changes at the same gentle pace, even when reduced motion is enabled";
    };
    debugButton.addEventListener("click", () => {
      debugMotion = !debugMotion;
      stars.classList.toggle("debug-motion", debugMotion);
      updateMotionStatus();
    }, listening);
    reducedMotion.addEventListener("change", updateMotionStatus, listening);
    updateMotionStatus();
    viewer.append(nav);
    return nav;
  }

  // The toolbar lies over the scene's top, which floats a building's detail below it.
  function insetScene(nav: HTMLElement) {
    const inset = () => scene.style.setProperty("--viewer-controls", `${Math.max(0, Math.ceil(nav.getBoundingClientRect().bottom - scene.getBoundingClientRect().top))}px`);
    const resizing = new ResizeObserver(inset);
    resizing.observe(nav);
    resizing.observe(scene);
    signal.addEventListener("abort", () => resizing.disconnect(), { once: true });
  }

  // A prototype's page, in a frame of its own, shown in place the first time it is chosen.
  // Keys pressed inside it go to its own window, so F listens there too.
  function createPrototype(name: keyof typeof prototypes): HTMLIFrameElement {
    const frame = element(document, "iframe", { className: "scene", id: `${name}-scene`, title: prototypes[name].title, src: new URL(prototypes[name].src, assets).href });
    frame.addEventListener("load", () => {
      try {
        frame.contentWindow?.addEventListener("keydown", fullscreenShortcut, listening);
      } catch { /* A frame from another origin keeps its keys. */ }
    }, listening);
    viewer.insertBefore(frame, originalReturn);
    return frame;
  }
}
