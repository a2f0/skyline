// Loads the markup and styles the viewer renders in its shadow roots. The scene and the
// building detail keep their markup in their own pages, skyline-3d.html and
// building-detail.html, which also work on their own; the viewer takes it from there, so one
// copy serves both.

/**
 * Fetches a page and parses it, leaving out its scripts and `noscript` fallbacks, with its
 * links and sources resolved against the page's own address, so its elements can render in
 * another document. Fragment links, such as an SVG `use` of a path beside it, stay as they are.
 */
export async function loadMarkup(url: URL, signal: AbortSignal): Promise<Document> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Couldn't load ${url.href} (${response.status}).`);
  const page = new DOMParser().parseFromString(await response.text(), "text/html");
  page.querySelectorAll("script, noscript").forEach((element) => element.remove());
  for (const element of page.querySelectorAll("[href], [src]")) {
    for (const name of ["href", "src"]) {
      const value = element.getAttribute(name);
      if (value !== null && !value.startsWith("#")) element.setAttribute(name, new URL(value, url).href);
    }
  }
  return page;
}

/** Adds a stylesheet to a shadow root, and resolves once it has loaded. */
export function loadStylesheet(root: ShadowRoot, url: URL): Promise<void> {
  const link = root.ownerDocument.createElement("link");
  link.rel = "stylesheet";
  link.href = url.href;
  const loaded = new Promise<void>((resolve, reject) => {
    link.addEventListener("load", () => resolve(), { once: true });
    link.addEventListener("error", () => reject(new Error(`Couldn't load ${url.href}.`)), { once: true });
  });
  root.prepend(link);
  return loaded;
}
