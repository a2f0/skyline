// scripts/verify-deploy.js guards a deploy, so its failure paths matter more than its happy one.
// Every case here is a way the checker could report success while the site is wrong, which is the
// only defect class that makes a checker worse than nothing. No network: the script takes its
// request function as a dependency, so each origin below is a plain object.
import { describe, expect, test } from "bun:test";
import { verifyDeploy, forbiddenPaths, parseTracked, urlFor } from "../scripts/verify-deploy.js";

const ORIGIN = "http://origin";
const bytes = (text) => Buffer.from(text);
const answer = (status, text = "") => ({ resolved: true, status, body: bytes(text) });
const unresolved = (message) => ({ resolved: false, status: 0, body: Buffer.alloc(0), error: message });

// `routes` maps a path to an answer, or to a function of the attempt number for flaky behaviour.
// Anything unrouted is a 404, which is what a correctly deployed site does with an unpublished path.
function fakeOrigin(routes) {
  const seen = [];
  const request = async (url, options) => {
    const entry = url.slice(`${ORIGIN}/`.length);
    const count = seen.filter((call) => call.entry === entry).length + 1;
    seen.push({ entry, redirect: options.redirect, timeout: options.timeout });
    const route = routes[entry];
    if (route === undefined) return answer(404);
    return typeof route === "function" ? route(count) : route;
  };
  return { request, seen };
}

const run = (routes, { published = ["a.js"], forbidden = [], local = { "a.js": "hello" }, now, ...options } = {}) => {
  const origin = fakeOrigin(routes);
  return verifyDeploy({ origin: ORIGIN, attempts: 3, delay: 0, timeout: 50, deadline: 60000, ...options }, {
    request: origin.request,
    published,
    forbidden,
    now,
    readLocal: async (entry) => bytes(local[entry]),
  }).then((result) => ({ ...result, seen: origin.seen }));
};

describe("deploy verification", () => {
  test("accepts a byte-identical site", async () => {
    const healthy = await run({ "a.js": answer(200, "hello") });
    expect(healthy.failures).toEqual([]);
    expect(healthy.served).toBe(1);
    expect(healthy.seen[0].redirect).toBe("follow");
    expect(healthy.seen[0].timeout).toBe(50);
  });

  test("fails a present, 200, but empty file", async () => {
    const empty = await run({ "a.js": answer(200, "") });
    expect(empty.served).toBe(0);
    expect(empty.failures[0]).toMatch(/differs from the repository/);
  });

  test("fails stale content", async () => {
    const stale = await run({ "a.js": answer(200, "an older build") });
    expect(stale.failures[0]).toMatch(/differs from the repository/);
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
    expect(redirected.seen[0].redirect).toBe("manual");
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
    for (const [status, proven] of [[404, true], [403, true], [410, true], [200, false], [302, false], [500, false]]) {
      const probe = await run({ "x.env": answer(status) }, { published: [], forbidden: ["x.env"] });
      expect(probe.unreachable).toBe(proven ? 1 : 0);
      if (!proven) expect(probe.failures[0]).toMatch(/rather than proving it is not served/);
    }
  });

  test("derives the forbidden set instead of listing it", async () => {
    const derived = await forbiddenPaths(["index.html", "models/a.js"], {
      tracked: ["index.html", "models/a.js", "scripts/secrets.sh", "README.md", ""],
      secrets: [".secrets/root.env", ".secrets/nested/deep.env"],
    });
    expect(derived).toEqual([".secrets/nested/deep.env", ".secrets/root.env", "README.md", "scripts/secrets.sh"]);
  });
});
