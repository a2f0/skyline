// scripts/verify-deploy.ts guards a deploy, so its failure paths matter more than its happy one.
// Every case here is a way the checker could report success while the site is wrong, which is the
// only defect class that makes a checker worse than nothing. No network: the script takes its
// request function as a dependency, so each origin below is a plain object.
import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { verifyDeploy, forbiddenPaths, parseTracked, urlFor, walk } from "../scripts/verify-deploy.js";
import type { RequestAnswer, VerifyOptions } from "../scripts/verify-deploy.js";

const ORIGIN = "http://origin";
const bytes = (text: string) => Buffer.from(text);
const answer = (status: number, text = ""): RequestAnswer => ({ resolved: true, status, body: bytes(text) });
const unresolved = (message: string): RequestAnswer => ({ resolved: false, status: 0, body: Buffer.alloc(0), error: message });

// `routes` maps a path to an answer, or to a function of the attempt number for flaky behaviour.
// Anything unrouted is a 404, which is what a correctly deployed site does with an unpublished path.
function fakeOrigin(routes: Record<string, RequestAnswer | ((attempt: number) => RequestAnswer)>) {
  const seen: { entry: string; redirect: RequestRedirect; timeout: number }[] = [];
  const request = async (url: string, options: { redirect: RequestRedirect; timeout: number }): Promise<RequestAnswer> => {
    const entry = url.slice(`${ORIGIN}/`.length);
    const count = seen.filter((call) => call.entry === entry).length + 1;
    seen.push({ entry, redirect: options.redirect, timeout: options.timeout });
    const route = routes[entry];
    if (route === undefined) return answer(404);
    return typeof route === "function" ? route(count) : route;
  };
  return { request, seen };
}

const run = (routes: Record<string, RequestAnswer | ((attempt: number) => RequestAnswer)>, {
  published = ["a.js"], forbidden = [], local = { "a.js": "hello" } as Record<string, string>,
  now, ...options
}: { published?: string[]; forbidden?: string[]; local?: Record<string, string>; now?: () => number } & Partial<Omit<VerifyOptions, "origin">> = {}) => {
  const origin = fakeOrigin(routes);
  return verifyDeploy({ origin: ORIGIN, attempts: 3, delay: 0, timeout: 50, deadline: 60000, ...options }, {
    request: origin.request,
    published,
    forbidden,
    ...(now === undefined ? {} : { now }),
    readLocal: async (entry) => bytes(local[entry]!),
  }).then((result) => ({ ...result, seen: origin.seen }));
};

describe("deploy verification", () => {
  test("accepts a byte-identical site", async () => {
    const healthy = await run({ "a.js": answer(200, "hello") });
    expect(healthy.failures).toEqual([]);
    expect(healthy.served).toBe(1);
    expect(healthy.seen[0]!.redirect).toBe("follow");
    expect(healthy.seen[0]!.timeout).toBe(50);
  });

  test("fails a present, 200, but empty file", async () => {
    const empty = await run({ "a.js": answer(200, "") });
    expect(empty.served).toBe(0);
    expect(empty.failures[0]).toMatch(/differs from the local build/);
  });

  test("fails stale content", async () => {
    const stale = await run({ "a.js": answer(200, "an older build") });
    expect(stale.failures[0]).toMatch(/differs from the local build/);
  });

  test("fails a missing file after every attempt", async () => {
    const missing = await run({ "a.js": answer(404) });
    expect(missing.failures[0]).toMatch(/answered 404 after 3 attempts/);
  });

  test("accepts an asset that arrives late", async () => {
    const lagging = await run({ "a.js": (attempt) => (attempt < 3 ? answer(404) : answer(200, "hello")) });
    expect(lagging.failures).toEqual([]);
    expect(lagging.served).toBe(1);
  });

  test("fails a published file that never answers", async () => {
    const silent = await run({ "a.js": unresolved("terminated") });
    expect(silent.failures[0]).toMatch(/never answered: terminated/);
  });

  test("fails a reachable forbidden file", async () => {
    const leaked = await run({ "secret.env": answer(200, "token") }, { published: [], forbidden: ["secret.env"] });
    expect(leaked.unreachable).toBe(0);
    expect(leaked.failures[0]).toMatch(/answered 200 rather than proving it is not served/);
  });

  test("treats an unanswered forbidden probe as failure, not absence", async () => {
    const flaky = await run({ "secret.env": unresolved("socket hang up") }, { published: [], forbidden: ["secret.env"] });
    expect(flaky.unreachable).toBe(0);
    expect(flaky.failures[0]).toMatch(/could not be proven absent: socket hang up/);
  });

  test("does not follow a forbidden redirect", async () => {
    const redirected = await run({ "README.md": answer(302) }, { published: [], forbidden: ["README.md"] });
    expect(redirected.failures[0]).toMatch(/answered 302 rather than proving it is not served/);
    expect(redirected.seen[0]!.redirect).toBe("manual");
  });

  test("stops at the deadline instead of outlasting the deploy", async () => {
    let clock = 0;
    const stalled = await run({ "a.js": answer(200, "hello"), "b.js": answer(200, "hello") }, {
      published: ["a.js", "b.js"], forbidden: ["c.md"], local: { "a.js": "hello", "b.js": "hello" },
      deadline: 50, now: () => (clock += 40),
    });
    expect(stalled.failures.some((failure) => /gave up after 50 ms/.test(failure))).toBe(true);
    expect(stalled.served < 2).toBe(true);
  });

  test("parses git's -z path output", () => {
    expect(parseTracked("index.html\0docs/caf\u00e9.md\0a b.md\0")).toEqual(["index.html", "docs/café.md", "a b.md"]);
    expect(parseTracked("")).toEqual([]);
  });

  test("encodes each path segment without touching separators", () => {
    expect(urlFor("http://o", "docs/notes#1.md")).toBe("http://o/docs/notes%231.md");
    expect(urlFor("http://o", "docs/FAQ?.md")).toBe("http://o/docs/FAQ%3F.md");
    expect(urlFor("http://o", "docs/caf\u00e9.md")).toBe("http://o/docs/caf%C3%A9.md");
    expect(urlFor("http://o", "a b/c.js")).toBe("http://o/a%20b/c.js");
    expect(urlFor("http://o", "models/one-prudential-plaza.js")).toBe("http://o/models/one-prudential-plaza.js");
  });

  test("counts only 404, 403 and 410 as proven absence", async () => {
    for (const [status, proven] of [[404, true], [403, true], [410, true], [200, false], [302, false], [500, false]] as [number, boolean][]) {
      const probe = await run({ "x.env": answer(status) }, { published: [], forbidden: ["x.env"] });
      expect(probe.unreachable).toBe(proven ? 1 : 0);
      if (!proven) expect(probe.failures[0]).toMatch(/rather than proving it is not served/);
    }
  });

  test("derives the forbidden set instead of listing it", async () => {
    const derived = await forbiddenPaths(["index.html", "models/a.js"], {
      tracked: ["src/index.html", "src/models/a.js", "src/models/a.ts", "src/skyline.jpg", "scripts/secrets.sh", "README.md", ""],
      secrets: [".secrets/prod/shared.env", ".secrets/ci/secrets.env"],
    });
    // Sources under src/ are probed at their repository paths and at the site root, where a build
    // would put them; only the published URLs are left out.
    expect(derived).toEqual([".secrets/ci/secrets.env", ".secrets/prod/shared.env", "README.md", "models/a.ts", "scripts/secrets.sh", "skyline.jpg",
      "src/index.html", "src/models/a.js", "src/models/a.ts", "src/skyline.jpg"]);
  });

  // `.secrets` is a link into the matrix-secrets checkout, so a walk that stopped at links would
  // derive an empty or partial forbidden set and prove nothing about the files that matter most.
  test("walks the secrets link into its tier folders, and links inside it", async () => {
    const scratch = mkdtempSync(path.join(tmpdir(), "skyline-secrets-walk-"));
    try {
      const project = path.join(scratch, "matrix-secrets", "skyline"), checkout = path.join(scratch, "checkout");
      for (const folder of ["prod", "staging", "ci", "elsewhere"]) mkdirSync(path.join(project, folder), { recursive: true });
      mkdirSync(checkout);
      writeFileSync(path.join(project, "prod", "shared.env"), "");
      writeFileSync(path.join(project, "prod", "app.env"), "");
      writeFileSync(path.join(project, "ci", "secrets.env"), "");
      writeFileSync(path.join(project, "elsewhere", "kept.env"), "");
      symlinkSync(path.join(project, "elsewhere"), path.join(project, "prod", "linked"));
      symlinkSync(project, path.join(project, "ci", "loop"));
      symlinkSync(path.join(project, "absent.env"), path.join(project, "dangling.env"));
      symlinkSync(project, path.join(checkout, ".secrets"));

      const found = (await walk(path.join(checkout, ".secrets"), ".secrets")).sort();
      // The empty staging/ holds nothing to probe, the link back to the project root is not
      // re-entered, and a dangling link is still a name that must be proven absent.
      expect(found).toEqual([".secrets/ci/secrets.env", ".secrets/dangling.env", ".secrets/elsewhere/kept.env",
        ".secrets/prod/app.env", ".secrets/prod/linked/kept.env", ".secrets/prod/shared.env"]);
      expect(await walk(path.join(checkout, "missing"), "missing")).toEqual([]);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  test("catches a source served from an uploaded src/ or from the site root", async () => {
    for (const leaked of ["src/skyline.jpg", "skyline.jpg"]) {
      const origin = fakeOrigin({ "index.html": answer(200, "page"), [leaked]: answer(200, "photo") });
      const result = await verifyDeploy({ origin: ORIGIN, attempts: 1, delay: 0, timeout: 50, deadline: 60000 }, {
        request: origin.request, published: ["index.html"], tracked: ["src/index.html", "src/skyline.jpg"], secrets: [],
        readLocal: async () => bytes("page"),
      });
      expect(result.failures).toEqual([`${leaked} answered 200 rather than proving it is not served`]);
    }
  });
});
