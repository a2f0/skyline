import { afterAll, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { publishedFiles, robotsTag, src, writeSiteHeaders } from "../scripts/build/build-site.js";

// skyline.devopsrockstars.com is the package's viewer and study site, kept out of search by design
// (#17). Every page asks to be left out with a robots meta tag, which travels with the copies other
// sites serve, and names no URL for search to prefer. The deployed site's `_headers` adds
// X-Robots-Tag to every response, reaching the drawings, models and scripts that no meta tag can.
// The package's viewer assets carry no `_headers` (tests/package.test.ts), so a host serving a copy
// keeps its own headers. scripts/deploy/verify-deploy.ts checks the header on the live site.

const directives = (value: string) => value.split(",").map((directive) => directive.trim().toLowerCase()).filter(Boolean);

function searchTags(html: string) {
  const robots: string[] = [], urls: string[] = [];
  new HTMLRewriter()
    .on("meta", {
      element(element) {
        if (element.getAttribute("name")?.toLowerCase() === "robots") robots.push(element.getAttribute("content") ?? "");
        if (element.getAttribute("property")?.toLowerCase() === "og:url") urls.push("og:url");
      },
    })
    .on("link", {
      element(element) {
        if (/(^|\s)canonical(\s|$)/i.test(element.getAttribute("rel") ?? "")) urls.push("canonical");
      },
    })
    .transform(html);
  return { robots, urls };
}

describe("search indexing", () => {
  let written: string | undefined;
  afterAll(async () => { if (written) await rm(written, { recursive: true, force: true }); });

  test("every page asks search engines to leave it out and names no URL for them", async () => {
    const pages = (await publishedFiles()).filter((file) => file.endsWith(".html"));
    expect(pages).toContain("index.html");
    for (const page of pages) {
      const { robots, urls } = searchTags(await readFile(path.join(src, page), "utf8"));
      expect({ page, robots: robots.length, noindex: robots.some((content) => directives(content).includes("noindex")), urls })
        .toEqual({ page, robots: 1, noindex: true, urls: [] });
    }
  });

  test("the deployed site's _headers sends X-Robots-Tag on every response", async () => {
    expect(directives(robotsTag)).toEqual(["noindex", "nofollow"]);
    written = await mkdtemp(path.join(os.tmpdir(), "skyline-headers-"));
    await writeSiteHeaders(written);
    expect(await readdir(written)).toEqual(["_headers"]);
    // One `/*` rule: Cloudflare applies it to every path, and a second `/*` block would replace it.
    expect(await readFile(path.join(written, "_headers"), "utf8")).toBe(`/*\n  X-Robots-Tag: ${robotsTag}\n`);
  });

  test("_headers is configuration, so neither file set expects it to be served", async () => {
    // Wrangler reads `_headers` at the root of the assets directory and does not upload it, so
    // deploy verification would wait for it to answer 200 if it were listed.
    for (const files of [await publishedFiles(), await publishedFiles({ deployed: true })]) expect(files).not.toContain("_headers");
  });
});
