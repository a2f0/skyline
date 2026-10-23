import { afterAll, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { faviconFiles, publishedFiles, renderFavicons, root, src } from "../scripts/build/build-site.js";

// agent-tool renders the site's favicons from assets/brand/logo.svg (the `favicons` target in
// agent-tool.json) into the deployed site's root, and every page links them there. The links are
// root-absolute so that a host serving a copy of the pages from a subdirectory, as a2f0.net does at
// /skyline/, shows its own icons rather than asking for files the package's assets leave out.
const links = [
  { rel: "icon", href: "/favicon.ico", sizes: "any" },
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
];

function iconLinks(html: string) {
  const found: Record<string, string>[] = [];
  new HTMLRewriter().on("head link", {
    element(element) {
      if (/(^|\s)(icon|apple-touch-icon)(\s|$)/i.test(element.getAttribute("rel") ?? "")) found.push(Object.fromEntries(element.attributes));
    },
  }).transform(html);
  return found;
}

describe("favicons", () => {
  let rendered: string | undefined;
  afterAll(async () => { if (rendered) await rm(rendered, { recursive: true, force: true }); });

  test("every page links the deployed favicons from the site root", async () => {
    const pages = (await publishedFiles()).filter((file) => file.endsWith(".html"));
    expect(pages).toContain("index.html");
    for (const page of pages) expect({ page, links: iconLinks(await readFile(path.join(src, page), "utf8")) }).toEqual({ page, links });
    expect(links.map(({ href }) => href.slice(1)).sort()).toEqual(await faviconFiles());
  });

  test("only the deployed site carries them, not the package's viewer assets", async () => {
    const favicons = await faviconFiles();
    const viewer = await publishedFiles(), deployed = await publishedFiles({ favicons: true });
    expect(viewer.filter((file) => favicons.includes(file))).toEqual([]);
    expect(deployed).toEqual([...viewer, ...favicons].sort());
  });

  test("render from the brand logo as declared", async () => {
    rendered = await mkdtemp(path.join(os.tmpdir(), "skyline-favicons-"));
    await renderFavicons(rendered);
    expect((await readdir(rendered)).sort()).toEqual(await faviconFiles());
    // The SVG favicon is the logo itself, byte for byte.
    expect(await readFile(path.join(rendered, "favicon.svg"))).toEqual(await readFile(path.join(root, "assets/brand/logo.svg")));
    // One PNG frame for each size a browser picks from.
    const ico = await readFile(path.join(rendered, "favicon.ico"));
    expect([ico.readUInt16LE(0), ico.readUInt16LE(2)]).toEqual([0, 1]);
    expect(Array.from({ length: ico.readUInt16LE(4) }, (_, index) => ico[6 + index * 16])).toEqual([16, 32, 48]);
    // iOS wants a square, opaque icon: colour type 2 is RGB without alpha.
    const touch = await readFile(path.join(rendered, "apple-touch-icon.png"));
    expect(touch.subarray(12, 16).toString("latin1")).toBe("IHDR");
    expect([touch.readUInt32BE(16), touch.readUInt32BE(20), touch[25]]).toEqual([180, 180, 2]);
  }, { timeout: 30_000 });
});
