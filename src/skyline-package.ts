// The browser entrypoint of the @a2f0/skyline package: mounts the viewer in a host-owned
// container, inside a shadow root in the host's own document. Importing it never touches the
// DOM, so server rendering and lazy loading are safe. docs/package.md describes the package.
import { mountViewer, type SkylineInstance } from "./skyline-shell.js";
import type { SkylineThree } from "./three-engine.js";

export type { BuildingModel, Vec2, Vec3 } from "./models/building-kit.js";
export type { FitBox, PlatformOptions, ShadowCameraOptions, StudyView, StudyLayout, StudyLabel } from "./study-types.js";
export type { GeographicSkyline } from "./skyline-scene.js";
export type { SkylineInstance } from "./skyline-shell.js";
export type { SkylineThree } from "./three-engine.js";

export interface SkylineOptions {
  /**
   * The directory serving the package's viewer assets, as copied by `copySkylineAssets`
   * from `@a2f0/skyline/build`; for example "/static/skyline/". Relative URLs resolve
   * against the page. The viewer's code, styles, drawings and models load from it.
   */
  readonly assetsUrl: string | URL;
  /** The viewer's accessible name: `element` is a region with this label. */
  readonly title?: string;
  /** Start the 3D scene's control bar open, or folded behind its star. Closed by default. */
  readonly controls?: "open" | "closed";
  /** Start in the opt-in sunny-day colour view. Greyscale by default. */
  readonly colour?: boolean;
  /**
   * Show the OpenStreetMap credit with the 3D scene's controls. Shown by default. OpenStreetMap's
   * licence requires that credit wherever its data appears, so hide it only when the host page
   * credits OpenStreetMap contributors itself.
   */
  readonly attribution?: boolean;
  /**
   * The host's own Three.js, for a page that already runs it: pass `@a2f0/skyline/three`, or a
   * dynamic import of it, and the scene renders with the host's engine instead of downloading
   * the copy in the assets. The page's first scene takes the engine; leave it out to use the
   * assets' copy, which needs no `three` dependency.
   */
  readonly three?: SkylineThree | PromiseLike<SkylineThree>;
}

/**
 * Mounts the complete interactive viewer filling `container`, inside a shadow root. It
 * returns at once; `ready` settles when the 3D skyline shows. The container sets the viewer's
 * size and placement: give it an explicit height. Call `destroy` when the hosting component
 * leaves.
 */
export function mountSkyline(container: HTMLElement, { assetsUrl, title = "Interactive Chicago skyline", controls = "closed", colour = false, attribution = true, three }: SkylineOptions): SkylineInstance {
  if (controls !== "open" && controls !== "closed") throw new TypeError('Skyline controls must be "open" or "closed".');
  if (typeof colour !== "boolean") throw new TypeError("Skyline colour must be a boolean.");
  return mountViewer(container, { assetsUrl, title, controls, colour, attribution, navigation: false, page: false, three });
}
