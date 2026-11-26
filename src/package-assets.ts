import { cp, mkdir, readFile } from "node:fs/promises";
import { bootHostStyle, bootHtml, bootTree, escape, PLACEHOLDER_ATTRIBUTE } from "./skyline-boot.js";

/**
 * Copies the viewer's complete asset directory into a host application's static
 * directory. This module is for Node/Bun build scripts, never browser entrypoints.
 */
export async function copySkylineAssets(destination: string | URL): Promise<void> {
  await mkdir(destination, { recursive: true });
  await cp(new URL("../site/", import.meta.url), destination, { recursive: true });
}

/** A `<link>` that starts one of the viewer's loads with the page, rather than once it mounts. */
export interface SkylinePreload {
  /** `modulepreload` for the viewer's modules, `preload` for its stylesheets and fetched files. */
  readonly rel: "modulepreload" | "preload";
  readonly href: string;
  /** A `preload`'s destination: `style` for a stylesheet, `fetch` for what the viewer fetches. */
  readonly as?: "style" | "fetch";
  /**
   * Set on fetched files: the viewer fetches them in CORS mode, with same-origin credentials,
   * which only an anonymous-CORS preload matches.
   */
  readonly crossorigin?: "anonymous";
  /** Set on the stars, which show only after the first frame. */
  readonly fetchpriority?: "low";
}

export interface SkylinePreloadOptions {
  /**
   * Whether the page passes `mountSkyline` its own Three.js (the `three` option). Without it,
   * the list includes the engine copy in the assets, which the viewer then loads.
   */
  readonly three?: boolean;
}

// What the viewer loads to draw its first frame, in viewer-modules.json beside the assets
// (scripts/build/viewer-modules.ts).
interface ViewerModules { modules: string[]; engine: string | null }

/**
 * Every file a viewer mounted with these assets loads to draw its first frame, and its stars, as
 * links a host can put in the head of a page that mounts it, so they download alongside the
 * host's own code instead of after it. `assetsUrl` is the browser URL the viewer mounts with,
 * such as "/static/skyline/". Each link matches how the viewer requests its file, so the browser
 * reuses the preloaded response rather than fetching it again. Put the links only on pages that
 * mount a viewer within a few seconds of loading: the browser warns about preloads it never used.
 */
export async function skylinePreloads(assetsUrl: string, { three = false }: SkylinePreloadOptions = {}): Promise<SkylinePreload[]> {
  if (/[?#]/.test(assetsUrl)) throw new TypeError("Skyline assetsUrl must be a directory URL without a query or fragment.");
  const base = assetsUrl.endsWith("/") ? assetsUrl : `${assetsUrl}/`;
  const { modules, engine } = JSON.parse(await readFile(new URL("../site/viewer-modules.json", import.meta.url), "utf8")) as ViewerModules;
  const module = (file: string): SkylinePreload => ({ rel: "modulepreload", href: base + file });
  const fetched = (file: string): SkylinePreload => ({ rel: "preload", href: base + file, as: "fetch", crossorigin: "anonymous" });
  return [
    // The viewer's code, its stylesheets and the scene's markup head the chain the shell
    // starts; the module list and the modules it names follow.
    module("skyline-viewer.js"),
    { rel: "preload", href: `${base}study.css`, as: "style" },
    { rel: "preload", href: `${base}viewer.css`, as: "style" },
    fetched("skyline-3d.html"),
    fetched("viewer-modules.json"),
    ...modules.map(module),
    ...(three || !engine ? [] : [module(engine)]),
    { ...fetched("stars.svg"), fetchpriority: "low" },
  ];
}

/** `skylinePreloads` as `<link>` elements, one per line, for a page's head. */
export async function skylinePreloadLinks(assetsUrl: string, options: SkylinePreloadOptions = {}): Promise<string> {
  return (await skylinePreloads(assetsUrl, options))
    .map((link) => `<link${Object.entries(link).map(([name, value]) => ` ${name}="${escape(String(value))}"`).join("")}>`)
    .join("\n");
}

export interface SkylineBootOptions {
  /** The loading palette, as `mountSkyline`'s `theme`: dark by default, as for a greyscale viewer. */
  readonly theme?: "light" | "dark";
}

/**
 * The viewer's loading silhouette as static HTML, for a host to paint before its code runs:
 * an element that fills its parent, holding the silhouette in a declarative shadow root, styled
 * and animated without script. Place it in an element positioned and sized exactly like the
 * container the host mounts the viewer in, then pass that element to `mountSkyline` as
 * `placeholder`, which continues the animation in step and removes it. Matches the default
 * folded control bar. A browser without declarative shadow roots shows the backdrop alone.
 */
export function skylineBootMarkup({ theme = "dark" }: SkylineBootOptions = {}): string {
  if (theme !== "light" && theme !== "dark") throw new TypeError('Skyline theme must be "light" or "dark".');
  return `<div ${PLACEHOLDER_ATTRIBUTE} aria-hidden="true" style="${escape(bootHostStyle(theme))}"><template shadowrootmode="open">${bootHtml(bootTree(theme))}</template></div>`;
}
