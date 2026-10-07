// Mounts the viewer into a shadow root in the host's document: the shell that both the
// package's `mountSkyline` (skyline-package.ts) and the site's own index.html
// (viewer-page.ts) use. It validates the assets URL, makes the element and its shadow root,
// loads the viewer's stylesheets and its module from the assets, and owns the instance's
// lifetime. Importing it never touches the DOM.
//
// The viewer module (skyline-viewer.ts, served as skyline-viewer.js) renders only inside the
// root it is given, resolves every URL from `ViewerContext.assets`, and releases what it holds
// when `ViewerContext.signal` aborts.
import type { SkylineThree } from "./three-engine.js";

/** What the viewer module is told when it mounts. */
export interface ViewerContext {
  /** The slash-terminated directory the assets are served from. */
  readonly assets: URL;
  /**
   * Aborts when the instance is destroyed, or the viewer fails to start. The viewer then
   * releases everything it holds: its WebGL contexts, animation frames, observers, listeners
   * outside its root and pending loads. The shell removes the DOM.
   */
  readonly signal: AbortSignal;
  /** Start the 3D scene's control bar open, rather than folded behind its star. */
  readonly controls: "open" | "closed";
  /** Show the OpenStreetMap credit with the scene's controls. */
  readonly attribution: boolean;
  /**
   * The site's own toolbar, along the viewer's top: fullscreen, the drawings, the WebGL
   * prototype, the studies and the stars' debug motion. Only the site's index.html shows it.
   */
  readonly navigation: boolean;
  /** The viewer is its page's whole content, so the page's keys are its keys. */
  readonly page: boolean;
  /** The host's Three.js, for the scene to share (three-engine.ts). */
  readonly three?: SkylineThree | PromiseLike<SkylineThree> | undefined;
}

/** What the viewer module exports. */
export interface ViewerModule {
  /**
   * Renders the viewer into `root`, whose stylesheets have loaded, and settles once the 3D
   * skyline has drawn its first frame: a rejection is a scene that can't start, and the
   * viewer then says why in place and keeps the drawing one press away.
   */
  mount(root: ShadowRoot, context: ViewerContext): Promise<void>;
}

/** A mounted viewer. */
export interface SkylineInstance {
  /**
   * The element holding the viewer, appended to the container. The viewer renders into its
   * open shadow root, which keeps the viewer's styles and the host's apart. It is a region
   * named by the `title` option, filling the container, and is `aria-busy` until `ready`
   * settles.
   */
  readonly element: HTMLElement;
  /**
   * Resolves once the 3D skyline has drawn its first frame; replaces an iframe's `load`
   * event. Rejects when it can't start, as when its assets fail to load or WebGL is
   * unavailable: the viewer then says why, in place, and still offers the original drawing
   * if its own code loaded. Stays pending if the instance is destroyed first.
   */
  readonly ready: Promise<void>;
  /**
   * Removes the viewer and releases its WebGL contexts, animation frames, observers,
   * listeners, timers and pending loads. Calling it again does nothing.
   */
  destroy(): void;
}

export interface ViewerOptions extends Omit<ViewerContext, "assets" | "signal"> {
  /** The assets' directory; relative URLs resolve against the container's document. */
  readonly assetsUrl: string | URL;
  /** The viewer's accessible name: `element` is a region with this label. */
  readonly title: string;
}

// The viewer's code and styles, relative to the assets.
const VIEWER = "skyline-viewer.js";
const STYLESHEETS = ["study.css", "viewer.css"];

/** The validated, slash-terminated directory the assets are served from. */
export function assetsBase(document: Document, assetsUrl: string | URL): URL {
  const base = new URL(assetsUrl, document.baseURI);
  if (base.protocol !== "http:" && base.protocol !== "https:") throw new TypeError("Skyline assets must be served over HTTP or HTTPS.");
  if (base.search || base.hash) throw new TypeError("Skyline assetsUrl must be a directory URL without a query or fragment.");
  if (!base.pathname.endsWith("/")) base.pathname += "/";
  return base;
}

/**
 * Imports the viewer module from the assets. Hosts bundle this file, but the module is
 * served with the assets, so the comments ask webpack, Turbopack and Vite to leave the
 * import to the browser; Rollup, esbuild and Bun leave an import of a variable alone.
 */
function importViewer(url: string): Promise<ViewerModule> {
  return import(/* webpackIgnore: true */ /* @vite-ignore */ /* turbopackIgnore: true */ url);
}

/** Resolves once `link` has loaded its stylesheet. */
function loaded(link: HTMLLinkElement): Promise<void> {
  return new Promise((resolve, reject) => {
    link.addEventListener("load", () => resolve(), { once: true });
    link.addEventListener("error", () => reject(new Error(`Couldn't load ${link.href}.`)), { once: true });
  });
}

// Set on the element itself, where it outranks the host page's rules: `all: initial` keeps
// the host's rules for its elements (a `div` or `*` rule) off it, so nothing they set is
// inherited into the viewer, `direction` (which `all` leaves) keeps a right-to-left page from
// mirroring the viewer's layout, and the rest sizes it to fill the container.
const HOST_STYLE = "all:initial;direction:ltr;display:block;position:relative;isolation:isolate;width:100%;height:100%;overflow:hidden";

// The failure message's own look, since the viewer's stylesheets may be what failed.
const FAILURE_STYLE = "box-sizing:border-box;height:100%;margin:0;padding:24px;background:#000;color:#aaa;font:12px/1.5 ui-monospace,monospace";

/** Shows why the viewer couldn't start, in place of the viewer. */
function showFailure(root: ShadowRoot, error: unknown): void {
  const message = root.ownerDocument.createElement("p");
  message.style.cssText = FAILURE_STYLE;
  message.setAttribute("role", "alert");
  message.textContent = `The Chicago skyline couldn't start: ${error instanceof Error ? error.message : String(error)}`;
  root.replaceChildren(...[...root.querySelectorAll("link")].filter((link) => link.sheet), message);
}

/**
 * Mounts the viewer in a new element appended to `container`, and returns at once: the
 * element is in place, and `ready` settles once the 3D skyline shows or can't start.
 */
export function mountViewer(container: HTMLElement, { assetsUrl, title, ...options }: ViewerOptions): SkylineInstance {
  const document = container.ownerDocument;
  const assets = assetsBase(document, assetsUrl);
  const element = document.createElement("div");
  element.style.cssText = HOST_STYLE;
  element.setAttribute("role", "region");
  element.setAttribute("aria-label", title);
  element.setAttribute("aria-busy", "true");
  const root = element.attachShadow({ mode: "open" });
  const stylesheets = STYLESHEETS.map((name) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = new URL(name, assets).href;
    return link;
  });
  root.append(...stylesheets);
  container.append(element);

  const controller = new AbortController();
  let destroyed = false, mounted = false;
  const context: ViewerContext = { ...options, assets, signal: controller.signal };
  const ready = new Promise<void>((resolve, reject) => {
    Promise.all([importViewer(new URL(VIEWER, assets).href), ...stylesheets.map(loaded)])
      .then(async ([viewer]) => {
        if (destroyed) return;
        mounted = true;
        await viewer.mount(root, context);
      })
      .then(
        () => {
          if (destroyed) return;
          element.removeAttribute("aria-busy");
          resolve();
        },
        (error: unknown) => {
          if (destroyed) return;
          element.removeAttribute("aria-busy");
          // A viewer that mounted says why its scene can't start, and keeps its drawing;
          // one that never loaded is replaced by the reason.
          if (!mounted) {
            controller.abort(error);
            showFailure(root, error);
          }
          console.error("The Chicago skyline couldn't start:", error);
          reject(error);
        },
      );
  });
  // The element and the console report a failure, so a host that ignores `ready` sees no
  // unhandled rejection.
  ready.catch(() => {});

  return {
    element,
    ready,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      controller.abort(new DOMException("The Chicago skyline was destroyed.", "AbortError"));
      element.remove();
    },
  };
}
