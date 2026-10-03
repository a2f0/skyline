export type { BuildingModel, Vec2, Vec3 } from "./models/building-kit.js";
export type { FitBox, PlatformOptions, ShadowCameraOptions, StudyView, StudyLayout, StudyLabel } from "./study-types.js";

export interface SkylineOptions {
  /** Directory serving the package's viewer assets, e.g. "/static/skyline/". */
  assetsUrl: string | URL;
  /** Accessible title for the embedded viewer. */
  title?: string;
}

export interface SkylineInstance {
  /** The viewer's frame; its styles are isolated from the host application. */
  readonly element: HTMLIFrameElement;
  /** Removes the viewer, releasing its document, event handlers and WebGL context. */
  destroy(): void;
}

/**
 * Mounts the complete interactive viewer inside a host-owned container. Importing
 * this module never touches the DOM; call it after mounting a browser component.
 * The container controls placement and size. Destroy it when that component leaves.
 */
export function mountSkyline(container: HTMLElement, { assetsUrl, title = "Interactive Chicago skyline" }: SkylineOptions): SkylineInstance {
  const document = container.ownerDocument;
  const base = new URL(assetsUrl, document.baseURI);
  if (!/^(https?:)$/.test(base.protocol)) throw new TypeError("Skyline assets must be served over HTTP or HTTPS.");
  if (base.search || base.hash) throw new TypeError("Skyline assetsUrl must be a directory URL without a query or fragment.");
  if (!base.pathname.endsWith("/")) base.pathname += "/";

  const element = document.createElement("iframe");
  element.title = title;
  element.src = new URL("index.html", base).href;
  element.allowFullscreen = true;
  element.style.cssText = "display:block;width:100%;height:100%;border:0";
  container.append(element);
  return { element, destroy() { element.remove(); } };
}
