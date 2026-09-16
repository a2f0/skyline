// scripts/verify-deploy.cjs guards a deploy, so its failure paths matter more than its happy one.
// Every case here is a way the checker could report success while the site is wrong, which is the
// only defect class that makes a checker worse than nothing. No network: the script takes its
// request function as a dependency, so each origin below is a plain object.
const assert = require("node:assert/strict");
const { verifyDeploy, forbiddenPaths, parseTracked, urlFor } = require("../scripts/verify-deploy.cjs");

// The core reports its own progress, which is noise across a hundred cases. Failures still print,
// because assert throws rather than logs, and the suite's own result is announced through `report`:
// a suite that passes silently cannot be told from one that never ran.
const report = console.log;
console.log = () => {};
process.on("exit", () => { console.log = report; });

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

async function main() {
  // A correct deploy passes, and says so in bytes rather than status codes.
  const healthy = await run({ "a.js": answer(200, "hello") });
  assert.deepEqual(healthy.failures, [], "a correctly served file should not fail");
  assert.equal(healthy.served, 1);

  // The incident this script exists for: present, 200, and wrong. A status-only check passes this.
  const empty = await run({ "a.js": answer(200, "") });
  assert.equal(empty.served, 0, "an empty file must not count as served");
  assert.match(empty.failures[0], /differs from the repository/);
  const stale = await run({ "a.js": answer(200, "an older build") });
  assert.match(stale.failures[0], /differs from the repository/, "stale content must fail");

  // A file that is simply missing, and one that arrives late.
  const missing = await run({ "a.js": answer(404) });
  assert.match(missing.failures[0], /answered 404 after 3 attempts/);
  const lagging = await run({ "a.js": (attempt) => (attempt < 3 ? answer(404) : answer(200, "hello")) });
  assert.deepEqual(lagging.failures, [], "an asset that arrives late should pass, not fail");
  assert.equal(lagging.served, 1);

  // A published file that never answers is a failure, not a pass.
  const silent = await run({ "a.js": unresolved("terminated") });
  assert.match(silent.failures[0], /never answered: terminated/);

  // The forbidden set is the only check guarding a security property, so it fails closed.
  const leaked = await run({ "secret.env": answer(200, "token") }, { published: [], forbidden: ["secret.env"] });
  assert.equal(leaked.unreachable, 0);
  assert.match(leaked.failures[0], /answered 200 rather than proving it is not served/);

  // A transient error must never read as absence. This passed silently before it was a test.
  const flaky = await run({ "secret.env": unresolved("socket hang up") }, { published: [], forbidden: ["secret.env"] });
  assert.equal(flaky.unreachable, 0, "an unanswered probe must not count as proven unreachable");
  assert.match(flaky.failures[0], /could not be proven absent: socket hang up/);

  // Nor must a redirect: following one can land on a page that answers 200.
  const redirected = await run({ "README.md": answer(302) }, { published: [], forbidden: ["README.md"] });
  assert.match(redirected.failures[0], /answered 302 rather than proving it is not served/);
  assert.equal(redirected.seen[0].redirect, "manual", "a forbidden probe must not follow redirects");

  // A published request does follow them, because Cloudflare 307s .html to the extensionless path.
  assert.equal(healthy.seen[0].redirect, "follow", "a published request must follow redirects");
  assert.equal(healthy.seen[0].timeout, 50, "every request must carry a timeout");

  // A hung edge must end the run rather than outlast the deploy.
  let clock = 0;
  const stalled = await run({ "a.js": answer(200, "hello"), "b.js": answer(200, "hello") }, {
    published: ["a.js", "b.js"], forbidden: ["c.md"], local: { "a.js": "hello", "b.js": "hello" },
    deadline: 50, now: () => (clock += 40),
  });
  assert.ok(stalled.failures.some((failure) => /gave up after 50 ms/.test(failure)),
    `a deadline must stop the run rather than outlast the deploy: ${JSON.stringify(stalled.failures)}`);
  assert.ok(stalled.served < 2, "the run must stop early, not finish everything and then complain");

  // A path git would quote must still be probed. Parsed as lines it becomes a literal that 404s
  // as a different URL, so the real file is never checked and reads as proven absent.
  assert.deepEqual(parseTracked("index.html\0docs/caf\u00e9.md\0a b.md\0"), ["index.html", "docs/café.md", "a b.md"],
    "-z output carries raw paths, including non-ASCII and spaces");
  assert.deepEqual(parseTracked(""), [], "no tracked files is not one empty path");

  // A path is not a URL: unencoded, a "#" or "?" truncates the request and the file nobody asked
  // about answers 404, which would then read as proof the real one is absent.
  assert.equal(urlFor("http://o", "docs/notes#1.md"), "http://o/docs/notes%231.md");
  assert.equal(urlFor("http://o", "docs/FAQ?.md"), "http://o/docs/FAQ%3F.md");
  assert.equal(urlFor("http://o", "docs/caf\u00e9.md"), "http://o/docs/caf%C3%A9.md");
  assert.equal(urlFor("http://o", "a b/c.js"), "http://o/a%20b/c.js", "separators must survive encoding");
  assert.equal(urlFor("http://o", "models/one-prudential-plaza.js"), "http://o/models/one-prudential-plaza.js",
    "ordinary paths must be untouched");

  // 403 and 410 prove absence from the caller's side; a redirect and an error do not.
  for (const [status, proven] of [[404, true], [403, true], [410, true], [200, false], [302, false], [500, false]]) {
    const probe = await run({ "x.env": answer(status) }, { published: [], forbidden: ["x.env"] });
    assert.equal(probe.unreachable, proven ? 1 : 0, `${status} should ${proven ? "" : "not "}count as absent`);
    if (!proven) assert.match(probe.failures[0], /rather than proving it is not served/);
  }

  // The forbidden set is derived, because a hand-kept list is a sample and cannot prove absence.
  const derived = await forbiddenPaths(["index.html", "models/a.js"], {
    tracked: ["index.html", "models/a.js", "scripts/secrets.sh", "README.md", ""],
    secrets: [".secrets/root.env", ".secrets/nested/deep.env"],
  });
  assert.deepEqual(derived, [".secrets/nested/deep.env", ".secrets/root.env", "README.md", "scripts/secrets.sh"],
    "everything tracked or under .secrets, minus what is published");

  report("PASS: deploy verification fails on empty, stale, missing and unanswered files, on a reachable, unprovable or redirecting forbidden path, on an unencoded path, and on a deadline.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
